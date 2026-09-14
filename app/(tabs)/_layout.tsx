import { Tabs } from 'expo-router';

import { BottomNavigation } from '../../src/components/ui';
import type { BottomNavigationItem } from '../../src/components/ui';
import { colors } from '../../src/design/tokens';

const navigationItems: readonly BottomNavigationItem[] = [
  { key: 'index', label: 'Home', icon: 'home-outline' },
  { key: 'programs', label: 'Programs', icon: 'grid-outline' },
  { key: 'progress', label: 'Progress', icon: 'analytics-outline' },
  { key: 'coach', label: 'Coach', icon: 'sparkles-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.canvas },
      }}
      tabBar={({ navigation, state }) => (
        <BottomNavigation
          activeKey={state.routes[state.index]?.name ?? 'index'}
          items={navigationItems}
          onSelect={(key) => navigation.navigate(key)}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="programs" options={{ title: 'Programs' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
