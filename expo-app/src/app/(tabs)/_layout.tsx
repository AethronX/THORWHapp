import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useUi } from '../../ui/AppContext';
import { PhIcon, type IconName } from '../../ui/icons';
import { Fonts } from '../../ui/theme';

/**
 * Five tabs max (Material / iOS HIG guidance). Active tab: duotone icon with
 * a stronger fill; inactive: light line icon. The savings calculator lives
 * under Goals (`/plan`) instead of taking a sixth tab.
 */
export default function TabsLayout() {
  const { s, p, rtl } = useUi();
  const tab = (title: string, icon: IconName) => ({
    title,
    tabBarAccessibilityLabel: title,
    tabBarIcon: ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
      <PhIcon name={icon} size={size} color={String(color)} weight={focused ? 'duotone' : 'regular'} fillOpacity={0.28} rtl={rtl} />
    ),
  });
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: p.background },
        headerTintColor: p.onSurface,
        headerTitleStyle: { fontFamily: Fonts.bold },
        headerShadowVisible: false,
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.textSubtle,
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.outline },
        tabBarLabelStyle: { fontFamily: Fonts.medium },
        sceneStyle: { backgroundColor: p.background },
      }}
    >
      <Tabs.Screen name="index" options={{ ...tab(s.navHome, 'home'), headerTitle: s.appTitle }} />
      <Tabs.Screen name="expenses" options={tab(s.navExpenses, 'expenses')} />
      <Tabs.Screen name="analytics" options={tab(s.navAnalytics, 'analytics')} />
      <Tabs.Screen name="goals" options={tab(s.navGoals, 'goals')} />
      <Tabs.Screen name="settings" options={tab(s.navSettings, 'settings')} />
      <Tabs.Screen name="plan" options={{ href: null, title: s.planTitle }} />
    </Tabs>
  );
}
