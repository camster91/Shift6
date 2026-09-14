import type { SQLiteDatabase } from 'expo-sqlite';

import type { CompletedSet, WorkoutSession } from '../domain/types';

export async function saveWorkoutSession(
  database: SQLiteDatabase,
  session: WorkoutSession,
): Promise<void> {
  await database.runAsync(
    `INSERT OR IGNORE INTO workout_sessions
      (id, cycle_id, workout_id, program_version_id, status, started_at, completed_at, is_offline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    session.id,
    session.cycleId,
    session.workoutId,
    session.programVersionId,
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
