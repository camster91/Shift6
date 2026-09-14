import type {
  ProgramVersion,
  TrainingCycle,
  WeeklyScheduleEntry,
  Workout,
  WorkoutScheduleOverride,
  WorkoutScheduleSession,
  WorkoutScheduleStatus,
} from './types';

export const scheduleDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export interface PlannedWorkoutOccurrence {
  id: string;
  cycleId: string;
  cycleWeek: number;
  workout: Workout;
  originalDate: string;
  scheduledDate: string;
  isMoved: boolean;
  status: WorkoutScheduleStatus;
}

export function buildWorkoutScheduleOverrideId(
  cycleId: string,
  cycleWeek: number,
  workoutId: string,
): string {
  return `schedule-override-${cycleId}-${cycleWeek}-${workoutId}`;
}

/**
 * Calendar dates are stored as local YYYY-MM-DD keys. A cycle starts on the
 * device-local date it was created; workout dayOfWeek is the day slot within
 * each repeating cycle week. This avoids UTC midnight shifting a workout onto
 * a different local day while keeping the existing weekly program model.
 */
export function formatDateKey(date: Date): string {
  assertValidDate(date);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
}

export function parseDateKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error(`Invalid local date key: ${dateKey}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid local date key: ${dateKey}`);
  }
  return date;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error('Date offsets must be whole numbers.');
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

export function getCycleStartDateKey(cycle: Pick<TrainingCycle, 'startedAt'>): string {
  const startedAt = new Date(cycle.startedAt);
  return formatDateKey(startedAt);
}

export function getCycleWeekStartDateKey(
  cycle: Pick<TrainingCycle, 'startedAt'>,
  cycleWeek: number,
): string {
  assertCycleWeek(cycleWeek);
  return addDaysToDateKey(getCycleStartDateKey(cycle), (cycleWeek - 1) * 7);
}

export function getPlannedWorkoutDateKey(
  cycle: Pick<TrainingCycle, 'startedAt'>,
  cycleWeek: number,
  workout: Pick<Workout, 'dayOfWeek'>,
): string {
  assertCycleWeek(cycleWeek);
  if (!Number.isInteger(workout.dayOfWeek) || workout.dayOfWeek < 1 || workout.dayOfWeek > 7) {
    throw new Error('Workout dayOfWeek must be a whole number from 1 to 7.');
  }
  return addDaysToDateKey(getCycleWeekStartDateKey(cycle, cycleWeek), workout.dayOfWeek - 1);
}

export function buildCycleSchedule(
  cycle: Pick<TrainingCycle, 'id' | 'startedAt' | 'weeks'>,
  programVersion: Pick<ProgramVersion, 'workouts'>,
  overrides: readonly WorkoutScheduleOverride[] = [],
  sessions: readonly WorkoutScheduleSession[] = [],
  today = new Date(),
): PlannedWorkoutOccurrence[] {
  const todayKey = formatDateKey(today);
  const overridesByOccurrence = new Map(
    overrides
      .filter((override) => override.cycleId === cycle.id)
      .map((override) => [occurrenceKey(override.cycleWeek, override.workoutId), override]),
  );
  const sessionsByOccurrence = new Map<string, WorkoutScheduleSession[]>();
  for (const session of sessions) {
    const key = occurrenceKey(session.cycleWeek, session.workoutId);
    sessionsByOccurrence.set(key, [...(sessionsByOccurrence.get(key) ?? []), session]);
  }

  return cycle.weeks
    .filter((week) => week.weekNumber >= 1 && week.weekNumber <= 6)
    .flatMap((week) =>
      programVersion.workouts.map((workout) => {
        const originalDate = getPlannedWorkoutDateKey(cycle, week.weekNumber, workout);
        const override = overridesByOccurrence.get(occurrenceKey(week.weekNumber, workout.id));
        const scheduledDate = override?.scheduledDate ?? originalDate;
        const status = getOccurrenceStatus(
          sessionsByOccurrence.get(occurrenceKey(week.weekNumber, workout.id)) ?? [],
          scheduledDate,
          todayKey,
        );

        return {
          id: `schedule-occurrence-${cycle.id}-${week.weekNumber}-${workout.id}`,
          cycleId: cycle.id,
          cycleWeek: week.weekNumber,
          workout,
          originalDate,
          scheduledDate,
          isMoved: scheduledDate !== originalDate,
          status,
        };
      }),
    )
    .sort(
      (left, right) =>
        left.scheduledDate.localeCompare(right.scheduledDate) ||
        left.cycleWeek - right.cycleWeek ||
        Number(Boolean(left.workout.isOptional)) - Number(Boolean(right.workout.isOptional)) ||
        left.workout.id.localeCompare(right.workout.id),
    );
}

export function buildCurrentCycleWeekSchedule(
  cycle: Pick<TrainingCycle, 'id' | 'startedAt' | 'currentWeek' | 'weeks'>,
  programVersion: Pick<ProgramVersion, 'workouts'>,
  overrides: readonly WorkoutScheduleOverride[] = [],
  sessions: readonly WorkoutScheduleSession[] = [],
  today = new Date(),
): WeeklyScheduleEntry[] {
  const occurrences = buildCycleSchedule(cycle, programVersion, overrides, sessions, today).filter(
    (occurrence) => occurrence.cycleWeek === cycle.currentWeek,
  );
  const weekStart = getCycleWeekStartDateKey(cycle, cycle.currentWeek);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateKey(weekStart, index);
    const occurrence = occurrences
      .filter((candidate) => candidate.scheduledDate === date)
      .sort(
        (left, right) =>
          Number(Boolean(left.workout.isOptional)) - Number(Boolean(right.workout.isOptional)) ||
          left.workout.id.localeCompare(right.workout.id),
      )[0];

    if (!occurrence) {
      return {
        id: `schedule-rest-${cycle.id}-${cycle.currentWeek}-${date}`,
        day: getCalendarDayLabel(date),
        date,
        title: 'Rest',
        category: 'rest' as const,
        status: 'rest' as const,
      };
    }

    return {
      id: occurrence.id,
      day: getCalendarDayLabel(date),
      date,
      title: occurrence.workout.title,
      workoutId: occurrence.workout.id,
      category: getScheduleCategory(occurrence.workout),
      status: toWeeklyScheduleStatus(occurrence.status),
    };
  });
}

export function canMoveScheduleOccurrence(
  occurrence: Pick<PlannedWorkoutOccurrence, 'status' | 'scheduledDate' | 'originalDate'> & {
    workout: Pick<Workout, 'dayOfWeek'>;
  },
  todayKey: string,
  dayDelta: number,
): boolean {
  if (
    !Number.isInteger(dayDelta) ||
    Math.abs(dayDelta) !== 1 ||
    (!['current', 'upcoming'].includes(occurrence.status) &&
      !(occurrence.status === 'missed' && dayDelta > 0))
  ) {
    return false;
  }
  const targetDate = addDaysToDateKey(occurrence.scheduledDate, dayDelta);
  const weekStart = addDaysToDateKey(occurrence.originalDate, -(occurrence.workout.dayOfWeek - 1));
  const weekEnd = addDaysToDateKey(weekStart, 6);
  return targetDate >= todayKey && targetDate >= weekStart && targetDate <= weekEnd;
}

export function getScheduleDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parseDateKey(dateKey));
}

function getOccurrenceStatus(
  sessions: readonly WorkoutScheduleSession[],
  scheduledDate: string,
  todayKey: string,
): WorkoutScheduleStatus {
  const statuses = new Set(sessions.map((session) => session.status));
  if (statuses.has('complete')) return 'complete';
  if (statuses.has('partial')) return 'partial';
  if (statuses.has('skipped')) return 'skipped';
  if (statuses.has('in-progress')) return 'in-progress';
  return scheduledDate < todayKey ? 'missed' : scheduledDate === todayKey ? 'current' : 'upcoming';
}

function occurrenceKey(cycleWeek: number, workoutId: string): string {
  return `${cycleWeek}:${workoutId}`;
}

function getCalendarDayLabel(dateKey: string): string {
  const day = parseDateKey(dateKey).getDay();
  return scheduleDayLabels[day === 0 ? 6 : day - 1] ?? 'Mon';
}

function getScheduleCategory(workout: Workout): WeeklyScheduleEntry['category'] {
  if (workout.focus === 'cardio') return 'cardio';
  if (workout.focus === 'recovery') return 'recovery';
  return 'strength';
}

function toWeeklyScheduleStatus(status: WorkoutScheduleStatus): WeeklyScheduleEntry['status'] {
  if (status === 'complete') return 'complete';
  if (status === 'current') return 'current';
  return 'upcoming';
}

function assertCycleWeek(cycleWeek: number): void {
  if (!Number.isInteger(cycleWeek) || cycleWeek < 1 || cycleWeek > 6) {
    throw new Error('Cycle week must be a whole number from 1 to 6.');
  }
}

function assertValidDate(date: Date): void {
  if (Number.isNaN(date.getTime())) throw new Error('A valid date is required.');
}
