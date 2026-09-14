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
  const plannedWorkoutCount = programVersion.workouts.length;
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
