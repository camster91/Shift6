import type { SQLiteDatabase } from 'expo-sqlite';

import { getNotificationPreferences, saveNotificationPreferences } from './notificationRepository';

describe('notification preference repository', () => {
  it('returns an opt-in-safe default when no row exists', async () => {
    const database = {
      getFirstAsync: async () => null,
    } as unknown as SQLiteDatabase;

    await expect(
      getNotificationPreferences(database, 'guest-user', '2026-09-14T12:00:00.000Z'),
    ).resolves.toEqual({
      userId: 'guest-user',
      workoutReminders: false,
      restTimer: false,
      weeklyReview: false,
      cycleReview: false,
      coachMessages: false,
      updatedAt: '2026-09-14T12:00:00.000Z',
    });
  });

  it('maps stored flags and queues a replaceable settings mutation atomically', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      getFirstAsync: async () => ({
        user_id: 'guest-user',
        workout_reminders: 1,
        rest_timer: 0,
        weekly_review: 1,
        cycle_review: 0,
        coach_messages: 1,
        updated_at: '2026-09-14T12:00:00.000Z',
      }),
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(getNotificationPreferences(database, 'guest-user')).resolves.toMatchObject({
      workoutReminders: true,
      restTimer: false,
      weeklyReview: true,
      cycleReview: false,
      coachMessages: true,
    });

    await saveNotificationPreferences(database, {
      userId: 'guest-user',
      workoutReminders: true,
      restTimer: false,
      weeklyReview: true,
      cycleReview: false,
      coachMessages: true,
      updatedAt: '2026-09-14T12:05:00.000Z',
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.sql).toContain('INSERT INTO notification_preferences');
    expect(calls[0]?.params).toEqual(['guest-user', 1, 0, 1, 0, 1, '2026-09-14T12:05:00.000Z']);
    expect(calls[1]?.sql).toContain('INSERT INTO sync_outbox');
    expect(calls[1]?.params).toContain('notification-preference');
    expect(calls[1]?.params).toContain('notification-preference:guest-user');
  });
});
