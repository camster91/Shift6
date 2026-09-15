import { Platform } from 'react-native';
import type * as Notifications from 'expo-notifications';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'unavailable';

export interface ScheduledNotification {
  identifier: string;
  data: Record<string, unknown>;
}

export interface LocalNotificationRequest {
  identifier: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  scheduledFor: Date;
}

export interface NotificationResponsePayload {
  data: Record<string, unknown>;
}

export interface NotificationResponseSubscription {
  remove(): void;
}

export interface NotificationProvider {
  isAvailable(): Promise<boolean>;
  getPermissionStatus(): Promise<NotificationPermissionStatus>;
  requestPermission(): Promise<NotificationPermissionStatus>;
  getScheduledNotifications(): Promise<readonly ScheduledNotification[]>;
  scheduleLocalNotification(request: LocalNotificationRequest): Promise<string>;
  cancelScheduledNotification(identifier: string): Promise<void>;
  subscribeToResponses(
    listener: (response: NotificationResponsePayload) => void,
  ): Promise<NotificationResponseSubscription>;
  getLastResponse(): Promise<NotificationResponsePayload | null>;
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

  async getScheduledNotifications(): Promise<readonly ScheduledNotification[]> {
    return [];
  }

  async scheduleLocalNotification(_request: LocalNotificationRequest): Promise<string> {
    throw new Error('Native notification delivery is unavailable.');
  }

  async cancelScheduledNotification(_identifier: string): Promise<void> {
    return undefined;
  }

  async subscribeToResponses(
    _listener: (response: NotificationResponsePayload) => void,
  ): Promise<NotificationResponseSubscription> {
    return { remove: () => undefined };
  }

  async getLastResponse(): Promise<NotificationResponsePayload | null> {
    return null;
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
    configurePresentationHandler(notifications);
    return mapPermissionStatus(await notifications.getPermissionsAsync());
  }

  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!(await this.isAvailable())) return 'unavailable';
    const notifications = await loadNotifications();
    configurePresentationHandler(notifications);
    const permissions = await notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
    return mapPermissionStatus(permissions);
  }

  async getScheduledNotifications(): Promise<readonly ScheduledNotification[]> {
    if (!(await this.isAvailable())) return [];
    const notifications = await loadNotifications();
    configurePresentationHandler(notifications);
    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    return scheduled.map((request) => ({
      identifier: request.identifier,
      data: request.content.data ?? {},
    }));
  }

  async scheduleLocalNotification(request: LocalNotificationRequest): Promise<string> {
    if (!(await this.isAvailable())) {
      throw new Error('Native notification delivery is unavailable.');
    }
    const notifications = await loadNotifications();
    configurePresentationHandler(notifications);
    return notifications.scheduleNotificationAsync({
      identifier: request.identifier,
      content: {
        title: request.title,
        body: request.body,
        data: request.data,
        sound: false,
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: request.scheduledFor,
      },
    });
  }

  async cancelScheduledNotification(identifier: string): Promise<void> {
    if (!(await this.isAvailable())) return;
    const notifications = await loadNotifications();
    await notifications.cancelScheduledNotificationAsync(identifier);
  }

  async subscribeToResponses(
    listener: (response: NotificationResponsePayload) => void,
  ): Promise<NotificationResponseSubscription> {
    if (!(await this.isAvailable())) return { remove: () => undefined };
    const notifications = await loadNotifications();
    const subscription = notifications.addNotificationResponseReceivedListener((response) => {
      listener({ data: response.notification.request.content.data ?? {} });
    });
    return subscription;
  }

  async getLastResponse(): Promise<NotificationResponsePayload | null> {
    if (!(await this.isAvailable())) return null;
    const notifications = await loadNotifications();
    const response = await notifications.getLastNotificationResponseAsync();
    return response ? { data: response.notification.request.content.data ?? {} } : null;
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

let presentationHandlerConfigured = false;

function configurePresentationHandler(notifications: typeof Notifications): void {
  if (presentationHandlerConfigured) return;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  presentationHandlerConfigured = true;
}
