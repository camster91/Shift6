import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createManualWeightMetric,
  type BodyMetric,
  type BodyMetricType,
} from '../domain/bodyMetrics';
import type { UnitSystem } from '../domain/types';

interface BodyMetricRow {
  id: string;
  user_id: string;
  metric_type: BodyMetricType;
  value: number;
  unit: 'kg';
  measured_at: string;
  created_at: string;
}

/**
 * Manual body metrics are user-entered and local-first. They are not analytics
 * events and do not enter the sync outbox until a separate remote policy exists.
 */
export async function saveManualWeight(
  database: SQLiteDatabase,
  userId: string,
  value: number,
  unitSystem: UnitSystem,
  measuredAt: string,
): Promise<BodyMetric> {
  const metric = createManualWeightMetric({ userId, value, unitSystem, measuredAt });

  await database.runAsync(
    `INSERT INTO body_metrics
      (id, user_id, metric_type, value, unit, measured_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       value = excluded.value,
       unit = excluded.unit,
       measured_at = excluded.measured_at;`,
    metric.id,
    metric.userId,
    metric.type,
    metric.value,
    metric.unit,
    metric.measuredAt,
    metric.createdAt,
  );

  return metric;
}

export async function getBodyMetrics(
  database: SQLiteDatabase,
  userId: string,
  type: BodyMetricType = 'weight',
): Promise<BodyMetric[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return [];

  const rows = await database.getAllAsync<BodyMetricRow>(
    `SELECT id, user_id, metric_type, value, unit, measured_at, created_at
       FROM body_metrics
      WHERE user_id = ? AND metric_type = ?
      ORDER BY measured_at DESC, id DESC;`,
    normalizedUserId,
    type,
  );

  return rows.map(mapBodyMetric).filter((metric): metric is BodyMetric => metric !== null);
}

export async function deleteBodyMetric(
  database: SQLiteDatabase,
  userId: string,
  metricId: string,
): Promise<boolean> {
  const normalizedUserId = userId.trim();
  const normalizedMetricId = metricId.trim();
  if (!normalizedUserId || !normalizedMetricId) return false;

  const result = await database.runAsync(
    'DELETE FROM body_metrics WHERE id = ? AND user_id = ?;',
    normalizedMetricId,
    normalizedUserId,
  );
  return result.changes === 1;
}

function mapBodyMetric(row: BodyMetricRow): BodyMetric | null {
  if (
    row.metric_type !== 'weight' ||
    row.unit !== 'kg' ||
    !Number.isFinite(row.value) ||
    row.value <= 0 ||
    !Number.isFinite(Date.parse(row.measured_at)) ||
    !Number.isFinite(Date.parse(row.created_at))
  ) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    type: row.metric_type,
    value: row.value,
    unit: row.unit,
    measuredAt: new Date(row.measured_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
  };
}
