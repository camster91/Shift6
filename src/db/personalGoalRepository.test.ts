import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { exportLocalUserData } from './privacyRepository';
import { saveOnboardingProfile } from './profileRepository';
import { createOnboardingDraft, toOnboardingProfile } from '../domain/onboarding';
import {
  appendPersonalObservation,
  createPersonalGoal,
  getPersonalGoal,
  getPersonalObservations,
  revisePersonalTarget,
  savePersonalGoalDraft,
  getPersonalGoalDraft,
  savePersonalReview,
  setPersonalBaselineState,
} from './personalGoalRepository';
import type { MeasurementProtocol, ShiftObservation } from '../domain/shift';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
let sqlite: DatabaseSync;
let db: SQLiteDatabase;
const now = '2026-10-12T12:00:00.000Z';
const protocol: MeasurementProtocol = {
  id: 'setup',
  version: 1,
  exerciseId: 'own-exercise',
  variantId: 'own-variant',
  assistance: 'none',
  equipmentSetup: 'none',
  metric: 'reps',
  canonicalUnit: 'reps',
  direction: 'higher',
};
const goal = {
  id: 'goal',
  objective: 'My repetitions',
  protocol,
  target: 10,
  replacePrimary: false,
};
const observation: ShiftObservation = {
  id: 'one',
  shiftId: 'goal',
  protocolId: 'setup',
  protocolVersion: 1,
  measuredAt: now,
  source: 'assessment',
  value: 0,
  unit: 'reps',
};
beforeEach(async () => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON;');
  for (const migration of MIGRATIONS)
    for (const statement of migration.statements) sqlite.exec(statement);
  const adapter = {
    runAsync: async (sql: string, ...args: SQLInputValue[]) => {
      const r = sqlite.prepare(sql).run(...args);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...args: SQLInputValue[]) =>
      sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql: string, ...args: SQLInputValue[]) => sqlite.prepare(sql).all(...args),
    withExclusiveTransactionAsync: async (fn: (tx: SQLiteDatabase) => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await fn(db);
        sqlite.exec('COMMIT');
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  db = adapter as unknown as SQLiteDatabase;
  (
    adapter as typeof adapter & { withTransactionAsync: (fn: () => Promise<void>) => Promise<void> }
  ).withTransactionAsync = async (fn) => fn();
  await saveOnboardingProfile(
    db,
    toOnboardingProfile(
      {
        ...createOnboardingDraft('You'),
        goals: ['strength'],
        experience: 'beginner',
        trainingDaysPerWeek: 3,
        preferredSessionMinutes: 30,
        preferredTrainingTime: 'evening',
        unitSystem: 'metric',
        coachTone: 'supportive',
        coachIntervention: 'conservative',
        healthConnection: 'not-now',
      },
      now,
      'owner',
    ),
  );
  sqlite
    .prepare(
      'INSERT INTO training_cycles(id,user_id,program_version_id,status,current_week,started_at,weeks_json) VALUES(?,?,?,?,?,?,?)',
    )
    .run('cycle', 'owner', 'plan', 'active', 1, now, '[]');
});
afterEach(() => sqlite.close());
test('owned creation clears recovered draft, is idempotent and creates no cloud queue', async () => {
  await savePersonalGoalDraft(db, 'owner', 'cycle', { objective: 'My repetitions' });
  expect(await getPersonalGoalDraft(db, 'owner', 'cycle')).toEqual({ objective: 'My repetitions' });
  await createPersonalGoal(db, 'owner', 'cycle', goal, now);
  await createPersonalGoal(db, 'owner', 'cycle', goal, now);
  expect(await getPersonalGoalDraft(db, 'owner', 'cycle')).toBeNull();
  expect((await getPersonalGoal(db, 'owner', 'cycle'))?.target).toBe(10);
  expect(await getPersonalGoal(db, 'other', 'cycle')).toBeNull();
  await expect(
    createPersonalGoal(db, 'owner', 'cycle', { ...goal, target: 20 }, now),
  ).rejects.toThrow('conflicting');
  expect(sqlite.prepare('SELECT count(*) n FROM sync_outbox').get()).toEqual({ n: 0 });
});
test('zero is measured explicitly, corrections append and retain date, cross-owner access fails', async () => {
  await createPersonalGoal(db, 'owner', 'cycle', goal, now);
  await appendPersonalObservation(db, 'owner', observation, true, now);
  await appendPersonalObservation(db, 'owner', observation, true, now);
  expect((await getPersonalGoal(db, 'owner', 'cycle'))?.baseline).toEqual({
    state: 'measured',
    observationId: 'one',
  });
  const corrected = {
    ...observation,
    id: 'two',
    value: 2,
    source: 'historical-entry' as const,
    correctsObservationId: 'one',
  };
  await appendPersonalObservation(db, 'owner', corrected, false, now);
  expect((await getPersonalObservations(db, 'owner', 'goal')).map((o) => o.value)).toEqual([0, 2]);
  await expect(
    appendPersonalObservation(db, 'owner', { ...corrected, id: 'three' }, false, now),
  ).rejects.toThrow('already corrected');
  await expect(
    appendPersonalObservation(db, 'other', { ...observation, id: 'other' }, false, now),
  ).rejects.toThrow('current user');
  await expect(
    appendPersonalObservation(db, 'owner', { ...observation, id: 'bad', unit: 'kg' }, false, now),
  ).rejects.toThrow('match');
  expect(await getPersonalObservations(db, 'owner', 'goal')).toHaveLength(2);
});
test('baseline states, target revisions and review history survive without replacing observations', async () => {
  await createPersonalGoal(db, 'owner', 'cycle', goal, now);
  await setPersonalBaselineState(db, 'owner', 'goal', 'not-yet-able', 'baseline', now);
  await revisePersonalTarget(db, 'owner', 'goal', 12, 'My revised target', 'rev', now);
  await revisePersonalTarget(db, 'owner', 'goal', 12, 'My revised target', 'rev', now);
  await savePersonalReview(db, 'owner', 'goal', 'completed', 'maintain', 'review', now);
  const saved = await getPersonalGoal(db, 'owner', 'cycle');
  expect(saved).toMatchObject({
    target: 12,
    baseline: { state: 'not-yet-able' },
    reviewState: 'completed',
    nextChoice: 'maintain',
  });
  expect(sqlite.prepare('SELECT count(*) n FROM shift_goal_revisions').get()).toEqual({ n: 1 });
  expect(sqlite.prepare('SELECT count(*) n FROM personal_goal_events').get()).toEqual({ n: 4 });
  expect(await getPersonalObservations(db, 'owner', 'goal')).toEqual([]);
  await expect(
    db.runAsync("UPDATE training_cycles SET program_version_id='other' WHERE id='cycle'"),
  ).rejects.toThrow('immutable');
});
test('replacing another primary goal requires confirmation and keeps its history', async () => {
  await createPersonalGoal(db, 'owner', 'cycle', goal, now);
  sqlite.prepare("UPDATE training_cycles SET status='paused' WHERE id='cycle'").run();
  sqlite
    .prepare(
      'INSERT INTO training_cycles(id,user_id,program_version_id,status,current_week,started_at,weeks_json) VALUES(?,?,?,?,?,?,?)',
    )
    .run('next', 'owner', 'plan2', 'active', 1, now, '[]');
  await expect(
    createPersonalGoal(db, 'owner', 'next', { ...goal, id: 'next-goal' }, now),
  ).rejects.toThrow('Confirm');
  expect(sqlite.prepare("SELECT is_primary FROM shifts WHERE id='goal'").get()).toEqual({
    is_primary: 1,
  });
  await createPersonalGoal(
    db,
    'owner',
    'next',
    { ...goal, id: 'next-goal', replacePrimary: true },
    now,
  );
  expect(sqlite.prepare('SELECT count(*) n FROM shifts').get()).toEqual({ n: 2 });
  expect(sqlite.prepare("SELECT is_primary FROM shifts WHERE id='goal'").get()).toEqual({
    is_primary: 0,
  });
});
test('goal deletion cascades through private journal, setup and measurements', async () => {
  await createPersonalGoal(db, 'owner', 'cycle', goal, now);
  await appendPersonalObservation(db, 'owner', observation, true, now);
  await db.runAsync('DELETE FROM shifts WHERE id=?', 'goal');
  for (const table of ['personal_goal_events', 'shift_protocols', 'shift_observations'])
    expect(sqlite.prepare(`SELECT count(*) n FROM ${table}`).get()).toEqual({ n: 0 });
});

test('export includes private goal journal and drafts only for the requested owner', async () => {
  await createPersonalGoal(db, 'owner', 'cycle', goal, now);
  await savePersonalGoalDraft(db, 'owner', 'cycle', { objective: 'local draft' });
  const data = await exportLocalUserData(db, 'owner', now);
  expect(data.schemaVersion).toBe(16);
  expect(data.personalGoalEvents).toHaveLength(1);
  expect(data.personalGoalDrafts).toHaveLength(1);
  const other = await exportLocalUserData(db, 'other', now);
  expect(other.personalGoalEvents).toEqual([]);
  expect(other.personalGoalDrafts).toEqual([]);
});

test.each([
  {
    metric: 'load-for-reps',
    canonicalUnit: 'kg',
    direction: 'higher',
    repCount: 5,
    target: 30,
    value: 20,
  },
  { metric: 'hold-duration', canonicalUnit: 'seconds', direction: 'higher', target: 60, value: 30 },
  {
    metric: 'fixed-distance-time',
    canonicalUnit: 'seconds',
    direction: 'lower',
    fixedDistanceMeters: 1000,
    target: 300,
    value: 400,
  },
  { metric: 'distance', canonicalUnit: 'meters', direction: 'higher', target: 1000, value: 500 },
  {
    metric: 'completion',
    canonicalUnit: 'completed',
    direction: 'complete',
    target: true,
    value: false,
  },
])('persists the explicit $metric measurement setup and baseline', async (specification) => {
  const { target, value, ...measurement } = specification;
  const configured = { ...protocol, ...measurement } as MeasurementProtocol;
  await createPersonalGoal(
    db,
    'owner',
    'cycle',
    { ...goal, protocol: configured, target: target as number | true },
    now,
  );
  await appendPersonalObservation(
    db,
    'owner',
    { ...observation, value, unit: configured.canonicalUnit },
    true,
    now,
  );
  expect((await getPersonalGoal(db, 'owner', 'cycle'))?.protocol).toEqual(configured);
  expect((await getPersonalObservations(db, 'owner', 'goal'))[0]?.value).toBe(value);
});

test('fails closed when an isolated connection has foreign keys disabled', async () => {
  sqlite.exec('PRAGMA foreign_keys=OFF;');
  await expect(createPersonalGoal(db, 'owner', 'cycle', goal, now)).rejects.toThrow(
    'cannot save goals safely',
  );
  expect(sqlite.prepare('SELECT count(*) n FROM shifts').get()).toEqual({ n: 0 });
});

test('rejects inherited object names as measurement metrics', async () => {
  const invalid = {
    ...protocol,
    metric: 'constructor',
    canonicalUnit: undefined,
    direction: undefined,
  } as unknown as MeasurementProtocol;
  await expect(
    createPersonalGoal(db, 'owner', 'cycle', { ...goal, protocol: invalid }, now),
  ).rejects.toThrow('measurement setup');
  expect(sqlite.prepare('SELECT count(*) n FROM shifts').get()).toEqual({ n: 0 });
});
