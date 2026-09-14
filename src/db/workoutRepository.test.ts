import type { SQLiteDatabase } from 'expo-sqlite';

import type { CompletedSet } from '../domain/types';
import {
  completeWorkoutSession,
  getCompletedSets,
  saveCompletedSet,
  saveWorkoutSession,
} from './workoutRepository';

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

  it('reads completed sets by stable session and exercise IDs', async () => {
    const database = {
      getAllAsync: async () => [
        {
          id: 'set-1',
          session_id: 'session-1',
          workout_exercise_id: 'workout-exercise-1',
          set_number: 1,
          load: 185,
          reps: 5,
          duration_seconds: null,
          distance_meters: null,
          rpe: null,
          rir: 2,
          completed_at: '2026-09-13T12:05:00.000Z',
          idempotency_key: 'session-1:workout-exercise-1:1',
        },
      ],
    } as unknown as SQLiteDatabase;

    await expect(getCompletedSets(database, 'session-1')).resolves.toEqual([completedSet]);
  });

  it('only completes an in-progress session', async () => {
    const calls: unknown[][] = [];
    const database = {
      runAsync: async (_sql: string, ...params: unknown[]) => {
        calls.push(params);
        return { changes: 1, lastInsertRowId: 1 };
      },
    } as unknown as SQLiteDatabase;

    await expect(
      completeWorkoutSession(database, 'session-1', '2026-09-13T12:30:00.000Z'),
    ).resolves.toBeUndefined();
    expect(calls).toEqual([['2026-09-13T12:30:00.000Z', 'session-1']]);
  });
});

describe('saveWorkoutSession', () => {
  it('persists the session and its sync mutation atomically', async () => {
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

    await saveWorkoutSession(database, {
      id: 'session-1',
      cycleId: 'cycle-1',
      workoutId: 'workout-1',
      programVersionId: 'program-version-1',
      workoutFocus: 'strength',
      status: 'in-progress',
      startedAt: '2026-09-13T12:00:00.000Z',
      isOffline: true,
    });

    expect(calls[0]).toBe('BEGIN TRANSACTION');
    expect(calls[1]).toContain('INSERT OR IGNORE INTO workout_sessions');
    expect(calls[2]).toContain('INSERT OR IGNORE INTO sync_outbox');
    expect(calls[3]).toBe('COMMIT TRANSACTION');
  });
});
