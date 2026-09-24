import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { migrateLocalUserToAccount } from './accountRepository';
import { MIGRATIONS } from './migrations';

function sqliteDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  for (const migration of MIGRATIONS) {
    for (const statement of migration.statements) sqlite.exec(statement);
  }
  const database = {
    runAsync: async (sql: string, ...params: unknown[]) => {
      const result = sqlite.prepare(sql).run(...(params as SQLInputValue[]));
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...params: unknown[]) =>
      sqlite.prepare(sql).get(...(params as SQLInputValue[])) ?? null,
    getAllAsync: async (sql: string, ...params: unknown[]) =>
      sqlite.prepare(sql).all(...(params as SQLInputValue[])),
    withTransactionAsync: async (callback: () => Promise<void>) => {
      sqlite.exec('BEGIN TRANSACTION;');
      try {
        await callback();
        sqlite.exec('COMMIT TRANSACTION;');
      } catch (error) {
        sqlite.exec('ROLLBACK TRANSACTION;');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
  return { sqlite, database };
}

function seedShift(sqlite: DatabaseSync, owner: string) {
  const profile = profileRow();
  sqlite
    .prepare(
      `INSERT INTO user_profiles
        (id, display_name, unit_system, goals_json, experience, training_days_per_week,
         preferred_session_minutes, preferred_training_time, coach_tone, coach_intervention,
         health_connection, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    )
    .run(
      owner,
      profile.display_name,
      profile.unit_system,
      profile.goals_json,
      profile.experience,
      profile.training_days_per_week,
      profile.preferred_session_minutes,
      profile.preferred_training_time,
      profile.coach_tone,
      profile.coach_intervention,
      profile.health_connection,
      profile.completed_at,
      profile.created_at,
      profile.updated_at,
    );
  sqlite
    .prepare(
      `INSERT INTO training_cycles
    (id, user_id, program_version_id, status, current_week, started_at, weeks_json)
    VALUES (?, ?, 'version-1', 'active', 1, '2026-09-01', '[]');`,
    )
    .run(`cycle-${owner}`, owner);
  sqlite
    .prepare(
      `INSERT INTO shifts
    (id, user_id, cycle_id, program_version_id, template_id, template_version,
     block_objective, active_protocol_id, active_protocol_version, target_json,
     baseline_state, review_state, next_choice, is_primary, created_at)
    VALUES (?, ?, ?, 'version-1', 'draft-reps', 1, 'Rep goal', 'reps', 1, '10',
            'missing', 'missing', 'undecided', 1, '2026-09-01');`,
    )
    .run(`shift-${owner}`, owner, `cycle-${owner}`);
  sqlite
    .prepare(
      `INSERT INTO shift_protocols
    (shift_id, user_id, protocol_id, protocol_version, snapshot_json, created_at)
    VALUES (?, ?, 'reps', 1, '{}', '2026-09-01');`,
    )
    .run(`shift-${owner}`, owner);
  sqlite
    .prepare(
      `INSERT INTO shift_observations
    (id, shift_id, user_id, protocol_id, protocol_version, measured_at, recorded_at,
     source, value_json, unit)
    VALUES (?, ?, ?, 'reps', 1, '2026-09-01', '2026-09-01', 'assessment', '5', 'reps');`,
    )
    .run(`observation-${owner}`, `shift-${owner}`, owner);
  sqlite
    .prepare(
      `INSERT INTO shift_goal_revisions
    (id, shift_id, user_id, protocol_id, protocol_version, target_json, block_objective,
     reason, recorded_at)
    VALUES (?, ?, ?, 'reps', 1, '10', 'Rep goal', 'initial', '2026-09-01');`,
    )
    .run(`revision-${owner}`, `shift-${owner}`, owner);
}

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
  it('adopts a Shift with no queued mutations and preserves its evidence beside another owner', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      seedShift(sqlite, 'guest-user');
      seedShift(sqlite, 'other-user');

      await expect(migrateLocalUserToAccount(database, 'guest-user', 'account-1')).resolves.toEqual(
        {
          status: 'migrated',
          fromUserId: 'guest-user',
          toUserId: 'account-1',
        },
      );
      for (const table of [
        'training_cycles',
        'shifts',
        'shift_protocols',
        'shift_observations',
        'shift_goal_revisions',
      ]) {
        expect(
          sqlite.prepare(`SELECT user_id FROM ${table} WHERE user_id = 'account-1';`).get(),
        ).toMatchObject({ user_id: 'account-1' });
        expect(
          sqlite.prepare(`SELECT user_id FROM ${table} WHERE user_id = 'other-user';`).get(),
        ).toMatchObject({ user_id: 'other-user' });
        expect(
          sqlite.prepare(`SELECT user_id FROM ${table} WHERE user_id = 'guest-user';`).get(),
        ).toBeUndefined();
      }
      expect(sqlite.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);
      await expect(migrateLocalUserToAccount(database, 'guest-user', 'account-1')).rejects.toThrow(
        'explicit merge is required',
      );
    } finally {
      sqlite.close();
    }
  });

  it('refuses to merge a guest Shift into an account with its own Shift', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      seedShift(sqlite, 'guest-user');
      seedShift(sqlite, 'account-1');
      await expect(migrateLocalUserToAccount(database, 'guest-user', 'account-1')).rejects.toThrow(
        'explicit merge is required',
      );
      expect(sqlite.prepare('SELECT id, user_id FROM shifts ORDER BY id;').all()).toEqual([
        { id: 'shift-account-1', user_id: 'account-1' },
        { id: 'shift-guest-user', user_id: 'guest-user' },
      ]);
      expect(sqlite.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('blocks adoption on a reserved Shift outbox row without changing either owner', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      seedShift(sqlite, 'guest-user');
      seedShift(sqlite, 'other-user');
      sqlite
        .prepare(
          `INSERT INTO sync_outbox
        (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
        VALUES ('future-protocol', 'shift-protocol:future', 'shift-protocol', 'unknown-format',
                '{"userId":"guest-user"}', '2026-09-01');`,
        )
        .run();

      await expect(migrateLocalUserToAccount(database, 'guest-user', 'account-1')).rejects.toThrow(
        'Shift sync mutations require a compatible build',
      );
      expect(sqlite.prepare('SELECT id FROM user_profiles ORDER BY id;').all()).toEqual([
        { id: 'guest-user' },
        { id: 'other-user' },
      ]);
      expect(sqlite.prepare('SELECT id, user_id FROM shifts ORDER BY id;').all()).toEqual([
        { id: 'shift-guest-user', user_id: 'guest-user' },
        { id: 'shift-other-user', user_id: 'other-user' },
      ]);
      expect(
        sqlite.prepare('SELECT payload_json FROM sync_outbox WHERE id = ?;').get('future-protocol'),
      ).toEqual({ payload_json: '{"userId":"guest-user"}' });
      expect(sqlite.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('rolls back profile, cycle, Shift and evidence ownership after a late failure', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      seedShift(sqlite, 'guest-user');
      const delegateRun = database.runAsync.bind(database);
      database.runAsync = (async (sql: string, ...params: unknown[]) => {
        if (sql.includes('UPDATE notification_preferences')) throw new Error('late write failed');
        return delegateRun(sql, ...(params as SQLiteBindValue[]));
      }) as SQLiteDatabase['runAsync'];

      await expect(migrateLocalUserToAccount(database, 'guest-user', 'account-1')).rejects.toThrow(
        'late write failed',
      );
      expect(sqlite.prepare('SELECT id FROM user_profiles;').all()).toEqual([{ id: 'guest-user' }]);
      for (const table of [
        'training_cycles',
        'shifts',
        'shift_protocols',
        'shift_observations',
        'shift_goal_revisions',
      ]) {
        expect(sqlite.prepare(`SELECT DISTINCT user_id FROM ${table};`).all()).toEqual([
          { user_id: 'guest-user' },
        ]);
      }
      expect(sqlite.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('adopts local profile ownership and rewrites queued user identity atomically', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      getFirstAsync: async (sql: string) =>
        sql.includes('FROM user_profiles') && !sql.includes('AS conflict') ? profileRow() : null,
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
    expect(calls.some((call) => call.sql.includes('UPDATE coach_privacy_preferences'))).toBe(true);
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
      getFirstAsync: async (sql: string) =>
        sql.includes('FROM user_profiles') && !sql.includes('AS conflict') ? profileRow() : null,
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
