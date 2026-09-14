import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LocalDatabaseProvider } from '../src/db/LocalDatabaseProvider';
import { colors } from '../src/design/tokens';

export default function RootLayout() {
  return (
    <LocalDatabaseProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ presentation: 'card' }} />
        <Stack.Screen name="workout" options={{ presentation: 'modal' }} />
      </Stack>
    </LocalDatabaseProvider>
  );
}
