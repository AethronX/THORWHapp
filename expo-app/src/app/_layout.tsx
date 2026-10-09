import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState as RNAppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { expoDbDriver } from '../data/expoDb';
import { AppController } from '../state/appController';
import { AppProvider, useAppState, useController, useUi } from '../ui/AppContext';
import { Button, EmptyState, Loading } from '../ui/components';
import { Fonts } from '../ui/theme';

export default function RootLayout() {
  const [controller] = useState(() => new AppController(expoDbDriver));
  const [fontsLoaded, fontError] = useFonts({
    [Fonts.regular]: require('../../assets/fonts/IBMPlexSansArabic_400Regular.ttf'),
    [Fonts.medium]: require('../../assets/fonts/IBMPlexSansArabic_500Medium.ttf'),
    [Fonts.bold]: require('../../assets/fonts/IBMPlexSansArabic_700Bold.ttf'),
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

  // Explicit layout direction: correct RTL/LTR without relying on the device
  // language or a native restart (works the same in Expo Go and in an APK).
  const content =
    st.status === 'loading' ? (
      <Loading />
    ) : st.status === 'error' ? (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: p.background }}>
        <EmptyState icon="error" title={s.errLoad} action={<Button label={s.retry} onPress={() => c.init()} />} />
      </View>
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
          <Stack.Screen name="expense/[id]" options={{ presentation: 'modal', title: s.addExpense }} />
          <Stack.Screen name="goal/[id]" options={{ presentation: 'modal', title: s.addGoal }} />
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
    </View>
  );
}
