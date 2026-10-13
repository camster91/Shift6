import { demoWorkout } from './fixtures/home';
import { nextWorkoutSet, previousComparableSet, appendSetDifficultyNote } from './workoutFocus';
import type { CompletedSet } from './types';
test('focus moves only after a persisted set is marked completed and editing takes precedence', () => {
  const first = nextWorkoutSet(demoWorkout, new Set())!;
  expect(first.set.setNumber).toBe(1);
  const second = nextWorkoutSet(demoWorkout, new Set([first.key]))!;
  expect(second.exercise.id).toBe(first.exercise.id);
  expect(second.set.setNumber).toBe(2);
  expect(nextWorkoutSet(demoWorkout, new Set([first.key]), first.key)?.key).toBe(first.key);
  const all = new Set(
    demoWorkout.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => `${exercise.id}:${set.setNumber}`),
    ),
  );
  expect(nextWorkoutSet(demoWorkout, all)).toBeNull();
});
test('prior comparison requires matching immutable movement and set context', () => {
  const focus = nextWorkoutSet(demoWorkout, new Set())!;
  const result: CompletedSet = {
    id: 'prior',
    sessionId: 'prior-session',
    workoutExerciseId: focus.exercise.id,
    exerciseId: focus.exercise.exerciseId,
    setNumber: 1,
    reps: 4,
    completedAt: '2026-10-12T00:00:00Z',
    idempotencyKey: 'prior',
  };
  expect(
    previousComparableSet(focus, [{ ...result, exerciseId: 'different-movement' }]),
  ).toBeUndefined();
  expect(previousComparableSet(focus, [{ ...result, setNumber: 2 }])).toBeUndefined();
  expect(previousComparableSet(focus, [result])).toBe(result);
});
test('difficulty is an explicit private note without inferred effort or overwritten history', () => {
  const note = appendSetDifficultyNote('My own cue', 'Squat', 1, 'Too hard');
  expect(note).toBe('My own cue\nSet feeling · Squat · set 1: Too hard');
  expect(appendSetDifficultyNote(note, 'Squat', 1, 'Too hard')).toBe(note);
  expect(appendSetDifficultyNote(note, 'Squat', 1, 'Just right')).toContain(
    'Too hard\nSet feeling',
  );
  expect(note).not.toMatch(/RPE|RIR/);
  expect(() => appendSetDifficultyNote('x'.repeat(500), 'Squat', 1, 'Too hard')).toThrow(
    'existing notes were kept',
  );
});
