import { declaredLoad, convertLoad } from './loadUnits';
import { hydrateWorkoutValues } from './workoutInputs';
import { buildNextSessionTargets } from './nextSession';
import { buildTrainingVolumeBreakdown, buildExerciseProgress } from './progress';
import { summaryVolumeLabel } from './summaryVolume';
import { demoWorkout } from './fixtures/home';
import type { CompletedSet, Workout } from './types';
const workout = (unit: 'metric' | 'imperial' = 'metric'): Workout => ({
  ...demoWorkout,
  exercises: [
    {
      ...demoWorkout.exercises[0]!,
      sets: [
        {
          ...demoWorkout.exercises[0]!.sets[0]!,
          target: { load: { value: 40, unit }, reps: { min: 6, max: 8 } },
        },
      ],
    },
  ],
});
const saved = (load = 40, unit?: 'kg' | 'lb'): CompletedSet => ({
  id: 'actual',
  sessionId: 'session',
  workoutExerciseId: demoWorkout.exercises[0]!.id,
  exerciseId: demoWorkout.exercises[0]!.exerciseId,
  setNumber: 1,
  load,
  loadUnit: unit,
  reps: 8,
  completedAt: '2026-10-13T12:00:00Z',
  idempotencyKey: 'actual',
});
test('conversion uses explicit units and refuses to infer missing provenance', () => {
  expect(convertLoad(100, 'lb', 'kg')).toBeCloseTo(45.359237);
  expect(convertLoad(convertLoad(40, 'kg', 'lb'), 'lb', 'kg')).toBeCloseTo(40, 12);
  expect(declaredLoad(40, undefined)).toBeUndefined();
});
test('typed actual input retains its unit through target and profile changes; legacy recovered numbers remain unknown', () => {
  const plan = workout();
  const key = `${plan.exercises[0]!.id}:1`;
  const initial = hydrateWorkoutValues(plan, {}, [], null, undefined, 'imperial');
  expect(initial[key]?.loadUnit).toBe('kg');
  const current = { ...initial, [key]: { ...initial[key]!, load: '35', loadUnit: 'kg' as const } };
  const changed = workout('imperial');
  expect(hydrateWorkoutValues(changed, {}, [], null, current, 'imperial')[key]).toMatchObject({
    load: '35',
    loadUnit: 'kg',
  });
  const { loadUnit: discard, ...legacy } = initial[key]!;
  void discard;
  expect(
    hydrateWorkoutValues(
      changed,
      {},
      [],
      { [key]: { ...legacy, load: '35' } },
      undefined,
      'imperial',
    )[key]?.loadUnit,
  ).toBe('unknown');
  expect(
    hydrateWorkoutValues(changed, {}, [saved(40)], null, undefined, 'imperial')[key]?.loadUnit,
  ).toBe('unknown');
});
test('missing and noncomparable declared loads hold prescription while equivalent explicit units retain approved increments', () => {
  const plan = workout();
  const evaluate = (set: CompletedSet) =>
    buildNextSessionTargets(plan, 'double-progression', [set], 'imperial', undefined, [
      'rule-barbell-30-double-progression',
    ])[0]!.decision;
  expect(evaluate(saved()).action).toBe('hold');
  expect(evaluate(saved(40, 'lb')).action).toBe('hold');
  expect(evaluate(saved(40, 'lb')).nextTarget.load).toEqual({ value: 40, unit: 'metric' });
  expect(evaluate(saved(40, 'kg')).nextTarget.load).toEqual({ value: 42.5, unit: 'metric' });
  expect(evaluate(saved(convertLoad(40, 'kg', 'lb'), 'lb')).nextTarget.load).toEqual({
    value: 42.5,
    unit: 'metric',
  });
});
test('known mixed units normalize to kg; unknown load rows are excluded from load volume and records', () => {
  const records = [
    {
      sessionId: 'kg',
      exerciseId: 'squat',
      completedAt: '2026-10-13T12:00:00Z',
      load: 40,
      loadUnit: 'kg' as const,
      reps: 5,
    },
    {
      sessionId: 'lb',
      exerciseId: 'squat',
      completedAt: '2026-10-14T12:00:00Z',
      load: convertLoad(40, 'kg', 'lb'),
      loadUnit: 'lb' as const,
      reps: 5,
    },
    {
      sessionId: 'unknown',
      exerciseId: 'squat',
      completedAt: '2026-10-15T12:00:00Z',
      load: 999,
      reps: 5,
    },
  ];
  const volume = buildTrainingVolumeBreakdown(records, []);
  expect(volume.totalLoadVolume).toBeCloseTo(400);
  expect(volume.unknownLoadSetCount).toBe(1);
  const history = buildExerciseProgress('squat', records);
  expect(history.points.find((point) => point.sessionId === 'unknown')?.bestLoad).toBeUndefined();
  expect(history.points.find((point) => point.sessionId === 'lb')?.bestLoad).toBeCloseTo(40);
  expect(summaryVolumeLabel([saved(40, 'kg'), saved(999)])).toContain('unknown-unit sets excluded');
});
