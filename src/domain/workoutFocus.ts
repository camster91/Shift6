import type { CompletedSet, Workout, WorkoutExercise, WorkoutSet } from './types';
export interface FocusedWorkoutSet {
  exercise: WorkoutExercise;
  set: WorkoutSet;
  key: string;
}
export function nextWorkoutSet(
  workout: Workout,
  completed: ReadonlySet<string>,
  editingKey: string | null = null,
): FocusedWorkoutSet | null {
  const sets = workout.exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({ exercise, set, key: `${exercise.id}:${set.setNumber}` })),
  );
  return (
    (editingKey ? sets.find((item) => item.key === editingKey) : undefined) ??
    sets.find((item) => !completed.has(item.key)) ??
    null
  );
}
/** Caller supplies history from the same immutable workout version. Never borrow
 * another movement or set as a comparable result. */
export function previousComparableSet(
  focus: FocusedWorkoutSet,
  history: readonly CompletedSet[],
): CompletedSet | undefined {
  return history.find(
    (item) =>
      item.workoutExerciseId === focus.exercise.id &&
      item.setNumber === focus.set.setNumber &&
      (item.exerciseId === undefined || item.exerciseId === focus.exercise.exerciseId),
  );
}
export const setDifficultyChoices = ['Too easy', 'Just right', 'Too hard'] as const;
export type SetDifficulty = (typeof setDifficultyChoices)[number];
/** Plain-language self-report in the existing private session note; never an
 * RPE/RIR score or a progression input. Existing note/history is not replaced. */
export function appendSetDifficultyNote(
  note: string,
  name: string,
  setNumber: number,
  difficulty: SetDifficulty,
): string {
  if (!setDifficultyChoices.includes(difficulty)) throw new Error('Choose how this set felt.');
  const line = `Set feeling · ${name.slice(0, 60)} · set ${setNumber}: ${difficulty}`;
  if (note.split('\n').includes(line)) return note;
  const next = note ? `${note}\n${line}` : line;
  if (next.length > 500)
    throw new Error(
      'Your session note is full. Edit it before adding set feedback; existing notes were kept.',
    );
  return next;
}
