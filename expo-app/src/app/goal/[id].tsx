import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { minorToEditable, parseAmount } from '../../core/amountParser';
import { Day } from '../../core/dates';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { Button, confirm, Field, runGuarded, Screen } from '../../ui/components';
import { DateField } from '../../ui/DateField';
import { amountErrorText, currencySymbol } from '../../ui/format';

/** Create (`/goal/new`) or edit (`/goal/<id>`) a savings goal. */
export default function GoalForm() {
  // `name` / `target`: prefilled when created from a guidance step (e.g. emergency fund).
  const { id, name: nameParam, target: targetParam } = useLocalSearchParams<{ id: string; name?: string; target?: string }>();
  const st = useAppState();
  const c = useController();
  const { s } = useUi();
  const existing = id === 'new' ? undefined : st.goals.find((g) => String(g.id) === id);

  const [name, setName] = useState(existing?.name ?? nameParam ?? '');
  const [target, setTarget] = useState(existing ? minorToEditable(existing.targetMinor, st.currency) : (targetParam ?? ''));
  const [saved, setSaved] = useState('');
  const [date, setDate] = useState<Day>(existing?.targetDate ?? { year: st.today.year + 1, month: st.today.month, day: 1 });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const targetParsed = parseAmount(target, st.currency);
  const savedParsed = saved.trim() === '' ? null : parseAmount(saved, st.currency, { allowZero: true });
  const nameError = submitted && name.trim() === '' ? s.errNameEmpty : null;
  const targetError = submitted && !targetParsed.ok ? amountErrorText(targetParsed.error, st.currency, s) : null;
  const savedError = submitted && savedParsed && !savedParsed.ok ? amountErrorText(savedParsed.error, st.currency, s) : null;
  const sym = currencySymbol(st.currency, st.locale);

  async function save() {
    setSubmitted(true);
    if (name.trim() === '' || !targetParsed.ok || (savedParsed && !savedParsed.ok)) return;
    setBusy(true);
    const ok = await runGuarded(
      () =>
        existing
          ? c.updateGoal({ id: existing.id, name, targetMinor: targetParsed.minor, targetDate: date })
          : c.addGoal({ name, targetMinor: targetParsed.minor, targetDate: date, initialSavedMinor: savedParsed?.ok ? savedParsed.minor : 0 }),
      s.errGeneric,
    );
    setBusy(false);
    if (ok) router.back();
  }

  async function remove() {
    if (!existing) return;
    const yes = await confirm({ title: s.deleteGoalConfirm, confirmLabel: s.delete, cancelLabel: s.cancel, destructive: true });
    if (yes && (await runGuarded(() => c.deleteGoal(existing.id), s.errGeneric))) router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: existing ? s.editGoal : s.addGoal }} />
      <Screen testID="goalForm">
        <Field testID="goal.name" label={s.goalName} hint={s.goalNameHint} value={name} onChangeText={setName} maxLength={40} error={nameError} />
        <Field testID="goal.target" label={s.goalTarget} keyboardType="decimal-pad" value={target} onChangeText={setTarget} suffix={sym} error={targetError} ltr />
        {!existing && (
          <Field testID="goal.saved" label={s.goalAlreadySaved} keyboardType="decimal-pad" value={saved} onChangeText={setSaved} suffix={sym} error={savedError} ltr />
        )}
        <DateField label={s.goalTargetDate} value={date} onChange={setDate} min={existing ? undefined : st.today} testID="goal.date" />
        <Button label={s.save} onPress={save} disabled={busy} testID="goal.save" />
        {existing && <Button kind="danger" icon="delete" label={s.delete} onPress={remove} disabled={busy} testID="goal.delete" />}
      </Screen>
    </>
  );
}
