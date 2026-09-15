import type { SQLiteDatabase } from 'expo-sqlite';

import { advanceCycleAfterCompletedWorkout } from '../domain/cycle';
import type {
  CompletedSet,
  Program,
  ProgramVersion,
  TrainingCycle,
  WorkoutDraftValues,
  WorkoutSession,
} from '../domain/types';
import {
  getCompletedRequiredWorkoutCount,
  saveTrainingCycleInTransaction,
} from './cycleRepository';
import { saveProgramVersionInTransaction } from './programRepository';

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
  completion_reason: WorkoutSession['completionReason'] | null;
  is_offline: number;
  readiness: WorkoutSession['readiness'] | null;
  note: string | null;
}

interface TrainingCycleRow {
  id: string;
  user_id: string;
  program_version_id: string;
  status: TrainingCycle['status'];
  current_week: number;
  started_at: string;
  weeks_json: string;
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
         started_at, completed_at, completion_reason, is_offline, readiness, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      session.id,
      session.cycleId,
      session.cycleWeek,
      session.workoutId,
      session.programVersionId,
      session.workoutFocus,
      session.status,
      session.startedAt,
      session.completedAt ?? null,
      session.completionReason ?? null,
      session.isOffline ? 1 : 0,
      session.readiness ?? null,
      session.note ?? null,
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
            started_at, completed_at, completion_reason, is_offline, readiness, note
       FROM workout_sessions
      WHERE id = ?
      LIMIT 1;`,
    sessionId,
  );

  return row ? mapWorkoutSession(row) : null;
}

export async function getInProgressWorkoutSession(
  database: SQLiteDatabase,
  cycleId: string,
  cycleWeek: number,
  workoutId: string,
): Promise<WorkoutSession | null> {
  const row = await database.getFirstAsync<WorkoutSessionRow>(
    `SELECT id, cycle_id, cycle_week, workout_id, program_version_id, workout_focus, status,
            started_at, completed_at, completion_reason, is_offline, readiness, note
       FROM workout_sessions
      WHERE cycle_id = ?
        AND cycle_week = ?
        AND workout_id = ?
        AND status = 'in-progress'
      ORDER BY started_at DESC, id DESC
      LIMIT 1;`,
    cycleId,
    cycleWeek,
    workoutId,
  );

  return row ? mapWorkoutSession(row) : null;
}

export async function updateWorkoutSessionProgramVersion(
  database: SQLiteDatabase,
  sessionId: string,
  programVersionId: string,
): Promise<WorkoutSession | null> {
  let updatedSession: WorkoutSession | null = null;

  await database.withTransactionAsync(async () => {
    updatedSession = await updateWorkoutSessionProgramVersionInTransaction(
      database,
      sessionId,
      programVersionId,
    );
  });

  return updatedSession;
}

export async function updateWorkoutSessionProgramVersionInTransaction(
  database: SQLiteDatabase,
  sessionId: string,
  programVersionId: string,
): Promise<WorkoutSession | null> {
  const result = await database.runAsync(
    `UPDATE workout_sessions
        SET program_version_id = ?
      WHERE id = ? AND status = 'in-progress';`,
    programVersionId,
    sessionId,
  );
  if (result.changes === 0) return null;

  const row = await database.getFirstAsync<WorkoutSessionRow>(
    `SELECT id, cycle_id, cycle_week, workout_id, program_version_id, workout_focus, status,
            started_at, completed_at, completion_reason, is_offline, readiness, note
       FROM workout_sessions
      WHERE id = ?
      LIMIT 1;`,
    sessionId,
  );
  if (!row) return null;

  const updatedSession = mapWorkoutSession(row);
  await queueWorkoutSessionSync(database, updatedSession);
  return updatedSession;
}

/**
 * Commits an active-session program revision and all local pointers together.
 * Completed sets remain keyed to their stable session/exercise/set IDs.
 */
export async function saveActiveWorkoutRevision(
  database: SQLiteDatabase,
  userId: string,
  program: Program,
  version: ProgramVersion,
  cycle: TrainingCycle,
  sessionId: string,
): Promise<WorkoutSession | null> {
  let updatedSession: WorkoutSession | null = null;

  await database.withTransactionAsync(async () => {
    await saveProgramVersionInTransaction(database, userId, program, version);
    await saveTrainingCycleInTransaction(database, cycle);
    updatedSession = await updateWorkoutSessionProgramVersionInTransaction(
      database,
      sessionId,
      version.id,
    );
  });

  return updatedSession;
}

export async function updateWorkoutSessionReadiness(
  database: SQLiteDatabase,
  sessionId: string,
  readiness: WorkoutSession['readiness'],
): Promise<WorkoutSession | null> {
  let updatedSession: WorkoutSession | null = null;

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      `UPDATE workout_sessions
          SET readiness = ?
        WHERE id = ? AND status = 'in-progress';`,
      readiness ?? null,
      sessionId,
    );
    if (result.changes === 0) return;

    const row = await database.getFirstAsync<WorkoutSessionRow>(
      `SELECT id, cycle_id, cycle_week, workout_id, program_version_id, workout_focus, status,
              started_at, completed_at, completion_reason, is_offline, readiness, note
         FROM workout_sessions
        WHERE id = ?
        LIMIT 1;`,
      sessionId,
    );
    if (!row) return;

    updatedSession = mapWorkoutSession(row);
    await queueWorkoutSessionSync(database, updatedSession);
  });

  return updatedSession;
}

/**
 * Persists a bounded user note on an unfinished session and replaces its
 * idempotent sync payload. Notes never enter analytics; they remain part of
 * the user-owned workout record and local export/delete boundary.
 */
export async function updateWorkoutSessionNote(
  database: SQLiteDatabase,
  sessionId: string,
  note: string,
): Promise<WorkoutSession | null> {
  const normalizedNote = note.trim();
  if (normalizedNote.length > 500) {
    throw new Error('Workout notes must be 500 characters or fewer.');
  }

  let updatedSession: WorkoutSession | null = null;

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      `UPDATE workout_sessions
          SET note = ?
        WHERE id = ? AND status = 'in-progress';`,
      normalizedNote || null,
      sessionId,
    );
    if (result.changes === 0) return;

    const row = await database.getFirstAsync<WorkoutSessionRow>(
      `SELECT id, cycle_id, cycle_week, workout_id, program_version_id, workout_focus, status,
              started_at, completed_at, completion_reason, is_offline, readiness, note
         FROM workout_sessions
        WHERE id = ?
        LIMIT 1;`,
      sessionId,
    );
    if (!row) return;

    updatedSession = mapWorkoutSession(row);
    await queueWorkoutSessionSync(database, updatedSession);
  });

  return updatedSession;
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
              started_at, completed_at, completion_reason, is_offline, readiness, note
         FROM workout_sessions
        WHERE id = ?
        LIMIT 1;`,
      sessionId,
    );
    if (!row) return;

    await queueCompletedWorkoutSessionSync(database, mapWorkoutSession(row));
  });
}

/**
 * Ends an in-progress workout after the user has explicitly chosen to stop
 * early. Partial sessions remain in the local record and sync outbox, but do
 * not count as completed workouts and never advance the active cycle week.
 */
export async function finishWorkoutSessionPartially(
  database: SQLiteDatabase,
  sessionId: string,
  completedAt: string,
  completionReason: Exclude<NonNullable<WorkoutSession['completionReason']>, 'all-targets'>,
): Promise<WorkoutSession | null> {
  return finishWorkoutSessionEarly(database, sessionId, completedAt, 'partial', completionReason);
}

/**
 * Ends an in-progress workout as skipped when the user has not logged a set.
 * The reason is retained for review context, but skipped sessions never
 * advance the cycle or count toward required adherence.
 */
export async function finishWorkoutSessionSkipped(
  database: SQLiteDatabase,
  sessionId: string,
  completedAt: string,
  completionReason: Exclude<NonNullable<WorkoutSession['completionReason']>, 'all-targets'>,
): Promise<WorkoutSession | null> {
  return finishWorkoutSessionEarly(database, sessionId, completedAt, 'skipped', completionReason);
}

async function finishWorkoutSessionEarly(
  database: SQLiteDatabase,
  sessionId: string,
  completedAt: string,
  status: Extract<WorkoutSession['status'], 'partial' | 'skipped'>,
  completionReason: Exclude<NonNullable<WorkoutSession['completionReason']>, 'all-targets'>,
): Promise<WorkoutSession | null> {
  let finishedSession: WorkoutSession | null = null;

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      `UPDATE workout_sessions
          SET status = ?, completed_at = ?, completion_reason = ?
        WHERE id = ? AND status = 'in-progress';`,
      status,
      completedAt,
      completionReason,
      sessionId,
    );
    if (result.changes === 0) return;

    const row = await database.getFirstAsync<WorkoutSessionRow>(
      `SELECT id, cycle_id, cycle_week, workout_id, program_version_id, workout_focus, status,
              started_at, completed_at, completion_reason, is_offline, readiness, note
         FROM workout_sessions
        WHERE id = ?
        LIMIT 1;`,
      sessionId,
    );
    if (!row) throw new Error('Early-ended workout could not be reloaded locally.');

    finishedSession = mapWorkoutSession(row);
    await queueWorkoutSessionSync(database, finishedSession);
    await database.runAsync('DELETE FROM workout_drafts WHERE session_id = ?;', sessionId);
  });

  return finishedSession;
}

/**
 * Completes a workout, advances its cycle when the persisted week is complete,
 * queues both sync mutations, and removes the draft in one SQLite transaction.
 * Keeping these writes together prevents a crash between workout completion and
 * cycle advancement from leaving the user on a stale week.
 */
export async function completeWorkoutSessionAndAdvanceCycle(
  database: SQLiteDatabase,
  sessionId: string,
  completedAt: string,
): Promise<TrainingCycle | null> {
  let updatedCycle: TrainingCycle | null = null;

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      `UPDATE workout_sessions
          SET status = 'complete', completed_at = ?
        WHERE id = ? AND status = 'in-progress';`,
      completedAt,
      sessionId,
    );
    if (result.changes === 0) return;

    const sessionRow = await database.getFirstAsync<WorkoutSessionRow>(
      `SELECT id, cycle_id, cycle_week, workout_id, program_version_id, workout_focus, status,
              started_at, completed_at, completion_reason, is_offline, readiness, note
         FROM workout_sessions
        WHERE id = ?
        LIMIT 1;`,
      sessionId,
    );
    if (!sessionRow) throw new Error('Completed workout could not be reloaded locally.');

    const session = mapWorkoutSession(sessionRow);
    await queueCompletedWorkoutSessionSync(database, session);

    const cycleRow = await database.getFirstAsync<TrainingCycleRow>(
      `SELECT id, user_id, program_version_id, status, current_week, started_at, weeks_json
         FROM training_cycles
        WHERE id = ?
        LIMIT 1;`,
      session.cycleId,
    );
    if (cycleRow) {
      const cycle = mapTrainingCycle(cycleRow);
      if (cycle.currentWeek === session.cycleWeek) {
        const completedWorkoutCount = await getCompletedRequiredWorkoutCount(
          database,
          session.cycleId,
          session.cycleWeek,
          cycle.programVersionId,
        );
        updatedCycle = advanceCycleAfterCompletedWorkout(cycle, completedWorkoutCount);
        await database.runAsync(
          `UPDATE training_cycles
              SET status = ?, current_week = ?, weeks_json = ?
            WHERE id = ?;`,
          updatedCycle.status,
          updatedCycle.currentWeek,
          JSON.stringify(updatedCycle.weeks),
          updatedCycle.id,
        );
        await queueTrainingCycleSync(database, updatedCycle);
      } else {
        updatedCycle = cycle;
      }
    }

    await database.runAsync('DELETE FROM workout_drafts WHERE session_id = ?;', sessionId);
  });

  return updatedCycle;
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
    completionReason: row.completion_reason ?? undefined,
    isOffline: row.is_offline === 1,
    readiness: row.readiness ?? undefined,
    note: row.note ?? undefined,
  };
}

function mapTrainingCycle(row: TrainingCycleRow): TrainingCycle {
  return {
    id: row.id,
    userId: row.user_id,
    programVersionId: row.program_version_id,
    status: row.status,
    currentWeek: row.current_week,
    startedAt: row.started_at,
    weeks: JSON.parse(row.weeks_json) as TrainingCycle['weeks'],
  };
}

async function queueCompletedWorkoutSessionSync(
  database: SQLiteDatabase,
  session: WorkoutSession,
): Promise<void> {
  await queueWorkoutSessionSync(database, session);
}

async function queueWorkoutSessionSync(
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

async function queueTrainingCycleSync(
  database: SQLiteDatabase,
  cycle: TrainingCycle,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO sync_outbox
      (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(idempotency_key) DO UPDATE SET
       payload_json = excluded.payload_json,
       created_at = excluded.created_at,
       last_error = NULL;`,
    `outbox-training-cycle-${cycle.id}`,
    `training-cycle:${cycle.id}`,
    'training-cycle',
    cycle.id,
    JSON.stringify(cycle),
    cycle.startedAt,
  );
}
