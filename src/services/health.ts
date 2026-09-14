import type { HealthConnectionPreference } from '../domain/types';

export type HealthDataType =
  'steps' | 'workouts' | 'heart-rate' | 'resting-heart-rate' | 'sleep-duration' | 'weight';

export type HealthPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'unavailable';

export interface HealthPermissionResult {
  status: HealthPermissionStatus;
  grantedTypes: HealthDataType[];
  deniedTypes: HealthDataType[];
}

export interface HealthSummary {
  id: string;
  type: HealthDataType;
  value: number;
  unit: string;
  startAt: string;
  endAt: string;
  source: string;
}

export interface HealthDateRange {
  startAt: string;
  endAt: string;
}

/** Platform adapters implement this contract for HealthKit or Health Connect. */
export interface HealthProvider {
  isAvailable(): Promise<boolean>;
  requestPermissions(types: readonly HealthDataType[]): Promise<HealthPermissionResult>;
  readSummaries(types: readonly HealthDataType[], range: HealthDateRange): Promise<HealthSummary[]>;
}

export class UnavailableHealthProvider implements HealthProvider {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async requestPermissions(types: readonly HealthDataType[]): Promise<HealthPermissionResult> {
    return {
      status: 'unavailable',
      grantedTypes: [],
      deniedTypes: [...types],
    };
  }

  async readSummaries(
    _types: readonly HealthDataType[],
    _range: HealthDateRange,
  ): Promise<HealthSummary[]> {
    return [];
  }
}

export function healthTypesForPreference(
  preference: HealthConnectionPreference,
): readonly HealthDataType[] {
  switch (preference) {
    case 'apple-health':
    case 'health-connect':
      return ['steps', 'workouts', 'heart-rate', 'resting-heart-rate', 'sleep-duration', 'weight'];
    case 'not-now':
      return [];
  }
}
