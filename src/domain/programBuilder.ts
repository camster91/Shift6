import type {
  Difficulty,
  Exercise,
  MovementPattern,
  Program,
  ProgramVersion,
  SetTarget,
  TrackingType,
  WorkoutExercise,
  WorkoutGroupType,
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

export interface CreateBlankProgramInput {
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

export interface UpdateWorkoutInput {
  title?: string;
  dayOfWeek?: number;
  focus?: Workout['focus'];
  estimatedDurationMinutes?: number;
  equipmentIds?: string[];
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

export function createProgramVersionRevision(
  sourceVersion: ProgramVersion,
  newVersionId: string,
  createdAt: string,
): ProgramVersion {
  const versionId = newVersionId.trim();
  if (!versionId) throw new Error('A program version revision needs a stable ID.');
  if (versionId === sourceVersion.id) {
    throw new Error('A program version revision must have a new ID.');
  }

  return {
    ...sourceVersion,
    id: versionId,
    version: sourceVersion.version + 1,
    status: 'draft',
    createdAt,
    workouts: sourceVersion.workouts.map((workout) => ({
      ...workout,
      programVersionId: versionId,
      equipmentIds: [...workout.equipmentIds],
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          target: cloneTarget(set.target),
        })),
      })),
    })),
  };
}

export function createBlankProgram({
  userId,
  newProgramId,
  newVersionId,
  createdAt,
}: CreateBlankProgramInput): ProgramCopy {
  const programId = newProgramId.trim();
  const versionId = newVersionId.trim();
  if (!programId || !versionId) {
    throw new Error('A custom program needs stable program and version IDs.');
  }

  const program: Program = {
    id: programId,
    slug: `${programId}-slug`,
    title: 'My SHIFT6 plan',
    description: 'A private six-week plan built around the way you train.',
    goals: ['general-health'],
    targetUser: 'A user-created training plan.',
    experience: ['beginner', 'intermediate', 'advanced'],
    daysPerWeek: 3,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: [],
    optionalEquipmentIds: [],
    progressionStrategy: 'double-progression',
    currentVersionId: versionId,
    isTemplate: false,
    ownerId: userId,
  };
  const version: ProgramVersion = {
    id: versionId,
    programId,
    version: 1,
    status: 'draft',
    cycleModel: {
      lengthWeeks: 6,
      weekSixMeaning: 'normal-training',
      phases: {
        1: 'Establish',
        2: 'Repeatability',
        3: 'Build',
        4: 'Build',
        5: 'Challenge',
        6: 'Review',
      },
    },
    workouts: [],
    progressionRuleIds: [],
    createdAt,
  };

  return { program, version };
}

export function renameProgram(program: Program, title: string): Program {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error('A custom program needs a name.');

  return { ...program, title: trimmedTitle };
}

export function updateWorkoutMetadata(
  version: ProgramVersion,
  workoutId: string,
  input: UpdateWorkoutInput,
): ProgramVersion {
  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');

  const title = input.title === undefined ? workout.title : input.title.trim();
  if (!title) throw new Error('A workout needs a name.');

  const dayOfWeek = input.dayOfWeek ?? workout.dayOfWeek;
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    throw new Error('A workout day must be between 1 and 7.');
  }

  const estimatedDurationMinutes =
    input.estimatedDurationMinutes ?? workout.estimatedDurationMinutes;
  if (!Number.isInteger(estimatedDurationMinutes) || estimatedDurationMinutes < 1) {
    throw new Error('A workout needs a positive duration.');
  }

  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    title,
    dayOfWeek,
    focus: input.focus ?? currentWorkout.focus,
    estimatedDurationMinutes,
    equipmentIds:
      input.equipmentIds === undefined ? currentWorkout.equipmentIds : [...input.equipmentIds],
  }));
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
  const workoutExerciseId = createNextWorkoutExerciseId(workout, workoutId);
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

export function setWorkoutExerciseRestSeconds(
  version: ProgramVersion,
  workoutId: string,
  workoutExerciseId: string,
  restSeconds: number | undefined,
): ProgramVersion {
  assertRestSeconds(restSeconds);

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
            sets: exercise.sets.map((set) => ({ ...set, restSeconds })),
          }
        : exercise,
    ),
  }));
}

export function setWorkoutExerciseNotes(
  version: ProgramVersion,
  workoutId: string,
  workoutExerciseId: string,
  notes: string,
): ProgramVersion {
  const trimmedNotes = notes.trim();
  if (trimmedNotes.length > 500) {
    throw new Error('Exercise notes must be 500 characters or fewer.');
  }

  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');
  if (!workout.exercises.some((exercise) => exercise.id === workoutExerciseId)) {
    throw new Error('Exercise not found in this workout.');
  }

  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    exercises: currentWorkout.exercises.map((exercise) =>
      exercise.id === workoutExerciseId
        ? { ...exercise, notes: trimmedNotes || undefined }
        : exercise,
    ),
  }));
}

export function setWorkoutExerciseSection(
  version: ProgramVersion,
  workoutId: string,
  workoutExerciseId: string,
  section: WorkoutExercise['section'],
): ProgramVersion {
  const sections: readonly WorkoutExercise['section'][] = [
    'warm-up',
    'working',
    'cooldown',
    'cardio',
    'mobility',
  ];
  if (!sections.includes(section)) throw new Error('This workout section is not supported.');

  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');
  if (!workout.exercises.some((exercise) => exercise.id === workoutExerciseId)) {
    throw new Error('Exercise not found in this workout.');
  }

  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    exercises: currentWorkout.exercises.map((exercise) =>
      exercise.id === workoutExerciseId ? { ...exercise, section } : exercise,
    ),
  }));
}

export function groupWorkoutExercises(
  version: ProgramVersion,
  workoutId: string,
  workoutExerciseIds: readonly string[],
  groupType: WorkoutGroupType,
  groupId: string,
): ProgramVersion {
  const normalizedGroupId = groupId.trim();
  if (!normalizedGroupId) throw new Error('A workout group needs a stable ID.');

  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');

  const selectedIds = new Set(workoutExerciseIds);
  if (selectedIds.size < 2 || selectedIds.size !== workoutExerciseIds.length) {
    throw new Error('A superset or circuit needs at least two different exercises.');
  }
  if (workoutExerciseIds.some((id) => !workout.exercises.some((exercise) => exercise.id === id))) {
    throw new Error('The selected exercises were not found in this workout.');
  }

  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    exercises: currentWorkout.exercises.map((exercise) =>
      selectedIds.has(exercise.id)
        ? { ...exercise, supersetGroupId: normalizedGroupId, groupType }
        : exercise,
    ),
  }));
}

export function clearWorkoutExerciseGroup(
  version: ProgramVersion,
  workoutId: string,
  workoutExerciseId: string,
): ProgramVersion {
  const workout = version.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) throw new Error('Workout not found in this program version.');
  const selectedExercise = workout.exercises.find((exercise) => exercise.id === workoutExerciseId);
  if (!selectedExercise) throw new Error('Exercise not found in this workout.');

  const groupId = selectedExercise.supersetGroupId;
  if (!groupId) return version;

  return updateWorkout(version, workoutId, (currentWorkout) => ({
    ...currentWorkout,
    exercises: currentWorkout.exercises.map((exercise) =>
      exercise.supersetGroupId === groupId
        ? { ...exercise, supersetGroupId: undefined, groupType: undefined }
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

function createNextWorkoutExerciseId(workout: Workout, workoutId: string): string {
  const existingIds = new Set(workout.exercises.map((exercise) => exercise.id));
  let suffix = workout.exercises.length + 1;
  let candidate = `${workoutId}-exercise-${suffix}`;
  while (existingIds.has(candidate)) {
    suffix += 1;
    candidate = `${workoutId}-exercise-${suffix}`;
  }
  return candidate;
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

function assertRestSeconds(restSeconds: number | undefined): void {
  if (
    restSeconds !== undefined &&
    (!Number.isInteger(restSeconds) || restSeconds < 0 || restSeconds > 3600)
  ) {
    throw new Error('Rest must be a whole number between 0 and 3600 seconds.');
  }
}
