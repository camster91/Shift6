import type { SQLiteDatabase } from 'expo-sqlite';

import type { HealthSummary } from '../domain/health';
import type { HealthPermissionResult, HealthProvider } from './health';
import { syncHealthSummaries } from './healthSync';

function databaseWithWrites(writes: unknown[][]): SQLiteDatabase {
  return {
    withTransactionAsync: async (task: () => Promise<void>) => task(),
    runAsync: async (...args: unknown[]) => {
      writes.push(args);
      return { changes: 1, lastInsertRowId: 1 };
    },
  } as unknown as SQLiteDatabase;
}

function provider(overrides: Partial<HealthProvider> = {}): HealthProvider {
  const permission: HealthPermissionResult = {
    status: 'granted',
    grantedTypes: ['steps'],
    deniedTypes: [],
  };
  const summaries: HealthSummary[] = [
    {
      id: 'step-1',
      type: 'steps',
      value: 4200,
      unit: 'count',
      startAt: '2026-09-14T08:00:00.000Z',
      endAt: '2026-09-14T08:30:00.000Z',
      source: 'Health Connect',
    },
  ];
  return {
    isAvailable: async () => true,
    requestPermissions: async () => permission,
    readSummaries: async () => summaries,
    ...overrides,
  };
}

const range = {
  startAt: '2026-09-01T00:00:00.000Z',
  endAt: '2026-09-14T23:59:59.999Z',
};

describe('health sync boundary', () => {
  it('does not ask for permissions when health access was not requested', async () => {
    let permissionCalls = 0;
    const inputProvider = provider({
      requestPermissions: async () => {
        permissionCalls += 1;
        return { status: 'granted', grantedTypes: ['steps'], deniedTypes: [] };
      },
    });

    await expect(
      syncHealthSummaries({
        database: databaseWithWrites([]),
        userId: 'guest-user',
        provider: inputProvider,
        types: [],
        range,
      }),
    ).resolves.toEqual({
      status: 'not-requested',
      importedCount: 0,
      grantedTypes: [],
      deniedTypes: [],
    });
    expect(permissionCalls).toBe(0);
  });

  it('leaves local storage untouched when the provider is unavailable', async () => {
    const writes: unknown[][] = [];
    await expect(
      syncHealthSummaries({
        database: databaseWithWrites(writes),
        userId: 'guest-user',
        provider: provider({ isAvailable: async () => false }),
        types: ['steps'],
        range,
      }),
    ).resolves.toMatchObject({ status: 'unavailable', importedCount: 0 });
    expect(writes).toHaveLength(0);
  });

  it('reads only granted types and persists normalized summaries locally', async () => {
    const writes: unknown[][] = [];
    let readTypes: readonly string[] = [];
    const inputProvider = provider({
      requestPermissions: async () => ({
        status: 'partial',
        grantedTypes: ['steps'],
        deniedTypes: ['weight'],
      }),
      readSummaries: async (types) => {
        readTypes = types;
        return [
          ...(await provider().readSummaries(types, range)),
          {
            id: 'step-1',
            type: 'steps',
            value: 4300,
            unit: 'count',
            startAt: '2026-09-14T08:00:00.000Z',
            endAt: '2026-09-14T08:30:00.000Z',
            source: 'Health Connect',
          },
        ];
      },
    });

    await expect(
      syncHealthSummaries({
        database: databaseWithWrites(writes),
        userId: 'guest-user',
        provider: inputProvider,
        types: ['steps', 'weight'],
        range,
      }),
    ).resolves.toMatchObject({
      status: 'synced',
      importedCount: 1,
      grantedTypes: ['steps'],
      deniedTypes: ['weight'],
    });
    expect(readTypes).toEqual(['steps']);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain(4200);
  });

  it('fails closed when a native read or local write throws', async () => {
    await expect(
      syncHealthSummaries({
        database: databaseWithWrites([]),
        userId: 'guest-user',
        provider: provider({ readSummaries: async () => Promise.reject(new Error('native read')) }),
        types: ['steps'],
        range,
      }),
    ).resolves.toMatchObject({ status: 'failed', importedCount: 0 });
  });
});
