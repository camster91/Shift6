import type { SQLiteDatabase } from 'expo-sqlite';

import type { CompletedSet, WorkoutDraftValues, WorkoutSession } from '../domain/types';

interface WorkoutSessionRow {
  id: string;
  cycle_id: string;
  cycle_week: number;
  workout_id: string;
  program_version_id: string;
  workout_focus: WorkoutSession['workoutFocus'];
  status: WorkoutSession['status'];
  started_at: string;
  completed_at: string | null;
  is_offline: number;
}

interface CompletedSetRow {
  id: string;
  session_id: string;
  workout_exercise_id: string;
  exercise_id: string | null;
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
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT OR IGNORE INTO workout_sessions
        (id, cycle_id, cycle_week, workout_id, program_version_id, workout_focus, status,
         started_at, completed_at, is_offline)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      session.id,
      session.cycleId,
      session.cycleWeek,
      session.workoutId,
      session.programVersionId,
      session.workoutFocus,
      session.status,
      session.startedAt,
      session.completedAt ?? null,
      session.isOffline ? 1 : 0,
    );
    await database.runAsync(
      `INSERT OR IGNORE INTO sync_outbox
        (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?);`,
      `outbox-workout-session-${session.id}`,
      `workout-session:${session.id}`,
      'workout-session',
      session.id,
      JSON.stringify(session),
      session.startedAt,
    );
  });
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
        (id, session_id, workout_exercise_id, exercise_id, set_number, load, reps, duration_seconds,
         distance_meters, rpe, rir, completed_at, idempotency_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      completedSet.id,
      completedSet.sessionId,
      completedSet.workoutExerciseId,
      completedSet.exerciseId ?? null,
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
            exercise_id, distance_meters, rpe, rir, completed_at, idempotency_key
       FROM completed_sets
      WHERE session_id = ?
      ORDER BY workout_exercise_id, set_number;`,
    sessionId,
  );

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    workoutExerciseId: row.workout_exercise_id,
    ...(row.exercise_id ? { exerciseId: row.exercise_id } : {}),
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

export async function getWorkoutSession(
  database: SQLiteDatabase,
  sessionId: string,
): Promise<WorkoutSession | null> {
  const row = await database.getFirstAsync<WorkoutSessionRow>(
    `SELECT id, cycle_id, cycle_week, workout_id, program_version_id, workout_focus, status,
            started_at, completed_at, is_offline
       FROM workout_sessions
      WHERE id = ?
      LIMIT 1;`,
    sessionId,
  );

  return row ? mapWorkoutSession(row) : null;
}

export async function saveWorkoutDraft(
  database: SQLiteDatabase,
  sessionId: string,
  values: WorkoutDraftValues,
  updatedAt: string,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO workout_drafts (session_id, values_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       values_json = excluded.values_json,
       updated_at = excluded.updated_at;`,
    sessionId,
    JSON.stringify(values),
    updatedAt,
  );
}

export async function getWorkoutDraft(
  database: SQLiteDatabase,
  sessionId: string,
): Promise<WorkoutDraftValues | null> {
  const row = await database.getFirstAsync<{ values_json: string }>(
    `SELECT values_json
       FROM workout_drafts
      WHERE session_id = ?
      LIMIT 1;`,
    sessionId,
  );
  if (!row) return null;

  try {
    return JSON.parse(row.values_json) as WorkoutDraftValues;
  } catch {
    return null;
  }
}

export async function deleteWorkoutDraft(
  database: SQLiteDatabase,
  sessionId: string,
): Promise<void> {
  await database.runAsync('DELETE FROM workout_drafts WHERE session_id = ?;', sessionId);
}

/**
 * Corrects a previously completed set without changing its stable identity.
 * The replacement payload overwrites the pending outbox mutation, so a retry
 * cannot create a second set record on the server.
 */
export async function updateCompletedSet(
  database: SQLiteDatabase,
  completedSet: CompletedSet,
): Promise<'updated' | 'missing'> {
  let updated = false;

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      `UPDATE completed_sets
          SET exercise_id = ?, load = ?, reps = ?, duration_seconds = ?, distance_meters = ?,
              rpe = ?, rir = ?, completed_at = ?
        WHERE id = ?;`,
      completedSet.exerciseId ?? null,
      completedSet.load ?? null,
      completedSet.reps ?? null,
      completedSet.durationSeconds ?? null,
      completedSet.distanceMeters ?? null,
      completedSet.rpe ?? null,
      completedSet.rir ?? null,
      completedSet.completedAt,
      completedSet.id,
    );
    if (result.changes === 0) return;

    updated = true;
    await database.runAsync(
      `INSERT INTO sync_outbox
        (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(idempotency_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         last_error = NULL;`,
      `outbox-${completedSet.idempotencyKey}`,
      completedSet.idempotencyKey,
      'completed-set',
      completedSet.id,
      JSON.stringify(completedSet),
      completedSet.completedAt,
    );
  });

  return updated ? 'updated' : 'missing';
}

export async function completeWorkoutSession(
  database: SQLiteDatabase,
  sessionId: string,
  completedAt: string,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      `UPDATE workout_sessions
          SET status = 'complete', completed_at = ?
        WHERE id = ? AND status = 'in-progress';`,
      completedAt,
      sessionId,
    );
    if (result.changes === 0) return;

    const row = await database.getFirstAsync<WorkoutSessionRow>(
      `SELECT id, cycle_id, cycle_week, workout_id, program_version_id, workout_focus, status,
              started_at, completed_at, is_offline
         FROM workout_sessions
        WHERE id = ?
        LIMIT 1;`,
      sessionId,
    );
    if (!row) return;

    await queueCompletedWorkoutSessionSync(database, mapWorkoutSession(row));
  });
}

function mapWorkoutSession(row: WorkoutSessionRow): WorkoutSession {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    cycleWeek: row.cycle_week,
    workoutId: row.workout_id,
    programVersionId: row.program_version_id,
    workoutFocus: row.workout_focus,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    isOffline: row.is_offline === 1,
  };
}

async function queueCompletedWorkoutSessionSync(
  database: SQLiteDatabase,
  session: WorkoutSession,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO sync_outbox
      (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(idempotency_key) DO UPDATE SET
       payload_json = excluded.payload_json,
       last_error = NULL;`,
    `outbox-workout-session-${session.id}`,
    `workout-session:${session.id}`,
    'workout-session',
    session.id,
    JSON.stringify(session),
    session.startedAt,
  );
}
