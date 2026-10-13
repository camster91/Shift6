import type { SQLiteDatabase } from 'expo-sqlite';

import {
  buildWorkoutHistoryEntry,
  sortWorkoutHistory,
  type WorkoutHistoryEntry,
} from '../domain/history';
import type { ProgramVersion, WorkoutSession } from '../domain/types';

interface WorkoutHistoryRow {
  id: string;
  cycle_id: string;
  cycle_week: number;
  workout_id: string;
  program_version_id: string;
  workout_focus: WorkoutSession['workoutFocus'];
  status: WorkoutSession['status'];
  started_at: string;
  completed_at: string | null;
  completion_reason: string | null;
  is_offline: number;
  version_json: string | null;
  completed_set_count: number;
  total_volume: number;
  unknown_load_count?: number;
  total_duration_seconds: number;
  total_distance_meters: number;
}

export async function getWorkoutHistory(
  database: SQLiteDatabase,
  userId: string,
  limit = 100,
): Promise<WorkoutHistoryEntry[]> {
  const boundedLimit = Math.min(200, Math.max(1, Math.trunc(limit)));
  const rows = await database.getAllAsync<WorkoutHistoryRow>(
    `SELECT workout_sessions.id, workout_sessions.cycle_id, workout_sessions.cycle_week,
            workout_sessions.workout_id, workout_sessions.program_version_id,
            workout_sessions.workout_focus, workout_sessions.status,
            workout_sessions.started_at, workout_sessions.completed_at,
            workout_sessions.completion_reason, workout_sessions.is_offline,
            user_program_versions.version_json,
            COALESCE(session_totals.completed_set_count, 0) AS completed_set_count,
            COALESCE(session_totals.total_volume, 0) AS total_volume,
            COALESCE(session_totals.unknown_load_count,0) AS unknown_load_count,
            COALESCE(session_totals.total_duration_seconds, 0) AS total_duration_seconds,
            COALESCE(session_totals.total_distance_meters, 0) AS total_distance_meters
       FROM workout_sessions
       INNER JOIN training_cycles
         ON training_cycles.id = workout_sessions.cycle_id
       LEFT JOIN user_program_versions
         ON user_program_versions.id = workout_sessions.program_version_id
       LEFT JOIN (
         SELECT s.session_id,
                COUNT(*) AS completed_set_count,
                SUM(CASE WHEN s.load IS NOT NULL AND reps IS NOT NULL AND p.load_unit IN ('kg','lb') THEN s.load*reps*(CASE WHEN p.load_unit='lb' THEN 0.45359237 ELSE 1 END) ELSE 0 END) AS total_volume,
                SUM(CASE WHEN s.load IS NOT NULL AND p.load_unit IS NULL THEN 1 ELSE 0 END) AS unknown_load_count,
                SUM(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds ELSE 0 END) AS total_duration_seconds,
                SUM(CASE WHEN distance_meters IS NOT NULL THEN distance_meters ELSE 0 END) AS total_distance_meters
           FROM completed_sets s LEFT JOIN completed_set_load_provenance p ON p.completed_set_id=s.id AND p.session_id=s.session_id AND p.load_value=s.load AND p.set_completed_at=s.completed_at
          GROUP BY s.session_id
       ) AS session_totals
         ON session_totals.session_id = workout_sessions.id
      WHERE training_cycles.user_id = ?
      ORDER BY COALESCE(workout_sessions.completed_at, workout_sessions.started_at) DESC,
               workout_sessions.id DESC
      LIMIT ?;`,
    userId,
    boundedLimit,
  );

  return sortWorkoutHistory(rows.map(mapWorkoutHistoryRow));
}

function mapWorkoutHistoryRow(row: WorkoutHistoryRow): WorkoutHistoryEntry {
  return buildWorkoutHistoryEntry({
    id: row.id,
    cycleId: row.cycle_id,
    cycleWeek: row.cycle_week,
    workoutId: row.workout_id,
    title: workoutTitle(row.version_json, row.workout_id),
    focus: row.workout_focus,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    completionReason: row.completion_reason,
    isOffline: row.is_offline === 1,
    completedSetCount: row.completed_set_count,
    totalVolume: row.total_volume,
    unknownLoadSetCount: row.unknown_load_count ?? 0,
    totalDurationSeconds: row.total_duration_seconds,
    totalDistanceMeters: row.total_distance_meters,
  });
}

function workoutTitle(versionJson: string | null, workoutId: string): string | undefined {
  if (!versionJson) return undefined;

  try {
    const version = JSON.parse(versionJson) as ProgramVersion;
    return version.workouts.find((workout) => workout.id === workoutId)?.title;
  } catch {
    return undefined;
  }
}
