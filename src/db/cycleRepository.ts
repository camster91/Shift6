import { pauseOtherCyclesInTransaction } from './cycleLifecycleRepository';
import { SYNC_MUTATION_INSERT_SQL } from './syncOutbox';
import type { SQLiteDatabase } from 'expo-sqlite';

import { advanceCycleAfterCompletedWorkout } from '../domain/cycle';
import type { ProgramVersion, TrainingCycle } from '../domain/types';
import { lifecycleDate } from '../domain/cycleLifecycle';
import { addDaysToDateKey } from '../domain/calendar';
import { confirmScheduleBaselineInTransaction } from './scheduleRevisionRepository';
import { stableSnapshotJSON } from '../domain/programPersistence';

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
  await database.withExclusiveTransactionAsync(async (tx) =>
    saveTrainingCycleInTransaction(tx, cycle),
  );
}

export async function saveTrainingCycleInTransaction(
  database: SQLiteDatabase,
  cycle: TrainingCycle,
): Promise<void> {
  await pauseOtherCyclesInTransaction(database, cycle.userId, cycle.id);
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
}

/** The Start preview freezes date, timezone and version; existing unanchored cycles stay legacy. */
export async function saveTrainingCycleWithSchedule(
  database: SQLiteDatabase,
  cycle: TrainingCycle,
  version: ProgramVersion,
  timeZone: string,
  startDate: string,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  await database.withExclusiveTransactionAsync(async (tx) =>
    saveTrainingCycleWithScheduleInTransaction(tx, cycle, version, timeZone, startDate, isCurrent),
  );
}

/** Caller owns an exclusive transaction; every Start guard also applies here. */
export async function saveTrainingCycleWithScheduleInTransaction(
  tx: SQLiteDatabase,
  cycle: TrainingCycle,
  version: ProgramVersion,
  timeZone: string,
  startDate: string,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const confirmedAt = new Date().toISOString();
  if (
    !isCurrent() ||
    cycle.programVersionId !== version.id ||
    lifecycleDate(cycle.startedAt, timeZone) !== startDate ||
    lifecycleDate(confirmedAt, timeZone) !== startDate
  )
    throw new Error('The Start preview changed. Review the date and plan again.');
  const existing = await tx.getFirstAsync<TrainingCycleRow>(
    'SELECT * FROM training_cycles WHERE id=?;',
    cycle.id,
  );
  const existingBaseline = existing
    ? await tx.getFirstAsync<{ confirmed_at: string }>(
        'SELECT confirmed_at FROM schedule_baselines WHERE cycle_id=? AND user_id=?;',
        cycle.id,
        cycle.userId,
      )
    : null;
  if (
    existing &&
    (JSON.stringify(mapTrainingCycle(existing)) !== JSON.stringify(cycle) || !existingBaseline)
  )
    throw new Error('This cycle already exists. Start confirmation cannot rewrite its history.');
  const saved = await tx.getFirstAsync<{ version_json: string }>(
    'SELECT v.version_json FROM user_program_versions v JOIN user_programs p ON p.id=v.program_id WHERE v.id=? AND p.user_id=?;',
    version.id,
    cycle.userId,
  );
  if (!saved || stableSnapshotJSON(JSON.parse(saved.version_json)) !== stableSnapshotJSON(version))
    throw new Error('The saved private plan changed. Review Start again.');
  if (!existing) await saveTrainingCycleInTransaction(tx, cycle);
  const dates = cycle.weeks.flatMap((week) =>
    version.workouts.map((workout) => {
      const date = addDaysToDateKey(startDate, (week.weekNumber - 1) * 7 + workout.dayOfWeek - 1);
      return {
        cycleWeek: week.weekNumber,
        workoutId: workout.id,
        originalDate: date,
        scheduledDate: date,
      };
    }),
  );
  await confirmScheduleBaselineInTransaction(tx, {
    userId: cycle.userId,
    cycleId: cycle.id,
    programVersionId: version.id,
    operationId: `${cycle.id}-start-schedule`,
    timeZone,
    confirmedAt: existingBaseline?.confirmed_at ?? confirmedAt,
    datesJSON: JSON.stringify(dates),
    expectedOverridesJSON: '[]',
    confirmed: true,
  });
  if (!isCurrent()) throw new Error('Start context changed before commit.');
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
    `SELECT COUNT(DISTINCT workout_id) AS count
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

export async function getPreviousTrainingCycle(
  database: SQLiteDatabase,
  userId: string,
  currentCycle: Pick<TrainingCycle, 'id' | 'startedAt'>,
): Promise<TrainingCycle | null> {
  const row = await database.getFirstAsync<TrainingCycleRow>(
    `SELECT id, user_id, program_version_id, status, current_week, started_at, weeks_json
       FROM training_cycles
      WHERE user_id = ?
        AND (started_at < ? OR (started_at = ? AND id < ?))
      ORDER BY started_at DESC, id DESC
      LIMIT 1;`,
    userId,
    currentCycle.startedAt,
    currentCycle.startedAt,
    currentCycle.id,
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
    SYNC_MUTATION_INSERT_SQL,
    `outbox-training-cycle-${cycle.id}`,
    `training-cycle:${cycle.id}`,
    'training-cycle',
    cycle.id,
    JSON.stringify(cycle),
    cycle.startedAt,
  );
}
