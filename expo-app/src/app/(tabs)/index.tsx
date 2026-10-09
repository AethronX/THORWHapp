import { router } from 'expo-router';
import { View } from 'react-native';

import { monthsUntil, compareDays } from '../../core/dates';
import { goalProgress } from '../../domain/financeEngine';
import type { Insight } from '../../domain/insights';
import { isGoalReached, spendUsage } from '../../domain/models';
import { expenseTotal, incomeTotal, insights, netCashFlow, savingsRate, spends } from '../../state/selectors';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { Button, Card, Fab, Icon, IconName, LabeledProgress, MonthSwitcher, Row, runGuarded, Screen, T } from '../../ui/components';
import { categoryLabel, formatPercent } from '../../ui/format';
import { Radii, Space } from '../../ui/theme';

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
    i.severity === 'critical' ? ['alert-circle-outline', p.negative] : i.severity === 'warning' ? ['alert-outline', p.warning] : ['information-outline', p.primary];

  return (
    <View style={{ flex: 1 }}>
      <Screen testID="dashboard">
        <MonthSwitcher />

        <View style={{ backgroundColor: p.primary, borderRadius: Radii.lg, padding: Space.xl, gap: Space.md }}>
          <View accessible accessibilityLabel={`${s.net}: ${money(net)}`} testID="summary.net">
            <T variant="label" color={p.onPrimary}>
              {s.net}
            </T>
            <T variant="display" color={p.onPrimary}>
              {money(net)}
            </T>
          </View>
          <Row style={{ flexWrap: 'wrap' }} gap={Space.lg}>
            <Metric label={s.income} value={money(incomeTotal(st))} icon="arrow-bottom-left" testID="summary.income" />
            <Metric label={s.expenses} value={money(expenseTotal(st))} icon="arrow-top-right" testID="summary.expenses" />
            <Metric label={s.savingsRate} value={rate == null ? s.notAvailable : formatPercent(rate)} icon="piggy-bank-outline" testID="summary.rate" />
          </Row>
        </View>

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
              <Icon name="check-circle-outline" color={p.positive} />
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
      <Icon name={icon} size={18} color={p.onPrimary} />
      <View>
        <T variant="small" color={p.onPrimary}>
          {label}
        </T>
        <T variant="subtitle" color={p.onPrimary}>
          {value}
        </T>
      </View>
    </View>
  );
}
