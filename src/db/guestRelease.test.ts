import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { MIGRATIONS } from './migrations';
import { saveOnboardingProfile } from './profileRepository';
import { toOnboardingProfile, createOnboardingDraft } from '../domain/onboarding';
import { saveTrainingCycle } from './cycleRepository';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));

test('guest writes preserve local training data without accumulating a cloud outbox', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec('PRAGMA foreign_keys=ON;');
    for (const m of MIGRATIONS) for (const s of m.statements) sqlite.exec(s);
    const db = {
      runAsync: async (sql: string, ...values: SQLInputValue[]) => {
        const r = sqlite.prepare(sql).run(...values);
        return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
      },
      withTransactionAsync: async (operation: () => Promise<void>) => {
        sqlite.exec('BEGIN;');
        try {
          await operation();
          sqlite.exec('COMMIT;');
        } catch (error) {
          sqlite.exec('ROLLBACK;');
          throw error;
        }
      },
    } as unknown as SQLiteDatabase;
    const draft = {
      ...createOnboardingDraft('You'),
      goals: ['strength' as const],
      experience: 'beginner' as const,
      trainingDaysPerWeek: 3,
      preferredSessionMinutes: 30,
      preferredTrainingTime: 'evening' as const,
      unitSystem: 'metric' as const,
      coachTone: 'supportive' as const,
      coachIntervention: 'conservative' as const,
      healthConnection: 'not-now' as const,
    };
    await saveOnboardingProfile(
      db,
      toOnboardingProfile(draft, '2026-10-12T00:00:00Z', 'guest-user'),
    );
    await saveTrainingCycle(db, {
      id: 'cycle',
      userId: 'guest-user',
      programVersionId: 'personal-plan-v1',
      status: 'active',
      currentWeek: 1,
      startedAt: '2026-10-12T00:00:00Z',
      weeks: [],
    });
    expect(sqlite.prepare('SELECT display_name FROM user_profiles;').get()).toEqual({
      display_name: 'You',
    });
    expect(sqlite.prepare('SELECT id FROM training_cycles;').get()).toEqual({ id: 'cycle' });
    expect(sqlite.prepare('SELECT count(*) AS count FROM sync_outbox;').get()).toEqual({
      count: 0,
    });
  } finally {
    sqlite.close();
  }
});
