import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { minorToEditable, parseAmount } from '../../core/amountParser';
import { parsePercent } from '../../core/percent';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { Button, confirm, Field, runGuarded, Screen } from '../../ui/components';
import { amountErrorText, currencySymbol } from '../../ui/format';

/** Add (`/debt/new`) or edit (`/debt/<id>`) an obligation. Editing sets the amount remaining NOW. */
export default function DebtForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const st = useAppState();
  const c = useController();
  const { s } = useUi();
  const existing = id === 'new' ? undefined : st.debts.find((d) => String(d.id) === id);
  const sym = currencySymbol(st.currency, st.locale, st.classicSign);

  const [name, setName] = useState(existing?.name ?? '');
  const [remaining, setRemaining] = useState(existing ? minorToEditable(existing.remainingMinor, st.currency) : '');
  const [rate, setRate] = useState(existing && existing.annualRatePercent > 0 ? String(existing.annualRatePercent) : '');
  const [payment, setPayment] = useState(existing && existing.monthlyPaymentMinor > 0 ? minorToEditable(existing.monthlyPaymentMinor, st.currency) : '');
  const [due, setDue] = useState(existing?.dueDay ? String(existing.dueDay) : '');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const remParsed = parseAmount(remaining, st.currency);
  const payParsed = payment.trim() === '' ? null : parseAmount(payment, st.currency);
  const rateVal = rate.trim() === '' ? 0 : parsePercent(rate);
  const dueVal = due.trim() === '' ? null : /^\d{1,2}$/.test(due.trim()) && Number(due) >= 1 && Number(due) <= 31 ? Number(due) : NaN;

  const errors = {
    name: submitted && name.trim() === '' ? s.errNameEmpty : null,
    remaining: submitted && !remParsed.ok ? amountErrorText(remParsed.error, st.currency, s) : null,
    payment: submitted && payParsed && !payParsed.ok ? amountErrorText(payParsed.error, st.currency, s) : null,
    rate: submitted && rateVal == null ? s.errRate : null,
    due: submitted && Number.isNaN(dueVal) ? s.errDueDay : null,
  };

  async function save() {
    setSubmitted(true);
    if (name.trim() === '' || !remParsed.ok || (payParsed && !payParsed.ok) || rateVal == null || Number.isNaN(dueVal)) return;
    setBusy(true);
    const data = {
      name,
      remainingMinor: remParsed.minor,
      annualRatePercent: rateVal,
      monthlyPaymentMinor: payParsed?.ok ? payParsed.minor : 0,
      dueDay: dueVal as number | null,
    };
    const ok = await runGuarded(() => (existing ? c.updateDebt({ ...data, id: existing.id }) : c.addDebt(data)), s.errGeneric);
    setBusy(false);
    if (ok) router.back();
  }

  async function remove() {
    if (!existing) return;
    const yes = await confirm({ title: s.deleteDebtConfirm, confirmLabel: s.delete, cancelLabel: s.cancel, destructive: true });
    if (yes && (await runGuarded(() => c.deleteDebt(existing.id), s.errGeneric))) router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: existing ? s.editDebt : s.addDebt }} />
      <Screen testID="debtForm">
        <Field testID="debt.name" label={s.debtName} value={name} onChangeText={setName} maxLength={40} error={errors.name} />
        <Field testID="debt.remaining" label={s.debtRemainingLabel} keyboardType="decimal-pad" value={remaining} onChangeText={setRemaining} suffix={sym} error={errors.remaining} ltr />
        <Field testID="debt.payment" label={s.debtPaymentLabel} keyboardType="decimal-pad" value={payment} onChangeText={setPayment} suffix={sym} error={errors.payment} ltr />
        <Field testID="debt.rate" label={s.debtRateLabel} keyboardType="decimal-pad" value={rate} onChangeText={setRate} suffix="%" error={errors.rate} ltr />
        <Field testID="debt.due" label={s.debtDueLabel} keyboardType="number-pad" value={due} onChangeText={setDue} error={errors.due} ltr maxLength={2} />
        <Button label={s.save} onPress={save} disabled={busy} testID="debt.save" />
        {existing && <Button kind="danger" icon="delete" label={s.delete} onPress={remove} disabled={busy} testID="debt.delete" />}
      </Screen>
    </>
  );
}
