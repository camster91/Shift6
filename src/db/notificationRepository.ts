import type { SQLiteDatabase } from 'expo-sqlite';

import { createDefaultNotificationPreferences } from '../domain/notifications';
import type { NotificationPreference } from '../domain/types';

interface NotificationPreferenceRow {
  user_id: string;
  workout_reminders: number;
  rest_timer: number;
  weekly_review: number;
  cycle_review: number;
  coach_messages: number;
  updated_at: string;
}

export async function getNotificationPreferences(
  database: SQLiteDatabase,
  userId: string,
  fallbackUpdatedAt = new Date().toISOString(),
): Promise<NotificationPreference> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('A user ID is required to read notification preferences.');

  const row = await database.getFirstAsync<NotificationPreferenceRow>(
    `SELECT user_id, workout_reminders, rest_timer, weekly_review, cycle_review,
            coach_messages, updated_at
       FROM notification_preferences
      WHERE user_id = ?
      LIMIT 1;`,
    normalizedUserId,
  );

  return row
    ? mapNotificationPreferences(row)
    : createDefaultNotificationPreferences(normalizedUserId, fallbackUpdatedAt);
}

export async function saveNotificationPreferences(
  database: SQLiteDatabase,
  preferences: NotificationPreference,
): Promise<void> {
  const userId = preferences.userId.trim();
  if (!userId) throw new Error('A user ID is required to save notification preferences.');

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO notification_preferences
        (user_id, workout_reminders, rest_timer, weekly_review, cycle_review, coach_messages, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         workout_reminders = excluded.workout_reminders,
         rest_timer = excluded.rest_timer,
         weekly_review = excluded.weekly_review,
         cycle_review = excluded.cycle_review,
         coach_messages = excluded.coach_messages,
         updated_at = excluded.updated_at;`,
      userId,
      toSqlBoolean(preferences.workoutReminders),
      toSqlBoolean(preferences.restTimer),
      toSqlBoolean(preferences.weeklyReview),
      toSqlBoolean(preferences.cycleReview),
      toSqlBoolean(preferences.coachMessages),
      preferences.updatedAt,
    );

    await database.runAsync(
      `INSERT INTO sync_outbox
        (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(idempotency_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         created_at = excluded.created_at,
         last_error = NULL;`,
      `outbox-notification-preference-${userId}`,
      `notification-preference:${userId}`,
      'notification-preference',
      userId,
      JSON.stringify(preferences),
      preferences.updatedAt,
    );
  });
}

function mapNotificationPreferences(row: NotificationPreferenceRow): NotificationPreference {
  return {
    userId: row.user_id,
    workoutReminders: fromSqlBoolean(row.workout_reminders),
    restTimer: fromSqlBoolean(row.rest_timer),
    weeklyReview: fromSqlBoolean(row.weekly_review),
    cycleReview: fromSqlBoolean(row.cycle_review),
    coachMessages: fromSqlBoolean(row.coach_messages),
    updatedAt: row.updated_at,
  };
}

function toSqlBoolean(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

function fromSqlBoolean(value: number): boolean {
  return value === 1;
}
