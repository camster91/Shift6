import type { SQLiteDatabase } from 'expo-sqlite';

import { getWorkoutHistory } from './historyRepository';

describe('getWorkoutHistory', () => {
  it('maps session and completed-set aggregates to a user-scoped history entry', async () => {
    const database = {
      getAllAsync: async (sql: string, ...params: unknown[]) => {
        expect(sql).toContain('WHERE training_cycles.user_id = ?');
        expect(sql).toContain('COUNT(*) AS completed_set_count');
        expect(params).toEqual(['guest-user', 100]);
        return [
          {
            id: 'session-1',
            cycle_id: 'cycle-1',
            cycle_week: 1,
            workout_id: 'workout-1',
            program_version_id: 'version-1',
            workout_focus: 'strength',
            status: 'complete',
            started_at: '2026-09-14T12:00:00.000Z',
            completed_at: '2026-09-14T12:30:00.000Z',
            completion_reason: null,
            is_offline: 1,
            version_json: JSON.stringify({
              workouts: [{ id: 'workout-1', title: 'Strength A' }],
            }),
            completed_set_count: 3,
            total_volume: 925,
            total_duration_seconds: 0,
            total_distance_meters: 0,
          },
        ];
      },
    } as unknown as SQLiteDatabase;

    await expect(getWorkoutHistory(database, 'guest-user')).resolves.toEqual([
      expect.objectContaining({
        id: 'session-1',
        title: 'Strength A',
        completedSetCount: 3,
        totalVolume: 925,
        durationMinutes: 30,
        isOffline: true,
      }),
    ]);
  });

  it('bounds history reads and falls back safely when a version snapshot is malformed', async () => {
    const calls: unknown[][] = [];
    const database = {
      getAllAsync: async (_sql: string, ...params: unknown[]) => {
        calls.push(params);
        return [
          {
            id: 'session-2',
            cycle_id: 'cycle-1',
            cycle_week: 1,
            workout_id: 'workout-pull',
            program_version_id: 'version-1',
            workout_focus: 'strength',
            status: 'partial',
            started_at: '2026-09-14T12:00:00.000Z',
            completed_at: '2026-09-14T12:05:00.000Z',
            completion_reason: 'time-limited',
            is_offline: 0,
            version_json: '{not-json',
            completed_set_count: 1,
            total_volume: 100,
            total_duration_seconds: 0,
            total_distance_meters: 0,
          },
        ];
      },
    } as unknown as SQLiteDatabase;

    const entries = await getWorkoutHistory(database, 'guest-user', 999);

    expect(calls).toEqual([['guest-user', 200]]);
    expect(entries[0]).toMatchObject({
      title: 'Pull',
      status: 'partial',
      completionReason: 'time-limited',
    });
  });
});
