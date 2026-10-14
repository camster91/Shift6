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
import { buildCycleSchedule, parseDateKey } from '../domain/calendar';
import { saveProgramVersion } from './programRepository';
import { saveTrainingCycle } from './cycleRepository';
import {
  confirmScheduleBaseline,
  appendLocalScheduleMove,
  getLocalScheduleProjection,
  previewLocalScheduleMove,
  confirmLocalScheduleMove,
} from './scheduleRevisionRepository';
import { migrateLocalUserToAccount } from './accountRepository';
import { saveWorkoutScheduleOverride } from './calendarRepository';
import { getWorkoutScheduleOverrides } from './calendarRepository';
import { buildCurrentCycleWeekSchedule } from '../domain/calendar';
import { selectTrainingWorkout } from '../domain/trainingSelection';
import { saveTrainingCycleWithSchedule } from './cycleRepository';
import type { ScheduleMove } from '../domain/scheduleRevision';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
let sqlite: DatabaseSync;
let db: SQLiteDatabase;
let confirmation: Parameters<typeof confirmScheduleBaseline>[1];
let intent: ScheduleMove;
const stamp = '2026-10-13T12:00:00.000Z';
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
    newProgramId: 'schedule-plan',
    newVersionId: 'schedule-version',
    createdAt: stamp,
  });
  await saveProgramVersion(db, 'guest-user', copy.program, copy.version);
  const cycle = createTrainingCycle({
    id: 'schedule-cycle',
    userId: 'guest-user',
    programVersion: copy.version,
    startedAt: stamp,
  });
  await saveTrainingCycle(db, cycle);
  const baseline = buildCycleSchedule(cycle, copy.version, [], [], parseDateKey('2026-10-13'));
  confirmation = {
    userId: 'guest-user',
    cycleId: cycle.id,
    programVersionId: copy.version.id,
    operationId: 'baseline-op',
    timeZone: 'America/Toronto',
    confirmedAt: stamp,
    datesJSON: JSON.stringify(
      baseline.map((entry) => ({
        cycleWeek: entry.cycleWeek,
        workoutId: entry.workout.id,
        originalDate: entry.originalDate,
        scheduledDate: entry.scheduledDate,
      })),
    ),
    expectedOverridesJSON: '[]',
    confirmed: true,
  };
  intent = {
    operationId: 'move-1',
    userId: 'guest-user',
    cycleId: cycle.id,
    programVersionId: copy.version.id,
    cycleWeek: 1,
    workoutId: baseline[0]!.workout.id,
    previousRevisionId: null,
    fromDate: baseline[0]!.scheduledDate,
    toDate: '2026-10-14',
    timeZone: 'America/Toronto',
  };
});
afterEach(() => {
  jest.useRealTimers();
  sqlite.close();
});
const exportNow = () => exportLocalUserData(db, 'guest-user', stamp);
async function ready() {
  await confirmScheduleBaseline(db, confirmation);
}

test('migration creates inactive empty tables without backfilling or changing existing cycles', async () => {
  expect(sqlite.prepare('SELECT * FROM schedule_baselines').all()).toEqual([]);
  expect(sqlite.prepare('SELECT * FROM schedule_revisions').all()).toEqual([]);
  await expect(appendLocalScheduleMove(db, intent, stamp)).rejects.toThrow('explicitly confirmed');
  expect(MIGRATIONS.at(-1)!.version).toBe(28);
});
test('baseline requires explicit confirmation, exact legacy CAS, owner and canonical anchor', async () => {
  const before = await exportNow();
  for (const patch of [
    { confirmed: false as true },
    { userId: 'foreign' },
    { programVersionId: 'foreign' },
    { expectedOverridesJSON: '[{}]' },
    { timeZone: 'Mars/Olympus' },
  ])
    await expect(confirmScheduleBaseline(db, { ...confirmation, ...patch })).rejects.toThrow();
  expect(await exportNow()).toEqual(before);
  await ready();
  await ready();
  await expect(
    confirmScheduleBaseline(db, { ...confirmation, operationId: 'other' }),
  ).rejects.toThrow('immutable');
  expect(sqlite.prepare('SELECT * FROM schedule_baselines').all()).toHaveLength(1);
});
test('move append is exclusive, exact retry is inert, stale/conflicting writes fail and guest outbox is unchanged', async () => {
  await ready();
  const before = await exportNow();
  expect((await appendLocalScheduleMove(db, intent, stamp)).status).toBe('appended');
  expect((await appendLocalScheduleMove(db, intent, '2026-10-13T13:00:00.000Z')).status).toBe(
    'already-applied',
  );
  await expect(
    appendLocalScheduleMove(db, { ...intent, toDate: '2026-10-15' }, stamp),
  ).rejects.toThrow('identity');
  await expect(
    appendLocalScheduleMove(db, { ...intent, operationId: 'move-2' }, stamp),
  ).rejects.toThrow('latest');
  const after = await exportNow();
  expect(after.scheduleRevisions).toHaveLength(1);
  expect(after.trainingCycles).toEqual(before.trainingCycles);
  expect(after.workoutSessions).toEqual(before.workoutSessions);
  expect(after.userProgramVersions).toEqual(before.userProgramVersions);
  expect(
    sqlite.prepare("SELECT * FROM sync_outbox WHERE entity_type LIKE '%schedule%'").all(),
  ).toEqual([]);
});
test('legacy baseline preserves existing moved dates and cannot sneak in a new move', async () => {
  const dates = JSON.parse(confirmation.datesJSON);
  dates[0].scheduledDate = '2026-10-14';
  await expect(
    confirmScheduleBaseline(db, { ...confirmation, datesJSON: JSON.stringify(dates) }),
  ).rejects.toThrow('introduce');
  sqlite
    .prepare(
      'INSERT INTO workout_schedule_overrides (id,user_id,cycle_id,cycle_week,workout_id,original_date,scheduled_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    )
    .run(
      'legacy-move',
      intent.userId,
      intent.cycleId,
      1,
      intent.workoutId,
      intent.fromDate,
      '2026-10-14',
      stamp,
      stamp,
    );
  confirmation.expectedOverridesJSON = JSON.stringify(
    sqlite
      .prepare(
        'SELECT * FROM workout_schedule_overrides WHERE user_id=? AND cycle_id=? ORDER BY cycle_week,workout_id;',
      )
      .all(intent.userId, intent.cycleId),
  );
  await expect(ready()).rejects.toThrow('preserved');
  confirmation.datesJSON = JSON.stringify(dates);
  await ready();
  await appendLocalScheduleMove(
    db,
    { ...intent, fromDate: '2026-10-14', toDate: '2026-10-15' },
    stamp,
  );
  expect(
    sqlite
      .prepare("SELECT scheduled_date FROM workout_schedule_overrides WHERE id='legacy-move'")
      .get(),
  ).toEqual({ scheduled_date: '2026-10-14' });
});
test('migration26 preserves rows of a real migration25 database and creates no baseline', () => {
  const old = new DatabaseSync(':memory:');
  try {
    for (const migration of MIGRATIONS.filter((entry) => entry.version <= 25))
      for (const sql of migration.statements) old.exec(sql);
    old.exec('PRAGMA foreign_keys=ON;');
    for (const table of ['user_profiles', 'training_cycles']) {
      const row = sqlite.prepare(`SELECT * FROM ${table} LIMIT 1`).get()!;
      const columns = Object.keys(row);
      old
        .prepare(
          `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
        )
        .run(...(Object.values(row) as SQLInputValue[]));
    }
    const before = old.prepare('SELECT * FROM training_cycles').all();
    for (const sql of MIGRATIONS.find((entry) => entry.version === 26)!.statements) old.exec(sql);
    expect(old.prepare('SELECT * FROM training_cycles').all()).toEqual(before);
    expect(old.prepare('SELECT * FROM schedule_baselines').all()).toEqual([]);
    expect(old.prepare('SELECT * FROM schedule_revisions').all()).toEqual([]);
  } finally {
    old.close();
  }
});
test('baseline blocks legacy writer insert atomically with no override, outbox or projection changes', async () => {
  await ready();
  const before = await exportNow();
  const projection = await getLocalScheduleProjection(
    db,
    intent.userId,
    intent.cycleId,
    stamp,
    intent.timeZone,
  );
  await expect(
    saveWorkoutScheduleOverride(db, {
      id: 'legacy-after-baseline',
      userId: intent.userId,
      cycleId: intent.cycleId,
      cycleWeek: 1,
      workoutId: intent.workoutId,
      originalDate: intent.fromDate,
      scheduledDate: intent.toDate,
      createdAt: stamp,
      updatedAt: stamp,
    }),
  ).rejects.toThrow('confirmed baseline');
  expect(await exportNow()).toEqual(before);
  expect(
    await getLocalScheduleProjection(db, intent.userId, intent.cycleId, stamp, intent.timeZone),
  ).toEqual(projection);
  expect(
    sqlite.prepare("SELECT * FROM sync_outbox WHERE entity_type LIKE '%schedule%'").all(),
  ).toEqual([]);
});
test('baseline blocks legacy updates and deletes while privacy deletion and adoption remain supported', async () => {
  sqlite
    .prepare(
      'INSERT INTO workout_schedule_overrides (id,user_id,cycle_id,cycle_week,workout_id,original_date,scheduled_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    )
    .run(
      'legacy-before-baseline',
      intent.userId,
      intent.cycleId,
      1,
      intent.workoutId,
      intent.fromDate,
      intent.toDate,
      stamp,
      stamp,
    );
  confirmation.expectedOverridesJSON = JSON.stringify(
    sqlite
      .prepare(
        'SELECT * FROM workout_schedule_overrides WHERE user_id=? AND cycle_id=? ORDER BY cycle_week,workout_id;',
      )
      .all(intent.userId, intent.cycleId),
  );
  const dates = JSON.parse(confirmation.datesJSON);
  dates[0].scheduledDate = intent.toDate;
  confirmation.datesJSON = JSON.stringify(dates);
  await ready();
  const before = await exportNow();
  expect(() =>
    sqlite.exec(
      "UPDATE workout_schedule_overrides SET scheduled_date='2026-10-15' WHERE id='legacy-before-baseline'",
    ),
  ).toThrow('confirmed baseline');
  expect(() =>
    sqlite.exec("DELETE FROM workout_schedule_overrides WHERE id='legacy-before-baseline'"),
  ).toThrow('confirmed baseline');
  expect(await exportNow()).toEqual(before);
  const invalid = structuredClone(before);
  const invalidDates = JSON.parse(String(invalid.scheduleBaselines![0]!.dates_json));
  invalidDates[0].scheduledDate = '2026-10-15';
  invalid.scheduleBaselines![0]!.dates_json = JSON.stringify(invalidDates);
  const write = jest.spyOn(db, 'runAsync');
  await expect(restoreLocalBackup(db, 'guest-user', JSON.stringify(invalid))).rejects.toThrow(
    'preserved',
  );
  expect(write).not.toHaveBeenCalled();
  write.mockRestore();
  await migrateLocalUserToAccount(db, 'guest-user', 'account-user');
  const adopted = await exportLocalUserData(db, 'account-user', stamp);
  expect(adopted.workoutScheduleOverrides[0]!.user_id).toBe('account-user');
  expect(() => validateLocalBackup(JSON.stringify(adopted))).not.toThrow();
  await deleteLocalUserData(db, 'account-user');
  expect(sqlite.prepare('SELECT * FROM workout_schedule_overrides').all()).toEqual([]);
});
test('strict restore rejects unjournaled baseline moves or mismatched legacy bindings before any write', async () => {
  await ready();
  const before = await exportNow();
  const invalid = structuredClone(before);
  const dates = JSON.parse(String(invalid.scheduleBaselines![0]!.dates_json));
  dates[0].scheduledDate = intent.toDate;
  invalid.scheduleBaselines![0]!.dates_json = JSON.stringify(dates);
  const write = jest.spyOn(db, 'runAsync');
  await expect(restoreLocalBackup(db, 'guest-user', JSON.stringify(invalid))).rejects.toThrow(
    'introduce',
  );
  expect(write).not.toHaveBeenCalled();
});
test.each(['in-progress', 'partial', 'complete', 'skipped'])(
  'fresh %s session blocks a stale unstarted preview',
  async (status) => {
    await ready();
    sqlite
      .prepare(
        'INSERT INTO workout_sessions (id,cycle_id,workout_id,program_version_id,status,started_at,cycle_week,workout_focus,is_offline) VALUES (?,?,?,?,?,?,?,?,?)',
      )
      .run(
        'started-session',
        intent.cycleId,
        intent.workoutId,
        intent.programVersionId,
        status,
        stamp,
        1,
        'strength',
        1,
      );
    const before = await exportNow();
    await expect(appendLocalScheduleMove(db, intent, stamp)).rejects.toThrow('history');
    expect(await exportNow()).toEqual(before);
  },
);
test('immutable SQL guards reject baseline rewriting, revision rewriting and forked history', async () => {
  await ready();
  await appendLocalScheduleMove(db, intent, stamp);
  expect(() => sqlite.exec("UPDATE schedule_baselines SET dates_json='[]'")).toThrow('immutable');
  expect(() => sqlite.exec("UPDATE schedule_revisions SET to_date='2026-10-15'")).toThrow(
    'append-only',
  );
  expect(() =>
    sqlite.exec(
      "INSERT INTO schedule_revisions SELECT 'fork',user_id,cycle_id,program_version_id,cycle_week,workout_id,previous_revision_id,from_date,to_date,time_zone,recorded_at,effective_date FROM schedule_revisions",
    ),
  ).toThrow();
});
test('failed post-insert readback rolls back the entire revision append', async () => {
  await ready();
  const before = await exportNow();
  const read = db.getAllAsync.bind(db);
  let reads = 0;
  db.getAllAsync = (async (sql: string, ...args: SQLiteBindValue[]) => {
    if (sql.includes('FROM schedule_revisions') && ++reads === 2)
      throw new Error('synthetic readback failure');
    return read(sql, ...args);
  }) as typeof db.getAllAsync;
  await expect(appendLocalScheduleMove(db, intent, stamp)).rejects.toThrow('readback');
  db.getAllAsync = read;
  expect(await exportNow()).toEqual(before);
});
test('context invalidation after insertion rolls back and prebaseline dates are refused', async () => {
  confirmation.confirmedAt = '2026-10-13T13:00:00.000Z';
  await ready();
  await expect(appendLocalScheduleMove(db, intent, stamp)).rejects.toThrow('baseline confirmation');
  const before = await exportNow();
  let current = true;
  const run = db.runAsync.bind(db);
  db.runAsync = (async (sql: string, ...args: SQLiteBindValue[]) => {
    const result = await run(sql, ...args);
    if (sql.includes('INSERT INTO schedule_revisions')) current = false;
    return result;
  }) as typeof db.runAsync;
  await expect(
    appendLocalScheduleMove(db, intent, '2026-10-13T14:00:00.000Z', () => current),
  ).rejects.toThrow('context changed');
  expect(await exportNow()).toEqual(before);
});
test('schema15 external export validates, deletes and restores exact owned baseline/revisions', async () => {
  await ready();
  await appendLocalScheduleMove(db, intent, stamp);
  const before = await exportNow();
  expect(before.schemaVersion).toBe(17);
  expect(validateLocalBackup(JSON.stringify(before)).data.schemaVersion).toBe(17);
  await deleteLocalUserData(db, 'guest-user');
  expect(sqlite.prepare('SELECT * FROM schedule_baselines').all()).toEqual([]);
  expect(sqlite.prepare('SELECT * FROM schedule_revisions').all()).toEqual([]);
  await restoreLocalBackup(db, 'guest-user', JSON.stringify(before));
  const after = await exportNow();
  expect(after.scheduleBaselines).toEqual(before.scheduleBaselines);
  expect(after.scheduleRevisions).toEqual(before.scheduleRevisions);
  expect(after.trainingCycles).toEqual(before.trainingCycles);
  await expect(
    saveWorkoutScheduleOverride(db, {
      id: 'restored-legacy-write',
      userId: intent.userId,
      cycleId: intent.cycleId,
      cycleWeek: 1,
      workoutId: intent.workoutId,
      originalDate: intent.fromDate,
      scheduledDate: '2026-10-15',
      createdAt: stamp,
      updatedAt: stamp,
    }),
  ).rejects.toThrow('confirmed baseline');
  expect(await exportNow()).toEqual(after);
});
test('shared projection uses revised explicit dates and fresh display timezone, preserving all dates on travel', async () => {
  await ready();
  await appendLocalScheduleMove(db, intent, stamp);
  const west = await getLocalScheduleProjection(
    db,
    intent.userId,
    intent.cycleId,
    '2026-10-14T01:00:00.000Z',
    'America/Los_Angeles',
  );
  const east = await getLocalScheduleProjection(
    db,
    intent.userId,
    intent.cycleId,
    '2026-10-14T01:00:00.000Z',
    'Asia/Tokyo',
  );
  expect(west.latestRevisionId).toBe(intent.operationId);
  const occurrence = (data: typeof west) =>
    data.occurrences.find(
      (entry) => entry.cycleWeek === 1 && entry.workout.id === intent.workoutId,
    )!;
  expect(occurrence(west)).toMatchObject({ scheduledDate: '2026-10-14', status: 'upcoming' });
  expect(occurrence(east)).toMatchObject({ scheduledDate: '2026-10-14', status: 'current' });
  expect(west.occurrences.map((entry) => entry.scheduledDate)).toEqual(
    east.occurrences.map((entry) => entry.scheduledDate),
  );
});
test('strict graph rejects orphan, foreign, malformed, divergent, prebaseline and started-history revisions without writes', async () => {
  await ready();
  await appendLocalScheduleMove(db, intent, stamp);
  const before = await exportNow();
  for (const modify of [
    (copy: typeof before) => {
      copy.scheduleBaselines = [];
    },
    (copy: typeof before) => {
      copy.scheduleRevisions![0]!.user_id = 'foreign';
    },
    (copy: typeof before) => {
      copy.scheduleRevisions![0]!.from_date = '2026-10-15';
    },
    (copy: typeof before) => {
      copy.scheduleRevisions![0]!.previous_revision_id = 'missing';
    },
    (copy: typeof before) => {
      copy.scheduleRevisions![0]!.recorded_at = '2026-10-12T12:00:00.000Z';
    },
    (copy: typeof before) => {
      copy.scheduleBaselines![0]!.dates_json = '[{}]';
    },
    (copy: typeof before) => {
      copy.scheduleRevisions![0]!.cycle_week = 2;
      copy.scheduleRevisions![0]!.from_date = '2026-10-20';
    },
  ]) {
    const copy = structuredClone(before);
    modify(copy);
    copy.summary = buildLocalDataExportSummary(copy);
    await expect(restoreLocalBackup(db, 'guest-user', JSON.stringify(copy))).rejects.toThrow();
    expect(await exportNow()).toEqual(before);
  }
});
test('schema14 normalizes empty schedule sections, rejects future17 and unexpected schedule fields', async () => {
  const copy = await exportNow();
  copy.schemaVersion = 14;
  delete copy.scheduleBaselines;
  delete copy.scheduleRevisions;
  delete copy.coachReviewJournal;
  delete copy.cycleHandovers;
  const normalized = validateLocalBackup(JSON.stringify(copy)).data;
  expect(normalized.schemaVersion).toBe(17);
  expect(normalized.scheduleBaselines).toEqual([]);
  expect(normalized.scheduleRevisions).toEqual([]);
  expect(() => validateLocalBackup(JSON.stringify({ ...copy, schemaVersion: 17 }))).toThrow();
  expect(() => validateLocalBackup(JSON.stringify({ ...copy, scheduleBaselines: [] }))).toThrow();
});
test('strict restore refuses a move timestamp after the matching workout already started', async () => {
  await ready();
  await appendLocalScheduleMove(db, intent, stamp);
  sqlite
    .prepare(
      'INSERT INTO workout_sessions (id,cycle_id,workout_id,program_version_id,status,started_at,cycle_week,workout_focus,is_offline) VALUES (?,?,?,?,?,?,?,?,?)',
    )
    .run(
      'later-session',
      intent.cycleId,
      intent.workoutId,
      intent.programVersionId,
      'partial',
      '2026-10-13T12:30:00.000Z',
      1,
      'strength',
      1,
    );
  const valid = await exportNow();
  expect(() => validateLocalBackup(JSON.stringify(valid))).not.toThrow();
  const invalid = structuredClone(valid);
  invalid.scheduleRevisions![0]!.recorded_at = '2026-10-13T13:00:00.000Z';
  const write = jest.spyOn(db, 'runAsync');
  await expect(restoreLocalBackup(db, 'guest-user', JSON.stringify(invalid))).rejects.toThrow(
    'started workout history',
  );
  expect(write).not.toHaveBeenCalled();
});
test('adoption remaps owner graphs together while preserving immutable dates and operation IDs', async () => {
  await ready();
  await appendLocalScheduleMove(db, intent, stamp);
  const before = await exportNow();
  await migrateLocalUserToAccount(db, 'guest-user', 'account-user');
  const after = await exportLocalUserData(db, 'account-user', stamp);
  expect(after.scheduleBaselines).toEqual(
    before.scheduleBaselines!.map((row) => ({ ...row, user_id: 'account-user' })),
  );
  expect(after.scheduleRevisions).toEqual(
    before.scheduleRevisions!.map((row) => ({ ...row, user_id: 'account-user' })),
  );
  expect(() => validateLocalBackup(JSON.stringify(after))).not.toThrow();
});
const previewInput = () => ({ ...intent, originalTimeZone: 'America/Toronto' });
test('first Calendar preview is inert; confirmation atomically anchors dates and appends exactly once', async () => {
  const before = await exportNow();
  const preview = await previewLocalScheduleMove(db, previewInput(), stamp);
  expect(preview.baseline).not.toBeNull();
  expect(await exportNow()).toEqual(before);
  expect((await confirmLocalScheduleMove(db, preview, '2026-10-13T12:05:00.000Z')).status).toBe(
    'appended',
  );
  expect((await confirmLocalScheduleMove(db, preview, '2026-10-13T12:06:00.000Z')).status).toBe(
    'already-applied',
  );
  const after = await exportNow();
  expect(after.scheduleBaselines).toHaveLength(1);
  expect(after.scheduleRevisions).toHaveLength(1);
  expect(after.trainingCycles).toEqual(before.trainingCycles);
  expect(after.workoutSessions).toEqual(before.workoutSessions);
});
test('failed first confirmation after baseline write leaves neither anchor nor move behind', async () => {
  const preview = await previewLocalScheduleMove(db, previewInput(), stamp);
  const before = await exportNow();
  const run = db.runAsync.bind(db);
  db.runAsync = (async (sql: string, ...args: SQLiteBindValue[]) => {
    if (sql.includes('INSERT INTO schedule_revisions'))
      throw new Error('synthetic move write failure');
    return run(sql, ...args);
  }) as typeof db.runAsync;
  await expect(confirmLocalScheduleMove(db, preview, stamp)).rejects.toThrow('move write');
  expect(await exportNow()).toEqual(before);
});
test('first confirmation rejects newly started actuals and date rollover without anchoring stale input', async () => {
  const preview = await previewLocalScheduleMove(db, previewInput(), stamp);
  await expect(confirmLocalScheduleMove(db, preview, '2026-10-14T12:00:00.000Z')).rejects.toThrow(
    'date changed',
  );
  sqlite
    .prepare(
      'INSERT INTO workout_sessions (id,cycle_id,workout_id,program_version_id,status,started_at,cycle_week,workout_focus,is_offline) VALUES (?,?,?,?,?,?,?,?,?)',
    )
    .run(
      'stale-started',
      intent.cycleId,
      intent.workoutId,
      intent.programVersionId,
      'partial',
      stamp,
      1,
      'strength',
      1,
    );
  const before = await exportNow();
  await expect(confirmLocalScheduleMove(db, preview, stamp)).rejects.toThrow('history');
  expect(await exportNow()).toEqual(before);
});
test('schema15 restore immediately supplies replayed dates to shared Calendar/Home/Cycle/Coach/reminder adapter', async () => {
  const preview = await previewLocalScheduleMove(
    db,
    { ...previewInput(), toDate: '2026-10-25' },
    stamp,
  );
  await confirmLocalScheduleMove(db, preview, stamp);
  const backup = await exportNow();
  await deleteLocalUserData(db, 'guest-user');
  await restoreLocalBackup(db, 'guest-user', JSON.stringify(backup));
  const overrides = await getWorkoutScheduleOverrides(db, intent.userId, intent.cycleId);
  const row = backup.trainingCycles.find((cycle) => cycle.id === intent.cycleId)!;
  const cycle = {
    id: String(row.id),
    userId: String(row.user_id),
    programVersionId: String(row.program_version_id),
    status: 'active' as const,
    currentWeek: 1,
    startedAt: String(row.started_at),
    weeks: JSON.parse(String(row.weeks_json)),
  };
  const version = JSON.parse(
    String(
      backup.userProgramVersions.find((entry) => entry.id === intent.programVersionId)!
        .version_json,
    ),
  );
  const date = parseDateKey('2026-10-25');
  expect(
    buildCycleSchedule(cycle, version, overrides, [], date).find(
      (entry) => entry.cycleWeek === 1 && entry.workout.id === intent.workoutId,
    ),
  ).toMatchObject({
    originalDate: intent.fromDate,
    scheduledDate: '2026-10-25',
    status: 'current',
  });
  expect(
    buildCurrentCycleWeekSchedule(cycle, version, overrides, [], date).find(
      (entry) => entry.workoutId === intent.workoutId,
    ),
  ).toMatchObject({ date: '2026-10-25', status: 'current' });
  expect(selectTrainingWorkout(cycle, version, overrides, [], date)?.workout.id).toBe(
    intent.workoutId,
  );
  expect(await getWorkoutScheduleOverrides(db, intent.userId, intent.cycleId)).toEqual(overrides);
});
test('new Start confirmation saves a pinned baseline with its cycle and rejects existing legacy backfill', async () => {
  jest.useFakeTimers({ now: new Date(stamp) });
  const backup = await exportNow();
  const version = JSON.parse(
    String(
      backup.userProgramVersions.find((entry) => entry.id === intent.programVersionId)!
        .version_json,
    ),
  );
  const startedAt = new Date().toISOString();
  const cycle = createTrainingCycle({
    id: 'explicit-new-start',
    userId: intent.userId,
    programVersion: version,
    startedAt,
  });
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startedAt));
  await saveTrainingCycleWithSchedule(db, cycle, version, 'America/Toronto', date);
  expect(
    sqlite.prepare('SELECT * FROM schedule_baselines WHERE cycle_id=?').all(cycle.id),
  ).toHaveLength(1);
  await expect(
    saveTrainingCycleWithSchedule(
      db,
      { ...cycle, id: intent.cycleId, startedAt: stamp },
      version,
      'America/Toronto',
      '2026-10-13',
    ),
  ).rejects.toThrow('already exists');
});

test('Start crossing local midnight rejects the old preview without creating a cycle or baseline', async () => {
  const startedAt = '2026-10-14T03:59:59.900Z';
  jest.useFakeTimers({ now: new Date(startedAt) });
  const backup = await exportNow();
  const version = JSON.parse(
    String(
      backup.userProgramVersions.find((entry) => entry.id === intent.programVersionId)!
        .version_json,
    ),
  );
  const cycle = createTrainingCycle({
    id: 'midnight-new-start',
    userId: intent.userId,
    programVersion: version,
    startedAt,
  });
  const oldCycles = sqlite.prepare('SELECT * FROM training_cycles ORDER BY id').all();
  const oldBaselines = sqlite.prepare('SELECT * FROM schedule_baselines ORDER BY id').all();
  jest.setSystemTime(new Date('2026-10-14T04:00:00.100Z'));
  await expect(
    saveTrainingCycleWithSchedule(db, cycle, version, 'America/Toronto', '2026-10-13'),
  ).rejects.toThrow('The Start preview changed');
  expect(sqlite.prepare('SELECT * FROM training_cycles ORDER BY id').all()).toEqual(oldCycles);
  expect(sqlite.prepare('SELECT * FROM schedule_baselines ORDER BY id').all()).toEqual(
    oldBaselines,
  );
});
test('new-cycle baseline failure rolls back cycle creation, prior-cycle pause, journal and outbox', async () => {
  const backup = await exportNow();
  const beforeOutbox = sqlite.prepare('SELECT * FROM sync_outbox ORDER BY id').all();
  const version = JSON.parse(
    String(
      backup.userProgramVersions.find((entry) => entry.id === intent.programVersionId)!
        .version_json,
    ),
  );
  const startedAt = new Date().toISOString();
  const cycle = createTrainingCycle({
    id: 'failed-new-start',
    userId: intent.userId,
    programVersion: version,
    startedAt,
  });
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startedAt));
  const run = db.runAsync.bind(db);
  db.runAsync = (async (sql: string, ...args: SQLiteBindValue[]) => {
    if (sql.includes('INSERT INTO schedule_baselines'))
      throw new Error('synthetic Start anchor failure');
    return run(sql, ...args);
  }) as typeof db.runAsync;
  await expect(
    saveTrainingCycleWithSchedule(db, cycle, version, 'America/Toronto', date),
  ).rejects.toThrow('anchor failure');
  expect(await exportNow()).toEqual(backup);
  expect(sqlite.prepare('SELECT * FROM sync_outbox ORDER BY id').all()).toEqual(beforeOutbox);
});
