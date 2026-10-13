import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
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

test('late write failure rolls back every table', async () => {
  failAt = 'notification_preferences';
  await expect(restoreLocalBackup(db, 'guest-user', serialized(fixture()))).rejects.toThrow(
    'Synthetic disk failure',
  );
  expect((await exportLocalUserData(db, 'guest-user', stamp)).summary.totalRecordCount).toBe(0);
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
