import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { confirmOnboardingSetup } from './onboardingConfirmation';
import { createOnboardingDraft } from '../domain/onboarding';
import type { OnboardingRecoveryState } from '../domain/onboardingRecovery';
import { saveOnboardingDraft, getOnboardingDraft } from './onboardingDraftRepository';
import { getOnboardingProfile } from './profileRepository';
import { getUserConsiderations } from './considerationsRepository';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
const stamp = '2026-10-13T12:00:00.000Z';
const confirmed = (): OnboardingRecoveryState => ({
  version: 1,
  flow: 'detailed',
  step: 9,
  draft: {
    ...createOnboardingDraft('Sam'),
    goals: ['strength'],
    experience: 'beginner',
    equipmentIds: ['equipment-bodyweight'],
    trainingDaysPerWeek: 3,
    preferredSessionMinutes: 30,
    preferredTrainingTime: 'evening',
    unitSystem: 'imperial',
    coachTone: 'supportive',
    coachIntervention: 'conservative',
    healthConnection: 'not-now',
  },
  movementConsiderations: ['avoid-impact'],
  accessibilityNeeds: ['larger-text'],
});
let sqlite: DatabaseSync;
let db: SQLiteDatabase;
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON;');
  for (const migration of MIGRATIONS)
    for (const statement of migration.statements) sqlite.exec(statement);
  db = {
    runAsync: async (sql: string, ...args: SQLInputValue[]) => {
      const result = sqlite.prepare(sql).run(...args);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...args: SQLInputValue[]) =>
      sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql: string, ...args: SQLInputValue[]) => sqlite.prepare(sql).all(...args),
    withExclusiveTransactionAsync: async (callback: (tx: SQLiteDatabase) => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await callback(db);
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
});
afterEach(() => sqlite.close());

test('explicit confirmation atomically saves verified profile/preferences and consumes only matching recovery', async () => {
  const state = confirmed();
  await saveOnboardingDraft(db, 'owner', state);
  await confirmOnboardingSetup(db, 'owner', state, state, stamp, () => true);
  expect((await getOnboardingProfile(db, 'owner'))?.user).toMatchObject({
    id: 'owner',
    unitSystem: 'imperial',
    equipmentIds: ['equipment-bodyweight'],
  });
  expect((await getUserConsiderations(db, 'owner')).movementConsiderations).toEqual([
    'avoid-impact',
  ]);
  expect(await getOnboardingDraft(db, 'owner')).toBeNull();
  expect(sqlite.prepare('SELECT * FROM sync_outbox').all()).toEqual([]);
});

test.each([
  'INSERT INTO user_profiles',
  'INSERT INTO user_considerations',
  'DELETE FROM onboarding_drafts',
])(
  'context cancellation during %s rolls back profile, preferences and draft removal',
  async (phase) => {
    const state = confirmed();
    await saveOnboardingDraft(db, 'owner', state);
    let current = true;
    let release!: () => void;
    let reached!: () => void;
    const atPhase = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const run = db.runAsync.bind(db);
    db.runAsync = (async (sql: string, ...args: SQLiteBindValue[]) => {
      const result = await run(sql, ...args);
      if (sql.includes(phase)) {
        reached();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      return result;
    }) as SQLiteDatabase['runAsync'];
    const write = confirmOnboardingSetup(db, 'owner', state, state, stamp, () => current);
    const rejected = expect(write).rejects.toThrow('cancelled');
    await atPhase;
    current = false;
    release();
    await rejected;
    expect(await getOnboardingProfile(db, 'owner')).toBeNull();
    expect(sqlite.prepare('SELECT * FROM user_considerations').all()).toEqual([]);
    expect(await getOnboardingDraft(db, 'owner')).toEqual(state);
    expect(sqlite.prepare('SELECT * FROM sync_outbox').all()).toEqual([]);
  },
);

test('a changed recovery checkpoint is rejected before profile writes and preserved', async () => {
  const state = confirmed();
  const newer = { ...state, draft: { ...state.draft, unitSystem: 'metric' as const } };
  await saveOnboardingDraft(db, 'owner', newer);
  const run = jest.spyOn(db, 'runAsync');
  await expect(
    confirmOnboardingSetup(db, 'owner', state, state, stamp, () => true),
  ).rejects.toThrow('choices changed');
  expect(run).not.toHaveBeenCalled();
  expect(await getOnboardingDraft(db, 'owner')).toEqual(newer);
});

test('late disk failure rolls back a previously confirmed profile and keeps recovery', async () => {
  const state = confirmed();
  await confirmOnboardingSetup(db, 'owner', state, null, stamp, () => true);
  const prior = await getOnboardingProfile(db, 'owner');
  const changed = { ...state, draft: { ...state.draft, coachTone: 'concise' as const } };
  await saveOnboardingDraft(db, 'owner', changed);
  const run = db.runAsync.bind(db);
  db.runAsync = (async (sql: string, ...args: SQLiteBindValue[]) => {
    if (sql.includes('INSERT INTO user_considerations')) throw new Error('Disk unavailable');
    return run(sql, ...args);
  }) as SQLiteDatabase['runAsync'];
  await expect(
    confirmOnboardingSetup(db, 'owner', changed, changed, stamp, () => true),
  ).rejects.toThrow('Disk unavailable');
  expect(await getOnboardingProfile(db, 'owner')).toEqual(prior);
  expect(await getOnboardingDraft(db, 'owner')).toEqual(changed);
});

test('an unreadable existing recovery is preserved rather than treated as an empty draft', async () => {
  sqlite
    .prepare('INSERT INTO onboarding_drafts(user_id,state_json,updated_at) VALUES(?,?,?)')
    .run('owner', '{broken', stamp);
  await expect(
    confirmOnboardingSetup(db, 'owner', confirmed(), null, stamp, () => true),
  ).rejects.toThrow('choices changed');
  expect(await getOnboardingProfile(db, 'owner')).toBeNull();
  expect(
    sqlite.prepare('SELECT state_json FROM onboarding_drafts WHERE user_id=?').get('owner'),
  ).toEqual({ state_json: '{broken' });
});
