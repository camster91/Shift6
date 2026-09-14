import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getCompletedWorkoutIds,
  getCycleCardioRecords,
  getCycleCompletedSetRecords,
  getCycleProgressSummary,
  getExerciseProgress,
  getLatestCompletedWorkoutSets,
} from './progressRepository';

describe('getCycleProgressSummary', () => {
  it('maps local sessions and completed sets into deterministic cycle facts', async () => {
    const database = {
      getAllAsync: async (sql: string) => {
        if (sql.includes('workout_check_ins')) {
          return [
            { session_id: 'session-1', perceived_exertion: 4, discomfort_reported: 1 },
            { session_id: 'session-2', perceived_exertion: 3, discomfort_reported: 0 },
          ];
        }
        if (sql.includes('completed_sets.session_id')) {
          return [
            {
              session_id: 'session-1',
              exercise_id: 'exercise-back-squat',
              workout_exercise_id: 'workout-exercise-squat',
              workout_id: 'workout-1',
              version_json: null,
              completed_at: '2026-09-13T12:05:00.000Z',
              load: 185,
              reps: 5,
              duration_seconds: null,
              distance_meters: null,
              rpe: null,
              rir: 2,
            },
            {
              session_id: 'session-2',
              exercise_id: null,
              workout_exercise_id: 'workout-exercise-bike',
              workout_id: 'workout-2',
              version_json: null,
              completed_at: '2026-09-14T12:05:00.000Z',
              load: null,
              reps: null,
              duration_seconds: 900,
              distance_meters: 3000,
              rpe: 7,
              rir: null,
            },
          ];
        }
        return [
          {
            id: 'session-1',
            cycle_week: 1,
            status: 'complete',
            started_at: '2026-09-13T12:00:00.000Z',
            completed_at: '2026-09-13T12:30:00.000Z',
            workout_focus: 'strength',
            readiness: 'ready',
          },
          {
            id: 'session-2',
            cycle_week: 2,
            status: 'complete',
            started_at: '2026-09-14T12:00:00.000Z',
            completed_at: '2026-09-14T12:15:00.000Z',
            workout_focus: 'cardio',
            readiness: 'limited',
          },
        ];
      },
    } as unknown as SQLiteDatabase;

    await expect(getCycleProgressSummary(database, 'cycle-1', 18)).resolves.toMatchObject({
      facts: {
        plannedWorkoutCount: 18,
        completedWorkoutCount: 2,
        completionRate: 2 / 18,
        totalTrainingVolume: 925,
        cardioMinutes: 15,
        averageSessionDurationMinutes: 22.5,
        averageReportedEffort: 3.5,
        discomfortFlags: 1,
        readinessCounts: { ready: 1, limited: 1, rest: 0 },
        completedTrainingDays: 2,
        activeWeeks: 2,
        personalRecordIds: [
          'record-exercise-back-squat-load-session-1',
          'record-exercise-back-squat-reps-session-1',
          'record-exercise-back-squat-estimated-one-rep-max-session-1',
        ],
      },
      loggedSetCount: 2,
    });
  });

  it('returns complete-cycle set records with legacy exercise IDs resolved', async () => {
    const database = {
      getAllAsync: async () => [
        {
          session_id: 'session-1',
          exercise_id: null,
          workout_exercise_id: 'workout-exercise-squat',
          completed_at: '2026-09-14T12:05:00.000Z',
          load: 185,
          reps: 5,
          duration_seconds: null,
          distance_meters: null,
          workout_id: 'workout-1',
          version_json: JSON.stringify({
            workouts: [
              {
                id: 'workout-1',
                exercises: [{ id: 'workout-exercise-squat', exerciseId: 'exercise-squat' }],
              },
            ],
          }),
        },
      ],
    } as unknown as SQLiteDatabase;

    await expect(getCycleCompletedSetRecords(database, 'cycle-1')).resolves.toEqual([
      {
        sessionId: 'session-1',
        exerciseId: 'exercise-squat',
        completedAt: '2026-09-14T12:05:00.000Z',
        load: 185,
        reps: 5,
        durationSeconds: undefined,
        distanceMeters: undefined,
      },
    ]);
  });

  it('reads complete cardio set measurements from the local cycle', async () => {
    const database = {
      getAllAsync: async () => [
        {
          session_id: 'cardio-session-1',
          cycle_week: 2,
          completed_at: '2026-09-20T12:30:00.000Z',
          duration_seconds: 1_200,
          distance_meters: 4_000,
        },
      ],
    } as unknown as SQLiteDatabase;

    await expect(getCycleCardioRecords(database, 'cycle-1')).resolves.toEqual([
      {
        sessionId: 'cardio-session-1',
        cycleWeek: 2,
        completedAt: '2026-09-20T12:30:00.000Z',
        durationSeconds: 1_200,
        distanceMeters: 4_000,
      },
    ]);
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

  it('can scope latest-set lookup to the active immutable program version', async () => {
    const params: unknown[][] = [];
    const database = {
      getFirstAsync: async (_sql: string, ...values: unknown[]) => {
        params.push(values);
        return null;
      },
    } as unknown as SQLiteDatabase;

    await expect(
      getLatestCompletedWorkoutSets(database, 'cycle-1', 'workout-1', 'program-version-2'),
    ).resolves.toEqual([]);
    expect(params[0]).toEqual(['cycle-1', 'workout-1', 'program-version-2', 'program-version-2']);
  });

  it('loads only the selected exercise history for deterministic progress points', async () => {
    const database = {
      getAllAsync: async () => [
        {
          session_id: 'session-1',
          exercise_id: 'exercise-back-squat',
          workout_exercise_id: 'workout-exercise-squat',
          completed_at: '2026-09-13T12:05:00.000Z',
          load: 185,
          reps: 5,
        },
        {
          session_id: 'session-2',
          exercise_id: 'exercise-back-squat',
          workout_exercise_id: 'workout-exercise-squat',
          completed_at: '2026-09-14T12:05:00.000Z',
          load: 190,
          reps: 5,
        },
      ],
    } as unknown as SQLiteDatabase;

    await expect(
      getExerciseProgress(database, 'cycle-1', 'exercise-back-squat'),
    ).resolves.toMatchObject({
      exerciseId: 'exercise-back-squat',
      points: [
        { sessionId: 'session-1', bestLoad: 185 },
        { sessionId: 'session-2', bestLoad: 190 },
      ],
    });
  });

  it('resolves legacy set identity from the immutable program snapshot', async () => {
    const database = {
      getAllAsync: async () => [
        {
          session_id: 'session-legacy',
          exercise_id: null,
          workout_exercise_id: 'workout-exercise-squat',
          completed_at: '2026-09-13T12:05:00.000Z',
          load: 185,
          reps: 5,
          workout_id: 'workout-1',
          version_json: JSON.stringify({
            workouts: [
              {
                id: 'workout-1',
                exercises: [{ id: 'workout-exercise-squat', exerciseId: 'exercise-back-squat' }],
              },
            ],
          }),
        },
      ],
    } as unknown as SQLiteDatabase;

    await expect(
      getExerciseProgress(database, 'cycle-1', 'exercise-back-squat'),
    ).resolves.toMatchObject({
      points: [{ sessionId: 'session-legacy', bestLoad: 185 }],
    });
  });

  it('maps timed and distance fields into movement history', async () => {
    const database = {
      getAllAsync: async () => [
        {
          session_id: 'session-bike',
          exercise_id: 'exercise-bike',
          workout_exercise_id: 'workout-exercise-bike',
          completed_at: '2026-09-13T12:05:00.000Z',
          load: null,
          reps: null,
          duration_seconds: 900,
          distance_meters: 3000,
          workout_id: 'workout-cardio',
          version_json: null,
        },
      ],
    } as unknown as SQLiteDatabase;

    await expect(getExerciseProgress(database, 'cycle-1', 'exercise-bike')).resolves.toMatchObject({
      points: [{ sessionId: 'session-bike', bestDurationSeconds: 900, bestDistanceMeters: 3000 }],
    });
  });
});

describe('getCompletedWorkoutIds', () => {
  it('returns unique completed workouts for one persisted cycle week', async () => {
    const database = {
      getAllAsync: async () => [
        { workout_id: 'workout-strength-a' },
        { workout_id: 'workout-strength-a' },
        { workout_id: 'workout-strength-b' },
      ],
    } as unknown as SQLiteDatabase;

    await expect(getCompletedWorkoutIds(database, 'cycle-1', 1)).resolves.toEqual(
      new Set(['workout-strength-a', 'workout-strength-b']),
    );
  });
});
