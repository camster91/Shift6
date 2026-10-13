import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { restoreLocalBackup } from './localRestoreRepository';
import { exportLocalUserData, deleteLocalUserData } from './privacyRepository';
import {
  confirmCoachMemoryFact,
  forgetCoachMemoryFact,
  getCoachMemorySnapshot,
  setCoachMemoryEnabled,
} from './coachMemoryRepository';
import { validateLocalBackup } from '../domain/localRestore';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
let sqlite: DatabaseSync, db: SQLiteDatabase;
let fail: string | null, flip: (() => void) | null;
const owner = 'guest-user',
  at = '2026-10-13T12:00:00.000Z';
beforeEach(async () => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON;');
  for (const migration of MIGRATIONS) for (const sql of migration.statements) sqlite.exec(sql);
  fail = null;
  flip = null;
  db = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    getFirstAsync: async (sql: string, ...args: SQLInputValue[]) =>
      sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql: string, ...args: SQLInputValue[]) => sqlite.prepare(sql).all(...args),
    runAsync: async (sql: string, ...args: SQLInputValue[]) => {
      if (fail && sql.includes(fail)) throw new Error('Synthetic late failure');
      const result = sqlite.prepare(sql).run(...args);
      if (flip && sql.startsWith('INSERT INTO coach_memory_facts')) {
        flip();
        flip = null;
      }
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    withExclusiveTransactionAsync: async (work: (tx: SQLiteDatabase) => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await work(db);
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    withTransactionAsync: async (work: () => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await work();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
  await restoreLocalBackup(
    db,
    owner,
    readFileSync(join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'), 'utf8'),
  );
});
afterEach(() => sqlite.close());
const first = () =>
  confirmCoachMemoryFact(db, {
    owner,
    value: { kind: 'training-time', value: 'evening' },
    expectedRevision: 0,
    expectedPreferenceUpdatedAt: null,
    operationId: 'create',
    confirmedAt: at,
  });

test('absent preferences default off; confirms once without rewriting canonical profile or queuing sync', async () => {
  const profile = sqlite.prepare('SELECT * FROM user_profiles').all();
  expect(await getCoachMemorySnapshot(db, owner)).toMatchObject({
    enabled: false,
    facts: [],
    preferenceUpdatedAt: null,
  });
  const saved = await first();
  expect(await first()).toEqual(saved);
  expect(sqlite.prepare('SELECT COUNT(*) AS count FROM coach_memory_facts').get()).toEqual({
    count: 1,
  });
  expect(sqlite.prepare('SELECT * FROM user_profiles').all()).toEqual(profile);
  expect(sqlite.prepare('SELECT * FROM sync_outbox').all()).toEqual([]);
  expect((await getCoachMemorySnapshot(db, owner)).enabled).toBe(false);
});
test('CAS edit, conflicting operation reuse and stale previews preserve the confirmed value', async () => {
  const saved = await first(),
    snapshot = await getCoachMemorySnapshot(db, owner);
  const changed = await confirmCoachMemoryFact(db, {
    owner,
    value: { kind: 'training-time', value: 'afternoon' },
    expectedRevision: saved.revision,
    expectedPreferenceUpdatedAt: snapshot.preferenceUpdatedAt,
    operationId: 'edit',
    confirmedAt: at,
  });
  expect(changed.revision).toBe(2);
  expect(changed.id).toBe(saved.id);
  await expect(
    confirmCoachMemoryFact(db, {
      owner,
      value: { kind: 'training-time', value: 'morning' },
      expectedRevision: 1,
      expectedPreferenceUpdatedAt: snapshot.preferenceUpdatedAt,
      operationId: 'stale',
      confirmedAt: at,
    }),
  ).rejects.toThrow('changed');
  await expect(
    confirmCoachMemoryFact(db, {
      owner,
      value: { kind: 'session-minutes', value: 20 },
      expectedRevision: 1,
      expectedPreferenceUpdatedAt: snapshot.preferenceUpdatedAt,
      operationId: 'edit',
      confirmedAt: at,
    }),
  ).rejects.toThrow('changed');
  expect((await getCoachMemorySnapshot(db, owner)).facts[0]!.value).toEqual({
    kind: 'training-time',
    value: 'afternoon',
  });
});
test('forget deletes the complete value, does not retain tombstones, and prevents old previews recreating it', async () => {
  const saved = await first(),
    snapshot = await getCoachMemorySnapshot(db, owner);
  expect(
    await forgetCoachMemoryFact(
      db,
      owner,
      saved.id,
      saved.revision,
      snapshot.preferenceUpdatedAt,
      at,
    ),
  ).toBe(true);
  expect(
    await forgetCoachMemoryFact(
      db,
      owner,
      saved.id,
      saved.revision,
      snapshot.preferenceUpdatedAt,
      at,
    ),
  ).toBe(false);
  expect(sqlite.prepare('SELECT * FROM coach_memory_facts').all()).toEqual([]);
  await expect(first()).rejects.toThrow('changed');
  const exported = await exportLocalUserData(db, owner, at);
  expect(exported.coachMemoryFacts).toEqual([]);
  const current = await getCoachMemorySnapshot(db, owner);
  const replacement = await confirmCoachMemoryFact(db, {
    owner,
    value: { kind: 'training-time', value: 'morning' },
    expectedRevision: 0,
    expectedPreferenceUpdatedAt: current.preferenceUpdatedAt,
    operationId: 'new-confirmation',
    confirmedAt: at,
  });
  expect(replacement.id).not.toBe(saved.id);
  expect(
    await forgetCoachMemoryFact(db, owner, saved.id, 1, snapshot.preferenceUpdatedAt, at),
  ).toBe(false);
  expect((await getCoachMemorySnapshot(db, owner)).facts).toHaveLength(1);
});
test('owner scope, sensitive/unknown values and invalid operation bounds reject before writes', async () => {
  await expect(
    confirmCoachMemoryFact(db, {
      owner: 'other',
      value: { kind: 'session-minutes', value: 20 },
      expectedRevision: 0,
      expectedPreferenceUpdatedAt: null,
      operationId: 'other',
      confirmedAt: at,
    }),
  ).rejects.toThrow('own local setup');
  await expect(
    confirmCoachMemoryFact(db, {
      owner,
      value: { kind: 'health', value: 'sensitive prose' } as never,
      expectedRevision: 0,
      expectedPreferenceUpdatedAt: null,
      operationId: 'invalid',
      confirmedAt: at,
    }),
  ).rejects.toThrow();
  expect((await getCoachMemorySnapshot(db, owner)).facts).toEqual([]);
});
test('late failure or changed UI owner/focus rolls back both fact and preference writes', async () => {
  fail = 'INSERT INTO coach_memory_preferences';
  await expect(first()).rejects.toThrow('late failure');
  fail = null;
  let active = true;
  flip = () => {
    active = false;
  };
  await expect(
    confirmCoachMemoryFact(db, {
      owner,
      value: { kind: 'coach-style', value: 'technical' },
      expectedRevision: 0,
      expectedPreferenceUpdatedAt: null,
      operationId: 'guarded',
      confirmedAt: at,
      guard: () => active,
    }),
  ).rejects.toThrow('context changed');
  expect((await getCoachMemorySnapshot(db, owner)).facts).toEqual([]);
  expect(sqlite.prepare('SELECT * FROM coach_memory_preferences').all()).toEqual([]);
});
test('all practical kinds export/restore intact with enablement reset off, and scoped deletion removes them', async () => {
  await first();
  for (const value of [
    { kind: 'session-minutes', value: 20 },
    { kind: 'equipment', value: ['equipment-dumbbells'] },
    { kind: 'coach-style', value: 'technical' },
  ] as const) {
    const snapshot = await getCoachMemorySnapshot(db, owner);
    await confirmCoachMemoryFact(db, {
      owner,
      value: value as never,
      expectedRevision: 0,
      expectedPreferenceUpdatedAt: snapshot.preferenceUpdatedAt,
      operationId: value.kind,
      confirmedAt: at,
    });
  }
  const before = await getCoachMemorySnapshot(db, owner);
  await setCoachMemoryEnabled(db, owner, true, before.preferenceUpdatedAt, at);
  expect((await getCoachMemorySnapshot(db, owner)).enabled).toBe(true);
  const exported = await exportLocalUserData(db, owner, at);
  expect(() => validateLocalBackup(JSON.stringify(exported))).not.toThrow();
  await deleteLocalUserData(db, owner);
  expect(sqlite.prepare('SELECT * FROM coach_memory_facts').all()).toEqual([]);
  await restoreLocalBackup(db, owner, JSON.stringify(exported));
  const restored = await getCoachMemorySnapshot(db, owner);
  expect(restored.enabled).toBe(false);
  expect(restored.facts).toHaveLength(4);
  expect(restored.facts).toEqual(before.facts);
});
