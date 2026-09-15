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

export interface SyncIssue {
  id: string;
  entityType: SyncMutation['entityType'];
  entityId: string;
  createdAt: string;
  attemptCount: number;
  lastError: string;
  kind: 'conflict' | 'rejected' | 'failed';
}

interface SyncIssueRow {
  id: string;
  entity_type: SyncMutation['entityType'];
  entity_id: string;
  created_at: string;
  attempt_count: number;
  last_error: string;
}

export interface SyncRunResult {
  attemptedMutationIds: string[];
  acknowledgedMutationIds: string[];
  rejectedMutationIds: string[];
  conflictedMutationIds: string[];
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

/** Read-only local issue summary for an explicit review surface. */
export async function getPendingSyncIssues(
  database: SQLiteDatabase,
  limit = 50,
): Promise<SyncIssue[]> {
  const safeLimit = Math.max(1, Math.floor(limit));
  const rows = await database.getAllAsync<SyncIssueRow>(
    `SELECT id, entity_type, entity_id, created_at, attempt_count, last_error
       FROM sync_outbox
      WHERE last_error IS NOT NULL
      ORDER BY created_at ASC, id ASC
      LIMIT ?;`,
    safeLimit,
  );

  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at,
    attemptCount: row.attempt_count,
    lastError: row.last_error,
    kind: issueKind(row.last_error),
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
      conflictedMutationIds: [],
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
      conflictedMutationIds: [],
      failedMutationIds: attemptedMutationIds,
    };
  }

  const attemptedSet = new Set(attemptedMutationIds);
  const conflictedMutationIds = uniqueKnownIds(
    (result.conflicts ?? []).map((conflict) => conflict.mutationId),
    attemptedSet,
  );
  const conflictedSet = new Set(conflictedMutationIds);
  const rejectedMutationIds = uniqueKnownIds(result.rejectedMutationIds, attemptedSet).filter(
    (id) => !conflictedSet.has(id),
  );
  const rejectedSet = new Set(rejectedMutationIds);
  const acknowledgedMutationIds = uniqueKnownIds(
    result.acknowledgedMutationIds,
    attemptedSet,
  ).filter((id) => !rejectedSet.has(id) && !conflictedSet.has(id));
  const resolvedIds = new Set([
    ...acknowledgedMutationIds,
    ...rejectedMutationIds,
    ...conflictedMutationIds,
  ]);
  const failedMutationIds = attemptedMutationIds.filter((id) => !resolvedIds.has(id));

  await acknowledgeSyncMutations(database, acknowledgedMutationIds);
  const conflictsByCode = new Map<string, string[]>();
  for (const conflict of result.conflicts ?? []) {
    if (!conflictedSet.has(conflict.mutationId)) continue;
    const ids = conflictsByCode.get(conflict.code) ?? [];
    ids.push(conflict.mutationId);
    conflictsByCode.set(conflict.code, ids);
  }
  for (const [code, ids] of conflictsByCode) {
    await recordSyncFailure(
      database,
      ids,
      `The backend reported a ${code}. Review is required before this change can sync.`,
    );
  }
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
    conflictedMutationIds,
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

function issueKind(message: string): SyncIssue['kind'] {
  if (message.toLowerCase().includes('conflict')) return 'conflict';
  if (message.toLowerCase().includes('rejected')) return 'rejected';
  return 'failed';
}

function uniqueKnownIds(ids: readonly string[], knownIds: ReadonlySet<string>): string[] {
  return [...new Set(ids)].filter((id) => knownIds.has(id));
}
