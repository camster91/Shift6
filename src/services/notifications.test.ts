import {
  ExpoNotificationProvider,
  shift6ReminderChannelId,
  UnavailableNotificationProvider,
  type NotificationModule,
  type NotificationPermissionStatus,
} from './notifications';
import { Platform } from 'react-native';

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockSetNotificationHandler = jest.fn();
const mockResponseListener = jest.fn();
const mockLastResponse = jest.fn();

describe('notification provider boundary', () => {
  it('preserves native action, request and delivery identity for cached and live responses', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const native = {
      actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
      notification: {
        date: 1792022400000,
        request: {
          identifier: 'shift6:rest-timer:session',
          content: {
            data: {
              source: 'shift6',
              kind: 'shift6-rest-timer',
              sessionId: 'session',
              workoutId: 'workout',
            },
          },
        },
      },
    };
    mockLastResponse.mockResolvedValue(native);
    const provider = new ExpoNotificationProvider(loadMockNotifications);
    const received = jest.fn();
    await provider.subscribeToResponses(received);
    mockResponseListener.mock.calls[0]![0](native);
    const expected = {
      requestIdentifier: native.notification.request.identifier,
      deliveredAt: native.notification.date,
      actionIdentifier: native.actionIdentifier,
      defaultActionIdentifier: native.actionIdentifier,
      data: native.notification.request.content.data,
    };
    expect(received).toHaveBeenCalledWith(expected);
    await expect(provider.getLastResponse()).resolves.toEqual(expected);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('keeps delivery unavailable explicit without a native runtime', async () => {
    const provider = new UnavailableNotificationProvider();

    await expect(provider.isAvailable()).resolves.toBe(false);
    await expect(provider.getPermissionStatus()).resolves.toBe<NotificationPermissionStatus>(
      'unavailable',
    );
    await expect(provider.requestPermission()).resolves.toBe('unavailable');
    await expect(provider.getScheduledNotifications()).resolves.toEqual([]);
    await expect(provider.getLastResponse()).resolves.toBeNull();
    const subscription = await provider.subscribeToResponses(() => undefined);
    expect(subscription).toEqual({ remove: expect.any(Function) });
    subscription.remove();
  });

  it('creates the Android reminder channel before requesting permission', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockSetNotificationChannelAsync.mockResolvedValue(null);
    mockRequestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });

    const provider = new ExpoNotificationProvider(loadMockNotifications);
    await expect(provider.requestPermission()).resolves.toBe('granted');

    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(shift6ReminderChannelId, {
      name: 'SHIFT6 reminders',
      description: 'Workout reminders and active-session rest timer cues.',
      importance: 3,
    });
    expect(mockSetNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockRequestPermissionsAsync.mock.invocationCallOrder[0]!,
    );
  });

  it('schedules Android reminders through the managed channel', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockSetNotificationChannelAsync.mockResolvedValue(null);
    mockScheduleNotificationAsync.mockResolvedValue('scheduled-id');
    const scheduledFor = new Date('2026-09-19T15:00:00.000Z');

    const provider = new ExpoNotificationProvider(loadMockNotifications);
    await expect(
      provider.scheduleLocalNotification({
        identifier: 'shift6:test',
        title: 'Workout reminder',
        body: 'Ready when you are.',
        data: { workoutId: 'workout-1' },
        scheduledFor,
      }),
    ).resolves.toBe('scheduled-id');

    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'shift6:test',
        trigger: {
          type: 'date',
          date: scheduledFor,
          channelId: shift6ReminderChannelId,
        },
      }),
    );
  });

  it('maps native permission responses without requesting again', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });

    const provider = new ExpoNotificationProvider(loadMockNotifications);
    await expect(provider.getPermissionStatus()).resolves.toBe('denied');
    expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('reports an Android denial even when another permission prompt remains possible', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const denial = { status: 'denied', granted: false, canAskAgain: true };
    mockGetPermissionsAsync.mockResolvedValue(denial);
    mockRequestPermissionsAsync.mockResolvedValue(denial);
    const provider = new ExpoNotificationProvider(loadMockNotifications);

    await expect(provider.getPermissionStatus()).resolves.toBe('denied');
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    // Retrying remains an explicit caller action; mapping must not suppress it.
    await expect(provider.requestPermission()).resolves.toBe('denied');
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps an unrequested permission distinct from denial', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockGetPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
      granted: false,
      canAskAgain: true,
    });
    const provider = new ExpoNotificationProvider(loadMockNotifications);
    await expect(provider.getPermissionStatus()).resolves.toBe('not-determined');
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('recognizes iOS provisional notification delivery without prompting', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockGetPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
      granted: false,
      canAskAgain: true,
      ios: { status: 3 },
    });
    const provider = new ExpoNotificationProvider(loadMockNotifications);
    await expect(provider.getPermissionStatus()).resolves.toBe('granted');
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });
});

async function loadMockNotifications(): Promise<NotificationModule> {
  return {
    DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
    AndroidImportance: { DEFAULT: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    addNotificationResponseReceivedListener: (...args: unknown[]) => {
      mockResponseListener(...args);
      return { remove: jest.fn() };
    },
    cancelScheduledNotificationAsync: jest.fn(),
    getAllScheduledNotificationsAsync: jest.fn(async () => []),
    getLastNotificationResponseAsync: (...args: unknown[]) => mockLastResponse(...args),
    getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
    requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
    scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
    setNotificationChannelAsync: (...args: unknown[]) => mockSetNotificationChannelAsync(...args),
    setNotificationHandler: (...args: unknown[]) => mockSetNotificationHandler(...args),
  } as unknown as NotificationModule;
}
