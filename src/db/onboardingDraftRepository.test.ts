import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { createOnboardingDraft } from '../domain/onboarding';
import type { OnboardingRecoveryState } from '../domain/onboardingRecovery';
import { migrateLocalUserToAccount } from './accountRepository';
import { MIGRATIONS } from './migrations';
import {
  clearOnboardingDraft,
  getOnboardingDraft,
  saveOnboardingDraft,
} from './onboardingDraftRepository';
import { deleteLocalUserData, exportLocalUserData } from './privacyRepository';

function memoryDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  for (const migration of MIGRATIONS) for (const sql of migration.statements) sqlite.exec(sql);
  const database = {
    runAsync: async (sql: string, ...values: SQLInputValue[]) => {
      const result = sqlite.prepare(sql).run(...values);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...values: SQLInputValue[]) =>
      sqlite.prepare(sql).get(...values) ?? null,
    getAllAsync: async (sql: string, ...values: SQLInputValue[]) =>
      sqlite.prepare(sql).all(...values),
    withTransactionAsync: async (callback: () => Promise<void>) => {
      sqlite.exec('BEGIN;');
      try {
        await callback();
        sqlite.exec('COMMIT;');
      } catch (error) {
        sqlite.exec('ROLLBACK;');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
  return { sqlite, database };
}
const state = (step = 0): OnboardingRecoveryState => ({
  version: 1,
  flow: 'essential',
  step,
  draft: {
    ...createOnboardingDraft('You'),
    goals: ['strength'],
    coachTone: 'supportive',
    coachIntervention: 'conservative',
    healthConnection: 'not-now',
  },
  movementConsiderations: ['avoid-impact'],
  accessibilityNeeds: ['larger-text'],
});

describe('local onboarding recovery', () => {
  it('restores the latest step and choices without creating a completed profile or sync operation', async () => {
    const { sqlite, database } = memoryDatabase();
    try {
      await saveOnboardingDraft(database, 'guest-user', state());
      const latest = { ...state(2), draft: { ...state().draft, experience: 'beginner' as const } };
      await saveOnboardingDraft(database, 'guest-user', latest);
      expect(await getOnboardingDraft(database, 'guest-user')).toEqual(latest);
      expect(sqlite.prepare('SELECT count(*) AS count FROM user_profiles;').get()).toEqual({
        count: 0,
      });
      expect(sqlite.prepare('SELECT count(*) AS count FROM sync_outbox;').get()).toEqual({
        count: 0,
      });
    } finally {
      sqlite.close();
    }
  });

  it('scopes reads and cleanup to the owner', async () => {
    const { sqlite, database } = memoryDatabase();
    try {
      await saveOnboardingDraft(database, 'one', state(1));
      await saveOnboardingDraft(database, 'two', state(2));
      expect(await getOnboardingDraft(database, 'missing')).toBeNull();
      await clearOnboardingDraft(database, 'one');
      expect(await getOnboardingDraft(database, 'one')).toBeNull();
      expect(await getOnboardingDraft(database, 'two')).toEqual(state(2));
      await expect(saveOnboardingDraft(database, ' ', state())).rejects.toThrow('user ID');
    } finally {
      sqlite.close();
    }
  });

  it.each([
    'invalid JSON',
    JSON.stringify({ ...state(), version: 2 }),
    JSON.stringify({ ...state(), step: 99 }),
    JSON.stringify({ ...state(), flow: '__proto__' }),
    JSON.stringify({ ...state(), draft: { ...state().draft, unitSystem: 'unknown' } }),
  ])('ignores corrupt or unsupported recovery data: %s', async (serialized) => {
    const { sqlite, database } = memoryDatabase();
    try {
      sqlite
        .prepare('INSERT INTO onboarding_drafts VALUES (?, ?, ?);')
        .run('one', serialized, 'now');
      expect(await getOnboardingDraft(database, 'one')).toBeNull();
    } finally {
      sqlite.close();
    }
  });

  it('adopts an unfinished guest draft once and blocks a genuine occupied-owner merge', async () => {
    const { sqlite, database } = memoryDatabase();
    try {
      await saveOnboardingDraft(database, 'guest-user', state(3));
      expect((await migrateLocalUserToAccount(database, 'guest-user', 'account')).status).toBe(
        'migrated',
      );
      expect(await getOnboardingDraft(database, 'account')).toEqual(state(3));
      expect(await getOnboardingDraft(database, 'guest-user')).toBeNull();
      expect((await migrateLocalUserToAccount(database, 'guest-user', 'account')).status).toBe(
        'no-data',
      );
      await saveOnboardingDraft(database, 'guest-user', state(1));
      await expect(migrateLocalUserToAccount(database, 'guest-user', 'account')).rejects.toThrow(
        'explicit merge',
      );
      expect(await getOnboardingDraft(database, 'guest-user')).toEqual(state(1));
      expect(await getOnboardingDraft(database, 'account')).toEqual(state(3));
    } finally {
      sqlite.close();
    }
  });

  it('includes unfinished choices in local export and erases only the requested owner', async () => {
    const { sqlite, database } = memoryDatabase();
    try {
      await saveOnboardingDraft(database, 'one', state(1));
      await saveOnboardingDraft(database, 'two', state(2));
      const exported = await exportLocalUserData(database, 'one', 'now');
      expect(exported.schemaVersion).toBe(12);
      expect(exported.onboardingDrafts).toHaveLength(1);
      expect(exported.onboardingDrafts?.[0]?.user_id).toBe('one');
      expect(exported.summary.totalRecordCount).toBe(1);
      await deleteLocalUserData(database, 'one');
      expect(await getOnboardingDraft(database, 'one')).toBeNull();
      expect(await getOnboardingDraft(database, 'two')).toEqual(state(2));
    } finally {
      sqlite.close();
    }
  });
});
