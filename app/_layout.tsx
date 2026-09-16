import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LocalDatabaseProvider } from '../src/db/LocalDatabaseProvider';
import { colors } from '../src/design/tokens';
import { AppErrorBoundary } from '../src/services/AppErrorBoundary';
import { AppServicesProvider } from '../src/services/AppServicesProvider';
import { NotificationRuntimeProvider } from '../src/services/NotificationRuntimeProvider';
import { SyncRuntimeProvider } from '../src/services/SyncRuntimeProvider';
import { UserIdentityProvider } from '../src/services/UserIdentityProvider';

export default function RootLayout() {
  return (
    <AppServicesProvider>
      <AppErrorBoundary>
        <LocalDatabaseProvider>
          <UserIdentityProvider>
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
                  <Stack.Screen name="calendar" options={{ presentation: 'card' }} />
                  <Stack.Screen name="plate-calculator" options={{ presentation: 'card' }} />
                  <Stack.Screen name="history" options={{ presentation: 'card' }} />
                  <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
                  <Stack.Screen name="equipment" options={{ presentation: 'card' }} />
                  <Stack.Screen name="considerations" options={{ presentation: 'card' }} />
                  <Stack.Screen name="body-metrics" options={{ presentation: 'card' }} />
                  <Stack.Screen name="sync-review" options={{ presentation: 'card' }} />
                  <Stack.Screen name="workout" options={{ presentation: 'modal' }} />
                </Stack>
              </NotificationRuntimeProvider>
            </SyncRuntimeProvider>
          </UserIdentityProvider>
        </LocalDatabaseProvider>
      </AppErrorBoundary>
    </AppServicesProvider>
  );
}
