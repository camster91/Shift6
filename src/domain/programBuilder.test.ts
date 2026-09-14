import { demoProgram, demoProgramVersion } from './fixtures/home';
import {
  addExerciseToWorkout,
  createCustomExercise,
  createProgramCopy,
  removeExerciseFromWorkout,
  replaceExerciseInWorkout,
  reorderWorkoutExercises,
  setWorkoutExerciseSetCount,
} from './programBuilder';

describe('immutable custom program builder', () => {
  it('copies a template into a user-owned version without sharing mutable workout objects', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-1',
      newVersionId: 'program-custom-1-version-1',
      createdAt: '2026-09-14T12:00:00.000Z',
    });

    expect(copy.program).toMatchObject({
      ownerId: 'guest-user',
      sourceProgramId: demoProgram.id,
      isTemplate: false,
    });
    expect(copy.version.workouts[0]?.id).not.toBe(demoProgramVersion.workouts[0]?.id);
    expect(copy.version.workouts[0]?.exercises[0]?.sets[0]).not.toBe(
      demoProgramVersion.workouts[0]?.exercises[0]?.sets[0],
    );
    expect(demoProgram.title).toBe('Barbell 30');
  });

  it('adds, reorders, and removes exercises while preserving the source snapshot', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-2',
      newVersionId: 'program-custom-2-version-1',
      createdAt: '2026-09-14T12:00:00.000Z',
    });
    const strengthA = copy.version.workouts[0]!;
    const withAdded = addExerciseToWorkout(copy.version, strengthA.id, {
      exerciseId: 'exercise-front-plank',
      setCount: 2,
      target: { durationSeconds: 30 },
    });
    const added = withAdded.workouts[0]!.exercises.at(-1)!;
    const reordered = reorderWorkoutExercises(withAdded, strengthA.id, [
      added.id,
      ...strengthA.exercises.map((exercise) => exercise.id),
    ]);
    const removed = removeExerciseFromWorkout(reordered, strengthA.id, added.id);

    expect(withAdded.workouts[0]!.exercises).toHaveLength(strengthA.exercises.length + 1);
    expect(withAdded.workouts[0]!.exercises.at(-1)?.sets).toHaveLength(2);
    expect(reordered.workouts[0]!.exercises[0]?.id).toBe(added.id);
    expect(removed.workouts[0]!.exercises).toHaveLength(strengthA.exercises.length);
    expect(demoProgramVersion.workouts[0]!.exercises).toHaveLength(strengthA.exercises.length);
  });

  it('creates a reviewable custom exercise rather than silently treating it as curated', () => {
    const exercise = createCustomExercise({
      id: 'exercise-custom-1',
      name: 'Cameron carry',
      movementPattern: 'carry',
      primaryMuscles: ['grip', 'core'],
      equipmentIds: ['equipment-dumbbells'],
      trackingType: 'distance',
    });

    expect(exercise).toMatchObject({
      name: 'Cameron carry',
      isCustom: true,
      contentStatus: 'draft',
      trackingType: 'distance',
    });
  });

  it('changes set count immutably while preserving existing targets and IDs', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-3',
      newVersionId: 'program-custom-3-version-1',
      createdAt: '2026-09-14T12:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const exercise = workout.exercises[0]!;
    const originalIds = exercise.sets.map((set) => set.id);

    const increased = setWorkoutExerciseSetCount(
      copy.version,
      workout.id,
      exercise.id,
      exercise.sets.length + 1,
    );
    const increasedExercise = increased.workouts[0]!.exercises[0]!;

    expect(increasedExercise.sets).toHaveLength(exercise.sets.length + 1);
    expect(increasedExercise.sets.slice(0, originalIds.length).map((set) => set.id)).toEqual(
      originalIds,
    );
    expect(increasedExercise.sets.at(-1)?.target).toEqual(exercise.sets.at(-1)?.target);

    const decreased = setWorkoutExerciseSetCount(increased, workout.id, exercise.id, 1);
    expect(decreased.workouts[0]!.exercises[0]!.sets).toHaveLength(1);
    expect(decreased.workouts[0]!.exercises[0]!.sets[0]?.id).toBe(originalIds[0]);
    expect(copy.version.workouts[0]!.exercises[0]!.sets.map((set) => set.id)).toEqual(originalIds);
  });

  it('rejects non-integer and out-of-range set counts', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-4',
      newVersionId: 'program-custom-4-version-1',
      createdAt: '2026-09-14T12:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const exercise = workout.exercises[0]!;

    expect(() => setWorkoutExerciseSetCount(copy.version, workout.id, exercise.id, 0)).toThrow(
      'between 1 and 20 sets',
    );
    expect(() => setWorkoutExerciseSetCount(copy.version, workout.id, exercise.id, 1.5)).toThrow(
      'between 1 and 20 sets',
    );
    expect(() => setWorkoutExerciseSetCount(copy.version, workout.id, exercise.id, 21)).toThrow(
      'between 1 and 20 sets',
    );
  });

  it('replaces an exercise in the private copy without changing its set prescription', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-5',
      newVersionId: 'program-custom-5-version-1',
      createdAt: '2026-09-14T12:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const exercise = workout.exercises[0]!;
    const replacement = replaceExerciseInWorkout(
      copy.version,
      workout.id,
      exercise.id,
      'exercise-goblet-squat',
    );
    const replacedExercise = replacement.workouts[0]!.exercises[0]!;

    expect(replacedExercise.exerciseId).toBe('exercise-goblet-squat');
    expect(replacedExercise.id).toBe(exercise.id);
    expect(replacedExercise.sets).toEqual(exercise.sets);
    expect(copy.version.workouts[0]!.exercises[0]!.exerciseId).toBe(exercise.exerciseId);
    expect(demoProgramVersion.workouts[0]!.exercises[0]!.exerciseId).toBe('exercise-back-squat');
  });
});
