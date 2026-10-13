import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { CycleLifecycleEvent } from '../domain/localPersistence';
import { summarizeLifecycle, lifecycleDate } from '../domain/cycleLifecycle';
import { MIGRATIONS } from './migrations';
import { restoreLocalBackup } from './localRestoreRepository';
import { exportLocalUserData } from './privacyRepository';
import { validateLocalBackup } from '../domain/localRestore';
import {
  appendCycleLifecycleEvent,
  getCycleLifecycleEvents,
  pauseOtherCyclesInTransaction,
} from './cycleLifecycleRepository';
import { saveTrainingCycle } from './cycleRepository';
import { createTrainingCycle } from '../domain/cycle';
import {
  getSavedCyclePage,
  getOwnedCycleReflection,
  selectDashboardCycle,
  type CycleHistoryCursor,
} from './cycleHistoryRepository';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
let sqlite: DatabaseSync;
let db: SQLiteDatabase;
let cycleId: string;
let fail = false;
const stamp = '2026-10-14T12:00:00.000Z';
beforeEach(async () => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON;');
  for (const migration of MIGRATIONS) for (const sql of migration.statements) sqlite.exec(sql);
  db = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...args: SQLInputValue[]) => {
      if (fail && sql.startsWith('UPDATE training_cycles')) throw new Error('disk failed');
      const result = sqlite.prepare(sql).run(...args);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...args: SQLInputValue[]) =>
      sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql: string, ...args: SQLInputValue[]) => sqlite.prepare(sql).all(...args),
    withExclusiveTransactionAsync: async (fn: (tx: SQLiteDatabase) => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await fn(db);
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
  const fixture = readFileSync(
    join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'),
    'utf8',
  );
  cycleId = JSON.parse(fixture).trainingCycles[0].id;
  fail = false;
  await restoreLocalBackup(db, 'guest-user', fixture);
});
afterEach(() => sqlite.close());
const event = (
  kind: CycleLifecycleEvent['kind'],
  previousEventId: string | null = null,
): CycleLifecycleEvent => ({
  id: kind,
  userId: 'guest-user',
  cycleId,
  kind,
  effectiveDate: '2026-10-14',
  timeZone: 'America/Toronto',
  previousEventId,
  operationId: `op-${kind}`,
  recordedAt: stamp,
});
test('confirmed pause/resume/review preserve targets, weeks and actual completed sets with idempotent retries', async () => {
  const before = sqlite
    .prepare('SELECT current_week,program_version_id,weeks_json FROM training_cycles')
    .get();
  const sets = sqlite.prepare('SELECT * FROM completed_sets').all();
  const pause = event('pause');
  await appendCycleLifecycleEvent(db, pause);
  await appendCycleLifecycleEvent(db, pause);
  expect(sqlite.prepare('SELECT status FROM training_cycles').get()).toEqual({ status: 'paused' });
  await appendCycleLifecycleEvent(db, event('resume', 'pause'));
  await appendCycleLifecycleEvent(db, {
    ...event('review-date', 'resume'),
    effectiveDate: '2026-10-20',
  });
  expect(
    sqlite.prepare('SELECT current_week,program_version_id,weeks_json FROM training_cycles').get(),
  ).toEqual(before);
  expect(sqlite.prepare('SELECT * FROM completed_sets').all()).toEqual(sets);
  const summary = summarizeLifecycle(await getCycleLifecycleEvents(db, 'guest-user', cycleId));
  expect(summary.reviewDate).toBe('2026-10-20');
  expect(summary.intervals).toEqual([]);
  expect(summary.unknownPriorPause).toBe(false);
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  expect(() => validateLocalBackup(JSON.stringify(exported))).not.toThrow();
  expect(sqlite.prepare('SELECT count(*) AS n FROM sync_outbox').get()).toEqual({ n: 0 });
});
test('legacy paused resume records unknown interval instead of fabricating its start', async () => {
  sqlite.exec("UPDATE training_cycles SET status='paused'");
  await appendCycleLifecycleEvent(db, event('resume'));
  const summary = summarizeLifecycle(await getCycleLifecycleEvents(db, 'guest-user', cycleId));
  expect(summary.unknownPriorPause).toBe(true);
  expect(summary.intervals).toEqual([]);
  const data = await exportLocalUserData(db, 'guest-user', stamp);
  expect(() => validateLocalBackup(JSON.stringify(data))).not.toThrow();
});
test('conflicting operation, stale parent, foreign owner and future transition reject without extra events', async () => {
  await appendCycleLifecycleEvent(db, event('pause'));
  await expect(
    appendCycleLifecycleEvent(db, { ...event('pause'), effectiveDate: '2026-10-15' }),
  ).rejects.toThrow('different details');
  await expect(appendCycleLifecycleEvent(db, event('resume'))).rejects.toThrow('history changed');
  await expect(
    appendCycleLifecycleEvent(db, { ...event('resume', 'pause'), userId: 'other' }),
  ).rejects.toThrow('this person');
  await expect(
    appendCycleLifecycleEvent(db, { ...event('resume', 'pause'), effectiveDate: '2026-10-15' }),
  ).rejects.toThrow('today');
  expect(await getCycleLifecycleEvents(db, 'guest-user', cycleId)).toHaveLength(1);
});
test('failed cycle status write rolls back its event and status', async () => {
  fail = true;
  await expect(appendCycleLifecycleEvent(db, event('pause'))).rejects.toThrow('disk failed');
  expect(await getCycleLifecycleEvents(db, 'guest-user', cycleId)).toEqual([]);
  expect(sqlite.prepare('SELECT status FROM training_cycles').get()).toEqual({ status: 'active' });
});
test('new cycle transition journals actual old active pause without timing backfill', async () => {
  await db.withExclusiveTransactionAsync(async (tx) =>
    pauseOtherCyclesInTransaction(tx, 'guest-user', 'new-cycle', stamp),
  );
  const rows = await getCycleLifecycleEvents(db, 'guest-user', cycleId);
  expect(rows).toHaveLength(1);
  expect(rows[0]!.kind).toBe('pause');
  expect(rows[0]!.recordedAt).toBe(stamp);
  await db.withExclusiveTransactionAsync(async (tx) =>
    pauseOtherCyclesInTransaction(tx, 'guest-user', 'new-cycle', stamp),
  );
  expect(await getCycleLifecycleEvents(db, 'guest-user', cycleId)).toHaveLength(1);
});
test('actual new cycle save atomically journals previous active cycle pause', async () => {
  const version = JSON.parse(
    String(sqlite.prepare('SELECT version_json FROM user_program_versions').get()!.version_json),
  );
  const next = createTrainingCycle({
    id: 'new-cycle',
    userId: 'guest-user',
    programVersion: version,
    startedAt: new Date().toISOString(),
  });
  await saveTrainingCycle(db, next);
  expect(sqlite.prepare('SELECT id,status FROM training_cycles ORDER BY id').all()).toEqual(
    expect.arrayContaining([
      { id: cycleId, status: 'paused' },
      { id: 'new-cycle', status: 'active' },
    ]),
  );
  const history = await getCycleLifecycleEvents(db, 'guest-user', cycleId);
  expect(history).toHaveLength(1);
  expect(history[0]!.kind).toBe('pause');
  expect(history[0]!.effectiveDate).toBe(
    lifecycleDate(history[0]!.recordedAt, history[0]!.timeZone),
  );
  const data = await exportLocalUserData(db, 'guest-user', stamp);
  expect(() => validateLocalBackup(JSON.stringify(data))).not.toThrow();
});
test('date projection follows anchored local midnight and DST without advancing training', () => {
  expect(lifecycleDate('2026-03-08T04:30:00Z', 'America/Toronto')).toBe('2026-03-07');
  expect(lifecycleDate('2026-03-08T07:30:00Z', 'America/Toronto')).toBe('2026-03-08');
});

test('saved-cycle pages include older paused cycles without duplicates or foreign owners', async () => {
  for (let index = 0; index < 7; index++)
    sqlite
      .prepare(
        "INSERT INTO training_cycles SELECT ?,user_id,program_version_id,'paused',current_week,started_at,weeks_json FROM training_cycles WHERE id=?",
      )
      .run(`older-${index}`, cycleId);
  const profile = sqlite.prepare('SELECT * FROM user_profiles').get()!;
  const columns = Object.keys(profile);
  profile.id = 'other';
  sqlite
    .prepare(
      `INSERT INTO user_profiles (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
    )
    .run(...columns.map((key) => profile[key]!));
  sqlite
    .prepare(
      "INSERT INTO training_cycles SELECT 'foreign',?,program_version_id,'paused',current_week,started_at,weeks_json FROM training_cycles WHERE id=?",
    )
    .run('other', cycleId);
  const collected: string[] = [];
  let cursor: CycleHistoryCursor | null = null;
  do {
    const page = await getSavedCyclePage(db, 'guest-user', cursor, 2);
    collected.push(...page.entries.map((entry) => entry.cycle.id));
    cursor = page.nextCursor;
  } while (cursor);
  expect(collected).toHaveLength(8);
  expect(new Set(collected).size).toBe(8);
  expect(collected).not.toContain('foreign');
  expect(collected).toContain('older-0');
  await expect(getSavedCyclePage(db, 'guest-user', null, 101)).rejects.toThrow('page size');
  expect(await selectDashboardCycle(db, 'guest-user', 'foreign')).toBeNull();
  expect(await selectDashboardCycle(db, 'guest-user', 'missing')).toBeNull();
  await expect(selectDashboardCycle(db, 'guest-user', ['older-0'])).rejects.toThrow('invalid');
  expect((await selectDashboardCycle(db, 'guest-user', 'older-0'))?.status).toBe('paused');
  expect((await selectDashboardCycle(db, 'guest-user', undefined))?.id).toBe(cycleId);
});

test('reflection lookup stays on the selected owned cycle when a newer active cycle exists', async () => {
  sqlite
    .prepare(
      "INSERT INTO training_cycles SELECT 'new-active',user_id,program_version_id,'active',current_week,'2026-10-15T12:00:00Z',weeks_json FROM training_cycles WHERE id=?",
    )
    .run(cycleId);
  sqlite
    .prepare('INSERT INTO cycle_reviews VALUES (?,?,?,?,?,?,?,?,?)')
    .run(
      'reflection',
      'guest-user',
      cycleId,
      4,
      'same-course',
      'adjust',
      'Synthetic original cycle reflection',
      stamp,
      stamp,
    );
  const detail = await getOwnedCycleReflection(db, 'guest-user', cycleId);
  expect(detail?.cycle.id).toBe(cycleId);
  expect(detail?.review?.note).toBe('Synthetic original cycle reflection');
  expect(await getOwnedCycleReflection(db, 'other', cycleId)).toBeNull();
  await expect(getOwnedCycleReflection(db, 'guest-user', undefined)).rejects.toThrow(
    'Choose a saved cycle',
  );
});
