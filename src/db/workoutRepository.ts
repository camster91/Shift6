import { stableSnapshotJSON } from '../domain/programPersistence';
import {
  writeSetLoadProvenance,
  assertOwnedLoadSession,
  splitDraftLoadUnits,
} from './loadProvenanceRepository';
import type { LoadUnit } from '../domain/loadUnits';
import { SYNC_MUTATION_INSERT_SQL } from './syncOutbox';
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
  load_unit?: LoadUnit | null;
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
    const inserted = await database.runAsync(
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
    if (inserted.changes === 0) return;
    await database.runAsync(
      SYNC_MUTATION_INSERT_SQL,
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
  ownerId: string,
): Promise<'inserted' | 'duplicate'> {
  let inserted = false;

  await database.withExclusiveTransactionAsync(async (database) => {
    await assertOwnedLoadSession(database, completedSet.sessionId, ownerId);
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

    if (result.changes === 0) {
      const existing = (await getCompletedSets(database, completedSet.sessionId)).find(
        (saved) =>
          saved.id === completedSet.id && saved.idempotencyKey === completedSet.idempotencyKey,
      );
      if (
        !existing ||
        [
          'load',
          'loadUnit',
          'reps',
          'durationSeconds',
          'distanceMeters',
          'rpe',
          'rir',
          'workoutExerciseId',
          'setNumber',
          'exerciseId',
        ].some(
          (field) =>
            existing[field as keyof CompletedSet] !== completedSet[field as keyof CompletedSet],
        )
      )
        throw new Error(
          'This saved set has different actual values. Reload and edit it explicitly.',
        );
      return;
    }
    inserted = true;
    await writeSetLoadProvenance(database, completedSet, ownerId);

    await database.runAsync(
      SYNC_MUTATION_INSERT_SQL,
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
    `SELECT s.*, p.load_unit FROM completed_sets s LEFT JOIN completed_set_load_provenance p ON p.completed_set_id=s.id AND p.session_id=s.session_id AND p.load_value=s.load AND p.set_completed_at=s.completed_at
      WHERE s.session_id=? ORDER BY s.workout_exercise_id,s.set_number;`,
    sessionId,
  );

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    workoutExerciseId: row.workout_exercise_id,
    ...(row.exercise_id ? { exerciseId: row.exercise_id } : {}),
    setNumber: row.set_number,
    load: row.load ?? undefined,
    ...(row.load_unit ? { loadUnit: row.load_unit } : {}),
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
 * Persists a bounded user note on an unfinished session and queues an
 * immutable sync snapshot. Notes never enter analytics; they remain part of
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

const draftWriteQueues = new WeakMap<SQLiteDatabase, Map<string, Promise<void>>>();

export function saveWorkoutDraft(
  database: SQLiteDatabase,
  sessionId: string,
  values: WorkoutDraftValues,
  updatedAt: string,
  ownerId: string,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const captured = JSON.parse(stableSnapshotJSON(values)) as WorkoutDraftValues;
  const { plain, units } = splitDraftLoadUnits(captured);
  if (!Number.isFinite(Date.parse(updatedAt)))
    return Promise.reject(new Error('A valid draft save time is required.'));
  let queues = draftWriteQueues.get(database);
  if (!queues) {
    queues = new Map();
    draftWriteQueues.set(database, queues);
  }
  const queue = queues;
  const previous = queue.get(sessionId) ?? Promise.resolve();
  const write = previous
    .catch(() => undefined)
    .then(async () => {
      await database.withExclusiveTransactionAsync(async (tx) => {
        const assertCurrent = () => {
          if (!isCurrent())
            throw new Error('The workout context changed. The unfinished input was not replaced.');
        };
        assertCurrent();
        const owner = await assertOwnedLoadSession(tx, sessionId, ownerId);
        const existing = await tx.getFirstAsync<{
          values_json: string;
          updated_at: string;
          load_units_json: string | null;
        }>(
          `SELECT d.values_json,d.updated_at,u.load_units_json FROM workout_drafts d LEFT JOIN workout_draft_load_units u ON u.session_id=d.session_id AND u.updated_at=d.updated_at WHERE d.session_id=?;`,
          sessionId,
        );
        assertCurrent();
        if (existing) {
          if (Date.parse(existing.updated_at) > Date.parse(updatedAt))
            throw new Error(
              'A newer unfinished workout is already saved. Reload before replacing it.',
            );
          if (Date.parse(existing.updated_at) === Date.parse(updatedAt)) {
            if (
              stableSnapshotJSON(JSON.parse(existing.values_json)) === stableSnapshotJSON(plain) &&
              stableSnapshotJSON(JSON.parse(existing.load_units_json ?? '{}')) ===
                stableSnapshotJSON(units)
            )
              return;
            throw new Error(
              'The unfinished workout changed at this save time. Reload before replacing it.',
            );
          }
        }
        const result = await tx.runAsync(
          `INSERT INTO workout_drafts (session_id, values_json, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(session_id) DO UPDATE SET values_json=excluded.values_json,updated_at=excluded.updated_at
         WHERE workout_drafts.updated_at=?;`,
          sessionId,
          JSON.stringify(plain),
          updatedAt,
          existing?.updated_at ?? null,
        );
        assertCurrent();
        if (result.changes !== 1)
          throw new Error(
            'The unfinished workout changed during saving. Reload before replacing it.',
          );
        await tx.runAsync(
          'INSERT INTO workout_draft_load_units (session_id,user_id,load_units_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET user_id=excluded.user_id,load_units_json=excluded.load_units_json,updated_at=excluded.updated_at;',
          sessionId,
          owner,
          JSON.stringify(units),
          updatedAt,
        );
        assertCurrent();
      });
    });
  queue.set(sessionId, write);
  void write
    .finally(() => {
      if (queue.get(sessionId) === write) queue.delete(sessionId);
    })
    .catch(() => undefined);
  return write;
}

export async function getWorkoutDraft(
  database: SQLiteDatabase,
  sessionId: string,
): Promise<WorkoutDraftValues | null> {
  const row = await database.getFirstAsync<{ values_json: string; load_units_json: string | null }>(
    `SELECT d.values_json,u.load_units_json FROM workout_drafts d LEFT JOIN workout_draft_load_units u ON u.session_id=d.session_id AND u.updated_at=d.updated_at
      WHERE d.session_id = ?
      LIMIT 1;`,
    sessionId,
  );
  if (!row) return null;

  try {
    const values = JSON.parse(row.values_json) as WorkoutDraftValues;
    const units = row.load_units_json ? JSON.parse(row.load_units_json) : {};
    return Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        { ...value, loadUnit: units[key] ?? (value.load.trim() ? 'unknown' : undefined) },
      ]),
    );
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
 * Corrects a previously completed set without changing its stable identity or occurrence time.
 * Each correction queues a new immutable operation for the same set entity,
 * so an earlier in-flight acknowledgement cannot erase the correction.
 */
export async function updateCompletedSet(
  database: SQLiteDatabase,
  completedSet: CompletedSet,
  ownerId: string,
  expectedSaved: CompletedSet,
  isCurrent: () => boolean = () => true,
): Promise<'updated' | 'missing'> {
  const expected = JSON.parse(stableSnapshotJSON(expectedSaved)) as CompletedSet;
  const correction = JSON.parse(stableSnapshotJSON(completedSet)) as CompletedSet;
  // An edit records new measurements, not a new performance on the edit date.
  correction.completedAt = expected.completedAt;
  const recordedAt = new Date().toISOString();
  const identity = ['id', 'sessionId', 'workoutExerciseId', 'setNumber', 'idempotencyKey'] as const;
  if (identity.some((field) => expected[field] !== correction[field]))
    throw new Error('The set correction must identify the original saved set.');
  let updated = false;
  await database.withExclusiveTransactionAsync(async (tx) => {
    const assertCurrent = () => {
      if (!isCurrent())
        throw new Error('The workout context changed. Reload before saving this correction.');
    };
    assertCurrent();
    await assertOwnedLoadSession(tx, correction.sessionId, ownerId);
    const existing = (await getCompletedSets(tx, correction.sessionId)).find(
      (set) => set.id === correction.id,
    );
    assertCurrent();
    if (!existing) return;
    if (stableSnapshotJSON(existing) !== stableSnapshotJSON(expected))
      throw new Error(
        'This saved set changed. Reload and review its actual values and units before editing.',
      );
    const result = await tx.runAsync(
      `UPDATE completed_sets SET exercise_id=?,load=?,reps=?,duration_seconds=?,distance_meters=?,rpe=?,rir=?,completed_at=?
       WHERE id=? AND session_id=? AND workout_exercise_id=? AND set_number=? AND idempotency_key=? AND completed_at=?
       AND load IS ? AND reps IS ? AND duration_seconds IS ? AND distance_meters IS ? AND rpe IS ? AND rir IS ? AND exercise_id IS ?;`,
      correction.exerciseId ?? null,
      correction.load ?? null,
      correction.reps ?? null,
      correction.durationSeconds ?? null,
      correction.distanceMeters ?? null,
      correction.rpe ?? null,
      correction.rir ?? null,
      correction.completedAt,
      expected.id,
      expected.sessionId,
      expected.workoutExerciseId,
      expected.setNumber,
      expected.idempotencyKey,
      expected.completedAt,
      expected.load ?? null,
      expected.reps ?? null,
      expected.durationSeconds ?? null,
      expected.distanceMeters ?? null,
      expected.rpe ?? null,
      expected.rir ?? null,
      expected.exerciseId ?? null,
    );
    if (result.changes !== 1)
      throw new Error('This saved set changed during the correction. Reload before editing.');
    assertCurrent();
    await writeSetLoadProvenance(tx, correction, ownerId, recordedAt);
    const saved = (await getCompletedSets(tx, correction.sessionId)).find(
      (set) => set.id === correction.id,
    );
    assertCurrent();
    // No numeric load means no unit provenance, even if a stale caller carries a unit field.
    const confirmed = {
      ...correction,
      loadUnit: correction.load === undefined ? undefined : correction.loadUnit,
    };
    if (stableSnapshotJSON(saved) !== stableSnapshotJSON(confirmed))
      throw new Error('The corrected set could not be confirmed locally.');
    await tx.runAsync(
      SYNC_MUTATION_INSERT_SQL,
      `outbox-${correction.idempotencyKey}`,
      correction.idempotencyKey,
      'completed-set',
      correction.id,
      JSON.stringify(confirmed),
      recordedAt,
    );
    assertCurrent();
    updated = true;
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
    SYNC_MUTATION_INSERT_SQL,
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
    SYNC_MUTATION_INSERT_SQL,
    `outbox-training-cycle-${cycle.id}`,
    `training-cycle:${cycle.id}`,
    'training-cycle',
    cycle.id,
    JSON.stringify(cycle),
    cycle.startedAt,
  );
}
