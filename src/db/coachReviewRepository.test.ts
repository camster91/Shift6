import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { restoreLocalBackup } from './localRestoreRepository';
import {
  exportLocalUserData,
  deleteLocalUserData,
  buildLocalDataExportSummary,
} from './privacyRepository';
import { validateLocalBackup } from '../domain/localRestore';
import { demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { createProgramCopy } from '../domain/programBuilder';
import { createTrainingCycle } from '../domain/cycle';
import { saveProgramVersion } from './programRepository';
import { saveTrainingCycle } from './cycleRepository';
import {
  saveWorkoutSession,
  completeWorkoutSession,
  finishWorkoutSessionPartially,
} from './workoutRepository';
import {
  loadDatedCoachReview,
  confirmDatedCoachReview,
  getSavedCoachReviews,
} from './coachReviewRepository';
import { previewCoachReviewChoice } from '../domain/coachReview';
import { stableSnapshotJSON } from '../domain/programPersistence';
import { parseCoachReviewReceipt } from '../domain/coachReviewJournal';
import { createPersonalGoal, appendPersonalObservation } from './personalGoalRepository';
import { migrateLocalUserToAccount } from './accountRepository';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
let sqlite: DatabaseSync;
let db: SQLiteDatabase;
let workoutId: string;
const stamp = '2026-10-13T12:00:00.000Z';
const window = { startDate: '2026-10-07', endDate: '2026-10-13', timeZone: 'America/Toronto' };
beforeEach(async () => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON;');
  for (const migration of MIGRATIONS) for (const sql of migration.statements) sqlite.exec(sql);
  const transaction = async (fn: () => Promise<void>) => {
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
    'guest-user',
    readFileSync(join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'), 'utf8'),
  );
  const copy = createProgramCopy({
    sourceProgram: demoProgram,
    sourceVersion: demoProgramVersion,
    userId: 'guest-user',
    newProgramId: 'review-plan',
    newVersionId: 'review-version',
    createdAt: stamp,
  });
  await saveProgramVersion(db, 'guest-user', copy.program, copy.version);
  await saveTrainingCycle(
    db,
    createTrainingCycle({
      id: 'review-cycle',
      userId: 'guest-user',
      programVersion: copy.version,
      startedAt: stamp,
    }),
  );
  workoutId = copy.version.workouts[0]!.id;
});
afterEach(() => sqlite.close());
const exportNow = (owner = 'guest-user') =>
  exportLocalUserData(db, owner, '2026-10-13T13:00:00.000Z');
const load = () => loadDatedCoachReview(db, 'guest-user', 'review-cycle', window, stamp);
async function preview() {
  return previewCoachReviewChoice(await load(), 'keep-plan', null);
}
async function save(id = 'review-op', previous: string | null = null) {
  return confirmDatedCoachReview(db, await preview(), id, previous, stamp, true);
}
async function session(id: string, status: 'complete' | 'partial' | 'skipped' | 'in-progress') {
  await saveWorkoutSession(db, {
    id,
    cycleId: 'review-cycle',
    programVersionId: 'review-version',
    cycleWeek: 1,
    workoutId,
    workoutFocus: 'mixed',
    status,
    startedAt: stamp,
    isOffline: true,
    ...(status === 'partial' ? { completionReason: 'time-limited' as const } : {}),
  });
}
test('consistent read is inert and counts only actual sessions, with no planned denominator', async () => {
  for (const status of ['complete', 'partial', 'skipped', 'in-progress'] as const)
    await session(status, status);
  const before = await exportNow();
  const result = await load();
  expect(result.training).toMatchObject({
    complete: 1,
    partial: 1,
    skipped: 1,
    inProgress: 1,
    plannedCoverage: 'unavailable',
    adherence: null,
  });
  expect(result.question?.id).toBe('time-limited-stop');
  expect(await exportNow()).toEqual(before);
  await expect(loadDatedCoachReview(db, 'other', 'review-cycle', window, stamp)).rejects.toThrow(
    'unavailable',
  );
});
test('confirmation records only dated intent; retry is inert and canonical training, cycle review and outbox stay unchanged', async () => {
  const before = await exportNow();
  const queues = sqlite.prepare('SELECT * FROM sync_outbox').all();
  const p = await preview();
  const saved = await confirmDatedCoachReview(db, p, 'review-op', null, stamp, true);
  expect(saved.receipt).toMatchObject({
    status: 'confirmed-intent',
    choice: 'keep-plan',
    requiresWorkflowConfirmation: false,
    nextCapability: null,
  });
  await session('later', 'partial');
  expect(
    await confirmDatedCoachReview(db, p, 'review-op', null, '2026-10-13T13:00:00.000Z', true),
  ).toEqual(saved);
  expect(await getSavedCoachReviews(db, 'guest-user', 'review-cycle')).toEqual([saved]);
  const after = await exportNow();
  expect(after.trainingCycles).toEqual(before.trainingCycles);
  expect(after.userProgramVersions).toEqual(before.userProgramVersions);
  expect(after.cycleReviews).toEqual(before.cycleReviews);
  expect(
    sqlite.prepare("SELECT * FROM sync_outbox WHERE entity_type LIKE '%review%'").all(),
  ).toEqual(queues.filter((row) => String(row.entity_type).includes('review')));
  expect(after.coachReviewJournal).toHaveLength(1);
  await expect(
    confirmDatedCoachReview(
      db,
      { ...p, choice: 'review-availability' },
      'review-op',
      null,
      stamp,
      true,
    ),
  ).rejects.toThrow('identity');
});
test('fresh evidence and parent CAS prevent stale confirmation; optional question may be skipped', async () => {
  const stale = await preview();
  await session('partial', 'partial');
  await expect(confirmDatedCoachReview(db, stale, 'stale', null, stamp, true)).rejects.toThrow(
    'changed',
  );
  const snapshot = await load();
  const p = previewCoachReviewChoice(snapshot, 'review-availability', null);
  const result = await confirmDatedCoachReview(db, p, 'one', null, stamp, true);
  expect(result.receipt).toMatchObject({
    response: null,
    nextCapability: 'open-setup',
    requiresWorkflowConfirmation: true,
  });
  await expect(confirmDatedCoachReview(db, p, 'two', null, stamp, true)).rejects.toThrow(
    'history changed',
  );
  await confirmDatedCoachReview(db, p, 'two', 'one', stamp, true);
  expect(
    (await getSavedCoachReviews(db, 'guest-user', 'review-cycle')).map((row) => row.id),
  ).toEqual(['two', 'one']);
});
test('context loss and failed readback roll back the insert inside an exclusive transaction', async () => {
  const p = await preview();
  let checks = 0;
  await expect(
    confirmDatedCoachReview(db, p, 'lost', null, stamp, true, () => ++checks === 1),
  ).rejects.toThrow('current context');
  expect(await getSavedCoachReviews(db, 'guest-user', 'review-cycle')).toEqual([]);
  const original = db.getFirstAsync;
  db.getFirstAsync = (async (sql: string, ...args: SQLInputValue[]) =>
    sql.includes('WHERE id=? AND user_id=?') && sql.includes('coach_review_journal')
      ? null
      : original.call(db, sql, ...(args as SQLiteBindValue[]))) as typeof original;
  await expect(confirmDatedCoachReview(db, p, 'missing', null, stamp, true)).rejects.toThrow(
    'could not',
  );
  db.getFirstAsync = original;
  expect(await getSavedCoachReviews(db, 'guest-user', 'review-cycle')).toEqual([]);
});
test('SQL receipt facts are immutable and cannot be reassigned to a foreign owner', async () => {
  await save();
  expect(() =>
    sqlite
      .prepare(
        "UPDATE coach_review_journal SET receipt_json=json_set(receipt_json,'$.choice','review-availability')",
      )
      .run(),
  ).toThrow('append-only');
  expect(() =>
    sqlite.prepare("UPDATE coach_review_journal SET confirmed_at='2026-10-14T12:00:00.000Z'").run(),
  ).toThrow('append-only');
  expect(() => sqlite.prepare("UPDATE coach_review_journal SET user_id='foreign'").run()).toThrow();
});
test('schema16 journal export, deletion, restore and exact external readback preserve confirmed history', async () => {
  await save('one');
  await save('two', 'one');
  const before = await exportNow();
  expect(before.schemaVersion).toBe(16);
  expect(validateLocalBackup(JSON.stringify(before)).data.coachReviewJournal).toEqual(
    before.coachReviewJournal,
  );
  await deleteLocalUserData(db, 'guest-user');
  expect(sqlite.prepare('SELECT * FROM coach_review_journal').all()).toEqual([]);
  await restoreLocalBackup(db, 'guest-user', JSON.stringify(before));
  expect((await exportNow()).coachReviewJournal).toEqual(before.coachReviewJournal);
  expect(await getSavedCoachReviews(db, 'guest-user', 'review-cycle')).toHaveLength(2);
});
test('legacy15 normalizes an empty journal without pretending reviews occurred', async () => {
  const old = await exportNow();
  old.schemaVersion = 15;
  delete old.coachReviewJournal;
  const normalized = validateLocalBackup(JSON.stringify(old)).data;
  expect(normalized.schemaVersion).toBe(16);
  expect(normalized.coachReviewJournal).toEqual([]);
  expect(() => validateLocalBackup(JSON.stringify({ ...old, schemaVersion: 17 }))).toThrow();
});
test('tampered receipts, unowned bindings, orphan parents and changed immutable evidence are rejected before restore writes', async () => {
  await session('complete', 'complete');
  await save();
  const before = await exportNow();
  const patches = [
    (row: Record<string, unknown>) => {
      row.user_id = 'foreign';
    },
    (row: Record<string, unknown>) => {
      row.previous_review_id = 'absent';
    },
    (row: Record<string, unknown>) => {
      row.cycle_id = 'absent';
    },
    (row: Record<string, unknown>) => {
      const receipt = JSON.parse(String(row.receipt_json));
      receipt.providerData = 'forbidden';
      row.receipt_json = JSON.stringify(receipt);
    },
    (row: Record<string, unknown>) => {
      const receipt = JSON.parse(String(row.receipt_json));
      const evidence = JSON.parse(receipt.evidenceFingerprint);
      evidence.sessions[0].startedAt = '2026-10-13T11:59:00.000Z';
      receipt.evidenceFingerprint = stableSnapshotJSON(evidence);
      row.receipt_json = stableSnapshotJSON(receipt);
    },
  ];
  for (const patch of patches) {
    const bad = structuredClone(before);
    patch(bad.coachReviewJournal![0]!);
    bad.summary = buildLocalDataExportSummary(bad);
    await expect(restoreLocalBackup(db, 'guest-user', JSON.stringify(bad))).rejects.toThrow();
    expect(await exportNow()).toEqual(before);
  }
});
test('canonical goal baseline and correction are reused, stale measurement preview refuses, old receipt remains historical', async () => {
  await createPersonalGoal(
    db,
    'guest-user',
    'review-cycle',
    {
      id: 'review-goal',
      objective: 'My repetitions',
      target: 10,
      replacePrimary: true,
      protocol: {
        id: 'review-protocol',
        version: 1,
        exerciseId: demoProgramVersion.workouts[0]!.exercises[0]!.exerciseId,
        variantId: 'own-variant',
        assistance: 'none',
        equipmentSetup: 'none',
        metric: 'reps',
        canonicalUnit: 'reps',
        direction: 'higher',
      },
    },
    stamp,
  );
  const missing = await load();
  expect(missing.goal.state).toBe('deferred-baseline');
  expect(missing.question).toBeNull();
  const obs = {
    id: 'baseline',
    shiftId: 'review-goal',
    protocolId: 'review-protocol',
    protocolVersion: 1,
    measuredAt: stamp,
    source: 'assessment' as const,
    value: 5,
    unit: 'reps' as const,
  };
  await appendPersonalObservation(db, 'guest-user', obs, true, stamp);
  const before = await preview();
  await confirmDatedCoachReview(db, before, 'goal-review', null, stamp, true);
  await appendPersonalObservation(
    db,
    'guest-user',
    { ...obs, id: 'corrected', value: 6, correctsObservationId: 'baseline' },
    false,
    stamp,
  );
  await expect(
    confirmDatedCoachReview(db, before, 'stale-goal', 'goal-review', stamp, true),
  ).rejects.toThrow('changed');
  expect((await load()).goal.comparison?.baseline?.canonicalValue).toBe(6);
  const exported = await exportNow();
  expect(() => validateLocalBackup(JSON.stringify(exported))).not.toThrow();
  const historical = parseCoachReviewReceipt(String(exported.coachReviewJournal![0]!.receipt_json));
  expect(historical.evidence.observations[0]!.value).toBe(5);
});
test('explicit owner remapping preserves operation and source IDs through adoption and restore', async () => {
  await save('guest-user-review-op');
  await migrateLocalUserToAccount(db, 'guest-user', 'account');
  const adopted = await exportNow('account');
  const row = adopted.coachReviewJournal![0]!;
  expect(row.id).toBe('guest-user-review-op');
  expect(parseCoachReviewReceipt(String(row.receipt_json)).receipt.ownerId).toBe('account');
  expect(() => validateLocalBackup(JSON.stringify(adopted))).not.toThrow();
  await deleteLocalUserData(db, 'account');
  await restoreLocalBackup(db, 'guest-user', JSON.stringify(adopted));
  const restored = await getSavedCoachReviews(db, 'guest-user', 'review-cycle');
  expect(restored[0]!.id).toBe('guest-user-review-op');
  expect(restored[0]!.receipt.ownerId).toBe('guest-user');
});
test('strict backup refuses invented terminal review outcomes while allowing a real later completion', async () => {
  await session('live', 'in-progress');
  await save();
  const before = await exportNow();
  const forged = structuredClone(before);
  const row = forged.coachReviewJournal![0]!;
  const receipt = JSON.parse(String(row.receipt_json));
  const evidence = JSON.parse(receipt.evidenceFingerprint);
  evidence.sessions[0].status = 'complete';
  evidence.sessions[0].completedAt = stamp;
  receipt.evidenceFingerprint = stableSnapshotJSON(evidence);
  row.receipt_json = stableSnapshotJSON(receipt);
  // The deterministic receipt alone is internally valid, but contradicts the
  // separately exported canonical in-progress record and must fail pre-write.
  expect(() => parseCoachReviewReceipt(String(row.receipt_json))).not.toThrow();
  await expect(restoreLocalBackup(db, 'guest-user', JSON.stringify(forged))).rejects.toThrow(
    'terminal outcome',
  );
  expect(await exportNow()).toEqual(before);
  await completeWorkoutSession(db, 'live', '2026-10-13T12:30:00.000Z');
  const evolved = await exportNow();
  expect(() => validateLocalBackup(JSON.stringify(evolved))).not.toThrow();
  await deleteLocalUserData(db, 'guest-user');
  await restoreLocalBackup(db, 'guest-user', JSON.stringify(evolved));
  expect((await exportNow()).coachReviewJournal).toEqual(before.coachReviewJournal);
});
test('partial outcomes remain canonical; a later attempt does not reopen or overwrite the original partial receipt', async () => {
  await session('partial-attempt', 'in-progress');
  await finishWorkoutSessionPartially(db, 'partial-attempt', stamp, 'time-limited');
  await save();
  await completeWorkoutSession(db, 'partial-attempt', '2026-10-13T12:30:00.000Z');
  await session('next-attempt', 'in-progress');
  await completeWorkoutSession(db, 'next-attempt', '2026-10-13T12:30:00.000Z');
  const packet = await exportNow();
  expect(packet.workoutSessions.find((row) => row.id === 'partial-attempt')?.status).toBe(
    'partial',
  );
  expect(() => validateLocalBackup(JSON.stringify(packet))).not.toThrow();
  const forged = structuredClone(packet);
  const row = forged.coachReviewJournal![0]!;
  const receipt = JSON.parse(String(row.receipt_json));
  const evidence = JSON.parse(receipt.evidenceFingerprint);
  evidence.sessions[0].completionReason = 'equipment';
  receipt.evidenceFingerprint = stableSnapshotJSON(evidence);
  row.receipt_json = stableSnapshotJSON(receipt);
  expect(() => validateLocalBackup(JSON.stringify(forged))).toThrow('terminal outcome');
});
