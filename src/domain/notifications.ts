import type {
  EntityId,
  ISODateString,
  NotificationPreference,
  NotificationPreferenceKey,
} from './types';

export interface NotificationPreferenceOption {
  key: NotificationPreferenceKey;
  label: string;
  description: string;
}

export const notificationPreferenceOptions: readonly NotificationPreferenceOption[] = [
  {
    key: 'workoutReminders',
    label: 'Workout reminders',
    description: 'A gentle reminder when a planned training day is coming up.',
  },
  {
    key: 'restTimer',
    label: 'Rest timer',
    description: 'A cue when a saved rest interval finishes, when supported by the device.',
  },
  {
    key: 'weeklyReview',
    label: 'Weekly review',
    description: 'A private prompt to reflect on the training week that just ended.',
  },
  {
    key: 'cycleReview',
    label: 'Cycle review',
    description: 'A prompt when your six-week cycle reaches its review boundary.',
  },
  {
    key: 'coachMessages',
    label: 'Coach messages',
    description: 'Approved Coach follow-ups and plan proposals that need your review.',
  },
];

export function createDefaultNotificationPreferences(
  userId: EntityId,
  updatedAt: ISODateString,
): NotificationPreference {
  return {
    userId,
    workoutReminders: false,
    restTimer: false,
    weeklyReview: false,
    cycleReview: false,
    coachMessages: false,
    updatedAt,
  };
}

export function setNotificationPreference(
  preferences: NotificationPreference,
  key: NotificationPreferenceKey,
  value: boolean,
  updatedAt: ISODateString,
): NotificationPreference {
  return { ...preferences, [key]: value, updatedAt };
}

export function hasEnabledNotificationPreferences(preferences: NotificationPreference): boolean {
  return notificationPreferenceOptions.some(({ key }) => preferences[key]);
}
