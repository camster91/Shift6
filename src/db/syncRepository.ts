import type { SQLiteDatabase } from 'expo-sqlite';

import type { BackendClient, SyncMutation, SyncResult } from '../services/contracts';

interface SyncOutboxRow {
  id: string;
  idempotency_key: string;
  entity_type: SyncMutation['entityType'];
  entity_id: string;
  payload_json: string;
  created_at: string;
}

export interface SyncRunResult {
  attemptedMutationIds: string[];
  acknowledgedMutationIds: string[];
  rejectedMutationIds: string[];
  failedMutationIds: string[];
}

export async function getPendingSyncMutations(
  database: SQLiteDatabase,
  limit = 50,
): Promise<SyncMutation[]> {
  const safeLimit = Math.max(1, Math.floor(limit));
  const rows = await database.getAllAsync<SyncOutboxRow>(
    `SELECT id, idempotency_key, entity_type, entity_id, payload_json, created_at
       FROM sync_outbox
      ORDER BY created_at ASC, id ASC
      LIMIT ?;`,
    safeLimit,
  );

  return rows.map((row) => ({
    id: row.id,
    idempotencyKey: row.idempotency_key,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

export async function flushSyncOutbox(
  database: SQLiteDatabase,
  backend: BackendClient,
  limit = 50,
): Promise<SyncRunResult> {
  const pending = await getPendingSyncMutations(database, limit);
  const attemptedMutationIds = pending.map((mutation) => mutation.id);
  if (pending.length === 0) {
    return {
      attemptedMutationIds,
      acknowledgedMutationIds: [],
      rejectedMutationIds: [],
      failedMutationIds: [],
    };
  }

  let result: SyncResult;
  try {
    result = await backend.sync(pending);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync request failed.';
    await recordSyncFailure(database, attemptedMutationIds, message);
    return {
      attemptedMutationIds,
      acknowledgedMutationIds: [],
      rejectedMutationIds: [],
      failedMutationIds: attemptedMutationIds,
    };
  }

  const attemptedSet = new Set(attemptedMutationIds);
  const rejectedMutationIds = uniqueKnownIds(result.rejectedMutationIds, attemptedSet);
  const rejectedSet = new Set(rejectedMutationIds);
  const acknowledgedMutationIds = uniqueKnownIds(
    result.acknowledgedMutationIds,
    attemptedSet,
  ).filter((id) => !rejectedSet.has(id));
  const resolvedIds = new Set([...acknowledgedMutationIds, ...rejectedMutationIds]);
  const failedMutationIds = attemptedMutationIds.filter((id) => !resolvedIds.has(id));

  await acknowledgeSyncMutations(database, acknowledgedMutationIds);
  await recordSyncFailure(database, rejectedMutationIds, 'The backend rejected this mutation.');
  await recordSyncFailure(
    database,
    failedMutationIds,
    'The backend did not resolve this mutation.',
  );

  return {
    attemptedMutationIds,
    acknowledgedMutationIds,
    rejectedMutationIds,
    failedMutationIds,
  };
}

async function acknowledgeSyncMutations(database: SQLiteDatabase, ids: readonly string[]) {
  if (ids.length === 0) return;

  const placeholders = ids.map(() => '?').join(', ');
  await database.runAsync(`DELETE FROM sync_outbox WHERE id IN (${placeholders});`, ...ids);
}

async function recordSyncFailure(
  database: SQLiteDatabase,
  ids: readonly string[],
  message: string,
) {
  if (ids.length === 0) return;

  const placeholders = ids.map(() => '?').join(', ');
  await database.runAsync(
    `UPDATE sync_outbox
        SET attempt_count = attempt_count + 1, last_error = ?
      WHERE id IN (${placeholders});`,
    message,
    ...ids,
  );
}

function uniqueKnownIds(ids: readonly string[], knownIds: ReadonlySet<string>): string[] {
  return [...new Set(ids)].filter((id) => knownIds.has(id));
}
