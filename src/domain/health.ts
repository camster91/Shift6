export const healthDataTypes = [
  'steps',
  'workouts',
  'heart-rate',
  'resting-heart-rate',
  'sleep-duration',
  'weight',
] as const;

export type HealthDataType = (typeof healthDataTypes)[number];

export interface HealthSummary {
  /** Stable identifier supplied by the platform adapter for one source sample. */
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

export type HealthAggregationMode = 'sum' | 'average' | 'latest';

export interface HealthTrendPoint {
  day: string;
  type: HealthDataType;
  value: number;
  unit: string;
  sampleCount: number;
  sourceCount: number;
}

const additiveHealthTypes: readonly HealthDataType[] = ['steps', 'workouts', 'sleep-duration'];

/**
 * The domain owns aggregation semantics so a provider cannot quietly change
 * how progress surfaces interpret imported health data.
 */
export function healthAggregationMode(type: HealthDataType): HealthAggregationMode {
  if (additiveHealthTypes.includes(type)) return 'sum';
  if (type === 'weight') return 'latest';
  return 'average';
}

export function isHealthDataType(value: unknown): value is HealthDataType {
  return typeof value === 'string' && (healthDataTypes as readonly string[]).includes(value);
}

function canonicalizeSummary(sample: HealthSummary): HealthSummary | null {
  if (
    !sample ||
    typeof sample !== 'object' ||
    typeof sample.id !== 'string' ||
    typeof sample.source !== 'string' ||
    typeof sample.unit !== 'string' ||
    !isHealthDataType(sample.type) ||
    typeof sample.value !== 'number' ||
    !Number.isFinite(sample.value) ||
    sample.value < 0 ||
    typeof sample.startAt !== 'string' ||
    typeof sample.endAt !== 'string'
  ) {
    return null;
  }

  const id = sample.id.trim();
  const source = sample.source.trim();
  const unit = sample.unit.trim();
  const startTimestamp = Date.parse(sample.startAt);
  const endTimestamp = Date.parse(sample.endAt);

  if (
    id.length === 0 ||
    source.length === 0 ||
    unit.length === 0 ||
    !Number.isFinite(startTimestamp) ||
    !Number.isFinite(endTimestamp) ||
    endTimestamp < startTimestamp
  ) {
    return null;
  }

  return {
    id,
    type: sample.type,
    value: sample.value,
    unit,
    startAt: new Date(startTimestamp).toISOString(),
    endAt: new Date(endTimestamp).toISOString(),
    source,
  };
}

function summarySortKey(sample: HealthSummary): string {
  return [
    sample.startAt,
    sample.endAt,
    sample.type,
    sample.unit,
    sample.value,
    sample.source,
    sample.id,
  ].join('\u001f');
}

function compareSummaries(left: HealthSummary, right: HealthSummary): number {
  return summarySortKey(left).localeCompare(summarySortKey(right));
}

/**
 * Converts adapter output into the only sample shape the app may consume.
 * Invalid values are ignored, duplicate source IDs are collapsed, and output
 * order is stable regardless of provider response order.
 */
export function normalizeHealthSummaries(samples: readonly HealthSummary[]): HealthSummary[] {
  const bySourceId = new Map<string, HealthSummary>();

  for (const sample of samples) {
    const normalized = canonicalizeSummary(sample);
    if (!normalized) continue;

    const key = `${normalized.source}\u001f${normalized.id}`;
    const existing = bySourceId.get(key);
    if (!existing || compareSummaries(normalized, existing) < 0) {
      bySourceId.set(key, normalized);
    }
  }

  return [...bySourceId.values()].sort(compareSummaries);
}

function trendKey(sample: HealthSummary): string {
  return [sample.startAt.slice(0, 10), sample.type, sample.unit].join('\u001f');
}

/**
 * Builds deterministic UTC-day points from normalized provider summaries.
 * Samples are grouped by their canonical start day and unit; unit conversion
 * is intentionally outside this boundary because it needs an explicit policy.
 */
export function buildDailyHealthTrends(samples: readonly HealthSummary[]): HealthTrendPoint[] {
  const normalized = normalizeHealthSummaries(samples);
  const groups = new Map<string, HealthSummary[]>();

  for (const sample of normalized) {
    const key = trendKey(sample);
    const group = groups.get(key) ?? [];
    group.push(sample);
    groups.set(key, group);
  }

  return [...groups.values()]
    .flatMap((group) => {
      const first = group.at(0);
      if (!first) return [];

      const latest = group.reduce((current, sample) => {
        const endOrder = sample.endAt.localeCompare(current.endAt);
        return endOrder > 0 || (endOrder === 0 && compareSummaries(sample, current) > 0)
          ? sample
          : current;
      }, first);
      const mode = healthAggregationMode(first.type);
      const value =
        mode === 'sum'
          ? group.reduce((total, sample) => total + sample.value, 0)
          : mode === 'average'
            ? group.reduce((total, sample) => total + sample.value, 0) / group.length
            : latest.value;

      return [
        {
          day: first.startAt.slice(0, 10),
          type: first.type,
          value,
          unit: first.unit,
          sampleCount: group.length,
          sourceCount: new Set(group.map((sample) => sample.source)).size,
        } satisfies HealthTrendPoint,
      ];
    })
    .sort((left, right) => {
      const dayOrder = left.day.localeCompare(right.day);
      if (dayOrder !== 0) return dayOrder;
      const typeOrder = left.type.localeCompare(right.type);
      return typeOrder === 0 ? left.unit.localeCompare(right.unit) : typeOrder;
    });
}
