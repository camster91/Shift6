import type { SQLiteDatabase } from 'expo-sqlite';

import { getCycleProgressSummary, getLatestCompletedWorkoutSets } from './progressRepository';

describe('getCycleProgressSummary', () => {
  it('maps local sessions and completed sets into deterministic cycle facts', async () => {
    const database = {
      getAllAsync: async (sql: string) =>
        !sql.includes('completed_sets.session_id')
          ? [
              {
                id: 'session-1',
                status: 'complete',
                started_at: '2026-09-13T12:00:00.000Z',
                completed_at: '2026-09-13T12:30:00.000Z',
                workout_focus: 'strength',
              },
              {
                id: 'session-2',
                status: 'complete',
                started_at: '2026-09-14T12:00:00.000Z',
                completed_at: '2026-09-14T12:15:00.000Z',
                workout_focus: 'cardio',
              },
            ]
          : [
              {
                session_id: 'session-1',
                load: 185,
                reps: 5,
                duration_seconds: null,
                distance_meters: null,
                rpe: null,
                rir: 2,
              },
              {
                session_id: 'session-2',
                load: null,
                reps: null,
                duration_seconds: 900,
                distance_meters: 3000,
                rpe: 7,
                rir: null,
              },
            ],
    } as unknown as SQLiteDatabase;

    await expect(getCycleProgressSummary(database, 'cycle-1', 18)).resolves.toMatchObject({
      facts: {
        plannedWorkoutCount: 18,
        completedWorkoutCount: 2,
        completionRate: 2 / 18,
        totalTrainingVolume: 925,
        cardioMinutes: 15,
        averageSessionDurationMinutes: 22.5,
      },
      loggedSetCount: 2,
    });
  });

  it('finds the latest completed workout before deriving next targets', async () => {
    const database = {
      getFirstAsync: async () => ({ id: 'session-latest' }),
      getAllAsync: async () => [
        {
          id: 'set-latest',
          session_id: 'session-latest',
          workout_exercise_id: 'exercise-1',
          set_number: 1,
          load: 185,
          reps: 5,
          duration_seconds: null,
          distance_meters: null,
          rpe: null,
          rir: 2,
          completed_at: '2026-09-14T12:05:00.000Z',
          idempotency_key: 'session-latest:exercise-1:1',
        },
      ],
    } as unknown as SQLiteDatabase;

    await expect(
      getLatestCompletedWorkoutSets(database, 'cycle-1', 'workout-1'),
    ).resolves.toMatchObject([{ id: 'set-latest', load: 185, reps: 5 }]);
  });
});
