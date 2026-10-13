import { prepareCycleHandover, confirmCycleHandover } from './cycleHandoverRepository';
import { validateLocalBackup } from '../domain/localRestore';
import { migrateLocalUserToAccount } from './accountRepository';
import type { CycleHandoverRequest } from '../domain/cycleHandover';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { restoreLocalBackup } from './localRestoreRepository';
import {
  exportLocalUserData,
  deleteLocalUserData,
  buildLocalDataExportSummary,
} from './privacyRepository';
import { demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { createNextCycleCopy } from '../domain/programBuilder';
import { createTrainingCycle } from '../domain/cycle';
import { saveProgramVersionInTransaction } from './programRepository';
import { saveTrainingCycleWithScheduleInTransaction } from './cycleRepository';

import {
  createPersonalGoalInTransaction,
  appendPersonalObservation,
  getPersonalGoal,
  revisePersonalTarget,
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
const sourceCycle = createTrainingCycle({
  id: 'source-cycle',
  userId: owner,
  programVersion: sourcePlan.version,
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

function prepare(choice: CycleHandoverRequest['choice'] = 'continue-goal') {
  return prepareCycleHandover(db, owner, sourceCycle.id, {
    operationId: 'handover-op',
    preparedAt: stamp,
    choice,
    personalReviewState: 'declined',
    reflection: {
      id: 'reflection-source',
      userId: owner,
      cycleId: sourceCycle.id,
      nextAction: 'repeat',
      note: 'Synthetic reflection',
      createdAt: stamp,
      updatedAt: stamp,
    },
    destination: {
      cycleId: 'next-cycle',
      programId: 'next-plan',
      versionId: 'next-version',
      goalId: choice === 'continue-goal' ? 'next-goal' : null,
      startedAt: stamp,
      startDate: '2026-10-13',
      timeZone: 'America/Toronto',
    },
  });
}
const exportNow = () => exportLocalUserData(db, owner, new Date().toISOString());

test('one atomic handover creates an anchored cycle and deferred new goal without copied actuals', async () => {
  const before = await exportNow();
  const request = await prepare();
  const priorBegins = beginCount;
  const receipt = await confirmCycleHandover(db, owner, request);
  expect(beginCount).toBe(priorBegins + 1);
  expect(receipt.request).toEqual(request);
  expect(await getPersonalGoal(db, owner, 'next-cycle')).toMatchObject({
    target: 10,
    baseline: { state: 'deferred' },
  });
  const after = await exportNow();
  expect(after.shiftObservations).toEqual(before.shiftObservations);
  expect(after.completedSets).toEqual(before.completedSets);
  expect(after.coachPrivacyPreferences).toEqual(before.coachPrivacyPreferences);
  expect(after.notificationPreferences).toEqual(before.notificationPreferences);
  expect(sqlite.prepare('SELECT count(*) n FROM sync_outbox').get()).toEqual({ n: 0 });
  expect(after.schemaVersion).toBe(17);
  expect(validateLocalBackup(JSON.stringify(after)).data.cycleHandovers).toHaveLength(1);
});

test('failed final journal insert rolls back reflection, plan, cycle, baseline, goal and primary selection', async () => {
  const request = await prepare();
  const before = await exportNow();
  sqlite.exec(
    "CREATE TRIGGER injected_handover_failure BEFORE INSERT ON cycle_handovers BEGIN SELECT RAISE(ABORT,'injected last insert'); END;",
  );
  await expect(confirmCycleHandover(db, owner, request)).rejects.toThrow('injected last insert');
  expect(await exportNow()).toEqual(before);
});

test('exact retry is read-only after future goal revisions and ignores stale confirmation context', async () => {
  const request = await prepare();
  const receipt = await confirmCycleHandover(db, owner, request);
  jest.setSystemTime(new Date('2026-10-14T12:00:00.000Z'));
  await revisePersonalTarget(
    db,
    owner,
    goal.id,
    15,
    'Synthetic target correction',
    'later-target',
    new Date().toISOString(),
  );
  const before = await exportNow();
  await expect(confirmCycleHandover(db, owner, request, () => false)).resolves.toEqual(receipt);
  expect(await exportNow()).toEqual(before);
  expect(validateLocalBackup(JSON.stringify(before)).data.cycleHandovers).toHaveLength(1);
});

test('a reused operation with changed payload rejects without altering its committed result', async () => {
  const request = await prepare();
  await confirmCycleHandover(db, owner, request);
  const before = await exportNow();
  await expect(
    confirmCycleHandover(db, owner, {
      ...request,
      reflection: { ...request.reflection, note: 'Different' },
    }),
  ).rejects.toThrow('different details');
  expect(await exportNow()).toEqual(before);
});

test('without-goal handover retains historical goal and explicitly clears primary selection', async () => {
  const request = await prepare('without-goal');
  await confirmCycleHandover(db, owner, request);
  expect(await getPersonalGoal(db, owner, 'next-cycle')).toBeNull();
  expect(
    sqlite.prepare('SELECT count(*) n FROM shifts WHERE is_primary=1 AND user_id=?').get(owner),
  ).toEqual({ n: 0 });
  expect(await getPersonalGoal(db, owner, sourceCycle.id)).toMatchObject({
    baseline: { state: 'measured', observationId: 'source-baseline' },
  });
  expect(validateLocalBackup(JSON.stringify(await exportNow())).data.cycleHandovers).toHaveLength(
    1,
  );
});

test('stale source target or focus rejects without writes', async () => {
  const request = await prepare();
  await revisePersonalTarget(db, owner, goal.id, 15, 'New target', 'target-change', stamp);
  const before = await exportNow();
  await expect(confirmCycleHandover(db, owner, request)).rejects.toThrow('changed');
  await expect(confirmCycleHandover(db, owner, request, () => false)).rejects.toThrow('context');
  expect(await exportNow()).toEqual(before);
});

test('new export is strict and old schema16 normalizes with an empty handover section', async () => {
  const data = await exportNow();
  const old = { ...data, schemaVersion: 16 };
  delete old.cycleHandovers;
  old.summary = buildLocalDataExportSummary(old);
  expect(validateLocalBackup(JSON.stringify(old)).data.cycleHandovers).toEqual([]);
  expect(() => validateLocalBackup(JSON.stringify({ ...old, schemaVersion: 17 }))).toThrow();
});

test('tampered destination goal target and journal bindings reject before any restore writes', async () => {
  await confirmCycleHandover(db, owner, await prepare());
  const data = await exportNow();
  for (const field of [
    'source_cycle_id',
    'destination_goal_id',
    'destination_program_version_id',
  ]) {
    const changed = structuredClone(data);
    changed.cycleHandovers![0]![field] = 'invented';
    expect(() => validateLocalBackup(JSON.stringify(changed))).toThrow();
  }
  const changed = structuredClone(data);
  const request = JSON.parse(String(changed.cycleHandovers![0]!.request_json));
  request.source.goal.target = 999;
  changed.cycleHandovers![0]!.request_json = JSON.stringify(request);
  expect(() => validateLocalBackup(JSON.stringify(changed))).toThrow();
});

test('actual SQLite restore, adoption and deletion preserve or remove durable receipts with explicit owner remapping', async () => {
  const request = await prepare();
  await confirmCycleHandover(db, owner, request);
  const saved = await exportNow();
  await deleteLocalUserData(db, owner);
  await restoreLocalBackup(db, owner, JSON.stringify(saved));
  const restored = await exportNow();
  expect(restored.cycleHandovers).toEqual(saved.cycleHandovers);
  await migrateLocalUserToAccount(db, owner, 'adopted-owner');
  const adopted = await exportLocalUserData(db, 'adopted-owner', stamp);
  expect(validateLocalBackup(JSON.stringify(adopted)).data.cycleHandovers).toHaveLength(1);
  expect(JSON.parse(String(adopted.cycleHandovers![0]!.request_json)).userId).toBe('adopted-owner');
  expect(sqlite.prepare('SELECT count(*) n FROM sync_outbox').get()).toEqual({ n: 0 });
  await deleteLocalUserData(db, 'adopted-owner');
  expect(sqlite.prepare('SELECT count(*) n FROM cycle_handovers').get()).toEqual({ n: 0 });
});

test('future measurement correction remains restorable through the frozen canonical goal prefix', async () => {
  const request = await prepare();
  await confirmCycleHandover(db, owner, request);
  jest.setSystemTime(new Date('2026-10-14T12:00:00.000Z'));
  await appendPersonalObservation(
    db,
    owner,
    {
      id: 'later-correction',
      shiftId: goal.id,
      protocolId: protocol.id,
      protocolVersion: 1,
      measuredAt: stamp,
      source: 'assessment',
      value: 2,
      unit: 'reps',
      correctsObservationId: 'source-baseline',
    },
    false,
    new Date().toISOString(),
  );
  expect(validateLocalBackup(JSON.stringify(await exportNow())).data.cycleHandovers).toHaveLength(
    1,
  );
});

test('midnight invalidates an uncommitted preview but preserves all entered and saved records', async () => {
  const request = await prepare();
  jest.setSystemTime(new Date('2026-10-14T12:00:00.000Z'));
  const before = await exportNow();
  await expect(confirmCycleHandover(db, owner, request)).rejects.toThrow('date changed');
  expect(await exportNow()).toEqual(before);
});

test.each(['pending-session', 'other-active', 'other-primary'] as const)(
  'ambiguous %s state refuses preparation',
  async (state) => {
    if (state === 'pending-session')
      sqlite.exec(
        "UPDATE workout_sessions SET status='in-progress' WHERE id=(SELECT id FROM workout_sessions LIMIT 1);",
      );
    if (state === 'other-active')
      sqlite.exec("UPDATE training_cycles SET status='active' WHERE id!='source-cycle';");
    if (state === 'other-primary') {
      sqlite.exec(
        "UPDATE shifts SET is_primary=0; UPDATE shifts SET is_primary=1 WHERE id!='source-goal';",
      );
    }
    const before = await exportNow();
    await expect(prepare()).rejects.toThrow();
    expect(await exportNow()).toEqual(before);
  },
);

test('foreign source owner refuses preparation and forged request ownership rejects without writes', async () => {
  const request = await prepare();
  const before = await exportNow();
  await expect(
    prepareCycleHandover(db, 'other-owner', sourceCycle.id, { ...request }),
  ).rejects.toThrow();
  await expect(
    confirmCycleHandover(db, owner, { ...request, userId: 'other-owner' }),
  ).rejects.toThrow('ownership');
  expect(await exportNow()).toEqual(before);
});

test('tampered handover backup rejects before writing an empty restore target', async () => {
  await confirmCycleHandover(db, owner, await prepare());
  const data = await exportNow();
  data.cycleHandovers![0]!.destination_goal_id = 'invented-goal';
  await deleteLocalUserData(db, owner);
  await expect(restoreLocalBackup(db, owner, JSON.stringify(data))).rejects.toThrow();
  expect(sqlite.prepare('SELECT count(*) n FROM user_profiles').get()).toEqual({ n: 0 });
  expect(sqlite.prepare('SELECT count(*) n FROM cycle_handovers').get()).toEqual({ n: 0 });
});

test('migration28 upgrades actual schema27 SQLite rows without fabricating handover history', async () => {
  const old = new DatabaseSync(':memory:');
  try {
    for (const migration of MIGRATIONS.filter((entry) => entry.version <= 27))
      for (const sql of migration.statements) old.exec(sql);
    // Copy a real profile row using its checked-in column names, rather than a synthetic migration stub.
    const row = sqlite.prepare('SELECT * FROM user_profiles WHERE id=?').get(owner)!;
    const keys = Object.keys(row);
    old
      .prepare(
        `INSERT INTO user_profiles (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
      )
      .run(...keys.map((key) => row[key] as SQLInputValue));
    const before = old.prepare('SELECT * FROM user_profiles').all();
    for (const sql of MIGRATIONS.find((entry) => entry.version === 28)!.statements) old.exec(sql);
    expect(old.prepare('SELECT * FROM user_profiles').all()).toEqual(before);
    expect(old.prepare('SELECT count(*) n FROM cycle_handovers').get()).toEqual({ n: 0 });
  } finally {
    old.close();
  }
});

test('target revision pointer tampering and unknown nested receipt fields reject strict restore', async () => {
  await revisePersonalTarget(
    db,
    owner,
    goal.id,
    12,
    'Explicit pre-review target',
    'prior-target',
    stamp,
  );
  await confirmCycleHandover(db, owner, await prepare());
  const before = await exportNow();
  for (const field of ['latestGoalRevisionId', 'unexpectedField']) {
    const changed = structuredClone(before);
    const request = JSON.parse(String(changed.cycleHandovers![0]!.request_json));
    request.source[field] = 'invented';
    changed.cycleHandovers![0]!.request_json = JSON.stringify(request);
    expect(() => validateLocalBackup(JSON.stringify(changed))).toThrow();
  }
});

test('receipt mutation is blocked by SQLite and a committed retry cannot cross caller ownership', async () => {
  const request = await prepare();
  await confirmCycleHandover(db, owner, request);
  expect(() =>
    sqlite
      .prepare("UPDATE cycle_handovers SET confirmed_at='2026-10-14T12:00:00.000Z' WHERE id=?")
      .run(request.operationId),
  ).toThrow('immutable');
  const before = await exportNow();
  await expect(confirmCycleHandover(db, 'other-owner', request, () => false)).rejects.toThrow(
    'ownership',
  );
  expect(await exportNow()).toEqual(before);
});

test('malformed reflection rating fails before a new handover can write records', async () => {
  const request = await prepare();
  const before = await exportNow();
  await expect(
    confirmCycleHandover(db, owner, {
      ...request,
      reflection: { ...request.reflection, overallRating: 9 as 1 },
    }),
  ).rejects.toThrow('rating');
  expect(await exportNow()).toEqual(before);
});
