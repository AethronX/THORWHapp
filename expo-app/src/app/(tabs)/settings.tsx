import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { Locale, ThemeMode } from '../../state/appController';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { Button, Card, confirm, Icon, IconName, Row, runGuarded, Screen, T } from '../../ui/components';
import { MIN_TAP, Radii, Space } from '../../ui/theme';

export default function Settings() {
  const st = useAppState();
  const c = useController();
  const { s, p } = useUi();

  async function deleteAll() {
    const yes = await confirm({
      title: s.deleteAllConfirmTitle,
      body: s.deleteAllConfirmBody,
      confirmLabel: s.deleteAllConfirmAction,
      cancelLabel: s.cancel,
      destructive: true,
    });
    if (yes) await runGuarded(() => c.deleteAllData(), s.errGeneric);
  }

  return (
    <Screen testID="settings">
      <Card title={s.language}>
        <Segmented<Locale>
          testID="settings.lang"
          value={st.locale}
          options={[
            ['ar', 'العربية'],
            ['en', 'English'],
          ]}
          onChange={(l) => c.setLocale(l)}
        />
      </Card>
      <Card title={s.theme}>
        <Segmented<ThemeMode>
          testID="settings.theme"
          value={st.themeMode}
          options={[
            ['system', s.themeSystem],
            ['light', s.themeLight],
            ['dark', s.themeDark],
          ]}
          onChange={(m) => c.setThemeMode(m)}
        />
      </Card>
      <Card>
        <NavRow icon="cash" label={s.manageIncome} onPress={() => router.push('/income')} testID="settings.income" />
        <NavRow icon="chart-donut" label={s.budgetsScreenTitle} onPress={() => router.push('/budgets')} testID="settings.budgets" />
        <NavRow icon="shape-outline" label={s.categories} onPress={() => router.push('/categories')} testID="settings.categories" />
        <Row style={{ alignItems: 'flex-start' }}>
          <Icon name="currency-usd" color={p.onSurfaceMuted} />
          <View style={{ flex: 1 }}>
            <T>{`${s.currency}: ${st.currency.code}`}</T>
            <T variant="small" muted>
              {s.currencyLockedNote}
            </T>
          </View>
        </Row>
      </Card>
      <Card title={s.privacy}>
        <T>{s.privacyBody}</T>
        <Button kind="danger" icon="delete-forever-outline" label={s.deleteAllData} onPress={deleteAll} testID="settings.deleteAll" />
      </Card>
      <Card title={s.about}>
        <T>{s.aboutBody}</T>
        <T variant="small" muted>
          {s.version(Constants.expoConfig?.version ?? '0.1.0')}
        </T>
      </Card>
    </Screen>
  );
}

function NavRow({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID?: string }) {
  const { p, rtl } = useUi();
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: MIN_TAP, justifyContent: 'center' }}>
      <Row>
        <Icon name={icon} color={p.onSurfaceMuted} />
        <View style={{ flex: 1 }}>
          <T>{label}</T>
        </View>
        <Icon name={rtl ? 'chevron-left' : 'chevron-right'} color={p.onSurfaceMuted} />
      </Row>
    </Pressable>
  );
}

function Segmented<V extends string>({ value, options, onChange, testID }: { value: V; options: [V, string][]; onChange: (v: V) => void; testID?: string }) {
  const { p } = useUi();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', borderWidth: 1, borderColor: p.outline, borderRadius: Radii.md, overflow: 'hidden' }}>
      {options.map(([v, label]) => {
        const selected = v === value;
        return (
          <Pressable
            key={v}
            testID={`${testID}.${v}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            onPress={() => onChange(v)}
            style={{ flex: 1, minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.xs, backgroundColor: selected ? p.primaryContainer : 'transparent' }}
          >
            <T center color={selected ? p.onPrimaryContainer : p.onSurface}>
              {label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
