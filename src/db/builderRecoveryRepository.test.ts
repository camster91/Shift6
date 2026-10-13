import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { builderRecoveryId, builderRouteKey } from '../domain/builderRecovery';
import {
  addExerciseToWorkout,
  addWorkoutToProgram,
  createBlankProgram,
  createCustomExercise,
} from '../domain/programBuilder';
import type { BuilderRecoverySnapshot } from '../domain/localPersistence';
import {
  clearBuilderRecovery,
  getBuilderRecovery,
  saveBuilderRecovery,
} from './builderRecoveryRepository';
import { createBuilderRecoveryWriter } from '../services/builderRecoveryWriter';
import { migrateLocalUserToAccount } from './accountRepository';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
let sqlite: DatabaseSync, database: SQLiteDatabase;
let fail = false;
const route = builderRouteKey('blank');
function snapshot(owner = 'one'): BuilderRecoverySnapshot {
  const draft = createBlankProgram({
    userId: owner,
    newProgramId: 'private',
    newVersionId: 'version',
    createdAt: '2026-10-13T12:00:00.000Z',
  });
  const movement = createCustomExercise({
    id: 'custom',
    name: 'Private squat',
    movementPattern: 'squat',
    primaryMuscles: ['quadriceps'],
    equipmentIds: ['equipment-bodyweight'],
    trackingType: 'reps',
    notes: 'Synthetic private notes',
  });
  const version = addWorkoutToProgram(draft.version, {
    id: 'workout',
    title: 'Private day',
    dayOfWeek: 1,
    focus: 'strength',
    estimatedDurationMinutes: 20,
  });
  return {
    program: draft.program,
    version: addExerciseToWorkout(version, 'workout', {
      exerciseId: movement.id,
      target: { reps: 8, load: { value: 25, unit: 'imperial' } },
    }),
    customExercises: [movement],
    imports: [{ workoutId: 'workout', text: 'Unresolved text', previewText: null }],
  };
}
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON;');
  fail = false;
  for (const migration of MIGRATIONS) for (const sql of migration.statements) sqlite.exec(sql);
  const profile = JSON.parse(
    readFileSync(join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'), 'utf8'),
  ).userProfiles[0] as Record<string, SQLInputValue>;
  for (const owner of ['one', 'two']) {
    const row: Record<string, SQLInputValue> = { ...profile, id: owner };
    const keys = Object.keys(row);
    sqlite
      .prepare(
        `INSERT INTO user_profiles(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`,
      )
      .run(...keys.map((key) => row[key]!));
  }
  let exclusive = Promise.resolve();
  const adapter = {
    runAsync: async (sql: string, ...values: SQLInputValue[]) => {
      if (fail && sql.includes('builder_recovery_drafts'))
        throw new Error('Synthetic disk failure');
      const result = sqlite.prepare(sql).run(...values);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getAllAsync: async (sql: string, ...values: SQLInputValue[]) =>
      sqlite.prepare(sql).all(...values),
    getFirstAsync: async (sql: string, ...values: SQLInputValue[]) =>
      sqlite.prepare(sql).get(...values) ?? null,
    withExclusiveTransactionAsync: (callback: (tx: SQLiteDatabase) => Promise<void>) => {
      const job = exclusive.then(async () => {
        sqlite.exec('BEGIN');
        try {
          await callback(database);
          sqlite.exec('COMMIT');
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      });
      exclusive = job.catch(() => undefined);
      return job;
    },
    withTransactionAsync: async (callback: () => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await callback();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  database = adapter as unknown as SQLiteDatabase;
});
afterEach(() => sqlite.close());
test('actual SQLite preserves unsaved workouts/custom targets and original unresolved text without canonical/outbox writes', async () => {
  const saved = await saveBuilderRecovery(database, 'one', route, snapshot(), 0);
  expect(await getBuilderRecovery(database, 'one', route)).toEqual(saved);
  for (const table of [
    'user_programs',
    'user_program_versions',
    'user_exercises',
    'training_cycles',
    'sync_outbox',
  ])
    expect(sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
  expect(await getBuilderRecovery(database, 'two', route)).toBeNull();
  await expect(clearBuilderRecovery(database, 'two', saved.id, saved.revision)).rejects.toThrow(
    'changed',
  );
  expect(await getBuilderRecovery(database, 'one', route)).toEqual(saved);
});
test('exclusive compare-and-swap rejects a stale or simultaneous editor without replacing the actual record', async () => {
  const results = await Promise.allSettled([
    saveBuilderRecovery(database, 'one', route, snapshot(), 0),
    saveBuilderRecovery(database, 'one', route, { ...snapshot(), imports: [] }, 0),
  ]);
  expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
  const actual = (await getBuilderRecovery(database, 'one', route))!;
  await saveBuilderRecovery(
    database,
    'one',
    route,
    { ...snapshot(), program: { ...snapshot().program, title: '' } },
    actual.revision,
  );
  await expect(clearBuilderRecovery(database, 'one', actual.id, actual.revision)).rejects.toThrow(
    'changed',
  );
  expect((await getBuilderRecovery(database, 'one', route))?.snapshot.program.title).toBe('');
});
test('foreign snapshot, invalid preview and failed writes retain prior bytes/revision', async () => {
  const saved = await saveBuilderRecovery(database, 'one', route, snapshot(), 0);
  await expect(saveBuilderRecovery(database, 'one', route, snapshot('two'), 1)).rejects.toThrow();
  await expect(
    saveBuilderRecovery(
      database,
      'one',
      route,
      { ...snapshot(), imports: [{ workoutId: 'workout', text: 'changed', previewText: 'old' }] },
      1,
    ),
  ).rejects.toThrow('stale');
  fail = true;
  await expect(
    saveBuilderRecovery(database, 'one', route, { ...snapshot(), imports: [] }, 1),
  ).rejects.toThrow('disk');
  fail = false;
  expect(await getBuilderRecovery(database, 'one', route)).toEqual(saved);
  const shadow = snapshot();
  shadow.customExercises[0] = { ...shadow.customExercises[0]!, id: 'exercise-plank' };
  shadow.version.workouts[0]!.exercises[0]!.exerciseId = 'exercise-plank';
  await expect(saveBuilderRecovery(database, 'one', route, shadow, 1)).rejects.toThrow('catalogue');
  expect(await getBuilderRecovery(database, 'one', route)).toEqual(saved);
});
test('serialized writer clears only the exact canonical snapshot, preserving newer edits', async () => {
  const writer = createBuilderRecoveryWriter(database, 'one', route, null);
  const first = snapshot(),
    newer = { ...snapshot(), program: { ...snapshot().program, title: 'Newer unsaved edit' } };
  await Promise.all([writer.save(first), writer.save(newer)]);
  expect(await writer.clearIfMatches(first)).toBe(false);
  expect((await getBuilderRecovery(database, 'one', route))?.snapshot.program.title).toBe(
    'Newer unsaved edit',
  );
  expect(await writer.clearIfMatches(newer)).toBe(true);
  expect(await getBuilderRecovery(database, 'one', route)).toBeNull();
  await writer.save(first);
  expect((await getBuilderRecovery(database, 'one', route))?.revision).toBe(1);
});
test('owner adoption preserves a route-reachable recovery despite its historical ID', async () => {
  await saveBuilderRecovery(database, 'one', route, snapshot(), 0);
  await migrateLocalUserToAccount(database, 'one', 'new-account');
  const restored = await getBuilderRecovery(database, 'new-account', route);
  expect(restored?.id).toBe(builderRecoveryId('one', route));
  expect(restored?.snapshot.program.ownerId).toBe('new-account');
  expect(await getBuilderRecovery(database, 'one', route)).toBeNull();
});

test('an isolated connection without foreign-key enforcement refuses recovery writes', async () => {
  sqlite.exec('PRAGMA foreign_keys=OFF;');
  await expect(saveBuilderRecovery(database, 'one', route, snapshot(), 0)).rejects.toThrow(
    'foreign keys',
  );
  expect(sqlite.prepare('SELECT count(*) AS n FROM builder_recovery_drafts').get()).toEqual({
    n: 0,
  });
});
