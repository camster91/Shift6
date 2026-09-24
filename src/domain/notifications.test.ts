import {
  createDefaultNotificationPreferences,
  hasEnabledNotificationPreferences,
  notificationPreferenceOptions,
  setNotificationPreference,
} from './notifications';

describe('notification preferences', () => {
  it('defaults every category to off until the user opts in', () => {
    const preferences = createDefaultNotificationPreferences(
      'guest-user',
      '2026-09-14T12:00:00.000Z',
    );

    expect(preferences).toEqual({
      userId: 'guest-user',
      workoutReminders: false,
      restTimer: false,
      weeklyReview: false,
      cycleReview: false,
      coachMessages: false,
      updatedAt: '2026-09-14T12:00:00.000Z',
    });
    expect(hasEnabledNotificationPreferences(preferences)).toBe(false);
  });

  it('updates one category without changing the other choices', () => {
    const preferences = createDefaultNotificationPreferences(
      'guest-user',
      '2026-09-14T12:00:00.000Z',
    );

    const updated = setNotificationPreference(
      preferences,
      'weeklyReview',
      true,
      '2026-09-14T12:05:00.000Z',
    );

    expect(updated.weeklyReview).toBe(true);
    expect(updated.workoutReminders).toBe(false);
    expect(updated.updatedAt).toBe('2026-09-14T12:05:00.000Z');
    expect(hasEnabledNotificationPreferences(updated)).toBe(true);
    expect(notificationPreferenceOptions).toHaveLength(5);
  });
});
