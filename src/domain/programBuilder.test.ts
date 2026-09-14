import { demoProgram, demoProgramVersion } from './fixtures/home';
import {
  addExerciseToWorkout,
  addWorkoutToProgram,
  createCustomExercise,
  createProgramCopy,
  createProgramVersionRevision,
  removeExerciseFromWorkout,
  replaceExerciseInWorkout,
  reorderWorkoutExercises,
  setWorkoutExerciseSetCount,
  setWorkoutExerciseTarget,
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

  it('creates a new version namespace while preserving planned identities', () => {
    const revision = createProgramVersionRevision(
      demoProgramVersion,
      'program-version-barbell-30-v2',
      '2026-09-14T15:00:00.000Z',
    );

    expect(revision).toMatchObject({
      id: 'program-version-barbell-30-v2',
      version: 2,
      status: 'draft',
      programId: demoProgramVersion.programId,
    });
    expect(revision.workouts[0]).toMatchObject({
      id: demoProgramVersion.workouts[0]?.id,
      programVersionId: revision.id,
    });
    expect(revision.workouts[0]?.exercises[0]?.sets[0]?.id).toBe(
      demoProgramVersion.workouts[0]?.exercises[0]?.sets[0]?.id,
    );
    expect(revision.workouts[0]?.exercises[0]?.sets[0]?.target).not.toBe(
      demoProgramVersion.workouts[0]?.exercises[0]?.sets[0]?.target,
    );
    expect(() =>
      createProgramVersionRevision(demoProgramVersion, demoProgramVersion.id, 'now'),
    ).toThrow('new ID');
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
      exerciseId: 'exercise-plank',
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

  it('adds an optional empty workout without changing required cycle semantics', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-workout',
      newVersionId: 'program-custom-workout-version-1',
      createdAt: '2026-09-14T12:00:00.000Z',
    });

    const updated = addWorkoutToProgram(copy.version, {
      id: 'program-custom-workout-version-1-workout-extra',
      title: 'Saturday mobility',
      dayOfWeek: 6,
      focus: 'mobility',
      estimatedDurationMinutes: 20,
      equipmentIds: ['equipment-bodyweight'],
    });

    expect(updated.workouts).toHaveLength(copy.version.workouts.length + 1);
    expect(updated.workouts.at(-1)).toMatchObject({
      title: 'Saturday mobility',
      isOptional: true,
      exercises: [],
    });
    expect(copy.version.workouts).toHaveLength(demoProgramVersion.workouts.length);
  });

  it('rejects duplicate IDs and invalid workout metadata', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-workout-invalid',
      newVersionId: 'program-custom-workout-invalid-version-1',
      createdAt: '2026-09-14T12:00:00.000Z',
    });

    expect(() =>
      addWorkoutToProgram(copy.version, {
        id: copy.version.workouts[0]!.id,
        title: 'Duplicate',
        dayOfWeek: 6,
        focus: 'mixed',
        estimatedDurationMinutes: 20,
      }),
    ).toThrow('already exists');
    expect(() =>
      addWorkoutToProgram(copy.version, {
        id: 'new-workout',
        title: 'Invalid day',
        dayOfWeek: 8,
        focus: 'mixed',
        estimatedDurationMinutes: 20,
      }),
    ).toThrow('between 1 and 7');
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

  it('applies a cloned target to every set without changing set identity', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-targets',
      newVersionId: 'program-custom-targets-version-1',
      createdAt: '2026-09-14T12:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const exercise = workout.exercises[0]!;
    const originalSetIds = exercise.sets.map((set) => set.id);
    const target = {
      reps: { min: 6, max: 8 },
      load: { value: 95, unit: 'imperial' as const },
      rir: 1,
    };

    const updated = setWorkoutExerciseTarget(copy.version, workout.id, exercise.id, target);
    const updatedExercise = updated.workouts[0]!.exercises[0]!;

    expect(updatedExercise.sets.map((set) => set.id)).toEqual(originalSetIds);
    expect(updatedExercise.sets.map((set) => set.target)).toEqual(exercise.sets.map(() => target));
    expect(updatedExercise.sets[0]?.target).not.toBe(target);
    expect(copy.version.workouts[0]!.exercises[0]!.sets[0]?.target).toEqual({ reps: 5, rir: 2 });
  });

  it('rejects an empty target update', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-targets-empty',
      newVersionId: 'program-custom-targets-empty-version-1',
      createdAt: '2026-09-14T12:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const exercise = workout.exercises[0]!;

    expect(() => setWorkoutExerciseTarget(copy.version, workout.id, exercise.id, {})).toThrow(
      'at least one target value',
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
