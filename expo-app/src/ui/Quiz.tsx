import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategoryKey } from '../domain/models';
import { DEFAULT_PROFILE, IncomeType, MainGoal, Profile, SavingHabit } from '../domain/profile';
import { useUi } from './AppContext';
import { Button, Icon, IconName, Row, Screen, T } from './components';
import { categoryTone, MIN_TAP, Radii, Space } from './theme';

/**
 * The 5-question profile quiz, shared by first-run onboarding and
 * Settings → "My plan & answers". `onDone(null)` = skipped.
 */
type StepKey = 'goal' | 'income' | 'payday' | 'focus' | 'habit';

export function Quiz({ onDone, initial }: { onDone: (p: Profile | null) => void; initial?: Profile | null }) {
  const { s, p } = useUi();
  const [answers, setAnswers] = useState<Profile>(initial ?? DEFAULT_PROFILE);
  const [step, setStep] = useState(0);
  // Payday is only asked when there is a fixed salary.
  const steps: StepKey[] = ['goal', 'income', ...(answers.incomeType === 'salary' ? (['payday'] as const) : []), 'focus', 'habit'];
  const key = steps[Math.min(step, steps.length - 1)];

  function answer(patch: Partial<Profile>) {
    const next = { ...answers, ...patch };
    setAnswers(next);
    const nextSteps: StepKey[] = ['goal', 'income', ...(next.incomeType === 'salary' ? (['payday'] as const) : []), 'focus', 'habit'];
    if (step + 1 >= nextSteps.length) onDone(next);
    else setStep(step + 1);
  }

  const options: Record<Exclude<StepKey, 'payday'>, { title: string; items: { id: string; label: string; icon: IconName; tone?: string; onPress: () => void; selected: boolean }[] }> = {
    goal: {
      title: s.qGoal,
      items: (
        [
          ['emergency', s.goalEmergency, 'shield'],
          ['control', s.goalControl, 'scales'],
          ['debt', s.goalDebt, 'catDebt'],
          ['purchase', s.goalPurchase, 'target'],
          ['track', s.goalTrack, 'analytics'],
        ] as [MainGoal, string, IconName][]
      ).map(([id, label, icon]) => ({ id, label, icon, selected: answers.goal === id, onPress: () => answer({ goal: id }) })),
    },
    income: {
      title: s.qIncome,
      items: (
        [
          ['salary', s.incomeSalary, 'calendar'],
          ['irregular', s.incomeIrregular, 'chartUp'],
          ['allowance', s.incomeAllowance, 'catEducation'],
          ['none', s.incomeNone, 'hourglass'],
        ] as [IncomeType, string, IconName][]
      ).map(([id, label, icon]) => ({
        id,
        label,
        icon,
        selected: answers.incomeType === id,
        onPress: () => answer({ incomeType: id, payday: id === 'salary' ? answers.payday : null }),
      })),
    },
    focus: {
      title: s.qFocus,
      items: [
        ...(
          [
            ['food', 'catFood'],
            ['shopping', 'catShopping'],
            ['transport', 'catTransport'],
            ['entertainment', 'catEntertainment'],
            ['family', 'catFamily'],
            ['telecom', 'catTelecom'],
          ] as [CategoryKey, IconName][]
        ).map(([id, icon]) => ({
          id,
          label: s.cat[id],
          icon,
          tone: categoryTone(p, id, 0).fg,
          selected: answers.focusCategory === id,
          onPress: () => answer({ focusCategory: id }),
        })),
        { id: 'none', label: s.notSure, icon: 'question' as IconName, selected: false, onPress: () => answer({ focusCategory: null }) },
      ],
    },
    habit: {
      title: s.qHabit,
      items: (
        [
          ['rarely', s.habitRarely, 'hourglass'],
          ['sometimes', s.habitSometimes, 'coins'],
          ['regularly', s.habitRegularly, 'savings'],
        ] as [SavingHabit, string, IconName][]
      ).map(([id, label, icon]) => ({ id, label, icon, selected: answers.savingHabit === id, onPress: () => answer({ savingHabit: id }) })),
    },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: Space.sm }}>
        {step > 0 ? <Button kind="text" icon="back" label={s.quizBack} onPress={() => setStep(step - 1)} testID="quiz.back" /> : <View />}
        <Button kind="text" label={s.quizSkipAll} onPress={() => onDone(null)} testID="quiz.skipAll" />
      </Row>
      {/* Progress: text + bar (never colour alone). */}
      <View style={{ paddingHorizontal: Space.gutter, gap: Space.sm }}>
        <T variant="label" muted testID="quiz.progress">
          {s.quizProgress(step + 1, steps.length)}
        </T>
        <View style={{ height: 6, borderRadius: Radii.pill, backgroundColor: p.surfaceMuted, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${((step + 1) / steps.length) * 100}%`, backgroundColor: p.primary, borderRadius: Radii.pill }} />
        </View>
      </View>
      <Screen testID={`quiz.${key}`}>
        {key === 'payday' ? (
          <PaydayStep value={answers.payday} onPick={(d) => answer({ payday: d })} />
        ) : (
          <>
            <T variant="headline">{options[key].title}</T>
            <View accessibilityRole="radiogroup" style={{ gap: Space.sm }}>
              {options[key].items.map((o) => (
                <Pressable
                  key={o.id}
                  testID={`quiz.opt.${o.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: o.selected }}
                  accessibilityLabel={o.label}
                  onPress={o.onPress}
                  style={({ pressed }) => ({
                    minHeight: 60,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Space.md,
                    paddingHorizontal: Space.lg,
                    borderRadius: Radii.lg,
                    borderWidth: o.selected ? 2 : 1,
                    borderColor: o.selected ? p.primary : p.outline,
                    backgroundColor: pressed || o.selected ? p.primaryContainer : p.surface,
                  })}
                >
                  <View style={{ width: 40, height: 40, borderRadius: Radii.sm, backgroundColor: p.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={o.icon} size={24} color={o.tone ?? p.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="subtitle">{o.label}</T>
                  </View>
                  <Icon name="forward" weight="regular" size={18} color={p.textSubtle} />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}

function PaydayStep({ value, onPick }: { value: number | null; onPick: (d: number | null) => void }) {
  const { s, p } = useUi();
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <View style={{ gap: Space.lg }}>
      <T variant="headline">{s.qPayday}</T>
      <T muted>{s.paydayHint}</T>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {days.map((d) => {
          const selected = value === d;
          return (
            <Pressable
              key={d}
              testID={`quiz.payday.${d}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={String(d)}
              onPress={() => onPick(d)}
              style={{ width: MIN_TAP, height: MIN_TAP, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: selected ? p.primary : p.outline, backgroundColor: selected ? p.primary : p.surface }}
            >
              <T variant="subtitle" center color={selected ? p.onPrimary : p.onSurface}>
                {String(d)}
              </T>
            </Pressable>
          );
        })}
      </View>
      <Button kind="outlined" label={s.paydayNotSure} onPress={() => onPick(null)} testID="quiz.payday.none" />
    </View>
  );
}

