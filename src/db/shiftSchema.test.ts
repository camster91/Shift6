import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { MIGRATIONS, migrateDatabase } from './migrations';

function memoryDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  const database = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...values: unknown[]) => {
      const result = sqlite.prepare(sql).run(...(values as SQLInputValue[]));
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...values: unknown[]) =>
      sqlite.prepare(sql).get(...(values as SQLInputValue[])) ?? null,
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

const profile = (id: string) =>
  [
    id,
    id,
    'metric',
    '[]',
    'beginner',
    3,
    30,
    'morning',
    'supportive',
    'balanced',
    'not-now',
    'now',
    'now',
    'now',
  ] as const;

function seedCycle(sqlite: DatabaseSync, userId: string, cycleId: string) {
  sqlite
    .prepare(
      `INSERT INTO user_profiles
    (id, display_name, unit_system, goals_json, experience, training_days_per_week,
     preferred_session_minutes, preferred_training_time, coach_tone, coach_intervention,
     health_connection, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    )
    .run(...profile(userId));
  sqlite
    .prepare(
      `INSERT INTO training_cycles
    (id, user_id, program_version_id, status, current_week, started_at, weeks_json)
    VALUES (?, ?, 'version-1', 'active', 1, '2026-09-01', '[]');`,
    )
    .run(cycleId, userId);
}

function seedShift(sqlite: DatabaseSync, id: string, owner: string, cycle: string) {
  sqlite
    .prepare(
      `INSERT INTO shifts
    (id, user_id, cycle_id, program_version_id, template_id, template_version,
     block_objective, active_protocol_id, active_protocol_version, target_json,
     baseline_state, review_state, next_choice, is_primary, created_at)
    VALUES (?, ?, ?, 'version-1', 'draft-reps', 1, 'Rep goal', 'reps', 1, '10',
            'missing', 'missing', 'undecided', 1, '2026-09-01');`,
    )
    .run(id, owner, cycle);
}

describe('empty Shift schema migration', () => {
  it('upgrades a populated legacy database without inventing a goal or baseline', async () => {
    const { sqlite, database } = memoryDatabase();
    try {
      for (const migration of MIGRATIONS.filter((item) => item.version < 21)) {
        for (const statement of migration.statements) sqlite.exec(statement);
      }
      sqlite.exec(`CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL
      );`);
      for (const migration of MIGRATIONS.filter((item) => item.version < 21)) {
        sqlite
          .prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);')
          .run(migration.version, migration.name, '2026-09-01');
      }
      seedCycle(sqlite, 'owner-1', 'cycle-1');

      await migrateDatabase(database);
      await migrateDatabase(database);

      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM shifts;').get()).toMatchObject({ n: 0 });
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM shift_observations;').get()).toMatchObject({
        n: 0,
      });
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM training_cycles;').get()).toMatchObject({
        n: 1,
      });
      expect(sqlite.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('rejects a cross-owner cycle, competing primary Shift and mismatched protocol evidence', async () => {
    const { sqlite, database } = memoryDatabase();
    try {
      await migrateDatabase(database);
      seedCycle(sqlite, 'owner-1', 'cycle-1');
      seedCycle(sqlite, 'owner-2', 'cycle-2');
      expect(() => seedShift(sqlite, 'wrong-owner', 'owner-2', 'cycle-1')).toThrow();
      seedShift(sqlite, 'shift-1', 'owner-1', 'cycle-1');
      sqlite.exec(`INSERT INTO training_cycles
        (id, user_id, program_version_id, status, current_week, started_at, weeks_json)
        VALUES ('cycle-3', 'owner-1', 'version-1', 'active', 1, '2026-09-01', '[]');`);
      expect(() => seedShift(sqlite, 'shift-2', 'owner-1', 'cycle-3')).toThrow();
      sqlite.exec(`INSERT INTO shift_protocols
        (shift_id, user_id, protocol_id, protocol_version, snapshot_json, created_at)
        VALUES ('shift-1', 'owner-1', 'reps', 1, '{}', '2026-09-01');`);
      expect(() =>
        sqlite.exec(`INSERT INTO shift_observations
        (id, shift_id, user_id, protocol_id, protocol_version, measured_at, recorded_at, source, value_json, unit)
        VALUES ('bad', 'shift-1', 'owner-1', 'reps', 2, '2026-09-01', '2026-09-01', 'assessment', '5', 'reps');`),
      ).toThrow();
      expect(() =>
        sqlite.exec(`INSERT INTO shift_observations
        (id, shift_id, user_id, protocol_id, protocol_version, measured_at, recorded_at, source, value_json, unit)
        VALUES ('wrong-owner', 'shift-1', 'owner-2', 'reps', 1, '2026-09-01', '2026-09-01', 'assessment', '5', 'reps');`),
      ).toThrow();
      expect(sqlite.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});
