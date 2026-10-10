import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { minorToEditable, parseAmount } from '../core/amountParser';
import { allocation, costOfWaiting, ReadinessItem } from '../domain/investing';
import { isViewingCurrentMonth, readiness, safeToSpend } from '../state/selectors';
import { useAppState, useUi } from '../ui/AppContext';
import { Button, Card, CurrentMonthOnly, EmptyState, Field, HeroPanel, Icon, LabeledProgress, Row, Screen, StatusChip, T } from '../ui/components';
import { haptic } from '../ui/feedback';
import { currencySymbol, formatPercent } from '../ui/format';
import { MIN_TAP, Radii, Space } from '../ui/theme';

/**
 * Investing (D-041): readiness from the user's own data, what they hold,
 * the cost of waiting on THEIR assumed return, plain-language learning and
 * safety. Never recommends a product or promises a return.
 */
export default function Invest() {
  const st = useAppState();
  const { s, p } = useUi();
  const r = readiness(st);
  const good = r.items.filter((i) => i.status === 'good').length;
  if (!isViewingCurrentMonth(st))
    return (
      <Screen testID="invest">
        <CurrentMonthOnly />
      </Screen>
    );

  return (
    <Screen testID="invest">
      <HeroPanel>
        <Row gap={Space.xs}>
          <Icon name="chartUp" size={20} color={p.heroAccent} />
          <T variant="label" color={p.heroAccent}>
            {s.investTitle}
          </T>
        </Row>
        <T variant="title" color={p.onHero} testID="invest.ready">
          {r.ready ? s.readyYes : s.readyNo(good)}
        </T>
        <T variant="small" color={p.onHeroMuted}>
          {s.investIntro}
        </T>
      </HeroPanel>

      <Card title={s.readinessTitle} testID="invest.readiness">
        {r.items.map((i) => (
          <ReadinessRow key={i.key} item={i} />
        ))}
      </Card>

      <Holdings />
      <CostOfWaiting />
      <Learn />

      <Card title={s.safetyTitle} testID="invest.safety">
        {s.safety.map((t, i) => (
          <Row key={i} gap={Space.sm} style={{ alignItems: 'flex-start' }}>
            <Icon name="shield" size={18} color={p.primary} />
            <View style={{ flex: 1 }}>
              <T variant="small">{t}</T>
            </View>
          </Row>
        ))}
      </Card>

      <T variant="small" muted testID="invest.disclaimer">
        {s.investDisclaimer}
      </T>
    </Screen>
  );
}


function ReadinessRow({ item }: { item: ReadinessItem }) {
  const { s, p, money } = useUi();
  const months = (m: number) => s.monthsApprox(Math.floor(m * 10) / 10);
  let text: string;
  let action: { label: string; go: () => void } | null = null;
  switch (item.key) {
    case 'emergency':
      text = item.months == null ? s.rEmergencyNoData : item.status === 'good' ? s.rEmergencyGood(months(item.months)) : s.rEmergencyGap(money(item.gapMinor), months(item.months));
      if (item.status !== 'good') action = { label: s.pActGoals, go: () => router.navigate('/goals') };
      break;
    case 'interestDebt':
      text = item.debt ? s.rDebt(item.debt.name, String(item.debt.annualRatePercent)) : s.rDebtGood;
      if (item.debt) action = { label: s.pActWealth, go: () => router.push('/wealth') };
      break;
    case 'surplus':
      text = item.status === 'needsData' ? s.rSurplusNoData : item.status === 'good' ? s.rSurplusGood(money(item.surplusMinor)) : s.rSurplusNo;
      if (item.status === 'needsData') action = { label: s.pActIncome, go: () => router.push('/income') };
      else if (item.status === 'opportunity') action = { label: s.pActBudgets, go: () => router.push('/budgets') };
      break;
  }
  return (
    <View testID={`invest.r.${item.key}`} style={{ gap: Space.xs, paddingBottom: Space.sm, borderBottomWidth: 1, borderBottomColor: p.outline }}>
      <Row gap={Space.xs}>
        <View style={{ flex: 1 }}>
          <T variant="label">{s.rTitle[item.key]}</T>
        </View>
        <StatusChip status={item.status} testID={`invest.r.${item.key}.status`} />
      </Row>
      <T variant="small" muted testID={`invest.r.${item.key}.text`}>
        {text}
      </T>
      {action && (
        <Button
          kind="text"
          label={action.label}
          onPress={() => {
            haptic.tap();
            action!.go();
          }}
          testID={`invest.r.${item.key}.act`}
          style={{ alignSelf: 'flex-start' }}
        />
      )}
    </View>
  );
}

function Holdings() {
  const st = useAppState();
  const { s, money } = useUi();
  const a = allocation(st.assets);
  return (
    <Card title={s.holdingsTitle} testID="invest.holdings" action={<Button kind="text" icon="add" label={s.addAsset} onPress={() => router.push('/asset/new')} testID="invest.addAsset" />}>
      {a.slices.length === 0 ? (
        <EmptyState compact icon="chartUp" title={s.holdingsEmpty} testID="invest.holdings.empty" />
      ) : (
        <>
          <T variant="subtitle" testID="invest.holdings.total">
            {money(a.totalMinor)}
          </T>
          {a.slices.map((x) => (
            <View key={x.kind} testID={`invest.slice.${x.kind}`}>
              <LabeledProgress value={x.share} label={s.assetKind[x.kind]} trailing={`${formatPercent(x.share)} · ${money(x.valueMinor)}`} />
            </View>
          ))}
        </>
      )}
      <T variant="small" muted>
        {s.holdingsNote}
      </T>
    </Card>
  );
}

function CostOfWaiting() {
  const st = useAppState();
  const { s, p, money } = useUi();
  const planned = safeToSpend(st)?.plannedSavingMinor ?? 0;
  const [monthly, setMonthly] = useState(planned > 0 ? minorToEditable(planned, st.currency) : '');
  const [rate, setRate] = useState('4');
  const [years, setYears] = useState('20');
  const [delay, setDelay] = useState('5');
  const num = (t: string) => {
    const v = Number(t.trim().replace(',', '.'));
    return t.trim() === '' || !Number.isFinite(v) ? null : v;
  };
  const m = parseAmount(monthly, st.currency);
  const r = num(rate);
  const y = num(years);
  const d = num(delay);
  const valid = m.ok && r != null && r >= 0 && r <= 100 && y != null && Number.isInteger(y) && y >= 1 && y <= 50 && d != null && Number.isInteger(d) && d >= 1 && d < y;
  const res = valid ? costOfWaiting({ monthlyMinor: m.minor, annualRatePercent: r!, years: y!, delayYears: d! }) : null;
  const sym = currencySymbol(st.currency, st.locale, st.classicSign);

  return (
    <Card title={s.waitTitle} testID="invest.wait">
      <Field testID="wait.monthly" label={s.waitMonthly} keyboardType="decimal-pad" value={monthly} onChangeText={setMonthly} suffix={sym} ltr />
      <Field testID="wait.rate" label={s.waitRate} keyboardType="decimal-pad" value={rate} onChangeText={setRate} ltr />
      <Row gap={Space.sm}>
        <View style={{ flex: 1 }}>
          <Field testID="wait.years" label={s.waitYears} keyboardType="number-pad" value={years} onChangeText={setYears} ltr />
        </View>
        <View style={{ flex: 1 }}>
          <Field testID="wait.delay" label={s.waitDelay} keyboardType="number-pad" value={delay} onChangeText={setDelay} ltr />
        </View>
      </Row>
      {res ? (
        <View style={{ backgroundColor: p.surfaceMuted, borderRadius: Radii.md, padding: Space.md, gap: Space.xs }}>
          <T variant="small" testID="wait.now">
            {s.waitNow(money(res.nowMinor), money(res.nowContributedMinor))}
          </T>
          <T variant="small" testID="wait.later">
            {s.waitLater(s.yearsCount(d!), money(res.laterMinor), money(res.laterContributedMinor))}
          </T>
          <T variant="label" color={p.primary} testID="wait.diff">
            {s.waitDiff(money(res.differenceMinor))}
          </T>
        </View>
      ) : (
        <T variant="small" muted testID="wait.invalid">
          {s.waitInvalid}
        </T>
      )}
      <T variant="small" muted>
        {s.waitNote}
      </T>
      <Button kind="text" icon="plan" label={s.openCalculator} onPress={() => router.push('/plan')} testID="wait.calculator" style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

function Learn() {
  const { s, p } = useUi();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card title={s.learnTitle} testID="invest.learn">
      {s.learn.map((x) => {
        const expanded = open === x.key;
        return (
          <View key={x.key} style={{ borderBottomWidth: 1, borderBottomColor: p.outline, paddingBottom: Space.sm }}>
            <Pressable
              testID={`learn.${x.key}`}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? null : x.key)}
              style={{ minHeight: MIN_TAP, justifyContent: 'center' }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="label">{x.title}</T>
                <Icon name={expanded ? 'remove' : 'add'} size={18} color={p.textSubtle} />
              </Row>
            </Pressable>
            {expanded && (
              <View style={{ gap: Space.xs }} testID={`learn.${x.key}.body`}>
                <T variant="small">{x.body}</T>
                <T variant="small" muted>
                  {`${s.learnRisk}: ${s.level[x.risk]} · ${s.learnLiquidity}: ${s.level[x.liquidity]}`}
                </T>
              </View>
            )}
          </View>
        );
      })}
      <T variant="small" muted>
        {s.learnNote}
      </T>
    </Card>
  );
}
