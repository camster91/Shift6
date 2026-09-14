import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
  type RecordType,
} from 'react-native-health-connect';

import type { HealthDataType, HealthDateRange, HealthSummary } from '../domain/health';
import type { HealthPermissionResult, HealthProvider } from './health';

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

    await initialize();
    const requestedPermissions: Permission[] = requestedTypes.map((type) => ({
      accessType: 'read',
      recordType: recordTypes[type],
    }));
    const grantedPermissions = await requestPermission(requestedPermissions);
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

  async readSummaries(
    types: readonly HealthDataType[],
    range: HealthDateRange,
  ): Promise<HealthSummary[]> {
    if (!validRange(range) || !(await this.isAvailable())) return [];

    await initialize();
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
    case 'steps': {
      const result = await readRecords('Steps', options);
      return result.records.map((record) => ({
        id: recordId(
          record.metadata?.id ?? record.metadata?.clientRecordId,
          record.startTime,
          type,
        ),
        type,
        value: record.count,
        unit: 'count',
        startAt: record.startTime,
        endAt: record.endTime,
        source: sourceName(record.metadata?.dataOrigin),
      }));
    }
    case 'workouts': {
      const result = await readRecords('ExerciseSession', options);
      return result.records.map((record) => ({
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
      const result = await readRecords('HeartRate', options);
      return result.records.flatMap((record) =>
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
      const result = await readRecords('RestingHeartRate', options);
      return result.records.map((record) => ({
        id: recordId(record.metadata?.id ?? record.metadata?.clientRecordId, record.time, type),
        type,
        value: record.beatsPerMinute,
        unit: 'bpm',
        startAt: record.time,
        endAt: record.time,
        source: sourceName(record.metadata?.dataOrigin),
      }));
    }
    case 'sleep-duration': {
      const result = await readRecords('SleepSession', options);
      return result.records.map((record) => ({
        id: recordId(
          record.metadata?.id ?? record.metadata?.clientRecordId,
          record.startTime,
          type,
        ),
        type,
        value: Math.max(0, (Date.parse(record.endTime) - Date.parse(record.startTime)) / 1000),
        unit: 'seconds',
        startAt: record.startTime,
        endAt: record.endTime,
        source: sourceName(record.metadata?.dataOrigin),
      }));
    }
    case 'weight': {
      const result = await readRecords('Weight', options);
      return result.records.map((record) => ({
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
