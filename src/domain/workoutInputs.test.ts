import { demoWorkout } from './fixtures/home';
import { buildInitialValues, hydrateWorkoutValues } from './workoutInputs';
import type { CompletedSet } from './types';

const exercise = demoWorkout.exercises[0]!;
const key = `${exercise.id}:1`;

test('new sessions use progression suggestions rather than prefilled template values', () => {
  const workout = {
    ...demoWorkout,
    exercises: [
      {
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set, target: { durationSeconds: 1800 } })),
      },
    ],
  };
  const values = hydrateWorkoutValues(
    workout,
    { [exercise.id]: { durationSeconds: 1860 } },
    [],
    null,
  );
  expect(values[key]!.duration).toBe('1860');
});

test('saved completed values win over a stale autosaved draft', () => {
  const completed: CompletedSet = {
    id: 'completed',
    sessionId: 'session',
    workoutExerciseId: exercise.id,
    setNumber: 1,
    reps: 8,
    completedAt: '2026-10-11',
    idempotencyKey: 'completed',
  };
  const draft = buildInitialValues(demoWorkout);
  draft[key]!.reps = '5';
  expect(hydrateWorkoutValues(demoWorkout, {}, [completed], draft)[key]!.reps).toBe('8');
});

test('rehydrating the same session preserves unsaved edits including cleared fields', () => {
  const current = buildInitialValues(demoWorkout);
  current[key]!.reps = '';
  current[key]!.load = '27';
  const result = hydrateWorkoutValues(
    demoWorkout,
    { [exercise.id]: { reps: 10 } },
    [],
    null,
    current,
  );
  expect(result[key]).toEqual({ ...current[key], loadUnit: 'unknown' });
});

test('resume restores uncompleted draft entries', () => {
  const draft = buildInitialValues(demoWorkout);
  draft[key]!.reps = '9';
  expect(hydrateWorkoutValues(demoWorkout, {}, [], draft)[key]!.reps).toBe('9');
});

test('effort targets are guidance, not recorded reports of how a set felt', () => {
  const values = buildInitialValues(demoWorkout, { [exercise.id]: { reps: 5, rpe: 8, rir: 2 } });
  expect(values[key]!.rpe).toBe('');
  expect(values[key]!.rir).toBe('');
});
