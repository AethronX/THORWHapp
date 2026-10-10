import { useState } from 'react';
import { View } from 'react-native';

import { normalizeDigits, parseAmount } from '../core/amountParser';
import { compareScenarios, FinanceInputError, FutureValueResult, realValue } from '../domain/financeEngine';
import { useAppState, useUi } from '../ui/AppContext';
import { Card, Field, Icon, Row, Screen, T } from '../ui/components';
import { amountErrorText, currencySymbol } from '../ui/format';
import { Fonts, Radii, Space } from '../ui/theme';

const num = (s: string) => {
  const t = normalizeDigits(s.trim());
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};
const trim = (v: number) => (Number.isInteger(v) ? String(v) : String(v));

/** "Saving only" vs a user-entered hypothetical return, plus inflation. */
export default function Plan() {
  const st = useAppState();
  const { s, p, money } = useUi();
  const [initial, setInitial] = useState('0');
  const [monthly, setMonthly] = useState('50');
  const [years, setYears] = useState('10');
  const [rate, setRate] = useState('4');
  const [inflation, setInflation] = useState('2');

  const cur = st.currency;
  const ini = initial.trim() === '' ? ({ ok: true, minor: 0 } as const) : parseAmount(initial, cur, { allowZero: true });
  const mon = parseAmount(monthly, cur, { allowZero: true });
  const y = num(years);
  const r = num(rate);
  const inf = num(inflation);
  const yearsOk = y != null && Number.isInteger(y) && y >= 1 && y <= 50;
  const rateOk = r != null && r >= 0 && r <= 100;
  const infOk = inf != null && inf >= -50 && inf <= 100;

  let results: FutureValueResult[] | null = null;
  let real: number | null = null;
  let outOfRange = false;
  if (ini.ok && mon.ok && yearsOk && rateOk && infOk) {
    try {
      results = compareScenarios({ initialMinor: ini.minor, monthlyMinor: mon.minor, months: y! * 12, annualRatesPercent: [0, r!] });
      real = realValue({ nominalMinor: results[1].nominalValueMinor, months: y! * 12, annualInflationPercent: inf! });
    } catch (e) {
      if (!(e instanceof FinanceInputError)) throw e;
      // Too large to represent exactly: say so, never show a clamped number.
      results = null;
      outOfRange = true;
    }
  }

  const sym = currencySymbol(cur, st.locale, st.classicSign);
  return (
    <Screen testID="plan">
      <T muted>{s.calcIntro}</T>
      <Field testID="calc.initial" label={s.calcInitial} keyboardType="decimal-pad" value={initial} onChangeText={setInitial} suffix={sym} error={ini.ok ? null : amountErrorText(ini.error, cur, s)} ltr />
      <Field testID="calc.monthly" label={s.calcMonthly} keyboardType="decimal-pad" value={monthly} onChangeText={setMonthly} suffix={sym} error={mon.ok ? null : amountErrorText(mon.error, cur, s)} ltr />
      <Field testID="calc.years" label={s.calcYears} keyboardType="number-pad" value={years} onChangeText={setYears} error={yearsOk ? null : s.errYearsRange} ltr />
      <Field testID="calc.rate" label={s.calcRate} keyboardType="decimal-pad" value={rate} onChangeText={setRate} error={rateOk ? null : s.errRateRange} ltr />
      <Field testID="calc.inflation" label={s.calcInflation} keyboardType="numbers-and-punctuation" value={inflation} onChangeText={setInflation} error={infOk ? null : s.errInflationRange} ltr />

      {outOfRange && (
        <T color={p.negative} testID="calc.outOfRange">
          {s.errAmountTooLarge}
        </T>
      )}
      {results && real != null && (
        <Card testID="calc.results">
          <ResultRow label={s.calcContributed} value={money(results[0].totalContributedMinor)} />
          <ResultRow testID="calc.result.zero" label={s.calcNoReturn} value={money(results[0].nominalValueMinor)} />
          <ResultRow testID="calc.result.rate" label={s.calcWithReturn(trim(r!))} value={money(results[1].nominalValueMinor)} emphasize />
          <ResultRow label={s.calcGrowth} value={money(results[1].hypotheticalGrowthMinor, true)} muted />
          <ResultRow testID="calc.result.real" label={s.calcRealValue(trim(inf!))} value={money(real)} />
        </Card>
      )}

      <Row style={{ alignItems: 'flex-start', backgroundColor: p.surfaceMuted, borderRadius: Radii.md, padding: Space.md }}>
        <Icon name="info" size={16} color={p.onSurfaceMuted} />
        <View style={{ flex: 1 }}>
          <T variant="small" muted testID="calc.disclaimer">
            {s.calcDisclaimer}
          </T>
        </View>
      </Row>
    </Screen>
  );
}

function ResultRow({ label, value, emphasize, muted, testID }: { label: string; value: string; emphasize?: boolean; muted?: boolean; testID?: string }) {
  const { p, say } = useUi();
  return (
    <View accessible accessibilityLabel={say(`${label}: ${value}`)} testID={testID} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm }}>
      <T variant={muted ? 'small' : 'body'} muted={muted}>
        {label}
      </T>
      <T variant={emphasize ? 'subtitle' : muted ? 'small' : 'body'} muted={muted} color={emphasize ? p.primary : undefined} style={emphasize ? { fontFamily: Fonts.bold } : undefined}>
        {value}
      </T>
    </View>
  );
}
