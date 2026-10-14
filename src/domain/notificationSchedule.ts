import { buildCycleSchedule, formatDateKey, parseDateKey, addDaysToDateKey } from './calendar';
import type {
  ISODateString,
  NotificationPreference,
  PreferredTrainingTime,
  ProgramVersion,
  TrainingCycle,
  WorkoutScheduleOverride,
  WorkoutScheduleSession,
} from './types';

export const workoutReminderLookaheadDays = 7;

export const preferredTrainingTimeClock: Record<
  PreferredTrainingTime,
  { hour: number; minute: number }
> = {
  morning: { hour: 8, minute: 0 },
  afternoon: { hour: 13, minute: 0 },
  evening: { hour: 18, minute: 0 },
};

export interface WorkoutReminderSchedule {
  id: string;
  kind: 'workout-reminder';
  userId: string;
  cycleId: string;
  cycleWeek: number;
  workoutId: string;
  title: string;
  body: string;
  deepLink: string;
  scheduledFor: ISODateString;
}

export interface BuildWorkoutReminderScheduleInput {
  userId: string;
  preferences: Pick<NotificationPreference, 'workoutReminders'>;
  cycle: Pick<
    TrainingCycle,
    'id' | 'programVersionId' | 'currentWeek' | 'status' | 'startedAt' | 'weeks'
  >;
  programVersion: ProgramVersion;
  preferredTrainingTime: PreferredTrainingTime;
  now: Date;
  lookaheadDays?: number;
  overrides?: readonly WorkoutScheduleOverride[];
  sessions?: readonly WorkoutScheduleSession[];
}

/**
 * Creates one-shot reminders for the next week of the active cycle.
 * One-shot dates keep reminders bounded to the current cycle snapshot and
 * avoid an indefinite recurring notification after a cycle is replaced.
 */
export function buildWorkoutReminderSchedule({
  userId,
  preferences,
  cycle,
  programVersion,
  preferredTrainingTime,
  now,
  lookaheadDays = workoutReminderLookaheadDays,
  overrides = [],
  sessions = [],
}: BuildWorkoutReminderScheduleInput): WorkoutReminderSchedule[] {
  if (!preferences.workoutReminders || cycle.status !== 'active') return [];
  if (!userId.trim()) throw new Error('A user ID is required for workout reminders.');
  if (programVersion.id !== cycle.programVersionId) {
    throw new Error('The reminder program version must match the active cycle.');
  }
  if (!Number.isInteger(lookaheadDays) || lookaheadDays < 1) {
    throw new Error('Reminder lookahead must be a positive whole number of days.');
  }
  if (Number.isNaN(now.getTime())) throw new Error('A valid date is required for reminders.');

  const clock = preferredTrainingTimeClock[preferredTrainingTime];
  const firstDay = formatDateKey(now);
  const endDay = addDaysToDateKey(firstDay, lookaheadDays);
  const schedules: WorkoutReminderSchedule[] = [];
  const occurrences = buildCycleSchedule(
    cycle,
    programVersion,
    overrides.filter((item) => item.userId === userId),
    sessions,
    now,
  );
  for (const occurrence of occurrences) {
    if (
      occurrence.cycleWeek !== cycle.currentWeek ||
      !['current', 'upcoming'].includes(occurrence.status) ||
      occurrence.scheduledDate < firstDay ||
      occurrence.scheduledDate >= endDay
    )
      continue;
    const scheduledDate = parseDateKey(occurrence.scheduledDate);
    scheduledDate.setHours(clock.hour, clock.minute, 0, 0);
    if (scheduledDate.getTime() <= now.getTime()) continue;
    const workout = occurrence.workout;
    schedules.push({
      id: `shift6:workout-reminder:${userId}:${cycle.id}:${occurrence.cycleWeek}:${workout.id}:${occurrence.scheduledDate}`,
      kind: 'workout-reminder',
      userId,
      cycleId: cycle.id,
      cycleWeek: occurrence.cycleWeek,
      workoutId: workout.id,
      title: 'SHIFT6 reminder',
      body: 'Open SHIFT6 when you are ready.',
      deepLink: `/workout?workoutId=${encodeURIComponent(workout.id)}`,
      scheduledFor: scheduledDate.toISOString(),
    });
  }

  return schedules;
}
