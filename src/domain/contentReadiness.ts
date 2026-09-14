import type { Exercise, Program, ProgramVersion } from './types';

export interface ContentReadinessReport {
  readyForCycle: boolean;
  readyForPublication: boolean;
  blockers: string[];
  reviewWarnings: string[];
}

export function assessExerciseContent(exercise: Exercise): ContentReadinessReport {
  const blockers: string[] = [];
  const reviewWarnings: string[] = [];

  if (!exercise.id.trim()) blockers.push('Exercise ID is required.');
  if (!exercise.name.trim()) blockers.push('Exercise name is required.');
  if (!exercise.setup.trim()) blockers.push(`${exercise.name}: setup is required.`);
  if (exercise.instructions.length === 0) {
    blockers.push(`${exercise.name}: at least one instruction is required.`);
  }
  if (exercise.techniqueCues.length === 0) {
    blockers.push(`${exercise.name}: at least one technique cue is required.`);
  }
  if (exercise.safetyNotes.length === 0) {
    blockers.push(`${exercise.name}: safety notes are required.`);
  }
  if (exercise.contentStatus === 'retired') {
    blockers.push(`${exercise.name}: retired exercises cannot be published.`);
  }

  if (exercise.contentStatus === 'draft') {
    reviewWarnings.push(`${exercise.name}: human technique review is pending.`);
  }
  if (exercise.contentStatus === 'reviewed' && !exercise.reviewedAt) {
    reviewWarnings.push(`${exercise.name}: reviewed records need a review timestamp.`);
  }
  if (exercise.media.some((media) => media.reviewStatus !== 'approved')) {
    reviewWarnings.push(`${exercise.name}: media approval is pending.`);
  }

  return report(blockers, reviewWarnings);
}

export function assessProgramVersion(
  program: Program,
  version: ProgramVersion,
  exercises: readonly Exercise[],
): ContentReadinessReport {
  const blockers: string[] = [];
  const reviewWarnings: string[] = [];

  if (version.programId !== program.id) {
    blockers.push('Program version must reference its owning program.');
  }
  if (version.cycleModel.lengthWeeks !== 6) {
    blockers.push('SHIFT6 program versions must define a six-week cycle.');
  }
  for (let week = 1; week <= 6; week += 1) {
    if (!version.cycleModel.phases[week]?.trim()) {
      blockers.push(`Week ${week} needs a named cycle phase.`);
    }
  }
  if (version.workouts.length !== program.daysPerWeek) {
    blockers.push('Workout count must match the program weekly schedule.');
  }
  if (version.workouts.length === 0) blockers.push('A program version needs at least one workout.');

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  version.workouts.forEach((workout) => {
    if (workout.programVersionId !== version.id) {
      blockers.push(`${workout.title}: workout version ID is out of date.`);
    }
    if (workout.exercises.length === 0) {
      blockers.push(`${workout.title}: at least one movement is required.`);
    }

    workout.exercises.forEach((workoutExercise) => {
      if (workoutExercise.sets.length === 0) {
        blockers.push(`${workout.title}: every movement needs at least one set.`);
      }
      const exercise = exerciseById.get(workoutExercise.exerciseId);
      if (!exercise) {
        blockers.push(`${workout.title}: exercise ${workoutExercise.exerciseId} is missing.`);
        return;
      }

      const exerciseReport = assessExerciseContent(exercise);
      blockers.push(...exerciseReport.blockers);
      reviewWarnings.push(...exerciseReport.reviewWarnings);
    });
  });

  return report(blockers, reviewWarnings);
}

function report(blockers: string[], reviewWarnings: string[]): ContentReadinessReport {
  return {
    readyForCycle: blockers.length === 0,
    readyForPublication: blockers.length === 0 && reviewWarnings.length === 0,
    blockers: [...new Set(blockers)],
    reviewWarnings: [...new Set(reviewWarnings)],
  };
}
