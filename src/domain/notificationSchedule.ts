import { getDayOfWeek } from './home';
import type {
  ISODateString,
  NotificationPreference,
  PreferredTrainingTime,
  ProgramVersion,
  TrainingCycle,
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
  cycle: Pick<TrainingCycle, 'id' | 'programVersionId' | 'currentWeek' | 'status'>;
  programVersion: ProgramVersion;
  preferredTrainingTime: PreferredTrainingTime;
  now: Date;
  lookaheadDays?: number;
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
  const firstDay = new Date(now);
  firstDay.setHours(0, 0, 0, 0);
  const schedules: WorkoutReminderSchedule[] = [];

  for (let dayOffset = 0; dayOffset < lookaheadDays; dayOffset += 1) {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + dayOffset);
    const dayOfWeek = getDayOfWeek(date);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(clock.hour, clock.minute, 0, 0);
    if (scheduledDate.getTime() <= now.getTime()) continue;

    const workouts = programVersion.workouts
      .filter((workout) => workout.dayOfWeek === dayOfWeek)
      .sort(
        (left, right) =>
          Number(Boolean(left.isOptional)) - Number(Boolean(right.isOptional)) ||
          left.id.localeCompare(right.id),
      );

    for (const workout of workouts) {
      const dateKey = formatDateKey(scheduledDate);
      schedules.push({
        id: `shift6:workout-reminder:${userId}:${cycle.id}:${cycle.currentWeek}:${workout.id}:${dateKey}`,
        kind: 'workout-reminder',
        userId,
        cycleId: cycle.id,
        cycleWeek: cycle.currentWeek,
        workoutId: workout.id,
        title: `${workout.title} is coming up`,
        body: `Week ${cycle.currentWeek} · ${workout.estimatedDurationMinutes} min · Tap to get started.`,
        deepLink: `/workout?workoutId=${encodeURIComponent(workout.id)}`,
        scheduledFor: scheduledDate.toISOString(),
      });
    }
  }

  return schedules;
}

function formatDateKey(date: Date): string {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
}
