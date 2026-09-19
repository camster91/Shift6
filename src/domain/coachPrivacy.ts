export const COACH_PRIVACY_NOTICE_VERSION = 1;

export interface CoachPrivacyPreference {
  userId: string;
  providerCoachEnabled: boolean;
  noticeVersion: number;
  updatedAt: string;
}

export function createDefaultCoachPrivacyPreference(
  userId: string,
  updatedAt = new Date(0).toISOString(),
): CoachPrivacyPreference {
  return {
    userId: userId.trim(),
    providerCoachEnabled: false,
    noticeVersion: COACH_PRIVACY_NOTICE_VERSION,
    updatedAt: normalizeDate(updatedAt),
  };
}

export function normalizeCoachPrivacyPreference(
  preference: CoachPrivacyPreference,
): CoachPrivacyPreference {
  const userId = preference.userId.trim();
  if (!userId) throw new Error('A user ID is required for Coach privacy preferences.');

  return {
    userId,
    providerCoachEnabled: preference.providerCoachEnabled === true,
    noticeVersion:
      Number.isInteger(preference.noticeVersion) && preference.noticeVersion > 0
        ? preference.noticeVersion
        : COACH_PRIVACY_NOTICE_VERSION,
    updatedAt: normalizeDate(preference.updatedAt),
  };
}

function normalizeDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error('A valid updated timestamp is required.');
  return new Date(timestamp).toISOString();
}
