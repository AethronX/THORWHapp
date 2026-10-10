import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { compareDays, dayToDate, monthsUntil } from '../../core/dates';
import { goalProgress } from '../../domain/financeEngine';
import type { Insight } from '../../domain/insights';
import { isGoalReached, spendUsage } from '../../domain/models';
import { expenseTotal, guidance, lastSevenDays, principles, readiness, wealth, health, incomeTotal, insights, isViewingCurrentMonth, netCashFlow, recentSpending, safeToSpend, savingsRate, shortcutCategories, spends } from '../../state/selectors';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { AnimatedAmount, Button, Card, EmptyState, Fab, Icon, IconName, LabeledProgress, MonthSwitcher, Row, runGuarded, Screen, T } from '../../ui/components';
import { haptic } from '../../ui/feedback';
import { NextStepCard } from '../../ui/Guidance';
import { principleScore } from '../../domain/principles';
import { categoryIcon, categoryLabel, formatMonth, formatPercent } from '../../ui/format';
import { ScoreRing, WeekBars } from '../../ui/charts';
import { categoryTone, Elevation, MIN_TAP, Radii, Space } from '../../ui/theme';
import { PressScale } from '../../ui/motion';

export default function Dashboard() {
  const st = useAppState();
  const c = useController();
  const { s, p, money, say } = useUi();
  const net = netCashFlow(st);
  const rate = savingsRate(st);
  // Next step first; alerts below skip whatever the top step already says.
  const [copying, setCopying] = useState(false);
  const steps = guidance(st, { emergency: s.emergencyGoalName, season: s.seasonGoalName });
  const top = steps[0];
  const sameAsTop = (i: Insight) =>
    !!top &&
    ((top.kind === 'addIncome' && i.kind === 'noIncome') ||
      (top.kind === 'overspending' && i.kind === 'negativeCashFlow') ||
      (top.kind === 'overBudget' && i.kind === 'overBudget' && i.categoryId === top.categoryId) ||
      (top.kind === 'goalAtRisk' && i.kind === 'goalAtRisk' && i.goal?.id === top.goal.id));
  const list = insights(st).filter((i) => !sameAsTop(i));
  const budgeted = spends(st).filter((x) => x.limitMinor != null);

  const insightText = (i: Insight): string => {
    const amount = money(i.amountMinor ?? 0);
    const cat = i.categoryId != null ? st.categoriesById.get(i.categoryId) : undefined;
    const catName = cat ? categoryLabel(cat, s) : '';
    switch (i.kind) {
      case 'noIncome':
        return s.insightNoIncome;
      case 'negativeCashFlow':
        return s.insightNegativeCashFlow(amount);
      case 'overBudget':
        return s.insightOverBudget(catName, amount);
      case 'nearBudget':
        return s.insightNearBudget(catName, amount);
      case 'goalAtRisk':
        return s.insightGoalAtRisk(i.goal!.name, money(i.requiredMonthlyMinor ?? 0));
      case 'goalOverdue':
        return s.insightGoalOverdue(i.goal!.name, amount);
    }
  };
  const insightIcon = (i: Insight): [IconName, string] =>
    i.severity === 'critical' ? ['error', p.negative] : i.severity === 'warning' ? ['warning', p.warning] : ['info', p.primary];

  return (
    <View style={{ flex: 1 }}>
      <Screen testID="dashboard">
        <MonthSwitcher />

        <View style={{ backgroundColor: p.hero, borderRadius: Radii.lg, padding: Space.xl, gap: Space.lg, overflow: 'hidden', ...Elevation.raised }}>
          {/* Quiet depth: two large soft rings in the corner (decorative). */}
          <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: -70, end: -70, width: 220, height: 220, borderRadius: 110, borderWidth: 28, borderColor: p.onHero, opacity: 0.05 }} />
          <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', bottom: -90, start: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: p.onHero, opacity: 0.04 }} />
          {/* Signature detail: a fine gold rule along the top edge. */}
          <View style={{ position: 'absolute', top: 0, start: Space.xl, end: Space.xl, height: 2, backgroundColor: p.brandGold, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Net cash flow of the viewed month — NOT a bank balance (defined on screen). */}
            <View accessible accessibilityLabel={say(`${s.net}${s.listSep}${formatMonth(st.month, st.locale)}: ${money(net)}. ${s.netDefinition}`)} testID="summary.net" style={{ flex: 1 }}>
              <T variant="label" color={p.heroAccent}>
                {`${s.net} · ${formatMonth(st.month, st.locale)}`}
              </T>
              <AnimatedAmount minor={net} color={p.onHero} />
              <T variant="small" color={p.onHeroMuted} testID="summary.definition">
                {s.netDefinition}
              </T>
            </View>
            {/* Privacy in public: mask every amount with one tap. */}
            <Pressable
              testID="dashboard.hideAmounts"
              accessibilityRole="switch"
              accessibilityState={{ checked: st.hideAmounts }}
              accessibilityLabel={s.hideAmounts}
              hitSlop={8}
              onPress={() => {
                haptic.tick();
                runGuarded(() => c.setHideAmounts(!st.hideAmounts), s.errGeneric);
              }}
              style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.pill }}
            >
              <Icon name={st.hideAmounts ? 'eyeOff' : 'eye'} color={p.heroAccent} />
            </Pressable>
          </Row>
          <Row gap={Space.sm}>
            <Metric label={s.income} value={money(incomeTotal(st))} icon="income" testID="summary.income" />
            <Metric label={s.expenses} value={money(expenseTotal(st))} icon="expense" testID="summary.expenses" />
          </Row>
          <SavingsBar rate={rate} />
          {/* Honest about the data: only what the user recorded. */}
          <Row gap={Space.xs} style={{ alignItems: 'flex-start' }}>
            <Icon name="info" size={16} color={p.onHeroMuted} />
            <View style={{ flex: 1 }}>
              <T variant="small" color={p.onHeroMuted} testID="summary.dataNote">
                {s.dataNote}
              </T>
            </View>
          </Row>
        </View>

        {isViewingCurrentMonth(st) && <QuickBar />}

        <NextStepCard items={steps} />

        <SmartSummary />

        {isViewingCurrentMonth(st) && <WeekCard />}

        {/* The next step already says "add income" — keep this card only for its "copy last month" shortcut. */}
        {st.incomes.length === 0 && (st.previousMonthHasIncome || top?.kind !== 'addIncome') && (
          <Card title={s.income}>
            <T>{s.noIncomeYet}</T>
            <Row style={{ flexWrap: 'wrap' }}>
              {st.previousMonthHasIncome && (
                <Button
                  kind="tonal"
                  label={s.copyLastMonthIncome}
                  disabled={copying}
                  onPress={async () => {
                    setCopying(true);
                    await runGuarded(c.copyIncomeFromPreviousMonth, s.errGeneric);
                    setCopying(false);
                  }}
                  testID="dashboard.copyIncome"
                />
              )}
              <Button kind="outlined" label={s.addIncome} onPress={() => router.push('/income')} testID="dashboard.addIncome" />
            </Row>
          </Card>
        )}

        <Card title={s.insightsTitle} testID="insights">
          {list.length === 0 ? (
            <Row>
              <Icon name="success" color={p.positive} />
              <View style={{ flex: 1 }}>
                <T>{s.allGood}</T>
              </View>
            </Row>
          ) : (
            list.slice(0, 4).map((i, idx) => {
              const [icon, color] = insightIcon(i);
              return (
                <Row key={idx} style={{ alignItems: 'flex-start' }}>
                  <Icon name={icon} color={color} />
                  <View style={{ flex: 1 }}>
                    <T testID={`insight.${i.kind}`}>{insightText(i)}</T>
                  </View>
                </Row>
              );
            })
          )}
        </Card>

        <Card title={s.budgetsTitle} action={<Button kind="text" label={s.setBudgets} onPress={() => router.push('/budgets')} testID="dashboard.budgets" />}>
          {budgeted.length === 0 ? (
            <EmptyState compact icon="analytics" title={s.noBudgets} />
          ) : (
            budgeted.map((x) => (
              <LabeledProgress
                key={x.category.id}
                budget
                value={spendUsage(x) ?? 0}
                label={categoryLabel(x.category, s)}
                trailing={x.spentMinor > x.limitMinor! ? s.overBy(money(x.spentMinor - x.limitMinor!)) : s.budgetUsage(money(x.spentMinor), money(x.limitMinor!))}
              />
            ))
          )}
        </Card>

        <Card title={s.goalsTitle} action={<Button kind="text" label={s.seeAll} onPress={() => router.push('/goals')} />}>
          {st.goals.length === 0 ? (
            <EmptyState compact icon="target" title={s.noGoalsShort} action={<Button kind="tonal" icon="add" label={s.addGoal} onPress={() => router.push('/goal/new')} testID="dashboard.addGoal" />} />
          ) : (
            st.goals.slice(0, 3).map((g) => (
              <LabeledProgress
                key={g.id}
                value={goalProgress(g.savedMinor, g.targetMinor)}
                label={g.name}
                trailing={isGoalReached(g) ? s.goalReached : compareDays(g.targetDate, st.today) < 0 ? s.goalOverdue : s.monthsLeft(monthsUntil(st.today, g.targetDate))}
              />
            ))
          )}
        </Card>

        {isViewingCurrentMonth(st) && <ToolsCard />}
      </Screen>
      <Fab label={s.addExpense} onPress={() => router.push('/quick-add')} testID="dashboard.addExpense" />
    </View>
  );
}

/** Income / expenses tile on the hero: icon chip, label, amount. */
function Metric({ label, value, icon, testID }: { label: string; value: string; icon: IconName; testID?: string }) {
  const { p, say } = useUi();
  return (
    <View accessible accessibilityLabel={say(`${label}: ${value}`)} testID={testID} style={{ flex: 1, borderRadius: Radii.md, padding: Space.md, gap: Space.xs, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: p.onHero, opacity: 0.08 }} />
      <Row gap={Space.xs}>
        <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: p.heroAccent }}>
          <Icon name={icon} size={16} weight="regular" color={p.heroAccent} />
        </View>
        <T variant="small" color={p.onHeroMuted}>
          {label}
        </T>
      </Row>
      <T variant="amount" color={p.onHero}>
        {value}
      </T>
    </View>
  );
}

/** Savings rate as a labelled gold bar (text + bar, never colour alone). */
function SavingsBar({ rate }: { rate: number | null }) {
  const { s, p, say } = useUi();
  const value = rate == null ? s.notAvailable : formatPercent(rate);
  const fill = rate == null ? 0 : Math.max(0, Math.min(1, rate));
  return (
    <View accessible accessibilityLabel={say(`${s.savingsRate}: ${value}`)} testID="summary.rate" style={{ gap: Space.xs }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={Space.xs}>
          <Icon name="savings" size={18} color={p.heroAccent} />
          <T variant="small" color={p.onHeroMuted}>
            {s.savingsRate}
          </T>
        </Row>
        <T variant="label" color={p.onHero}>
          {value}
        </T>
      </Row>
      <View style={{ height: 8, borderRadius: Radii.pill, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: p.onHero, opacity: 0.12 }} />
        <View style={{ height: 8, width: `${Math.round(fill * 100)}%`, backgroundColor: p.heroAccent, borderRadius: Radii.pill }} />
      </View>
    </View>
  );
}

/** Health score + safe daily spend at a glance; opens Insights. */
function SmartSummary() {
  const st = useAppState();
  const { s, p, money, say } = useUi();
  if (incomeTotal(st) === 0 && expenseTotal(st) === 0) return null;
  const h = health(st);
  const safe = safeToSpend(st);
  const color = h.grade === 'excellent' || h.grade === 'good' ? p.positive : h.grade === 'fair' ? p.warning : p.negative;
  return (
    <Pressable
      testID="dashboard.smart"
      accessibilityRole="button"
      accessibilityLabel={say(`${s.healthTitle}: ${s.healthOutOf(h.score)}${safe ? `${s.listSep}${s.safeTitle}: ${money(safe.perDayMinor)}` : ''}`)}
      onPress={() => router.push('/analytics')}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card>
        <Row gap={Space.lg}>
          <ScoreRing score={h.score} color={color} size={64} label={s.healthOutOf(h.score)} />
          <View style={{ flex: 1, gap: Space.xxs }}>
            <T variant="label" muted>
              {s.healthTitle}
            </T>
            {safe ? (
              <>
                <T variant="amount" color={safe.perDayMinor > 0 ? p.primary : p.negative}>
                  {money(safe.perDayMinor)}
                </T>
                <T variant="small" muted>
                  {s.safeTitle}
                </T>
              </>
            ) : (
              <T variant="subtitle">{s.analyticsTitle}</T>
            )}
          </View>
          <Icon name="forward" weight="regular" size={18} color={p.textSubtle} />
        </Row>
      </Card>
    </Pressable>
  );
}

/** One-tap logging (most used categories → quick add, category preset) + today / last 7 days. */
function QuickBar() {
  const st = useAppState();
  const { s, p, money } = useUi();
  const r = recentSpending(st);
  const cats = shortcutCategories(st);
  return (
    <Card testID="quickBar">
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="label">{s.quickBarTitle}</T>
        <Row gap={Space.md}>
          <T variant="small" muted testID="quickBar.today">{`${s.todayLabel} ${money(r.todayMinor)}`}</T>
          <T variant="small" muted testID="quickBar.week">{`${s.last7Label} ${money(r.weekMinor)}`}</T>
        </Row>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {[...cats, null].map((c) => {
          const tone = c ? categoryTone(p, c.key, c.iconCode) : null;
          return (
            <PressScale
              key={c?.id ?? 'more'}
              testID={`quickBar.${c?.id ?? 'more'}`}
              accessibilityRole="button"
              accessibilityLabel={c ? `${s.addExpense}: ${categoryLabel(c, s)}` : s.addExpense}
              onPress={() => router.push(c ? { pathname: '/quick-add', params: { cat: String(c.id) } } : '/quick-add')}
              style={{ minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: Space.xs, paddingHorizontal: Space.md, borderRadius: Radii.pill, borderWidth: 1, borderColor: p.outline, backgroundColor: tone ? tone.bg : p.surfaceMuted }}
            >
              <Icon name={c ? categoryIcon(c) : 'add'} size={18} color={tone ? tone.fg : p.primary} />
              <T variant="label" color={tone ? tone.fg : p.primary}>
                {c ? categoryLabel(c, s) : s.moreCategories}
              </T>
            </PressScale>
          );
        })}
      </View>
    </Card>
  );
}

/** "Your financial tools": principles, investing and net worth, each with a one-line status. */
function ToolsCard() {
  const st = useAppState();
  const { s, money } = useUi();
  const score = principleScore(principles(st));
  const ready = readiness(st).items.filter((i) => i.status === 'good').length;
  const w = wealth(st);
  const hasWealth = st.assets.length > 0 || st.debts.length > 0;
  return (
    <Card title={s.toolsTitle} testID="home.tools">
      <ToolRow testID="home.principles" icon="book" title={s.principlesTitle} text={s.principlesEntry(score.good, score.judged)} to="/principles" />
      <ToolRow testID="home.invest" icon="chartUp" title={s.investTitle} text={s.investEntry(ready)} to="/invest" />
      <ToolRow testID="home.wealth" icon="coins" title={s.wealthOpen} text={hasWealth ? `${s.wealthTitle}: ${money(w.netMinor)}` : s.pMeasureNoData} to="/wealth" />
    </Card>
  );
}

function ToolRow({ testID, icon, title, text, to }: { testID: string; icon: IconName; title: string; text: string; to: '/principles' | '/invest' | '/wealth' }) {
  const { p } = useUi();
  return (
    <PressScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${text}`}
      onPress={() => {
        haptic.tap();
        router.push(to);
      }}
    >
      <Row gap={Space.md} style={{ minHeight: MIN_TAP, paddingVertical: Space.xs }}>
        <View style={{ backgroundColor: p.primaryContainer, borderRadius: Radii.pill, padding: Space.sm }}>
          <Icon name={icon} size={20} color={p.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="label" color={p.primary}>
            {title}
          </T>
          <T variant="small" muted testID={`${testID}.text`}>
            {text}
          </T>
        </View>
        <Icon name="forward" weight="regular" size={18} color={p.textSubtle} />
      </Row>
    </PressScale>
  );
}

/** Last 7 days as tappable bars; the selected day's total and entries are spelled out. */
function WeekCard() {
  const st = useAppState();
  const { s, p, money, say } = useUi();
  const days = lastSevenDays(st);
  const [sel, setSel] = useState(6);
  const name = (i: number) => (i === 6 ? s.weekToday : s.weekdays[dayToDate(days[i].day).getDay()]);
  const detail = (i: number) => s.weekDetail(name(i), money(days[i].totalMinor), days[i].count);
  return (
    <Card title={s.weekTitle} testID="home.week">
      <WeekBars
        testID="week.bars"
        days={days}
        selected={sel}
        onSelect={(i) => {
          haptic.tick();
          setSel(i);
        }}
        dayLabel={(i) => (i === 6 ? s.weekToday : s.weekdaysShort[dayToDate(days[i].day).getDay()])}
        dayName={(i) => say(detail(i))}
      />
      <View style={{ backgroundColor: p.surfaceMuted, borderRadius: Radii.md, padding: Space.md }}>
        <T variant="label" testID="week.detail">
          {detail(sel)}
        </T>
        <T variant="small" muted>
          {s.weekHint}
        </T>
      </View>
    </Card>
  );
}
