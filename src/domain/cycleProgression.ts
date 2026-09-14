import { buildNextSessionTargets } from './nextSession';
import type { ProgressSetInput } from './progress';
import type { ProgressionAction } from './progression';
import type { Program, ProgramVersion, SetTarget, UnitSystem, WorkoutExercise } from './types';

export interface CycleProgressionChange {
  workoutId: string;
  workoutTitle: string;
  workoutExerciseId: string;
  exerciseId: string;
  from: SetTarget;
  to: SetTarget;
  action: ProgressionAction;
  reason: string;
}

export interface CycleProgressionResult {
  version: ProgramVersion;
  changes: CycleProgressionChange[];
  performanceSetCount: number;
}

/**
 * Build a private next-cycle version from completed, comparable performance.
 *
 * Only ordinary target changes returned by the deterministic progression
 * engine are applied. Volume, density, and skill decisions remain review items
 * because those decisions already require explicit confirmation. Missing data,
 * limited readiness, and discomfort hold the source prescription.
 */
export function buildCycleProgressionCopy(
  program: Pick<Program, 'progressionStrategy'>,
  sourceVersion: ProgramVersion,
  priorSets: readonly ProgressSetInput[],
  unitSystem: UnitSystem,
): CycleProgressionResult {
  const setsByExercise = new Map<string, ProgressSetInput[]>();
  for (const set of priorSets) {
    const exerciseSets = setsByExercise.get(set.exerciseId) ?? [];
    exerciseSets.push(set);
    setsByExercise.set(set.exerciseId, exerciseSets);
  }

  const changes: CycleProgressionChange[] = [];
  const workouts = sourceVersion.workouts.map((workout) => ({
    ...workout,
    equipmentIds: [...workout.equipmentIds],
    exercises: workout.exercises.map((workoutExercise) => {
      const sourceWorkoutId = workout.sourceWorkoutId ?? workout.id;
      const performance = (setsByExercise.get(workoutExercise.exerciseId) ?? []).filter(
        (set) => set.workoutId === undefined || set.workoutId === sourceWorkoutId,
      );
      const clonedExercise = cloneWorkoutExercise(workoutExercise);
      if (performance.length === 0 || hasSafetyHold(performance)) return clonedExercise;

      const syntheticSets = performance.map((set, index) => ({
        id: `cycle-progress-${sourceVersion.id}-${workoutExercise.id}-${index + 1}`,
        sessionId: set.sessionId,
        workoutExerciseId: workoutExercise.id,
        exerciseId: workoutExercise.exerciseId,
        setNumber: index + 1,
        load: set.load,
        reps: set.reps,
        durationSeconds: set.durationSeconds,
        distanceMeters: set.distanceMeters,
        completedAt: set.completedAt,
        idempotencyKey: `cycle-progress:${sourceVersion.id}:${workoutExercise.id}:${index + 1}`,
      }));
      const targetResult = buildNextSessionTargets(
        workout,
        program.progressionStrategy,
        syntheticSets,
        unitSystem,
        undefined,
        sourceVersion.progressionRuleIds,
      ).find((candidate) => candidate.workoutExerciseId === workoutExercise.id);

      if (
        !targetResult ||
        targetResult.decision.action === 'hold' ||
        targetResult.decision.requiresUserConfirmation ||
        targetsEqual(targetResult.currentTarget, targetResult.decision.nextTarget)
      ) {
        return clonedExercise;
      }

      const nextTarget = cloneTarget(targetResult.decision.nextTarget);
      changes.push({
        workoutId: workout.id,
        workoutTitle: workout.title,
        workoutExerciseId: workoutExercise.id,
        exerciseId: workoutExercise.exerciseId,
        from: cloneTarget(targetResult.currentTarget),
        to: nextTarget,
        action: targetResult.decision.action,
        reason: targetResult.decision.reason,
      });

      return {
        ...clonedExercise,
        sets: clonedExercise.sets.map((set) => ({
          ...set,
          target: cloneTarget(nextTarget),
        })),
      };
    }),
  }));

  return {
    version: { ...sourceVersion, workouts },
    changes,
    performanceSetCount: priorSets.length,
  };
}

function hasSafetyHold(sets: readonly ProgressSetInput[]): boolean {
  return sets.some(
    (set) => set.discomfortFlag === true || set.readiness === 'limited' || set.readiness === 'rest',
  );
}

function cloneWorkoutExercise(workoutExercise: WorkoutExercise): WorkoutExercise {
  return {
    ...workoutExercise,
    sets: workoutExercise.sets.map((set) => ({
      ...set,
      target: cloneTarget(set.target),
    })),
  };
}

function targetsEqual(left: SetTarget, right: SetTarget): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneTarget(target: SetTarget): SetTarget {
  return {
    ...target,
    reps: typeof target.reps === 'object' ? { ...target.reps } : target.reps,
    load: target.load ? { ...target.load } : undefined,
  };
}
