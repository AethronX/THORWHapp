import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { parseAmount } from '../core/amountParser';
import { Currency, CURRENCIES, DEFAULT_CURRENCY } from '../core/currency';
import { addMonths, daysInMonth, monthOf } from '../core/dates';
import { DEFAULT_PROFILE, Profile, suggestPlan } from '../domain/profile';
import { useAppState, useController, useUi } from '../ui/AppContext';
import { Toggle, Button, Card, Field, Icon, IconName, Row, runGuarded, Screen, T } from '../ui/components';
import { Quiz } from '../ui/Quiz';
import { amountErrorText, currencyName, currencySymbol, formatMoney } from '../ui/format';
import { MIN_TAP, Radii, Space } from '../ui/theme';

/**
 * First run: 3 value pages → 5 questions (≈30 s, skippable) → currency &
 * income → a personal plan built from the answers. Research note: a quiz is
 * only worth asking if the answers change what the user sees — each one here
 * feeds the plan, the "safe to spend" figure or the insights.
 */
type Stage = { kind: 'intro'; page: number } | { kind: 'quiz' } | { kind: 'setup' } | { kind: 'plan'; currency: Currency; incomeMinor: number | null };

export default function Onboarding() {
  const [stage, setStage] = useState<Stage>({ kind: 'intro', page: 0 });
  const [profile, setProfile] = useState<Profile | null>(null);

  if (stage.kind === 'intro') return <Intro page={stage.page} onPage={(page) => setStage(page >= 3 ? { kind: 'quiz' } : { kind: 'intro', page })} />;
  if (stage.kind === 'quiz')
    return (
      <Quiz
        onDone={(p) => {
          setProfile(p);
          setStage({ kind: 'setup' });
        }}
      />
    );
  if (stage.kind === 'setup')
    return <Setup profile={profile} onContinue={(currency, incomeMinor) => setStage({ kind: 'plan', currency, incomeMinor })} />;
  return <PlanReview profile={profile} currency={stage.currency} incomeMinor={stage.incomeMinor} />;
}

// -----------------------------------------------------------------------------
// 1. Value pages
// -----------------------------------------------------------------------------

function Intro({ page, onPage }: { page: number; onPage: (p: number) => void }) {
  const { s, p } = useUi();
  const intro: [IconName, string, string][] = [
    ['expenses', s.onbTitle1, s.onbBody1],
    ['analytics', s.onbTitle2, s.onbBody2],
    ['savings', s.onbTitle3, s.onbBody3],
  ];
  const [icon, title, body] = intro[page];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
      <Row style={{ justifyContent: 'flex-end', paddingHorizontal: Space.sm }}>
        <Button kind="text" label={s.skip} onPress={() => onPage(3)} testID="onb.skip" />
      </Row>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xl, gap: Space.xl }}>
        <View importantForAccessibility="no-hide-descendants" style={{ width: 120, height: 120, borderRadius: 36, backgroundColor: p.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={60} color={p.primary} />
        </View>
        <T variant="headline" center testID="onb.title">
          {title}
        </T>
        <T muted center>
          {body}
        </T>
      </View>
      <Row style={{ padding: Space.gutter, justifyContent: 'space-between' }}>
        <Row gap={Space.xs}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: i === page ? 22 : 8, height: 8, borderRadius: Radii.pill, backgroundColor: i === page ? p.primary : p.outline }} />
          ))}
        </Row>
        <Button label={page === 2 ? s.getStarted : s.next} onPress={() => onPage(page + 1)} testID="onb.next" />
      </Row>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// 3. Currency & income
// -----------------------------------------------------------------------------

function Setup({ profile, onContinue }: { profile: Profile | null; onContinue: (c: Currency, incomeMinor: number | null) => void }) {
  const c = useController();
  const st = useAppState();
  const { s, p } = useUi();
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [income, setIncome] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = income.trim() === '' ? null : parseAmount(income, currency);
  const error = parsed && !parsed.ok ? amountErrorText(parsed.error, currency, s) : null;

  async function next() {
    if (parsed && !parsed.ok) return;
    const incomeMinor = parsed?.ok ? parsed.minor : null;
    // Questions answered → show the personal plan first.
    if (profile) return onContinue(currency, incomeMinor);
    setBusy(true);
    await runGuarded(() => c.completeOnboarding({ currency, monthlyIncomeMinor: incomeMinor, incomeLabel: s.salaryLabel }), s.errGeneric);
    setBusy(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
      <Screen>
        <T variant="headline">{s.setupTitle}</T>
        <Card title={s.setupCurrencyLabel}>
          <View accessibilityRole="radiogroup" style={{ gap: Space.xs }}>
            {CURRENCIES.map((cur) => {
              const selected = cur.code === currency.code;
              return (
                <Pressable
                  key={cur.code}
                  testID={`setup.currency.${cur.code}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setCurrency(cur)}
                  style={{ minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingHorizontal: Space.sm, borderRadius: Radii.md, backgroundColor: selected ? p.primaryContainer : 'transparent' }}
                >
                  <Icon name={selected ? 'radioOn' : 'radioOff'} color={selected ? p.primary : p.onSurfaceMuted} />
                  <View style={{ flex: 1 }}>
                    <T>{`${currencyName(cur, st.locale)} (${cur.code})`}</T>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <T variant="small" muted>
            {s.currencyLockedNote}
          </T>
        </Card>
        <Field
          testID="setup.income"
          label={s.setupIncomeLabel}
          hint={s.setupIncomeHint}
          keyboardType="decimal-pad"
          value={income}
          onChangeText={setIncome}
          suffix={currencySymbol(currency, st.locale)}
          error={error}
          ltr
        />
        <Row style={{ alignItems: 'flex-start' }}>
          <Icon name="lock" size={20} color={p.primary} />
          <View style={{ flex: 1 }}>
            <T variant="small" muted>
              {s.onbPrivacy}
            </T>
          </View>
        </Row>
        <Button label={profile ? s.next : s.setupFinish} onPress={next} disabled={busy || !!error} testID="setup.finish" />
      </Screen>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// 4. Personal plan (only when the questions were answered)
// -----------------------------------------------------------------------------

function PlanReview({ profile, currency, incomeMinor }: { profile: Profile | null; currency: Currency; incomeMinor: number | null }) {
  const c = useController();
  const st = useAppState();
  const { s, p } = useUi();
  const fmt = (minor: number) => formatMoney(minor, currency, st.locale);
  const plan = suggestPlan(profile ?? DEFAULT_PROFILE, incomeMinor ?? 0, currency);
  const [useGoal, setUseGoal] = useState(plan.goal != null);
  const [useBudget, setUseBudget] = useState(plan.focusBudget != null);
  const [busy, setBusy] = useState(false);
  const hasIncome = (incomeMinor ?? 0) > 0;

  async function start() {
    setBusy(true);
    const today = st.today;
    const target = plan.goal ? addMonths(monthOf(today), plan.goal.months) : null;
    await runGuarded(
      () =>
        c.completeOnboarding({
          currency,
          monthlyIncomeMinor: incomeMinor,
          incomeLabel: s.salaryLabel,
          profile,
          goal:
            useGoal && plan.goal && target
              ? {
                  name: plan.goal.kind === 'emergency' ? s.emergencyGoalName : s.purchaseGoalName,
                  targetMinor: plan.goal.targetMinor,
                  targetDate: { ...target, day: Math.min(today.day, daysInMonth(target.year, target.month)) },
                }
              : null,
          budget: useBudget && plan.focusBudget ? { categoryKey: plan.focusBudget.category, limitMinor: plan.focusBudget.limitMinor } : null,
        }),
      s.errGeneric,
    );
    setBusy(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
      <Screen testID="plan.review">
        <View style={{ alignItems: 'center', gap: Space.md }}>
          <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: p.accentContainer, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="smart" size={38} color={p.accentText} />
          </View>
          <T variant="headline" center>
            {s.planTitle2}
          </T>
          <T muted center>
            {s.planIntro}
          </T>
        </View>

        {hasIncome ? (
          <Card>
            <Row style={{ alignItems: 'flex-start' }}>
              <Icon name="savings" color={p.primary} />
              <View style={{ flex: 1 }}>
                <T variant="subtitle" testID="plan.saving">
                  {s.planSaving(fmt(plan.monthlySavingMinor), `${Math.round(plan.savingsRate * 100)}%`)}
                </T>
              </View>
            </Row>
            {plan.goal && (
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ flex: 1, alignItems: 'flex-start' }}>
                  <Icon name={plan.goal.kind === 'emergency' ? 'shield' : 'target'} color={p.primary} />
                  <View style={{ flex: 1 }}>
                    <T>{plan.goal.kind === 'emergency' ? s.planGoalEmergency(fmt(plan.goal.targetMinor)) : s.planGoalPurchase(fmt(plan.goal.targetMinor))}</T>
                  </View>
                </Row>
                <Toggle testID="plan.goal.toggle" value={useGoal} onValueChange={setUseGoal} accessibilityLabel={s.goalsTitle} />
              </Row>
            )}
            {plan.focusBudget && (
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ flex: 1, alignItems: 'flex-start' }}>
                  <Icon name="analytics" color={p.primary} />
                  <View style={{ flex: 1 }}>
                    <T>{s.planBudget(s.cat[plan.focusBudget.category], fmt(plan.focusBudget.limitMinor))}</T>
                  </View>
                </Row>
                <Toggle testID="plan.budget.toggle" value={useBudget} onValueChange={setUseBudget} accessibilityLabel={s.budgetsTitle} />
              </Row>
            )}
          </Card>
        ) : (
          <Card>
            <T>{s.planNoIncomeNote}</T>
          </Card>
        )}

        <Row style={{ alignItems: 'flex-start' }}>
          <Icon name="info" size={18} color={p.textSubtle} />
          <View style={{ flex: 1 }}>
            <T variant="small" muted>
              {s.planRuleNote}
            </T>
          </View>
        </Row>
        <Button label={s.planStart} icon="check" onPress={start} disabled={busy} testID="plan.start" />
      </Screen>
    </SafeAreaView>
  );
}
