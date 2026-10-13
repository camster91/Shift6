import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { migrateLocalUserToAccount } from './accountRepository';
import { demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { createCustomExercise, createProgramCopy } from '../domain/programBuilder';
import { MIGRATIONS } from './migrations';
import { saveTrainingCycle } from './cycleRepository';
import { createTrainingCycle } from '../domain/cycle';
import {
  getSavedUserPrograms,
  getUserExercises,
  getUserProgramVersion,
  saveCustomExercise,
  saveProgramVersion,
} from './programRepository';

function fakeDatabase() {
  const calls: string[] = [];
  const database = {
    getFirstAsync: async () => null,
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
  it('refuses a foreign owner embedded in a new private snapshot before canonical or outbox writes', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      await expect(
        saveProgramVersion(
          database,
          'guest-user',
          { ...demoProgram, isTemplate: false, ownerId: 'foreign-owner' },
          demoProgramVersion,
        ),
      ).rejects.toThrow('local owner');
      for (const table of ['user_programs', 'user_program_versions', 'sync_outbox'])
        expect(sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
    } finally {
      sqlite.close();
    }
  });
  it('identical retries tolerate object key order and cannot rewind a newer program pointer or rewrite outbox payloads', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);
      const reordered = Object.fromEntries(
        Object.entries(demoProgramVersion).reverse(),
      ) as typeof demoProgramVersion;
      await saveProgramVersion(database, 'guest-user', demoProgram, reordered);
      const nextVersion = {
        ...demoProgramVersion,
        id: 'immutable-next-version',
        version: 2,
        createdAt: '2026-10-13T12:00:00.000Z',
      };
      const nextProgram = { ...demoProgram, currentVersionId: nextVersion.id };
      await saveProgramVersion(database, 'guest-user', nextProgram, nextVersion);
      const before = Object.fromEntries(
        ['user_programs', 'user_program_versions', 'sync_outbox'].map((table) => [
          table,
          sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all(),
        ]),
      );
      await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);
      for (const [table, rows] of Object.entries(before))
        expect(sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).toEqual(rows);
      await expect(
        saveProgramVersion(
          database,
          'guest-user',
          { ...demoProgram, title: 'Unsaved metadata change' },
          demoProgramVersion,
        ),
      ).rejects.toThrow('immutable');
      expect((await getSavedUserPrograms(database, 'guest-user'))[0]?.version.id).toBe(
        nextVersion.id,
      );
    } finally {
      sqlite.close();
    }
  });
  it('same-ID status, version, creation time and current metadata mutations are rejected before writes', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);
      const originalProgram = sqlite
        .prepare('SELECT * FROM user_programs WHERE id=?')
        .get(demoProgram.id);
      const originalVersion = sqlite
        .prepare('SELECT * FROM user_program_versions WHERE id=?')
        .get(demoProgramVersion.id);
      for (const change of [
        { status: 'retired' as const },
        { version: 2 },
        { createdAt: '2026-10-13T13:00:00.000Z' },
      ])
        await expect(
          saveProgramVersion(database, 'guest-user', demoProgram, {
            ...demoProgramVersion,
            ...change,
          }),
        ).rejects.toThrow('immutable');
      await expect(
        saveProgramVersion(
          database,
          'guest-user',
          { ...demoProgram, title: 'Changed title' },
          demoProgramVersion,
        ),
      ).rejects.toThrow('immutable');
      expect(sqlite.prepare('SELECT * FROM user_programs WHERE id=?').get(demoProgram.id)).toEqual(
        originalProgram,
      );
      expect(
        sqlite.prepare('SELECT * FROM user_program_versions WHERE id=?').get(demoProgramVersion.id),
      ).toEqual(originalVersion);
    } finally {
      sqlite.close();
    }
  });
  it('rejects changed same-ID targets before changing a cycle-referenced saved snapshot or program/outbox metadata', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);
      const cycle = createTrainingCycle({
        id: 'immutable-cycle',
        userId: 'guest-user',
        programVersion: demoProgramVersion,
        startedAt: '2026-10-13T12:00:00.000Z',
      });
      await saveTrainingCycle(database, cycle);
      const before = Object.fromEntries(
        ['user_programs', 'user_program_versions', 'training_cycles', 'sync_outbox'].map(
          (table) => [table, sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all()],
        ),
      );
      const changed = {
        ...demoProgramVersion,
        workouts: demoProgramVersion.workouts.map((workout, index) =>
          index === 0
            ? {
                ...workout,
                title: 'Overwritten historical workout',
                exercises: workout.exercises.map((movement, movementIndex) =>
                  movementIndex === 0
                    ? {
                        ...movement,
                        sets: movement.sets.map((set) => ({
                          ...set,
                          target: { ...set.target, reps: 99 },
                        })),
                      }
                    : movement,
                ),
              }
            : workout,
        ),
      };
      await expect(
        saveProgramVersion(
          database,
          'guest-user',
          { ...demoProgram, title: 'Overwritten metadata' },
          changed,
        ),
      ).rejects.toThrow('immutable');
      for (const [table, rows] of Object.entries(before))
        expect(sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).toEqual(rows);
      expect(
        (await getUserProgramVersion(database, 'guest-user', cycle.programVersionId))?.version,
      ).toEqual(demoProgramVersion);
    } finally {
      sqlite.close();
    }
  });
  it('discovers only the latest owned saved version with workout data after reopening', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);
      const latest = {
        ...demoProgramVersion,
        id: 'saved-latest-version',
        version: 2,
        createdAt: '2026-10-13T12:00:00.000Z',
        workouts: [{ ...demoProgramVersion.workouts[0]!, title: 'Saved custom session' }],
      };
      await saveProgramVersion(
        database,
        'guest-user',
        { ...demoProgram, currentVersionId: latest.id },
        latest,
      );
      await saveProgramVersion(
        database,
        'foreign-owner',
        {
          ...demoProgram,
          id: 'foreign-plan',
          currentVersionId: 'foreign-version',
        },
        { ...demoProgramVersion, id: 'foreign-version', programId: 'foreign-plan' },
      );
      const discovered = await getSavedUserPrograms(database, 'guest-user');
      expect(discovered).toHaveLength(1);
      expect(discovered[0]?.version).toEqual(latest);
      expect(await getSavedUserPrograms(database, 'guest-user')).toEqual(discovered);
      expect(await getSavedUserPrograms(database, 'unknown-owner')).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('refuses a corrupt snapshot instead of showing an empty or foreign plan', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);
      sqlite
        .prepare('UPDATE user_program_versions SET version_json = ? WHERE id = ?')
        .run(
          JSON.stringify({ ...demoProgramVersion, programId: 'other-plan' }),
          demoProgramVersion.id,
        );
      await expect(getSavedUserPrograms(database, 'guest-user')).rejects.toThrow(
        'could not be read',
      );
    } finally {
      sqlite.close();
    }
  });

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

  it('rejects a same-owner snapshot mutation and allows an identical adopted-owner retry', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      const owned = createProgramCopy({
        sourceProgram: demoProgram,
        sourceVersion: demoProgramVersion,
        userId: 'guest-user',
        newProgramId: 'honest-private-adoption',
        newVersionId: 'honest-private-adoption-v1',
        createdAt: '2026-10-13T12:00:00.000Z',
      });
      await saveProgramVersion(database, 'guest-user', owned.program, owned.version);
      await expect(
        saveProgramVersion(database, 'guest-user', owned.program, {
          ...owned.version,
          status: 'retired',
        }),
      ).rejects.toThrow('immutable');
      await expect(
        migrateLocalUserToAccount(database, 'guest-user', 'account-user'),
      ).resolves.toMatchObject({
        status: 'migrated',
      });
      const adopted = (await getUserProgramVersion(database, 'account-user', owned.version.id))!;
      expect(adopted.program.ownerId).toBe('account-user');
      const beforeRetry = sqlite.prepare('SELECT * FROM sync_outbox ORDER BY id').all();
      await saveProgramVersion(database, 'account-user', adopted.program, adopted.version);
      expect(sqlite.prepare('SELECT * FROM sync_outbox ORDER BY id').all()).toEqual(beforeRetry);
      await expect(
        saveProgramVersion(database, 'account-user', adopted.program, {
          ...adopted.version,
          status: 'retired',
        }),
      ).rejects.toThrow('immutable');

      expect(
        sqlite.prepare('SELECT user_id FROM user_programs WHERE id = ?').get(owned.program.id),
      ).toMatchObject({ user_id: 'account-user' });
      expect(
        sqlite
          .prepare('SELECT version_json FROM user_program_versions WHERE id = ?')
          .get(owned.version.id),
      ).toMatchObject({ version_json: JSON.stringify(owned.version) });
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
