import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getWorkoutScheduleOverrides,
  getWorkoutScheduleSessions,
  saveWorkoutScheduleOverride,
} from './calendarRepository';

const override = {
  id: 'schedule-override-cycle-1-1-workout-1',
  userId: 'guest-user',
  cycleId: 'cycle-1',
  cycleWeek: 1,
  workoutId: 'workout-1',
  originalDate: '2026-09-14',
  scheduledDate: '2026-09-16',
  createdAt: '2026-09-14T12:00:00.000Z',
  updatedAt: '2026-09-14T12:01:00.000Z',
} as const;

describe('calendar repository', () => {
  it('reads user-scoped overrides and workout session outcomes', async () => {
    const database = {
      getAllAsync: async (sql: string) => {
        if (sql.includes('workout_schedule_overrides')) {
          return [
            {
              id: override.id,
              user_id: override.userId,
              cycle_id: override.cycleId,
              cycle_week: override.cycleWeek,
              workout_id: override.workoutId,
              original_date: override.originalDate,
              scheduled_date: override.scheduledDate,
              created_at: override.createdAt,
              updated_at: override.updatedAt,
            },
          ];
        }
        return [
          {
            cycle_week: 1,
            workout_id: 'workout-1',
            status: 'complete',
            completed_at: '2026-09-16T12:30:00.000Z',
          },
        ];
      },
    } as unknown as SQLiteDatabase;

    await expect(getWorkoutScheduleOverrides(database, 'guest-user', 'cycle-1')).resolves.toEqual([
      override,
    ]);
    await expect(getWorkoutScheduleSessions(database, 'cycle-1')).resolves.toEqual([
      {
        cycleWeek: 1,
        workoutId: 'workout-1',
        status: 'complete',
        completedAt: '2026-09-16T12:30:00.000Z',
      },
    ]);
  });

  it('writes the override and its idempotent sync mutation atomically', async () => {
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

    await expect(saveWorkoutScheduleOverride(database, override)).resolves.toBeUndefined();

    expect(calls[0]?.sql).toBe('BEGIN TRANSACTION');
    expect(calls[1]?.sql).toContain('INSERT INTO workout_schedule_overrides');
    expect(calls[2]?.sql).toContain('INSERT INTO sync_outbox');
    expect(calls[2]?.params).toContain('workout-schedule-override');
    expect(calls[2]?.params).toContain(`workout-schedule-override:${override.id}`);
    expect(calls.at(-1)?.sql).toBe('COMMIT TRANSACTION');
  });
});
