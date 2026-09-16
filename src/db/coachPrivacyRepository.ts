import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createDefaultCoachPrivacyPreference,
  normalizeCoachPrivacyPreference,
  type CoachPrivacyPreference,
} from '../domain/coachPrivacy';

interface CoachPrivacyPreferenceRow {
  user_id: string;
  provider_coach_enabled: number;
  notice_version: number;
  updated_at: string;
}

/**
 * Provider-backed Coach is opt-in and local by default. This preference does
 * not enter analytics or sync until a separate cross-device privacy policy is
 * explicitly approved.
 */
export async function getCoachPrivacyPreference(
  database: SQLiteDatabase,
  userId: string,
): Promise<CoachPrivacyPreference> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return createDefaultCoachPrivacyPreference('');

  const row = await database.getFirstAsync<CoachPrivacyPreferenceRow>(
    `SELECT user_id, provider_coach_enabled, notice_version, updated_at
       FROM coach_privacy_preferences
      WHERE user_id = ?;`,
    normalizedUserId,
  );

  if (!row) return createDefaultCoachPrivacyPreference(normalizedUserId);

  return normalizeCoachPrivacyPreference({
    userId: row.user_id,
    providerCoachEnabled: row.provider_coach_enabled === 1,
    noticeVersion: row.notice_version,
    updatedAt: row.updated_at,
  });
}

export async function saveCoachPrivacyPreference(
  database: SQLiteDatabase,
  preference: CoachPrivacyPreference,
): Promise<CoachPrivacyPreference> {
  const normalized = normalizeCoachPrivacyPreference(preference);

  await database.runAsync(
    `INSERT INTO coach_privacy_preferences
      (user_id, provider_coach_enabled, notice_version, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       provider_coach_enabled = excluded.provider_coach_enabled,
       notice_version = excluded.notice_version,
       updated_at = excluded.updated_at;`,
    normalized.userId,
    normalized.providerCoachEnabled ? 1 : 0,
    normalized.noticeVersion,
    normalized.updatedAt,
  );

  return normalized;
}
