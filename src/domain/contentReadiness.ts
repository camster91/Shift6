import type { ExerciseMediaProvenance } from './exerciseMediaProvenance';
import type { Exercise, ExerciseMedia, Program, ProgramVersion } from './types';

export const LAUNCH_EXERCISE_TARGET = 300;

export interface ContentReadinessReport {
  readyForCycle: boolean;
  readyForPublication: boolean;
  blockers: string[];
  reviewWarnings: string[];
}

export interface ExerciseCatalogueReadinessReport {
  targetCount: number;
  publicRecordCount: number;
  publicationReadyCount: number;
  duplicateIds: string[];
  readyForLaunch: boolean;
  blockers: string[];
}

export function assessExerciseContent(exercise: Exercise): ContentReadinessReport {
  const blockers: string[] = [];
  const reviewWarnings: string[] = [];

  if (!exercise.id.trim()) blockers.push('Exercise ID is required.');
  if (!exercise.name.trim()) blockers.push('Exercise name is required.');
  if (!exercise.setup.trim()) blockers.push(`${exercise.name}: setup is required.`);
  if (exercise.primaryMuscles.length === 0) {
    blockers.push(`${exercise.name}: at least one primary muscle is required.`);
  }
  if (exercise.equipmentIds.length === 0) {
    blockers.push(`${exercise.name}: at least one equipment requirement is required.`);
  }
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

  if (exercise.isCustom) {
    reviewWarnings.push(`${exercise.name}: custom exercises stay private by default.`);
  } else if (exercise.commonMistakes.length === 0) {
    reviewWarnings.push(`${exercise.name}: public records need common-mistake guidance.`);
  }

  if (exercise.contentStatus === 'draft') {
    reviewWarnings.push(`${exercise.name}: human technique review is pending.`);
  }
  if (exercise.contentStatus === 'reviewed' && !exercise.reviewedAt) {
    reviewWarnings.push(`${exercise.name}: reviewed records need a review timestamp.`);
  }

  exercise.media.forEach((media) => {
    reviewWarnings.push(...assessExerciseMediaForPublication(exercise.name, media));
  });

  return report(blockers, reviewWarnings);
}

export function assessExerciseCatalogue(
  exercises: readonly Exercise[],
  targetCount = LAUNCH_EXERCISE_TARGET,
): ExerciseCatalogueReadinessReport {
  if (!Number.isInteger(targetCount) || targetCount < 1) {
    throw new Error('Exercise catalogue target must be a positive whole number.');
  }

  const publicRecords = exercises.filter(
    (exercise) => !exercise.isCustom && exercise.contentStatus !== 'retired',
  );
  const publicationReadyCount = publicRecords.filter(
    (exercise) => assessExerciseContent(exercise).readyForPublication,
  ).length;
  const duplicateIds = findDuplicateExerciseIds(exercises);
  const blockers: string[] = [];

  if (publicRecords.length < targetCount) {
    blockers.push(
      `Launch exercise catalogue needs at least ${targetCount} public records; found ${publicRecords.length}.`,
    );
  }
  if (publicationReadyCount < targetCount) {
    blockers.push(
      `Launch exercise catalogue needs at least ${targetCount} publication-ready records; found ${publicationReadyCount}.`,
    );
  }
  if (duplicateIds.length > 0) {
    blockers.push(`Exercise IDs must be unique; duplicates: ${duplicateIds.join(', ')}.`);
  }

  return {
    targetCount,
    publicRecordCount: publicRecords.length,
    publicationReadyCount,
    duplicateIds,
    readyForLaunch: blockers.length === 0,
    blockers,
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

function assessExerciseMediaForPublication(exerciseName: string, media: ExerciseMedia): string[] {
  if (media.reviewStatus !== 'approved') {
    return [`${exerciseName}: media ${media.id} approval is pending.`];
  }

  const warnings: string[] = [];
  if (!media.uri.trim()) warnings.push(`${exerciseName}: approved media ${media.id} needs a URI.`);
  if (!media.altText.trim()) {
    warnings.push(`${exerciseName}: approved media ${media.id} needs alt text.`);
  }

  const provenance = media.provenance;
  if (!provenance) {
    warnings.push(`${exerciseName}: approved media ${media.id} needs provenance metadata.`);
    return warnings;
  }

  warnings.push(...assessMediaProvenance(exerciseName, media.id, provenance));
  return warnings;
}

function assessMediaProvenance(
  exerciseName: string,
  mediaId: string,
  provenance: ExerciseMediaProvenance,
): string[] {
  const warnings: string[] = [];

  if (!provenance.sourceLabel.trim()) {
    warnings.push(`${exerciseName}: approved media ${mediaId} needs a source label.`);
  }
  if (!provenance.rightsConfirmedAt) {
    warnings.push(`${exerciseName}: approved media ${mediaId} needs rights confirmation.`);
  }
  if (provenance.sourceKind === 'licensed') {
    if (!provenance.sourceUri?.trim()) {
      warnings.push(`${exerciseName}: licensed media ${mediaId} needs a source URI.`);
    }
    if (!provenance.license?.trim()) {
      warnings.push(`${exerciseName}: licensed media ${mediaId} needs licence metadata.`);
    }
  }
  if (provenance.sourceKind === 'generated' && !provenance.techniqueReviewedAt) {
    warnings.push(`${exerciseName}: generated media ${mediaId} needs human technique review.`);
  }

  return warnings;
}

function findDuplicateExerciseIds(exercises: readonly Exercise[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  exercises.forEach((exercise) => {
    if (seen.has(exercise.id)) duplicates.add(exercise.id);
    seen.add(exercise.id);
  });

  return [...duplicates].sort();
}

function report(blockers: string[], reviewWarnings: string[]): ContentReadinessReport {
  return {
    readyForCycle: blockers.length === 0,
    readyForPublication: blockers.length === 0 && reviewWarnings.length === 0,
    blockers: [...new Set(blockers)],
    reviewWarnings: [...new Set(reviewWarnings)],
  };
}
