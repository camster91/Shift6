import { demoProgram, demoProgramVersion } from './fixtures/home';
import {
  addExerciseToWorkout,
  createCustomExercise,
  createProgramCopy,
  removeExerciseFromWorkout,
  reorderWorkoutExercises,
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
});
