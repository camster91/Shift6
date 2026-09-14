import type { SQLiteDatabase } from 'expo-sqlite';

import type { AppServices } from './appServices';
import {
  runAuthenticatedSync,
  syncRuntimeStateFromResult,
  type AuthenticatedFlush,
} from './syncRuntime';
import type { SyncCoordinatorResult } from './syncCoordinator';

const database = {} as SQLiteDatabase;

function servicesWithSession(
  session: Awaited<ReturnType<AppServices['auth']['getSession']>>,
): AppServices {
  return {
    auth: {
      getSession: async () => session,
      getAccessToken: async () => session?.accessToken ?? null,
      signOut: async () => undefined,
    },
    backend: {},
    connectivity: { getStatus: async () => 'online' },
  } as AppServices;
}

function result(outcome: SyncCoordinatorResult['outcome']): SyncCoordinatorResult {
  return {
    connectivity: outcome === 'offline' ? 'offline' : 'online',
    outcome,
    run: null,
  };
}

describe('authenticated sync runtime', () => {
  it('leaves a guest outbox untouched', async () => {
    let flushCalls = 0;
    const flush: AuthenticatedFlush = async () => {
      flushCalls += 1;
      return result('empty');
    };

    await expect(
      runAuthenticatedSync(database, servicesWithSession(null), 50, flush),
    ).resolves.toEqual({
      kind: 'skipped-unauthenticated',
      result: null,
    });
    expect(flushCalls).toBe(0);
  });

  it('delegates authenticated sync and preserves its coordinator result', async () => {
    const expected = result('synced');
    const flush: AuthenticatedFlush = async (
      receivedDatabase,
      _backend,
      receivedConnectivity,
      limit,
    ) => {
      expect(receivedDatabase).toBe(database);
      await expect(receivedConnectivity.getStatus()).resolves.toBe('online');
      expect(limit).toBe(10);
      return expected;
    };
    const services = servicesWithSession({
      userId: 'user-1',
      provider: 'email',
      accessToken: 'token',
    });

    const attempted = await runAuthenticatedSync(database, services, 10, flush);

    expect(attempted.kind).toBe('attempted');
    expect(attempted.result).toBe(expected);
    expect(syncRuntimeStateFromResult(expected)).toBe('synced');
    expect(syncRuntimeStateFromResult(result('partial'))).toBe('partial');
    expect(syncRuntimeStateFromResult(result('failed'))).toBe('failed');
    expect(syncRuntimeStateFromResult(result('offline'))).toBe('offline');
  });
});
