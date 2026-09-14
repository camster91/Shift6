import type { SQLiteDatabase } from 'expo-sqlite';

import { advanceCycleAfterCompletedWorkout } from '../domain/cycle';
import type { ProgramVersion, TrainingCycle } from '../domain/types';

interface TrainingCycleRow {
  id: string;
  user_id: string;
  program_version_id: string;
  status: TrainingCycle['status'];
  current_week: number;
  started_at: string;
  weeks_json: string;
}

export async function saveTrainingCycle(
  database: SQLiteDatabase,
  cycle: TrainingCycle,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `UPDATE training_cycles
          SET status = 'paused'
        WHERE user_id = ? AND status = 'active' AND id != ?;`,
      cycle.userId,
      cycle.id,
    );
    await database.runAsync(
      `INSERT INTO training_cycles
        (id, user_id, program_version_id, status, current_week, started_at, weeks_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         program_version_id = excluded.program_version_id,
         status = excluded.status,
         current_week = excluded.current_week,
         started_at = excluded.started_at,
         weeks_json = excluded.weeks_json;`,
      cycle.id,
      cycle.userId,
      cycle.programVersionId,
      cycle.status,
      cycle.currentWeek,
      cycle.startedAt,
      JSON.stringify(cycle.weeks),
    );
    await queueCycleSync(database, cycle);
  });
}

export async function advanceTrainingCycleAfterCompletedWorkout(
  database: SQLiteDatabase,
  cycleId: string,
  cycleWeek: number,
): Promise<TrainingCycle | null> {
  let updatedCycle: TrainingCycle | null = null;

  await database.withTransactionAsync(async () => {
    const row = await database.getFirstAsync<TrainingCycleRow>(
      `SELECT id, user_id, program_version_id, status, current_week, started_at, weeks_json
         FROM training_cycles
        WHERE id = ?
        LIMIT 1;`,
      cycleId,
    );
    if (!row) return;

    const cycle = mapTrainingCycle(row);
    if (cycle.currentWeek !== cycleWeek) {
      updatedCycle = cycle;
      return;
    }

    const completedWorkoutCount = await getCompletedRequiredWorkoutCount(
      database,
      cycleId,
      cycleWeek,
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
    await queueCycleSync(database, updatedCycle);
  });

  return updatedCycle;
}

export async function getCompletedRequiredWorkoutCount(
  database: SQLiteDatabase,
  cycleId: string,
  cycleWeek: number,
  programVersionId: string,
): Promise<number> {
  const versionRow = await database.getFirstAsync<{ version_json: string }>(
    `SELECT version_json
       FROM user_program_versions
      WHERE id = ?
      LIMIT 1;`,
    programVersionId,
  );
  if (!versionRow) return 0;

  let programVersion: ProgramVersion;
  try {
    programVersion = JSON.parse(versionRow.version_json) as ProgramVersion;
  } catch {
    return 0;
  }

  const requiredWorkoutIds = programVersion.workouts
    .filter((workout) => !workout.isOptional)
    .map((workout) => workout.id);
  if (requiredWorkoutIds.length === 0) return 0;

  const placeholders = requiredWorkoutIds.map(() => '?').join(', ');
  const countRow = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM workout_sessions
      WHERE cycle_id = ?
        AND cycle_week = ?
        AND status = 'complete'
        AND workout_id IN (${placeholders});`,
    cycleId,
    cycleWeek,
    ...requiredWorkoutIds,
  );

  return countRow?.count ?? 0;
}

export async function getActiveTrainingCycle(
  database: SQLiteDatabase,
  userId: string,
): Promise<TrainingCycle | null> {
  const row = await database.getFirstAsync<TrainingCycleRow>(
    `SELECT id, user_id, program_version_id, status, current_week, started_at, weeks_json
       FROM training_cycles
      WHERE user_id = ? AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1;`,
    userId,
  );
  if (!row) return null;

  return mapTrainingCycle(row);
}

export async function getLatestTrainingCycle(
  database: SQLiteDatabase,
  userId: string,
): Promise<TrainingCycle | null> {
  const row = await database.getFirstAsync<TrainingCycleRow>(
    `SELECT id, user_id, program_version_id, status, current_week, started_at, weeks_json
       FROM training_cycles
      WHERE user_id = ?
      ORDER BY started_at DESC, id DESC
      LIMIT 1;`,
    userId,
  );
  return row ? mapTrainingCycle(row) : null;
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

async function queueCycleSync(database: SQLiteDatabase, cycle: TrainingCycle): Promise<void> {
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
