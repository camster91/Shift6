import {
  UnavailableNotificationProvider,
  type NotificationPermissionStatus,
} from './notifications';

describe('notification provider boundary', () => {
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
});
