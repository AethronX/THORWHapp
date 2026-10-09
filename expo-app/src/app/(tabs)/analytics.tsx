import { View } from 'react-native';

import { categoryBreakdown, change, Change, HealthComponentKey } from '../../domain/analytics';
import { expenseTotal, health, incomeTotal, monthEndForecast, previousMonthTotals, safeToSpend, spends } from '../../state/selectors';
import { useAppState, useUi } from '../../ui/AppContext';
import { Card, EmptyState, Icon, LabeledProgress, MonthSwitcher, Row, Screen, T } from '../../ui/components';
import { Donut, LegendRow, PairedBars, ScoreRing } from '../../ui/charts';
import { categoryLabel, formatPercent } from '../../ui/format';
import type { Strings } from '../../ui/i18n';
import { categoryTone, Palette, Radii, Space } from '../../ui/theme';

const SHORT_MONTHS: Record<'ar' | 'en', string[]> = {
  ar: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function gradeText(g: string, s: Strings) {
  return g === 'excellent' ? s.gradeExcellent : g === 'good' ? s.gradeGood : g === 'fair' ? s.gradeFair : s.gradeNeedsWork;
}

function gradeColor(g: string, p: Palette) {
  return g === 'excellent' || g === 'good' ? p.positive : g === 'fair' ? p.warning : p.negative;
}

const COMPONENT_LABEL: Record<HealthComponentKey, keyof Strings> = {
  savings: 'compSavings',
  budgets: 'compBudgets',
  cushion: 'compCushion',
  tracking: 'compTracking',
};
const COMPONENT_TIP: Record<HealthComponentKey, keyof Strings> = {
  savings: 'tipSavings',
  budgets: 'tipBudgets',
  cushion: 'tipCushion',
  tracking: 'tipTracking',
};

export default function Analytics() {
  const st = useAppState();
  const { s, p, money } = useUi();
  const income = incomeTotal(st);
  const spent = expenseTotal(st);
  const hasAny = income > 0 || spent > 0 || st.trend.some((m) => m.incomeMinor > 0 || m.expensesMinor > 0);

  if (!hasAny) {
    return (
      <Screen testID="analytics">
        <MonthSwitcher />
        <EmptyState icon="analytics" title={s.analyticsEmpty} />
      </Screen>
    );
  }

  const h = health(st);
  const safe = safeToSpend(st);
  const forecast = monthEndForecast(st);
  const prev = previousMonthTotals(st);
  // Current month: compare spending with the same days of last month.
  const prevSpent = st.previousSamePeriodExpensesMinor ?? prev?.expensesMinor ?? 0;
  const slices = categoryBreakdown(spends(st));
  const sliceColor = (id: number | null) => {
    if (id == null) return p.borderStrong;
    const c = st.categoriesById.get(id);
    return categoryTone(p, c?.key ?? null, c?.iconCode ?? 11).fg;
  };
  const sliceLabel = (id: number | null) => {
    if (id == null) return s.otherSlice;
    const c = st.categoriesById.get(id);
    return c ? categoryLabel(c, s) : s.otherSlice;
  };
  const strings = s as unknown as Record<string, string>;

  const changeText = (c: Change) =>
    c.pct == null ? (c.deltaMinor === 0 ? s.changeSame : s.changeNew) : Math.abs(c.pct) < 0.02 ? s.changeSame : c.pct > 0 ? s.changeUp(formatPercent(c.pct)) : s.changeDown(formatPercent(-c.pct));

  return (
    <Screen testID="analytics">
      <MonthSwitcher />

      {/* 1. Financial health — transparent score with the next best step. */}
      <Card title={s.healthTitle} testID="analytics.health">
        <Row gap={Space.lg} style={{ alignItems: 'center' }}>
          <ScoreRing score={h.score} color={gradeColor(h.grade, p)} label={`${s.healthTitle}: ${s.healthOutOf(h.score)}، ${gradeText(h.grade, s)}`} />
          <View style={{ flex: 1, gap: Space.xs }}>
            <T variant="title" color={gradeColor(h.grade, p)} testID="analytics.grade">
              {gradeText(h.grade, s)}
            </T>
            <T variant="small" muted>
              {s.healthOutOf(h.score)}
            </T>
          </View>
        </Row>
        {h.components.map((c) => (
          <LabeledProgress key={c.key} value={c.points / c.max} label={strings[COMPONENT_LABEL[c.key]]} trailing={`${c.points}/${c.max}`} />
        ))}
        <Row style={{ alignItems: 'flex-start', backgroundColor: p.accentContainer, borderRadius: Radii.md, padding: Space.md }}>
          <Icon name="tip" color={p.accentText} />
          <View style={{ flex: 1 }}>
            <T color={p.accentText} testID="analytics.tip">
              {strings[COMPONENT_TIP[h.focus]]}
            </T>
          </View>
        </Row>
        <T variant="small" muted>
          {s.healthNote}
        </T>
      </Card>

      {/* 2. Safe daily spend + month-end forecast (current month only). */}
      {safe && (
        <Card testID="analytics.safe">
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name="wallet" color={p.primary} />
            <View style={{ flex: 1, gap: Space.xs }}>
              <T variant="label" muted>
                {s.safeTitle}
              </T>
              <T variant="display" color={safe.perDayMinor > 0 ? p.primary : p.negative} testID="analytics.safe.amount">
                {money(safe.perDayMinor)}
              </T>
              <T variant="small" muted>
                {safe.perDayMinor > 0 ? (safe.untilPayday ? s.safeUntilPayday(safe.daysLeft) : s.safeUntilMonthEnd(safe.daysLeft)) : s.safeZero}
              </T>
            </View>
          </Row>
        </Card>
      )}
      {forecast != null && (
        <Card testID="analytics.forecast">
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name={income > 0 && forecast > income ? 'warning' : 'chartUp'} color={income > 0 && forecast > income ? p.warning : p.info} />
            <View style={{ flex: 1, gap: Space.xs }}>
              <T variant="label" muted>
                {s.projectionTitle}
              </T>
              <T>{s.projectionBody(money(forecast))}</T>
              {income > 0 && forecast > income && (
                <T color={p.warning} testID="analytics.paceWarning">
                  {s.insightPaceOverIncome(money(forecast - income))}
                </T>
              )}
            </View>
          </Row>
        </Card>
      )}

      {/* 3. Compared with last month. */}
      {prev && (prev.incomeMinor > 0 || prev.expensesMinor > 0) && (
        <Card title={s.vsLastMonth} testID="analytics.compare">
          {(
            [
              ['income', s.income, change(income, prev.incomeMinor), true],
              ['expense', s.expenses, change(spent, prevSpent), false],
            ] as const
          ).map(([icon, label, c, upIsGood]) => {
            const same = c.pct == null ? c.deltaMinor === 0 : Math.abs(c.pct) < 0.02;
            const good = same || (c.deltaMinor > 0) === upIsGood;
            const tone = same ? p.onSurfaceMuted : good ? p.positive : p.warning;
            return (
              <Row key={icon} style={{ justifyContent: 'space-between' }}>
                <Row>
                  <Icon name={icon} color={p.onSurfaceMuted} />
                  <T>{label}</T>
                </Row>
                <Row gap={Space.xs}>
                  <Icon name={same ? 'remove' : c.deltaMinor > 0 ? 'trendUp' : 'trendDown'} size={18} color={tone} />
                  <T variant="label" color={tone}>
                    {changeText(c)}
                  </T>
                </Row>
              </Row>
            );
          })}
          {st.previousSamePeriodExpensesMinor != null && (
            <T variant="small" muted>
              {s.samePeriodNote(st.today.day)}
            </T>
          )}
        </Card>
      )}

      {/* 4. Where the money went. */}
      {slices.length > 0 && (
        <Card title={s.byCategory} testID="analytics.categories">
          <View style={{ alignItems: 'center' }}>
            <Donut
              testID="analytics.donut"
              slices={slices.map((x) => ({ value: x.amountMinor, color: sliceColor(x.categoryId) }))}
              centerTop={s.expenses}
              centerBottom={money(spent)}
              label={slices.map((x) => `${sliceLabel(x.categoryId)} ${formatPercent(x.share)}`).join('، ')}
            />
          </View>
          {slices.map((x) => (
            <LegendRow key={String(x.categoryId)} color={sliceColor(x.categoryId)} label={`${sliceLabel(x.categoryId)} · ${formatPercent(x.share)}`} value={money(x.amountMinor)} share={x.share} />
          ))}
          {st.month.year === st.today.year && st.month.month === st.today.month && (
            <T variant="small" muted>
              {s.dailyAverage(money(Math.round(spent / Math.max(1, st.today.day))))}
            </T>
          )}
        </Card>
      )}

      {/* 5. Six-month trend. */}
      <Card title={s.trendTitle} testID="analytics.trend">
        <PairedBars
          testID="analytics.bars"
          data={st.trend.map((m, i) => ({
            label: SHORT_MONTHS[st.locale][m.month.month - 1],
            a: m.incomeMinor,
            b: m.expensesMinor,
            highlight: i === st.trend.length - 1,
          }))}
          colorA={p.income}
          colorB={p.borderStrong}
          label={st.trend.map((m) => `${SHORT_MONTHS[st.locale][m.month.month - 1]}: ${s.income} ${money(m.incomeMinor)}، ${s.expenses} ${money(m.expensesMinor)}`).join('؛ ')}
        />
        <Row style={{ justifyContent: 'center' }} gap={Space.lg}>
          <Row gap={Space.xs}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: p.income }} />
            <T variant="small">{s.income}</T>
          </Row>
          <Row gap={Space.xs}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: p.borderStrong }} />
            <T variant="small">{s.expenses}</T>
          </Row>
        </Row>
        {(() => {
          const months = st.trend.filter((m) => m.expensesMinor > 0 || m.incomeMinor > 0);
          if (months.length < 2) return null;
          const avg = Math.round(months.reduce((a, m) => a + m.expensesMinor, 0) / months.length);
          return (
            <T variant="small" muted>
              {s.avgSpending(money(avg))}
            </T>
          );
        })()}
      </Card>
    </Screen>
  );
}
