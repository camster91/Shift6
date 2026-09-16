import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateLocalUserToAccount } from './accountRepository';

function profileRow() {
  return {
    id: 'guest-user',
    display_name: 'Guest',
    unit_system: 'imperial',
    goals_json: '["strength"]',
    experience: 'beginner',
    training_days_per_week: 3,
    preferred_session_minutes: 30,
    preferred_training_time: 'morning',
    coach_tone: 'supportive',
    coach_intervention: 'balanced',
    health_connection: 'not-now',
    completed_at: '2026-09-14T12:00:00.000Z',
    created_at: '2026-09-14T12:00:00.000Z',
    updated_at: '2026-09-14T12:00:00.000Z',
  };
}

describe('migrateLocalUserToAccount', () => {
  it('adopts local profile ownership and rewrites queued user identity atomically', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      getFirstAsync: async (sql: string) => {
        if (sql.includes('AS conflict')) return null;
        return profileRow();
      },
      getAllAsync: async () => [
        {
          id: 'outbox-profile-guest-user',
          idempotency_key: 'profile:guest-user',
          entity_type: 'profile',
          entity_id: 'guest-user',
          payload_json: JSON.stringify({
            userId: 'guest-user',
            profile: { user: { id: 'guest-user' } },
          }),
        },
        {
          id: 'outbox-cycle-1',
          idempotency_key: 'training-cycle:cycle-1',
          entity_type: 'training-cycle',
          entity_id: 'cycle-1',
          payload_json: JSON.stringify({ userId: 'guest-user', cycleId: 'cycle-1' }),
        },
      ],
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

    await expect(migrateLocalUserToAccount(database, 'guest-user', 'account-1')).resolves.toEqual({
      status: 'migrated',
      fromUserId: 'guest-user',
      toUserId: 'account-1',
    });

    expect(calls[0]?.sql).toBe('BEGIN TRANSACTION');
    expect(calls.some((call) => call.sql.includes('INSERT INTO user_profiles'))).toBe(true);
    expect(calls.some((call) => call.sql.includes('UPDATE user_equipment'))).toBe(true);
    expect(calls.some((call) => call.sql.includes('UPDATE training_cycles'))).toBe(true);
    expect(calls.some((call) => call.sql.includes('UPDATE user_considerations'))).toBe(true);
    expect(calls.some((call) => call.sql.includes('UPDATE body_metrics'))).toBe(true);
    const profileMutation = calls.find((call) => call.sql.includes('UPDATE sync_outbox'));
    expect(profileMutation?.params).toContain('profile:account-1');
    expect(JSON.parse(String(profileMutation?.params[3]))).toEqual({
      userId: 'account-1',
      profile: { user: { id: 'account-1' } },
    });
    expect(calls.at(-1)?.sql).toBe('COMMIT TRANSACTION');
  });

  it('refuses an implicit merge into an account with local data', async () => {
    const database = {
      getFirstAsync: async () => ({ conflict: 1 }),
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(migrateLocalUserToAccount(database, 'guest-user', 'account-1')).rejects.toThrow(
      'explicit merge is required',
    );
  });

  it('does not mutate an empty guest identity', async () => {
    const database = {
      getFirstAsync: async () => null,
      getAllAsync: async () => [],
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(migrateLocalUserToAccount(database, 'guest-user', 'account-1')).resolves.toEqual({
      status: 'no-data',
      fromUserId: 'guest-user',
      toUserId: 'account-1',
    });
  });

  it('fails closed when a queued mutation is malformed', async () => {
    const database = {
      getFirstAsync: async (sql: string) => (sql.includes('AS conflict') ? null : profileRow()),
      getAllAsync: async () => [
        {
          id: 'bad-mutation',
          idempotency_key: 'profile:guest-user',
          entity_type: 'profile',
          entity_id: 'guest-user',
          payload_json: '{bad-json',
        },
      ],
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(migrateLocalUserToAccount(database, 'guest-user', 'account-1')).rejects.toThrow(
      'invalid JSON',
    );
  });
});
