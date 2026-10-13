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
  assertBaselineLegacyDates,
} from '../domain/scheduleSnapshot';
import type { ProgramVersion } from '../domain/types';
import { lifecycleDate } from '../domain/cycleLifecycle';
import { addDaysToDateKey } from '../domain/calendar';

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
  const legacy = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM workout_schedule_overrides WHERE user_id=? AND cycle_id=?;',
    owner,
    cycleId,
  );
  assertBaselineLegacyDates(baseline, legacy);
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
  await db.withExclusiveTransactionAsync((tx) => confirmScheduleBaselineInTransaction(tx, input));
}

export async function confirmScheduleBaselineInTransaction(
  tx: SQLiteDatabase,
  input: Parameters<typeof confirmScheduleBaseline>[1],
): Promise<void> {
  if (input.confirmed !== true || !input.operationId.trim() || !input.timeZone.trim())
    throw new Error('Confirm the explicit schedule dates first.');
  for (const value of [input.userId, input.cycleId, input.programVersionId, input.operationId])
    if (!value.trim() || value.length > 1024 || /[\u0000-\u001f]/.test(value))
      throw new Error('Use valid schedule identifiers.');
  if (new Date(input.confirmedAt).toISOString() !== input.confirmedAt)
    throw new Error('Use a canonical confirmation time.');
  const { cycle, version } = await ownedCycle(tx, input.userId, input.cycleId);
  if (cycle.programVersionId !== input.programVersionId || input.confirmedAt < cycle.startedAt)
    throw new Error('Schedule baseline binding changed.');
  const baseline = decodeScheduleBaseline(
    input.datesJSON,
    cycle,
    version,
    input.timeZone,
    input.confirmedAt,
  );
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
  assertBaselineLegacyDates(baseline, overrides as Record<string, unknown>[]);
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
}

export async function appendLocalScheduleMove(
  db: SQLiteDatabase,
  move: ScheduleMove,
  now: string,
  isCurrent: () => boolean = () => true,
) {
  let result: Awaited<ReturnType<typeof appendLocalScheduleMoveInTransaction>> | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    result = await appendLocalScheduleMoveInTransaction(tx, move, now, isCurrent);
  });
  if (!result) throw new Error('Schedule transaction did not complete.');
  return result;
}

export async function appendLocalScheduleMoveInTransaction(
  db: SQLiteDatabase,
  move: ScheduleMove,
  now: string,
  isCurrent: () => boolean = () => true,
) {
  const tx = db;
  if (!isCurrent()) throw new Error('Schedule context changed.');
  const { context, revisions } = await readContext(tx, move.userId, move.cycleId, now);
  const result = appendScheduleRevision(context, revisions, move, now);
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
  let result: Awaited<ReturnType<typeof getLocalScheduleProjectionInTransaction>> | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    result = await getLocalScheduleProjectionInTransaction(
      tx,
      owner,
      cycleId,
      now,
      displayTimeZone,
    );
  });
  if (!result) throw new Error('Schedule projection could not be read.');
  return result;
}

export async function getLocalScheduleProjectionInTransaction(
  db: SQLiteDatabase,
  owner: string,
  cycleId: string,
  now: string,
  displayTimeZone: string,
) {
  if (!displayTimeZone.trim()) throw new Error('Choose an explicit display timezone.');
  const today = lifecycleDate(now, displayTimeZone);
  const tx = db;
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
  return {
    occurrences,
    latestRevisionId: revisions.at(-1)?.operationId ?? null,
    latestRecordedAt: revisions.at(-1)?.recordedAt ?? null,
  };
}

export interface ScheduleMovePreview {
  move: ScheduleMove;
  cycleFingerprint: string;
  effectiveDate: string;
  baseline: Parameters<typeof confirmScheduleBaseline>[1] | null;
  dates: { cycleWeek: number; workoutId: string; originalDate: string; scheduledDate: string }[];
}
export async function getConfirmedScheduleTimeZone(
  db: SQLiteDatabase,
  owner: string,
  cycleId: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ time_zone: string }>(
    'SELECT time_zone FROM schedule_baselines WHERE user_id=? AND cycle_id=?;',
    owner,
    cycleId,
  );
  return row?.time_zone ?? null;
}

/** Read-only review, including all existing dates if this legacy cycle needs its first anchor. */
export async function previewLocalScheduleMove(
  db: SQLiteDatabase,
  input: {
    userId: string;
    cycleId: string;
    programVersionId: string;
    cycleWeek: number;
    workoutId: string;
    operationId: string;
    fromDate: string;
    toDate: string;
    timeZone: string;
    originalTimeZone: string;
  },
  now: string,
): Promise<ScheduleMovePreview> {
  let result: ScheduleMovePreview | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const { cycle, version } = await ownedCycle(tx, input.userId, input.cycleId);
    if (cycle.programVersionId !== input.programVersionId)
      throw new Error('The cycle version changed. Review it again.');
    const exists = await tx.getFirstAsync(
      'SELECT id FROM schedule_baselines WHERE cycle_id=? AND user_id=?;',
      input.cycleId,
      input.userId,
    );
    let baseline: ScheduleMovePreview['baseline'] = null;
    let context, revisions: ScheduleRevision[];
    if (exists) {
      ({ context, revisions } = await readContext(tx, input.userId, input.cycleId, now));
    } else {
      const legacy = await tx.getAllAsync<Record<string, unknown>>(
        'SELECT * FROM workout_schedule_overrides WHERE user_id=? AND cycle_id=? ORDER BY cycle_week,workout_id;',
        input.userId,
        input.cycleId,
      );
      const start = lifecycleDate(cycle.startedAt, input.originalTimeZone);
      const dates = cycle.weeks.flatMap((week) =>
        version.workouts.map((workout) => {
          const originalDate = addDaysToDateKey(
            start,
            (week.weekNumber - 1) * 7 + workout.dayOfWeek - 1,
          );
          const old = legacy.find(
            (entry) => entry.cycle_week === week.weekNumber && entry.workout_id === workout.id,
          );
          return {
            cycleWeek: week.weekNumber,
            workoutId: workout.id,
            originalDate,
            scheduledDate: old ? String(old.scheduled_date) : originalDate,
          };
        }),
      );
      baseline = {
        userId: input.userId,
        cycleId: input.cycleId,
        programVersionId: input.programVersionId,
        operationId: `${input.operationId}-baseline`,
        timeZone: input.originalTimeZone,
        confirmedAt: now,
        datesJSON: JSON.stringify(dates),
        expectedOverridesJSON: JSON.stringify(legacy),
        confirmed: true,
      };
      const sessions = (
        await tx.getAllAsync<Record<string, unknown>>(
          'SELECT * FROM workout_sessions WHERE cycle_id=?;',
          input.cycleId,
        )
      ).map(sessionFromScheduleRow);
      const occurrences = decodeScheduleBaseline(
        baseline.datesJSON,
        cycle,
        version,
        input.originalTimeZone,
        now,
        sessions,
      );
      assertBaselineLegacyDates(occurrences, legacy);
      context = { cycle, programVersion: version, baseline: occurrences, sessions };
      revisions = [];
    }
    const projected = projectScheduleRevisions(context, revisions);
    const occurrence = projected.find(
      (entry) => entry.cycleWeek === input.cycleWeek && entry.workout.id === input.workoutId,
    );
    if (!occurrence || (exists && occurrence.scheduledDate !== input.fromDate))
      throw new Error('The scheduled date changed. Review it again.');
    const move: ScheduleMove = {
      operationId: input.operationId,
      userId: input.userId,
      cycleId: input.cycleId,
      programVersionId: input.programVersionId,
      cycleWeek: input.cycleWeek,
      workoutId: input.workoutId,
      previousRevisionId: revisions.at(-1)?.operationId ?? null,
      fromDate: occurrence.scheduledDate,
      toDate: input.toDate,
      timeZone: input.timeZone,
    };
    appendScheduleRevision(context, revisions, move, now);
    result = {
      move,
      cycleFingerprint: JSON.stringify(cycle),
      effectiveDate: lifecycleDate(now, move.timeZone),
      baseline,
      dates: projected.map((entry) => ({
        cycleWeek: entry.cycleWeek,
        workoutId: entry.workout.id,
        originalDate: entry.originalDate,
        scheduledDate: entry.scheduledDate,
      })),
    };
  });
  if (!result) throw new Error('The schedule preview could not be read.');
  return result;
}

/** One confirmation owns baseline creation and the move; failure leaves neither behind. */
export async function confirmLocalScheduleMove(
  db: SQLiteDatabase,
  preview: ScheduleMovePreview,
  now: string,
  isCurrent: () => boolean = () => true,
) {
  let result: Awaited<ReturnType<typeof appendLocalScheduleMoveInTransaction>> | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    if (!isCurrent()) throw new Error('Schedule context changed.');
    const duplicate = await tx.getFirstAsync(
      'SELECT id FROM schedule_revisions WHERE id=? AND user_id=? AND cycle_id=?;',
      preview.move.operationId,
      preview.move.userId,
      preview.move.cycleId,
    );
    if (!duplicate) {
      const { cycle } = await ownedCycle(tx, preview.move.userId, preview.move.cycleId);
      if (
        JSON.stringify(cycle) !== preview.cycleFingerprint ||
        lifecycleDate(now, preview.move.timeZone) !== preview.effectiveDate
      )
        throw new Error('The cycle or date changed. Review this move again.');
      if (preview.baseline)
        await confirmScheduleBaselineInTransaction(tx, { ...preview.baseline, confirmedAt: now });
    }
    result = await appendLocalScheduleMoveInTransaction(tx, preview.move, now, isCurrent);
  });
  if (!result) throw new Error('Schedule confirmation did not complete.');
  return result;
}
