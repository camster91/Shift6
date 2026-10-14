import type { NotificationProvider, NotificationResponsePayload } from './notifications';
import { managedRestTimerKind, managedWorkoutReminderKind } from './notificationScheduler';

// expo-notifications/src/NotificationsEmitter.ts in the installed SDK.
const supportedDefaultAction = 'expo.modules.notifications.actions.DEFAULT';

function identity(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= 512 && value.trim() === value
  );
}

/** Native event provenance and request identity, never a workout-start authorization. */
export function notificationResponseKey(
  response: NotificationResponsePayload,
  owner: string,
): string | null {
  if (
    !identity(owner) ||
    !identity(response.requestIdentifier) ||
    response.defaultActionIdentifier !== supportedDefaultAction ||
    response.actionIdentifier !== supportedDefaultAction ||
    !Number.isSafeInteger(response.deliveredAt) ||
    response.deliveredAt <= 0 ||
    !Number.isFinite(new Date(response.deliveredAt).getTime()) ||
    !response.data ||
    typeof response.data !== 'object' ||
    Array.isArray(response.data) ||
    response.data.source !== 'shift6' ||
    !identity(response.data.workoutId)
  )
    return null;
  if (response.data.kind === managedRestTimerKind) {
    if (
      !identity(response.data.sessionId) ||
      response.requestIdentifier !== `shift6:rest-timer:${response.data.sessionId}`
    )
      return null;
  } else if (response.data.kind === managedWorkoutReminderKind) {
    const { cycleId, cycleWeek, workoutId } = response.data;
    if (
      !identity(cycleId) ||
      typeof cycleWeek !== 'number' ||
      !Number.isInteger(cycleWeek) ||
      cycleWeek < 1 ||
      cycleWeek > 6
    )
      return null;
    const prefix = `shift6:workout-reminder:${owner}:${cycleId}:${cycleWeek}:${workoutId}:`;
    if (!response.requestIdentifier.startsWith(prefix)) return null;
    const date = response.requestIdentifier.slice(prefix.length);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      return null;
  } else return null;
  return JSON.stringify([
    response.requestIdentifier,
    response.actionIdentifier,
    response.deliveredAt,
  ]);
}

/** One mounted owner/database generation. Restart consumption is not durable. */
export function subscribeToSafeNotificationResponses(
  provider: Pick<NotificationProvider, 'subscribeToResponses' | 'getLastResponse'>,
  owner: string,
  isCurrent: () => boolean,
  openHome: () => void,
): () => void {
  let active = true;
  let subscription: { remove(): void } | null = null;
  const consumed = new Set<string>();
  const handle = (response: NotificationResponsePayload) => {
    if (!active || !isCurrent()) return;
    const key = notificationResponseKey(response, owner);
    if (!key || consumed.has(key)) return;
    consumed.add(key);
    openHome();
  };
  void provider
    .subscribeToResponses(handle)
    .then((next) => {
      if (active && isCurrent()) subscription = next;
      else next.remove();
    })
    .catch(() => undefined);
  void provider
    .getLastResponse()
    .then((response) => {
      if (response) handle(response);
    })
    .catch(() => undefined);
  return () => {
    active = false;
    subscription?.remove();
    consumed.clear();
  };
}
