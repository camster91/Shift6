import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LocalDatabaseProvider } from '../src/db/LocalDatabaseProvider';
import { colors } from '../src/design/tokens';
import { AppServicesProvider } from '../src/services/AppServicesProvider';
import { NotificationRuntimeProvider } from '../src/services/NotificationRuntimeProvider';
import { SyncRuntimeProvider } from '../src/services/SyncRuntimeProvider';

export default function RootLayout() {
  return (
    <AppServicesProvider>
      <LocalDatabaseProvider>
        <SyncRuntimeProvider>
          <NotificationRuntimeProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.canvas },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" options={{ presentation: 'card' }} />
              <Stack.Screen name="program" options={{ presentation: 'card' }} />
              <Stack.Screen name="exercises" options={{ presentation: 'card' }} />
              <Stack.Screen name="exercise/[id]" options={{ presentation: 'card' }} />
              <Stack.Screen name="builder" options={{ presentation: 'card' }} />
              <Stack.Screen name="review" options={{ presentation: 'card' }} />
              <Stack.Screen name="summary" options={{ presentation: 'card' }} />
              <Stack.Screen name="cycle" options={{ presentation: 'card' }} />
              <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
              <Stack.Screen name="workout" options={{ presentation: 'modal' }} />
            </Stack>
          </NotificationRuntimeProvider>
        </SyncRuntimeProvider>
      </LocalDatabaseProvider>
    </AppServicesProvider>
  );
}
