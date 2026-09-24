import type { SQLiteDatabase } from 'expo-sqlite';

import {
  normalizeHealthSummaries,
  type HealthDataType,
  type HealthDateRange,
} from '../domain/health';
import { saveHealthSummaries } from '../db/healthRepository';
import type { HealthPermissionResult, HealthProvider } from './health';

export type HealthSyncStatus =
  'synced' | 'unavailable' | 'permission-denied' | 'not-requested' | 'failed';

export interface HealthSyncResult {
  status: HealthSyncStatus;
  importedCount: number;
  grantedTypes: HealthDataType[];
  deniedTypes: HealthDataType[];
}

export interface HealthSyncInput {
  database: SQLiteDatabase;
  userId: string;
  provider: HealthProvider;
  types: readonly HealthDataType[];
  range: HealthDateRange;
}

/**
 * Runs the explicit user-initiated health boundary. Permission, native reads,
 * domain normalization, and local persistence are kept in this order so a
 * provider cannot bypass the local repository or write health data to sync.
 */
export async function syncHealthSummaries(input: HealthSyncInput): Promise<HealthSyncResult> {
  const requestedTypes = uniqueTypes(input.types);
  if (requestedTypes.length === 0) {
    return emptyResult('not-requested');
  }

  try {
    if (!(await input.provider.isAvailable())) return emptyResult('unavailable', requestedTypes);

    const permission = await input.provider.requestPermissions(requestedTypes);
    if (permission.status === 'unavailable') {
      return resultFromPermission('unavailable', permission);
    }
    if (permission.grantedTypes.length === 0) {
      return resultFromPermission('permission-denied', permission);
    }

    const summaries = normalizeHealthSummaries(
      await input.provider.readSummaries(permission.grantedTypes, input.range),
    );
    const saved = await saveHealthSummaries(input.database, input.userId, summaries);
    return {
      status: 'synced',
      importedCount: saved.length,
      grantedTypes: [...permission.grantedTypes],
      deniedTypes: [...permission.deniedTypes],
    };
  } catch {
    return {
      status: 'failed',
      importedCount: 0,
      grantedTypes: [],
      deniedTypes: requestedTypes,
    };
  }
}

function resultFromPermission(
  status: Extract<HealthSyncStatus, 'unavailable' | 'permission-denied'>,
  permission: HealthPermissionResult,
): HealthSyncResult {
  return {
    status,
    importedCount: 0,
    grantedTypes: [...permission.grantedTypes],
    deniedTypes: [...permission.deniedTypes],
  };
}

function emptyResult(
  status: Extract<HealthSyncStatus, 'not-requested' | 'unavailable'>,
  deniedTypes: readonly HealthDataType[] = [],
): HealthSyncResult {
  return {
    status,
    importedCount: 0,
    grantedTypes: [],
    deniedTypes: [...deniedTypes],
  };
}

function uniqueTypes(types: readonly HealthDataType[]): HealthDataType[] {
  return [...new Set(types)];
}
