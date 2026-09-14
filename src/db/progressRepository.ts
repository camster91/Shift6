import type { SQLiteDatabase } from 'expo-sqlite';

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
  load: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  rir: number | null;
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
): Promise<CompletedSet[]> {
  const row = await database.getFirstAsync<{ id: string }>(
    `SELECT id
       FROM workout_sessions
      WHERE cycle_id = ? AND workout_id = ? AND status = 'complete'
      ORDER BY completed_at DESC, id DESC
      LIMIT 1;`,
    cycleId,
    workoutId,
  );
  return row ? getCompletedSets(database, row.id) : [];
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
    `SELECT completed_sets.session_id, completed_sets.load, completed_sets.reps,
            completed_sets.duration_seconds, completed_sets.distance_meters,
            completed_sets.rpe, completed_sets.rir
       FROM completed_sets
       INNER JOIN workout_sessions
         ON workout_sessions.id = completed_sets.session_id
      WHERE workout_sessions.cycle_id = ?
      ORDER BY completed_sets.session_id, completed_sets.set_number;`,
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

  return sessionRows.map((row) => {
    const sets = setsBySession.get(row.id) ?? [];
    const cardioMinutes =
      row.workout_focus === 'cardio'
        ? sets.reduce((total, set) => total + (set.durationSeconds ?? 0), 0) / 60
        : 0;

    return {
      completed: row.status === 'complete',
      durationMinutes: getDurationMinutes(row.started_at, row.completed_at),
      cardioMinutes,
      sets,
    };
  });
}

function getDurationMinutes(startedAt: string, completedAt: string | null): number | undefined {
  if (!completedAt) return undefined;

  const durationMilliseconds = Date.parse(completedAt) - Date.parse(startedAt);
  return Number.isFinite(durationMilliseconds) && durationMilliseconds >= 0
    ? durationMilliseconds / 60_000
    : undefined;
}
