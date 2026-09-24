import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { BackendClient } from '../services/contracts';
import { flushSyncOutbox, getPendingSyncIssues, getPendingSyncMutations } from './syncRepository';

const pendingRow = {
  id: 'outbox-set-1',
  idempotency_key: 'session-1:exercise-1:1',
  entity_type: 'completed-set' as const,
  entity_id: 'set-1',
  payload_json: JSON.stringify({ id: 'set-1', reps: 5 }),
  created_at: '2026-09-13T12:05:00.000Z',
};

const issueRow = {
  id: 'outbox-program-1',
  entity_type: 'program-version' as const,
  entity_id: 'program-version-1',
  created_at: '2026-09-14T12:05:00.000Z',
  attempt_count: 2,
  last_error:
    'The backend reported a version-conflict. Review is required before this change can sync.',
};

function backendClient(sync: BackendClient['sync']): BackendClient {
  return {
    sync,
    deleteAccount: async () => ({ deleted: true }),
  };
}

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

  it('never sends an unrecognised Shift row to a server that could acknowledge it', async () => {
    const database = {
      getAllAsync: async () => [
        pendingRow,
        { ...pendingRow, id: 'outbox-shift-1', entity_type: 'shift' },
      ],
    } as unknown as SQLiteDatabase;
    const sync = jest.fn(async () => ({
      acknowledgedMutationIds: ['outbox-shift-1'],
      rejectedMutationIds: [],
    }));

    await expect(flushSyncOutbox(database, backendClient(sync))).rejects.toThrow(
      'Local sync entity shift is not supported',
    );
    expect(sync).not.toHaveBeenCalled();
  });

  it('reads reviewable sync issues without exposing mutation payloads', async () => {
    const database = {
      getAllAsync: async () => [issueRow],
    } as unknown as SQLiteDatabase;

    await expect(getPendingSyncIssues(database, 10)).resolves.toEqual([
      {
        id: issueRow.id,
        entityType: issueRow.entity_type,
        entityId: issueRow.entity_id,
        createdAt: issueRow.created_at,
        attemptCount: issueRow.attempt_count,
        lastError: issueRow.last_error,
        kind: 'conflict',
      },
    ]);
  });

  it('shows an unsupported Shift row as a review issue before any sync attempt', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      sqlite.exec(`CREATE TABLE sync_outbox (
        id TEXT PRIMARY KEY NOT NULL, idempotency_key TEXT NOT NULL UNIQUE,
        entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL, attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );`);
      const insert = sqlite.prepare(
        `INSERT INTO sync_outbox
          (id, idempotency_key, entity_type, entity_id, payload_json, created_at, last_error)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
      );
      insert.run('known', 'known-key', 'completed-set', 'set-1', '{"private":"known"}', '1', null);
      insert.run('shift', 'shift-key', 'shift', 'shift-1', '{"private":"shift"}', '2', null);
      insert.run(
        'failed',
        'failed-key',
        'training-cycle',
        'cycle-1',
        '{}',
        '3',
        'Sync request failed.',
      );
      const database = {
        getAllAsync: async (sql: string, ...params: unknown[]) =>
          sqlite.prepare(sql).all(...(params as SQLInputValue[])),
      } as unknown as SQLiteDatabase;

      const issues = await getPendingSyncIssues(database);
      expect(issues).toEqual([
        {
          id: 'shift',
          entityType: 'shift',
          entityId: 'shift-1',
          createdAt: '2',
          attemptCount: 0,
          lastError:
            'Local sync entity shift is not supported by this build. Update the app before retrying.',
          kind: 'rejected',
        },
        {
          id: 'failed',
          entityType: 'training-cycle',
          entityId: 'cycle-1',
          createdAt: '3',
          attemptCount: 0,
          lastError: 'Sync request failed.',
          kind: 'failed',
        },
      ]);
      expect(JSON.stringify(issues)).not.toContain('private');
    } finally {
      sqlite.close();
    }
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
    const backend = backendClient(async () => ({
      acknowledgedMutationIds: ['outbox-set-1'],
      rejectedMutationIds: ['outbox-set-2'],
    }));

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
    const backend = backendClient(async () => {
      throw new Error('Network unavailable');
    });

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
    const backend = backendClient(async () => ({
      acknowledgedMutationIds: ['outbox-set-1'],
      rejectedMutationIds: ['outbox-set-1'],
    }));

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
    const backend = backendClient(async () => ({
      acknowledgedMutationIds: ['outbox-set-1'],
      rejectedMutationIds: [],
      conflicts: [{ mutationId: 'outbox-set-1', code: 'version-conflict' }],
    }));

    await expect(flushSyncOutbox(database, backend)).resolves.toMatchObject({
      acknowledgedMutationIds: [],
      rejectedMutationIds: [],
      conflictedMutationIds: ['outbox-set-1'],
      failedMutationIds: [],
    });
    expect(calls.some((call) => call.sql.includes('DELETE FROM sync_outbox'))).toBe(false);
    expect(calls[0]?.params).toEqual([
      'The backend reported a version-conflict. Review is required before this change can sync.',
      'outbox-set-1',
    ]);
  });
});
