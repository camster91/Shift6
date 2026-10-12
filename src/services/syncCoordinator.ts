import type { SQLiteDatabase } from 'expo-sqlite';

import { flushSyncOutbox, type SyncRunResult } from '../db/syncRepository';
import type { BackendClient } from './contracts';

export type ConnectivityStatus = 'online' | 'offline' | 'unknown';

export interface ConnectivityProvider {
  getStatus(): Promise<ConnectivityStatus>;
  subscribe?(listener: (status: ConnectivityStatus) => void): { remove: () => void };
}

export type SyncFlush = (
  database: SQLiteDatabase,
  backend: BackendClient,
  limit?: number,
) => Promise<SyncRunResult>;

export interface SyncCoordinatorResult {
  connectivity: ConnectivityStatus;
  outcome: 'offline' | 'empty' | 'synced' | 'partial' | 'conflict' | 'failed';
  run: SyncRunResult | null;
}

/**
 * Cloud sync is always downstream of local writes. This boundary makes an
 * offline skip explicit and keeps connectivity/scheduling replaceable.
 */
export async function flushWhenOnline(
  database: SQLiteDatabase,
  backend: BackendClient,
  connectivity: ConnectivityProvider,
  limit = 50,
  flush: SyncFlush = flushSyncOutbox,
): Promise<SyncCoordinatorResult> {
  const status = await connectivity.getStatus();
  if (status === 'offline') {
    return { connectivity: status, outcome: 'offline', run: null };
  }

  const run = await flush(database, backend, limit);
  let last = run;
  const seen = new Set(run.attemptedMutationIds);
  // Drain serial snapshots without waiting for another foreground event. Bound
  // network work and stop immediately on a conflict, failure or partial result.
  for (let batch = 1; batch < 10; batch += 1) {
    if (
      last.attemptedMutationIds.length === 0 ||
      last.conflictedMutationIds.length > 0 ||
      last.failedMutationIds.length > 0 ||
      last.rejectedMutationIds.length > 0 ||
      last.acknowledgedMutationIds.length !== last.attemptedMutationIds.length
    )
      break;
    const next = await flush(database, backend, limit);
    if (next.attemptedMutationIds.length === 0) break;
    // An acknowledged operation appearing again means no queue progress. Do
    // not spin on a faulty storage/provider boundary.
    if (next.attemptedMutationIds.every((id) => seen.has(id))) break;
    for (const id of next.attemptedMutationIds) seen.add(id);
    for (const field of [
      'attemptedMutationIds',
      'acknowledgedMutationIds',
      'rejectedMutationIds',
      'conflictedMutationIds',
      'failedMutationIds',
    ] as const)
      run[field] = [...new Set([...run[field], ...next[field]])];
    last = next;
  }
  if (run.attemptedMutationIds.length === 0) {
    return { connectivity: status, outcome: 'empty', run };
  }
  if (run.conflictedMutationIds.length > 0) {
    return { connectivity: status, outcome: 'conflict', run };
  }
  if (run.failedMutationIds.length > 0) {
    return { connectivity: status, outcome: 'failed', run };
  }
  if (run.rejectedMutationIds.length > 0) {
    return { connectivity: status, outcome: 'partial', run };
  }

  return { connectivity: status, outcome: 'synced', run };
}
