import { declaredLoad, systemForLoadUnit, loadUnitForSystem } from './loadUnits';
import type {
  CompletedSet,
  EntityId,
  ProgressionStrategy,
  SetTarget,
  UnitSystem,
  Workout,
  WorkoutReadiness,
} from './types';
import { calculateNextTarget, type ProgressionDecision, type ReadinessInput } from './progression';
import { resolveProgressionParameters } from './progressionRules';

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
  progressionRuleIds: readonly EntityId[] = [],
): NextSessionTarget[] {
  return workout.exercises.map((workoutExercise) => {
    const exerciseSets = completedSets.filter(
      (completedSet) =>
        completedSet.workoutExerciseId === workoutExercise.id &&
        (completedSet.exerciseId === undefined ||
          completedSet.exerciseId === workoutExercise.exerciseId),
    );
    const latestMeasured = [...exerciseSets]
      .reverse()
      .find((set) => declaredLoad(set.load, set.loadUnit) !== undefined);
    const sourceTarget = workoutExercise.sets[0]?.target ?? {};
    const targetSystem =
      sourceTarget.load?.unit ??
      (latestMeasured?.loadUnit ? systemForLoadUnit(latestMeasured.loadUnit) : unitSystem);
    const latestLoad = latestMeasured
      ? declaredLoad(latestMeasured.load, latestMeasured.loadUnit, loadUnitForSystem(targetSystem))
      : undefined;
    const currentTarget = withObservedLoad(sourceTarget, latestLoad, targetSystem);
    const effectiveStrategy = progressionStrategyForTarget(progressionStrategy, currentTarget);
    const progressionParameters = resolveProgressionParameters(
      progressionRuleIds,
      effectiveStrategy,
      // Explicit prescription units own numeric increments. Profile units are
      // presentation preferences and cannot reinterpret imported kg/lb targets.
      currentTarget.load?.unit ?? unitSystem,
    );

    const missingLoadProvenance = exerciseSets.some(
      (set) => set.load !== undefined && declaredLoad(set.load, set.loadUnit) === undefined,
    );
    const nonComparableLoad = exerciseSets.some((set) => {
      const prescription =
        workoutExercise.sets.find((candidate) => candidate.setNumber === set.setNumber)?.target
          .load ?? sourceTarget.load;
      if (prescription?.value === undefined) return false;
      const observed = declaredLoad(set.load, set.loadUnit, loadUnitForSystem(prescription.unit));
      const floatingTolerance = Math.max(1, Math.abs(prescription.value)) * Number.EPSILON * 8;
      return observed === undefined || observed + floatingTolerance < prescription.value;
    });
    const decision = calculateNextTarget({
      strategy: effectiveStrategy,
      currentTarget,
      completedSets: exerciseSets.map((completedSet) => ({
        completed: true,
        load: declaredLoad(
          completedSet.load,
          completedSet.loadUnit,
          loadUnitForSystem(targetSystem),
        ),
        reps: completedSet.reps,
        durationSeconds: completedSet.durationSeconds,
        distanceMeters: completedSet.distanceMeters,
        rpe: completedSet.rpe,
        rir: completedSet.rir,
      })),
      readiness,
      loadIncrement: progressionParameters.loadIncrement,
      durationIncrementSeconds: progressionParameters.durationIncrementSeconds,
      distanceIncrementMeters: progressionParameters.distanceIncrementMeters,
      totalRepTarget: progressionParameters.totalRepTarget,
      skillReady: progressionParameters.skillReady,
    });

    if (
      (missingLoadProvenance || nonComparableLoad) &&
      !['time', 'distance', 'cardio'].includes(effectiveStrategy)
    ) {
      decision.action = 'hold';
      decision.nextTarget = cloneTarget(sourceTarget);
      decision.reason = missingLoadProvenance
        ? 'Actual load units are unknown. Keep the prescription until comparable declared measurements are available.'
        : 'The prescribed load has no comparable completed measurement. Keep the prescription until it is explicitly measured at the prescribed load.';
      decision.requiresUserConfirmation = false;
      delete decision.setCountDelta;
      delete decision.densitySecondsDelta;
    }

    return {
      workoutExerciseId: workoutExercise.id,
      exerciseId: workoutExercise.exerciseId,
      currentTarget,
      decision,
    };
  });
}

export function progressionStrategyForTarget(
  programStrategy: ProgressionStrategy,
  target: SetTarget,
): ProgressionStrategy {
  if (
    programStrategy === 'volume' ||
    programStrategy === 'density' ||
    programStrategy === 'skill'
  ) {
    return programStrategy;
  }

  if (target.durationSeconds !== undefined && target.distanceMeters !== undefined) return 'cardio';
  if (target.durationSeconds !== undefined) return 'time';
  if (target.distanceMeters !== undefined) return 'distance';

  if (
    target.reps !== undefined &&
    (programStrategy === 'cardio' || programStrategy === 'time' || programStrategy === 'distance')
  ) {
    return 'double-progression';
  }

  return programStrategy;
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
