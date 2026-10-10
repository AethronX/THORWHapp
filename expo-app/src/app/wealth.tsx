import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { addMonths, monthOf } from '../core/dates';
import { minorPerMajor } from '../core/currency';
import type { Debt } from '../domain/models';
import { payoffPlan, suggestedExtra } from '../domain/wealth';
import { wealth } from '../state/selectors';
import { useAppState, useController, useUi } from '../ui/AppContext';
import { Toggle, AnimatedAmount, Button, Card, HeroPanel, Icon, IconButton, LabeledProgress, Row, runGuarded, Screen, T } from '../ui/components';
import { haptic } from '../ui/feedback';
import { formatDate, formatMonth } from '../ui/format';
import { AmountEditor } from '../ui/InlineEditor';
import { MIN_TAP, Radii, Space } from '../ui/theme';

/**
 * Net worth = recorded assets − remaining recorded obligations. Every number
 * says what it is and where it comes from; estimates are marked.
 */
export default function Wealth() {
  const st = useAppState();
  const { s, p, money } = useUi();
  const w = wealth(st);

  return (
    <Screen testID="wealth">
      {/* Summary */}
      <HeroPanel>
        <View accessible accessibilityLabel={`${s.wealthTitle}: ${money(w.netMinor)}. ${s.wealthDefinition}`} testID="wealth.net">
          <T variant="label" color={p.heroAccent}>
            {s.wealthTitle}
          </T>
          <AnimatedAmount minor={w.netMinor} color={p.onHero} />
          <T variant="small" color={p.onHeroMuted}>
            {s.wealthDefinition}
          </T>
        </View>
        <Row gap={Space.xl} style={{ flexWrap: 'wrap' }}>
          <View>
            <T variant="small" color={p.onHeroMuted}>
              {s.assetsTitle}
            </T>
            <T variant="label" color={p.onHero} testID="wealth.assets">
              {money(w.assetsMinor)}
            </T>
          </View>
          <View>
            <T variant="small" color={p.onHeroMuted}>
              {s.debtsTitle}
            </T>
            <T variant="label" color={p.onHero} testID="wealth.debts">
              {money(w.debtsMinor)}
            </T>
          </View>
        </Row>
        {w.estimatedMinor > 0 && (
          <T variant="small" color={p.onHeroMuted} testID="wealth.estimated">
            {s.estimatedPart(money(w.estimatedMinor))}
          </T>
        )}
      </HeroPanel>
      <Row style={{ alignItems: 'flex-start' }} gap={Space.xs}>
        <Icon name="info" size={16} color={p.textSubtle} />
        <View style={{ flex: 1 }}>
          <T variant="small" muted>
            {s.wealthGoalsNote}
          </T>
        </View>
      </Row>

      <Button kind="tonal" icon="chartUp" label={s.investTitle} onPress={() => router.push('/invest')} testID="wealth.invest" style={{ alignSelf: 'flex-start' }} />

      {/* Assets */}
      <Card title={s.assetsTitle} action={<Button kind="text" icon="add" label={s.addAsset} onPress={() => router.push('/asset/new')} testID="wealth.addAsset" />}>
        {st.assets.length === 0 ? (
          <T muted>{s.noAssets}</T>
        ) : (
          st.assets.map((a) => (
            <Pressable
              key={a.id}
              testID={`asset.row.${a.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${a.name}${s.listSep}${s.assetKind[a.kind]}${s.listSep}${money(a.valueMinor)}${a.isEstimate ? `${s.listSep}${s.estimateTag}` : ''}`}
              accessibilityHint={s.edit}
              onPress={() => router.push(`/asset/${a.id}`)}
              style={{ minHeight: MIN_TAP, paddingVertical: Space.xs, borderBottomWidth: 1, borderBottomColor: p.outline }}
            >
              <Row>
                <View style={{ flex: 1 }}>
                  <T>{a.name}</T>
                  <T variant="small" muted>
                    {`${s.assetKind[a.kind]} · ${s.valueAsOf(formatDate(a.updatedDay, st.locale))}`}
                  </T>
                </View>
                {a.isEstimate && (
                  <View style={{ backgroundColor: p.surfaceMuted, borderRadius: Radii.pill, paddingHorizontal: Space.sm }}>
                    <T variant="small">{s.estimateTag}</T>
                  </View>
                )}
                <T variant="label">{money(a.valueMinor)}</T>
              </Row>
            </Pressable>
          ))
        )}
      </Card>

      {/* Obligations */}
      <Card title={s.debtsTitle} action={<Button kind="text" icon="add" label={s.addDebt} onPress={() => router.push('/debt/new')} testID="wealth.addDebt" />}>
        {st.debts.length === 0 ? <T muted>{s.noDebts}</T> : st.debts.map((d) => <DebtItem key={d.id} debt={d} />)}
      </Card>
    </Screen>
  );
}

function DebtItem({ debt }: { debt: Debt }) {
  const st = useAppState();
  const c = useController();
  const { s, p, money } = useUi();
  const [paying, setPaying] = useState(false);
  const [alsoExpense, setAlsoExpense] = useState(true);
  const unit = minorPerMajor(st.currency);
  const extra = suggestedExtra(debt.monthlyPaymentMinor, unit);
  const plan = payoffPlan(debt, extra);
  const done = debt.remainingMinor === 0;
  const meta = [
    debt.monthlyPaymentMinor > 0 ? s.debtMonthly(money(debt.monthlyPaymentMinor)) : null,
    debt.dueDay ? s.debtDue(debt.dueDay) : null,
    debt.annualRatePercent > 0 ? s.debtRate(String(debt.annualRatePercent)) : s.debtNoRate,
  ]
    .filter(Boolean)
    .join(' · ');
  const when = (months: number) => formatMonth(addMonths(monthOf(st.today), months), st.locale);

  return (
    <View testID={`debt.item.${debt.id}`} style={{ gap: Space.sm, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: p.outline }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T variant="subtitle">{debt.name}</T>
          <T variant="small" muted>
            {meta}
          </T>
        </View>
        <IconButton icon="edit" label={s.edit} onPress={() => router.push(`/debt/${debt.id}`)} testID={`debt.edit.${debt.id}`} />
      </Row>
      <LabeledProgress
        value={debt.originalMinor > 0 ? debt.paidMinor / debt.originalMinor : 0}
        label={done ? s.debtPaidOff : s.debtRemaining(money(debt.remainingMinor), money(debt.originalMinor))}
      />
      {!done &&
        (plan == null ? (
          <T variant="small" muted>
            {s.noPaymentPlan}
          </T>
        ) : (
          <View style={{ backgroundColor: p.surfaceMuted, borderRadius: Radii.md, padding: Space.md, gap: Space.xs }}>
            <T variant="small" testID={`debt.plan.${debt.id}`} color={plan.base.paysOff ? p.onSurface : p.negative}>
              {plan.base.paysOff ? s.payoffBase(s.monthsCount(plan.base.months), when(plan.base.months), money(plan.base.totalInterestMinor)) : s.payoffNever}
            </T>
            {plan.base.paysOff && plan.withExtra?.paysOff && plan.withExtra.months < plan.base.months && (
              <T variant="small" color={p.positive} testID={`debt.extra.${debt.id}`}>
                {s.payoffExtra(money(plan.extraMinor), s.monthsCount(plan.base.months - plan.withExtra.months), money(plan.base.totalInterestMinor - plan.withExtra.totalInterestMinor))}
              </T>
            )}
            <T variant="small" muted>
              {s.payoffAssumption}
            </T>
          </View>
        ))}
      {!done &&
        (paying ? (
          <View style={{ gap: Space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T variant="small">{s.alsoExpense}</T>
              </View>
              <Toggle testID={`debt.alsoExpense.${debt.id}`} value={alsoExpense} onValueChange={setAlsoExpense} accessibilityLabel={s.alsoExpense} />
            </Row>
            <AmountEditor
              testID="payment"
              title={s.recordPayment}
              initialMinor={debt.monthlyPaymentMinor > 0 ? Math.min(debt.monthlyPaymentMinor, debt.remainingMinor) : undefined}
              validate={(minor) => (minor > debt.remainingMinor ? s.errPaymentTooMuch : null)}
              onCancel={() => setPaying(false)}
              onSave={async (minor) => {
                if (await runGuarded(() => c.addDebtPayment({ debtId: debt.id, amountMinor: minor!, alsoExpense, note: debt.name }), s.errGeneric)) {
                  haptic.success();
                  setPaying(false);
                }
              }}
            />
          </View>
        ) : (
          <Button kind="tonal" icon="handCoins" label={s.recordPayment} onPress={() => setPaying(true)} testID={`debt.pay.${debt.id}`} style={{ alignSelf: 'flex-start' }} />
        ))}
    </View>
  );
}
