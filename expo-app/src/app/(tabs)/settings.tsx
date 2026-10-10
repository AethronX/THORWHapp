import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import type { Locale, ThemeMode } from '../../state/appController';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { Toggle, Button, Card, confirm, Icon, IconName, Row, runGuarded, Screen, T } from '../../ui/components';
import { shareExpensesCsv, shareJsonBackup } from '../../ui/exportData';
import { haptic } from '../../ui/feedback';
import { categoryLabel } from '../../ui/format';
import { authenticate, canUseLock } from '../../ui/lock';
import { MIN_TAP, Radii, Space } from '../../ui/theme';

export default function Settings() {
  const st = useAppState();
  const c = useController();
  const { s, p } = useUi();

  async function toggleLock(on: boolean) {
    if (!(await canUseLock())) {
      Alert.alert(s.appLock, s.lockUnavailable);
      return;
    }
    // Confirm it's the owner — both to turn on and to turn off.
    if (!(await authenticate(s.unlockPrompt, s.cancel))) return;
    haptic.success();
    await runGuarded(() => c.setAppLock(on), s.errGeneric);
  }

  async function doExport(kind: 'json' | 'csv') {
    await runGuarded(async () => {
      const tables = await c.exportTables();
      const ok =
        kind === 'json'
          ? await shareJsonBackup(tables, new Date(), s.exportTitle)
          : await shareExpensesCsv({
              tables,
              currency: st.currency,
              header: s.csvHeader,
              categoryName: (id) => {
                const cat = st.categoriesById.get(id);
                return cat ? categoryLabel(cat, s) : '';
              },
              now: new Date(),
              title: s.exportTitle,
            });
      if (!ok) Alert.alert(s.exportTitle, s.exportUnavailable);
    }, s.errGeneric);
  }

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
      {st.locale === 'ar' && (
        <Card title={s.digitsLabel}>
          <Segmented<'latn' | 'arab'>
            testID="settings.digits"
            value={st.arabicDigits ? 'arab' : 'latn'}
            options={[
              ['latn', '123'],
              ['arab', '١٢٣'],
            ]}
            onChange={(v) => runGuarded(() => c.setArabicDigits(v === 'arab'), s.errGeneric)}
          />
        </Card>
      )}
      <Card title={s.theme}>
        <Segmented<ThemeMode>
          testID="settings.theme"
          value={st.themeMode}
          options={[
            ['light', s.themeLight],
            ['dark', s.themeDark],
            ['system', s.themeSystem],
          ]}
          onChange={(m) => c.setThemeMode(m)}
        />
      </Card>
      <Card>
        <ToggleRow icon="sparkle" label={s.haptics} hint={s.hapticsHint} value={st.haptics} onChange={(v) => runGuarded(() => c.setHaptics(v), s.errGeneric)} testID="settings.haptics" />
      </Card>
      <Card>
        <NavRow icon="smart" label={s.yourPlan} onPress={() => router.push('/profile')} testID="settings.profile" />
        <NavRow icon="coins" label={s.wealthOpen} onPress={() => router.push('/wealth')} testID="settings.wealth" />
        <NavRow icon="book" label={s.principlesTitle} onPress={() => router.push('/principles')} testID="settings.principles" />
        <NavRow icon="chartUp" label={s.investTitle} onPress={() => router.push('/invest')} testID="settings.invest" />
        <NavRow icon="plan" label={s.openPlan} onPress={() => router.push('/plan')} testID="settings.plan" />
        <NavRow icon="wallet" label={s.manageIncome} onPress={() => router.push('/income')} testID="settings.income" />
        <NavRow icon="analytics" label={s.budgetsScreenTitle} onPress={() => router.push('/budgets')} testID="settings.budgets" />
        <NavRow icon="catOther" label={s.categories} onPress={() => router.push('/categories')} testID="settings.categories" />
        <Row style={{ alignItems: 'flex-start' }}>
          <Icon name="currency" color={p.onSurfaceMuted} />
          <View style={{ flex: 1 }}>
            <T>{`${s.currency}: ${st.currency.code}`}</T>
            <T variant="small" muted>
              {s.currencyLockedNote}
            </T>
          </View>
        </Row>
      </Card>
      <Card title={s.privacy}>
        <ToggleRow icon="fingerprint" label={s.appLock} hint={s.appLockHint} value={st.appLock} onChange={toggleLock} testID="settings.appLock" />
        <ToggleRow
          icon="eyeOff"
          label={s.hideAmounts}
          hint={s.hideAmountsHint}
          value={st.hideAmounts}
          onChange={(v) => runGuarded(() => c.setHideAmounts(v), s.errGeneric)}
          testID="settings.hideAmounts"
        />
        <T>{s.privacyBody}</T>
        <View style={{ gap: Space.sm }} testID="settings.export">
          <T variant="subtitle">{s.exportTitle}</T>
          <T variant="small" muted>
            {s.exportBody}
          </T>
          <Row style={{ flexWrap: 'wrap' }} gap={Space.sm}>
            <Button kind="tonal" label={s.exportJson} onPress={() => doExport('json')} testID="settings.exportJson" />
            <Button kind="tonal" label={s.exportCsv} onPress={() => doExport('csv')} testID="settings.exportCsv" />
          </Row>
          <T variant="small" muted>
            {s.exportRestoreNote}
          </T>
        </View>
        <Button kind="danger" icon="delete" label={s.deleteAllData} onPress={deleteAll} testID="settings.deleteAll" />
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
        <Icon name="forward" weight="regular" size={18} color={p.onSurfaceMuted} />
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

function ToggleRow({ icon, label, hint, value, onChange, testID }: { icon: IconName; label: string; hint: string; value: boolean; onChange: (v: boolean) => void; testID: string }) {
  const { p } = useUi();
  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <Icon name={icon} color={p.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <T>{label}</T>
        <T variant="small" muted>
          {hint}
        </T>
      </View>
      <Toggle testID={testID} value={value} onValueChange={onChange} accessibilityLabel={label} />
    </Row>
  );
}
