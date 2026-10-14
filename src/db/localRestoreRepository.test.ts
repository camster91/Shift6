import { loadProvenanceSections } from '../domain/loadUnits';
import { persistenceSections } from '../domain/localPersistence';
import { deleteLocalUserData } from './privacyRepository';
import { migrateLocalUserToAccount } from './accountRepository';
import { getCompletedSets, updateCompletedSet } from './workoutRepository';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { restoreLocalBackup } from './localRestoreRepository';
import {
  exportLocalUserData,
  buildLocalDataExportSummary,
  type LocalDataExport,
} from './privacyRepository';
import { validateLocalBackup, restoreTables, MAX_RESTORE_BYTES } from '../domain/localRestore';
import { createOnboardingDraft } from '../domain/onboarding';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
let sqlite: DatabaseSync;
let db: SQLiteDatabase;
let failAt: string | null;
const stamp = '2026-10-13T04:00:00.000Z';
const fixture = () =>
  JSON.parse(
    readFileSync(join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'), 'utf8'),
  ) as LocalDataExport;
function fixture13() {
  const data = fixture();
  data.schemaVersion = 13;
  const owner = data.userId;
  const cycle = data.trainingCycles[0]!;
  const session = data.workoutSessions[0]!;
  const saved = data.completedSets[0]!;
  const program = JSON.parse(String(data.userPrograms[0]!.program_json));
  const version = JSON.parse(String(data.userProgramVersions[0]!.version_json));
  version.status = 'draft';
  data.cycleLifecycleEvents = [
    {
      id: 'pause',
      user_id: owner,
      cycle_id: cycle.id,
      kind: 'pause',
      effective_date: '2026-10-13',
      time_zone: 'America/Toronto',
      previous_event_id: null,
      operation_id: 'pause-op',
      recorded_at: stamp,
    },
    {
      id: 'resume',
      user_id: owner,
      cycle_id: cycle.id,
      kind: 'resume',
      effective_date: '2026-10-14',
      time_zone: 'America/Toronto',
      previous_event_id: 'pause',
      operation_id: 'resume-op',
      recorded_at: '2026-10-14T04:00:00.000Z',
    },
  ];
  data.coachMemoryPreferences = [{ user_id: owner, enabled: 1, updated_at: stamp }];
  data.coachMemoryFacts = [
    {
      id: 'memory',
      user_id: owner,
      value_json: JSON.stringify({ kind: 'training-time', value: 'evening' }),
      revision: 1,
      operation_id: 'memory-op',
      confirmed_at: stamp,
      updated_at: stamp,
    },
  ];
  data.builderRecoveryDrafts = [
    {
      id: 'recovery',
      user_id: owner,
      snapshot_json: JSON.stringify({
        program,
        version,
        customExercises: data.userExercises.map((row) => JSON.parse(String(row.exercise_json))),
        imports: [
          {
            workoutId: version.workouts[0].id,
            text: 'Unresolved original text',
            previewText: null,
          },
        ],
      }),
      revision: 1,
      updated_at: stamp,
    },
  ];
  data.setFeedbackEvents = [
    {
      id: 'feedback',
      user_id: owner,
      session_id: session.id,
      completed_set_id: saved.id,
      difficulty: 'harder-than-expected',
      corrects_event_id: null,
      operation_id: 'feedback-op',
      recorded_at: stamp,
    },
  ];
  return data;
}
const serialized = (data: LocalDataExport) => {
  data.summary = buildLocalDataExportSummary(data);
  return JSON.stringify(data);
};
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON;');
  failAt = null;
  for (const migration of MIGRATIONS)
    for (const statement of migration.statements) sqlite.exec(statement);
  const adapter = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...args: SQLInputValue[]) => {
      if (failAt && sql.includes(failAt)) throw new Error('Synthetic disk failure');
      const result = sqlite.prepare(sql).run(...args);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...args: SQLInputValue[]) =>
      sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql: string, ...args: SQLInputValue[]) => sqlite.prepare(sql).all(...args),
    withTransactionAsync: async (fn: () => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await fn();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
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
  };
  db = adapter as unknown as SQLiteDatabase;
});
afterEach(() => sqlite.close());

test('legacy 12 remains strict and normalizes empty schema 13 sections', () => {
  const legacy = fixture();
  const preview = validateLocalBackup(serialized(legacy));
  for (const key of Object.keys(persistenceSections) as (keyof typeof persistenceSections)[])
    expect(preview.data[key]).toEqual([]);
  legacy.coachMemoryFacts = [];
  expect(() => validateLocalBackup(serialized(legacy))).toThrow();
  const future = fixture13();
  future.schemaVersion = 18 as 13;
  expect(() => validateLocalBackup(serialized(future))).toThrow(
    'schemas 12, 13, 14, 15, 16 and 17',
  );
});

test('schema 13 requires additions and restores all five tables with disabled memory and draft ownership', async () => {
  const data = fixture13();
  await restoreLocalBackup(db, 'guest-user', serialized(data));
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  expect(exported.schemaVersion).toBe(17);
  expect(exported.coachMemoryPreferences?.[0]?.enabled).toBe(0);
  expect(
    JSON.parse(String(exported.builderRecoveryDrafts?.[0]?.snapshot_json)).program.ownerId,
  ).toBe('guest-user');
  expect(validateLocalBackup(JSON.stringify(exported)).recordCount).toBe(
    exported.summary.totalRecordCount,
  );
  expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  expect(sqlite.prepare('SELECT count(*) AS n FROM sync_outbox').get()).toEqual({ n: 0 });
  await deleteLocalUserData(db, 'guest-user');
  await restoreLocalBackup(db, 'guest-user', JSON.stringify(exported));
  const again = await exportLocalUserData(db, 'guest-user', stamp);
  expect(again).toEqual(exported);
  delete data.coachMemoryFacts;
  expect(() => validateLocalBackup(serialized(data))).toThrow();
});

test('additive migration24 preserves actual schema12 rows from a migration23 database', () => {
  const old = new DatabaseSync(':memory:');
  try {
    old.exec('PRAGMA foreign_keys=ON;');
    for (const migration of MIGRATIONS.filter((entry) => entry.version <= 23))
      for (const statement of migration.statements) old.exec(statement);
    old.exec('BEGIN; PRAGMA defer_foreign_keys=ON;');
    const data = fixture();
    for (const key of Object.keys(restoreTables) as (keyof typeof restoreTables)[]) {
      if (key in persistenceSections || key in loadProvenanceSections) continue;
      const table = restoreTables[key];
      for (const row of data[key] ?? []) {
        const columns = Object.keys(row);
        old
          .prepare(
            `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
          )
          .run(...columns.map((column) => row[column] as SQLInputValue));
      }
    }
    old.exec('COMMIT;');
    const snapshots = Object.entries(restoreTables)
      .filter(
        ([key]) =>
          !(key in persistenceSections) &&
          !(key in loadProvenanceSections) &&
          ![
            'scheduleBaselines',
            'scheduleRevisions',
            'coachReviewJournal',
            'cycleHandovers',
          ].includes(key),
      )
      .map(([, table]) => [table, old.prepare(`SELECT * FROM ${table}`).all()] as const);
    for (const statement of MIGRATIONS.find((entry) => entry.version === 24)!.statements)
      old.exec(statement);
    for (const [table, rows] of snapshots)
      expect(old.prepare(`SELECT * FROM ${table}`).all()).toEqual(rows);
    for (const table of Object.values(persistenceSections))
      expect(old.prepare(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
    expect(old.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  } finally {
    old.close();
  }
});

test('database enforces owned saved-set references, append-only content and idempotency uniqueness', async () => {
  await restoreLocalBackup(db, 'guest-user', serialized(fixture13()));
  expect(() => sqlite.exec("UPDATE set_feedback_events SET difficulty='about-right'")).toThrow(
    'append-only',
  );
  expect(() =>
    sqlite.exec("UPDATE cycle_lifecycle_events SET effective_date='2026-10-20'"),
  ).toThrow('append-only');
  expect(() =>
    sqlite.exec(
      "INSERT INTO set_feedback_events SELECT 'again',user_id,session_id,completed_set_id,difficulty,corrects_event_id,operation_id,recorded_at FROM set_feedback_events",
    ),
  ).toThrow();
  const profile = sqlite.prepare('SELECT * FROM user_profiles').get()!;
  const columns = Object.keys(profile);
  profile.id = 'other-owner';
  sqlite
    .prepare(
      `INSERT INTO user_profiles (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
    )
    .run(...columns.map((column) => profile[column]!));
  const saved = fixture().completedSets[0]!;
  expect(() =>
    sqlite
      .prepare('INSERT INTO set_feedback_events VALUES (?,?,?,?,?,?,?,?)')
      .run(
        'foreign',
        'other-owner',
        saved.session_id as string,
        saved.id as string,
        'about-right',
        null,
        'foreign-op',
        stamp,
      ),
  ).toThrow();
  sqlite
    .prepare('INSERT INTO coach_memory_facts VALUES (?,?,?,?,?,?,?)')
    .run(
      'other-memory',
      'other-owner',
      JSON.stringify({ kind: 'coach-style', value: 'concise' }),
      1,
      'other-op',
      stamp,
      stamp,
    );
  await deleteLocalUserData(db, 'guest-user');
  expect(sqlite.prepare('SELECT id,user_id FROM coach_memory_facts').all()).toEqual([
    { id: 'other-memory', user_id: 'other-owner' },
  ]);
});

test.each([
  'foreign-owner',
  'missing-set',
  'branch',
  'cycle',
  'bad-date',
  'bad-transition',
  'sensitive-memory',
  'stale-preview',
])('schema13 rejects %s before writes', async (fault) => {
  const data = fixture13();
  if (fault === 'foreign-owner') data.coachMemoryFacts![0]!.user_id = 'other';
  if (fault === 'missing-set') data.setFeedbackEvents![0]!.completed_set_id = 'missing';
  if (fault === 'branch')
    data.cycleLifecycleEvents!.push({
      ...data.cycleLifecycleEvents![1],
      id: 'branch',
      operation_id: 'branch-op',
    });
  if (fault === 'cycle') data.cycleLifecycleEvents![0]!.previous_event_id = 'resume';
  if (fault === 'bad-date') data.cycleLifecycleEvents![0]!.effective_date = '2026-02-30';
  if (fault === 'bad-transition') data.cycleLifecycleEvents![0]!.kind = 'resume';
  if (fault === 'sensitive-memory')
    data.coachMemoryFacts![0]!.value_json = JSON.stringify({
      kind: 'health-note',
      value: 'secret',
    });
  if (fault === 'stale-preview') {
    const row = data.builderRecoveryDrafts![0]!;
    const value = JSON.parse(String(row.snapshot_json));
    value.imports[0].previewText = 'other';
    row.snapshot_json = JSON.stringify(value);
  }
  await expect(restoreLocalBackup(db, 'guest-user', serialized(data))).rejects.toThrow();
  expect(sqlite.prepare('SELECT count(*) AS n FROM user_profiles').get()).toEqual({ n: 0 });
});

test('explicit legacy return preserves unknown pause timing in schema13 round trip', async () => {
  const data = fixture13();
  data.cycleLifecycleEvents = [{ ...data.cycleLifecycleEvents![1], previous_event_id: null }];
  await restoreLocalBackup(db, 'guest-user', serialized(data));
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  expect(exported.cycleLifecycleEvents).toHaveLength(1);
  expect(exported.cycleLifecycleEvents![0]!.kind).toBe('resume');
  expect(exported.cycleLifecycleEvents![0]!.previous_event_id).toBeNull();
  expect(validateLocalBackup(JSON.stringify(exported)).recordCount).toBe(
    exported.summary.totalRecordCount,
  );
  data.trainingCycles[0]!.status = 'paused';
  expect(() => validateLocalBackup(serialized(data))).toThrow('current cycle status');
});

test('saved-set corrections preserve occurrence time and feedback still round trips', async () => {
  await restoreLocalBackup(db, 'guest-user', serialized(fixture13()));
  const set = (await getCompletedSets(db, String(fixture().workoutSessions[0]!.id)))[0]!;
  await updateCompletedSet(
    db,
    {
      ...set,
      durationSeconds: (set.durationSeconds ?? 0) + 1,
      completedAt: '2026-10-15T04:00:00.000Z',
    },
    'guest-user',
    set,
  );
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  expect(exported.completedSets[0]!.completed_at).toBe(set.completedAt);
  expect(exported.setFeedbackEvents).toEqual(fixture13().setFeedbackEvents);
  expect(() => validateLocalBackup(JSON.stringify(exported))).not.toThrow();
  await deleteLocalUserData(db, 'guest-user');
  await restoreLocalBackup(db, 'guest-user', JSON.stringify(exported));
  expect(await getCompletedSets(db, set.sessionId)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: set.id,
        completedAt: set.completedAt,
        durationSeconds: (set.durationSeconds ?? 0) + 1,
      }),
    ]),
  );
  expect((await exportLocalUserData(db, 'guest-user', stamp)).setFeedbackEvents).toEqual(
    exported.setFeedbackEvents,
  );
});

test('legacy overwritten occurrence time remains restorable with earlier feedback and matching units', async () => {
  await restoreLocalBackup(db, 'guest-user', serialized(fixture13()));
  const set = (await getCompletedSets(db, String(fixture().workoutSessions[0]!.id)))[0]!;
  const legacyEditTime = '2026-10-15T04:00:00.000Z';
  // Reproduce an old build's stored rows without making the current correction API move dates.
  sqlite
    .prepare('UPDATE completed_sets SET load=?,completed_at=? WHERE id=?')
    .run(40, legacyEditTime, set.id);
  sqlite
    .prepare('INSERT INTO completed_set_load_provenance VALUES (?,?,?,?,?,?,?)')
    .run(set.id, set.sessionId, 'guest-user', 'kg', 40, legacyEditTime, legacyEditTime);
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  expect(Date.parse(String(exported.setFeedbackEvents![0]!.recorded_at))).toBeLessThan(
    Date.parse(String(exported.completedSets[0]!.completed_at)),
  );
  expect(() => validateLocalBackup(JSON.stringify(exported))).not.toThrow();
  await deleteLocalUserData(db, 'guest-user');
  await restoreLocalBackup(db, 'guest-user', JSON.stringify(exported));
  expect(await getCompletedSets(db, set.sessionId)).toEqual([
    { ...set, load: 40, loadUnit: 'kg', completedAt: legacyEditTime },
  ]);
  const restored = await exportLocalUserData(db, 'guest-user', stamp);
  expect(restored.setFeedbackEvents).toEqual(exported.setFeedbackEvents);
  expect(restored.completedSetLoadProvenance).toEqual(exported.completedSetLoadProvenance);
});

test.each(['future', 'backdated', 'past-review'])(
  'restore rejects %s lifecycle chronology',
  (fault) => {
    const data = fixture13();
    const event = data.cycleLifecycleEvents![0]!;
    if (fault === 'future') event.effective_date = '2030-01-01';
    if (fault === 'backdated') {
      event.recorded_at = '2026-10-14T04:00:00.000Z';
    }
    if (fault === 'past-review') {
      event.kind = 'review-date';
      event.recorded_at = '2026-10-14T04:00:00.000Z';
    }
    expect(() => validateLocalBackup(serialized(data))).toThrow('recorded local date');
  },
);

test('restore validates recorded local midnight across DST, not UTC date', () => {
  const data = fixture13();
  const event = data.cycleLifecycleEvents![0]!;
  // Toronto is still on the prior local date at this UTC instant.
  event.recorded_at = '2026-10-14T03:30:00.000Z';
  expect(() => validateLocalBackup(serialized(data))).not.toThrow();
  event.effective_date = '2026-10-14';
  expect(() => validateLocalBackup(serialized(data))).toThrow('recorded local date');
});
test('restore preserves anchored local dates through the autumn DST transition', () => {
  const data = fixture13();
  data.cycleLifecycleEvents![0]!.effective_date = '2026-10-31';
  data.cycleLifecycleEvents![0]!.recorded_at = '2026-11-01T03:30:00.000Z';
  data.cycleLifecycleEvents![1]!.effective_date = '2026-11-01';
  data.cycleLifecycleEvents![1]!.recorded_at = '2026-11-01T07:30:00.000Z';
  expect(() => validateLocalBackup(serialized(data))).not.toThrow();
  data.cycleLifecycleEvents![0]!.effective_date = '2026-11-01';
  expect(() => validateLocalBackup(serialized(data))).toThrow('recorded local date');
});

test('late schema13 insertion failure rolls back legacy and new rows', async () => {
  failAt = 'INSERT INTO set_feedback_events';
  await expect(restoreLocalBackup(db, 'guest-user', serialized(fixture13()))).rejects.toThrow(
    'disk failure',
  );
  for (const table of Object.values(restoreTables))
    expect(sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
});

test('schema13 adoption remaps owner and recovery JSON without outbox creation; deletion removes all additions', async () => {
  await restoreLocalBackup(db, 'guest-user', serialized(fixture13()));
  await migrateLocalUserToAccount(db, 'guest-user', 'new-account');
  for (const table of Object.values(persistenceSections))
    expect(sqlite.prepare(`SELECT DISTINCT user_id FROM ${table}`).all()).toEqual([
      { user_id: 'new-account' },
    ]);
  const exported = await exportLocalUserData(db, 'new-account', stamp);
  expect(() => validateLocalBackup(JSON.stringify(exported))).not.toThrow();
  const draft = sqlite.prepare('SELECT snapshot_json FROM builder_recovery_drafts').get()!;
  expect(JSON.parse(String(draft.snapshot_json)).program.ownerId).toBe('new-account');
  await deleteLocalUserData(db, 'new-account');
  await restoreLocalBackup(db, 'guest-user', JSON.stringify(exported));
  expect(() => validateLocalBackup(JSON.stringify(exported))).not.toThrow();
  expect(
    JSON.parse(String(sqlite.prepare('SELECT program_json FROM user_programs').get()!.program_json))
      .ownerId,
  ).toBe('guest-user');
  await deleteLocalUserData(db, 'guest-user');
  for (const table of Object.values(restoreTables))
    expect(sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
  expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
});

test('late adoption failure rolls back canonical and recovery embedded ownership with actual fixture', async () => {
  await restoreLocalBackup(db, 'guest-user', serialized(fixture13()));
  const before = await exportLocalUserData(db, 'guest-user', stamp);
  const run = db.runAsync.bind(db);
  db.runAsync = (async (sql: string, ...args: SQLInputValue[]) => {
    if (sql.startsWith('DELETE FROM user_profiles')) throw new Error('late adoption failure');
    return run(sql, ...(args as SQLiteBindValue[]));
  }) as SQLiteDatabase['runAsync'];
  await expect(migrateLocalUserToAccount(db, 'guest-user', 'new-account')).rejects.toThrow(
    'late adoption failure',
  );
  expect(await exportLocalUserData(db, 'guest-user', stamp)).toEqual(before);
  expect(sqlite.prepare("SELECT id FROM user_profiles WHERE id='new-account'").all()).toEqual([]);
  expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
});

test('real SQLite round trip preserves immutable graph, goal journals/corrections and draft units with no outbox', async () => {
  const data = fixture();
  const source = 'original-owner';
  data.userId = source;
  for (const key of Object.keys(restoreTables) as (keyof typeof restoreTables)[])
    for (const row of data[key] ?? []) {
      if (row.user_id !== undefined) row.user_id = source;
    }
  data.userProfiles[0]!.id = source;
  for (const row of data.userPrograms) {
    const value = JSON.parse(String(row.program_json));
    value.ownerId = source;
    row.program_json = JSON.stringify(value);
  }
  const session = data.workoutSessions[0]!;
  session.status = 'in-progress';
  session.completed_at = null;
  session.completion_reason = null;
  const savedVersion = JSON.parse(String(data.userProgramVersions[0]!.version_json));
  const setId = `${savedVersion.workouts[0].exercises[0].id}:2`;
  data.workoutDrafts = [
    {
      session_id: session.id,
      values_json: JSON.stringify({
        [setId]: { load: '', reps: '', duration: '45', distance: '', rpe: '', rir: '' },
      }),
      updated_at: stamp,
    },
  ];
  data.personalGoalDrafts = [
    {
      user_id: source,
      cycle_id: data.trainingCycles[0]!.id,
      fields_json: JSON.stringify({
        objective: 'Draft goal',
        target: '120',
        metric: 'load-for-reps',
        repCount: '5',
        fixedDistance: '',
        setup: 'bench',
        assistance: 'none',
        replace: 'no',
        inputUnits: 'imperial',
      }),
    },
  ];
  data.coachPrivacyPreferences = [
    { user_id: source, provider_coach_enabled: 1, notice_version: 1, updated_at: stamp },
  ];
  data.userProfiles[0]!.health_connection = 'health-connect';
  const count = await restoreLocalBackup(db, 'guest-user', serialized(data));
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  expect(exported.summary.totalRecordCount).toBe(count);
  expect(exported.userProgramVersions).toEqual(data.userProgramVersions);
  expect(exported.personalGoalEvents?.map((row) => row.payload_json)).toEqual(
    data.personalGoalEvents?.map((row) => row.payload_json),
  );
  expect(exported.workoutDrafts).toEqual(data.workoutDrafts);
  expect(JSON.parse(String(exported.personalGoalDrafts?.[0]?.fields_json)).inputUnits).toBe(
    'imperial',
  );
  expect(exported.userProfiles[0]!.health_connection).toBe('not-now');
  expect(exported.coachPrivacyPreferences[0]!.provider_coach_enabled).toBe(0);
  expect(exported.notificationPreferences[0]!.workout_reminders).toBe(0);
  expect(exported.userPrograms[0]!.user_id).toBe('guest-user');
  expect(JSON.parse(String(exported.userPrograms[0]!.program_json)).ownerId).toBe('guest-user');
  expect(sqlite.prepare('SELECT COUNT(*) n FROM sync_outbox').get()).toEqual({ n: 0 });
  expect(validateLocalBackup(JSON.stringify(exported)).recordCount).toBe(count);
});

test('duplicate restore and a populated installation refuse overwrite', async () => {
  const text = serialized(fixture());
  await restoreLocalBackup(db, 'guest-user', text);
  const before = await exportLocalUserData(db, 'guest-user', stamp);
  await expect(restoreLocalBackup(db, 'guest-user', text)).rejects.toThrow(
    'already contains local records',
  );
  expect(await exportLocalUserData(db, 'guest-user', stamp)).toEqual(before);
});

test('Sunday uses day seven and survives restore and reexport', async () => {
  const data = fixture();
  const version = JSON.parse(String(data.userProgramVersions[0]!.version_json));
  version.workouts[0].dayOfWeek = 7;
  data.userProgramVersions[0]!.version_json = JSON.stringify(version);
  await restoreLocalBackup(db, 'guest-user', serialized(data));
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  expect(
    JSON.parse(String(exported.userProgramVersions[0]!.version_json)).workouts[0].dayOfWeek,
  ).toBe(7);
  expect(validateLocalBackup(JSON.stringify(exported)).recordCount).toBe(
    exported.summary.totalRecordCount,
  );
});

test('day zero is rejected before a transaction or write', async () => {
  const data = fixture();
  const version = JSON.parse(String(data.userProgramVersions[0]!.version_json));
  version.workouts[0].dayOfWeek = 0;
  data.userProgramVersions[0]!.version_json = JSON.stringify(version);
  const writes = jest.spyOn(db, 'runAsync'),
    transaction = jest.spyOn(db, 'withExclusiveTransactionAsync');
  await expect(restoreLocalBackup(db, 'guest-user', serialized(data))).rejects.toThrow(
    'invalid numeric value',
  );
  expect(writes).not.toHaveBeenCalled();
  expect(transaction).not.toHaveBeenCalled();
});

test('late write failure rolls back every table', async () => {
  failAt = 'notification_preferences';
  await expect(restoreLocalBackup(db, 'guest-user', serialized(fixture()))).rejects.toThrow(
    'Synthetic disk failure',
  );
  expect((await exportLocalUserData(db, 'guest-user', stamp)).summary.totalRecordCount).toBe(0);
});

test('branched corrections are rejected before any transaction or write', async () => {
  const data = fixture();
  const correction = data.shiftObservations.find((row) => row.corrects_observation_id !== null)!;
  data.shiftObservations.push({
    ...correction,
    id: 'second-child-of-original',
    value_json: '38',
    recorded_at: stamp,
  });
  const writes = jest.spyOn(db, 'runAsync'),
    transaction = jest.spyOn(db, 'withExclusiveTransactionAsync');
  await expect(restoreLocalBackup(db, 'guest-user', serialized(data))).rejects.toThrow(
    'branched corrections',
  );
  expect(writes).not.toHaveBeenCalled();
  expect(transaction).not.toHaveBeenCalled();
  expect((await exportLocalUserData(db, 'guest-user', stamp)).summary.totalRecordCount).toBe(0);
});

test('a later correction of the latest correction remains a valid chain', async () => {
  const data = fixture();
  const prior = data.shiftObservations.find((row) => row.corrects_observation_id !== null)!;
  const child = {
    ...prior,
    id: 'latest-correction',
    corrects_observation_id: prior.id,
    value_json: '38',
    recorded_at: stamp,
  };
  data.shiftObservations.push(child);
  const journal = data.personalGoalEvents!.find(
    (row) => row.kind === 'measurement' && String(row.payload_json).includes(String(prior.id)),
  )!;
  const payload = JSON.parse(String(journal.payload_json));
  payload.observation = {
    ...payload.observation,
    id: child.id,
    correctsObservationId: prior.id,
    value: 38,
  };
  data.personalGoalEvents!.push({
    ...journal,
    id: 'measurement:latest-correction',
    payload_json: JSON.stringify(payload),
    recorded_at: stamp,
  });
  await restoreLocalBackup(db, 'guest-user', serialized(data));
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  expect(exported.shiftObservations.find((row) => row.id === child.id)).toEqual(child);
  expect(validateLocalBackup(JSON.stringify(exported)).recordCount).toBe(
    exported.summary.totalRecordCount,
  );
});

test.each([
  [
    'future schema',
    (data: LocalDataExport) => {
      (data as unknown as { schemaVersion: number }).schemaVersion = 13;
    },
  ],
  [
    'foreign owner',
    (data: LocalDataExport) => {
      data.userPrograms[0]!.user_id = 'intruder';
    },
  ],
  [
    'orphan session',
    (data: LocalDataExport) => {
      data.workoutSessions[0]!.cycle_id = 'missing';
    },
  ],
  [
    'duplicate version',
    (data: LocalDataExport) => {
      data.userProgramVersions.push({ ...data.userProgramVersions[0]! });
    },
  ],
  [
    'immutable identity',
    (data: LocalDataExport) => {
      const value = JSON.parse(String(data.userProgramVersions[0]!.version_json));
      value.id = 'wrong';
      data.userProgramVersions[0]!.version_json = JSON.stringify(value);
    },
  ],
  [
    'unknown nested field',
    (data: LocalDataExport) => {
      const value = JSON.parse(String(data.userExercises[0]!.exercise_json));
      value.credentials = { token: 'not-a-token' };
      data.userExercises[0]!.exercise_json = JSON.stringify(value);
    },
  ],
  [
    'correction date mismatch',
    (data: LocalDataExport) => {
      const row = data.shiftObservations.find((row) => row.corrects_observation_id !== null)!;
      row.measured_at = stamp;
    },
  ],
])('rejects %s before any mutation', async (_label, mutate) => {
  const data = fixture();
  mutate(data);
  await expect(restoreLocalBackup(db, 'guest-user', serialized(data))).rejects.toThrow();
  expect((await exportLocalUserData(db, 'guest-user', stamp)).summary.totalRecordCount).toBe(0);
});

test('malformed or oversized files are inert and unsupported account target is rejected', async () => {
  expect(() => validateLocalBackup('{not JSON')).toThrow('valid JSON');
  expect(() => validateLocalBackup(' '.repeat(MAX_RESTORE_BYTES + 1))).toThrow('20 MiB');
  await expect(restoreLocalBackup(db, 'account-user', serialized(fixture()))).rejects.toThrow(
    'guest installation',
  );
});

test('all supported preference/history tables survive with media explicitly detached', async () => {
  const data = fixture(),
    owner = data.userId,
    cycle = data.trainingCycles[0]!.id,
    session = data.workoutSessions[0]!.id;
  const version = JSON.parse(String(data.userProgramVersions[0]!.version_json));
  data.userConsiderations = [
    {
      user_id: owner,
      movement_considerations_json: '[]',
      accessibility_needs_json: '[]',
      updated_at: stamp,
    },
  ];
  data.bodyMetrics = [
    {
      id: 'weight-record',
      user_id: owner,
      metric_type: 'weight',
      value: 70,
      unit: 'kg',
      measured_at: stamp,
      created_at: stamp,
    },
  ];
  data.healthSummaries = [
    {
      user_id: owner,
      source: 'health-connect',
      id: 'health-record',
      health_type: 'steps',
      value: 500,
      unit: 'count',
      start_at: stamp,
      end_at: stamp,
    },
  ];
  data.workoutCheckIns = [
    {
      session_id: session,
      energy: 3,
      soreness: 2,
      perceived_exertion: 3,
      discomfort_reported: 0,
      note: 'Synthetic check-in',
      created_at: stamp,
      updated_at: stamp,
    },
  ];
  data.coachProposals = [
    {
      id: 'coach-history',
      user_id: owner,
      cycle_id: cycle,
      summary: 'Historical proposal',
      confidence: 'low',
      evidence_json: '[]',
      changes_json: '[]',
      safety_notes_json: '[]',
      status: 'rejected',
      created_at: stamp,
      updated_at: stamp,
    },
  ];
  data.cycleReviews = [
    {
      id: 'cycle-review',
      user_id: owner,
      cycle_id: cycle,
      overall_rating: 3,
      focus: 'same-course',
      next_action: 'repeat',
      note: 'Synthetic reflection',
      created_at: stamp,
      updated_at: stamp,
    },
  ];
  data.workoutScheduleOverrides = [
    {
      id: 'schedule',
      user_id: owner,
      cycle_id: cycle,
      cycle_week: 1,
      workout_id: version.workouts[0].id,
      original_date: '2026-10-12',
      scheduled_date: '2026-10-13',
      created_at: stamp,
      updated_at: stamp,
    },
  ];
  data.onboardingDrafts = [
    {
      user_id: owner,
      state_json: JSON.stringify({
        version: 1,
        flow: 'essential',
        step: 0,
        draft: createOnboardingDraft('Synthetic'),
        movementConsiderations: [],
        accessibilityNeeds: [],
      }),
      updated_at: stamp,
    },
  ];
  const movement = JSON.parse(String(data.userExercises[0]!.exercise_json));
  movement.media = [
    {
      id: 'media',
      type: 'video',
      uri: 'file:///old-device/private.mp4',
      altText: 'Synthetic clip',
      reviewStatus: 'draft',
    },
  ];
  data.userExercises[0]!.exercise_json = JSON.stringify(movement);
  await restoreLocalBackup(db, 'guest-user', serialized(data));
  const exported = await exportLocalUserData(db, 'guest-user', stamp);
  for (const key of [
    'userConsiderations',
    'bodyMetrics',
    'healthSummaries',
    'workoutCheckIns',
    'coachProposals',
    'cycleReviews',
    'workoutScheduleOverrides',
    'shiftObservations',
    'shiftGoalRevisions',
  ] as const)
    expect(exported[key]).toEqual(data[key]);
  expect(JSON.parse(String(exported.userExercises[0]!.exercise_json)).media).toEqual([]);
  expect(validateLocalBackup(JSON.stringify(exported)).recordCount).toBe(
    exported.summary.totalRecordCount,
  );
});
