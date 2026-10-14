import {
  buildWorkoutReminderSchedule,
  type WorkoutReminderSchedule,
} from '../domain/notificationSchedule';
import type {
  NotificationPreference,
  PreferredTrainingTime,
  ProgramVersion,
  TrainingCycle,
  WorkoutScheduleOverride,
  WorkoutScheduleSession,
} from '../domain/types';
import type { NotificationProvider, ScheduledNotification } from './notifications';

export const managedWorkoutReminderKind = 'shift6-workout-reminder';
export const managedRestTimerKind = 'shift6-rest-timer';

export interface RefreshWorkoutReminderScheduleInput {
  userId: string;
  preferences: NotificationPreference;
  cycle: Pick<
    TrainingCycle,
    'id' | 'programVersionId' | 'currentWeek' | 'status' | 'startedAt' | 'weeks'
  > | null;
  programVersion: ProgramVersion | null;
  preferredTrainingTime: PreferredTrainingTime;
  now: Date;
  lookaheadDays?: number;
  overrides?: readonly WorkoutScheduleOverride[];
  sessions?: readonly WorkoutScheduleSession[];
}

export type WorkoutReminderScheduleOutcome =
  | 'scheduled'
  | 'disabled'
  | 'no-active-cycle'
  | 'permission-required'
  | 'unavailable'
  | 'stale-context';

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
 * Context-bound callers must supply their live generation guard. Omitting it
 * is only for standalone reconciliation with no runtime owner lifecycle.
 */
export function refreshWorkoutReminderSchedule(
  provider: NotificationProvider,
  input: RefreshWorkoutReminderScheduleInput,
  isCurrent: () => boolean = () => true,
): Promise<WorkoutReminderScheduleResult> {
  // Domain records are JSON snapshots. Capture before waiting on another job.
  const captured = JSON.parse(JSON.stringify(input)) as RefreshWorkoutReminderScheduleInput;
  captured.now = new Date(input.now.getTime());
  const result = workoutReminderOperation.then(() =>
    refreshWorkoutReminderScheduleNow(provider, captured, isCurrent),
  );
  workoutReminderOperation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

// All workout reconciliation jobs share the lock, even across owner/database
// replacement. Stale cleanup must finish before a successor can reuse IDs.
let workoutReminderOperation: Promise<void> = Promise.resolve();

async function refreshWorkoutReminderScheduleNow(
  provider: NotificationProvider,
  input: RefreshWorkoutReminderScheduleInput,
  isCurrent: () => boolean,
): Promise<WorkoutReminderScheduleResult> {
  const stale: WorkoutReminderScheduleResult = { outcome: 'stale-context', scheduledCount: 0 };
  if (!isCurrent()) return stale;
  const available = await provider.isAvailable();
  if (!isCurrent()) return stale;
  if (!available) {
    return { outcome: 'unavailable', scheduledCount: 0 };
  }

  const existing = await provider.getScheduledNotifications();
  if (!isCurrent()) return stale;
  const managed = existing.filter(isManagedWorkoutReminder);
  for (const notification of managed) {
    if (!isCurrent()) return stale;
    await provider.cancelScheduledNotification(notification.identifier);
    if (!isCurrent()) return stale;
  }

  if (!input.preferences.workoutReminders) {
    return { outcome: 'disabled', scheduledCount: 0 };
  }
  if (!input.cycle || !input.programVersion) {
    return { outcome: 'no-active-cycle', scheduledCount: 0 };
  }

  const permission = await provider.getPermissionStatus();
  if (!isCurrent()) return stale;
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
    overrides: input.overrides,
    sessions: input.sessions,
  });
  const createdIdentifiers: string[] = [];
  let cleanupAttempted = false;
  const cleanup = async () => {
    cleanupAttempted = true;
    // These are this job's writes. Hold the lock until their cleanup settles,
    // so an old callback cannot cancel a successor's identically named cue.
    const results = await Promise.allSettled(
      createdIdentifiers.map((identifier) => provider.cancelScheduledNotification(identifier)),
    );
    if (results.some((result) => result.status === 'rejected'))
      throw new Error('Reminder cleanup failed. Refresh reminders again.');
  };

  try {
    for (const schedule of schedules) {
      if (!isCurrent()) {
        await cleanup();
        return stale;
      }
      const identifier = await provider.scheduleLocalNotification(toNotificationRequest(schedule));
      createdIdentifiers.push(identifier);
      if (!isCurrent()) {
        await cleanup();
        return stale;
      }
    }
  } catch (error) {
    if (!cleanupAttempted) await cleanup();
    throw error;
  }

  return { outcome: 'scheduled', scheduledCount: schedules.length };
}

/**
 * Maintains one local rest cue for the active session. Set completion is
 * persisted by the workout repository before this best-effort side effect is
 * attempted, so notification availability can never block workout logging.
 */
export function refreshRestTimerCue(
  provider: NotificationProvider,
  input: RefreshRestTimerCueInput,
): Promise<RestTimerCueResult> {
  const captured = { ...input, now: new Date(input.now.getTime()) };
  return queueRestCueOperation(captured.sessionId, () =>
    refreshRestTimerCueNow(provider, captured),
  );
}

async function refreshRestTimerCueNow(
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

export function cancelRestTimerCue(
  provider: NotificationProvider,
  sessionId: string,
): Promise<void> {
  return queueRestCueOperation(sessionId, async () => {
    if (!(await provider.isAvailable())) return;
    await provider.cancelScheduledNotification(restTimerIdentifier(sessionId));
  });
}

// Native scheduling can settle after Skip or unmount. Preserve call order for
// each session so cancellation follows its pending schedule, even after failure.
const restCueOperations = new Map<string, Promise<void>>();

function queueRestCueOperation<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
  const previous = restCueOperations.get(sessionId) ?? Promise.resolve();
  const result = previous.then(operation);
  const settled = result.then(
    () => undefined,
    () => undefined,
  );
  restCueOperations.set(sessionId, settled);
  void settled.then(() => {
    if (restCueOperations.get(sessionId) === settled) restCueOperations.delete(sessionId);
  });
  return result;
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
