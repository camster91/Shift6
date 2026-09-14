import { Platform } from 'react-native';
import type * as Notifications from 'expo-notifications';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'unavailable';

export interface NotificationProvider {
  isAvailable(): Promise<boolean>;
  getPermissionStatus(): Promise<NotificationPermissionStatus>;
  requestPermission(): Promise<NotificationPermissionStatus>;
}

/** Explicit web/unconfigured boundary; settings remain usable without delivery. */
export class UnavailableNotificationProvider implements NotificationProvider {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    return 'unavailable';
  }

  async requestPermission(): Promise<NotificationPermissionStatus> {
    return 'unavailable';
  }
}

/**
 * Native permission adapter for local notifications. Scheduling policy stays
 * outside this provider so domain settings do not silently create reminders.
 */
export class ExpoNotificationProvider implements NotificationProvider {
  async isAvailable(): Promise<boolean> {
    return Platform.OS !== 'web';
  }

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    if (!(await this.isAvailable())) return 'unavailable';
    const notifications = await loadNotifications();
    return mapPermissionStatus(await notifications.getPermissionsAsync());
  }

  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!(await this.isAvailable())) return 'unavailable';
    const notifications = await loadNotifications();
    const permissions = await notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
    return mapPermissionStatus(permissions);
  }
}

export function createExpoNotificationProvider(): NotificationProvider {
  return new ExpoNotificationProvider();
}

function mapPermissionStatus(
  permissions: Notifications.NotificationPermissionsStatus,
): NotificationPermissionStatus {
  if (permissions.granted) return 'granted';
  return permissions.canAskAgain ? 'not-determined' : 'denied';
}

async function loadNotifications() {
  return import('expo-notifications');
}
