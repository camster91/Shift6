import type { SQLiteDatabase } from 'expo-sqlite';

import { buildExerciseProgress, type ExerciseProgress } from '../domain/progress';
import type { ProgramVersion } from '../domain/types';
import {
  buildCycleProgressSummary,
  type CycleProgressSummary,
  type CycleReviewSession,
  type SetPerformance,
} from '../domain/progression';
import type { CompletedSet } from '../domain/types';
import { getCompletedSets } from './workoutRepository';

interface WorkoutSessionProgressRow {
  id: string;
  status: 'planned' | 'in-progress' | 'complete' | 'skipped' | 'abandoned';
  started_at: string;
  completed_at: string | null;
  workout_focus: 'strength' | 'cardio' | 'mobility' | 'conditioning' | 'recovery' | 'mixed';
}

interface CompletedSetProgressRow {
  session_id: string;
  exercise_id: string | null;
  workout_exercise_id: string;
  workout_id: string;
  version_json: string | null;
  completed_at: string;
  load: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  rir: number | null;
}

interface WorkoutCheckInProgressRow {
  session_id: string;
  perceived_exertion: number | null;
  discomfort_reported: number;
}

interface ExerciseProgressRow {
  session_id: string;
  exercise_id: string | null;
  workout_exercise_id: string;
  completed_at: string;
  load: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  workout_id: string;
  version_json: string | null;
}

export async function getCycleProgressSummary(
  database: SQLiteDatabase,
  cycleId: string,
  plannedWorkoutCount: number,
): Promise<CycleProgressSummary> {
  const sessions = await getCycleReviewSessions(database, cycleId);
  return buildCycleProgressSummary(plannedWorkoutCount, sessions);
}

export async function getLatestCompletedWorkoutSets(
  database: SQLiteDatabase,
  cycleId: string,
  workoutId: string,
  programVersionId?: string,
): Promise<CompletedSet[]> {
  const row = await database.getFirstAsync<{ id: string }>(
    `SELECT id
       FROM workout_sessions
      WHERE cycle_id = ?
        AND workout_id = ?
        AND status = 'complete'
        AND (? IS NULL OR program_version_id = ?)
      ORDER BY completed_at DESC, id DESC
      LIMIT 1;`,
    cycleId,
    workoutId,
    programVersionId ?? null,
    programVersionId ?? null,
  );
  return row ? getCompletedSets(database, row.id) : [];
}

export async function getCompletedWorkoutIds(
  database: SQLiteDatabase,
  cycleId: string,
  cycleWeek: number,
): Promise<ReadonlySet<string>> {
  const rows = await database.getAllAsync<{ workout_id: string }>(
    `SELECT workout_id
       FROM workout_sessions
      WHERE cycle_id = ? AND cycle_week = ? AND status = 'complete'
      ORDER BY completed_at ASC, id ASC;`,
    cycleId,
    cycleWeek,
  );

  return new Set(rows.map((row) => row.workout_id));
}

export async function getExerciseProgress(
  database: SQLiteDatabase,
  cycleId: string,
  exerciseId: string,
): Promise<ExerciseProgress> {
  const rows = await database.getAllAsync<ExerciseProgressRow>(
    `SELECT completed_sets.session_id, completed_sets.exercise_id,
            completed_sets.workout_exercise_id, completed_sets.completed_at,
            completed_sets.load, completed_sets.reps, completed_sets.duration_seconds,
            completed_sets.distance_meters, workout_sessions.workout_id,
            user_program_versions.version_json
       FROM completed_sets
       INNER JOIN workout_sessions
         ON workout_sessions.id = completed_sets.session_id
       LEFT JOIN user_program_versions
         ON user_program_versions.id = workout_sessions.program_version_id
      WHERE workout_sessions.cycle_id = ?
        AND workout_sessions.status = 'complete'
      ORDER BY completed_sets.completed_at ASC, completed_sets.id ASC;`,
    cycleId,
  );

  return buildExerciseProgress(
    exerciseId,
    rows.flatMap((row) => {
      const resolvedExerciseId = row.exercise_id ?? resolveLegacyExerciseId(row);
      if (!resolvedExerciseId) return [];

      return [
        {
          sessionId: row.session_id,
          exerciseId: resolvedExerciseId,
          completedAt: row.completed_at,
          load: row.load ?? undefined,
          reps: row.reps ?? undefined,
          durationSeconds: row.duration_seconds ?? undefined,
          distanceMeters: row.distance_meters ?? undefined,
        },
      ];
    }),
  );
}

function resolveLegacyExerciseId(row: ExerciseProgressRow): string | undefined {
  if (!row.version_json) return undefined;

  try {
    const version = JSON.parse(row.version_json) as ProgramVersion;
    const workout = version.workouts.find((candidate) => candidate.id === row.workout_id);
    return workout?.exercises.find((candidate) => candidate.id === row.workout_exercise_id)
      ?.exerciseId;
  } catch {
    return undefined;
  }
}

async function getCycleReviewSessions(
  database: SQLiteDatabase,
  cycleId: string,
): Promise<CycleReviewSession[]> {
  const sessionRows = await database.getAllAsync<WorkoutSessionProgressRow>(
    `SELECT id, status, started_at, completed_at, workout_focus
       FROM workout_sessions
      WHERE cycle_id = ?
      ORDER BY started_at ASC;`,
    cycleId,
  );
  const setRows = await database.getAllAsync<CompletedSetProgressRow>(
    `SELECT completed_sets.session_id, completed_sets.exercise_id,
            completed_sets.workout_exercise_id, completed_sets.load, completed_sets.reps,
            completed_sets.duration_seconds, completed_sets.distance_meters,
            completed_sets.rpe, completed_sets.rir, completed_sets.completed_at,
            workout_sessions.workout_id,
            user_program_versions.version_json
       FROM completed_sets
       INNER JOIN workout_sessions
         ON workout_sessions.id = completed_sets.session_id
       LEFT JOIN user_program_versions
         ON user_program_versions.id = workout_sessions.program_version_id
      WHERE workout_sessions.cycle_id = ?
      ORDER BY completed_sets.session_id, completed_sets.set_number;`,
    cycleId,
  );
  const checkInRows = await database.getAllAsync<WorkoutCheckInProgressRow>(
    `SELECT workout_check_ins.session_id, workout_check_ins.perceived_exertion,
            workout_check_ins.discomfort_reported
       FROM workout_check_ins
       INNER JOIN workout_sessions
         ON workout_sessions.id = workout_check_ins.session_id
      WHERE workout_sessions.cycle_id = ?;`,
    cycleId,
  );

  const setsBySession = new Map<string, SetPerformance[]>();
  for (const row of setRows) {
    const sessionSets = setsBySession.get(row.session_id) ?? [];
    sessionSets.push({
      completed: true,
      load: row.load ?? undefined,
      reps: row.reps ?? undefined,
      durationSeconds: row.duration_seconds ?? undefined,
      distanceMeters: row.distance_meters ?? undefined,
      rpe: row.rpe ?? undefined,
      rir: row.rir ?? undefined,
    });
    setsBySession.set(row.session_id, sessionSets);
  }

  const checkInsBySession = new Map(checkInRows.map((row) => [row.session_id, row]));
  const personalRecordsBySession = buildCyclePersonalRecords(
    setRows,
    new Set(sessionRows.filter((row) => row.status === 'complete').map((row) => row.id)),
  );

  return sessionRows.map((row) => {
    const sets = setsBySession.get(row.id) ?? [];
    const checkIn = checkInsBySession.get(row.id);
    const cardioMinutes =
      row.workout_focus === 'cardio'
        ? sets.reduce((total, set) => total + (set.durationSeconds ?? 0), 0) / 60
        : 0;

    return {
      completed: row.status === 'complete',
      durationMinutes: getDurationMinutes(row.started_at, row.completed_at),
      cardioMinutes,
      effort: asReportedEffort(checkIn?.perceived_exertion),
      discomfortFlag: checkIn?.discomfort_reported === 1,
      personalRecordIds: personalRecordsBySession.get(row.id) ?? [],
      sets,
    };
  });
}

function buildCyclePersonalRecords(
  rows: readonly CompletedSetProgressRow[],
  completedSessionIds: ReadonlySet<string>,
): Map<string, string[]> {
  const setsByExercise = new Map<
    string,
    Array<{
      sessionId: string;
      exerciseId: string;
      completedAt: string;
      load?: number;
      reps?: number;
      durationSeconds?: number;
      distanceMeters?: number;
    }>
  >();

  for (const row of rows) {
    if (!completedSessionIds.has(row.session_id)) continue;
    const exerciseId = row.exercise_id ?? resolveLegacyExerciseId(row);
    if (!exerciseId) continue;

    const exerciseSets = setsByExercise.get(exerciseId) ?? [];
    exerciseSets.push({
      sessionId: row.session_id,
      exerciseId,
      completedAt: row.completed_at ?? new Date(0).toISOString(),
      load: row.load ?? undefined,
      reps: row.reps ?? undefined,
      durationSeconds: row.duration_seconds ?? undefined,
      distanceMeters: row.distance_meters ?? undefined,
    });
    setsByExercise.set(exerciseId, exerciseSets);
  }

  const recordsBySession = new Map<string, string[]>();
  for (const [exerciseId, sets] of setsByExercise) {
    const records = buildExerciseProgress(exerciseId, sets).personalRecords;
    for (const record of records) {
      const sessionRecords = recordsBySession.get(record.sessionId) ?? [];
      sessionRecords.push(record.id);
      recordsBySession.set(record.sessionId, sessionRecords);
    }
  }

  return recordsBySession;
}

function getDurationMinutes(startedAt: string, completedAt: string | null): number | undefined {
  if (!completedAt) return undefined;

  const durationMilliseconds = Date.parse(completedAt) - Date.parse(startedAt);
  return Number.isFinite(durationMilliseconds) && durationMilliseconds >= 0
    ? durationMilliseconds / 60_000
    : undefined;
}

function asReportedEffort(value: number | null | undefined): number | undefined {
  return value !== null && value !== undefined && value >= 1 && value <= 5 ? value : undefined;
}
