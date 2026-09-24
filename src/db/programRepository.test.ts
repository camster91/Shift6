import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { migrateLocalUserToAccount } from './accountRepository';
import { demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { createCustomExercise } from '../domain/programBuilder';
import { MIGRATIONS } from './migrations';
import { getUserExercises, saveCustomExercise, saveProgramVersion } from './programRepository';

function fakeDatabase() {
  const calls: string[] = [];
  const database = {
    runAsync: async (sql: string) => {
      calls.push(sql);
      return { changes: 1, lastInsertRowId: 1 };
    },
    withTransactionAsync: async (callback: () => Promise<void>) => {
      calls.push('BEGIN TRANSACTION');
      await callback();
      calls.push('COMMIT TRANSACTION');
    },
  } as unknown as SQLiteDatabase;

  return { database, calls };
}

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

  return { database, sqlite };
}

describe('programRepository', () => {
  it('stores a user-owned program version and queues its latest snapshot', async () => {
    const { database, calls } = fakeDatabase();

    await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);

    expect(calls).toEqual([
      'BEGIN TRANSACTION',
      expect.stringContaining('INSERT INTO user_programs'),
      expect.stringContaining('INSERT INTO user_program_versions'),
      expect.stringContaining('INSERT INTO sync_outbox'),
      'COMMIT TRANSACTION',
    ]);
  });

  it('stores custom exercises with the same local-first outbox boundary', async () => {
    const { database, calls } = fakeDatabase();
    const exercise = createCustomExercise({
      id: 'exercise-custom-repository',
      name: 'Tempo squat',
      movementPattern: 'squat',
      primaryMuscles: ['quadriceps'],
      equipmentIds: ['equipment-bodyweight'],
    });

    await saveCustomExercise(database, 'guest-user', exercise, '2026-09-14T12:00:00.000Z');

    expect(calls).toEqual([
      'BEGIN TRANSACTION',
      expect.stringContaining('INSERT INTO user_exercises'),
      expect.stringContaining('INSERT INTO sync_outbox'),
      'COMMIT TRANSACTION',
    ]);
  });

  it('reads user-owned exercises while ignoring malformed local rows', async () => {
    const exercise = createCustomExercise({
      id: 'exercise-custom-read',
      name: 'Tempo squat',
      movementPattern: 'squat',
      primaryMuscles: ['quadriceps'],
      equipmentIds: ['equipment-bodyweight'],
    });
    const database = {
      getAllAsync: async () => [
        { exercise_json: JSON.stringify(exercise) },
        { exercise_json: '{malformed' },
      ],
    } as unknown as SQLiteDatabase;

    await expect(getUserExercises(database, 'guest-user')).resolves.toEqual([exercise]);
  });
});

describe('programRepository ownership in SQLite', () => {
  it('rejects a cross-owner program ID collision without rewriting its version or queued payload', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);
      const originalOutbox = sqlite
        .prepare('SELECT payload_json FROM sync_outbox WHERE entity_id = ?')
        .get(demoProgramVersion.id);

      await expect(
        saveProgramVersion(
          database,
          'other-user',
          { ...demoProgram, title: 'Stolen' },
          {
            ...demoProgramVersion,
            status: 'retired',
          },
        ),
      ).rejects.toThrow('The program ID belongs to another local user.');

      expect(
        sqlite
          .prepare('SELECT user_id, program_json FROM user_programs WHERE id = ?')
          .get(demoProgram.id),
      ).toMatchObject({ user_id: 'guest-user', program_json: JSON.stringify(demoProgram) });
      expect(
        sqlite
          .prepare('SELECT version_json FROM user_program_versions WHERE id = ?')
          .get(demoProgramVersion.id),
      ).toMatchObject({ version_json: JSON.stringify(demoProgramVersion) });
      expect(
        sqlite
          .prepare('SELECT payload_json FROM sync_outbox WHERE entity_id = ?')
          .get(demoProgramVersion.id),
      ).toEqual(originalOutbox);
    } finally {
      sqlite.close();
    }
  });

  it('rolls back a newly inserted program when its version ID already belongs to another program', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);
      const otherProgram = {
        ...demoProgram,
        id: 'another-program',
        currentVersionId: demoProgramVersion.id,
      };

      await expect(
        saveProgramVersion(database, 'other-user', otherProgram, {
          ...demoProgramVersion,
          programId: otherProgram.id,
        }),
      ).rejects.toThrow('The program version ID belongs to another program.');

      expect(
        sqlite.prepare('SELECT id FROM user_programs WHERE id = ?').get(otherProgram.id),
      ).toBeUndefined();
      expect(
        sqlite
          .prepare('SELECT program_id FROM user_program_versions WHERE id = ?')
          .get(demoProgramVersion.id),
      ).toMatchObject({ program_id: demoProgram.id });
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM sync_outbox').get()).toMatchObject({
        count: 1,
      });
    } finally {
      sqlite.close();
    }
  });

  it('allows a same-owner snapshot update and an explicitly adopted guest program', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);
      await saveProgramVersion(database, 'guest-user', demoProgram, {
        ...demoProgramVersion,
        status: 'retired',
      });
      await expect(
        migrateLocalUserToAccount(database, 'guest-user', 'account-user'),
      ).resolves.toMatchObject({
        status: 'migrated',
      });
      await saveProgramVersion(database, 'account-user', demoProgram, demoProgramVersion);

      expect(
        sqlite.prepare('SELECT user_id FROM user_programs WHERE id = ?').get(demoProgram.id),
      ).toMatchObject({ user_id: 'account-user' });
      expect(
        sqlite
          .prepare('SELECT version_json FROM user_program_versions WHERE id = ?')
          .get(demoProgramVersion.id),
      ).toMatchObject({ version_json: JSON.stringify(demoProgramVersion) });
    } finally {
      sqlite.close();
    }
  });

  it('rejects a cross-owner custom exercise ID collision without replacing the outbox', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      const exercise = createCustomExercise({
        id: 'exercise-custom-shared-id',
        name: 'Tempo squat',
        movementPattern: 'squat',
        primaryMuscles: ['quadriceps'],
        equipmentIds: ['equipment-bodyweight'],
      });
      await saveCustomExercise(database, 'guest-user', exercise, '2026-09-14T12:00:00.000Z');
      await expect(
        saveCustomExercise(
          database,
          'other-user',
          { ...exercise, name: 'Stolen' },
          '2026-09-15T12:00:00.000Z',
        ),
      ).rejects.toThrow('The exercise ID belongs to another local user.');
      expect(
        sqlite
          .prepare('SELECT user_id, exercise_json FROM user_exercises WHERE id = ?')
          .get(exercise.id),
      ).toMatchObject({ user_id: 'guest-user', exercise_json: JSON.stringify(exercise) });
      expect(
        sqlite.prepare('SELECT payload_json FROM sync_outbox WHERE entity_id = ?').get(exercise.id),
      ).toMatchObject({ payload_json: JSON.stringify({ userId: 'guest-user', exercise }) });
    } finally {
      sqlite.close();
    }
  });
});
