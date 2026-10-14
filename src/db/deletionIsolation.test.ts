import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { deleteLocalUserData } from './privacyRepository';
import { restoreLocalBackup } from './localRestoreRepository';
import { saveOnboardingDraft } from './onboardingDraftRepository';
import { createOnboardingDraft } from '../domain/onboarding';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
test('an unrelated same-handle draft save cannot join and survive the local deletion transaction', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'shift6-delete-isolation-'));
  const path = join(directory, 'data.sqlite');
  const main = new DatabaseSync(path);
  main.exec('PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;');
  for (const migration of MIGRATIONS) for (const sql of migration.statements) main.exec(sql);
  let intercept = false;
  let rejection: unknown = null;
  let attempted = false;
  const adapter = (connection: DatabaseSync) => ({
    execAsync: async (sql: string) => connection.exec(sql),
    getFirstAsync: async (sql: string, ...args: SQLInputValue[]) =>
      connection.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql: string, ...args: SQLInputValue[]) =>
      connection.prepare(sql).all(...args),
    runAsync: async (sql: string, ...args: SQLInputValue[]) => {
      const result = connection.prepare(sql).run(...args);
      if (intercept && sql.startsWith('DELETE FROM user_profiles')) {
        intercept = false;
        attempted = true;
        try {
          await saveOnboardingDraft(db, 'guest-user', {
            version: 1,
            flow: 'essential',
            step: 0,
            draft: createOnboardingDraft('Synthetic'),
            movementConsiderations: [],
            accessibilityNeeds: [],
          });
        } catch (error) {
          rejection = error;
        }
      }
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
  });
  const ambient = async (fn: () => Promise<void>) => {
    main.exec('BEGIN');
    try {
      await fn();
      main.exec('COMMIT');
    } catch (error) {
      main.exec('ROLLBACK');
      throw error;
    }
  };
  const db: SQLiteDatabase = {
    ...adapter(main),
    withTransactionAsync: ambient,
    withExclusiveTransactionAsync: async (fn: (tx: SQLiteDatabase) => Promise<void>) => {
      const isolated = new DatabaseSync(path);
      isolated.exec('PRAGMA foreign_keys=ON;BEGIN;');
      try {
        await fn(adapter(isolated) as SQLiteDatabase);
        isolated.exec('COMMIT');
      } catch (error) {
        isolated.exec('ROLLBACK');
        throw error;
      } finally {
        isolated.close();
      }
    },
  } as unknown as SQLiteDatabase;
  try {
    await restoreLocalBackup(
      db,
      'guest-user',
      readFileSync(join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'), 'utf8'),
    );
    intercept = true;
    await deleteLocalUserData(db, 'guest-user');
    expect(attempted).toBe(true);
    expect(main.prepare('SELECT * FROM onboarding_drafts').all()).toEqual([]);
    expect(String(rejection)).toContain('locked');
  } finally {
    main.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
