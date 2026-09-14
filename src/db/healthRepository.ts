import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import {
  buildDailyHealthTrends,
  normalizeHealthSummaries,
  type HealthDataType,
  type HealthDateRange,
  type HealthSummary,
  type HealthTrendPoint,
} from '../domain/health';

interface HealthSummaryRow {
  user_id: string;
  source: string;
  id: string;
  health_type: HealthDataType;
  value: number;
  unit: string;
  start_at: string;
  end_at: string;
}

export interface HealthSummaryQuery {
  types?: readonly HealthDataType[];
  range?: HealthDateRange;
}

/**
 * Stores only normalized, user-scoped health summaries. Health imports do not
 * enter the workout sync outbox; a future remote health policy must opt in
 * explicitly and remain least-privilege.
 */
export async function saveHealthSummaries(
  database: SQLiteDatabase,
  userId: string,
  samples: readonly HealthSummary[],
): Promise<HealthSummary[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('A user ID is required to save health summaries.');

  const normalized = normalizeHealthSummaries(samples);
  await database.withTransactionAsync(async () => {
    for (const sample of normalized) {
      await database.runAsync(
        `INSERT INTO health_summaries
          (user_id, source, id, health_type, value, unit, start_at, end_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, source, id) DO UPDATE SET
           health_type = excluded.health_type,
           value = excluded.value,
           unit = excluded.unit,
           start_at = excluded.start_at,
           end_at = excluded.end_at;`,
        normalizedUserId,
        sample.source,
        sample.id,
        sample.type,
        sample.value,
        sample.unit,
        sample.startAt,
        sample.endAt,
      );
    }
  });

  return normalized;
}

export async function getHealthSummaries(
  database: SQLiteDatabase,
  userId: string,
  query: HealthSummaryQuery = {},
): Promise<HealthSummary[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return [];
  if (query.types && query.types.length === 0) return [];

  const params: SQLiteBindValue[] = [normalizedUserId];
  let sql = `SELECT user_id, source, id, health_type, value, unit, start_at, end_at
               FROM health_summaries
              WHERE user_id = ?`;

  if (query.types) {
    const placeholders = query.types.map(() => '?').join(', ');
    sql += ` AND health_type IN (${placeholders})`;
    params.push(...query.types);
  }
  if (query.range) {
    sql += ' AND end_at >= ? AND start_at <= ?';
    params.push(query.range.startAt, query.range.endAt);
  }
  sql += ' ORDER BY start_at ASC, end_at ASC, source ASC, id ASC;';

  const rows = await database.getAllAsync<HealthSummaryRow>(sql, ...params);
  return normalizeHealthSummaries(rows.map(mapHealthSummary));
}

export async function getDailyHealthTrends(
  database: SQLiteDatabase,
  userId: string,
  query: HealthSummaryQuery = {},
): Promise<HealthTrendPoint[]> {
  return buildDailyHealthTrends(await getHealthSummaries(database, userId, query));
}

function mapHealthSummary(row: HealthSummaryRow): HealthSummary {
  return {
    id: row.id,
    type: row.health_type,
    value: row.value,
    unit: row.unit,
    startAt: row.start_at,
    endAt: row.end_at,
    source: row.source,
  };
}
