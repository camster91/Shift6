import type { Program, ProgramVersion, SetTarget, Workout, WorkoutExercise } from '../types';
import { foundationalExercises } from './exercises';

type WorkoutPlan = {
  title: string;
  focus: Workout['focus'];
  dayOfWeek: number;
  exerciseIds: readonly string[];
  isOptional?: boolean;
};

const createdAt = '2026-09-15T12:00:00.000Z';

const launchPlans: Readonly<Record<string, readonly WorkoutPlan[]>> = {
  'shift6-foundations': [
    workout('Foundations A', 'strength', 1, [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-plank',
      'exercise-dead-bug',
    ]),
    workout('Foundations B', 'strength', 3, [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-single-leg-balance',
      'exercise-thoracic-rotation',
    ]),
    workout('Foundations C', 'mixed', 5, [
      'exercise-walking-lunge',
      'exercise-push-up',
      'exercise-plank',
      'exercise-hip-flexor-stretch',
    ]),
  ],
  'strength-3x5': [
    workout('Strength A', 'strength', 1, [
      'exercise-back-squat',
      'exercise-bench-press',
      'exercise-barbell-row',
    ]),
    workout('Strength B', 'strength', 3, [
      'exercise-deadlift',
      'exercise-overhead-press',
      'exercise-reverse-lunge',
    ]),
    workout('Strength C', 'strength', 5, [
      'exercise-front-squat',
      'exercise-bench-press',
      'exercise-romanian-deadlift',
    ]),
  ],
  'beginner-gym-3-day': [
    workout('Gym A', 'strength', 1, [
      'exercise-split-squat',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
    workout('Gym B', 'strength', 3, [
      'exercise-reverse-lunge',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
      'exercise-dead-bug',
    ]),
    workout('Gym C', 'strength', 5, [
      'exercise-walking-lunge',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-standing-calf-raise',
    ]),
  ],
  'upper-lower-hypertrophy': [
    workout('Upper A', 'strength', 1, [
      'exercise-incline-dumbbell-press',
      'exercise-one-arm-dumbbell-row',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
    ]),
    workout('Lower A', 'strength', 2, [
      'exercise-split-squat',
      'exercise-reverse-lunge',
      'exercise-standing-calf-raise',
      'exercise-plank',
    ]),
    workout('Upper B', 'strength', 4, [
      'exercise-floor-press',
      'exercise-one-arm-dumbbell-row',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
    ]),
    workout('Lower B', 'strength', 5, [
      'exercise-walking-lunge',
      'exercise-split-squat',
      'exercise-standing-calf-raise',
      'exercise-dead-bug',
    ]),
  ],
  'push-pull-legs': [
    workout('Push', 'strength', 1, [
      'exercise-floor-press',
      'exercise-lateral-raise',
      'exercise-push-up',
    ]),
    workout('Pull', 'strength', 3, [
      'exercise-biceps-curl',
      'exercise-farmer-carry',
      'exercise-dead-bug',
    ]),
    workout('Legs', 'strength', 5, [
      'exercise-split-squat',
      'exercise-reverse-lunge',
      'exercise-standing-calf-raise',
    ]),
  ],
  'dumbbell-only': [
    workout('Dumbbell A', 'strength', 1, [
      'exercise-split-squat',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
    workout('Dumbbell B', 'strength', 3, [
      'exercise-reverse-lunge',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
      'exercise-dead-bug',
    ]),
    workout('Dumbbell C', 'strength', 5, [
      'exercise-walking-lunge',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
  ],
  'minimal-home-gym': [
    workout('Home A', 'strength', 1, [
      'exercise-split-squat',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
    workout('Home B', 'strength', 3, [
      'exercise-reverse-lunge',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
      'exercise-dead-bug',
    ]),
    workout('Home C', 'mixed', 5, [
      'exercise-walking-lunge',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-thoracic-rotation',
    ]),
  ],
  'resistance-bands': [
    workout('Bands A', 'strength', 1, [
      'exercise-band-squat',
      'exercise-band-bent-over-row',
      'exercise-band-overhead-press',
      'exercise-band-pull-apart',
    ]),
    workout('Bands B', 'strength', 3, [
      'exercise-band-romanian-deadlift',
      'exercise-band-biceps-curl',
      'exercise-band-overhead-triceps-extension',
      'exercise-band-lateral-walk',
    ]),
    workout('Bands C', 'strength', 5, [
      'exercise-band-squat',
      'exercise-band-bent-over-row',
      'exercise-band-overhead-press',
      'exercise-band-romanian-deadlift',
    ]),
  ],
  'bodyweight-foundations': [
    workout('Bodyweight A', 'strength', 1, [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-plank',
      'exercise-dead-bug',
    ]),
    workout('Bodyweight B', 'strength', 3, [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-single-leg-balance',
      'exercise-thoracic-rotation',
    ]),
    workout('Bodyweight C', 'mixed', 5, [
      'exercise-walking-lunge',
      'exercise-push-up',
      'exercise-plank',
      'exercise-hip-flexor-stretch',
    ]),
  ],
  'calisthenics-strength': [
    workout('Calisthenics A', 'strength', 1, [
      'exercise-pull-up',
      'exercise-push-up',
      'exercise-split-squat',
      'exercise-plank',
    ]),
    workout('Calisthenics B', 'strength', 3, [
      'exercise-dip',
      'exercise-pull-up',
      'exercise-reverse-lunge',
      'exercise-hanging-knee-raise',
    ]),
    workout('Calisthenics C', 'strength', 5, [
      'exercise-pull-up',
      'exercise-dip',
      'exercise-push-up',
      'exercise-single-leg-balance',
    ]),
  ],
  'strength-conditioning-hybrid': [
    workout('Strength A', 'strength', 1, [
      'exercise-split-squat',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
    workout('Conditioning A', 'cardio', 2, ['exercise-easy-run']),
    workout('Strength B', 'strength', 3, [
      'exercise-reverse-lunge',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
      'exercise-dead-bug',
    ]),
    workout('Conditioning B', 'cardio', 4, ['exercise-easy-run']),
    workout('Strength C', 'strength', 5, [
      'exercise-walking-lunge',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
  ],
  'busy-20': [
    workout('Busy A', 'mixed', 1, ['exercise-split-squat', 'exercise-push-up', 'exercise-plank']),
    workout('Busy B', 'mixed', 2, ['exercise-reverse-lunge', 'exercise-push-up', 'exercise-dead-bug']),
    workout('Busy C', 'mixed', 4, [
      'exercise-walking-lunge',
      'exercise-push-up',
      'exercise-single-leg-balance',
    ]),
    workout('Busy D', 'mobility', 6, [
      'exercise-hip-flexor-stretch',
      'exercise-thoracic-rotation',
      'exercise-childs-pose',
    ]),
  ],
  'mobility-strength': [
    workout('Strength + Hips', 'mixed', 1, [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-hip-flexor-stretch',
      'exercise-plank',
    ]),
    workout('Strength + Spine', 'mixed', 3, [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-thoracic-rotation',
      'exercise-dead-bug',
    ]),
    workout('Mobility + Control', 'mobility', 5, [
      'exercise-walking-lunge',
      'exercise-single-leg-balance',
      'exercise-hip-flexor-stretch',
      'exercise-childs-pose',
    ]),
  ],
  'healthy-ageing': [
    workout('Strength + Balance', 'mixed', 1, [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-single-leg-balance',
      'exercise-plank',
    ]),
    workout('Aerobic + Mobility', 'mixed', 3, [
      'exercise-easy-run',
      'exercise-hip-flexor-stretch',
      'exercise-thoracic-rotation',
    ]),
    workout('Strength + Control', 'mixed', 5, [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-dead-bug',
      'exercise-single-leg-balance',
    ]),
  ],
  'return-to-training': [
    workout('Return A', 'strength', 1, [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-plank',
    ]),
    workout('Return B', 'strength', 3, [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-dead-bug',
    ]),
    workout('Return C', 'mixed', 5, [
      'exercise-walking-lunge',
      'exercise-push-up',
      'exercise-thoracic-rotation',
    ]),
  ],
  'runner-support': [
    workout('Runner Strength A', 'strength', 2, [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-standing-calf-raise',
      'exercise-plank',
    ]),
    workout('Easy Run', 'cardio', 4, ['exercise-easy-run'], true),
    workout('Runner Strength B', 'strength', 5, [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-dead-bug',
      'exercise-single-leg-balance',
    ]),
    workout('Long Easy Run', 'cardio', 7, ['exercise-easy-run'], true),
  ],
  'cyclist-support': [
    workout('Cyclist Strength A', 'strength', 2, [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-dead-bug',
      'exercise-standing-calf-raise',
    ]),
    workout('Easy Ride', 'cardio', 4, ['exercise-stationary-bike'], true),
    workout('Cyclist Strength B', 'strength', 5, [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-plank',
      'exercise-thoracic-rotation',
    ]),
    workout('Aerobic Ride', 'cardio', 7, ['exercise-stationary-bike'], true),
  ],
  'power-athleticism': [
    workout('Power A', 'conditioning', 1, [
      'exercise-box-jump',
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-plank',
    ]),
    workout('Conditioning', 'conditioning', 2, [
      'exercise-easy-run',
      'exercise-walking-lunge',
      'exercise-push-up',
    ]),
    workout('Power B', 'conditioning', 4, [
      'exercise-box-jump',
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-dead-bug',
    ]),
    workout('Movement Quality', 'mobility', 6, [
      'exercise-single-leg-balance',
      'exercise-thoracic-rotation',
      'exercise-hip-flexor-stretch',
      'exercise-childs-pose',
    ]),
  ],
  'cardio-base-strength': [
    workout('Full Body A', 'strength', 1, [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-plank',
      'exercise-dead-bug',
    ]),
    workout('Aerobic Base A', 'cardio', 2, ['exercise-easy-run']),
    workout('Full Body B', 'strength', 4, [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-single-leg-balance',
      'exercise-plank',
    ]),
    workout('Aerobic Base B', 'cardio', 6, ['exercise-easy-run']),
  ],
};

const equipmentByExerciseId = new Map(
  foundationalExercises.map((exercise) => [exercise.id, exercise.equipmentIds] as const),
);

const mobilityExerciseIds = new Set([
  'exercise-single-leg-balance',
  'exercise-thoracic-rotation',
  'exercise-hip-flexor-stretch',
  'exercise-childs-pose',
]);

const timedExerciseIds = new Set([
  'exercise-plank',
  'exercise-single-leg-balance',
  'exercise-hip-flexor-stretch',
  'exercise-childs-pose',
]);

const lowerVolumeProgramSlugs = new Set([
  'healthy-ageing',
  'return-to-training',
  'runner-support',
  'cyclist-support',
]);

export function buildLaunchProgramVersion(program: Program): ProgramVersion | undefined {
  const plans = launchPlans[program.slug];
  if (!plans) return undefined;

  const requiredWorkoutCount = plans.filter((plan) => !plan.isOptional).length;
  if (requiredWorkoutCount !== program.daysPerWeek) return undefined;

  const versionId = program.currentVersionId;
  return {
    id: versionId,
    programId: program.id,
    version: 1,
    status: 'draft',
    cycleModel: {
      lengthWeeks: 6,
      weekSixMeaning: weekSixMeaning(program),
      phases: {
        1: 'Establish',
        2: 'Repeatability',
        3: 'Build',
        4: 'Build',
        5: 'Challenge',
        6: 'Review and choose the next block',
      },
    },
    workouts: plans.map((plan, index) => buildWorkout(program, versionId, plan, index)),
    progressionRuleIds: [`rule-default-${program.progressionStrategy}`],
    createdAt,
  };
}

function workout(
  title: string,
  focus: Workout['focus'],
  dayOfWeek: number,
  exerciseIds: readonly string[],
  isOptional = false,
): WorkoutPlan {
  return { title, focus, dayOfWeek, exerciseIds, ...(isOptional ? { isOptional } : {}) };
}

function buildWorkout(
  program: Program,
  versionId: string,
  plan: WorkoutPlan,
  workoutIndex: number,
): Workout {
  const workoutId = `workout-${program.slug}-${workoutIndex + 1}`;
  const exercises = plan.exerciseIds.map((exerciseId, exerciseIndex) =>
    buildWorkoutExercise(program.slug, workoutId, exerciseId, exerciseIndex),
  );

  return {
    id: workoutId,
    programVersionId: versionId,
    title: plan.title,
    dayOfWeek: plan.dayOfWeek,
    focus: plan.focus,
    estimatedDurationMinutes: program.sessionLengthMinutes,
    ...(plan.isOptional ? { isOptional: true } : {}),
    equipmentIds: unique(
      exercises.flatMap((exercise) => equipmentByExerciseId.get(exercise.exerciseId) ?? []),
    ),
    exercises,
  };
}

function buildWorkoutExercise(
  programSlug: string,
  workoutId: string,
  exerciseId: string,
  exerciseIndex: number,
): WorkoutExercise {
  const id = `${workoutId}-exercise-${exerciseIndex + 1}`;
  return {
    id,
    exerciseId,
    order: exerciseIndex + 1,
    section:
      exerciseId === 'exercise-easy-run' || exerciseId === 'exercise-stationary-bike'
        ? 'cardio'
        : mobilityExerciseIds.has(exerciseId)
          ? 'mobility'
          : 'working',
    sets: prescription(programSlug, id, exerciseId),
  };
}

function prescription(
  programSlug: string,
  prefix: string,
  exerciseId: string,
): WorkoutExercise['sets'] {
  if (exerciseId === 'exercise-easy-run' || exerciseId === 'exercise-stationary-bike') {
    return targetSets(prefix, 1, { durationSeconds: 1200 }, 60);
  }
  if (exerciseId === 'exercise-farmer-carry') {
    return targetSets(prefix, 3, { distanceMeters: 40 }, 60);
  }
  if (exerciseId === 'exercise-box-jump') {
    return targetSets(prefix, 3, { reps: 3 }, 90);
  }
  if (timedExerciseIds.has(exerciseId)) {
    const durationSeconds = exerciseId === 'exercise-childs-pose' ? 60 : 30;
    return targetSets(prefix, 2, { durationSeconds }, 30);
  }
  if (mobilityExerciseIds.has(exerciseId) || exerciseId === 'exercise-dead-bug') {
    return targetSets(prefix, 2, { reps: { min: 6, max: 10 } }, 30);
  }
  if (programSlug === 'strength-3x5') {
    return targetSets(prefix, 3, { reps: 5, rir: 2 }, 120);
  }
  if (lowerVolumeProgramSlugs.has(programSlug)) {
    return targetSets(prefix, 2, { reps: { min: 6, max: 10 }, rir: 3 }, 75);
  }
  if (programSlug === 'busy-20') {
    return targetSets(prefix, 2, { reps: { min: 8, max: 12 }, rir: 2 }, 45);
  }
  return targetSets(prefix, 3, { reps: { min: 8, max: 12 }, rir: 2 }, 75);
}

function targetSets(
  prefix: string,
  count: number,
  target: SetTarget,
  restSeconds: number,
): WorkoutExercise['sets'] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-set-${index + 1}`,
    setNumber: index + 1,
    target: cloneTarget(target),
    restSeconds,
  }));
}

function cloneTarget(target: SetTarget): SetTarget {
  return {
    ...target,
    ...(typeof target.reps === 'object' && target.reps !== null
      ? { reps: { ...target.reps } }
      : {}),
    ...(target.load ? { load: { ...target.load } } : {}),
  };
}

function weekSixMeaning(program: Program): ProgramVersion['cycleModel']['weekSixMeaning'] {
  switch (program.progressionStrategy) {
    case 'skill':
      return 'technique';
    case 'volume':
    case 'rep-target':
      return 'rep-pr';
    case 'cardio':
    case 'density':
      return 'evaluation';
    case 'rpe-rir':
      return 'consolidation';
    default:
      return 'consolidation';
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
