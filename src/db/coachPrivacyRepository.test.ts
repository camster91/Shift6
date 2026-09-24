import type { SQLiteDatabase } from 'expo-sqlite';

import { COACH_PRIVACY_NOTICE_VERSION } from '../domain/coachPrivacy';
import { getCoachPrivacyPreference, saveCoachPrivacyPreference } from './coachPrivacyRepository';

describe('Coach privacy preference repository', () => {
  it('defaults provider-backed Coach to disabled when no preference exists', async () => {
    const database = {
      getFirstAsync: async () => null,
    } as unknown as SQLiteDatabase;

    await expect(getCoachPrivacyPreference(database, 'guest-user')).resolves.toEqual({
      userId: 'guest-user',
      providerCoachEnabled: false,
      noticeVersion: COACH_PRIVACY_NOTICE_VERSION,
      updatedAt: new Date(0).toISOString(),
    });
  });

  it('rejects a missing user identity before reading privacy state', async () => {
    const getFirstAsync = jest.fn(async () => null);
    const database = { getFirstAsync } as unknown as SQLiteDatabase;

    await expect(getCoachPrivacyPreference(database, '   ')).rejects.toThrow(
      'A user ID is required for Coach privacy preferences.',
    );
    expect(getFirstAsync).not.toHaveBeenCalled();
  });

  it('persists explicit opt-in without creating a sync mutation', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
    const database = { runAsync } as unknown as SQLiteDatabase;

    await expect(
      saveCoachPrivacyPreference(database, {
        userId: ' guest-user ',
        providerCoachEnabled: true,
        noticeVersion: COACH_PRIVACY_NOTICE_VERSION,
        updatedAt: '2026-09-16T12:00:00.000Z',
      }),
    ).resolves.toEqual({
      userId: 'guest-user',
      providerCoachEnabled: true,
      noticeVersion: COACH_PRIVACY_NOTICE_VERSION,
      updatedAt: '2026-09-16T12:00:00.000Z',
    });

    expect(runAsync).toHaveBeenCalledTimes(1);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO coach_privacy_preferences'),
      'guest-user',
      1,
      COACH_PRIVACY_NOTICE_VERSION,
      '2026-09-16T12:00:00.000Z',
    );
  });

  it('reads the saved provider-processing choice', async () => {
    const database = {
      getFirstAsync: async () => ({
        user_id: 'guest-user',
        provider_coach_enabled: 1,
        notice_version: COACH_PRIVACY_NOTICE_VERSION,
        updated_at: '2026-09-16T12:00:00.000Z',
      }),
    } as unknown as SQLiteDatabase;

    await expect(getCoachPrivacyPreference(database, 'guest-user')).resolves.toMatchObject({
      providerCoachEnabled: true,
      noticeVersion: COACH_PRIVACY_NOTICE_VERSION,
    });
  });
});
