import { buildWorkoutHistoryEntry, sortWorkoutHistory } from './history';

describe('workout history domain', () => {
  it('normalizes session metrics and derives duration without inventing missing values', () => {
    const entry = buildWorkoutHistoryEntry({
      id: 'session-1',
      cycleId: 'cycle-1',
      cycleWeek: 2,
      workoutId: 'workout-strength-a',
      focus: 'strength',
      status: 'partial',
      startedAt: '2026-09-14T12:00:00.000Z',
      completedAt: '2026-09-14T12:22:00.000Z',
      completionReason: 'time-limited',
      isOffline: true,
      completedSetCount: 2.8,
      totalVolume: -1,
      totalDurationSeconds: 900,
      totalDistanceMeters: Number.NaN,
    });

    expect(entry).toMatchObject({
      title: 'Strength A',
      completedSetCount: 2,
      totalVolume: 0,
      totalDurationSeconds: 900,
      totalDistanceMeters: 0,
      durationMinutes: 22,
      completionReason: 'time-limited',
      isOffline: true,
    });
  });

  it('sorts by completed time and uses stable IDs as a tie breaker', () => {
    const base = {
      cycleId: 'cycle-1',
      cycleWeek: 1,
      workoutId: 'workout-1',
      title: 'Workout',
      focus: 'strength' as const,
      status: 'complete' as const,
      startedAt: '2026-09-14T12:00:00.000Z',
      completedAt: '2026-09-14T12:30:00.000Z',
      isOffline: false,
      completedSetCount: 1,
      totalVolume: 0,
      totalDurationSeconds: 0,
      totalDistanceMeters: 0,
    };
    const entries = [
      buildWorkoutHistoryEntry({ ...base, id: 'a' }),
      buildWorkoutHistoryEntry({ ...base, id: 'b', completedAt: '2026-09-15T12:30:00.000Z' }),
      buildWorkoutHistoryEntry({ ...base, id: 'c' }),
    ];

    expect(sortWorkoutHistory(entries).map((entry) => entry.id)).toEqual(['b', 'c', 'a']);
  });
});
