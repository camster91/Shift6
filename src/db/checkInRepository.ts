import type { SQLiteDatabase } from 'expo-sqlite';

import type { CheckInRating, WorkoutCheckIn } from '../domain/types';

interface WorkoutCheckInRow {
  session_id: string;
  energy: number | null;
  soreness: number | null;
  perceived_exertion: number | null;
  discomfort_reported: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export async function saveWorkoutCheckIn(
  database: SQLiteDatabase,
  checkIn: WorkoutCheckIn,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO workout_check_ins
        (session_id, energy, soreness, perceived_exertion, discomfort_reported, note,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET
         energy = excluded.energy,
         soreness = excluded.soreness,
         perceived_exertion = excluded.perceived_exertion,
         discomfort_reported = excluded.discomfort_reported,
         note = excluded.note,
         updated_at = excluded.updated_at;`,
      checkIn.sessionId,
      checkIn.energy ?? null,
      checkIn.soreness ?? null,
      checkIn.perceivedExertion ?? null,
      checkIn.discomfortReported ? 1 : 0,
      checkIn.note ?? null,
      checkIn.createdAt,
      checkIn.updatedAt,
    );
    await database.runAsync(
      `INSERT INTO sync_outbox
        (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(idempotency_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         last_error = NULL;`,
      `outbox-workout-check-in-${checkIn.sessionId}`,
      `workout-check-in:${checkIn.sessionId}`,
      'workout-check-in',
      checkIn.sessionId,
      JSON.stringify(checkIn),
      checkIn.updatedAt,
    );
  });
}

export async function getWorkoutCheckIn(
  database: SQLiteDatabase,
  sessionId: string,
): Promise<WorkoutCheckIn | null> {
  const row = await database.getFirstAsync<WorkoutCheckInRow>(
    `SELECT session_id, energy, soreness, perceived_exertion, discomfort_reported, note,
            created_at, updated_at
       FROM workout_check_ins
      WHERE session_id = ?
      LIMIT 1;`,
    sessionId,
  );
  return row ? mapCheckIn(row) : null;
}

function mapCheckIn(row: WorkoutCheckInRow): WorkoutCheckIn {
  return {
    sessionId: row.session_id,
    energy: asRating(row.energy),
    soreness: asRating(row.soreness),
    perceivedExertion: asRating(row.perceived_exertion),
    discomfortReported: row.discomfort_reported === 1,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asRating(value: number | null): CheckInRating | undefined {
  return value !== null && value >= 1 && value <= 5 ? (value as CheckInRating) : undefined;
}
