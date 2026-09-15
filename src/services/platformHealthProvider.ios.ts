import HealthKit, {
  CategoryValueSleepAnalysis,
  type CategorySample,
  type ObjectTypeIdentifier,
  type QuantitySample,
  type QuantityTypeIdentifier,
} from '@kingstinct/react-native-healthkit';

import type { HealthDataType, HealthDateRange, HealthSummary } from '../domain/health';
import type { HealthPermissionResult, HealthProvider } from './health';

const sleepIdentifier = 'HKCategoryTypeIdentifierSleepAnalysis' as const;
const workoutIdentifier = 'HKWorkoutTypeIdentifier' as const;

const quantityIdentifiers = {
  steps: 'HKQuantityTypeIdentifierStepCount',
  'heart-rate': 'HKQuantityTypeIdentifierHeartRate',
  'resting-heart-rate': 'HKQuantityTypeIdentifierRestingHeartRate',
  weight: 'HKQuantityTypeIdentifierBodyMass',
} as const satisfies Record<
  Exclude<HealthDataType, 'workouts' | 'sleep-duration'>,
  QuantityTypeIdentifier
>;

const healthKitUnits = {
  steps: 'count',
  'heart-rate': 'count/min',
  'resting-heart-rate': 'count/min',
  weight: 'kg',
} as const;

const asleepValues = new Set<number>([
  CategoryValueSleepAnalysis.asleep,
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
]);

export function createPlatformHealthProvider(): HealthProvider {
  return new AppleHealthProvider();
}

class AppleHealthProvider implements HealthProvider {
  async isAvailable(): Promise<boolean> {
    try {
      return await HealthKit.isHealthDataAvailableAsync();
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

    const toRead = requestedTypes.map(healthKitIdentifierForType);
    const authorized = await HealthKit.requestAuthorization({ toRead });
    return authorized
      ? { status: 'granted', grantedTypes: requestedTypes, deniedTypes: [] }
      : { status: 'denied', grantedTypes: [], deniedTypes: requestedTypes };
  }

  async readSummaries(
    types: readonly HealthDataType[],
    range: HealthDateRange,
  ): Promise<HealthSummary[]> {
    if (!validRange(range)) return [];

    const summaries: HealthSummary[] = [];
    const requestedTypes = uniqueTypes(types);
    for (const type of requestedTypes) {
      switch (type) {
        case 'steps':
        case 'heart-rate':
        case 'resting-heart-rate':
        case 'weight':
          summaries.push(...(await readQuantitySummaries(type, range)));
          break;
        case 'sleep-duration':
          summaries.push(...(await readSleepSummaries(range)));
          break;
        case 'workouts':
          summaries.push(...(await readWorkoutSummaries(range)));
          break;
      }
    }
    return summaries;
  }
}

async function readQuantitySummaries(
  type: Exclude<HealthDataType, 'workouts' | 'sleep-duration'>,
  range: HealthDateRange,
): Promise<HealthSummary[]> {
  const options = queryOptions(range);
  switch (type) {
    case 'steps':
      return mapQuantitySamples(
        await HealthKit.queryQuantitySamples(quantityIdentifiers.steps, {
          ...options,
          unit: healthKitUnits.steps,
        }),
        type,
      );
    case 'heart-rate':
      return mapQuantitySamples(
        await HealthKit.queryQuantitySamples(quantityIdentifiers['heart-rate'], {
          ...options,
          unit: healthKitUnits['heart-rate'],
        }),
        type,
      );
    case 'resting-heart-rate':
      return mapQuantitySamples(
        await HealthKit.queryQuantitySamples(quantityIdentifiers['resting-heart-rate'], {
          ...options,
          unit: healthKitUnits['resting-heart-rate'],
        }),
        type,
      );
    case 'weight':
      return mapQuantitySamples(
        await HealthKit.queryQuantitySamples(quantityIdentifiers.weight, {
          ...options,
          unit: healthKitUnits.weight,
        }),
        type,
      );
  }
}

async function readSleepSummaries(range: HealthDateRange): Promise<HealthSummary[]> {
  const samples = await HealthKit.queryCategorySamples(sleepIdentifier, queryOptions(range));
  return samples
    .filter((sample) => asleepValues.has(Number(sample.value)))
    .map((sample) => ({
      id: sample.uuid,
      type: 'sleep-duration' as const,
      value: Math.max(0, (sample.endDate.getTime() - sample.startDate.getTime()) / 1000),
      unit: 'seconds',
      startAt: sample.startDate.toISOString(),
      endAt: sample.endDate.toISOString(),
      source: sourceName(sample),
    }));
}

async function readWorkoutSummaries(range: HealthDateRange): Promise<HealthSummary[]> {
  const workouts = await HealthKit.queryWorkoutSamples({
    ...queryOptions(range),
  });
  return workouts.map((workout) => {
    const sample = workout.toJSON();
    return {
      id: sample.uuid,
      type: 'workouts' as const,
      value: 1,
      unit: 'count',
      startAt: sample.startDate.toISOString(),
      endAt: sample.endDate.toISOString(),
      source: sourceName(sample),
    };
  });
}

function mapQuantitySamples(
  samples: readonly QuantitySample[],
  type: Exclude<HealthDataType, 'workouts' | 'sleep-duration'>,
): HealthSummary[] {
  return samples.map((sample) => ({
    id: sample.uuid,
    type,
    value: sample.quantity,
    unit:
      type === 'heart-rate' || type === 'resting-heart-rate'
        ? 'bpm'
        : type === 'weight'
          ? 'kg'
          : 'count',
    startAt: sample.startDate.toISOString(),
    endAt: sample.endDate.toISOString(),
    source: sourceName(sample),
  }));
}

function healthKitIdentifierForType(type: HealthDataType): ObjectTypeIdentifier {
  switch (type) {
    case 'sleep-duration':
      return sleepIdentifier;
    case 'workouts':
      return workoutIdentifier;
    default:
      return quantityIdentifiers[type];
  }
}

function queryOptions(range: HealthDateRange) {
  return {
    filter: {
      date: {
        startDate: new Date(range.startAt),
        endDate: new Date(range.endAt),
      },
    },
    ascending: true,
    limit: 0,
  };
}

function sourceName(
  sample: Pick<QuantitySample, 'sourceRevision'> | Pick<CategorySample, 'sourceRevision'>,
): string {
  return sample.sourceRevision.source.name.trim() || 'Apple Health';
}

function validRange(range: HealthDateRange): boolean {
  const start = Date.parse(range.startAt);
  const end = Date.parse(range.endAt);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start;
}

function uniqueTypes(types: readonly HealthDataType[]): HealthDataType[] {
  return [...new Set(types)];
}
