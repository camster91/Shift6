import type { LocalNotificationRequest, NotificationProvider } from './notifications';
import {
  managedWorkoutReminderKind,
  refreshWorkoutReminderSchedule,
} from './notificationScheduler';
import { demoCycle, demoProgramVersion } from '../domain/fixtures/home';
import type { NotificationPreference } from '../domain/types';

describe('notification scheduler', () => {
  const preferences: NotificationPreference = {
    userId: 'guest-user',
    workoutReminders: true,
    restTimer: false,
    weeklyReview: false,
    cycleReview: false,
    coachMessages: false,
    updatedAt: '2026-09-14T07:00:00.000Z',
  };
  const input = {
    userId: 'guest-user',
    preferences,
    cycle: demoCycle,
    programVersion: demoProgramVersion,
    preferredTrainingTime: 'morning' as const,
    now: new Date(2026, 8, 14, 7, 30),
    lookaheadDays: 7,
  };

  it('cancels only managed reminders before replacing the bounded schedule', async () => {
    const scheduled: LocalNotificationRequest[] = [];
    const cancelled: string[] = [];
    const provider = createProvider({
      existing: [
        {
          identifier: 'shift6:workout-reminder:old',
          data: { kind: managedWorkoutReminderKind },
        },
        { identifier: 'other-app-owned', data: { kind: 'other' } },
      ],
      scheduled,
      cancelled,
    });

    await expect(refreshWorkoutReminderSchedule(provider, input)).resolves.toEqual({
      outcome: 'scheduled',
      scheduledCount: 5,
    });
    expect(cancelled).toEqual(['shift6:workout-reminder:old']);
    expect(scheduled).toHaveLength(5);
    expect(scheduled[0]).toMatchObject({
      identifier: expect.stringContaining('shift6:workout-reminder:guest-user:'),
      data: { kind: managedWorkoutReminderKind, route: expect.stringContaining('/workout?') },
    });
  });

  it('removes existing reminders without scheduling when disabled or permission is missing', async () => {
    const disabledCancelled: string[] = [];
    const disabled = createProvider({
      existing: [{ identifier: 'shift6:workout-reminder:old', data: {} }],
      cancelled: disabledCancelled,
    });
    await expect(
      refreshWorkoutReminderSchedule(disabled, {
        ...input,
        preferences: { ...preferences, workoutReminders: false },
      }),
    ).resolves.toEqual({ outcome: 'disabled', scheduledCount: 0 });
    expect(disabledCancelled).toEqual(['shift6:workout-reminder:old']);

    const permissionCancelled: string[] = [];
    const permissionRequired = createProvider({
      permission: 'not-determined',
      existing: [{ identifier: 'shift6:workout-reminder:old', data: {} }],
      cancelled: permissionCancelled,
    });
    await expect(refreshWorkoutReminderSchedule(permissionRequired, input)).resolves.toEqual({
      outcome: 'permission-required',
      scheduledCount: 0,
    });
    expect(permissionCancelled).toEqual(['shift6:workout-reminder:old']);
  });

  it('rolls back newly created reminders when a native schedule call fails', async () => {
    const scheduled: LocalNotificationRequest[] = [];
    const cancelled: string[] = [];
    const provider = createProvider({ scheduled, cancelled, failAfter: 1 });

    await expect(refreshWorkoutReminderSchedule(provider, input)).rejects.toThrow(
      'schedule failed',
    );
    expect(scheduled).toHaveLength(1);
    expect(cancelled).toHaveLength(1);
  });
});

function createProvider({
  permission = 'granted' as const,
  existing = [] as Array<{ identifier: string; data: Record<string, unknown> }>,
  scheduled = [] as LocalNotificationRequest[],
  cancelled = [] as string[],
  failAfter,
}: {
  permission?: 'granted' | 'denied' | 'not-determined' | 'unavailable';
  existing?: Array<{ identifier: string; data: Record<string, unknown> }>;
  scheduled?: LocalNotificationRequest[];
  cancelled?: string[];
  failAfter?: number;
}): NotificationProvider {
  return {
    isAvailable: async () => true,
    getPermissionStatus: async () => permission,
    requestPermission: async () => permission,
    getScheduledNotifications: async () => existing,
    scheduleLocalNotification: async (request) => {
      if (failAfter !== undefined && scheduled.length >= failAfter) {
        throw new Error('schedule failed');
      }
      scheduled.push(request);
      return request.identifier;
    },
    cancelScheduledNotification: async (identifier) => {
      cancelled.push(identifier);
    },
    subscribeToResponses: async () => ({ remove: () => undefined }),
    getLastResponse: async () => null,
  };
}
