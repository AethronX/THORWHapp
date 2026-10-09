import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { parseAmount } from '../core/amountParser';
import { Currency, CURRENCIES, DEFAULT_CURRENCY } from '../core/currency';
import { useAppState, useController, useUi } from '../ui/AppContext';
import { Button, Card, Field, Icon, IconName, Row, runGuarded, Screen, T } from '../ui/components';
import { amountErrorText, currencyName, currencySymbol } from '../ui/format';
import { MIN_TAP, Radii, Space } from '../ui/theme';

/** Three short value pages, then a one-screen setup. */
export default function Onboarding() {
  const { s, p } = useUi();
  const [page, setPage] = useState(0);
  const intro: [IconName, string, string][] = [
    ['receipt', s.onbTitle1, s.onbBody1],
    ['chart-donut', s.onbTitle2, s.onbBody2],
    ['piggy-bank-outline', s.onbTitle3, s.onbBody3],
  ];

  if (page >= intro.length) return <Setup />;
  const [icon, title, body] = intro[page];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
      <Row style={{ justifyContent: 'flex-end', paddingHorizontal: Space.sm }}>
        <Button kind="text" label={s.skip} onPress={() => setPage(intro.length)} testID="onb.skip" />
      </Row>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xl, gap: Space.xl }}>
        <View importantForAccessibility="no-hide-descendants" style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: p.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={56} color={p.onPrimaryContainer} />
        </View>
        <T variant="title" center testID="onb.title">
          {title}
        </T>
        <T muted center>
          {body}
        </T>
      </View>
      <Row style={{ padding: Space.gutter, justifyContent: 'space-between' }}>
        <Row gap={Space.xs}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: i === page ? 20 : 8, height: 8, borderRadius: Radii.pill, backgroundColor: i === page ? p.primary : p.outline }} />
          ))}
        </Row>
        <Button label={page === 2 ? s.getStarted : s.next} onPress={() => setPage(page + 1)} testID="onb.next" />
      </Row>
    </SafeAreaView>
  );
}

function Setup() {
  const c = useController();
  const st = useAppState();
  const { s, p } = useUi();
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [income, setIncome] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = income.trim() === '' ? null : parseAmount(income, currency);
  const error = parsed && !parsed.ok ? amountErrorText(parsed.error, currency, s) : null;

  async function finish() {
    if (parsed && !parsed.ok) return;
    setBusy(true);
    await runGuarded(
      () =>
        c.completeOnboarding({
          currency,
          monthlyIncomeMinor: parsed?.ok ? parsed.minor : null,
          incomeLabel: s.salaryLabel,
        }),
      s.errGeneric,
    );
    setBusy(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
      <Screen>
        <T variant="title">{s.setupTitle}</T>
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
                  <Icon name={selected ? 'radiobox-marked' : 'radiobox-blank'} color={selected ? p.primary : p.onSurfaceMuted} />
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
          <Icon name="lock-outline" size={20} color={p.primary} />
          <View style={{ flex: 1 }}>
            <T variant="small" muted>
              {s.onbPrivacy}
            </T>
          </View>
        </Row>
        <Button label={s.setupFinish} onPress={finish} disabled={busy || !!error} testID="setup.finish" />
      </Screen>
    </SafeAreaView>
  );
}
