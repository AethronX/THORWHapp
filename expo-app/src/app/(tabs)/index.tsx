import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { monthsUntil, compareDays } from '../../core/dates';
import { goalProgress } from '../../domain/financeEngine';
import type { Insight } from '../../domain/insights';
import { isGoalReached, spendUsage } from '../../domain/models';
import { expenseTotal, health, incomeTotal, insights, netCashFlow, safeToSpend, savingsRate, spends } from '../../state/selectors';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { Button, Card, Fab, Icon, IconName, LabeledProgress, MonthSwitcher, Row, runGuarded, Screen, T } from '../../ui/components';
import { categoryLabel, formatPercent } from '../../ui/format';
import { ScoreRing } from '../../ui/charts';
import { Elevation, Radii, Space } from '../../ui/theme';

export default function Dashboard() {
  const st = useAppState();
  const c = useController();
  const { s, p, money } = useUi();
  const net = netCashFlow(st);
  const rate = savingsRate(st);
  const list = insights(st);
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
          {/* Signature detail: a fine gold rule along the top edge. */}
          <View style={{ position: 'absolute', top: 0, start: Space.xl, end: Space.xl, height: 2, backgroundColor: p.heroAccent, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
          <View accessible accessibilityLabel={`${s.net}: ${money(net)}`} testID="summary.net">
            <T variant="label" color={p.heroAccent}>
              {s.net}
            </T>
            <T variant="display" color={p.onHero}>
              {money(net)}
            </T>
          </View>
          <View style={{ height: 1, backgroundColor: p.onHero, opacity: 0.12 }} />
          <Row style={{ flexWrap: 'wrap' }} gap={Space.lg}>
            <Metric label={s.income} value={money(incomeTotal(st))} icon="income" testID="summary.income" />
            <Metric label={s.expenses} value={money(expenseTotal(st))} icon="expense" testID="summary.expenses" />
            <Metric label={s.savingsRate} value={rate == null ? s.notAvailable : formatPercent(rate)} icon="savings" testID="summary.rate" />
          </Row>
        </View>

        <SmartSummary />

        {st.incomes.length === 0 && (
          <Card title={s.income}>
            <T>{s.noIncomeYet}</T>
            <Row style={{ flexWrap: 'wrap' }}>
              {st.previousMonthHasIncome && (
                <Button kind="tonal" label={s.copyLastMonthIncome} onPress={() => runGuarded(c.copyIncomeFromPreviousMonth, s.errGeneric)} testID="dashboard.copyIncome" />
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
            <T>{s.noBudgets}</T>
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
            <T>{s.noGoalsShort}</T>
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
      </Screen>
      <Fab label={s.addExpense} onPress={() => router.push('/expense/new')} testID="dashboard.addExpense" />
    </View>
  );
}

function Metric({ label, value, icon, testID }: { label: string; value: string; icon: IconName; testID?: string }) {
  const { p } = useUi();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} testID={testID} style={{ flexDirection: 'row', gap: Space.xs, alignItems: 'flex-start', flexShrink: 1 }}>
      <Icon name={icon} size={18} color={p.onHeroMuted} />
      <View>
        <T variant="small" color={p.onHeroMuted}>
          {label}
        </T>
        <T variant="amount" color={p.onHero}>
          {value}
        </T>
      </View>
    </View>
  );
}

/** Health score + safe daily spend at a glance; opens Insights. */
function SmartSummary() {
  const st = useAppState();
  const { s, p, money } = useUi();
  if (incomeTotal(st) === 0 && expenseTotal(st) === 0) return null;
  const h = health(st);
  const safe = safeToSpend(st);
  const color = h.grade === 'excellent' || h.grade === 'good' ? p.positive : h.grade === 'fair' ? p.warning : p.negative;
  return (
    <Pressable
      testID="dashboard.smart"
      accessibilityRole="button"
      accessibilityLabel={`${s.healthTitle}: ${s.healthOutOf(h.score)}${safe ? `، ${s.safeTitle}: ${money(safe.perDayMinor)}` : ''}`}
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
