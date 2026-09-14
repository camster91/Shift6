import type { SQLiteDatabase } from 'expo-sqlite';

import type { CompletedSet, WorkoutSession } from '../domain/types';

interface CompletedSetRow {
  id: string;
  session_id: string;
  workout_exercise_id: string;
  set_number: number;
  load: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  rir: number | null;
  completed_at: string;
  idempotency_key: string;
}

export async function saveWorkoutSession(
  database: SQLiteDatabase,
  session: WorkoutSession,
): Promise<void> {
  await database.runAsync(
    `INSERT OR IGNORE INTO workout_sessions
      (id, cycle_id, workout_id, program_version_id, workout_focus, status, started_at,
       completed_at, is_offline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    session.id,
    session.cycleId,
    session.workoutId,
    session.programVersionId,
    session.workoutFocus,
    session.status,
    session.startedAt,
    session.completedAt ?? null,
    session.isOffline ? 1 : 0,
  );
}

/**
 * Persists a completed set and its sync mutation atomically.
 * The caller should only show success after this transaction resolves.
 */
export async function saveCompletedSet(
  database: SQLiteDatabase,
  completedSet: CompletedSet,
): Promise<'inserted' | 'duplicate'> {
  let inserted = false;

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      `INSERT OR IGNORE INTO completed_sets
        (id, session_id, workout_exercise_id, set_number, load, reps, duration_seconds,
         distance_meters, rpe, rir, completed_at, idempotency_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      completedSet.id,
      completedSet.sessionId,
      completedSet.workoutExerciseId,
      completedSet.setNumber,
      completedSet.load ?? null,
      completedSet.reps ?? null,
      completedSet.durationSeconds ?? null,
      completedSet.distanceMeters ?? null,
      completedSet.rpe ?? null,
      completedSet.rir ?? null,
      completedSet.completedAt,
      completedSet.idempotencyKey,
    );

    if (result.changes === 0) return;
    inserted = true;

    await database.runAsync(
      `INSERT OR IGNORE INTO sync_outbox
        (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?);`,
      `outbox-${completedSet.idempotencyKey}`,
      completedSet.idempotencyKey,
      'completed-set',
      completedSet.id,
      JSON.stringify(completedSet),
      completedSet.completedAt,
    );
  });

  return inserted ? 'inserted' : 'duplicate';
}

export async function getCompletedSets(
  database: SQLiteDatabase,
  sessionId: string,
): Promise<CompletedSet[]> {
  const rows = await database.getAllAsync<CompletedSetRow>(
    `SELECT id, session_id, workout_exercise_id, set_number, load, reps, duration_seconds,
            distance_meters, rpe, rir, completed_at, idempotency_key
       FROM completed_sets
      WHERE session_id = ?
      ORDER BY workout_exercise_id, set_number;`,
    sessionId,
  );

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    load: row.load ?? undefined,
    reps: row.reps ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    distanceMeters: row.distance_meters ?? undefined,
    rpe: row.rpe ?? undefined,
    rir: row.rir ?? undefined,
    completedAt: row.completed_at,
    idempotencyKey: row.idempotency_key,
  }));
}

export async function completeWorkoutSession(
  database: SQLiteDatabase,
  sessionId: string,
  completedAt: string,
): Promise<void> {
  await database.runAsync(
    `UPDATE workout_sessions
        SET status = 'complete', completed_at = ?
      WHERE id = ? AND status = 'in-progress';`,
    completedAt,
    sessionId,
  );
}
