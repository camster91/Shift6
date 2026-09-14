import { demoProgram, demoProgramVersion } from './fixtures/home';
import {
  addExerciseToWorkout,
  addWorkoutToProgram,
  createBlankProgram,
  createCustomExercise,
  createNextCycleCopy,
  createProgramCopy,
  createProgramVersionRevision,
  clearWorkoutExerciseGroup,
  groupWorkoutExercises,
  removeExerciseFromWorkout,
  replaceExerciseInWorkout,
  reorderWorkoutExercises,
  setWorkoutExerciseNotes,
  setWorkoutExerciseRestSeconds,
  setWorkoutExerciseSection,
  setWorkoutExerciseSetCount,
  setWorkoutExerciseTarget,
  updateWorkoutMetadata,
} from './programBuilder';

describe('immutable custom program builder', () => {
  it('creates an empty private six-week program without template ownership', () => {
    const blank = createBlankProgram({
      userId: 'guest-user',
      newProgramId: 'program-blank-1',
      newVersionId: 'program-blank-1-version-1',
      createdAt: '2026-09-14T15:00:00.000Z',
    });

    expect(blank.program).toMatchObject({
      title: 'My SHIFT6 plan',
      isTemplate: false,
      ownerId: 'guest-user',
      currentVersionId: blank.version.id,
    });
    expect(blank.version).toMatchObject({
      programId: blank.program.id,
      status: 'draft',
      workouts: [],
    });
  });

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

  it('creates a new private namespace when repeating a completed cycle', () => {
    const repeated = createNextCycleCopy({
      sourceProgram: {
        ...demoProgram,
        id: 'program-barbell-30-guest-user-1',
        slug: 'barbell-30',
        title: 'Barbell 30',
        sourceProgramId: demoProgram.id,
        isTemplate: false,
        ownerId: 'guest-user',
      },
      sourceVersion: {
        ...demoProgramVersion,
        id: 'program-barbell-30-guest-user-1-version-1',
        programId: 'program-barbell-30-guest-user-1',
      },
      userId: 'guest-user',
      newProgramId: 'program-barbell-30-guest-user-2',
      newVersionId: 'program-barbell-30-guest-user-2-version-1',
      createdAt: '2026-09-14T18:00:00.000Z',
    });

    expect(repeated.program).toMatchObject({
      id: 'program-barbell-30-guest-user-2',
      title: 'Barbell 30',
      slug: 'barbell-30',
      sourceProgramId: demoProgram.id,
      isTemplate: false,
    });
    expect(repeated.version).toMatchObject({
      id: 'program-barbell-30-guest-user-2-version-1',
      programId: repeated.program.id,
      status: 'draft',
    });
    expect(repeated.version.workouts[0]?.id).not.toBe(
      'program-barbell-30-guest-user-1-version-1-workout-1',
    );
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

  it('does not reuse an existing workout-exercise ID after removing a middle exercise', () => {
    const copied = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-copy-id-safety',
      newVersionId: 'program-copy-version-id-safety',
      createdAt: '2026-09-14T15:00:00.000Z',
    });
    const workout = copied.version.workouts[0]!;
    const afterRemoval = removeExerciseFromWorkout(
      copied.version,
      workout.id,
      workout.exercises[1]!.id,
    );
    const afterAdd = addExerciseToWorkout(afterRemoval, workout.id, {
      exerciseId: 'exercise-plank',
      setCount: 2,
      target: { durationSeconds: 30 },
    });
    const ids = afterAdd.workouts
      .find((candidate) => candidate.id === workout.id)!
      .exercises.map((exercise) => exercise.id);

    expect(new Set(ids).size).toBe(ids.length);
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

  it('updates workout metadata immutably while preserving its exercises', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-workout-metadata',
      newVersionId: 'program-custom-workout-metadata-version-1',
      createdAt: '2026-09-14T15:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const updated = updateWorkoutMetadata(copy.version, workout.id, {
      title: 'Strength A express',
      dayOfWeek: 6,
      focus: 'conditioning',
      estimatedDurationMinutes: 25,
      equipmentIds: ['equipment-dumbbells'],
    });

    expect(updated.workouts[0]).toMatchObject({
      title: 'Strength A express',
      dayOfWeek: 6,
      focus: 'conditioning',
      estimatedDurationMinutes: 25,
      equipmentIds: ['equipment-dumbbells'],
    });
    expect(updated.workouts[0]?.exercises).toEqual(workout.exercises);
    expect(copy.version.workouts[0]?.title).toBe(workout.title);
  });

  it('applies shared rest and notes to an exercise without changing set IDs', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-exercise-details',
      newVersionId: 'program-custom-exercise-details-version-1',
      createdAt: '2026-09-14T15:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const exercise = workout.exercises[0]!;
    const setIds = exercise.sets.map((set) => set.id);
    const withRest = setWorkoutExerciseRestSeconds(copy.version, workout.id, exercise.id, 120);
    const withNotes = setWorkoutExerciseNotes(
      withRest,
      workout.id,
      exercise.id,
      'Pause at the bottom and keep the brace steady.',
    );
    const updated = withNotes.workouts[0]!.exercises[0]!;

    expect(updated.sets.map((set) => set.id)).toEqual(setIds);
    expect(updated.sets.map((set) => set.restSeconds)).toEqual([120, 120, 120]);
    expect(updated.notes).toBe('Pause at the bottom and keep the brace steady.');
    expect(copy.version.workouts[0]?.exercises[0]?.notes).toBeUndefined();
  });

  it('rejects unsafe rest and oversized notes', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-exercise-validation',
      newVersionId: 'program-custom-exercise-validation-version-1',
      createdAt: '2026-09-14T15:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const exercise = workout.exercises[0]!;

    expect(() => setWorkoutExerciseRestSeconds(copy.version, workout.id, exercise.id, 1.5)).toThrow(
      'whole number between 0 and 3600',
    );
    expect(() =>
      setWorkoutExerciseNotes(copy.version, workout.id, exercise.id, 'x'.repeat(501)),
    ).toThrow('500 characters or fewer');
  });

  it('assigns a section without changing exercise identity or prescription', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-sections',
      newVersionId: 'program-custom-sections-version-1',
      createdAt: '2026-09-14T15:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const exercise = workout.exercises[0]!;
    const updated = setWorkoutExerciseSection(copy.version, workout.id, exercise.id, 'warm-up');
    const updatedExercise = updated.workouts[0]!.exercises[0]!;

    expect(updatedExercise.section).toBe('warm-up');
    expect(updatedExercise.id).toBe(exercise.id);
    expect(updatedExercise.sets).toEqual(exercise.sets);
    expect(copy.version.workouts[0]!.exercises[0]!.section).toBe('working');
  });

  it('groups selected exercises as a superset or circuit without changing identity', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-groups',
      newVersionId: 'program-custom-groups-version-1',
      createdAt: '2026-09-14T15:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const first = workout.exercises[0]!;
    const second = workout.exercises[1]!;
    const grouped = groupWorkoutExercises(
      copy.version,
      workout.id,
      [first.id, second.id],
      'superset',
      'group-superset-1',
    );
    const groupedExercises = grouped.workouts[0]!.exercises;

    expect(groupedExercises[0]).toMatchObject({
      id: first.id,
      supersetGroupId: 'group-superset-1',
      groupType: 'superset',
    });
    expect(groupedExercises[1]).toMatchObject({
      id: second.id,
      supersetGroupId: 'group-superset-1',
      groupType: 'superset',
    });
    expect(groupedExercises[0]?.sets).toEqual(first.sets);

    const cleared = clearWorkoutExerciseGroup(grouped, workout.id, first.id);
    expect(cleared.workouts[0]!.exercises.slice(0, 2)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.id, supersetGroupId: undefined, groupType: undefined }),
        expect.objectContaining({
          id: second.id,
          supersetGroupId: undefined,
          groupType: undefined,
        }),
      ]),
    );
    expect(copy.version.workouts[0]!.exercises[0]?.supersetGroupId).toBeUndefined();
  });

  it('rejects invalid workout groups', () => {
    const copy = createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: 'program-custom-groups-invalid',
      newVersionId: 'program-custom-groups-invalid-version-1',
      createdAt: '2026-09-14T15:00:00.000Z',
    });
    const workout = copy.version.workouts[0]!;
    const first = workout.exercises[0]!;

    expect(() =>
      groupWorkoutExercises(copy.version, workout.id, [first.id], 'circuit', 'group-1'),
    ).toThrow('at least two different exercises');
    expect(() =>
      groupWorkoutExercises(copy.version, workout.id, [first.id, 'missing'], 'circuit', 'group-2'),
    ).toThrow('not found');
  });

  it('creates a reviewable custom exercise rather than silently treating it as curated', () => {
    const exercise = createCustomExercise({
      id: 'exercise-custom-1',
      name: 'Cameron carry',
      movementPattern: 'carry',
      primaryMuscles: ['grip', 'core'],
      equipmentIds: ['equipment-dumbbells'],
      trackingType: 'distance',
      difficulty: 'intermediate',
      notes: 'Keep the path controlled.',
      instructions: ['Walk with an even pace.', 'Set the weight down safely.'],
    });

    expect(exercise).toMatchObject({
      name: 'Cameron carry',
      isCustom: true,
      contentStatus: 'draft',
      trackingType: 'distance',
      classification: 'compound',
      difficulty: 'intermediate',
      notes: 'Keep the path controlled.',
      instructions: ['Walk with an even pace.', 'Set the weight down safely.'],
    });
  });

  it('requires primary muscles and equipment for a custom exercise', () => {
    expect(() =>
      createCustomExercise({
        id: 'exercise-custom-no-muscle',
        name: 'Unspecified movement',
        movementPattern: 'mobility',
        primaryMuscles: [],
        equipmentIds: ['equipment-bodyweight'],
      }),
    ).toThrow('at least one primary muscle');
    expect(() =>
      createCustomExercise({
        id: 'exercise-custom-no-equipment',
        name: 'Unspecified setup',
        movementPattern: 'mobility',
        primaryMuscles: ['hips'],
        equipmentIds: [],
      }),
    ).toThrow('at least one equipment option');
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
