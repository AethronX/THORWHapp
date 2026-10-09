import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useUi } from '../../ui/AppContext';
import type { IconName } from '../../ui/components';
import { Fonts } from '../../ui/theme';

export default function TabsLayout() {
  const { s, p } = useUi();
  const tab = (title: string, icon: IconName, iconActive: IconName) => ({
    title,
    tabBarAccessibilityLabel: title,
    tabBarIcon: ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
      <MaterialCommunityIcons name={focused ? iconActive : icon} color={color} size={size} />
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
        tabBarInactiveTintColor: p.onSurfaceMuted,
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.outline },
        tabBarLabelStyle: { fontFamily: Fonts.medium },
        sceneStyle: { backgroundColor: p.background },
      }}
    >
      <Tabs.Screen name="index" options={{ ...tab(s.navHome, 'home-outline', 'home'), headerTitle: s.appTitle }} />
      <Tabs.Screen name="expenses" options={tab(s.navExpenses, 'receipt', 'receipt')} />
      <Tabs.Screen name="goals" options={tab(s.navGoals, 'flag-outline', 'flag')} />
      <Tabs.Screen name="plan" options={tab(s.navPlan, 'calculator-variant-outline', 'calculator-variant')} />
      <Tabs.Screen name="settings" options={tab(s.navSettings, 'cog-outline', 'cog')} />
    </Tabs>
  );
}
