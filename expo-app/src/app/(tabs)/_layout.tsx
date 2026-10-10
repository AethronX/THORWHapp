import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
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
        // IBM Plex Sans Arabic has tall line metrics: the library's 49 pt bar
        // clips the labels, so the bar is taller and the line height explicit.
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.outline, height: 64 + insets.bottom, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 18 },
        sceneStyle: { backgroundColor: p.background },
      }}
    >
      <Tabs.Screen name="index" options={{ ...tab(s.navHome, 'home'), headerTitle: s.appTitle }} />
      <Tabs.Screen name="expenses" options={tab(s.navExpenses, 'expenses')} />
      <Tabs.Screen name="analytics" options={tab(s.navAnalytics, 'analytics')} />
      <Tabs.Screen name="goals" options={tab(s.navGoals, 'goals')} />
      <Tabs.Screen name="settings" options={tab(s.navSettings, 'settings')} />
    </Tabs>
  );
}
