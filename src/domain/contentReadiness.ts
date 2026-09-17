import type { Exercise, Program, ProgramVersion } from './types';

export const EXERCISE_LAUNCH_TARGET = 300;

export interface ContentReadinessReport {
  readyForCycle: boolean;
  readyForPublication: boolean;
  blockers: string[];
  reviewWarnings: string[];
}

export interface ExerciseCatalogueReadinessReport {
  totalCount: number;
  draftCount: number;
  reviewedCount: number;
  retiredCount: number;
  publicationReadyCount: number;
  structuralBlockerCount: number;
  reviewedMissingProvenanceCount: number;
  mediaApprovalPendingCount: number;
  launchTarget: number;
  meetsLaunchTarget: boolean;
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
  if (exercise.contentStatus === 'reviewed' && !exercise.reviewedBy?.trim()) {
    reviewWarnings.push(`${exercise.name}: reviewed records need reviewer provenance.`);
  }
  if (exercise.media.some((media) => media.reviewStatus !== 'approved')) {
    reviewWarnings.push(`${exercise.name}: media approval is pending.`);
  }

  return report(blockers, reviewWarnings);
}

export function isExerciseAvailableToUser(
  exercise: Exercise,
  allowDraftPreview = false,
): boolean {
  if (exercise.contentStatus === 'retired') return false;
  if (exercise.isCustom) return true;
  return allowDraftPreview || assessExerciseContent(exercise).readyForPublication;
}

export function assessExerciseCatalogue(
  exercises: readonly Exercise[],
  launchTarget = EXERCISE_LAUNCH_TARGET,
): ExerciseCatalogueReadinessReport {
  if (!Number.isInteger(launchTarget) || launchTarget < 1) {
    throw new Error('Exercise launch target must be a positive integer.');
  }

  let draftCount = 0;
  let reviewedCount = 0;
  let retiredCount = 0;
  let publicationReadyCount = 0;
  let structuralBlockerCount = 0;
  let reviewedMissingProvenanceCount = 0;
  let mediaApprovalPendingCount = 0;

  exercises.forEach((exercise) => {
    if (exercise.contentStatus === 'draft') draftCount += 1;
    if (exercise.contentStatus === 'reviewed') reviewedCount += 1;
    if (exercise.contentStatus === 'retired') retiredCount += 1;

    const readiness = assessExerciseContent(exercise);
    if (readiness.readyForPublication) publicationReadyCount += 1;
    if (readiness.blockers.length > 0) structuralBlockerCount += 1;

    if (
      exercise.contentStatus === 'reviewed' &&
      (!exercise.reviewedAt || !exercise.reviewedBy?.trim())
    ) {
      reviewedMissingProvenanceCount += 1;
    }

    if (exercise.media.some((media) => media.reviewStatus !== 'approved')) {
      mediaApprovalPendingCount += 1;
    }
  });

  return {
    totalCount: exercises.length,
    draftCount,
    reviewedCount,
    retiredCount,
    publicationReadyCount,
    structuralBlockerCount,
    reviewedMissingProvenanceCount,
    mediaApprovalPendingCount,
    launchTarget,
    meetsLaunchTarget: publicationReadyCount >= launchTarget,
  };
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
  const requiredWorkoutCount = version.workouts.filter((workout) => !workout.isOptional).length;
  if (requiredWorkoutCount !== program.daysPerWeek) {
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
