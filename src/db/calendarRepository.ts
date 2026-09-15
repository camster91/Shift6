import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  WorkoutScheduleOverride,
  WorkoutScheduleSession,
  WorkoutSessionStatus,
} from '../domain/types';

interface ScheduleOverrideRow {
  id: string;
  user_id: string;
  cycle_id: string;
  cycle_week: number;
  workout_id: string;
  original_date: string;
  scheduled_date: string;
  created_at: string;
  updated_at: string;
}

interface ScheduleSessionRow {
  cycle_week: number;
  workout_id: string;
  status: WorkoutSessionStatus;
  completed_at: string | null;
}

export async function getWorkoutScheduleOverrides(
  database: SQLiteDatabase,
  userId: string,
  cycleId: string,
): Promise<WorkoutScheduleOverride[]> {
  const rows = await database.getAllAsync<ScheduleOverrideRow>(
    `SELECT id, user_id, cycle_id, cycle_week, workout_id, original_date,
            scheduled_date, created_at, updated_at
       FROM workout_schedule_overrides
      WHERE user_id = ? AND cycle_id = ?
      ORDER BY cycle_week ASC, scheduled_date ASC, workout_id ASC;`,
    userId,
    cycleId,
  );

  return rows.map(mapScheduleOverride);
}

export async function getWorkoutScheduleSessions(
  database: SQLiteDatabase,
  cycleId: string,
): Promise<WorkoutScheduleSession[]> {
  const rows = await database.getAllAsync<ScheduleSessionRow>(
    `SELECT cycle_week, workout_id, status, completed_at
       FROM workout_sessions
      WHERE cycle_id = ?
      ORDER BY cycle_week ASC, started_at ASC, id ASC;`,
    cycleId,
  );

  return rows.map((row) => ({
    cycleWeek: row.cycle_week,
    workoutId: row.workout_id,
    status: row.status,
    completedAt: row.completed_at ?? undefined,
  }));
}

/**
 * Rescheduling is a replaceable local mutation. The stable occurrence ID
 * makes retries idempotent, and the outbox write happens in the same
 * transaction as the local schedule update.
 */
export async function saveWorkoutScheduleOverride(
  database: SQLiteDatabase,
  override: WorkoutScheduleOverride,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO workout_schedule_overrides
        (id, user_id, cycle_id, cycle_week, workout_id, original_date,
         scheduled_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cycle_id, cycle_week, workout_id) DO UPDATE SET
         id = excluded.id,
         user_id = excluded.user_id,
         original_date = excluded.original_date,
         scheduled_date = excluded.scheduled_date,
         updated_at = excluded.updated_at;`,
      override.id,
      override.userId,
      override.cycleId,
      override.cycleWeek,
      override.workoutId,
      override.originalDate,
      override.scheduledDate,
      override.createdAt,
      override.updatedAt,
    );
    await database.runAsync(
      `INSERT INTO sync_outbox
        (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(idempotency_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         created_at = excluded.created_at,
         last_error = NULL;`,
      `outbox-workout-schedule-override-${override.id}`,
      `workout-schedule-override:${override.id}`,
      'workout-schedule-override',
      override.id,
      JSON.stringify(override),
      override.updatedAt,
    );
  });
}

function mapScheduleOverride(row: ScheduleOverrideRow): WorkoutScheduleOverride {
  return {
    id: row.id,
    userId: row.user_id,
    cycleId: row.cycle_id,
    cycleWeek: row.cycle_week,
    workoutId: row.workout_id,
    originalDate: row.original_date,
    scheduledDate: row.scheduled_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
