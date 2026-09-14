import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useLocalDatabase } from '../db/context';
import { runtimeConfig } from '../config/env';
import { createAppServices, type AppServices } from './appServices';
import { createExpoSecureAuthProvider } from './auth';
import { subscribeToConnectivity } from './connectivity';
import {
  runAuthenticatedSync,
  createSingleFlight,
  syncRuntimeStateFromResult,
  type SyncRuntimeState,
} from './syncRuntime';
import type { ConnectivityStatus } from './syncCoordinator';

export interface SyncRuntimeSnapshot {
  state: SyncRuntimeState;
  connectivity: ConnectivityStatus;
  lastAttemptAt?: string;
}

export interface SyncRuntimeContextValue extends SyncRuntimeSnapshot {
  flushNow: () => Promise<void>;
}

const defaultServices = createAppServices({
  auth: createExpoSecureAuthProvider(),
  apiBaseUrl: runtimeConfig.apiBaseUrl,
});

const SyncRuntimeContext = createContext<SyncRuntimeContextValue | null>(null);

interface SyncRuntimeProviderProps {
  children: ReactNode;
  services?: AppServices;
}

export function SyncRuntimeProvider({
  children,
  services = defaultServices,
}: SyncRuntimeProviderProps) {
  const database = useLocalDatabase();
  const [snapshot, setSnapshot] = useState<SyncRuntimeSnapshot>({
    state: 'idle',
    connectivity: 'unknown',
  });

  const performFlush = useCallback(async () => {
    if (!database) return;

    setSnapshot((current) => ({ ...current, state: 'syncing' }));
    try {
      const attempt = await runAuthenticatedSync(database, services);
      setSnapshot((current) => ({
        ...current,
        state: syncRuntimeStateFromResult(attempt.result),
        connectivity: attempt.result?.connectivity ?? current.connectivity,
        lastAttemptAt: attempt.result ? new Date().toISOString() : current.lastAttemptAt,
      }));
    } catch {
      setSnapshot((current) => ({ ...current, state: 'failed' }));
    }
  }, [database, services]);
  const flushNow = useMemo(() => createSingleFlight(performFlush), [performFlush]);

  useEffect(() => {
    if (!database) return;

    void services.connectivity
      .getStatus()
      .then((connectivity) => setSnapshot((current) => ({ ...current, connectivity })))
      .catch(() => undefined);

    const handleConnectivity = (connectivity: ConnectivityStatus) => {
      setSnapshot((current) => ({
        ...current,
        connectivity,
        state: connectivity === 'offline' ? 'offline' : current.state,
      }));
      if (connectivity === 'online') void flushNow();
    };
    const connectivitySubscription = services.connectivity.subscribe
      ? services.connectivity.subscribe(handleConnectivity)
      : subscribeToConnectivity(handleConnectivity);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void flushNow();
    });

    void flushNow();
    return () => {
      connectivitySubscription.remove();
      appStateSubscription.remove();
    };
  }, [database, flushNow, services.connectivity]);

  const value = useMemo(() => ({ ...snapshot, flushNow }), [flushNow, snapshot]);
  return <SyncRuntimeContext.Provider value={value}>{children}</SyncRuntimeContext.Provider>;
}

export function useSyncRuntime(): SyncRuntimeContextValue {
  const context = useContext(SyncRuntimeContext);
  if (!context) throw new Error('useSyncRuntime must be used within SyncRuntimeProvider.');
  return context;
}
