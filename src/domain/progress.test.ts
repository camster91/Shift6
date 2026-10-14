import {
  buildExerciseProgress,
  buildCardioProgress,
  buildTrainingVolumeBreakdown,
  compareCycleProgress,
  estimateOneRepMax,
  type ProgressSetInput,
} from './progress';
import { buildCycleProgressSummary } from './progression';
import { convertLoad } from './loadUnits';

test('derived mixed-unit records declare canonical kg without changing measured input or record values', () => {
  const sets: ProgressSetInput[] = [
    {
      sessionId: 'kg',
      exerciseId: 'private',
      completedAt: '2026-10-13T12:00:00Z',
      load: 40,
      loadUnit: 'kg',
      reps: 5,
    },
    {
      sessionId: 'lb',
      exerciseId: 'private',
      completedAt: '2026-10-14T12:00:00Z',
      load: convertLoad(50, 'kg', 'lb'),
      loadUnit: 'lb',
      reps: 5,
    },
    {
      sessionId: 'unknown',
      exerciseId: 'private',
      completedAt: '2026-10-15T12:00:00Z',
      load: 999,
      reps: 5,
    },
  ];
  const original = JSON.stringify(sets);
  const progress = buildExerciseProgress('private', sets);
  const loads = progress.personalRecords.filter((record) => record.metric === 'load');
  expect(loads.map((record) => record.value)).toEqual([40, 50]);
  const estimates = progress.personalRecords.filter(
    (record) => record.metric === 'estimated-one-rep-max',
  );
  expect(estimates[0]!.value).toBeCloseTo(40 * (1 + 5 / 30));
  expect(estimates[1]!.value).toBeCloseTo(50 * (1 + 5 / 30));
  expect([...loads, ...estimates].every((record) => record.loadUnit === 'kg')).toBe(true);
  expect([...loads, ...estimates].some((record) => record.sessionId === 'unknown')).toBe(false);
  expect(
    progress.personalRecords
      .filter((record) => record.metric === 'reps')
      .every((record) => record.loadUnit === undefined),
  ).toBe(true);
  expect(JSON.stringify(sets)).toBe(original);
});

test('unknown-only load history never invents canonical load record provenance', () => {
  const progress = buildExerciseProgress('legacy', [
    {
      sessionId: 'old',
      exerciseId: 'legacy',
      completedAt: '2020-01-01T12:00:00Z',
      load: 999,
      reps: 5,
    },
  ]);
  expect(progress.personalRecords).toHaveLength(1);
  expect(progress.personalRecords[0]).toMatchObject({ metric: 'reps', value: 5 });
  expect(progress.personalRecords[0]!.loadUnit).toBeUndefined();
});

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
        loadUnit: 'kg',
        reps: 6,
      },
      {
        sessionId: 'session-1',
        exerciseId: 'exercise-back-squat',
        completedAt: '2026-09-13T12:00:00.000Z',
        load: 185,
        loadUnit: 'kg',
        reps: 5,
      },
      {
        sessionId: 'session-1',
        exerciseId: 'exercise-back-squat',
        completedAt: '2026-09-13T12:01:00.000Z',
        load: 185,
        loadUnit: 'kg',
        reps: 6,
      },
      {
        sessionId: 'other-session',
        exerciseId: 'exercise-bench-press',
        completedAt: '2026-09-14T12:00:00.000Z',
        load: 200,
        loadUnit: 'kg',
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

  it('tracks timed and distance movements without strength estimates', () => {
    const progress = buildExerciseProgress('exercise-bike', [
      {
        sessionId: 'session-1',
        exerciseId: 'exercise-bike',
        completedAt: '2026-09-13T12:00:00.000Z',
        durationSeconds: 900,
        distanceMeters: 3000,
      },
      {
        sessionId: 'session-2',
        exerciseId: 'exercise-bike',
        completedAt: '2026-09-14T12:00:00.000Z',
        durationSeconds: 1200,
        distanceMeters: 3200,
      },
    ]);

    expect(progress.points).toMatchObject([
      { sessionId: 'session-1', bestDurationSeconds: 900, bestDistanceMeters: 3000 },
      { sessionId: 'session-2', bestDurationSeconds: 1200, bestDistanceMeters: 3200 },
    ]);
    expect(progress.personalRecords.map((record) => record.metric)).toEqual([
      'duration',
      'distance',
      'duration',
      'distance',
    ]);
  });

  it('builds transparent set-based volume by primary muscle and movement', () => {
    const breakdown = buildTrainingVolumeBreakdown(
      [
        {
          sessionId: 'session-1',
          exerciseId: 'exercise-squat',
          completedAt: '2026-09-14T12:00:00.000Z',
          load: 100,
          loadUnit: 'kg',
          reps: 5,
        },
        {
          sessionId: 'session-1',
          exerciseId: 'exercise-squat',
          completedAt: '2026-09-14T12:01:00.000Z',
          load: 100,
          loadUnit: 'kg',
          reps: 5,
        },
        {
          sessionId: 'session-1',
          exerciseId: 'exercise-plank',
          completedAt: '2026-09-14T12:02:00.000Z',
          durationSeconds: 30,
        },
      ],
      [
        {
          id: 'exercise-squat',
          name: 'Squat',
          movementPattern: 'squat',
          primaryMuscles: ['quadriceps', 'glutes'],
        },
        {
          id: 'exercise-plank',
          name: 'Plank',
          movementPattern: 'anti-extension',
          primaryMuscles: ['core'],
        },
      ],
    );

    expect(breakdown).toMatchObject({
      totalCompletedSetCount: 3,
      totalLoadVolume: 1000,
      byMuscle: [
        { key: 'glutes', completedSetCount: 2, loadVolume: 1000 },
        { key: 'quadriceps', completedSetCount: 2, loadVolume: 1000 },
        { key: 'core', completedSetCount: 1, loadVolume: 0 },
      ],
      byMovementPattern: [
        { key: 'squat', completedSetCount: 2, loadVolume: 1000 },
        { key: 'anti-extension', completedSetCount: 1, loadVolume: 0 },
      ],
    });
  });

  it('deduplicates cardio sessions while preserving interval totals by week', () => {
    const summary = buildCardioProgress([
      {
        sessionId: 'cardio-session-1',
        cycleWeek: 1,
        completedAt: '2026-09-14T12:30:00.000Z',
        durationSeconds: 900,
        distanceMeters: 3_000,
      },
      {
        sessionId: 'cardio-session-1',
        cycleWeek: 1,
        completedAt: '2026-09-14T12:30:00.000Z',
        durationSeconds: 600,
        distanceMeters: 2_000,
      },
      {
        sessionId: 'cardio-session-2',
        cycleWeek: 3,
        completedAt: '2026-09-28T12:30:00.000Z',
        distanceMeters: 5_000,
      },
    ]);

    expect(summary).toEqual({
      sessionCount: 2,
      activeWeeks: 2,
      totalDurationSeconds: 1_500,
      totalDistanceMeters: 10_000,
      averageDurationSecondsPerSession: 750,
      byWeek: [
        { cycleWeek: 1, sessionCount: 1, durationSeconds: 1_500, distanceMeters: 5_000 },
        { cycleWeek: 3, sessionCount: 1, durationSeconds: 0, distanceMeters: 5_000 },
      ],
    });
  });
});
