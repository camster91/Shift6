import type { Program, ProgramVersion, SetTarget, Workout, WorkoutExercise } from '../types';
import { foundationalExercises } from './exercises';

type WorkoutPlan = {
  title: string;
  focus: Workout['focus'];
  exerciseIds: readonly string[];
};

const createdAt = '2026-09-15T12:00:00.000Z';

const launchPlans: Readonly<Record<string, readonly WorkoutPlan[]>> = {
  'beginner-strength': [
    workout('Full Body A', 'strength', [
      'exercise-split-squat',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
    workout('Full Body B', 'strength', [
      'exercise-reverse-lunge',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
      'exercise-dead-bug',
    ]),
    workout('Full Body C', 'strength', [
      'exercise-walking-lunge',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
  ],
  'full-body-strength': [
    workout('Full Body A', 'strength', [
      'exercise-split-squat',
      'exercise-incline-dumbbell-press',
      'exercise-one-arm-dumbbell-row',
      'exercise-plank',
    ]),
    workout('Full Body B', 'strength', [
      'exercise-reverse-lunge',
      'exercise-floor-press',
      'exercise-one-arm-dumbbell-row',
      'exercise-farmer-carry',
    ]),
    workout('Full Body C', 'strength', [
      'exercise-walking-lunge',
      'exercise-incline-dumbbell-press',
      'exercise-one-arm-dumbbell-row',
      'exercise-dead-bug',
    ]),
  ],
  'strength-conditioning': [
    workout('Strength + Carry', 'mixed', [
      'exercise-split-squat',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
    workout('Conditioning', 'conditioning', [
      'exercise-easy-run',
      'exercise-walking-lunge',
      'exercise-push-up',
      'exercise-dead-bug',
    ]),
    workout('Strength + Upper', 'mixed', [
      'exercise-reverse-lunge',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
      'exercise-farmer-carry',
    ]),
    workout('Aerobic Builder', 'cardio', [
      'exercise-easy-run',
      'exercise-plank',
      'exercise-push-up',
    ]),
  ],
  hypertrophy: [
    workout('Upper A', 'strength', [
      'exercise-incline-dumbbell-press',
      'exercise-one-arm-dumbbell-row',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
    ]),
    workout('Lower A', 'strength', [
      'exercise-split-squat',
      'exercise-reverse-lunge',
      'exercise-standing-calf-raise',
      'exercise-plank',
    ]),
    workout('Upper B', 'strength', [
      'exercise-floor-press',
      'exercise-one-arm-dumbbell-row',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
    ]),
    workout('Lower B', 'strength', [
      'exercise-walking-lunge',
      'exercise-split-squat',
      'exercise-standing-calf-raise',
      'exercise-dead-bug',
    ]),
  ],
  'upper-lower': [
    workout('Upper A', 'strength', [
      'exercise-overhead-press',
      'exercise-barbell-row',
      'exercise-landmine-press',
    ]),
    workout('Lower A', 'strength', [
      'exercise-back-squat',
      'exercise-romanian-deadlift',
      'exercise-standing-calf-raise',
    ]),
    workout('Upper B', 'strength', [
      'exercise-overhead-press',
      'exercise-barbell-row',
      'exercise-landmine-press',
    ]),
    workout('Lower B', 'strength', [
      'exercise-front-squat',
      'exercise-deadlift',
      'exercise-split-squat',
    ]),
  ],
  'push-pull-legs': [
    workout('Push', 'strength', [
      'exercise-floor-press',
      'exercise-lateral-raise',
      'exercise-push-up',
    ]),
    workout('Pull', 'strength', [
      'exercise-biceps-curl',
      'exercise-farmer-carry',
      'exercise-dead-bug',
    ]),
    workout('Legs', 'strength', [
      'exercise-split-squat',
      'exercise-reverse-lunge',
      'exercise-standing-calf-raise',
    ]),
  ],
  'dumbbell-only': [
    workout('Dumbbell A', 'strength', [
      'exercise-split-squat',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
    workout('Dumbbell B', 'strength', [
      'exercise-reverse-lunge',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
      'exercise-dead-bug',
    ]),
    workout('Dumbbell C', 'strength', [
      'exercise-walking-lunge',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
  ],
  'home-gym': [
    workout('Home Strength', 'strength', [
      'exercise-split-squat',
      'exercise-floor-press',
      'exercise-lateral-raise',
      'exercise-plank',
    ]),
    workout('Home Conditioning', 'conditioning', [
      'exercise-easy-run',
      'exercise-walking-lunge',
      'exercise-push-up',
      'exercise-dead-bug',
    ]),
    workout('Home Strength B', 'strength', [
      'exercise-reverse-lunge',
      'exercise-biceps-curl',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
    workout('Home Mixed', 'mixed', [
      'exercise-walking-lunge',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-dead-bug',
    ]),
  ],
  'minimal-equipment': [
    workout('Bodyweight Strength', 'strength', [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-plank',
      'exercise-dead-bug',
    ]),
    workout('Movement + Cardio', 'mixed', [
      'exercise-easy-run',
      'exercise-walking-lunge',
      'exercise-push-up',
    ]),
    workout('Bodyweight Strength B', 'strength', [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-single-leg-balance',
      'exercise-plank',
    ]),
  ],
  'bodyweight-foundations': [
    workout('Foundations A', 'strength', [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-plank',
      'exercise-dead-bug',
    ]),
    workout('Foundations B', 'strength', [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-single-leg-balance',
      'exercise-thoracic-rotation',
    ]),
    workout('Foundations C', 'mixed', [
      'exercise-walking-lunge',
      'exercise-push-up',
      'exercise-plank',
      'exercise-hip-flexor-stretch',
    ]),
  ],
  'resistance-bands': [
    workout('Bands A', 'strength', [
      'exercise-band-squat',
      'exercise-band-bent-over-row',
      'exercise-band-overhead-press',
      'exercise-band-pull-apart',
    ]),
    workout('Bands B', 'strength', [
      'exercise-band-romanian-deadlift',
      'exercise-band-biceps-curl',
      'exercise-band-overhead-triceps-extension',
      'exercise-band-lateral-walk',
    ]),
    workout('Bands C', 'strength', [
      'exercise-band-squat',
      'exercise-band-bent-over-row',
      'exercise-band-overhead-press',
      'exercise-band-romanian-deadlift',
    ]),
  ],
  'general-fitness': [
    workout('Strength', 'strength', [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-plank',
      'exercise-dead-bug',
    ]),
    workout('Cardio', 'cardio', ['exercise-easy-run', 'exercise-thoracic-rotation']),
    workout('Mixed', 'mixed', [
      'exercise-walking-lunge',
      'exercise-push-up',
      'exercise-single-leg-balance',
      'exercise-plank',
    ]),
    workout('Mobility', 'mobility', [
      'exercise-hip-flexor-stretch',
      'exercise-thoracic-rotation',
      'exercise-childs-pose',
    ]),
  ],
  'strength-for-longevity': [
    workout('Strength + Balance', 'mixed', [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-single-leg-balance',
      'exercise-plank',
    ]),
    workout('Aerobic + Mobility', 'mixed', [
      'exercise-easy-run',
      'exercise-hip-flexor-stretch',
      'exercise-thoracic-rotation',
    ]),
    workout('Strength + Control', 'mixed', [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-dead-bug',
      'exercise-single-leg-balance',
    ]),
  ],
  'athletic-conditioning': [
    workout('Acceleration Base', 'conditioning', [
      'exercise-easy-run',
      'exercise-walking-lunge',
      'exercise-push-up',
      'exercise-plank',
    ]),
    workout('Power Base', 'conditioning', [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-dead-bug',
      'exercise-single-leg-balance',
    ]),
    workout('Repeat Effort', 'conditioning', [
      'exercise-easy-run',
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-plank',
    ]),
    workout('Movement Quality', 'mobility', [
      'exercise-hip-flexor-stretch',
      'exercise-thoracic-rotation',
      'exercise-single-leg-balance',
      'exercise-childs-pose',
    ]),
  ],
  'mobility-strength': [
    workout('Strength + Hips', 'mixed', [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-hip-flexor-stretch',
      'exercise-plank',
    ]),
    workout('Strength + Spine', 'mixed', [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-thoracic-rotation',
      'exercise-dead-bug',
    ]),
    workout('Full Body Mobility', 'mobility', [
      'exercise-walking-lunge',
      'exercise-single-leg-balance',
      'exercise-hip-flexor-stretch',
      'exercise-childs-pose',
    ]),
  ],
  kettlebell: [
    workout('Kettlebell A', 'mixed', [
      'exercise-goblet-squat',
      'exercise-kettlebell-swing',
      'exercise-push-up',
      'exercise-plank',
    ]),
    workout('Kettlebell B', 'conditioning', [
      'exercise-kettlebell-swing',
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-dead-bug',
    ]),
    workout('Kettlebell C', 'mixed', [
      'exercise-goblet-squat',
      'exercise-kettlebell-swing',
      'exercise-single-leg-balance',
      'exercise-plank',
    ]),
  ],
  'express-20': [
    workout('Express A', 'mixed', [
      'exercise-split-squat',
      'exercise-push-up',
      'exercise-plank',
    ]),
    workout('Express B', 'conditioning', [
      'exercise-easy-run',
      'exercise-walking-lunge',
      'exercise-dead-bug',
    ]),
    workout('Express C', 'mixed', [
      'exercise-reverse-lunge',
      'exercise-push-up',
      'exercise-single-leg-balance',
    ]),
    workout('Express D', 'mobility', [
      'exercise-hip-flexor-stretch',
      'exercise-thoracic-rotation',
      'exercise-childs-pose',
    ]),
  ],
  'three-day-gym': [
    workout('Gym A', 'strength', [
      'exercise-split-squat',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
    workout('Gym B', 'strength', [
      'exercise-reverse-lunge',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
      'exercise-dead-bug',
    ]),
    workout('Gym C', 'strength', [
      'exercise-walking-lunge',
      'exercise-floor-press',
      'exercise-farmer-carry',
      'exercise-plank',
    ]),
  ],
  'four-day-gym': [
    workout('Upper A', 'strength', [
      'exercise-incline-dumbbell-press',
      'exercise-one-arm-dumbbell-row',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
    ]),
    workout('Lower A', 'strength', [
      'exercise-split-squat',
      'exercise-reverse-lunge',
      'exercise-standing-calf-raise',
      'exercise-plank',
    ]),
    workout('Upper B', 'strength', [
      'exercise-floor-press',
      'exercise-one-arm-dumbbell-row',
      'exercise-lateral-raise',
      'exercise-biceps-curl',
    ]),
    workout('Lower B', 'strength', [
      'exercise-walking-lunge',
      'exercise-split-squat',
      'exercise-standing-calf-raise',
      'exercise-dead-bug',
    ]),
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

const scheduleByDays = {
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
} as const;

export function buildLaunchProgramVersion(program: Program): ProgramVersion | undefined {
  const plans = launchPlans[program.slug];
  if (!plans) return undefined;

  const schedule = scheduleByDays[program.daysPerWeek as keyof typeof scheduleByDays];
  if (!schedule || schedule.length !== plans.length) return undefined;

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
    workouts: plans.map((plan, index) =>
      buildWorkout(program, versionId, plan, schedule[index] ?? index + 1, index),
    ),
    progressionRuleIds: [`rule-default-${program.progressionStrategy}`],
    createdAt,
  };
}

function workout(
  title: string,
  focus: Workout['focus'],
  exerciseIds: readonly string[],
): WorkoutPlan {
  return { title, focus, exerciseIds };
}

function buildWorkout(
  program: Program,
  versionId: string,
  plan: WorkoutPlan,
  dayOfWeek: number,
  workoutIndex: number,
): Workout {
  const workoutId = `workout-${program.slug}-${workoutIndex + 1}`;
  const exercises = plan.exerciseIds.map((exerciseId, exerciseIndex) =>
    buildWorkoutExercise(workoutId, exerciseId, exerciseIndex),
  );

  return {
    id: workoutId,
    programVersionId: versionId,
    title: plan.title,
    dayOfWeek,
    focus: plan.focus,
    estimatedDurationMinutes: program.sessionLengthMinutes,
    equipmentIds: unique(
      exercises.flatMap((exercise) => equipmentByExerciseId.get(exercise.exerciseId) ?? []),
    ),
    exercises,
  };
}

function buildWorkoutExercise(
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
      exerciseId === 'exercise-easy-run'
        ? 'cardio'
        : mobilityExerciseIds.has(exerciseId)
          ? 'mobility'
          : 'working',
    sets: prescription(id, exerciseId),
  };
}

function prescription(prefix: string, exerciseId: string): WorkoutExercise['sets'] {
  if (exerciseId === 'exercise-easy-run') {
    return targetSets(prefix, 1, { durationSeconds: 600 }, 60);
  }
  if (exerciseId === 'exercise-farmer-carry') {
    return targetSets(prefix, 3, { distanceMeters: 40 }, 60);
  }
  if (timedExerciseIds.has(exerciseId)) {
    const durationSeconds = exerciseId === 'exercise-childs-pose' ? 60 : 30;
    return targetSets(prefix, 2, { durationSeconds }, 30);
  }
  if (mobilityExerciseIds.has(exerciseId) || exerciseId === 'exercise-dead-bug') {
    return targetSets(prefix, 2, { reps: { min: 6, max: 10 } }, 30);
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
    default:
      return 'consolidation';
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
