import type { HealthConnectionPreference } from '../domain/types';
import {
  healthDataTypes,
  type HealthDataType,
  type HealthDateRange,
  type HealthSummary,
} from '../domain/health';
import { createPlatformHealthProvider as createPlatformHealthProviderImpl } from './platformHealthProvider';

export type { HealthDataType, HealthDateRange, HealthSummary } from '../domain/health';

export type HealthPermissionStatus =
  'granted' | 'partial' | 'denied' | 'not-determined' | 'unavailable';

export interface HealthPermissionResult {
  status: HealthPermissionStatus;
  grantedTypes: HealthDataType[];
  deniedTypes: HealthDataType[];
}

/** Platform adapters implement this contract for HealthKit or Health Connect. */
export interface HealthProvider {
  isAvailable(): Promise<boolean>;
  requestPermissions(types: readonly HealthDataType[]): Promise<HealthPermissionResult>;
  readSummaries(types: readonly HealthDataType[], range: HealthDateRange): Promise<HealthSummary[]>;
}

/**
 * Resolves to the platform adapter selected by Metro. The web/base
 * implementation is intentionally unavailable until a native surface is
 * running.
 */
export function createPlatformHealthProvider(): HealthProvider {
  return createPlatformHealthProviderImpl();
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
      return healthDataTypes;
    case 'not-now':
      return [];
  }
}
