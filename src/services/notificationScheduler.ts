import {
  buildWorkoutReminderSchedule,
  type WorkoutReminderSchedule,
} from '../domain/notificationSchedule';
import type {
  NotificationPreference,
  PreferredTrainingTime,
  ProgramVersion,
  TrainingCycle,
} from '../domain/types';
import type { NotificationProvider, ScheduledNotification } from './notifications';

export const managedWorkoutReminderKind = 'shift6-workout-reminder';

export interface RefreshWorkoutReminderScheduleInput {
  userId: string;
  preferences: NotificationPreference;
  cycle: Pick<TrainingCycle, 'id' | 'programVersionId' | 'currentWeek' | 'status'> | null;
  programVersion: ProgramVersion | null;
  preferredTrainingTime: PreferredTrainingTime;
  now: Date;
  lookaheadDays?: number;
}

export type WorkoutReminderScheduleOutcome =
  'scheduled' | 'disabled' | 'no-active-cycle' | 'permission-required' | 'unavailable';

export interface WorkoutReminderScheduleResult {
  outcome: WorkoutReminderScheduleOutcome;
  scheduledCount: number;
}

/**
 * Reconciles only SHIFT6-owned workout reminders. Existing app-managed
 * reminders are cancelled before the new bounded schedule is written, which
 * prevents stale cycle/version reminders and retry duplicates.
 */
export async function refreshWorkoutReminderSchedule(
  provider: NotificationProvider,
  input: RefreshWorkoutReminderScheduleInput,
): Promise<WorkoutReminderScheduleResult> {
  if (!(await provider.isAvailable())) {
    return { outcome: 'unavailable', scheduledCount: 0 };
  }

  const existing = await provider.getScheduledNotifications();
  const managed = existing.filter(isManagedWorkoutReminder);
  for (const notification of managed) {
    await provider.cancelScheduledNotification(notification.identifier);
  }

  if (!input.preferences.workoutReminders) {
    return { outcome: 'disabled', scheduledCount: 0 };
  }
  if (!input.cycle || !input.programVersion) {
    return { outcome: 'no-active-cycle', scheduledCount: 0 };
  }

  const permission = await provider.getPermissionStatus();
  if (permission !== 'granted') {
    return { outcome: 'permission-required', scheduledCount: 0 };
  }

  const schedules = buildWorkoutReminderSchedule({
    userId: input.userId,
    preferences: input.preferences,
    cycle: input.cycle,
    programVersion: input.programVersion,
    preferredTrainingTime: input.preferredTrainingTime,
    now: input.now,
    lookaheadDays: input.lookaheadDays,
  });
  const createdIdentifiers: string[] = [];

  try {
    for (const schedule of schedules) {
      const identifier = await provider.scheduleLocalNotification(toNotificationRequest(schedule));
      createdIdentifiers.push(identifier);
    }
  } catch (error) {
    await Promise.allSettled(
      createdIdentifiers.map((identifier) => provider.cancelScheduledNotification(identifier)),
    );
    throw error;
  }

  return { outcome: 'scheduled', scheduledCount: schedules.length };
}

function isManagedWorkoutReminder(notification: ScheduledNotification): boolean {
  return (
    notification.identifier.startsWith('shift6:workout-reminder:') ||
    notification.data.kind === managedWorkoutReminderKind
  );
}

function toNotificationRequest(schedule: WorkoutReminderSchedule) {
  return {
    identifier: schedule.id,
    title: schedule.title,
    body: schedule.body,
    data: {
      source: 'shift6',
      kind: managedWorkoutReminderKind,
      cycleId: schedule.cycleId,
      cycleWeek: schedule.cycleWeek,
      workoutId: schedule.workoutId,
      route: schedule.deepLink,
    },
    scheduledFor: new Date(schedule.scheduledFor),
  };
}
