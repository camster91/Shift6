import type { SQLiteDatabase } from 'expo-sqlite';

import { demoEquipment } from '../domain/fixtures/home';
import type { OnboardingProfile } from '../domain/types';
import { saveOnboardingProfile, updateHealthConnectionPreference } from './profileRepository';

const profile: OnboardingProfile = {
  user: {
    id: 'guest-user',
    displayName: 'Cameron',
    unitSystem: 'imperial',
    goals: ['strength'],
    experience: 'intermediate',
    equipmentIds: demoEquipment.slice(0, 4).map((equipment) => equipment.id),
    trainingDaysPerWeek: 3,
    preferredSessionMinutes: 30,
    preferredTrainingTime: 'morning',
    createdAt: '2026-09-13T12:00:00.000Z',
    updatedAt: '2026-09-13T12:00:00.000Z',
  },
  coachTone: 'supportive',
  coachIntervention: 'balanced',
  healthConnection: 'not-now',
  completedAt: '2026-09-13T12:00:00.000Z',
};

function fakeDatabase() {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const database = {
    runAsync: async (sql: string, ...params: unknown[]) => {
      calls.push({ sql, params });
      return { changes: 1, lastInsertRowId: 1 };
    },
    withTransactionAsync: async (callback: () => Promise<void>) => {
      calls.push({ sql: 'BEGIN TRANSACTION', params: [] });
      await callback();
      calls.push({ sql: 'COMMIT TRANSACTION', params: [] });
    },
  } as unknown as SQLiteDatabase;

  return { database, calls };
}

describe('saveOnboardingProfile', () => {
  it('replaces guest profile equipment atomically', async () => {
    const { database, calls } = fakeDatabase();

    await expect(saveOnboardingProfile(database, profile)).resolves.toBeUndefined();

    expect(calls[0]?.sql).toBe('BEGIN TRANSACTION');
    expect(calls[1]?.sql).toContain('INSERT INTO user_profiles');
    expect(calls[1]?.params).toContain('not-now');
    expect(calls[2]?.sql).toContain('DELETE FROM user_equipment');
    expect(calls.filter(({ sql }) => sql.includes('INSERT INTO user_equipment'))).toHaveLength(4);
    expect(calls.at(-2)?.sql).toContain('INSERT INTO sync_outbox');
    expect(calls.at(-2)?.sql).toContain('ON CONFLICT(idempotency_key) DO UPDATE');
    expect(calls.at(-2)?.params).toEqual([
      'outbox-profile-guest-user',
      'profile:guest-user',
      'profile',
      'guest-user',
      JSON.stringify({ userId: 'guest-user', profile }),
      profile.user.updatedAt,
    ]);
    expect(calls.at(-1)?.sql).toBe('COMMIT TRANSACTION');
  });
});

describe('updateHealthConnectionPreference', () => {
  it('updates the local preference and replaces the queued profile snapshot atomically', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async () => ({
        id: 'guest-user',
        display_name: 'Cameron',
        unit_system: 'imperial',
        goals_json: JSON.stringify(['strength']),
        experience: 'intermediate',
        training_days_per_week: 3,
        preferred_session_minutes: 30,
        preferred_training_time: 'morning',
        coach_tone: 'supportive',
        coach_intervention: 'balanced',
        health_connection: 'not-now',
        completed_at: '2026-09-13T12:00:00.000Z',
        created_at: '2026-09-13T12:00:00.000Z',
        updated_at: '2026-09-14T12:00:00.000Z',
      }),
      getAllAsync: async () => [],
      withTransactionAsync: async (callback: () => Promise<void>) => {
        calls.push({ sql: 'BEGIN TRANSACTION', params: [] });
        await callback();
        calls.push({ sql: 'COMMIT TRANSACTION', params: [] });
      },
    } as unknown as SQLiteDatabase;

    await expect(
      updateHealthConnectionPreference(
        database,
        'guest-user',
        'not-now',
        '2026-09-14T12:00:00.000Z',
      ),
    ).resolves.toBeUndefined();

    expect(calls[1]?.sql).toContain('UPDATE user_profiles');
    expect(calls[1]?.params).toEqual(['not-now', '2026-09-14T12:00:00.000Z', 'guest-user']);
    expect(calls[2]?.sql).toContain('INSERT INTO sync_outbox');
    expect(JSON.parse(String(calls[2]?.params[4])).profile.healthConnection).toBe('not-now');
    expect(calls.at(-1)?.sql).toBe('COMMIT TRANSACTION');
  });
});
