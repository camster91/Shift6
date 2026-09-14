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
export const managedRestTimerKind = 'shift6-rest-timer';

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

export interface RefreshRestTimerCueInput {
  enabled: boolean;
  sessionId: string;
  workoutId: string;
  restSeconds: number;
  now: Date;
}

export type RestTimerCueOutcome = 'scheduled' | 'disabled' | 'permission-required' | 'unavailable';

export interface RestTimerCueResult {
  outcome: RestTimerCueOutcome;
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

/**
 * Maintains one local rest cue for the active session. Set completion is
 * persisted by the workout repository before this best-effort side effect is
 * attempted, so notification availability can never block workout logging.
 */
export async function refreshRestTimerCue(
  provider: NotificationProvider,
  input: RefreshRestTimerCueInput,
): Promise<RestTimerCueResult> {
  if (!(await provider.isAvailable())) return { outcome: 'unavailable' };

  const identifier = restTimerIdentifier(input.sessionId);
  await provider.cancelScheduledNotification(identifier);
  if (!input.enabled) return { outcome: 'disabled' };
  if (!Number.isInteger(input.restSeconds) || input.restSeconds < 1) {
    throw new Error('Rest timer must be a positive whole number of seconds.');
  }
  if (Number.isNaN(input.now.getTime())) {
    throw new Error('A valid date is required for a rest cue.');
  }

  const permission = await provider.getPermissionStatus();
  if (permission !== 'granted') return { outcome: 'permission-required' };

  await provider.scheduleLocalNotification({
    identifier,
    title: 'Rest complete',
    body: 'Time for the next set.',
    data: {
      source: 'shift6',
      kind: managedRestTimerKind,
      sessionId: input.sessionId,
      workoutId: input.workoutId,
      route: `/workout?workoutId=${encodeURIComponent(input.workoutId)}`,
    },
    scheduledFor: new Date(input.now.getTime() + input.restSeconds * 1000),
  });

  return { outcome: 'scheduled' };
}

export async function cancelRestTimerCue(
  provider: NotificationProvider,
  sessionId: string,
): Promise<void> {
  if (!(await provider.isAvailable())) return;
  await provider.cancelScheduledNotification(restTimerIdentifier(sessionId));
}

function isManagedWorkoutReminder(notification: ScheduledNotification): boolean {
  return (
    notification.identifier.startsWith('shift6:workout-reminder:') ||
    notification.data.kind === managedWorkoutReminderKind
  );
}

function restTimerIdentifier(sessionId: string): string {
  return `shift6:rest-timer:${sessionId}`;
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
