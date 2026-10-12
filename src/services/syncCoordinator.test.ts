import type { SQLiteDatabase } from 'expo-sqlite';

import type { BackendClient } from './contracts';
import { flushWhenOnline, type SyncFlush } from './syncCoordinator';

const database = {} as SQLiteDatabase;
const backend = {} as BackendClient;

function runResult(overrides: Partial<Awaited<ReturnType<SyncFlush>>> = {}) {
  return {
    attemptedMutationIds: ['mutation-1'],
    acknowledgedMutationIds: ['mutation-1'],
    rejectedMutationIds: [],
    conflictedMutationIds: [],
    failedMutationIds: [],
    ...overrides,
  };
}

describe('flushWhenOnline', () => {
  it('skips the backend when the device is offline', async () => {
    let flushCalls = 0;
    const flush: SyncFlush = async () => {
      flushCalls += 1;
      return runResult();
    };

    await expect(
      flushWhenOnline(database, backend, { getStatus: async () => 'offline' }, 50, flush),
    ).resolves.toEqual({ connectivity: 'offline', outcome: 'offline', run: null });
    expect(flushCalls).toBe(0);
  });

  it('delegates online sync and classifies a successful run', async () => {
    const flush: SyncFlush = async (receivedDatabase, receivedBackend, limit) => {
      expect(receivedDatabase).toBe(database);
      expect(receivedBackend).toBe(backend);
      expect(limit).toBe(10);
      return runResult();
    };

    await expect(
      flushWhenOnline(database, backend, { getStatus: async () => 'online' }, 10, flush),
    ).resolves.toMatchObject({ connectivity: 'online', outcome: 'synced' });
  });

  it('keeps unresolved or rejected mutations visible to the caller', async () => {
    const failed = await flushWhenOnline(
      database,
      backend,
      { getStatus: async () => 'unknown' },
      50,
      async () => runResult({ failedMutationIds: ['mutation-1'] }),
    );
    const partial = await flushWhenOnline(
      database,
      backend,
      { getStatus: async () => 'online' },
      50,
      async () => runResult({ rejectedMutationIds: ['mutation-1'], acknowledgedMutationIds: [] }),
    );

    expect(failed.outcome).toBe('failed');
    expect(partial.outcome).toBe('partial');
  });

  it('surfaces a conflict outcome for user review', async () => {
    const conflict = await flushWhenOnline(
      database,
      backend,
      { getStatus: async () => 'online' },
      50,
      async () => runResult({ conflictedMutationIds: ['mutation-1'] }),
    );

    expect(conflict.outcome).toBe('conflict');
  });

  it('distinguishes an already-empty outbox', async () => {
    await expect(
      flushWhenOnline(database, backend, { getStatus: async () => 'online' }, 50, async () =>
        runResult({
          attemptedMutationIds: [],
          acknowledgedMutationIds: [],
        }),
      ),
    ).resolves.toMatchObject({ outcome: 'empty' });
  });
});

describe('bounded queue draining', () => {
  it('sends later snapshots after earlier acknowledgements in the same online run', async () => {
    const batches = [
      runResult({ attemptedMutationIds: ['old'], acknowledgedMutationIds: ['old'] }),
      runResult({ attemptedMutationIds: ['new'], acknowledgedMutationIds: ['new'] }),
      runResult({ attemptedMutationIds: [], acknowledgedMutationIds: [] }),
    ];
    let calls = 0;
    const result = await flushWhenOnline(
      database,
      backend,
      { getStatus: async () => 'online' },
      50,
      async () => batches[calls++]!,
    );
    expect(calls).toBe(3);
    expect(result.run?.acknowledgedMutationIds).toEqual(['old', 'new']);
    expect(result.outcome).toBe('synced');
  });

  it('stops draining when a later batch needs conflict review', async () => {
    let calls = 0;
    const result = await flushWhenOnline(
      database,
      backend,
      { getStatus: async () => 'online' },
      50,
      async () => {
        calls += 1;
        return calls === 1
          ? runResult()
          : runResult({
              attemptedMutationIds: ['conflict'],
              acknowledgedMutationIds: [],
              conflictedMutationIds: ['conflict'],
            });
      },
    );
    expect(calls).toBe(2);
    expect(result.outcome).toBe('conflict');
  });
});
