import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { restoreLocalBackup } from './localRestoreRepository';
import { exportLocalUserData } from './privacyRepository';
import { demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { createNextCycleCopy } from '../domain/programBuilder';
import { createTrainingCycle } from '../domain/cycle';
import { saveProgramVersionInTransaction } from './programRepository';
import { saveTrainingCycleWithScheduleInTransaction } from './cycleRepository';
import { saveCycleReview, saveCycleReviewInTransaction } from './cycleReviewRepository';
import {
  createPersonalGoalInTransaction,
  savePersonalReviewInTransaction,
  appendPersonalObservation,
  getPersonalGoal,
} from './personalGoalRepository';
import type { MeasurementProtocol } from '../domain/shift';

jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
const owner = 'guest-user';
const stamp = '2026-10-13T12:00:00.000Z';
const protocol: MeasurementProtocol = {
  id: 'measurement-setup',
  version: 1,
  exerciseId: 'declared-movement',
  variantId: 'declared-variant',
  assistance: 'none',
  equipmentSetup: 'none',
  metric: 'reps',
  canonicalUnit: 'reps',
  direction: 'higher',
};
const goal = {
  id: 'source-goal',
  objective: 'My repetitions',
  protocol,
  target: 10,
  replacePrimary: true,
};
function copyPlan(id: string) {
  return createNextCycleCopy({
    sourceProgram: demoProgram,
    sourceVersion: demoProgramVersion,
    userId: owner,
    newProgramId: `${id}-plan`,
    newVersionId: `${id}-version`,
    createdAt: stamp,
  });
}
const sourcePlan = copyPlan('source');
const nextPlan = copyPlan('next');
const sourceCycle = createTrainingCycle({
  id: 'source-cycle',
  userId: owner,
  programVersion: sourcePlan.version,
  startedAt: stamp,
});
const nextCycle = createTrainingCycle({
  id: 'next-cycle',
  userId: owner,
  programVersion: nextPlan.version,
  startedAt: stamp,
});
let sqlite: DatabaseSync;
let db: SQLiteDatabase;
let beginCount: number;
beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date(stamp));
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON;');
  for (const migration of MIGRATIONS) for (const sql of migration.statements) sqlite.exec(sql);
  beginCount = 0;
  const transaction = async (fn: () => Promise<void>) => {
    ++beginCount;
    sqlite.exec('BEGIN');
    try {
      await fn();
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  };
  db = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...args: SQLInputValue[]) => {
      const result = sqlite.prepare(sql).run(...args);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...args: SQLInputValue[]) =>
      sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql: string, ...args: SQLInputValue[]) => sqlite.prepare(sql).all(...args),
    withTransactionAsync: transaction,
    withExclusiveTransactionAsync: async (fn: (tx: SQLiteDatabase) => Promise<void>) =>
      transaction(() => fn(db)),
  } as unknown as SQLiteDatabase;
  await restoreLocalBackup(
    db,
    owner,
    readFileSync(join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'), 'utf8'),
  );
  await db.withExclusiveTransactionAsync(async (tx) => {
    await saveProgramVersionInTransaction(tx, owner, sourcePlan.program, sourcePlan.version);
    await saveTrainingCycleWithScheduleInTransaction(
      tx,
      sourceCycle,
      sourcePlan.version,
      'America/Toronto',
      '2026-10-13',
    );
    await createPersonalGoalInTransaction(tx, owner, sourceCycle.id, goal, stamp);
  });
  await appendPersonalObservation(
    db,
    owner,
    {
      id: 'source-baseline',
      shiftId: goal.id,
      protocolId: protocol.id,
      protocolVersion: 1,
      measuredAt: stamp,
      source: 'assessment',
      value: 0,
      unit: 'reps',
    },
    true,
    stamp,
  );
});
afterEach(() => {
  sqlite.close();
  jest.useRealTimers();
});

/** Only test composition of existing writers: no production handover/receipt is activated. */
async function writeTogether(tx: SQLiteDatabase, isCurrent = () => true) {
  await savePersonalReviewInTransaction(
    tx,
    owner,
    goal.id,
    'declined',
    'repeat',
    'review-op',
    stamp,
  );
  await saveCycleReviewInTransaction(tx, {
    id: 'cycle-reflection',
    userId: owner,
    cycleId: sourceCycle.id,
    nextAction: 'repeat',
    createdAt: stamp,
    updatedAt: stamp,
  });
  await saveProgramVersionInTransaction(tx, owner, nextPlan.program, nextPlan.version);
  await saveTrainingCycleWithScheduleInTransaction(
    tx,
    nextCycle,
    nextPlan.version,
    'America/Toronto',
    '2026-10-13',
    isCurrent,
  );
  await createPersonalGoalInTransaction(
    tx,
    owner,
    nextCycle.id,
    { ...goal, id: 'next-goal', replacePrimary: true },
    stamp,
  );
}

test('existing writers compose in one exclusive transaction without copying measured baseline or actuals', async () => {
  const before = await exportLocalUserData(db, owner, stamp);
  const priorBegins = beginCount;
  await db.withExclusiveTransactionAsync(writeTogether);
  expect(beginCount).toBe(priorBegins + 1);
  expect(await getPersonalGoal(db, owner, nextCycle.id)).toMatchObject({
    target: 10,
    baseline: { state: 'deferred' },
  });
  expect(await getPersonalGoal(db, owner, sourceCycle.id)).toMatchObject({
    baseline: { state: 'measured', observationId: 'source-baseline' },
    reviewState: 'declined',
  });
  expect(
    sqlite
      .prepare(
        "SELECT id,is_primary FROM shifts WHERE id IN ('next-goal','source-goal') ORDER BY id",
      )
      .all(),
  ).toEqual([
    { id: 'next-goal', is_primary: 1 },
    { id: 'source-goal', is_primary: 0 },
  ]);
  const after = await exportLocalUserData(db, owner, stamp);
  expect(after.shiftObservations).toEqual(before.shiftObservations);
  expect(after.completedSets).toEqual(before.completedSets);
  expect(sqlite.prepare('SELECT count(*) n FROM sync_outbox').get()).toEqual({ n: 0 });
});

test('injected failure after primary replacement rolls every writer and primary selection back', async () => {
  const before = await exportLocalUserData(db, owner, stamp);
  await expect(
    db.withExclusiveTransactionAsync(async (tx) => {
      await writeTogether(tx);
      throw new Error('injected after goal replacement');
    }),
  ).rejects.toThrow('injected');
  expect(await exportLocalUserData(db, owner, stamp)).toEqual(before);
});

test('stale Start context rolls earlier reflection and plan writes back', async () => {
  const before = await exportLocalUserData(db, owner, stamp);
  await expect(
    db.withExclusiveTransactionAsync((tx) => writeTogether(tx, () => false)),
  ).rejects.toThrow('Start preview changed');
  expect(await exportLocalUserData(db, owner, stamp)).toEqual(before);
});

test('wrong owner cannot mutate a personal review or create a goal on another owner cycle', async () => {
  const before = await exportLocalUserData(db, owner, stamp);
  await expect(
    db.withExclusiveTransactionAsync((tx) =>
      savePersonalReviewInTransaction(
        tx,
        'other-owner',
        goal.id,
        'completed',
        'repeat',
        'wrong',
        stamp,
      ),
    ),
  ).rejects.toThrow();
  await expect(
    db.withExclusiveTransactionAsync((tx) =>
      createPersonalGoalInTransaction(
        tx,
        'other-owner',
        sourceCycle.id,
        { ...goal, id: 'wrong' },
        stamp,
      ),
    ),
  ).rejects.toThrow();
  expect(await exportLocalUserData(db, owner, stamp)).toEqual(before);
});

test('existing personal review exact retry stays one event and changed payload rejects', async () => {
  const save = (state: 'declined' | 'completed') =>
    db.withExclusiveTransactionAsync((tx) =>
      savePersonalReviewInTransaction(tx, owner, goal.id, state, 'repeat', 'same-op', stamp),
    );
  await save('declined');
  await save('declined');
  expect(
    sqlite.prepare("SELECT count(*) n FROM personal_goal_events WHERE id='same-op'").get(),
  ).toEqual({ n: 1 });
  await expect(save('completed')).rejects.toThrow();
  expect(await getPersonalGoal(db, owner, sourceCycle.id)).toMatchObject({
    reviewState: 'declined',
  });
});

test('direct personal helper refuses foreign keys disabled before writing', async () => {
  sqlite.exec('PRAGMA foreign_keys=OFF;');
  await expect(
    db.withExclusiveTransactionAsync((tx) =>
      savePersonalReviewInTransaction(tx, owner, goal.id, 'declined', 'repeat', 'unsafe', stamp),
    ),
  ).rejects.toThrow('cannot save goals safely');
  expect(
    sqlite.prepare("SELECT count(*) n FROM personal_goal_events WHERE id='unsafe'").get(),
  ).toEqual({ n: 0 });
});

test.each(['wrapper', 'helper'] as const)(
  'cycle reflection %s rejects another valid local owner before changing reflection/outbox',
  async (writer) => {
    const row = sqlite.prepare('SELECT * FROM user_profiles WHERE id=?').get(owner)!;
    const keys = Object.keys(row);
    sqlite
      .prepare(
        `INSERT INTO user_profiles (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
      )
      .run(...keys.map((key) => (key === 'id' ? 'other-owner' : row[key]) as SQLInputValue));
    const review = {
      id: 'owned-reflection',
      userId: owner,
      cycleId: sourceCycle.id,
      note: 'My original reflection',
      createdAt: stamp,
      updatedAt: stamp,
    };
    await saveCycleReview(db, review);
    const prior = sqlite.prepare('SELECT * FROM cycle_reviews ORDER BY id').all();
    const beforeOutbox = sqlite.prepare('SELECT * FROM sync_outbox ORDER BY id').all();
    const wrong = { ...review, userId: 'other-owner', note: 'Wrong owner overwrite' };
    await expect(
      writer === 'wrapper'
        ? saveCycleReview(db, wrong)
        : db.withExclusiveTransactionAsync((tx) => saveCycleReviewInTransaction(tx, wrong)),
    ).rejects.toThrow('owned cycle');
    expect(sqlite.prepare('SELECT * FROM cycle_reviews ORDER BY id').all()).toEqual(prior);
    expect(sqlite.prepare('SELECT * FROM sync_outbox ORDER BY id').all()).toEqual(beforeOutbox);
  },
);

test('cycle reflection helper rejects another reflection ID for an owned cycle without rewriting identity', async () => {
  const review = {
    id: 'owned-reflection',
    userId: owner,
    cycleId: sourceCycle.id,
    note: 'Original',
    createdAt: stamp,
    updatedAt: stamp,
  };
  await saveCycleReview(db, review);
  await expect(
    db.withExclusiveTransactionAsync((tx) =>
      saveCycleReviewInTransaction(tx, { ...review, id: 'replacement-id' }),
    ),
  ).rejects.toThrow('reflection identity');
  expect(
    await db.getFirstAsync('SELECT id,note FROM cycle_reviews WHERE cycle_id=?;', sourceCycle.id),
  ).toEqual({ id: review.id, note: 'Original' });
});

test('same-owner reflection exact retry and edited note preserve entity identity', async () => {
  const review = {
    id: 'owned-reflection',
    userId: owner,
    cycleId: sourceCycle.id,
    note: 'Original',
    createdAt: stamp,
    updatedAt: stamp,
  };
  await saveCycleReview(db, review);
  await saveCycleReview(db, review);
  await saveCycleReview(db, { ...review, note: 'Edited', updatedAt: '2026-10-13T12:01:00.000Z' });
  expect(
    await db.getFirstAsync(
      'SELECT id,user_id,cycle_id,note,created_at FROM cycle_reviews WHERE cycle_id=?;',
      sourceCycle.id,
    ),
  ).toEqual({
    id: review.id,
    user_id: owner,
    cycle_id: sourceCycle.id,
    note: 'Edited',
    created_at: stamp,
  });
  expect(sqlite.prepare('SELECT count(*) n FROM sync_outbox').get()).toEqual({ n: 0 });
});

test.each(['wrapper', 'helper'] as const)(
  'cycle reflection %s rejects a new wrong-owner insert even when both profile foreign keys exist',
  async (writer) => {
    const row = sqlite.prepare('SELECT * FROM user_profiles WHERE id=?').get(owner)!;
    const keys = Object.keys(row);
    sqlite
      .prepare(
        `INSERT INTO user_profiles (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
      )
      .run(...keys.map((key) => (key === 'id' ? 'other-owner' : row[key]) as SQLInputValue));
    const before = sqlite.prepare('SELECT * FROM cycle_reviews ORDER BY id').all();
    const wrong = {
      id: 'new-wrong-reflection',
      userId: 'other-owner',
      cycleId: sourceCycle.id,
      note: 'Must never be inserted',
      createdAt: stamp,
      updatedAt: stamp,
    };
    await expect(
      writer === 'wrapper'
        ? saveCycleReview(db, wrong)
        : db.withExclusiveTransactionAsync((tx) => saveCycleReviewInTransaction(tx, wrong)),
    ).rejects.toThrow('owned cycle');
    expect(sqlite.prepare('SELECT * FROM cycle_reviews ORDER BY id').all()).toEqual(before);
    expect(sqlite.prepare('SELECT count(*) n FROM sync_outbox').get()).toEqual({ n: 0 });
  },
);

test('owned cycle reflection cannot reuse an ID already bound to a different owned cycle', async () => {
  const review = {
    id: 'owned-reflection',
    userId: owner,
    cycleId: sourceCycle.id,
    note: 'Original',
    createdAt: stamp,
    updatedAt: stamp,
  };
  await saveCycleReview(db, review);
  await db.withExclusiveTransactionAsync(async (tx) => {
    await saveProgramVersionInTransaction(tx, owner, nextPlan.program, nextPlan.version);
    await saveTrainingCycleWithScheduleInTransaction(
      tx,
      nextCycle,
      nextPlan.version,
      'America/Toronto',
      '2026-10-13',
    );
  });
  const before = sqlite.prepare('SELECT * FROM cycle_reviews ORDER BY id').all();
  await expect(saveCycleReview(db, { ...review, cycleId: nextCycle.id })).rejects.toThrow(
    'reflection identity',
  );
  expect(sqlite.prepare('SELECT * FROM cycle_reviews ORDER BY id').all()).toEqual(before);
});
