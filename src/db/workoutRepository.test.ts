import type { SQLiteDatabase } from 'expo-sqlite';

import type { CompletedSet } from '../domain/types';
import { saveCompletedSet } from './workoutRepository';

const completedSet: CompletedSet = {
  id: 'set-1',
  sessionId: 'session-1',
  workoutExerciseId: 'workout-exercise-1',
  setNumber: 1,
  load: 185,
  reps: 5,
  rir: 2,
  completedAt: '2026-09-13T12:05:00.000Z',
  idempotencyKey: 'session-1:workout-exercise-1:1',
};

function fakeDatabase(completedSetChanges: number) {
  const calls: string[] = [];
  let runCount = 0;

  const database = {
    runAsync: async (sql: string) => {
      calls.push(sql);
      runCount += 1;
      return { changes: runCount === 1 ? completedSetChanges : 1, lastInsertRowId: 1 };
    },
    withTransactionAsync: async (callback: () => Promise<void>) => {
      calls.push('BEGIN TRANSACTION');
      await callback();
      calls.push('COMMIT TRANSACTION');
    },
  } as unknown as SQLiteDatabase;

  return { database, calls };
}

describe('saveCompletedSet', () => {
  it('commits the local set and outbox mutation in one transaction', async () => {
    const { database, calls } = fakeDatabase(1);

    await expect(saveCompletedSet(database, completedSet)).resolves.toBe('inserted');
    expect(calls[0]).toBe('BEGIN TRANSACTION');
    expect(calls[1]).toContain('INSERT OR IGNORE INTO completed_sets');
    expect(calls[2]).toContain('INSERT OR IGNORE INTO sync_outbox');
    expect(calls[3]).toBe('COMMIT TRANSACTION');
  });

  it('does not enqueue a duplicate set when SQLite reports no inserted row', async () => {
    const { database, calls } = fakeDatabase(0);

    await expect(saveCompletedSet(database, completedSet)).resolves.toBe('duplicate');
    expect(calls).toEqual([
      'BEGIN TRANSACTION',
      expect.stringContaining('completed_sets'),
      'COMMIT TRANSACTION',
    ]);
  });
});
