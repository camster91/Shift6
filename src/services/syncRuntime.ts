import type { SQLiteDatabase } from 'expo-sqlite';

import type { AppServices } from './appServices';
import type { BackendClient } from './contracts';
import { flushWhenOnline, type SyncCoordinatorResult } from './syncCoordinator';
import type { ConnectivityProvider } from './syncCoordinator';

export type SyncRuntimeState = 'idle' | 'offline' | 'syncing' | 'synced' | 'partial' | 'failed';

export interface AuthenticatedSyncResult {
  kind: 'skipped-unauthenticated' | 'attempted';
  result: SyncCoordinatorResult | null;
}

export type AuthenticatedFlush = (
  database: SQLiteDatabase,
  backend: BackendClient,
  connectivity: ConnectivityProvider,
  limit?: number,
) => Promise<SyncCoordinatorResult>;

/**
 * Runs sync only for an authenticated account. Guest/local-first sessions keep
 * their outbox untouched until an auth provider is available.
 */
export async function runAuthenticatedSync(
  database: SQLiteDatabase,
  services: Pick<AppServices, 'auth' | 'backend' | 'connectivity'>,
  limit = 50,
  flush: AuthenticatedFlush = flushWhenOnline,
): Promise<AuthenticatedSyncResult> {
  const session = await services.auth.getSession();
  if (!session) return { kind: 'skipped-unauthenticated', result: null };

  return {
    kind: 'attempted',
    result: await flush(database, services.backend, services.connectivity, limit),
  };
}

export function syncRuntimeStateFromResult(result: SyncCoordinatorResult | null): SyncRuntimeState {
  if (!result) return 'idle';
  if (result.outcome === 'offline') return 'offline';
  if (result.outcome === 'failed') return 'failed';
  if (result.outcome === 'partial') return 'partial';
  if (result.outcome === 'synced') return 'synced';
  return 'idle';
}
