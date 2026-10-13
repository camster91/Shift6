import type { SQLiteDatabase } from 'expo-sqlite';
import { programLibrary } from '../domain/programLibrary';
import {
  appendScheduleRevision,
  projectScheduleRevisions,
  type ScheduleMove,
  type ScheduleRevision,
} from '../domain/scheduleRevision';
import {
  cycleFromScheduleRow,
  decodeScheduleBaseline,
  sessionFromScheduleRow,
  scheduleRevisionFromRow,
} from '../domain/scheduleSnapshot';
import type { ProgramVersion } from '../domain/types';
import { lifecycleDate } from '../domain/cycleLifecycle';
import type { PlannedWorkoutOccurrence } from '../domain/calendar';

async function ownedCycle(db: SQLiteDatabase, owner: string, cycleId: string) {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM training_cycles WHERE id=? AND user_id=?;',
    cycleId,
    owner,
  );
  if (!row) throw new Error('This cycle is not available for this owner.');
  const cycle = cycleFromScheduleRow(row);
  const saved = await db.getFirstAsync<{ version_json: string }>(
    'SELECT v.version_json FROM user_program_versions v JOIN user_programs p ON p.id=v.program_id WHERE v.id=? AND p.user_id=?;',
    cycle.programVersionId,
    owner,
  );
  const version: ProgramVersion | undefined = saved
    ? JSON.parse(saved.version_json)
    : programLibrary.find((entry) => entry.version?.id === cycle.programVersionId)?.version;
  if (!version || version.id !== cycle.programVersionId)
    throw new Error('The immutable schedule version is unavailable.');
  return { cycle, version };
}
async function readContext(db: SQLiteDatabase, owner: string, cycleId: string, now: string) {
  const { cycle, version } = await ownedCycle(db, owner, cycleId);
  const snapshot = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM schedule_baselines WHERE cycle_id=? AND user_id=?;',
    cycleId,
    owner,
  );
  if (!snapshot || snapshot.program_version_id !== cycle.programVersionId)
    throw new Error('This cycle needs an explicitly confirmed schedule baseline.');
  if (now < String(snapshot.confirmed_at))
    throw new Error('Recorded time precedes baseline confirmation.');
  const sessions = (
    await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM workout_sessions WHERE cycle_id=?;',
      cycleId,
    )
  ).map(sessionFromScheduleRow);
  const baseline = decodeScheduleBaseline(
    String(snapshot.dates_json),
    cycle,
    version,
    String(snapshot.time_zone),
    now,
    sessions,
  );
  const revisions = (
    await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM schedule_revisions WHERE user_id=? AND cycle_id=? ORDER BY rowid;',
      owner,
      cycleId,
    )
  ).map(scheduleRevisionFromRow);
  const context = { cycle, programVersion: version, baseline, sessions };
  return { context, revisions };
}

/** No automatic backfill, activation, cycle mutation or outbox. The caller must show these exact dates. */
export async function confirmScheduleBaseline(
  db: SQLiteDatabase,
  input: {
    userId: string;
    cycleId: string;
    programVersionId: string;
    operationId: string;
    timeZone: string;
    confirmedAt: string;
    datesJSON: string;
    expectedOverridesJSON: string;
    confirmed: true;
  },
): Promise<void> {
  if (input.confirmed !== true || !input.operationId.trim() || !input.timeZone.trim())
    throw new Error('Confirm the explicit schedule dates first.');
  for (const value of [input.userId, input.cycleId, input.programVersionId, input.operationId])
    if (!value.trim() || value.length > 1024 || /[\u0000-\u001f]/.test(value))
      throw new Error('Use valid schedule identifiers.');
  if (new Date(input.confirmedAt).toISOString() !== input.confirmedAt)
    throw new Error('Use a canonical confirmation time.');
  await db.withExclusiveTransactionAsync(async (tx) => {
    const { cycle, version } = await ownedCycle(tx, input.userId, input.cycleId);
    if (cycle.programVersionId !== input.programVersionId || input.confirmedAt < cycle.startedAt)
      throw new Error('Schedule baseline binding changed.');
    decodeScheduleBaseline(input.datesJSON, cycle, version, input.timeZone, input.confirmedAt);
    const existing = await tx.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM schedule_baselines WHERE cycle_id=?;',
      input.cycleId,
    );
    if (existing) {
      if (
        existing.user_id !== input.userId ||
        existing.program_version_id !== input.programVersionId ||
        existing.operation_id !== input.operationId ||
        existing.time_zone !== input.timeZone ||
        existing.confirmed_at !== input.confirmedAt ||
        existing.dates_json !== input.datesJSON
      )
        throw new Error('This immutable baseline was already confirmed with different details.');
      return;
    }
    const overrides = await tx.getAllAsync(
      'SELECT * FROM workout_schedule_overrides WHERE user_id=? AND cycle_id=? ORDER BY cycle_week,workout_id;',
      input.userId,
      input.cycleId,
    );
    if (JSON.stringify(overrides) !== input.expectedOverridesJSON)
      throw new Error('Legacy schedule changed. Review it again before confirmation.');
    const dates = JSON.parse(input.datesJSON) as {
      cycleWeek: number;
      workoutId: string;
      originalDate: string;
      scheduledDate: string;
    }[];
    for (const row of overrides as Record<string, unknown>[]) {
      const date = dates.find(
        (entry) => entry.cycleWeek === row.cycle_week && entry.workoutId === row.workout_id,
      );
      if (
        !date ||
        date.originalDate !== row.original_date ||
        date.scheduledDate !== row.scheduled_date
      )
        throw new Error('Legacy moved dates must be preserved in the confirmed baseline.');
    }
    for (const date of dates)
      if (
        !overrides.some((row: unknown) => {
          const saved = row as Record<string, unknown>;
          return saved.cycle_week === date.cycleWeek && saved.workout_id === date.workoutId;
        }) &&
        date.scheduledDate !== date.originalDate
      )
        throw new Error('Baseline confirmation cannot introduce new schedule moves.');
    await tx.runAsync(
      'INSERT INTO schedule_baselines (id,user_id,cycle_id,program_version_id,operation_id,time_zone,confirmed_at,dates_json) VALUES (?,?,?,?,?,?,?,?);',
      input.cycleId,
      input.userId,
      input.cycleId,
      input.programVersionId,
      input.operationId,
      input.timeZone,
      input.confirmedAt,
      input.datesJSON,
    );
    const readback = await tx.getFirstAsync<{ dates_json: string }>(
      'SELECT dates_json FROM schedule_baselines WHERE id=?;',
      input.cycleId,
    );
    if (readback?.dates_json !== input.datesJSON)
      throw new Error('Schedule baseline readback failed.');
  });
}

export async function appendLocalScheduleMove(
  db: SQLiteDatabase,
  move: ScheduleMove,
  now: string,
  isCurrent: () => boolean = () => true,
) {
  let result: { status: 'appended' | 'already-applied'; revisions: ScheduleRevision[] } | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    if (!isCurrent()) throw new Error('Schedule context changed.');
    const { context, revisions } = await readContext(tx, move.userId, move.cycleId, now);
    result = appendScheduleRevision(context, revisions, move, now);
    if (result.status === 'appended') {
      const revision = result.revisions.at(-1)!;
      await tx.runAsync(
        'INSERT INTO schedule_revisions (id,user_id,cycle_id,program_version_id,cycle_week,workout_id,previous_revision_id,from_date,to_date,time_zone,recorded_at,effective_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?);',
        revision.operationId,
        revision.userId,
        revision.cycleId,
        revision.programVersionId,
        revision.cycleWeek,
        revision.workoutId,
        revision.previousRevisionId,
        revision.fromDate,
        revision.toDate,
        revision.timeZone,
        revision.recordedAt,
        revision.effectiveDate,
      );
    }
    const readback = await readContext(tx, move.userId, move.cycleId, now);
    if (JSON.stringify(readback.revisions) !== JSON.stringify(result.revisions))
      throw new Error('Schedule revision readback failed.');
    projectScheduleRevisions(readback.context, readback.revisions);
    if (!isCurrent()) throw new Error('Schedule context changed before commit.');
  });
  if (!result) throw new Error('Schedule transaction did not complete.');
  return result;
}

/** Read-only shared projection for future calendar/home/reminder integration; no current callers. */
export async function getLocalScheduleProjection(
  db: SQLiteDatabase,
  owner: string,
  cycleId: string,
  now: string,
  displayTimeZone: string,
) {
  if (!displayTimeZone.trim()) throw new Error('Choose an explicit display timezone.');
  const today = lifecycleDate(now, displayTimeZone);
  let result:
    { occurrences: PlannedWorkoutOccurrence[]; latestRevisionId: string | null } | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const { context, revisions } = await readContext(tx, owner, cycleId, now);
    const occurrences = projectScheduleRevisions(context, revisions)
      .map((entry) => ({
        ...entry,
        status: ['complete', 'partial', 'skipped', 'in-progress'].includes(entry.status)
          ? entry.status
          : entry.scheduledDate < today
            ? ('missed' as const)
            : entry.scheduledDate === today
              ? ('current' as const)
              : ('upcoming' as const),
      }))
      .sort(
        (left, right) =>
          left.scheduledDate.localeCompare(right.scheduledDate) ||
          left.cycleWeek - right.cycleWeek ||
          Number(Boolean(left.workout.isOptional)) - Number(Boolean(right.workout.isOptional)) ||
          left.workout.id.localeCompare(right.workout.id),
      );
    result = { occurrences, latestRevisionId: revisions.at(-1)?.operationId ?? null };
  });
  if (!result) throw new Error('Schedule projection could not be read.');
  return result;
}
