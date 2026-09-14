import type {
  CompletedSet,
  ProgressionStrategy,
  SetTarget,
  UnitSystem,
  Workout,
  WorkoutReadiness,
} from './types';
import { calculateNextTarget, type ProgressionDecision, type ReadinessInput } from './progression';

export interface NextSessionTarget {
  workoutExerciseId: string;
  exerciseId: string;
  currentTarget: SetTarget;
  decision: ProgressionDecision;
}

const normalReadiness: ReadinessInput = {
  energy: 4,
  soreness: 2,
  sleepQuality: 4,
  timeAvailableMinutes: 30,
  discomfort: false,
};

export function readinessInputForWorkout(
  readiness: WorkoutReadiness | null | undefined,
): ReadinessInput {
  switch (readiness) {
    case 'limited':
      return {
        energy: 2,
        soreness: 3,
        sleepQuality: 3,
        timeAvailableMinutes: 30,
        discomfort: false,
      };
    case 'rest':
      return {
        energy: 1,
        soreness: 5,
        sleepQuality: 2,
        timeAvailableMinutes: 30,
        discomfort: false,
      };
    case 'ready':
    case null:
    case undefined:
      return normalReadiness;
  }
}

export function buildNextSessionTargets(
  workout: Workout,
  progressionStrategy: ProgressionStrategy,
  completedSets: readonly CompletedSet[],
  unitSystem: UnitSystem,
  readiness: ReadinessInput = normalReadiness,
): NextSessionTarget[] {
  return workout.exercises.map((workoutExercise) => {
    const exerciseSets = completedSets.filter(
      (completedSet) =>
        completedSet.workoutExerciseId === workoutExercise.id &&
        (completedSet.exerciseId === undefined ||
          completedSet.exerciseId === workoutExercise.exerciseId),
    );
    const latestLoad = [...exerciseSets]
      .reverse()
      .find((completedSet) => completedSet.load !== undefined)?.load;
    const currentTarget = withObservedLoad(
      workoutExercise.sets[0]?.target ?? {},
      latestLoad,
      unitSystem,
    );

    const decision = calculateNextTarget({
      strategy: progressionStrategy,
      currentTarget,
      completedSets: exerciseSets.map((completedSet) => ({
        completed: true,
        load: completedSet.load,
        reps: completedSet.reps,
        durationSeconds: completedSet.durationSeconds,
        distanceMeters: completedSet.distanceMeters,
        rpe: completedSet.rpe,
        rir: completedSet.rir,
      })),
      readiness,
      loadIncrement: 5,
      durationIncrementSeconds: 60,
      distanceIncrementMeters: 250,
    });

    return {
      workoutExerciseId: workoutExercise.id,
      exerciseId: workoutExercise.exerciseId,
      currentTarget,
      decision,
    };
  });
}

function withObservedLoad(
  target: SetTarget,
  observedLoad: number | undefined,
  unitSystem: UnitSystem,
): SetTarget {
  if (target.load || observedLoad === undefined) return cloneTarget(target);

  return {
    ...cloneTarget(target),
    load: { value: observedLoad, unit: unitSystem },
  };
}

function cloneTarget(target: SetTarget): SetTarget {
  return {
    ...target,
    reps: typeof target.reps === 'object' ? { ...target.reps } : target.reps,
    load: target.load ? { ...target.load } : undefined,
  };
}
