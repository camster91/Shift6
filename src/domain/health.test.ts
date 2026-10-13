import {
  buildDailyHealthTrends,
  healthAggregationMode,
  healthDataTypeDetails,
  normalizeHealthSummaries,
  HEALTH_CONNECT_DAILY_SOURCE,
  type HealthSummary,
} from './health';

describe('provider-neutral health normalization', () => {
  it('defines a disclosure reason and unit for every supported health type', () => {
    expect(Object.keys(healthDataTypeDetails)).toHaveLength(6);
    for (const detail of Object.values(healthDataTypeDetails)) {
      expect(detail.label.length).toBeGreaterThan(0);
      expect(detail.unit.length).toBeGreaterThan(0);
      expect(detail.reason.length).toBeGreaterThan(0);
    }
  });

  it('drops invalid samples, canonicalizes timestamps, deduplicates source IDs, and sorts', () => {
    const samples = normalizeHealthSummaries([
      {
        id: ' steps-1 ',
        type: 'steps',
        value: 1000,
        unit: 'count',
        startAt: '2026-09-02T01:00:00-04:00',
        endAt: '2026-09-02T02:00:00-04:00',
        source: ' Apple Health ',
      },
      {
        id: 'steps-1',
        type: 'steps',
        value: 1200,
        unit: 'count',
        startAt: '2026-09-02T05:00:00.000Z',
        endAt: '2026-09-02T06:00:00.000Z',
        source: 'Apple Health',
      },
      {
        id: 'invalid-value',
        type: 'heart-rate',
        value: Number.NaN,
        unit: 'bpm',
        startAt: '2026-09-01T00:00:00.000Z',
        endAt: '2026-09-01T00:01:00.000Z',
        source: 'Apple Health',
      },
      {
        id: 'invalid-range',
        type: 'weight',
        value: 80,
        unit: 'kg',
        startAt: '2026-09-03T00:00:00.000Z',
        endAt: '2026-09-02T00:00:00.000Z',
        source: 'Apple Health',
      },
    ]);

    expect(samples).toEqual([
      {
        id: 'steps-1',
        type: 'steps',
        value: 1000,
        unit: 'count',
        startAt: '2026-09-02T05:00:00.000Z',
        endAt: '2026-09-02T06:00:00.000Z',
        source: 'Apple Health',
      },
    ]);
  });

  it('uses explicit aggregation rules for daily trend points', () => {
    const trends = buildDailyHealthTrends([
      {
        id: 'steps-1',
        type: 'steps',
        value: 1000,
        unit: 'count',
        startAt: '2026-09-01T08:00:00.000Z',
        endAt: '2026-09-01T09:00:00.000Z',
        source: 'Apple Health',
      },
      {
        id: 'steps-2',
        type: 'steps',
        value: 2500,
        unit: 'count',
        startAt: '2026-09-01T18:00:00.000Z',
        endAt: '2026-09-01T19:00:00.000Z',
        source: 'Health Connect',
      },
      {
        id: 'hr-1',
        type: 'heart-rate',
        value: 60,
        unit: 'bpm',
        startAt: '2026-09-01T08:00:00.000Z',
        endAt: '2026-09-01T08:01:00.000Z',
        source: 'Apple Health',
      },
      {
        id: 'hr-2',
        type: 'heart-rate',
        value: 80,
        unit: 'bpm',
        startAt: '2026-09-01T18:00:00.000Z',
        endAt: '2026-09-01T18:01:00.000Z',
        source: 'Health Connect',
      },
      {
        id: 'weight-1',
        type: 'weight',
        value: 80,
        unit: 'kg',
        startAt: '2026-09-01T07:00:00.000Z',
        endAt: '2026-09-01T07:00:00.000Z',
        source: 'Apple Health',
      },
      {
        id: 'weight-2',
        type: 'weight',
        value: 79.5,
        unit: 'kg',
        startAt: '2026-09-01T20:00:00.000Z',
        endAt: '2026-09-01T20:00:00.000Z',
        source: 'Apple Health',
      },
    ]);

    expect(healthAggregationMode('steps')).toBe('sum');
    expect(healthAggregationMode('heart-rate')).toBe('average');
    expect(healthAggregationMode('weight')).toBe('latest');
    expect(trends).toEqual([
      {
        day: '2026-09-01',
        type: 'heart-rate',
        value: 70,
        unit: 'bpm',
        sampleCount: 2,
        sourceCount: 2,
      },
      {
        day: '2026-09-01',
        type: 'steps',
        value: 1000,
        unit: 'count',
        sampleCount: 1,
        sourceCount: 1,
        basis: 'source-estimate',
        sourceLabel: 'Apple Health',
      },
      {
        day: '2026-09-01',
        type: 'steps',
        value: 2500,
        unit: 'count',
        sampleCount: 1,
        sourceCount: 1,
        basis: 'source-estimate',
        sourceLabel: 'Health Connect',
      },
      {
        day: '2026-09-01',
        type: 'weight',
        value: 79.5,
        unit: 'kg',
        sampleCount: 2,
        sourceCount: 1,
      },
    ]);
  });
});

const rawStep: HealthSummary = {
  id: 'phone',
  type: 'steps',
  value: 1000,
  unit: 'count',
  startAt: '2026-10-12T12:00:00Z',
  endAt: '2026-10-12T13:00:00Z',
  source: 'phone',
};
test('raw overlapping sources remain separate estimates rather than an inflated combined total', () => {
  const trends = buildDailyHealthTrends([rawStep, { ...rawStep, id: 'watch', source: 'watch' }]);
  expect(trends).toHaveLength(2);
  expect(trends.every((trend) => trend.value === 1000 && trend.basis === 'source-estimate')).toBe(
    true,
  );
});
test('a platform daily total excludes legacy raw contributions for that day', () => {
  const total = {
    ...rawStep,
    id: 'utc-total:steps:2026-10-12',
    source: HEALTH_CONNECT_DAILY_SOURCE,
    value: 1200,
  };
  expect(buildDailyHealthTrends([rawStep, { ...rawStep, source: 'watch' }, total])).toEqual([
    expect.objectContaining({ value: 1200, basis: 'platform-total' }),
  ]);
});
test('distinct intervals from one raw source remain included with an estimate label', () => {
  expect(
    buildDailyHealthTrends([
      rawStep,
      {
        ...rawStep,
        id: 'later',
        value: 500,
        startAt: '2026-10-12T15:00:00Z',
        endAt: '2026-10-12T16:00:00Z',
      },
    ]),
  ).toEqual([
    expect.objectContaining({ value: 1500, basis: 'source-estimate', sourceLabel: 'phone' }),
  ]);
});
