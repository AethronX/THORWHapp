import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { parseAmount } from '../core/amountParser';
import { Currency, CURRENCIES, DEFAULT_CURRENCY } from '../core/currency';
import { addMonths, daysInMonth, monthOf } from '../core/dates';
import { DEFAULT_PROFILE, Profile, suggestPlan } from '../domain/profile';
import { useAppState, useController, useUi } from '../ui/AppContext';
import { Toggle, Button, Card, Field, Icon, IconName, Row, runGuarded, Screen, T } from '../ui/components';
import { Quiz } from '../ui/Quiz';
import { amountErrorText, currencyName, currencySymbol, formatMoney, formatPercent } from '../ui/format';
import { Elevation, MIN_TAP, Radii, Space } from '../ui/theme';
import { useReducedMotion } from '../ui/motion';

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
  // One step back: plan → setup → questions (Android back follows the same path instead of leaving the app).
  const back = () => setStage((st) => (st.kind === 'plan' ? { kind: 'setup' } : st.kind === 'setup' ? { kind: 'quiz' } : st));
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stage.kind !== 'setup' && stage.kind !== 'plan') return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [stage.kind]);

  if (stage.kind === 'intro') return <Intro page={stage.page} onPage={(page) => setStage(page >= 3 ? { kind: 'quiz' } : { kind: 'intro', page })} />;
  if (stage.kind === 'quiz')
    return (
      <Quiz
        initial={profile}
        onDone={(p) => {
          setProfile(p);
          setStage({ kind: 'setup' });
        }}
      />
    );
  if (stage.kind === 'setup')
    return <Setup profile={profile} onBack={back} onContinue={(currency, incomeMinor) => setStage({ kind: 'plan', currency, incomeMinor })} />;
  return <PlanReview profile={profile} currency={stage.currency} incomeMinor={stage.incomeMinor} onBack={back} />;
}

/** Top-left "Back" for the later onboarding steps (Android's back button does the same). */
function BackBar({ onBack }: { onBack: () => void }) {
  const { s } = useUi();
  return (
    <Row style={{ paddingHorizontal: Space.sm }}>
      <Button kind="text" icon="back" label={s.quizBack} onPress={onBack} testID="onb.back" />
    </Row>
  );
}

// -----------------------------------------------------------------------------
// 1. Value pages
// -----------------------------------------------------------------------------

/** Small badges that float around each page's main icon. */
const INTRO_ACCENTS: [IconName, IconName, IconName][] = [
  ['coins', 'quick', 'catFood'],
  ['chartUp', 'health', 'calendar'],
  ['target', 'shield', 'sparkle'],
];

/**
 * Welcome illustration: a soft brand disc with the page's icon, a gold ring,
 * and three badges that drift gently (off with Reduce Motion). Decorative only.
 */
function IntroArt({ icon, accents }: { icon: IconName; accents: [IconName, IconName, IconName] }) {
  const { p } = useUi();
  const reduced = useReducedMotion();
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    Animated.spring(enter, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, enter, drift]);
  const up = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const down = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });
  const badge = (name: IconName, pos: object, t: Animated.AnimatedInterpolation<number>, gold = false) => (
    <Animated.View
      style={{
        position: 'absolute',
        ...pos,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: p.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: p.outline,
        ...Elevation.raised,
        transform: [{ translateY: t }, { scale: enter }],
      }}
    >
      <Icon name={name} size={24} color={gold ? p.accentText : p.primary} />
    </Animated.View>
  );
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: 220, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: p.primaryContainer,
          borderWidth: 2,
          borderColor: p.brandGold,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: enter }],
          opacity: enter,
        }}
      >
        <Icon name={icon} size={72} color={p.primary} />
      </Animated.View>
      {badge(accents[0], { top: 4, start: 14 }, up, true)}
      {badge(accents[1], { top: 40, end: 0 }, down)}
      {badge(accents[2], { bottom: 0, start: 36 }, down)}
    </View>
  );
}

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
        <IntroArt key={page} icon={icon} accents={INTRO_ACCENTS[page]} />
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

function Setup({ profile, onContinue, onBack }: { profile: Profile | null; onContinue: (c: Currency, incomeMinor: number | null) => void; onBack: () => void }) {
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
      <BackBar onBack={onBack} />
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
          suffix={currencySymbol(currency, st.locale, st.classicSign)}
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

function PlanReview({ profile, currency, incomeMinor, onBack }: { profile: Profile | null; currency: Currency; incomeMinor: number | null; onBack: () => void }) {
  const c = useController();
  const st = useAppState();
  const { s, p } = useUi();
  const fmt = (minor: number) => formatMoney(minor, currency, st.locale, false, st.classicSign);
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
      <BackBar onBack={onBack} />
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
                  {s.planSaving(fmt(plan.monthlySavingMinor), formatPercent(plan.savingsRate))}
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
          <Icon name="info" size={16} color={p.textSubtle} />
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
