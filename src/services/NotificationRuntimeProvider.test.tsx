import { act, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { NotificationRuntimeProvider, useNotificationRuntime } from './NotificationRuntimeProvider';
import type { NotificationResponsePayload } from './notifications';
import { demoCycle, demoProgramVersion } from '../domain/fixtures/home';

let mockDb: object | null = {};
let mockOwner = 'owner';
const mockPreferences = jest.fn();
const mockRefreshSchedule = jest.fn();
const mockCycle = jest.fn(),
  mockProgram = jest.fn(),
  mockOverrides = jest.fn();
const mockListeners: ((response: NotificationResponsePayload) => void)[] = [];
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('./UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../db/notificationRepository', () => ({
  getNotificationPreferences: (...args: unknown[]) => mockPreferences(...args),
}));
jest.mock('../db/profileRepository', () => ({ getOnboardingProfile: async () => null }));
jest.mock('../db/cycleRepository', () => ({
  getActiveTrainingCycle: (...args: unknown[]) => mockCycle(...args),
}));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: (...args: unknown[]) => mockProgram(...args),
}));
jest.mock('../db/calendarRepository', () => ({
  getWorkoutScheduleOverrides: (...args: unknown[]) => mockOverrides(...args),
  getWorkoutScheduleSessions: async () => [],
}));
jest.mock('./notificationScheduler', () => ({
  managedRestTimerKind: 'shift6-rest-timer',
  managedWorkoutReminderKind: 'shift6-workout-reminder',
  refreshWorkoutReminderSchedule: (...args: unknown[]) => mockRefreshSchedule(...args),
}));
jest.mock('./notifications', () => ({
  createExpoNotificationProvider: () => ({
    getLastResponse: async () => null,
    subscribeToResponses: async (listener: (response: NotificationResponsePayload) => void) => {
      mockListeners.push(listener);
      return { remove: jest.fn() };
    },
  }),
}));
const response: NotificationResponsePayload = {
  requestIdentifier: 'shift6:rest-timer:session',
  actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
  defaultActionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
  deliveredAt: 1792022400000,
  data: {
    source: 'shift6',
    kind: 'shift6-rest-timer',
    sessionId: 'session',
    workoutId: 'private-workout',
    route: '/workout?workoutId=private-workout',
  },
};
beforeEach(() => {
  mockOwner = 'owner';
  mockListeners.length = 0;
  jest.clearAllMocks();
  mockDb = {};
  mockPreferences.mockResolvedValue({ userId: 'owner', workoutReminders: false });
  mockRefreshSchedule.mockResolvedValue({ outcome: 'disabled', scheduledCount: 0 });
  mockCycle.mockResolvedValue(null);
  mockProgram.mockResolvedValue(null);
  mockOverrides.mockResolvedValue([]);
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
test.each(['owner', 'database', 'unmount', 'owner-ABA'])(
  'stops an obsolete refresh after a deferred database read: %s',
  async (change) => {
    const pending = deferred<{ userId: string; workoutReminders: boolean }>();
    mockPreferences.mockImplementationOnce(() => pending.promise);
    const screen = await render(<NotificationRuntimeProvider>{null}</NotificationRuntimeProvider>);
    if (change === 'unmount') await screen.unmount();
    else {
      if (change === 'database') mockDb = {};
      else mockOwner = 'replacement';
      await screen.rerender(<NotificationRuntimeProvider>{null}</NotificationRuntimeProvider>);
      if (change === 'owner-ABA') {
        mockOwner = 'owner';
        await screen.rerender(<NotificationRuntimeProvider>{null}</NotificationRuntimeProvider>);
      }
    }
    const before = mockRefreshSchedule.mock.calls.length;
    await act(async () => pending.resolve({ userId: 'owner', workoutReminders: true }));
    expect(mockRefreshSchedule.mock.calls.length).toBe(before);
    if (change !== 'unmount') await screen.unmount();
  },
);

test('an obsolete schedule result does not replace the new owner snapshot', async () => {
  const pending = deferred<{ outcome: 'scheduled'; scheduledCount: number }>();
  mockRefreshSchedule.mockImplementationOnce(() => pending.promise);
  let snapshot: ReturnType<typeof useNotificationRuntime> | null = null;
  function ReadStatus() {
    snapshot = useNotificationRuntime();
    return null;
  }
  const screen = await render(
    <NotificationRuntimeProvider>
      <ReadStatus />
    </NotificationRuntimeProvider>,
  );
  const oldGuard = mockRefreshSchedule.mock.calls[0]![2] as () => boolean;
  expect(oldGuard()).toBe(true);
  mockOwner = 'replacement';
  await screen.rerender(
    <NotificationRuntimeProvider>
      <ReadStatus />
    </NotificationRuntimeProvider>,
  );
  expect(oldGuard()).toBe(false);
  await act(async () => pending.resolve({ outcome: 'scheduled', scheduledCount: 5 }));
  expect(snapshot).toMatchObject({ status: 'disabled', scheduledCount: 0 });
  await screen.unmount();
});

test.each(['program', 'calendar'])(
  'a replacement stops refresh after deferred %s records',
  async (stage) => {
    const pending = deferred<unknown>();
    mockCycle.mockResolvedValue({ ...demoCycle, userId: 'owner' });
    mockProgram.mockResolvedValue({ version: demoProgramVersion });
    if (stage === 'program') mockProgram.mockImplementationOnce(() => pending.promise);
    else mockOverrides.mockImplementationOnce(() => pending.promise);
    const screen = await render(<NotificationRuntimeProvider>{null}</NotificationRuntimeProvider>);
    expect(stage === 'program' ? mockProgram : mockOverrides).toHaveBeenCalledTimes(1);
    mockOwner = 'replacement';
    mockCycle.mockResolvedValue(null);
    await screen.rerender(<NotificationRuntimeProvider>{null}</NotificationRuntimeProvider>);
    const before = mockRefreshSchedule.mock.calls.length;
    await act(async () =>
      pending.resolve(stage === 'program' ? { version: demoProgramVersion } : []),
    );
    expect(mockRefreshSchedule.mock.calls.length).toBe(before);
    await screen.unmount();
  },
);

test('records already read cannot be mutated while a later database read is pending', async () => {
  const pending = deferred<unknown>();
  const cycle = { ...demoCycle, userId: 'owner', currentWeek: 1 };
  const preferences = { userId: 'owner', workoutReminders: false };
  mockCycle.mockResolvedValue(cycle);
  mockPreferences.mockResolvedValue(preferences);
  mockProgram.mockImplementationOnce(() => pending.promise);
  const screen = await render(<NotificationRuntimeProvider>{null}</NotificationRuntimeProvider>);
  preferences.workoutReminders = true;
  cycle.currentWeek = 6;
  await act(async () => pending.resolve({ version: demoProgramVersion }));
  expect(mockRefreshSchedule.mock.calls[0]![1]).toMatchObject({
    preferences: { workoutReminders: false },
    cycle: { currentWeek: 1 },
  });
  await screen.unmount();
});
test('a supported native tap opens Home, never the notification workout route', async () => {
  const screen = await render(<NotificationRuntimeProvider>{null}</NotificationRuntimeProvider>);
  await act(() => mockListeners[0]!(response));
  expect(router.push).toHaveBeenCalledTimes(1);
  expect(router.push).toHaveBeenCalledWith('/');
  await screen.unmount();
  await act(() => mockListeners[0]!(response));
  expect(router.push).toHaveBeenCalledTimes(1);
});
test('changing the local owner invalidates the previous generation listener', async () => {
  const screen = await render(<NotificationRuntimeProvider>{null}</NotificationRuntimeProvider>);
  const previous = mockListeners[0]!;
  mockOwner = 'new-owner';
  await screen.rerender(<NotificationRuntimeProvider>{null}</NotificationRuntimeProvider>);
  await act(() => previous(response));
  expect(router.push).not.toHaveBeenCalled();
  await screen.unmount();
});

test('a retained refresh invoked only after owner A to B to A cannot adopt the new A lease', async () => {
  let context!: ReturnType<typeof useNotificationRuntime>;
  function Read() {
    context = useNotificationRuntime();
    return null;
  }
  const view = () => (
    <NotificationRuntimeProvider>
      <Read />
    </NotificationRuntimeProvider>
  );
  const screen = await render(view());
  const retained = context.refreshNow;
  mockOwner = 'owner-B';
  await screen.rerender(view());
  mockOwner = 'owner';
  await screen.rerender(view());
  const reads = mockPreferences.mock.calls.length,
    schedules = mockRefreshSchedule.mock.calls.length;
  let result: unknown;
  try {
    await act(async () => {
      result = await retained();
    });
    expect(result).toEqual({ status: 'stale-context', scheduledCount: 0 });
    expect(mockPreferences.mock.calls.length).toBe(reads);
    expect(mockRefreshSchedule.mock.calls.length).toBe(schedules);
  } finally {
    await screen.unmount();
  }
});

test('a missing database exposes unavailable zero immediately after a scheduled snapshot', async () => {
  mockRefreshSchedule.mockResolvedValueOnce({ outcome: 'scheduled', scheduledCount: 5 });
  const rendered: { status: string; scheduledCount: number }[] = [];
  function Read() {
    const value = useNotificationRuntime();
    rendered.push({ status: value.status, scheduledCount: value.scheduledCount });
    return null;
  }
  const view = () => (
    <NotificationRuntimeProvider>
      <Read />
    </NotificationRuntimeProvider>
  );
  const screen = await render(view());
  expect(rendered.at(-1)).toEqual({ status: 'scheduled', scheduledCount: 5 });
  rendered.length = 0;
  mockDb = null;
  try {
    await screen.rerender(view());
    expect(rendered[0]).toEqual({ status: 'unavailable', scheduledCount: 0 });
    expect(rendered.every((value) => value.scheduledCount === 0)).toBe(true);
  } finally {
    await screen.unmount();
  }
});

test.each(['owner', 'database'])(
  'the first %s replacement render filters a previous scheduled snapshot',
  async (replacement) => {
    mockRefreshSchedule.mockResolvedValueOnce({ outcome: 'scheduled', scheduledCount: 5 });
    const rendered: { status: string; scheduledCount: number }[] = [];
    function Read() {
      const value = useNotificationRuntime();
      rendered.push({ status: value.status, scheduledCount: value.scheduledCount });
      return null;
    }
    const view = () => (
      <NotificationRuntimeProvider>
        <Read />
      </NotificationRuntimeProvider>
    );
    const screen = await render(view());
    expect(rendered.at(-1)).toEqual({ status: 'scheduled', scheduledCount: 5 });
    rendered.length = 0;
    if (replacement === 'owner') mockOwner = 'replacement';
    else mockDb = {};
    try {
      await screen.rerender(view());
      expect(rendered[0]).toEqual({ status: 'idle', scheduledCount: 0 });
      expect(rendered.every((value) => value.scheduledCount === 0)).toBe(true);
    } finally {
      await screen.unmount();
    }
  },
);
