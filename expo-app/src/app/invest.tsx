import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { minorToEditable, parseAmount } from '../core/amountParser';
import { allocation, costOfWaiting, feeImpact, lossAndRecovery, purchasingPower, ReadinessItem } from '../domain/investing';
import { Chips } from '../ui/Chips';
import { position, totalsByCurrency } from '../domain/ledger';
import { isViewingCurrentMonth, readiness, safeToSpend } from '../state/selectors';
import { useAppState, useUi } from '../ui/AppContext';
import { Button, Card, CurrentMonthOnly, EmptyState, Field, HeroPanel, Icon, LabeledProgress, Row, Screen, StatusChip, T } from '../ui/components';
import { haptic } from '../ui/feedback';
import { currencySymbol, formatPercent, formatQuantity } from '../ui/format';
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
          {r.ready ? s.readyYes : s.readyNo(good, r.items.length)}
        </T>
        <T variant="small" color={p.onHeroMuted}>
          {s.investIntro}
        </T>
      </HeroPanel>

      <Card testID="invest.notice">
        <Row gap={Space.sm} style={{ alignItems: 'flex-start' }}>
          <Icon name="info" size={18} color={p.textSubtle} />
          <View style={{ flex: 1 }}>
            <T variant="small" muted testID="invest.disclaimer">
              {s.investDisclaimer}
            </T>
          </View>
        </Row>
      </Card>

      <Card title={s.readinessTitle} testID="invest.readiness">
        {r.items.map((i) => (
          <ReadinessRow key={i.key} item={i} />
        ))}
      </Card>

      <Ledger />
      <Holdings />
      <CostOfWaiting />
      <Concepts />
      <Learn />
      <Calculators />

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
    case 'budgetStable':
      text = item.variation == null ? s.rStableNoData : item.status === 'good' ? s.rStableGood(formatPercent(item.variation)) : s.rStableNo(formatPercent(item.variation));
      if (item.status === 'opportunity') action = { label: s.pActBudgets, go: () => router.push('/budgets') };
      break;
    case 'emergencySeparate':
      text = item.status === 'needsData' ? s.rSeparateNoData : item.status === 'good' ? s.rSeparateGood : s.rSeparateNo;
      if (item.status !== 'good') action = { label: s.pActGoals, go: () => router.navigate('/goals') };
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

/**
 * The investments ledger (D-059): per-currency totals of what the user
 * recorded, and one row per holding. Never a market price, never a sum across
 * currencies, and an unpriced holding is "unknown", not zero.
 */
function Ledger() {
  const st = useAppState();
  const { s, p, moneyIn } = useUi();
  const positions = st.holdings.map((h) => position(h, st.holdingTxs));
  const totals = totalsByCurrency(positions);
  return (
    <Card title={s.ledgerTitle} testID="invest.ledger" action={<Button size="sm" kind="text" icon="add" label={s.ledgerAdd} onPress={() => router.push('/holding/new')} testID="invest.ledger.add" />}>
      <T variant="small" muted>
        {s.ledgerIntro}
      </T>
      {positions.length === 0 ? (
        <EmptyState compact icon="chartUp" title={s.ledgerEmpty} testID="invest.ledger.empty" />
      ) : (
        <>
          {totals.map((t) => (
            <View key={t.currency} testID={`invest.ledger.total.${t.currency}`} style={{ backgroundColor: p.surfaceMuted, borderRadius: Radii.md, padding: Space.md, gap: Space.xxs }}>
              <T variant="label">{s.ledgerTotalsIn(t.currency)}</T>
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="small" muted>
                  {s.ledgerTotalCost}
                </T>
                <T variant="label">{moneyIn(t.costMinor, t.currency)}</T>
              </Row>
              {/* Value against the cost of the SAME holdings, never against total cost. */}
              {t.unpriced === 0 ? (
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="small" muted>
                    {s.ledgerValue}
                  </T>
                  <T variant="label">{moneyIn(t.valueMinor, t.currency)}</T>
                </Row>
              ) : t.pricedCostMinor > 0 ? (
                <T variant="small" testID={`invest.ledger.compare.${t.currency}`}>
                  {s.ledgerPricedCompare(moneyIn(t.valueMinor, t.currency), moneyIn(t.pricedCostMinor, t.currency))}
                </T>
              ) : null}
              {t.unpriced > 0 && (
                <T variant="small" color={p.warning}>
                  {s.ledgerUnpriced(t.unpriced)}
                </T>
              )}
            </View>
          ))}
          {positions.map((x) => (
            <Pressable
              key={x.holding.id}
              testID={`invest.ledger.row.${x.holding.id}`}
              accessibilityRole="button"
              onPress={() => router.push(`/holding/${x.holding.id}`)}
              style={{ minHeight: MIN_TAP, paddingVertical: Space.xs, borderBottomWidth: 1, borderBottomColor: p.outline }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <T variant="label">{x.holding.name}</T>
                  <T variant="small" muted>{`${s.holdingKind[x.holding.kind]} · ${formatQuantity(x.quantityMicro)}`}</T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T variant="label">{moneyIn(x.valueMinor ?? x.costMinor, x.holding.currency)}</T>
                  {/* Without a price the figure is the COST, and says so. */}
                  {x.valueMinor == null && (
                    <T variant="small" muted>
                      {s.ledgerCostNoPrice}
                    </T>
                  )}
                  {x.unrealizedMinor != null && (
                    <T variant="small" color={x.unrealizedMinor >= 0 ? p.positive : p.negative}>
                      {moneyIn(x.unrealizedMinor, x.holding.currency, true)}
                    </T>
                  )}
                </View>
              </Row>
            </Pressable>
          ))}
          {totals.length > 1 && (
            <T variant="small" muted testID="invest.ledger.noMixing">
              {s.ledgerNoMixing}
            </T>
          )}
        </>
      )}
    </Card>
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
  // Deliberately empty: a pre-filled rate would read as a number we expect (D-050).
  const [rate, setRate] = useState('');
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

/** Six ideas everyone should meet before a first investment (D-060). */
function Concepts() {
  const { s, p } = useUi();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card title={s.conceptsTitle} testID="invest.concepts">
      {s.concepts.map((x) => {
        const expanded = open === x.key;
        return (
          <View key={x.key} style={{ borderBottomWidth: 1, borderBottomColor: p.outline, paddingBottom: Space.sm }}>
            <Pressable
              testID={`concept.${x.key}`}
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
              <T variant="small" testID={`concept.${x.key}.body`}>
                {x.body}
              </T>
            )}
          </View>
        );
      })}
    </Card>
  );
}

/**
 * Three learning calculators (D-060). Every input is the user's own, the
 * fields start EMPTY (a pre-filled rate reads as our expectation — D-050),
 * and the result is phrased as arithmetic, never as what will happen.
 */
function Calculators() {
  const st = useAppState();
  const { s, p, money } = useUi();
  const [kind, setKind] = useState<'fees' | 'inflation' | 'loss'>('fees');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [fee, setFee] = useState('');
  const [years, setYears] = useState('');
  const num = (t: string, lo: number, hi: number) => {
    const v = Number(t.trim().replace(',', '.'));
    return t.trim() === '' || !Number.isFinite(v) || v < lo || v > hi ? null : v;
  };
  const a = parseAmount(amount, st.currency);
  const y = num(years, 1, 50);
  let result: string | null = null;
  if (kind === 'fees') {
    const r = num(rate, 0, 50);
    const f = num(fee, 0, 50);
    if (a.ok && r != null && f != null && y != null) {
      const x = feeImpact({ initialMinor: 0, monthlyMinor: a.minor, annualRatePercent: r, feePercent: f, years: y });
      result = s.lcFeeResult(money(x.withoutFeeMinor), money(x.withFeeMinor), money(x.feeCostMinor));
    }
  } else if (kind === 'inflation') {
    const i = num(rate, 0, 50);
    if (a.ok && i != null && y != null) {
      const x = purchasingPower({ amountMinor: a.minor, inflationPercent: i, years: y });
      result = s.lcInflationResult(money(x.todayMinor), money(x.erodedMinor));
    }
  } else {
    const d = num(rate, 0, 100);
    if (a.ok && d != null) {
      const x = lossAndRecovery({ amountMinor: a.minor, dropPercent: d });
      result = s.lcLossResult(money(x.afterMinor), money(x.lostMinor), x.recoveryPercent == null ? null : formatPercent(x.recoveryPercent / 100));
    }
  }
  const sym = currencySymbol(st.currency, st.locale, st.classicSign);
  return (
    <Card title={s.lcTitle} testID="invest.calc">
      <T variant="small" muted>
        {s.lcIntro}
      </T>
      <Chips testID="calc.kind" value={kind} onChange={setKind} options={(['fees', 'inflation', 'loss'] as const).map((k) => [k, s.lcKind[k]] as const)} />
      <Field testID="calc.amount" label={kind === 'fees' ? s.lcMonthly : s.lcAmount} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} suffix={sym} ltr />
      <Row gap={Space.sm}>
        <View style={{ flex: 1 }}>
          <Field testID="calc.rate" label={kind === 'fees' ? s.lcReturn : kind === 'inflation' ? s.lcInflation : s.lcDrop} keyboardType="decimal-pad" value={rate} onChangeText={setRate} ltr />
        </View>
        {kind !== 'loss' && (
          <View style={{ flex: 1 }}>
            <Field testID="calc.years" label={s.lcYears} keyboardType="number-pad" value={years} onChangeText={setYears} ltr />
          </View>
        )}
      </Row>
      {kind === 'fees' && <Field testID="calc.fee" label={s.lcFee} keyboardType="decimal-pad" value={fee} onChangeText={setFee} ltr />}
      {result ? (
        <View style={{ backgroundColor: p.surfaceMuted, borderRadius: Radii.md, padding: Space.md }}>
          <T variant="small" testID="calc.result">
            {result}
          </T>
        </View>
      ) : (
        <T variant="small" muted testID="calc.invalid">
          {s.lcInvalid}
        </T>
      )}
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
