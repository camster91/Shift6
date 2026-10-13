import {
  getSdkStatus,
  getGrantedPermissions,
  initialize,
  readRecords,
  aggregateRecord,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
  type RecordType,
} from 'react-native-health-connect';

import {
  HEALTH_CONNECT_DAILY_SOURCE,
  type HealthDataType,
  type HealthDateRange,
  type HealthSummary,
} from '../domain/health';
import type { HealthPermissionResult, HealthProvider } from './health';
import { readAllHealthPages } from './healthPagination';
import { utcHealthWindows, utcHealthReplacementRange } from './healthDayWindows';

const recordTypes = {
  steps: 'Steps',
  workouts: 'ExerciseSession',
  'heart-rate': 'HeartRate',
  'resting-heart-rate': 'RestingHeartRate',
  'sleep-duration': 'SleepSession',
  weight: 'Weight',
} as const satisfies Record<HealthDataType, RecordType>;

export function createPlatformHealthProvider(): HealthProvider {
  return new AndroidHealthConnectProvider();
}

class AndroidHealthConnectProvider implements HealthProvider {
  async isAvailable(): Promise<boolean> {
    try {
      return (await getSdkStatus()) === SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  }

  async requestPermissions(types: readonly HealthDataType[]): Promise<HealthPermissionResult> {
    const requestedTypes = uniqueTypes(types);
    if (requestedTypes.length === 0) {
      return { status: 'not-determined', grantedTypes: [], deniedTypes: [] };
    }
    if (!(await this.isAvailable())) {
      return { status: 'unavailable', grantedTypes: [], deniedTypes: requestedTypes };
    }

    if (!(await initialize())) {
      return { status: 'unavailable', grantedTypes: [], deniedTypes: requestedTypes };
    }
    const requestedPermissions: Permission[] = requestedTypes.map((type) => ({
      accessType: 'read',
      recordType: recordTypes[type],
    }));
    await requestPermission(requestedPermissions);
    // Read back the permission controller after the prompt. The request result
    // is not the authoritative source when a user has revoked one type in
    // Health Connect settings or grants only a subset of the request.
    const grantedPermissions = await getGrantedPermissions();
    const grantedTypes = requestedTypes.filter((type) =>
      grantedPermissions.some(
        (permission) =>
          permission.accessType === 'read' && permission.recordType === recordTypes[type],
      ),
    );
    const deniedTypes = requestedTypes.filter((type) => !grantedTypes.includes(type));
    const status =
      grantedTypes.length === requestedTypes.length
        ? 'granted'
        : grantedTypes.length > 0
          ? 'partial'
          : 'denied';
    return { status, grantedTypes, deniedTypes };
  }

  replacementCoverage(types: readonly HealthDataType[], range: HealthDateRange) {
    return {
      types: uniqueTypes(types).filter((type) => type === 'steps' || type === 'sleep-duration'),
      range: utcHealthReplacementRange(range),
    };
  }

  async readSummaries(
    types: readonly HealthDataType[],
    range: HealthDateRange,
  ): Promise<HealthSummary[]> {
    if (!validRange(range) || !(await this.isAvailable())) return [];

    if (!(await initialize())) return [];
    const summaries: HealthSummary[] = [];
    for (const type of uniqueTypes(types)) {
      summaries.push(...(await readType(type, range)));
    }
    return summaries;
  }
}

async function readType(type: HealthDataType, range: HealthDateRange): Promise<HealthSummary[]> {
  const options = {
    timeRangeFilter: {
      operator: 'between' as const,
      startTime: range.startAt,
      endTime: range.endAt,
    },
    ascendingOrder: true,
  };
  switch (type) {
    case 'steps':
    case 'sleep-duration':
      return readDailyTotal(type, range);
    case 'workouts': {
      const records = await readAllHealthPages((pageToken) =>
        readRecords('ExerciseSession', {
          ...options,
          pageSize: 1000,
          ...(pageToken ? { pageToken } : {}),
        }),
      );
      return records.map((record) => ({
        id: recordId(
          record.metadata?.id ?? record.metadata?.clientRecordId,
          record.startTime,
          type,
        ),
        type,
        value: 1,
        unit: 'count',
        startAt: record.startTime,
        endAt: record.endTime,
        source: sourceName(record.metadata?.dataOrigin),
      }));
    }
    case 'heart-rate': {
      const records = await readAllHealthPages((pageToken) =>
        readRecords('HeartRate', {
          ...options,
          pageSize: 1000,
          ...(pageToken ? { pageToken } : {}),
        }),
      );
      return records.flatMap((record) =>
        record.samples.map((sample, index) => ({
          id: `${recordId(record.metadata?.id ?? record.metadata?.clientRecordId, sample.time, type)}-${index}`,
          type,
          value: sample.beatsPerMinute,
          unit: 'bpm',
          startAt: sample.time,
          endAt: sample.time,
          source: sourceName(record.metadata?.dataOrigin),
        })),
      );
    }
    case 'resting-heart-rate': {
      const records = await readAllHealthPages((pageToken) =>
        readRecords('RestingHeartRate', {
          ...options,
          pageSize: 1000,
          ...(pageToken ? { pageToken } : {}),
        }),
      );
      return records.map((record) => ({
        id: recordId(record.metadata?.id ?? record.metadata?.clientRecordId, record.time, type),
        type,
        value: record.beatsPerMinute,
        unit: 'bpm',
        startAt: record.time,
        endAt: record.time,
        source: sourceName(record.metadata?.dataOrigin),
      }));
    }
    case 'weight': {
      const records = await readAllHealthPages((pageToken) =>
        readRecords('Weight', { ...options, pageSize: 1000, ...(pageToken ? { pageToken } : {}) }),
      );
      return records.map((record) => ({
        id: recordId(record.metadata?.id ?? record.metadata?.clientRecordId, record.time, type),
        type,
        value: record.weight.inKilograms,
        unit: 'kg',
        startAt: record.time,
        endAt: record.time,
        source: sourceName(record.metadata?.dataOrigin),
      }));
    }
  }
}

function recordId(id: string | undefined, timestamp: string, type: HealthDataType): string {
  return id?.trim() || `${type}:${timestamp}`;
}

function sourceName(source: string | undefined): string {
  return source?.trim() || 'Health Connect';
}

function validRange(range: HealthDateRange): boolean {
  const start = Date.parse(range.startAt);
  const end = Date.parse(range.endAt);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start;
}

function uniqueTypes(types: readonly HealthDataType[]): HealthDataType[] {
  return [...new Set(types)];
}

async function readDailyTotal(
  type: 'steps' | 'sleep-duration',
  range: HealthDateRange,
): Promise<HealthSummary[]> {
  const summaries: HealthSummary[] = [];
  for (const window of utcHealthWindows(range)) {
    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: window.startAt,
      endTime: window.endAt,
    };
    const result =
      type === 'steps'
        ? await aggregateRecord({ recordType: 'Steps', timeRangeFilter, dataOriginFilter: [] })
        : await aggregateRecord({
            recordType: 'SleepSession',
            timeRangeFilter,
            dataOriginFilter: [],
          });
    // Native bridge defaults missing metrics to zero. Empty origins identify no coverage.
    if (!Array.isArray(result.dataOrigins) || result.dataOrigins.length === 0) continue;
    const value = 'COUNT_TOTAL' in result ? result.COUNT_TOTAL : result.SLEEP_DURATION_TOTAL;
    if (!Number.isFinite(value) || value < 0) throw new Error('Invalid health aggregate result.');
    summaries.push({
      id: `utc-total:${type}:${window.startAt.slice(0, 10)}`,
      type,
      value,
      unit: type === 'steps' ? 'count' : 'seconds',
      startAt: window.startAt,
      endAt: window.endAt,
      source: HEALTH_CONNECT_DAILY_SOURCE,
    });
  }
  return summaries;
}
