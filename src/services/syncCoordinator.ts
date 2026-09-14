import type { SQLiteDatabase } from 'expo-sqlite';

import { flushSyncOutbox, type SyncRunResult } from '../db/syncRepository';
import type { BackendClient } from './contracts';

export type ConnectivityStatus = 'online' | 'offline' | 'unknown';

export interface ConnectivityProvider {
  getStatus(): Promise<ConnectivityStatus>;
}

export type SyncFlush = (
  database: SQLiteDatabase,
  backend: BackendClient,
  limit?: number,
) => Promise<SyncRunResult>;

export interface SyncCoordinatorResult {
  connectivity: ConnectivityStatus;
  outcome: 'offline' | 'empty' | 'synced' | 'partial' | 'failed';
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
  if (run.attemptedMutationIds.length === 0) {
    return { connectivity: status, outcome: 'empty', run };
  }
  if (run.failedMutationIds.length > 0) {
    return { connectivity: status, outcome: 'failed', run };
  }
  if (run.rejectedMutationIds.length > 0) {
    return { connectivity: status, outcome: 'partial', run };
  }

  return { connectivity: status, outcome: 'synced', run };
}
