import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { restoreLocalBackup } from './localRestoreRepository';
import { exportLocalUserData } from './privacyRepository';
import {
  getCompletedSets,
  getWorkoutDraft,
  saveWorkoutDraft,
  saveCompletedSet,
} from './workoutRepository';
import { parseVoiceSet, type VoiceSetBinding } from '../domain/voiceSetDraft';
import { validateLocalBackup } from '../domain/localRestore';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));

test.each(['kg', 'lb'] as const)(
  'reviewed spoken %s retains declared metadata through draft and explicit canonical save',
  async (unit) => {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec('PRAGMA foreign_keys=ON;');
    for (const migration of MIGRATIONS)
      for (const statement of migration.statements) sqlite.exec(statement);
    const db = {
      execAsync: async (sql: string) => sqlite.exec(sql),
      runAsync: async (sql: string, ...args: SQLInputValue[]) => {
        const result = sqlite.prepare(sql).run(...args);
        return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
      },
      getFirstAsync: async (sql: string, ...args: SQLInputValue[]) =>
        sqlite.prepare(sql).get(...args) ?? null,
      getAllAsync: async (sql: string, ...args: SQLInputValue[]) =>
        sqlite.prepare(sql).all(...args),
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
    try {
      const fixture = readFileSync(
        join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'),
        'utf8',
      );
      await restoreLocalBackup(db, 'guest-user', fixture);
      const saved = (await getCompletedSets(db, JSON.parse(fixture).workoutSessions[0].id))[0]!;
      const binding: VoiceSetBinding = {
        ownerId: 'guest-user',
        sessionId: saved.sessionId,
        programVersionId: 'synthetic-version',
        workoutExerciseId: saved.workoutExerciseId,
        exerciseId: saved.exerciseId!,
        setNumber: 2,
        loadUnit: 'unknown',
        contextKey: 'explicit-synthetic-snapshot',
        required: ['reps'],
        allowed: ['reps', 'load'],
      };
      const reviewed = parseVoiceSet(`8 reps, 40 ${unit}`, binding);
      expect(reviewed.unresolved).toEqual([]);
      const key = `${saved.workoutExerciseId}:2`;
      const values = {
        [key]: {
          load: '',
          reps: '',
          duration: '',
          distance: '',
          rpe: '',
          rir: '',
          ...reviewed.values,
        },
      };
      await saveWorkoutDraft(db, saved.sessionId, values, '2026-10-14T12:00:00.000Z', 'guest-user');
      expect((await getWorkoutDraft(db, saved.sessionId))?.[key]).toMatchObject({
        load: '40',
        loadUnit: unit,
        reps: '8',
      });
      expect(await getCompletedSets(db, saved.sessionId)).toEqual([saved]);
      // Represents the separate explicit Complete action; parsing/apply never calls this.
      await saveCompletedSet(
        db,
        {
          ...saved,
          id: 'voice-reviewed-actual',
          setNumber: 2,
          load: Number(reviewed.values.load),
          loadUnit: unit,
          reps: Number(reviewed.values.reps),
          idempotencyKey: 'voice-reviewed-op',
          completedAt: '2026-10-14T12:00:00.000Z',
        },
        'guest-user',
      );
      expect(
        (await getCompletedSets(db, saved.sessionId)).find(
          (set) => set.id === 'voice-reviewed-actual',
        ),
      ).toMatchObject({ load: 40, loadUnit: unit, reps: 8 });
      const exported = await exportLocalUserData(db, 'guest-user', '2026-10-14T12:00:00.000Z');
      expect(() => validateLocalBackup(JSON.stringify(exported))).not.toThrow();
    } finally {
      sqlite.close();
    }
  },
);
