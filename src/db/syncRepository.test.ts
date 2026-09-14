import type { SQLiteDatabase } from 'expo-sqlite';

import type { BackendClient } from '../services/contracts';
import { flushSyncOutbox, getPendingSyncMutations } from './syncRepository';

const pendingRow = {
  id: 'outbox-set-1',
  idempotency_key: 'session-1:exercise-1:1',
  entity_type: 'completed-set' as const,
  entity_id: 'set-1',
  payload_json: JSON.stringify({ id: 'set-1', reps: 5 }),
  created_at: '2026-09-13T12:05:00.000Z',
};

describe('syncRepository', () => {
  it('reads pending mutations in stable creation order', async () => {
    const database = {
      getAllAsync: async () => [pendingRow],
    } as unknown as SQLiteDatabase;

    await expect(getPendingSyncMutations(database, 10)).resolves.toEqual([
      {
        id: pendingRow.id,
        idempotencyKey: pendingRow.idempotency_key,
        entityType: pendingRow.entity_type,
        entityId: pendingRow.entity_id,
        payload: { id: 'set-1', reps: 5 },
        createdAt: pendingRow.created_at,
      },
    ]);
  });

  it('deletes only acknowledged mutations and retains rejected rows with an error', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      getAllAsync: async () => [pendingRow, { ...pendingRow, id: 'outbox-set-2' }],
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
    } as unknown as SQLiteDatabase;
    const backend: BackendClient = {
      sync: async () => ({
        acknowledgedMutationIds: ['outbox-set-1'],
        rejectedMutationIds: ['outbox-set-2'],
      }),
    };

    await expect(flushSyncOutbox(database, backend)).resolves.toMatchObject({
      attemptedMutationIds: ['outbox-set-1', 'outbox-set-2'],
      acknowledgedMutationIds: ['outbox-set-1'],
      rejectedMutationIds: ['outbox-set-2'],
      conflictedMutationIds: [],
      failedMutationIds: [],
    });
    expect(calls[0]?.sql).toContain('DELETE FROM sync_outbox');
    expect(calls[0]?.params).toEqual(['outbox-set-1']);
    expect(calls[1]?.sql).toContain('UPDATE sync_outbox');
    expect(calls[1]?.params).toEqual(['The backend rejected this mutation.', 'outbox-set-2']);
  });

  it('retains all mutations when the backend is unavailable', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      getAllAsync: async () => [pendingRow],
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
    } as unknown as SQLiteDatabase;
    const backend: BackendClient = {
      sync: async () => {
        throw new Error('Network unavailable');
      },
    };

    await expect(flushSyncOutbox(database, backend)).resolves.toMatchObject({
      attemptedMutationIds: ['outbox-set-1'],
      acknowledgedMutationIds: [],
      rejectedMutationIds: [],
      conflictedMutationIds: [],
      failedMutationIds: ['outbox-set-1'],
    });
    expect(calls[0]?.sql).toContain('UPDATE sync_outbox');
    expect(calls[0]?.params).toEqual(['Network unavailable', 'outbox-set-1']);
  });

  it('does not delete a mutation when a backend reports both acknowledgement and rejection', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      getAllAsync: async () => [pendingRow],
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
    } as unknown as SQLiteDatabase;
    const backend: BackendClient = {
      sync: async () => ({
        acknowledgedMutationIds: ['outbox-set-1'],
        rejectedMutationIds: ['outbox-set-1'],
      }),
    };

    await expect(flushSyncOutbox(database, backend)).resolves.toMatchObject({
      acknowledgedMutationIds: [],
      rejectedMutationIds: ['outbox-set-1'],
      conflictedMutationIds: [],
      failedMutationIds: [],
    });
    expect(calls.some((call) => call.sql.includes('DELETE FROM sync_outbox'))).toBe(false);
    expect(calls[0]?.sql).toContain('UPDATE sync_outbox');
  });

  it('retains a version conflict and never acknowledges it', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      getAllAsync: async () => [pendingRow],
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
    } as unknown as SQLiteDatabase;
    const backend: BackendClient = {
      sync: async () => ({
        acknowledgedMutationIds: ['outbox-set-1'],
        rejectedMutationIds: [],
        conflicts: [{ mutationId: 'outbox-set-1', code: 'version-conflict' }],
      }),
    };

    await expect(flushSyncOutbox(database, backend)).resolves.toMatchObject({
      acknowledgedMutationIds: [],
      rejectedMutationIds: [],
      conflictedMutationIds: ['outbox-set-1'],
      failedMutationIds: [],
    });
    expect(calls.some((call) => call.sql.includes('DELETE FROM sync_outbox'))).toBe(false);
    expect(calls[0]?.params).toEqual([
      'The backend reported a conflict. Review is required before this change can sync.',
      'outbox-set-1',
    ]);
  });
});
