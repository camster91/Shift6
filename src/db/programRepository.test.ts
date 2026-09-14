import type { SQLiteDatabase } from 'expo-sqlite';

import { demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { createCustomExercise } from '../domain/programBuilder';
import { saveCustomExercise, saveProgramVersion } from './programRepository';

function fakeDatabase() {
  const calls: string[] = [];
  const database = {
    runAsync: async (sql: string) => {
      calls.push(sql);
      return { changes: 1, lastInsertRowId: 1 };
    },
    withTransactionAsync: async (callback: () => Promise<void>) => {
      calls.push('BEGIN TRANSACTION');
      await callback();
      calls.push('COMMIT TRANSACTION');
    },
  } as unknown as SQLiteDatabase;

  return { database, calls };
}

describe('programRepository', () => {
  it('stores a user-owned program version and queues its latest snapshot', async () => {
    const { database, calls } = fakeDatabase();

    await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);

    expect(calls).toEqual([
      'BEGIN TRANSACTION',
      expect.stringContaining('INSERT INTO user_programs'),
      expect.stringContaining('INSERT INTO user_program_versions'),
      expect.stringContaining('INSERT INTO sync_outbox'),
      'COMMIT TRANSACTION',
    ]);
  });

  it('stores custom exercises with the same local-first outbox boundary', async () => {
    const { database, calls } = fakeDatabase();
    const exercise = createCustomExercise({
      id: 'exercise-custom-repository',
      name: 'Tempo squat',
      movementPattern: 'squat',
      primaryMuscles: ['quadriceps'],
      equipmentIds: ['equipment-bodyweight'],
    });

    await saveCustomExercise(database, 'guest-user', exercise, '2026-09-14T12:00:00.000Z');

    expect(calls).toEqual([
      'BEGIN TRANSACTION',
      expect.stringContaining('INSERT INTO user_exercises'),
      expect.stringContaining('INSERT INTO sync_outbox'),
      'COMMIT TRANSACTION',
    ]);
  });
});
