import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { parseAmount } from '../../core/amountParser';
import { Currency, CURRENCIES, currencyFromCode } from '../../core/currency';
import { HOLDING_KINDS, HoldingKind, LedgerTxKind, position } from '../../domain/ledger';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { Chips } from '../../ui/Chips';
import { Button, Card, confirm, Field, Row, runGuarded, Screen, T } from '../../ui/components';
import { DateField } from '../../ui/DateField';
import { formatDate, formatQuantity } from '../../ui/format';
import { haptic } from '../../ui/feedback';
import { Radii, Space } from '../../ui/theme';

/** Units are parsed like an amount with six decimals, so fractions are exact. */
const UNITS: Currency = { code: 'QTY', exponent: 6 };

/**
 * One holding in the investments ledger (D-059): `/holding/new` creates it,
 * `/holding/<id>` shows where it stands and records what happened to it —
 * including WHY, in the decision journal. Every figure is the user's own.
 */
export default function HoldingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return id === 'new' ? <NewHolding /> : <HoldingDetail id={Number(id)} />;
}

function NewHolding() {
  const st = useAppState();
  const c = useController();
  const { s } = useUi();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<HoldingKind>('fund');
  const [currency, setCurrency] = useState(st.currency.code);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setSubmitted(true);
    if (name.trim() === '') return;
    setBusy(true);
    const ok = await runGuarded(() => c.addHolding({ name, kind, currency }), s.errGeneric);
    setBusy(false);
    if (ok) router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: s.ledgerAdd }} />
      <Screen testID="holdingNew">
        <Field testID="holding.name" label={s.holdingName} value={name} onChangeText={setName} maxLength={50} error={submitted && name.trim() === '' ? s.errNameEmpty : null} />
        <View style={{ gap: Space.sm }}>
          <T variant="label">{s.holdingKindLabel}</T>
          <Chips testID="holding.kind" value={kind} onChange={setKind} options={HOLDING_KINDS.map((k) => [k, s.holdingKind[k]] as const)} />
        </View>
        <View style={{ gap: Space.sm }}>
          <T variant="label">{s.holdingCurrency}</T>
          <Chips testID="holding.currency" scroll value={currency} onChange={setCurrency} options={CURRENCIES.map((x) => [x.code, x.code] as const)} />
        </View>
        <Button label={s.save} onPress={save} disabled={busy} testID="holding.save" />
      </Screen>
    </>
  );
}

function HoldingDetail({ id }: { id: number }) {
  const st = useAppState();
  const c = useController();
  const { s, p, moneyIn, say } = useUi();
  const holding = st.holdings.find((h) => h.id === id);
  const [price, setPrice] = useState('');
  const [kind, setKind] = useState<LedgerTxKind>('buy');
  const [units, setUnits] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [day, setDay] = useState(st.today);
  const [reason, setReason] = useState('');
  const [risks, setRisks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!holding) return <Screen testID="holdingMissing">{null}</Screen>;

  const cur = currencyFromCode(holding.currency).code === holding.currency ? currencyFromCode(holding.currency) : { code: holding.currency, exponent: 2 };
  const pos = position(holding, st.holdingTxs);
  const txs = st.holdingTxs
    .filter((t) => t.holdingId === id)
    .slice()
    .reverse();
  const m = (minor: number, signed = false) => moneyIn(minor, holding.currency, signed);

  async function savePrice() {
    const r = parseAmount(price, cur, { allowZero: true });
    if (!r.ok) return;
    if (await runGuarded(() => c.setHoldingPrice(id, r.minor), s.errGeneric)) {
      haptic.success();
      setPrice('');
    }
  }

  async function record() {
    setError(null);
    const isTrade = kind === 'buy' || kind === 'sell';
    const q = isTrade ? parseAmount(units, UNITS) : { ok: true as const, minor: 0 };
    const pr = isTrade ? parseAmount(unitPrice, cur, { allowZero: true }) : { ok: true as const, minor: 0 };
    const am = isTrade ? { ok: true as const, minor: 0 } : parseAmount(amount, cur);
    const fe = fee.trim() === '' ? { ok: true as const, minor: 0 } : parseAmount(fee, cur, { allowZero: true });
    if (!q.ok || !pr.ok || !am.ok || !fe.ok) {
      setError(s.txInvalid);
      return;
    }
    setBusy(true);
    try {
      await c.addHoldingTx({ holdingId: id, kind, day, quantityMicro: q.minor, priceMinor: pr.minor, amountMinor: am.minor, feeMinor: fe.minor, reason, risks });
      haptic.success();
      setUnits('');
      setUnitPrice('');
      setAmount('');
      setFee('');
      setReason('');
      setRisks('');
    } catch (e) {
      setError(String((e as Error)?.message).includes('sellMoreThanHeld') ? s.txSellTooMuch : s.txInvalid);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const yes = await confirm({ title: s.holdingDeleteConfirm, confirmLabel: s.delete, cancelLabel: s.cancel, destructive: true });
    if (yes && (await runGuarded(() => c.deleteHolding(id), s.errGeneric))) router.back();
  }

  // Each figure is read as one sentence by a screen reader: "Cost: 10.500 Omani rial".
  const stat = (label: string, value: string, testID: string, color?: string) => (
    <View testID={testID} accessible accessibilityLabel={say(`${label}: ${value}`)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space.sm }}>
      <T variant="small" muted>
        {label}
      </T>
      <T variant="label" color={color}>
        {value}
      </T>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: holding.name }} />
      <Screen testID="holding">
        <Card testID="holding.summary">
          <T variant="label" muted>{`${s.holdingKind[holding.kind]} · ${holding.currency}`}</T>
          {stat(s.holdingQuantity, formatQuantity(pos.quantityMicro), 'holding.qty')}
          {stat(s.ledgerCost, m(pos.costMinor), 'holding.cost')}
          {pos.averageCostMinor != null && stat(s.holdingAverage, m(pos.averageCostMinor), 'holding.avg')}
          {pos.valueMinor != null && stat(s.ledgerValue, m(pos.valueMinor), 'holding.value')}
          {pos.unrealizedMinor != null && stat(s.ledgerPaperChange, m(pos.unrealizedMinor, true), 'holding.paper', pos.unrealizedMinor >= 0 ? p.positive : p.negative)}
          {pos.realizedMinor !== 0 && stat(s.ledgerRealized, m(pos.realizedMinor, true), 'holding.realized')}
          {pos.dividendsMinor > 0 && stat(s.ledgerDividends, m(pos.dividendsMinor), 'holding.dividends')}
          {pos.feesMinor > 0 && stat(s.ledgerFees, m(pos.feesMinor), 'holding.fees')}
        </Card>

        <Card title={s.holdingPrice} testID="holding.priceCard">
          <T variant="small" muted testID="holding.priceAsOf">
            {holding.priceMinor != null && holding.priceDay ? `${m(holding.priceMinor)} · ${s.holdingPriceAsOf(formatDate(holding.priceDay, st.locale))}` : s.holdingNoPrice}
          </T>
          <Row gap={Space.sm} style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field testID="holding.price" label={s.holdingSetPrice} keyboardType="decimal-pad" value={price} onChangeText={setPrice} ltr />
            </View>
            <Button size="sm" kind="tonal" label={s.save} onPress={savePrice} testID="holding.savePrice" />
          </Row>
        </Card>

        <Card title={s.txTitle} testID="holding.tx">
          <Chips testID="tx.kind" value={kind} onChange={setKind} options={(['buy', 'sell', 'dividend', 'fee'] as const).map((k) => [k, s.txKind[k]] as const)} />
          {kind === 'buy' || kind === 'sell' ? (
            <Row gap={Space.sm}>
              <View style={{ flex: 1 }}>
                <Field testID="tx.units" label={s.txUnits} keyboardType="decimal-pad" value={units} onChangeText={setUnits} ltr />
              </View>
              <View style={{ flex: 1 }}>
                <Field testID="tx.price" label={s.txUnitPrice} keyboardType="decimal-pad" value={unitPrice} onChangeText={setUnitPrice} ltr />
              </View>
            </Row>
          ) : (
            <Field testID="tx.amount" label={s.txAmount} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} ltr />
          )}
          {(kind === 'buy' || kind === 'sell') && <Field testID="tx.fee" label={s.txFee} keyboardType="decimal-pad" value={fee} onChangeText={setFee} ltr />}
          <DateField label={s.txDate} value={day} onChange={setDay} max={st.today} testID="tx.day" />
          <Field testID="tx.reason" label={s.txReason} value={reason} onChangeText={setReason} maxLength={300} multiline />
          {(kind === 'buy' || kind === 'sell') && <Field testID="tx.risks" label={s.txRisks} value={risks} onChangeText={setRisks} maxLength={300} multiline />}
          {error && (
            <T variant="small" color={p.negative} testID="tx.error">
              {error}
            </T>
          )}
          <Button label={s.txSave} onPress={record} disabled={busy} testID="tx.save" />
        </Card>

        {txs.length > 0 && (
          <Card title={s.txHistory} testID="holding.history">
            {txs.map((t) => (
              <View key={t.id} testID={`tx.row.${t.id}`} style={{ gap: Space.xxs, paddingVertical: Space.xs, borderBottomWidth: 1, borderBottomColor: p.outline }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="label">
                    {t.kind === 'buy' || t.kind === 'sell' ? s.txLine(s.txKind[t.kind], formatQuantity(t.quantityMicro), m(t.priceMinor)) : `${s.txKind[t.kind]} ${m(t.amountMinor)}`}
                  </T>
                  <T variant="small" muted>
                    {formatDate(t.day, st.locale)}
                  </T>
                </Row>
                {t.reason !== '' && (
                  <View style={{ backgroundColor: p.surfaceMuted, borderRadius: Radii.sm, padding: Space.sm }}>
                    <T variant="small">{t.reason}</T>
                    {t.risks !== '' && (
                      <T variant="small" muted>
                        {t.risks}
                      </T>
                    )}
                  </View>
                )}
              </View>
            ))}
          </Card>
        )}

        <Button kind="danger" size="sm" label={s.holdingDelete} onPress={remove} testID="holding.delete" style={{ alignSelf: 'flex-start' }} />
      </Screen>
    </>
  );
}
