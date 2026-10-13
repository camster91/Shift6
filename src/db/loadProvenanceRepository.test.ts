import { demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { createProgramCopy } from '../domain/programBuilder';
import { createTrainingCycle } from '../domain/cycle';
import { saveProgramVersion } from './programRepository';
import { saveTrainingCycle } from './cycleRepository';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';
import type { CompletedSet, WorkoutDraftValues } from '../domain/types';
import { MIGRATIONS } from './migrations';
import { restoreLocalBackup } from './localRestoreRepository';
import { exportLocalUserData, deleteLocalUserData } from './privacyRepository';
import {
  saveWorkoutSession,
  getCompletedSets,
  saveCompletedSet,
  updateCompletedSet,
  saveWorkoutDraft,
  getWorkoutDraft,
} from './workoutRepository';
import { validateLocalBackup } from '../domain/localRestore';
import { migrateLocalUserToAccount } from './accountRepository';
import { getWorkoutHistory } from './historyRepository';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
let sqlite: DatabaseSync;
let db: SQLiteDatabase;
let fail: string | null;
let saved: CompletedSet;
const stamp = '2026-10-14T12:00:00.000Z';
beforeEach(async () => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON;');
  for (const migration of MIGRATIONS)
    for (const statement of migration.statements) sqlite.exec(statement);
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
      if (fail && sql.includes(fail)) throw new Error('synthetic write failure');
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
  fail = null;
  const fixture = readFileSync(
    join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'),
    'utf8',
  );
  await restoreLocalBackup(db, 'guest-user', fixture);
  saved = (await getCompletedSets(db, JSON.parse(fixture).workoutSessions[0].id))[0]!;
});
afterEach(() => sqlite.close());
const next = (): CompletedSet => ({
  ...saved,
  id: 'new-actual',
  setNumber: 2,
  load: 40,
  loadUnit: 'kg',
  reps: 8,
  completedAt: stamp,
  idempotencyKey: 'new-actual-op',
});
const draft = (): WorkoutDraftValues => ({
  [`${saved.workoutExerciseId}:2`]: {
    load: '35',
    loadUnit: 'lb',
    reps: '8',
    duration: '45',
    distance: '',
    rpe: '',
    rir: '',
  },
});
test('loaded new saves require declared units and exact owner; duplicates do not overwrite measured units', async () => {
  await expect(
    saveCompletedSet(db, { ...next(), loadUnit: undefined }, 'guest-user'),
  ).rejects.toThrow('Confirm kg or lb');
  await expect(saveCompletedSet(db, next(), 'other')).rejects.toThrow('current person');
  expect(await saveCompletedSet(db, next(), 'guest-user')).toBe('inserted');
  expect(await saveCompletedSet(db, next(), 'guest-user')).toBe('duplicate');
  await expect(saveCompletedSet(db, { ...next(), loadUnit: 'lb' }, 'guest-user')).rejects.toThrow(
    'different actual values',
  );
  expect(
    (await getCompletedSets(db, saved.sessionId)).find((set) => set.id === 'new-actual'),
  ).toMatchObject({ load: 40, loadUnit: 'kg' });
});
test('late unit failure rolls back actual set, edits and drafts together', async () => {
  fail = 'INSERT INTO completed_set_load_provenance';
  await expect(saveCompletedSet(db, next(), 'guest-user')).rejects.toThrow('write failure');
  expect(await getCompletedSets(db, saved.sessionId)).toEqual([saved]);
  await expect(
    updateCompletedSet(
      db,
      { ...saved, load: 20, loadUnit: 'lb', completedAt: stamp },
      'guest-user',
      saved,
    ),
  ).rejects.toThrow('write failure');
  expect(await getCompletedSets(db, saved.sessionId)).toEqual([saved]);
  fail = 'INSERT INTO workout_draft_load_units';
  await expect(saveWorkoutDraft(db, saved.sessionId, draft(), stamp, 'guest-user')).rejects.toThrow(
    'write failure',
  );
  expect(await getWorkoutDraft(db, saved.sessionId)).toBeNull();
});
test('schema14 roundtrip and adoption preserve current actual units and unfinished text without inferring legacy', async () => {
  await saveCompletedSet(db, next(), 'guest-user');
  await saveWorkoutDraft(db, saved.sessionId, draft(), stamp, 'guest-user');
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  expect(exported.schemaVersion).toBe(14);
  expect(exported.completedSetLoadProvenance).toHaveLength(1);
  expect(validateLocalBackup(JSON.stringify(exported)).data.schemaVersion).toBe(14);
  expect(
    (await getCompletedSets(db, saved.sessionId)).find((set) => set.id === saved.id)?.loadUnit,
  ).toBeUndefined();
  await migrateLocalUserToAccount(db, 'guest-user', 'account');
  const adopted = await exportLocalUserData(db, 'account', stamp);
  expect(() => validateLocalBackup(JSON.stringify(adopted))).not.toThrow();
  expect(adopted.completedSetLoadProvenance![0]!.user_id).toBe('account');
  await deleteLocalUserData(db, 'account');
  await restoreLocalBackup(db, 'guest-user', JSON.stringify(adopted));
  expect(await getWorkoutDraft(db, saved.sessionId)).toEqual(draft());
  expect(
    (await getCompletedSets(db, saved.sessionId)).find((set) => set.id === 'new-actual'),
  ).toMatchObject({ load: 40, loadUnit: 'kg' });
});
test('unit/value/timestamp mismatches and foreign metadata reject before restore writes', async () => {
  await saveCompletedSet(db, next(), 'guest-user');
  const data = await exportLocalUserData(db, 'guest-user', stamp);
  for (const field of ['load_value', 'set_completed_at', 'user_id']) {
    const copy = JSON.parse(JSON.stringify(data));
    copy.completedSetLoadProvenance[0][field] =
      field === 'load_value' ? 41 : field === 'user_id' ? 'other' : '2026-10-15T12:00:00Z';
    expect(() => validateLocalBackup(JSON.stringify(copy))).toThrow();
  }
  const future = { ...data, schemaVersion: 15 };
  expect(() => validateLocalBackup(JSON.stringify(future))).toThrow('schemas 12, 13 and 14');
});
test('explicit set corrections update provenance atomically and removing load removes its unit', async () => {
  await saveCompletedSet(db, next(), 'guest-user');
  await updateCompletedSet(
    db,
    { ...next(), load: 50, loadUnit: 'lb', completedAt: '2026-10-15T12:00:00Z' },
    'guest-user',
    next(),
  );
  expect(
    (await getCompletedSets(db, saved.sessionId)).find((set) => set.id === 'new-actual'),
  ).toMatchObject({ load: 50, loadUnit: 'lb' });
  await updateCompletedSet(
    db,
    { ...next(), load: undefined, loadUnit: undefined },
    'guest-user',
    (await getCompletedSets(db, saved.sessionId)).find((set) => set.id === 'new-actual')!,
  );
  expect(sqlite.prepare('SELECT * FROM completed_set_load_provenance').all()).toEqual([]);
});
test('late adoption failure preserves provenance owner and snapshots', async () => {
  await saveCompletedSet(db, next(), 'guest-user');
  await saveWorkoutDraft(db, saved.sessionId, draft(), stamp, 'guest-user');
  const before = await exportLocalUserData(db, 'guest-user', stamp);
  const run = db.runAsync.bind(db);
  db.runAsync = (async (sql: string, ...args: SQLiteBindValue[]) => {
    if (sql.startsWith('DELETE FROM user_profiles')) throw new Error('late failure');
    return run(sql, ...args);
  }) as SQLiteDatabase['runAsync'];
  await expect(migrateLocalUserToAccount(db, 'guest-user', 'account')).rejects.toThrow(
    'late failure',
  );
  expect(await exportLocalUserData(db, 'guest-user', stamp)).toEqual(before);
});

test('history converts declared mixed units and discloses retained unknown legacy sets', async () => {
  sqlite.prepare('UPDATE completed_sets SET load=123, reps=8 WHERE id=?').run(saved.id);
  await saveCompletedSet(db, next(), 'guest-user');
  await saveCompletedSet(
    db,
    {
      ...next(),
      id: 'equivalent-lb',
      setNumber: 3,
      load: 40 / 0.45359237,
      loadUnit: 'lb',
      idempotencyKey: 'equivalent-lb-op',
    },
    'guest-user',
  );
  const entry = (await getWorkoutHistory(db, 'guest-user')).find(
    (row) => row.id === saved.sessionId,
  )!;
  expect(entry.totalVolume).toBeCloseTo(640);
  expect(entry.unknownLoadSetCount).toBe(1);
  expect(entry.completedSetCount).toBe(3);
});

test('zero load keeps explicit provenance; removing drafts cascades unit metadata', async () => {
  await saveCompletedSet(db, { ...next(), load: 0 }, 'guest-user');
  expect(
    (await getCompletedSets(db, saved.sessionId)).find((set) => set.id === 'new-actual'),
  ).toMatchObject({ load: 0, loadUnit: 'kg' });
  await saveWorkoutDraft(db, saved.sessionId, draft(), stamp, 'guest-user');
  sqlite.prepare('DELETE FROM workout_drafts WHERE session_id=?').run(saved.sessionId);
  expect(sqlite.prepare('SELECT * FROM workout_draft_load_units').all()).toEqual([]);
});

test('malformed provenance and draft units fail restore without writing any record', async () => {
  await saveCompletedSet(db, next(), 'guest-user');
  await saveWorkoutDraft(db, saved.sessionId, draft(), stamp, 'guest-user');
  const backup = await exportLocalUserData(db, 'guest-user', stamp);
  const run = jest.spyOn(db, 'runAsync');
  for (const modify of [
    (copy: typeof backup) => {
      copy.completedSetLoadProvenance![0]!.load_unit = 'stone';
    },
    (copy: typeof backup) => {
      copy.workoutDraftLoadUnits![0]!.load_units_json = JSON.stringify({ 'invented:2': 'kg' });
    },
    (copy: typeof backup) => {
      copy.workoutDraftLoadUnits![0]!.user_id = 'other';
    },
  ]) {
    const copy = JSON.parse(JSON.stringify(backup));
    modify(copy);
    run.mockClear();
    await expect(restoreLocalBackup(db, 'guest-user', JSON.stringify(copy))).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
  }
});

test.each([undefined, 20])(
  'foreign saved-set ID cannot be corrected through an owned session (load %s)',
  async (load) => {
    await saveCompletedSet(db, next(), 'guest-user');
    const foreign = sqlite.prepare('SELECT * FROM completed_sets WHERE id=?').get('new-actual')!;
    sqlite.exec(
      "INSERT INTO training_cycles(id,user_id,program_version_id,status,current_week,started_at,weeks_json) SELECT 'own-extra-cycle',user_id,program_version_id,status,current_week,started_at,weeks_json FROM training_cycles LIMIT 1;",
    );
    sqlite
      .prepare(
        "INSERT INTO workout_sessions(id,cycle_id,workout_id,program_version_id,status,started_at,cycle_week,workout_focus,is_offline) SELECT 'own-extra-session','own-extra-cycle',workout_id,program_version_id,status,started_at,cycle_week,workout_focus,is_offline FROM workout_sessions LIMIT 1;",
      )
      .run();
    // The ID belongs to a different session: even an owned alternate session is not its edit context.
    const forged = {
      ...next(),
      sessionId: 'own-extra-session',
      load,
      loadUnit: load === undefined ? undefined : ('kg' as const),
      reps: 999,
    };
    const before = await exportLocalUserData(db, 'guest-user', stamp);
    expect(
      await updateCompletedSet(db, forged, 'guest-user', {
        ...next(),
        sessionId: 'own-extra-session',
      }),
    ).toBe('missing');
    expect(await exportLocalUserData(db, 'guest-user', stamp)).toEqual(before);
    expect(sqlite.prepare('SELECT * FROM completed_sets WHERE id=?').get('new-actual')).toEqual(
      foreign,
    );
    expect(() => validateLocalBackup(JSON.stringify(before))).not.toThrow();
  },
);

test('stale correction cannot overwrite a newer actual value/unit even with the same timestamp', async () => {
  await saveCompletedSet(db, next(), 'guest-user');
  const first = { ...next(), load: 45, loadUnit: 'lb' as const };
  await updateCompletedSet(db, first, 'guest-user', next());
  const before = await exportLocalUserData(db, 'guest-user', stamp);
  await expect(
    updateCompletedSet(db, { ...next(), load: 50 }, 'guest-user', next()),
  ).rejects.toThrow('saved set changed');
  expect(await exportLocalUserData(db, 'guest-user', stamp)).toEqual(before);
  expect(() => validateLocalBackup(JSON.stringify(before))).not.toThrow();
});

test('context invalidation after a correction SQL write rolls back actual and provenance', async () => {
  await saveCompletedSet(db, next(), 'guest-user');
  const before = await exportLocalUserData(db, 'guest-user', stamp);
  let current = true;
  const run = db.runAsync.bind(db);
  db.runAsync = (async (sql: string, ...args: SQLiteBindValue[]) => {
    const result = await run(sql, ...args);
    if (sql.includes('UPDATE completed_sets')) current = false;
    return result;
  }) as typeof db.runAsync;
  await expect(
    updateCompletedSet(db, { ...next(), load: 50 }, 'guest-user', next(), () => current),
  ).rejects.toThrow('context changed');
  expect(await exportLocalUserData(db, 'guest-user', stamp)).toEqual(before);
});

test('older/equal-conflicting draft snapshots cannot replace a newer actual load and unit', async () => {
  const newer = {
    ...draft(),
    [`${saved.workoutExerciseId}:2`]: {
      ...draft()[`${saved.workoutExerciseId}:2`]!,
      load: '50',
      loadUnit: 'kg' as const,
    },
  };
  await saveWorkoutDraft(db, saved.sessionId, newer, '2026-10-14T13:00:00.000Z', 'guest-user');
  const before = await exportLocalUserData(db, 'guest-user', stamp);
  await expect(saveWorkoutDraft(db, saved.sessionId, draft(), stamp, 'guest-user')).rejects.toThrow(
    'newer unfinished',
  );
  await expect(
    saveWorkoutDraft(db, saved.sessionId, draft(), '2026-10-14T13:00:00.000Z', 'guest-user'),
  ).rejects.toThrow('changed at this save time');
  await saveWorkoutDraft(db, saved.sessionId, newer, '2026-10-14T13:00:00.000Z', 'guest-user');
  expect(await getWorkoutDraft(db, saved.sessionId)).toEqual(newer);
  expect(await exportLocalUserData(db, 'guest-user', stamp)).toEqual(before);
  expect(() => validateLocalBackup(JSON.stringify(before))).not.toThrow();
});

test.each([undefined, 20])(
  'actual cross-owner forged set ID (load %s) cannot alter either restorable owner',
  async (load) => {
    await saveCompletedSet(db, next(), 'guest-user');
    const profile = sqlite.prepare('SELECT * FROM user_profiles WHERE id=?').get('guest-user')!;
    const columns = Object.keys(profile);
    sqlite
      .prepare(
        `INSERT INTO user_profiles(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`,
      )
      .run(
        ...columns.map((key) => (key === 'id' ? 'other-owner' : (profile[key] as SQLInputValue))),
      );
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'other-owner',
      newProgramId: 'other-program',
      newVersionId: 'other-version',
      createdAt: stamp,
    });
    await saveProgramVersion(db, 'other-owner', copy.program, copy.version);
    const cycle = createTrainingCycle({
      id: 'other-cycle',
      userId: 'other-owner',
      programVersion: copy.version,
      startedAt: stamp,
    });
    await saveTrainingCycle(db, cycle);
    await saveWorkoutSession(db, {
      id: 'other-session',
      cycleId: cycle.id,
      cycleWeek: 1,
      workoutId: copy.version.workouts[0]!.id,
      programVersionId: copy.version.id,
      workoutFocus: copy.version.workouts[0]!.focus,
      status: 'in-progress',
      startedAt: stamp,
      isOffline: true,
    });
    const before = await exportLocalUserData(db, 'guest-user', stamp);
    const otherBefore = await exportLocalUserData(db, 'other-owner', stamp);
    const forged = {
      ...next(),
      sessionId: 'other-session',
      load,
      loadUnit: load === undefined ? undefined : ('kg' as const),
      reps: 999,
    };
    expect(
      await updateCompletedSet(db, forged, 'other-owner', {
        ...next(),
        sessionId: 'other-session',
      }),
    ).toBe('missing');
    expect(await exportLocalUserData(db, 'guest-user', stamp)).toEqual(before);
    expect(await exportLocalUserData(db, 'other-owner', stamp)).toEqual(otherBefore);
    expect(() => validateLocalBackup(JSON.stringify(before))).not.toThrow();
    expect(() => validateLocalBackup(JSON.stringify(otherBefore))).not.toThrow();
  },
);

test('concurrent draft writes serialize and a delayed older snapshot still cannot win', async () => {
  const transaction = db.withExclusiveTransactionAsync.bind(db);
  let entered = 0;
  let release!: () => void;
  let started!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const began = new Promise<void>((resolve) => {
    started = resolve;
  });
  db.withExclusiveTransactionAsync = (async (callback: (tx: SQLiteDatabase) => Promise<void>) => {
    entered++;
    if (entered === 1) {
      started();
      await waiting;
    }
    return transaction(callback);
  }) as typeof db.withExclusiveTransactionAsync;
  const latest = {
    ...draft(),
    [`${saved.workoutExerciseId}:2`]: {
      ...draft()[`${saved.workoutExerciseId}:2`]!,
      load: '50',
      loadUnit: 'kg' as const,
    },
  };
  const first = saveWorkoutDraft(
    db,
    saved.sessionId,
    latest,
    '2026-10-14T13:00:00.000Z',
    'guest-user',
  );
  await began;
  const old = saveWorkoutDraft(db, saved.sessionId, draft(), stamp, 'guest-user');
  const rejected = expect(old).rejects.toThrow('newer unfinished');
  await Promise.resolve();
  expect(entered).toBe(1);
  release();
  await first;
  await rejected;
  expect(await getWorkoutDraft(db, saved.sessionId)).toEqual(latest);
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  expect(() => validateLocalBackup(JSON.stringify(exported))).not.toThrow();
});

test('queued or late draft context invalidation rolls back both text and unit rows', async () => {
  await saveWorkoutDraft(db, saved.sessionId, draft(), stamp, 'guest-user');
  const before = await exportLocalUserData(db, 'guest-user', stamp);
  let current = true;
  const run = db.runAsync.bind(db);
  db.runAsync = (async (sql: string, ...args: SQLiteBindValue[]) => {
    const result = await run(sql, ...args);
    if (sql.includes('INSERT INTO workout_drafts')) current = false;
    return result;
  }) as typeof db.runAsync;
  await expect(
    saveWorkoutDraft(
      db,
      saved.sessionId,
      draft(),
      '2026-10-14T13:00:00.000Z',
      'guest-user',
      () => current,
    ),
  ).rejects.toThrow('context changed');
  expect(await exportLocalUserData(db, 'guest-user', stamp)).toEqual(before);
});
