import type { PlannedWorkoutOccurrence } from './calendar';
import { parseDateKey } from './calendar';
import { lifecycleDate } from './cycleLifecycle';
import type { ProgramVersion, TrainingCycle, WorkoutSession } from './types';

/** One explicit move, never a new workout attempt or a change to training dose. */
export interface ScheduleMove {
  operationId: string;
  userId: string;
  cycleId: string;
  programVersionId: string;
  cycleWeek: number;
  workoutId: string;
  previousRevisionId: string | null;
  fromDate: string;
  toDate: string;
  timeZone: string;
}

export interface ScheduleRevision extends ScheduleMove {
  recordedAt: string;
  effectiveDate: string;
}

export interface ScheduleRevisionContext {
  cycle: TrainingCycle;
  programVersion: Pick<ProgramVersion, 'id' | 'workouts'>;
  /** Persisted date snapshot, including any pre-revision overrides. Do not regenerate on travel. */
  baseline: readonly PlannedWorkoutOccurrence[];
  sessions: readonly Pick<
    WorkoutSession,
    'cycleId' | 'cycleWeek' | 'workoutId' | 'programVersionId' | 'status'
  >[];
}

function requireId(value: string): void {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 1024 ||
    /[\u0000-\u001f]/.test(value)
  )
    throw new Error('A schedule binding is missing or invalid.');
}

function requireInstant(value: string): void {
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)
    throw new Error('Use a canonical UTC recorded time.');
}

function requireDate(value: string): void {
  // Reuse the calendar's strict Gregorian date validation, never parse a date as UTC midnight.
  parseDateKey(value);
}

function key(week: number, workoutId: string): string {
  return JSON.stringify([week, workoutId]);
}

function validateContext(context: ScheduleRevisionContext): void {
  const { cycle, programVersion, baseline } = context;
  [cycle.id, cycle.userId, cycle.programVersionId].forEach(requireId);
  requireInstant(cycle.startedAt);
  if (cycle.programVersionId !== programVersion.id)
    throw new Error('Schedule version does not match its cycle.');
  const workouts = new Set(programVersion.workouts.map((workout) => workout.id));
  [...workouts].forEach(requireId);
  const weeks = new Set(cycle.weeks.map((week) => week.weekNumber));
  if (
    weeks.size !== cycle.weeks.length ||
    [...weeks].some((week) => !Number.isInteger(week) || week < 1 || week > 6)
  )
    throw new Error('Schedule cycle weeks are invalid or ambiguous.');
  if (workouts.size !== programVersion.workouts.length)
    throw new Error('Schedule workout identities are ambiguous.');
  const seen = new Set<string>();
  for (const occurrence of baseline) {
    const identity = key(occurrence.cycleWeek, occurrence.workout.id);
    if (
      occurrence.cycleId !== cycle.id ||
      !workouts.has(occurrence.workout.id) ||
      !cycle.weeks.some((week) => week.weekNumber === occurrence.cycleWeek) ||
      seen.has(identity)
    )
      throw new Error('Schedule baseline has an invalid or duplicate occurrence.');
    requireDate(occurrence.originalDate);
    requireDate(occurrence.scheduledDate);
    seen.add(identity);
  }
  // A missing occurrence must not quietly disappear from a replacement projection.
  if (seen.size !== cycle.weeks.length * workouts.size)
    throw new Error('Schedule baseline is incomplete.');
}

function validateBinding(context: ScheduleRevisionContext, move: ScheduleMove): void {
  [
    move.operationId,
    move.userId,
    move.cycleId,
    move.programVersionId,
    move.workoutId,
    move.timeZone,
  ].forEach(requireId);
  if (move.previousRevisionId !== null) requireId(move.previousRevisionId);
  if (
    move.userId !== context.cycle.userId ||
    move.cycleId !== context.cycle.id ||
    move.programVersionId !== context.cycle.programVersionId ||
    !Number.isInteger(move.cycleWeek) ||
    !context.cycle.weeks.some((week) => week.weekNumber === move.cycleWeek) ||
    !context.programVersion.workouts.some((workout) => workout.id === move.workoutId)
  )
    throw new Error('Schedule move does not belong to this owner, cycle, version and week.');
  requireDate(move.fromDate);
  requireDate(move.toDate);
  // Validates the explicit IANA zone; no device-zone fallback or automatic date conversion.
  lifecycleDate('2026-01-01T12:00:00.000Z', move.timeZone);
  if (move.fromDate === move.toDate) throw new Error('Choose a different scheduled date.');
}

/** Replay in append order. Old accepted moves remain valid after a session completes. */
export function projectScheduleRevisions(
  context: ScheduleRevisionContext,
  revisions: readonly ScheduleRevision[],
): PlannedWorkoutOccurrence[] {
  validateContext(context);
  const projected = context.baseline.map((occurrence) => ({ ...occurrence }));
  const ids = new Set<string>();
  let previous: ScheduleRevision | undefined;
  for (const revision of revisions) {
    validateBinding(context, revision);
    requireInstant(revision.recordedAt);
    requireDate(revision.effectiveDate);
    if (
      ids.has(revision.operationId) ||
      revision.cycleWeek > context.cycle.currentWeek ||
      revision.previousRevisionId !== (previous?.operationId ?? null) ||
      revision.recordedAt < context.cycle.startedAt ||
      (previous && revision.recordedAt < previous.recordedAt) ||
      revision.effectiveDate !== lifecycleDate(revision.recordedAt, revision.timeZone) ||
      revision.toDate < revision.effectiveDate
    )
      throw new Error('Schedule revision history is conflicting or invalid.');
    const occurrence = projected.find(
      (candidate) =>
        candidate.cycleWeek === revision.cycleWeek && candidate.workout.id === revision.workoutId,
    )!;
    if (occurrence.scheduledDate !== revision.fromDate)
      throw new Error('Schedule revision date no longer matches its preceding projection.');
    occurrence.scheduledDate = revision.toDate;
    occurrence.isMoved = revision.toDate !== occurrence.originalDate;
    ids.add(revision.operationId);
    previous = revision;
  }
  return projected;
}

function sameMove(left: ScheduleMove, right: ScheduleMove): boolean {
  return (
    left.operationId === right.operationId &&
    left.userId === right.userId &&
    left.cycleId === right.cycleId &&
    left.programVersionId === right.programVersionId &&
    left.cycleWeek === right.cycleWeek &&
    left.workoutId === right.workoutId &&
    left.previousRevisionId === right.previousRevisionId &&
    left.fromDate === right.fromDate &&
    left.toDate === right.toDate &&
    left.timeZone === right.timeZone
  );
}

/**
 * Call inside a repository transaction with fresh owner, cycle, history and session rows.
 * A retry returns the existing append; it does not reapply the move or revise history.
 */
export function appendScheduleRevision(
  context: ScheduleRevisionContext,
  revisions: readonly ScheduleRevision[],
  move: ScheduleMove,
  now: string,
): { status: 'appended' | 'already-applied'; revisions: ScheduleRevision[] } {
  const projection = projectScheduleRevisions(context, revisions);
  validateBinding(context, move);
  const duplicate = revisions.find((revision) => revision.operationId === move.operationId);
  if (duplicate) {
    if (!sameMove(duplicate, move))
      throw new Error('Operation identity was reused for another move.');
    return { status: 'already-applied', revisions: [...revisions] };
  }
  requireInstant(now);
  if (now < context.cycle.startedAt) throw new Error('Recorded time precedes cycle creation.');
  const latest = revisions.at(-1);
  if (move.previousRevisionId !== (latest?.operationId ?? null))
    throw new Error('Schedule changed. Review its latest revision before confirming.');
  if (latest && now < latest.recordedAt)
    throw new Error('Recorded time precedes schedule history.');
  if (context.cycle.status !== 'active' || move.cycleWeek !== context.cycle.currentWeek)
    throw new Error('Only an active cycle current week can be rescheduled.');
  if (context.cycle.weeks.find((week) => week.weekNumber === move.cycleWeek)?.status !== 'current')
    throw new Error('Completed or future weeks require a distinct attempt, not a schedule move.');
  const occurrence = projection.find(
    (candidate) =>
      candidate.cycleWeek === move.cycleWeek && candidate.workout.id === move.workoutId,
  )!;
  const matchingSessions = context.sessions.filter(
    (session) =>
      session.cycleId === move.cycleId &&
      session.cycleWeek === move.cycleWeek &&
      session.workoutId === move.workoutId,
  );
  if (
    matchingSessions.length ||
    ['complete', 'partial', 'skipped', 'in-progress'].includes(occurrence.status)
  )
    throw new Error('Started or recorded workout history cannot be moved.');
  if (occurrence.scheduledDate !== move.fromDate)
    throw new Error('Scheduled date changed. Review the occurrence again.');
  const effectiveDate = lifecycleDate(now, move.timeZone);
  if (move.toDate < effectiveDate) throw new Error('Choose today or a future explicit date.');
  return {
    status: 'appended',
    revisions: [...revisions, { ...move, recordedAt: now, effectiveDate }],
  };
}
