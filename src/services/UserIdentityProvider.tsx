import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { Button, Card, LoadingSkeleton, Screen, Text } from '../components/ui';
import { LOCAL_GUEST_USER_ID } from '../domain/userIdentity';
import { useLocalDatabase } from '../db/context';
import { useOptionalAppServices } from './AppServicesProvider';
import { resolveLocalUserIdentity, type ResolvedUserIdentity } from './userIdentity';

type UserIdentityStatus = 'loading' | 'ready' | 'error';

export interface UserIdentitySnapshot extends ResolvedUserIdentity {
  status: UserIdentityStatus;
  retry: () => void;
}

const UserIdentityContext = createContext<UserIdentitySnapshot | null>(null);

export function UserIdentityProvider({ children }: { children: ReactNode }) {
  const services = useOptionalAppServices();
  const database = useLocalDatabase();
  const [retryKey, setRetryKey] = useState(0);
  const [snapshot, setSnapshot] = useState<UserIdentitySnapshot>(() => ({
    userId: LOCAL_GUEST_USER_ID,
    kind: 'guest',
    // Web is an explicit non-persistent preview and has no auth session. Keep
    // static route rendering useful while native identity adoption initializes.
    status: Platform.OS === 'web' ? 'ready' : 'loading',
    retry: () => undefined,
  }));

  if (!services) {
    throw new Error('UserIdentityProvider needs AppServicesProvider.');
  }

  const retry = useCallback(() => setRetryKey((current) => current + 1), []);

  useEffect(() => {
    if (!database) {
      setSnapshot({
        userId: LOCAL_GUEST_USER_ID,
        kind: 'guest',
        status: 'ready',
        retry,
      });
      return;
    }

    let active = true;
    setSnapshot((current) => ({ ...current, status: 'loading', retry }));

    void services.auth
      .getSession()
      .then((session) => resolveLocalUserIdentity(database, session))
      .then((identity) => {
        if (!active) return;
        setSnapshot({ ...identity, status: 'ready', retry });
      })
      .catch(() => {
        if (!active) return;
        setSnapshot((current) => ({ ...current, status: 'error', retry }));
      });

    return () => {
      active = false;
    };
  }, [database, retry, retryKey, services.auth]);

  const value = useMemo(() => snapshot, [snapshot]);

  if (snapshot.status === 'error') {
    return <IdentityUnavailableScreen onRetry={retry} />;
  }

  if (snapshot.status !== 'ready') return <IdentityLoadingScreen />;

  return <UserIdentityContext.Provider value={value}>{children}</UserIdentityContext.Provider>;
}

export function useUserIdentity(): UserIdentitySnapshot {
  const context = useContext(UserIdentityContext);
  if (!context) throw new Error('useUserIdentity must be used within UserIdentityProvider.');
  return context;
}

export function useCurrentUserId(): string {
  return useUserIdentity().userId;
}

function IdentityUnavailableScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <Screen>
      <Text variant="caption" tone="muted">
        ACCOUNT SETUP
      </Text>
      <Text variant="display" accessibilityRole="header" style={{ marginTop: 8 }}>
        We could not prepare your training record.
      </Text>
      <Text variant="body" tone="muted" style={{ marginTop: 16 }}>
        Your local data was not merged or changed. Try again before continuing.
      </Text>
      <Card tone="yellow" style={{ marginTop: 24 }} accessibilityLabel="Account setup unavailable">
        <Text variant="smallMedium">Local identity is unavailable</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
          SHIFT6 keeps the guest record separate until account ownership is confirmed.
        </Text>
      </Card>
      <Button label="Try again" onPress={onRetry} style={{ marginTop: 24 }} />
    </Screen>
  );
}

function IdentityLoadingScreen() {
  return (
    <Screen>
      <Text variant="caption" tone="muted">
        SHIFT6
      </Text>
      <Text variant="display" accessibilityRole="header" style={{ marginTop: 8 }}>
        Preparing your training record.
      </Text>
      <Text variant="body" tone="muted" style={{ marginTop: 16 }}>
        Your local ownership is being checked before training data loads.
      </Text>
      <LoadingSkeleton height={96} style={{ marginTop: 24 }} />
    </Screen>
  );
}
