import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Appearance, AppState as RNAppState, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { expoDbDriver } from '../data/expoDb';
import { AppController } from '../state/appController';
import { AppProvider, useAppState, useController, useUi } from '../ui/AppContext';
import { Button, EmptyState, Loading } from '../ui/components';
import { setHapticsEnabled } from '../ui/feedback';
import { LockScreen } from '../ui/lock';
import { ToastHost } from '../ui/toast';
import { Fonts } from '../ui/theme';

export default function RootLayout() {
  const [controller] = useState(() => new AppController(expoDbDriver));
  const [fontsLoaded, fontError] = useFonts({
    [Fonts.regular]: require('../../assets/fonts/IBMPlexSansArabic_400Regular.ttf'),
    [Fonts.medium]: require('../../assets/fonts/IBMPlexSansArabic_500Medium.ttf'),
    [Fonts.bold]: require('../../assets/fonts/IBMPlexSansArabic_700Bold.ttf'),
    // Only for the new currency signs (U+20C1, U+20C3); see assets/fonts/LICENSE-currency-fonts.txt.
    'CurrencySAR-Regular': require('../../assets/fonts/CurrencySAR-Regular.ttf'),
    'CurrencySAR-Bold': require('../../assets/fonts/CurrencySAR-Bold.ttf'),
    'CurrencyAED-Regular': require('../../assets/fonts/CurrencyAED-Regular.ttf'),
    'CurrencyOMR-Regular': require('../../assets/fonts/CurrencyOMR-Regular.ttf'),
  });

  useEffect(() => {
    controller.init();
    // Follow a month rollover when the app returns to the foreground.
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') controller.onResumed();
    });
    return () => {
      sub.remove();
      controller.dispose();
    };
  }, [controller]);

  return (
    <SafeAreaProvider>
      <AppProvider controller={controller}>
        {fontsLoaded || fontError ? <Root /> : null}
      </AppProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const st = useAppState();
  const c = useController();
  const { s, p, rtl } = useUi();
  // App lock: asked on a cold start and after > 60 s in the background —
  // never as a side effect of turning the setting on (that would remount
  // the navigator and drop the user's place).
  useEffect(() => setHapticsEnabled(st.haptics), [st.haptics]);
  // Native pieces (date picker, alerts, keyboard, switches) follow the APP's light/dark choice, not only the phone's.
  useEffect(() => {
    Appearance.setColorScheme?.(st.themeMode === 'system' ? 'unspecified' : st.themeMode);
  }, [st.themeMode]);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const lockOn = useRef(st.appLock);
  lockOn.current = st.appLock;
  const checkedAtStart = useRef(false);
  useEffect(() => {
    if (st.status !== 'ready' || checkedAtStart.current) return;
    checkedAtStart.current = true;
    if (st.appLock) setNeedsUnlock(true);
  }, [st.status, st.appLock]);
  const leftAt = useRef<number | null>(null);
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'background') leftAt.current = Date.now();
      if (state === 'active' && lockOn.current && leftAt.current != null && Date.now() - leftAt.current > 60_000) setNeedsUnlock(true);
    });
    return () => sub.remove();
  }, []);

  // iOS sheets have no back button: give every modal a visible "Cancel" (Android has the system back).
  const modal = {
    presentation: 'modal' as const,
    ...(Platform.OS === 'ios' ? { headerLeft: () => <Button kind="text" label={s.cancel} onPress={() => router.back()} testID="modal.cancel" /> } : null),
  };
  // Explicit layout direction: correct RTL/LTR without relying on the device
  // language or a native restart (works the same in Expo Go and in an APK).
  const content =
    st.status === 'loading' ? (
      <Loading />
    ) : st.status === 'error' ? (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: p.background }}>
        <EmptyState icon="error" title={s.errLoad} action={<Button label={s.retry} onPress={() => c.init()} />} />
      </View>
    ) : st.appLock && (needsUnlock || !checkedAtStart.current) ? (
      <LockScreen onUnlock={() => setNeedsUnlock(false)} />
    ) : (
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: p.background },
          headerTintColor: p.onSurface,
          headerTitleStyle: { fontFamily: Fonts.bold },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: p.background },
        }}
      >
        <Stack.Protected guard={st.onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="income" options={{ title: s.incomeTitle }} />
          <Stack.Screen name="budgets" options={{ title: s.budgetsScreenTitle }} />
          <Stack.Screen name="categories" options={{ title: s.categories }} />
          <Stack.Screen name="profile" options={{ title: s.yourPlan, headerShown: false }} />
          <Stack.Screen name="expense/[id]" options={{ ...modal, title: s.addExpense }} />
          <Stack.Screen name="wealth" options={{ title: s.wealthOpen }} />
          <Stack.Screen name="principles" options={{ title: s.principlesTitle }} />
          <Stack.Screen name="persona" options={{ title: s.personaTitle }} />
          <Stack.Screen name="invest" options={{ title: s.investTitle }} />
          <Stack.Screen name="plan" options={{ title: s.planTitle }} />
          <Stack.Screen name="debt/[id]" options={{ ...modal, title: s.addDebt }} />
          <Stack.Screen name="asset/[id]" options={{ ...modal, title: s.addAsset }} />
          <Stack.Screen name="quick-add" options={{ ...modal, title: s.quickAdd }} />
          <Stack.Screen name="goal/[id]" options={{ ...modal, title: s.addGoal }} />
        </Stack.Protected>
        <Stack.Protected guard={!st.onboarded}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    );

  return (
    <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr', backgroundColor: p.background }}>
      <StatusBar style={p.dark ? 'light' : 'dark'} />
      {content}
      <ToastHost />
    </View>
  );
}
