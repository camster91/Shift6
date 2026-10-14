import type { LocalNotificationRequest, NotificationProvider } from './notifications';
import {
  managedWorkoutReminderKind,
  managedRestTimerKind,
  refreshRestTimerCue,
  refreshWorkoutReminderSchedule,
  cancelRestTimerCue,
} from './notificationScheduler';
import { demoCycle, demoProgramVersion } from '../domain/fixtures/home';
import type { NotificationPreference } from '../domain/types';
import type { RefreshWorkoutReminderScheduleInput } from './notificationScheduler';

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
    cycle: { ...demoCycle, startedAt: new Date(2026, 8, 14, 12).toISOString() },
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

  it('replaces the current session rest cue only after permission is granted', async () => {
    const scheduled: LocalNotificationRequest[] = [];
    const cancelled: string[] = [];
    const provider = createProvider({ scheduled, cancelled });

    await expect(
      refreshRestTimerCue(provider, {
        enabled: true,
        sessionId: 'session-1',
        workoutId: 'workout-1',
        restSeconds: 90,
        now: new Date('2026-09-14T12:00:00.000Z'),
      }),
    ).resolves.toEqual({ outcome: 'scheduled' });

    expect(cancelled).toEqual(['shift6:rest-timer:session-1']);
    expect(scheduled[0]).toMatchObject({
      identifier: 'shift6:rest-timer:session-1',
      title: 'Rest complete',
      data: { kind: managedRestTimerKind, workoutId: 'workout-1' },
    });
    expect(scheduled[0]?.scheduledFor).toEqual(new Date('2026-09-14T12:01:30.000Z'));

    const permissionCancelled: string[] = [];
    const permissionRequired = createProvider({
      permission: 'denied',
      cancelled: permissionCancelled,
    });
    await expect(
      refreshRestTimerCue(permissionRequired, {
        enabled: true,
        sessionId: 'session-1',
        workoutId: 'workout-1',
        restSeconds: 90,
        now: new Date('2026-09-14T12:00:00.000Z'),
      }),
    ).resolves.toEqual({ outcome: 'permission-required' });
    expect(permissionCancelled).toEqual(['shift6:rest-timer:session-1']);
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

test('skipping a rest cue waits for its pending native schedule and leaves no cue', async () => {
  let release!: () => void;
  let entered!: () => void;
  const permission = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const pending = new Map<string, LocalNotificationRequest>();
  const calls: string[] = [];
  const provider: NotificationProvider = {
    ...createProvider({}),
    getPermissionStatus: async () => {
      entered();
      await permission;
      return 'granted';
    },
    scheduleLocalNotification: async (request) => {
      calls.push('schedule');
      pending.set(request.identifier, request);
      return request.identifier;
    },
    cancelScheduledNotification: async (id) => {
      calls.push('cancel');
      pending.delete(id);
    },
  };
  const scheduling = refreshRestTimerCue(provider, {
    enabled: true,
    sessionId: 'race-session',
    workoutId: 'workout-1',
    restSeconds: 90,
    now: new Date('2026-10-14T12:00:00Z'),
  });
  await ready;
  const skipping = cancelRestTimerCue(provider, 'race-session');
  release();
  await Promise.all([scheduling, skipping]);
  expect(pending.size).toBe(0);
  expect(calls).toEqual(['cancel', 'schedule', 'cancel']);
});

test('a failed native rest schedule does not poison later cancellation or another session', async () => {
  const cancelled: string[] = [];
  const provider = createProvider({ failAfter: 0, cancelled });
  await expect(
    refreshRestTimerCue(provider, {
      enabled: true,
      sessionId: 'failed-rest',
      workoutId: 'workout-1',
      restSeconds: 90,
      now: new Date('2026-10-14T12:00:00Z'),
    }),
  ).rejects.toThrow('schedule failed');
  await cancelRestTimerCue(provider, 'failed-rest');
  await cancelRestTimerCue(provider, 'other-rest');
  expect(cancelled).toEqual([
    'shift6:rest-timer:failed-rest',
    'shift6:rest-timer:failed-rest',
    'shift6:rest-timer:other-rest',
  ]);
});

test('pending rest work freezes its caller values and does not block a different session', async () => {
  let release!: () => void;
  let entered!: () => void;
  const permission = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let first = true;
  const scheduled: LocalNotificationRequest[] = [];
  const provider: NotificationProvider = {
    ...createProvider({ scheduled }),
    getPermissionStatus: async () => {
      if (first) {
        first = false;
        entered();
        await permission;
      }
      return 'granted';
    },
  };
  const input = {
    enabled: true,
    sessionId: 'frozen-rest',
    workoutId: 'original-workout',
    restSeconds: 90,
    now: new Date('2026-10-14T12:00:00Z'),
  };
  const firstCue = refreshRestTimerCue(provider, input);
  await ready;
  const nextCue = refreshRestTimerCue(provider, input);
  input.workoutId = 'changed-workout';
  input.restSeconds = 1;
  input.now.setHours(20);
  const cancelled: string[] = [];
  try {
    await cancelRestTimerCue(createProvider({ cancelled }), 'independent-rest');
    expect(cancelled).toEqual(['shift6:rest-timer:independent-rest']);
  } finally {
    release();
    await Promise.allSettled([firstCue, nextCue]);
  }
  await expect(nextCue).resolves.toEqual({ outcome: 'scheduled' });
  expect(scheduled).toHaveLength(2);
  expect(scheduled[1]).toMatchObject({
    data: { workoutId: 'original-workout' },
    scheduledFor: new Date('2026-10-14T12:01:30Z'),
  });
});

test('moves cancel old native reminders and repeated reconciliation retains one pending cue per occurrence', async () => {
  const pending = new Map<string, LocalNotificationRequest>();
  const provider: NotificationProvider = {
    ...createProvider({}),
    getScheduledNotifications: async () =>
      Array.from(pending.entries()).map(([identifier, request]) => ({
        identifier,
        data: request.data,
      })),
    cancelScheduledNotification: async (id) => {
      pending.delete(id);
    },
    scheduleLocalNotification: async (request) => {
      pending.set(request.identifier, request);
      return request.identifier;
    },
  };
  const cycle = { ...demoCycle, startedAt: new Date(2026, 8, 14, 12).toISOString() };
  const input = {
    userId: 'guest-user',
    preferences: {
      userId: 'guest-user',
      workoutReminders: true,
      restTimer: false,
      weeklyReview: false,
      cycleReview: false,
      coachMessages: false,
      updatedAt: cycle.startedAt,
    },
    cycle,
    programVersion: demoProgramVersion,
    preferredTrainingTime: 'morning' as const,
    now: new Date(2026, 8, 14, 7),
  };
  await refreshWorkoutReminderSchedule(provider, input);
  const oldId = Array.from(pending.keys()).find((id) => id.endsWith(':2026-09-14'))!;
  const movedInput = {
    ...input,
    overrides: [
      {
        id: 'move',
        userId: 'guest-user',
        cycleId: cycle.id,
        cycleWeek: 1,
        workoutId: demoProgramVersion.workouts[0]!.id,
        originalDate: '2026-09-14',
        scheduledDate: '2026-09-15',
        createdAt: cycle.startedAt,
        updatedAt: cycle.startedAt,
      },
    ],
  };
  await refreshWorkoutReminderSchedule(provider, movedInput);
  expect(pending.has(oldId)).toBe(false);
  expect(pending.size).toBe(5);
  const ids = Array.from(pending.keys());
  await refreshWorkoutReminderSchedule(provider, movedInput);
  expect(Array.from(pending.keys())).toEqual(ids);
});

function workoutInput(): RefreshWorkoutReminderScheduleInput {
  return {
    userId: 'guest-user',
    preferences: {
      userId: 'guest-user',
      workoutReminders: true,
      restTimer: false,
      weeklyReview: false,
      cycleReview: false,
      coachMessages: false,
      updatedAt: demoCycle.startedAt,
    },
    cycle: { ...demoCycle, startedAt: new Date(2026, 8, 14, 12).toISOString() },
    programVersion: demoProgramVersion,
    preferredTrainingTime: 'morning',
    now: new Date(2026, 8, 14, 7),
  };
}
function workoutGate() {
  let release!: () => void, entered!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  return { pending, ready, release, entered };
}
test.each(['availability', 'scheduled-read', 'cancel', 'permission', 'schedule'])(
  'stale workout jobs stop after deferred native %s and clean only their writes',
  async (stage) => {
    const gate = workoutGate();
    let current = true;
    const cancelled: string[] = [],
      scheduled: LocalNotificationRequest[] = [];
    const base = createProvider({
      scheduled,
      cancelled,
      existing: stage === 'cancel' ? [{ identifier: 'shift6:workout-reminder:old', data: {} }] : [],
    });
    const pause = async () => {
      gate.entered();
      await gate.pending;
    };
    const provider: NotificationProvider = {
      ...base,
      isAvailable: async () => {
        if (stage === 'availability') await pause();
        return true;
      },
      getScheduledNotifications: async () => {
        if (stage === 'scheduled-read') await pause();
        return base.getScheduledNotifications();
      },
      getPermissionStatus: async () => {
        if (stage === 'permission') await pause();
        return 'granted';
      },
      cancelScheduledNotification: async (id) => {
        if (stage === 'cancel') await pause();
        await base.cancelScheduledNotification(id);
      },
      scheduleLocalNotification: async (request) => {
        if (stage === 'schedule') await pause();
        return base.scheduleLocalNotification(request);
      },
    };
    const job = refreshWorkoutReminderSchedule(provider, workoutInput(), () => current);
    await gate.ready;
    current = false;
    gate.release();
    await expect(job).resolves.toEqual({ outcome: 'stale-context', scheduledCount: 0 });
    expect(scheduled).toHaveLength(stage === 'schedule' ? 1 : 0);
    if (stage === 'schedule') expect(cancelled).toEqual([scheduled[0]!.identifier]);
    else expect(cancelled).toEqual(stage === 'cancel' ? ['shift6:workout-reminder:old'] : []);
  },
);
test('stale schedule cleanup holds the queue until settled; a successor keeps reused IDs and captured inputs', async () => {
  const scheduleGate = workoutGate(),
    cleanupGate = workoutGate();
  const pending = new Map<string, LocalNotificationRequest>();
  let current = true,
    first = true,
    blockCleanup = true;
  const calls: string[] = [];
  const provider: NotificationProvider = {
    ...createProvider({}),
    getScheduledNotifications: async () => {
      calls.push('read');
      return [...pending].map(([identifier, request]) => ({ identifier, data: request.data }));
    },
    scheduleLocalNotification: async (request) => {
      if (first) {
        first = false;
        scheduleGate.entered();
        await scheduleGate.pending;
      }
      calls.push('schedule');
      pending.set(request.identifier, request);
      return request.identifier;
    },
    cancelScheduledNotification: async (id) => {
      if (blockCleanup) {
        blockCleanup = false;
        cleanupGate.entered();
        await cleanupGate.pending;
      }
      calls.push('cancel');
      pending.delete(id);
    },
  };
  const old = refreshWorkoutReminderSchedule(provider, workoutInput(), () => current);
  await scheduleGate.ready;
  current = false;
  scheduleGate.release();
  await cleanupGate.ready;
  const input = workoutInput();
  const successor = refreshWorkoutReminderSchedule(provider, input, () => true);
  input.preferences.workoutReminders = false;
  input.cycle!.status = 'complete';
  input.now.setHours(23);
  try {
    await Promise.resolve();
    expect(calls).toEqual(['read', 'schedule']);
  } finally {
    cleanupGate.release();
    await Promise.allSettled([old, successor]);
  }
  await expect(old).resolves.toEqual({ outcome: 'stale-context', scheduledCount: 0 });
  await expect(successor).resolves.toEqual({ outcome: 'scheduled', scheduledCount: 5 });
  expect(calls.slice(0, 4)).toEqual(['read', 'schedule', 'cancel', 'read']);
  expect(pending.size).toBe(5);
  expect([...pending.values()].every((request) => request.scheduledFor.getHours() === 8)).toBe(
    true,
  );
});
test('failed workout reconciliation does not poison the next queued job', async () => {
  await expect(
    refreshWorkoutReminderSchedule(createProvider({ failAfter: 0 }), workoutInput(), () => true),
  ).rejects.toThrow('schedule failed');
  await expect(
    refreshWorkoutReminderSchedule(createProvider({}), workoutInput(), () => true),
  ).resolves.toEqual({ outcome: 'scheduled', scheduledCount: 5 });
});
