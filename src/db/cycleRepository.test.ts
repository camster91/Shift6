import type { SQLiteDatabase } from 'expo-sqlite';

import { demoCycle, demoProgramVersion } from '../domain/fixtures/home';
import {
  advanceTrainingCycleAfterCompletedWorkout,
  getCompletedRequiredWorkoutCount,
  getPreviousTrainingCycle,
  saveTrainingCycle,
} from './cycleRepository';

function fakeDatabase() {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const database = {
    runAsync: async (sql: string, ...params: unknown[]) => {
      calls.push({ sql, params });
      return { changes: 1, lastInsertRowId: 1 };
    },
    withTransactionAsync: async (callback: () => Promise<void>) => {
      calls.push({ sql: 'BEGIN TRANSACTION', params: [] });
      await callback();
      calls.push({ sql: 'COMMIT TRANSACTION', params: [] });
    },
  } as unknown as SQLiteDatabase;

  return { database, calls };
}

describe('saveTrainingCycle', () => {
  it('pauses a previous active cycle and stores the new snapshot atomically', async () => {
    const { database, calls } = fakeDatabase();

    await expect(saveTrainingCycle(database, demoCycle)).resolves.toBeUndefined();

    expect(calls[0]?.sql).toBe('BEGIN TRANSACTION');
    expect(calls[1]?.sql).toContain("SET status = 'paused'");
    expect(calls[2]?.sql).toContain('INSERT INTO training_cycles');
    expect(calls[2]?.params).toContain(JSON.stringify(demoCycle.weeks));
    expect(calls.at(-1)?.sql).toBe('COMMIT TRANSACTION');
  });
});

describe('advanceTrainingCycleAfterCompletedWorkout', () => {
  it('uses persisted completed-session count to advance one cycle week', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      getFirstAsync: async (sql: string) => {
        if (sql.includes('FROM user_program_versions')) {
          return { version_json: JSON.stringify(demoProgramVersion) };
        }
        if (sql.includes('FROM training_cycles')) {
          return {
            id: demoCycle.id,
            user_id: demoCycle.userId,
            program_version_id: demoCycle.programVersionId,
            status: demoCycle.status,
            current_week: demoCycle.currentWeek,
            started_at: demoCycle.startedAt,
            weeks_json: JSON.stringify(demoCycle.weeks),
          };
        }
        return { count: 3 };
      },
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      withTransactionAsync: async (callback: () => Promise<void>) => {
        await callback();
      },
    } as unknown as SQLiteDatabase;

    const updated = await advanceTrainingCycleAfterCompletedWorkout(database, demoCycle.id, 1);

    expect(updated?.currentWeek).toBe(2);
    expect(updated?.weeks[0]).toMatchObject({ status: 'completed', completedWorkoutCount: 3 });
    expect(updated?.weeks[1]).toMatchObject({ status: 'current', completedWorkoutCount: 0 });
    expect(calls[0]?.sql).toContain('UPDATE training_cycles');
    expect(calls[1]?.sql).toContain('INSERT INTO sync_outbox');
  });

  it('excludes optional workouts from the persisted cycle count', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const version = {
      ...demoProgramVersion,
      workouts: [
        { ...demoProgramVersion.workouts[0]!, id: 'required-workout' },
        { ...demoProgramVersion.workouts[1]!, id: 'optional-cardio', isOptional: true },
      ],
    };
    const database = {
      getFirstAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        if (sql.includes('FROM user_program_versions')) {
          return { version_json: JSON.stringify(version) };
        }
        return { count: 1 };
      },
    } as unknown as SQLiteDatabase;

    await expect(
      getCompletedRequiredWorkoutCount(database, 'cycle-1', 1, version.id),
    ).resolves.toBe(1);

    expect(calls[1]?.sql).toContain('COUNT(DISTINCT workout_id)');
    expect(calls[1]?.sql).toContain('workout_id IN (?)');
    expect(calls[1]?.params).toEqual(['cycle-1', 1, 'required-workout']);
  });
});

describe('getPreviousTrainingCycle', () => {
  it('resolves the immediately prior cycle by timestamp and stable ID', async () => {
    const database = {
      getFirstAsync: async (sql: string, ...params: unknown[]) => {
        expect(sql).toContain('started_at < ? OR (started_at = ? AND id < ?)');
        expect(params).toEqual([
          demoCycle.userId,
          demoCycle.startedAt,
          demoCycle.startedAt,
          demoCycle.id,
        ]);
        return {
          id: 'cycle-previous',
          user_id: demoCycle.userId,
          program_version_id: 'version-previous',
          status: 'complete',
          current_week: 6,
          started_at: '2026-08-01T12:00:00.000Z',
          weeks_json: JSON.stringify(demoCycle.weeks),
        };
      },
    } as unknown as SQLiteDatabase;

    await expect(getPreviousTrainingCycle(database, demoCycle.userId, demoCycle)).resolves.toEqual(
      expect.objectContaining({ id: 'cycle-previous', status: 'complete' }),
    );
  });
});
