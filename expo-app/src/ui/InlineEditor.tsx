import { useRef, useState } from 'react';

import { minorToEditable, parseAmount } from '../core/amountParser';
import { useAppState, useUi } from './AppContext';
import { Button, Card, Field, Row } from './components';
import { amountErrorText, currencySymbol } from './format';

/**
 * Inline amount (+ optional text) editor used for income lines, budget limits
 * and goal deposits. (Alert.prompt does not exist on Android.)
 */
export function AmountEditor({
  title,
  initialMinor,
  textLabel,
  textHint,
  initialText = '',
  allowEmpty = false,
  onSave,
  onCancel,
  onDelete,
  deleteLabel,
  validate,
  testID = 'editor',
}: {
  title: string;
  initialMinor?: number | null;
  textLabel?: string;
  textHint?: string;
  initialText?: string;
  /** Empty amount saves `null` (e.g. "no limit"). */
  allowEmpty?: boolean;
  onSave: (minor: number | null, text: string) => Promise<unknown> | void;
  onCancel: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  /** Extra check; return an error message to block saving. */
  validate?: (minor: number) => string | null;
  testID?: string;
}) {
  const st = useAppState();
  const { s } = useUi();
  const [amount, setAmount] = useState(initialMinor ? minorToEditable(initialMinor, st.currency) : '');
  const [text, setText] = useState(initialText);
  const [submitted, setSubmitted] = useState(false);
  const empty = amount.trim() === '';
  const parsed = parseAmount(amount, st.currency);
  const error = !submitted
    ? null
    : allowEmpty && empty
      ? null
      : !parsed.ok
        ? amountErrorText(parsed.error, st.currency, s)
        : (validate?.(parsed.minor) ?? null);

  // A ref, not only state: two taps in the same frame must not record money twice.
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (busyRef.current) return;
    setSubmitted(true);
    if (!(allowEmpty && empty) && (!parsed.ok || validate?.(parsed.minor))) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await (allowEmpty && empty ? onSave(null, text) : onSave(parsed.ok ? parsed.minor : 0, text));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Card title={title} testID={testID}>
      <Field
        testID={`${testID}.amount`}
        label={s.amount}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        autoFocus
        suffix={currencySymbol(st.currency, st.locale, st.classicSign)}
        error={error}
        ltr
      />
      {textLabel && <Field testID={`${testID}.text`} label={textLabel} hint={textHint} value={text} onChangeText={setText} maxLength={40} />}
      <Row style={{ flexWrap: 'wrap' }}>
        <Button label={s.save} onPress={save} disabled={busy} testID={`${testID}.save`} />
        <Button kind="text" label={s.cancel} onPress={onCancel} testID={`${testID}.cancel`} />
        {onDelete && <Button kind="danger" label={deleteLabel ?? s.delete} onPress={onDelete} testID={`${testID}.delete`} />}
      </Row>
    </Card>
  );
}
