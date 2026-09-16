import type { SQLiteDatabase } from 'expo-sqlite';

import { bodyMetricValueForUnitSystem } from '../domain/bodyMetrics';
import { deleteBodyMetric, getBodyMetrics, saveManualWeight } from './bodyMetricRepository';

describe('manual body metrics repository', () => {
  it('stores weight canonically in kilograms without analytics or sync side effects', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
    const database = { runAsync } as unknown as SQLiteDatabase;

    const metric = await saveManualWeight(
      database,
      'guest-user',
      220.4623,
      'imperial',
      '2026-09-16T10:00:00.000Z',
    );

    expect(metric.value).toBeCloseTo(100, 3);
    expect(metric.unit).toBe('kg');
    expect(bodyMetricValueForUnitSystem(metric, 'imperial')).toBeCloseTo(220.5, 1);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO body_metrics'),
      metric.id,
      'guest-user',
      'weight',
      metric.value,
      'kg',
      metric.measuredAt,
      metric.createdAt,
    );
  });

  it('returns valid user-owned rows in newest-first order supplied by the query', async () => {
    const database = {
      getAllAsync: async () => [
        {
          id: 'metric-2',
          user_id: 'guest-user',
          metric_type: 'weight',
          value: 99,
          unit: 'kg',
          measured_at: '2026-09-16T10:00:00.000Z',
          created_at: '2026-09-16T10:00:00.000Z',
        },
        {
          id: 'metric-invalid',
          user_id: 'guest-user',
          metric_type: 'weight',
          value: -1,
          unit: 'kg',
          measured_at: '2026-09-15T10:00:00.000Z',
          created_at: '2026-09-15T10:00:00.000Z',
        },
      ],
    } as unknown as SQLiteDatabase;

    await expect(getBodyMetrics(database, 'guest-user')).resolves.toEqual([
      expect.objectContaining({ id: 'metric-2', value: 99, unit: 'kg' }),
    ]);
  });

  it('deletes only a metric owned by the requested user', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const database = { runAsync } as unknown as SQLiteDatabase;

    await expect(deleteBodyMetric(database, 'guest-user', 'metric-1')).resolves.toBe(true);
    expect(runAsync).toHaveBeenCalledWith(
      'DELETE FROM body_metrics WHERE id = ? AND user_id = ?;',
      'metric-1',
      'guest-user',
    );
  });
});
