import { buildDailyHealthTrends, healthAggregationMode, normalizeHealthSummaries } from './health';

describe('provider-neutral health normalization', () => {
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
        value: 3500,
        unit: 'count',
        sampleCount: 2,
        sourceCount: 2,
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
