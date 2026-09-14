import type {
  Difficulty,
  Exercise,
  MovementPattern,
  Program,
  ProgramVersion,
  SetTarget,
  TrackingType,
  WorkoutExercise,
  Workout,
} from './types';

export interface ProgramCopy {
  program: Program;
  version: ProgramVersion;
}

export interface CreateProgramCopyInput {
  sourceProgram: Program;
  sourceVersion: ProgramVersion;
  userId: string;
  newProgramId: string;
  newVersionId: string;
  createdAt: string;
}

export interface AddExerciseInput {
  exerciseId: string;
  setCount?: number;
  target?: SetTarget;
}

export interface AddWorkoutInput {
  id: string;
  title: string;
  dayOfWeek: number;
  focus: Workout['focus'];
  estimatedDurationMinutes: number;
  equipmentIds?: string[];
  isOptional?: boolean;
}

export interface CreateCustomExerciseInput {
  id: string;
  name: string;
  movementPattern: MovementPattern;
  primaryMuscles: string[];
  equipmentIds: string[];
  trackingType?: TrackingType;
  difficulty?: Difficulty;
  instructions?: string[];
  techniqueCues?: string[];
  safetyNotes?: string[];
}

export function createProgramCopy({
  sourceProgram,
  sourceVersion,
  userId,
  newProgramId,
  newVersionId,
  createdAt,
}: CreateProgramCopyInput): ProgramCopy {
  const version = cloneProgramVersion(sourceVersion, newProgramId, newVersionId, createdAt);

  return {
    program: {
      ...sourceProgram,
      id: newProgramId,
      slug: `${sourceProgram.slug}-copy`,
      title: `${sourceProgram.title} copy`,
      currentVersionId: newVersionId,
      isTemplate: false,
      ownerId: userId,
      sourceProgramId: sourceProgram.id,
    },
    version,
  };
}

export function renameProgram(program: Program, title: string): Program {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error('A custom program needs a name.');

  return { ...program, title: trimmedTitle };
}

export function addWorkoutToProgram(
  version: ProgramVersion,
  {
    id,
    title,
    dayOfWeek,
    focus,
    estimatedDurationMinutes,
    equipmentIds = [],
    isOptional = true,
  }: AddWorkoutInput,
): ProgramVersion {
  const workoutId = id.trim();
  const workoutTitle = title.trim();
  if (!workoutId) throw new Error('A workout needs a stable ID.');
  if (!workoutTitle) throw new Error('A workout needs a name.');
  if (version.workouts.some((workout) => workout.id === workoutId)) {
    throw new Error('A workout with this ID already exists.');
  }
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    throw new Error('A workout day must be between 1 and 7.');
  }
  if (!Number.isInteger(estimatedDurationMinutes) || estimatedDurationMinutes < 1) {
    throw new Error('A workout needs a positive duration.');
  }

  const workout: Workout = {
    id: workoutId,
    programVersionId: version.id,
    title: workoutTitle,
    dayOfWeek,
    focus,
    estimatedDurationMinutes,
    isOptional,
    equipmentIds: [...equipmentIds],
    exercises: [],
  };

  return {
    ...version,
    workouts: [...version.workouts, workout],
  };
}

export function addExerciseToWorkout(
  version: ProgramVersion,
  workoutId: string,
  { exerciseId, setCount = 3, target = { reps: 8 } }: AddExerciseInput,
): ProgramVersion {
  assertSetCount(setCount);

  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');

  const order = workout.exercises.length + 1;
  const workoutExerciseId = `${workoutId}-exercise-${order}`;
  const workoutExercise: WorkoutExercise = {
    id: workoutExerciseId,
    exerciseId,
    order,
    section: 'working',
    sets: Array.from({ length: setCount }, (_, index) => ({
      id: `${workoutExerciseId}-set-${index + 1}`,
      setNumber: index + 1,
      target: cloneTarget(target),
      restSeconds: 90,
    })),
  };

  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    exercises: [...currentWorkout.exercises, workoutExercise],
  }));
}

export function removeExerciseFromWorkout(
  version: ProgramVersion,
  workoutId: string,
  workoutExerciseId: string,
): ProgramVersion {
  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');
  if (!workout.exercises.some((exercise) => exercise.id === workoutExerciseId)) {
    throw new Error('Exercise not found in this workout.');
  }

  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    exercises: currentWorkout.exercises
      .filter((exercise) => exercise.id !== workoutExerciseId)
      .map((exercise, index) => ({ ...exercise, order: index + 1 })),
  }));
}

export function replaceExerciseInWorkout(
  version: ProgramVersion,
  workoutId: string,
  workoutExerciseId: string,
  replacementExerciseId: string,
): ProgramVersion {
  const replacementId = replacementExerciseId.trim();
  if (!replacementId) throw new Error('A replacement exercise needs an ID.');

  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');
  if (!workout.exercises.some((exercise) => exercise.id === workoutExerciseId)) {
    throw new Error('Exercise not found in this workout.');
  }

  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    exercises: currentWorkout.exercises.map((exercise) =>
      exercise.id === workoutExerciseId
        ? { ...exercise, exerciseId: replacementId, variantId: undefined }
        : exercise,
    ),
  }));
}

export function reorderWorkoutExercises(
  version: ProgramVersion,
  workoutId: string,
  orderedExerciseIds: readonly string[],
): ProgramVersion {
  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');

  const currentIds = workout.exercises.map((exercise) => exercise.id).sort();
  const nextIds = [...orderedExerciseIds].sort();
  if (currentIds.join('|') !== nextIds.join('|')) {
    throw new Error('Reorder must include every workout exercise exactly once.');
  }

  const byId = new Map(workout.exercises.map((exercise) => [exercise.id, exercise]));
  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    exercises: orderedExerciseIds.map((id, index) => ({ ...byId.get(id)!, order: index + 1 })),
  }));
}

export function setWorkoutExerciseSetCount(
  version: ProgramVersion,
  workoutId: string,
  workoutExerciseId: string,
  setCount: number,
): ProgramVersion {
  assertSetCount(setCount);

  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');

  const workoutExercise = workout.exercises.find((exercise) => exercise.id === workoutExerciseId);
  if (!workoutExercise) throw new Error('Exercise not found in this workout.');

  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    exercises: currentWorkout.exercises.map((exercise) => {
      if (exercise.id !== workoutExerciseId) return exercise;

      const currentSets = exercise.sets.slice(0, setCount).map((set, index) => ({
        ...set,
        setNumber: index + 1,
        target: cloneTarget(set.target),
      }));
      const templateSet = exercise.sets.at(-1) ?? {
        id: `${workoutExerciseId}-set-0`,
        setNumber: 0,
        target: { reps: 8 },
        restSeconds: 90,
      };
      const addedSets = Array.from(
        { length: Math.max(0, setCount - currentSets.length) },
        (_, index) => ({
          id: `${workoutExerciseId}-set-${currentSets.length + index + 1}`,
          setNumber: currentSets.length + index + 1,
          target: cloneTarget(templateSet.target),
          restSeconds: templateSet.restSeconds,
        }),
      );

      return { ...exercise, sets: [...currentSets, ...addedSets] };
    }),
  }));
}

export function setWorkoutExerciseTarget(
  version: ProgramVersion,
  workoutId: string,
  workoutExerciseId: string,
  target: SetTarget,
): ProgramVersion {
  assertTarget(target);

  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');
  if (!workout.exercises.some((exercise) => exercise.id === workoutExerciseId)) {
    throw new Error('Exercise not found in this workout.');
  }

  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    exercises: currentWorkout.exercises.map((exercise) =>
      exercise.id === workoutExerciseId
        ? {
            ...exercise,
            sets: exercise.sets.map((set) => ({ ...set, target: cloneTarget(target) })),
          }
        : exercise,
    ),
  }));
}

export function createCustomExercise({
  id,
  name,
  movementPattern,
  primaryMuscles,
  equipmentIds,
  trackingType = 'reps',
  difficulty = 'beginner',
  instructions = ['Use a stable setup and move through a controlled range of motion.'],
  techniqueCues = ['Breathe steadily and stop if sharp pain occurs.'],
  safetyNotes = ['Choose a variation and load you can control.'],
}: CreateCustomExerciseInput): Exercise {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('A custom exercise needs a name.');

  return {
    id,
    name: trimmedName,
    aliases: [],
    movementPattern,
    primaryMuscles,
    secondaryMuscles: [],
    equipmentIds,
    setup: 'User-defined setup. Review the movement before adding it to a live plan.',
    difficulty,
    instructions,
    techniqueCues,
    commonMistakes: [],
    safetyNotes,
    unilateral: false,
    trackingType,
    tags: ['custom', movementPattern],
    media: [],
    isCustom: true,
    contentStatus: 'draft',
  };
}

function cloneProgramVersion(
  sourceVersion: ProgramVersion,
  programId: string,
  versionId: string,
  createdAt: string,
): ProgramVersion {
  return {
    ...sourceVersion,
    id: versionId,
    programId,
    version: 1,
    status: 'draft',
    workouts: sourceVersion.workouts.map((workout, workoutIndex) => ({
      ...workout,
      id: `${versionId}-workout-${workoutIndex + 1}`,
      programVersionId: versionId,
      exercises: workout.exercises.map((exercise, exerciseIndex) => ({
        ...exercise,
        id: `${versionId}-workout-${workoutIndex + 1}-exercise-${exerciseIndex + 1}`,
        order: exerciseIndex + 1,
        sets: exercise.sets.map((set, setIndex) => ({
          ...set,
          id: `${versionId}-workout-${workoutIndex + 1}-exercise-${exerciseIndex + 1}-set-${setIndex + 1}`,
          setNumber: setIndex + 1,
          target: cloneTarget(set.target),
        })),
      })),
    })),
    createdAt,
  };
}

function updateWorkout(
  version: ProgramVersion,
  workoutId: string,
  update: (workout: ProgramVersion['workouts'][number]) => ProgramVersion['workouts'][number],
): ProgramVersion {
  return {
    ...version,
    workouts: version.workouts.map((workout) =>
      workout.id === workoutId ? update(workout) : workout,
    ),
  };
}

function cloneTarget(target: SetTarget): SetTarget {
  return {
    ...target,
    reps: typeof target.reps === 'object' ? { ...target.reps } : target.reps,
    load: target.load ? { ...target.load } : undefined,
  };
}

function assertSetCount(setCount: number): void {
  if (!Number.isInteger(setCount) || setCount < 1 || setCount > 20) {
    throw new Error('A workout exercise needs between 1 and 20 sets.');
  }
}

function assertTarget(target: SetTarget): void {
  if (Object.keys(target).length === 0) {
    throw new Error('A workout exercise needs at least one target value.');
  }
}
