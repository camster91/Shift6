import { buildExerciseProgress, compareCycleProgress, estimateOneRepMax } from './progress';
import { buildCycleProgressSummary } from './progression';

describe('deterministic progress history', () => {
  it('uses a bounded Epley estimate and refuses unsupported inputs', () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.6667);
    expect(estimateOneRepMax(100, 13)).toBeUndefined();
    expect(estimateOneRepMax(undefined, 5)).toBeUndefined();
  });

  it('groups sessions, calculates points, and records new bests in order', () => {
    const progress = buildExerciseProgress('exercise-back-squat', [
      {
        sessionId: 'session-2',
        exerciseId: 'exercise-back-squat',
        completedAt: '2026-09-14T12:00:00.000Z',
        load: 190,
        reps: 6,
      },
      {
        sessionId: 'session-1',
        exerciseId: 'exercise-back-squat',
        completedAt: '2026-09-13T12:00:00.000Z',
        load: 185,
        reps: 5,
      },
      {
        sessionId: 'session-1',
        exerciseId: 'exercise-back-squat',
        completedAt: '2026-09-13T12:01:00.000Z',
        load: 185,
        reps: 6,
      },
      {
        sessionId: 'other-session',
        exerciseId: 'exercise-bench-press',
        completedAt: '2026-09-14T12:00:00.000Z',
        load: 200,
        reps: 5,
      },
    ]);

    expect(progress.points).toHaveLength(2);
    expect(progress.points[0]).toMatchObject({
      sessionId: 'session-1',
      bestLoad: 185,
      bestReps: 6,
      volume: 2035,
    });
    expect(progress.points[1]).toMatchObject({ sessionId: 'session-2', bestLoad: 190 });
    expect(progress.personalRecords.map((record) => record.metric)).toEqual([
      'load',
      'reps',
      'estimated-one-rep-max',
      'load',
      'estimated-one-rep-max',
    ]);
  });

  it('compares cycle facts deterministically and labels version changes', () => {
    const previous = buildCycleProgressSummary(3, [
      { completed: true, sets: [{ completed: true }], cardioMinutes: 10 },
    ]);
    const current = buildCycleProgressSummary(3, [
      { completed: true, sets: [{ completed: true }, { completed: true }], cardioMinutes: 20 },
      { completed: true, sets: [{ completed: true }], cardioMinutes: 5 },
    ]);

    const comparison = compareCycleProgress(
      { programVersionId: 'version-current' },
      current,
      { id: 'cycle-previous', programVersionId: 'version-previous' },
      previous,
    );

    expect(comparison.previousCycleId).toBe('cycle-previous');
    expect(comparison.sameProgramVersion).toBe(false);
    expect(comparison.completedWorkouts).toMatchObject({ current: 2, previous: 1, delta: 1 });
    expect(comparison.completionRate).toMatchObject({ current: 2 / 3, previous: 1 / 3 });
    expect(comparison.loggedSets).toMatchObject({ current: 3, previous: 1, delta: 2 });
    expect(comparison.cardioMinutes).toMatchObject({ current: 25, previous: 10, delta: 15 });
  });
});
