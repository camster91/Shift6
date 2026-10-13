import { addDaysToDateKey, parseDateKey, type PlannedWorkoutOccurrence } from './calendar';
import { lifecycleDate } from './cycleLifecycle';
import type { ProgramVersion, TrainingCycle, WorkoutSession } from './types';
import {
  projectScheduleRevisions,
  type ScheduleRevisionContext,
  type ScheduleRevision,
} from './scheduleRevision';

export function scheduleRevisionFromRow(row: Record<string, unknown>): ScheduleRevision {
  return {
    operationId: String(row.id),
    userId: String(row.user_id),
    cycleId: String(row.cycle_id),
    programVersionId: String(row.program_version_id),
    cycleWeek: Number(row.cycle_week),
    workoutId: String(row.workout_id),
    previousRevisionId: row.previous_revision_id === null ? null : String(row.previous_revision_id),
    fromDate: String(row.from_date),
    toDate: String(row.to_date),
    timeZone: String(row.time_zone),
    recordedAt: String(row.recorded_at),
    effectiveDate: String(row.effective_date),
  };
}

export const schedulePersistenceSections = {
  scheduleBaselines: 'schedule_baselines',
  scheduleRevisions: 'schedule_revisions',
} as const;
export interface ScheduleDateSnapshot {
  cycleWeek: number;
  workoutId: string;
  originalDate: string;
  scheduledDate: string;
}

/** A baseline freezes the legacy schedule; only later revision rows may introduce moves. */
export function assertBaselineLegacyDates(
  baseline: readonly Pick<
    PlannedWorkoutOccurrence,
    'cycleWeek' | 'workout' | 'originalDate' | 'scheduledDate'
  >[],
  overrides: readonly Record<string, unknown>[],
): void {
  for (const saved of overrides) {
    const date = baseline.find(
      (entry) => entry.cycleWeek === saved.cycle_week && entry.workout.id === saved.workout_id,
    );
    if (
      !date ||
      date.originalDate !== saved.original_date ||
      date.scheduledDate !== saved.scheduled_date
    )
      throw new Error('Legacy moved dates must be preserved in the confirmed baseline.');
  }
  for (const date of baseline)
    if (
      !overrides.some(
        (saved) => saved.cycle_week === date.cycleWeek && saved.workout_id === date.workout.id,
      ) &&
      date.scheduledDate !== date.originalDate
    )
      throw new Error('Baseline confirmation cannot introduce new schedule moves.');
}
export function decodeScheduleBaseline(
  serialized: string,
  cycle: TrainingCycle,
  version: ProgramVersion,
  timeZone: string,
  recordedAt: string,
  sessions: ScheduleRevisionContext['sessions'] = [],
): PlannedWorkoutOccurrence[] {
  if (!timeZone.trim() || new Date(recordedAt).toISOString() !== recordedAt)
    throw new Error('Use an explicit schedule zone and canonical recorded time.');
  const value: unknown = JSON.parse(serialized);
  if (!Array.isArray(value)) throw new Error('Schedule baseline must contain explicit dates.');
  const today = lifecycleDate(recordedAt, timeZone);
  const baseline = value.map((entry: ScheduleDateSnapshot) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      Object.keys(entry).sort().join(',') !== 'cycleWeek,originalDate,scheduledDate,workoutId'
    )
      throw new Error('Invalid schedule snapshot fields.');
    parseDateKey(entry.originalDate);
    parseDateKey(entry.scheduledDate);
    const workout = version.workouts.find((candidate) => candidate.id === entry.workoutId);
    if (!workout) throw new Error('Schedule baseline references an unknown workout.');
    const statuses = sessions
      .filter(
        (session) =>
          session.cycleId === cycle.id &&
          session.cycleWeek === entry.cycleWeek &&
          session.workoutId === entry.workoutId,
      )
      .map((session) => session.status);
    const status: PlannedWorkoutOccurrence['status'] =
      (['complete', 'partial', 'skipped', 'in-progress'] as const).find((candidate) =>
        statuses.includes(candidate),
      ) ??
      (entry.scheduledDate < today
        ? 'missed'
        : entry.scheduledDate === today
          ? 'current'
          : 'upcoming');
    return {
      id: `schedule-occurrence-${cycle.id}-${entry.cycleWeek}-${entry.workoutId}`,
      cycleId: cycle.id,
      cycleWeek: entry.cycleWeek,
      workout,
      originalDate: entry.originalDate,
      scheduledDate: entry.scheduledDate,
      isMoved: entry.scheduledDate !== entry.originalDate,
      status,
    };
  });
  projectScheduleRevisions({ cycle, programVersion: version, baseline, sessions }, []);
  // Every original date shares one explicitly confirmed start date and the immutable day slots.
  const first = baseline[0];
  if (!first) throw new Error('An empty schedule cannot be anchored.');
  const start = addDaysToDateKey(
    first.originalDate,
    -((first.cycleWeek - 1) * 7 + first.workout.dayOfWeek - 1),
  );
  if (start !== lifecycleDate(cycle.startedAt, timeZone))
    throw new Error('Confirm the original cycle timezone before anchoring its dates.');
  if (
    baseline.some(
      (entry) =>
        entry.originalDate !==
        addDaysToDateKey(start, (entry.cycleWeek - 1) * 7 + entry.workout.dayOfWeek - 1),
    )
  )
    throw new Error('Schedule original dates disagree with their confirmed anchor.');
  return baseline;
}

export function cycleFromScheduleRow(row: Record<string, unknown>): TrainingCycle {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    programVersionId: String(row.program_version_id),
    status: row.status as TrainingCycle['status'],
    currentWeek: Number(row.current_week),
    startedAt: String(row.started_at),
    weeks: JSON.parse(String(row.weeks_json)),
  };
}
export function sessionFromScheduleRow(
  row: Record<string, unknown>,
): Pick<WorkoutSession, 'cycleId' | 'cycleWeek' | 'workoutId' | 'programVersionId' | 'status'> {
  return {
    cycleId: String(row.cycle_id),
    cycleWeek: Number(row.cycle_week),
    workoutId: String(row.workout_id),
    programVersionId: String(row.program_version_id),
    status: row.status as WorkoutSession['status'],
  };
}
