import type { ProgramVersion, TrainingCycle } from './types';

export interface CreateTrainingCycleInput {
  id: string;
  userId: string;
  programVersion: ProgramVersion;
  startedAt: string;
}

export function createTrainingCycle({
  id,
  userId,
  programVersion,
  startedAt,
}: CreateTrainingCycleInput): TrainingCycle {
  const plannedWorkoutCount = programVersion.workouts.filter(
    (workout) => !workout.isOptional,
  ).length;
  const weeks = Array.from({ length: programVersion.cycleModel.lengthWeeks }, (_, index) => {
    const weekNumber = index + 1;
    return {
      weekNumber,
      label: `Week ${weekNumber}`,
      phase: programVersion.cycleModel.phases[weekNumber] ?? 'Training',
      status: weekNumber === 1 ? ('current' as const) : ('upcoming' as const),
      completedWorkoutCount: 0,
      plannedWorkoutCount,
    };
  });

  return {
    id,
    userId,
    programVersionId: programVersion.id,
    status: 'active',
    currentWeek: 1,
    startedAt,
    weeks,
  };
}

export function advanceCycleAfterCompletedWorkout(
  cycle: TrainingCycle,
  completedWorkoutCountForCurrentWeek: number,
): TrainingCycle {
  if (cycle.status !== 'active') return cycle;

  const currentIndex = cycle.currentWeek - 1;
  const currentWeek = cycle.weeks[currentIndex];
  if (!currentWeek) return cycle;

  const completedWorkoutCount = Math.min(
    currentWeek.plannedWorkoutCount,
    Math.max(0, completedWorkoutCountForCurrentWeek),
  );
  const currentCompleted = completedWorkoutCount >= currentWeek.plannedWorkoutCount;
  const weeks = cycle.weeks.map((week, index) => {
    if (index === currentIndex) {
      return {
        ...week,
        completedWorkoutCount,
        status: currentCompleted ? ('completed' as const) : ('current' as const),
      };
    }
    return week;
  });

  if (!currentCompleted || currentIndex >= weeks.length - 1) {
    return {
      ...cycle,
      status: currentCompleted ? 'complete' : cycle.status,
      weeks,
    };
  }

  weeks[currentIndex + 1] = {
    ...weeks[currentIndex + 1]!,
    status: 'current',
  };

  return {
    ...cycle,
    currentWeek: cycle.currentWeek + 1,
    weeks,
  };
}
