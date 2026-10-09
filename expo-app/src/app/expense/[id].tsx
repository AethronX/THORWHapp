import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { minorToEditable, parseAmount } from '../../core/amountParser';
import { Day } from '../../core/dates';
import { isViewingCurrentMonth } from '../../state/selectors';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { Button, confirm, Field, Icon, runGuarded, Screen, T } from '../../ui/components';
import { DateField } from '../../ui/DateField';
import { amountErrorText, categoryIcon, categoryLabel, currencySymbol } from '../../ui/format';
import { categoryTone, MIN_TAP, Radii, Space } from '../../ui/theme';

/** Add (`/expense/new`) or edit (`/expense/<id>`) an expense. */
export default function ExpenseForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const st = useAppState();
  const c = useController();
  const { s, p } = useUi();
  const existing = id === 'new' ? undefined : st.expenses.find((e) => String(e.id) === id);

  const [amount, setAmount] = useState(existing ? minorToEditable(existing.amountMinor, st.currency) : '');
  const [categoryId, setCategoryId] = useState<number | null>(existing?.categoryId ?? null);
  // Default: today in the current month, else the 1st of the viewed month.
  const [date, setDate] = useState<Day>(
    existing?.date ?? (isViewingCurrentMonth(st) ? st.today : { ...st.month, day: 1 }),
  );
  const [note, setNote] = useState(existing?.note ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const parsed = parseAmount(amount, st.currency);
  const amountError = submitted && !parsed.ok ? amountErrorText(parsed.error, st.currency, s) : null;
  // Keep an archived category selectable when editing an old expense.
  const cats = [...st.categories];
  if (categoryId != null && !cats.some((x) => x.id === categoryId)) {
    const archived = st.categoriesById.get(categoryId);
    if (archived) cats.push(archived);
  }

  async function save() {
    setSubmitted(true);
    if (!parsed.ok || categoryId == null) return;
    setBusy(true);
    const data = { amountMinor: parsed.minor, categoryId, date, note };
    const ok = await runGuarded(() => (existing ? c.updateExpense({ ...data, id: existing.id }) : c.addExpense(data)), s.errGeneric);
    setBusy(false);
    if (ok) router.back();
  }

  async function remove() {
    if (!existing) return;
    const yes = await confirm({ title: s.deleteExpenseConfirm, confirmLabel: s.delete, cancelLabel: s.cancel, destructive: true });
    if (!yes) return;
    if (await runGuarded(() => c.deleteExpense(existing.id), s.errGeneric)) router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: existing ? s.editExpense : s.addExpense }} />
      <Screen testID="expenseForm">
        <Field
          testID="expense.amount"
          label={s.amount}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          autoFocus={!existing}
          suffix={currencySymbol(st.currency, st.locale)}
          error={amountError}
          ltr
        />
        <View style={{ gap: Space.sm }}>
          <T variant="label">{s.category}</T>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
            {cats.map((cat) => {
              const selected = cat.id === categoryId;
              return (
                <Pressable
                  key={cat.id}
                  testID={`expense.cat.${cat.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setCategoryId(cat.id)}
                  style={{ minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: Space.xs, paddingHorizontal: Space.md, borderRadius: Radii.pill, borderWidth: 1, borderColor: selected ? p.primary : p.borderStrong, backgroundColor: selected ? p.primaryContainer : p.surface }}
                >
                  <Icon name={selected ? 'check' : categoryIcon(cat)} size={18} color={selected ? p.onPrimaryContainer : categoryTone(p, cat.key, cat.iconCode).fg} />
                  <T color={selected ? p.onPrimaryContainer : p.onSurface}>{categoryLabel(cat, s)}</T>
                </Pressable>
              );
            })}
          </View>
          {submitted && categoryId == null && (
            <T variant="small" color={p.negative} testID="expense.cat.error">
              {s.errCategoryRequired}
            </T>
          )}
        </View>
        {/* No future dates: they'd be invisible until that month arrives. */}
        <DateField label={s.date} value={date} onChange={setDate} max={st.today} testID="expense.date" />
        <Field testID="expense.note" label={s.note} hint={s.noteHint} value={note} onChangeText={setNote} maxLength={120} />
        <Button label={s.save} onPress={save} disabled={busy} testID="expense.save" />
        {existing && <Button kind="danger" icon="delete" label={s.delete} onPress={remove} disabled={busy} testID="expense.delete" />}
      </Screen>
    </>
  );
}
