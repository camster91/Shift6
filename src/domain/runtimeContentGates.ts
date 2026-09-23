import { focusedReleaseManifest } from './focusedRelease';
import { assessExerciseContent, assessProgramVersion } from './contentReadiness';
import { foundationalExercises } from './fixtures/exercises';
import {
  programContentReviewEvidence,
  type ProgramContentReviewEvidence,
} from './programContentReview';
import type { ProgramCatalogueEntry } from './programLibrary';
import type { Exercise } from './types';

export interface RuntimeProgramGateOptions {
  exercises?: readonly Exercise[];
  reviews?: readonly ProgramContentReviewEvidence[];
  enabledProgramIds?: readonly string[];
}

export interface RuntimeProgramReadiness {
  hasExecutableVersion: boolean;
  exerciseContentReady: boolean;
  fitnessContentReviewed: boolean;
  readyForPublication: boolean;
  blockers: string[];
}

export function isExerciseAvailableToUser(
  exercise: Exercise,
  allowDraftPreview = false,
  enabledExerciseIds: readonly string[] = focusedReleaseManifest.enabledExerciseIds,
): boolean {
  if (exercise.isCustom) return true;
  if (exercise.contentStatus === 'retired') return false;
  if (allowDraftPreview) return true;
  return (
    enabledExerciseIds.includes(exercise.id) && assessExerciseContent(exercise).readyForPublication
  );
}

export function getProgramRuntimeReadiness(
  entry: ProgramCatalogueEntry,
  options: RuntimeProgramGateOptions = {},
): RuntimeProgramReadiness {
  const exercises = options.exercises ?? foundationalExercises;
  const reviews = options.reviews ?? programContentReviewEvidence;
  const hasExecutableVersion = entry.version !== undefined;
  const blockers: string[] = [];

  if (!entry.version) {
    blockers.push('Executable program version is missing.');
    return {
      hasExecutableVersion,
      exerciseContentReady: false,
      fitnessContentReviewed: false,
      readyForPublication: false,
      blockers,
    };
  }

  const versionReadiness = assessProgramVersion(entry.program, entry.version, exercises);
  const exerciseContentReady = versionReadiness.readyForPublication;
  if (!exerciseContentReady) {
    blockers.push(...versionReadiness.blockers, ...versionReadiness.reviewWarnings);
  }

  const review = reviews.find(
    (candidate) =>
      candidate.programId === entry.program.id &&
      candidate.reviewedAt.trim().length > 0 &&
      candidate.reviewReference.trim().length > 0,
  );
  const fitnessContentReviewed = review !== undefined;
  if (!fitnessContentReviewed) {
    blockers.push('Fitness-content review evidence is missing.');
  }

  return {
    hasExecutableVersion,
    exerciseContentReady,
    fitnessContentReviewed,
    readyForPublication: exerciseContentReady && fitnessContentReviewed,
    blockers: [...new Set(blockers)],
  };
}

export function isProgramStartAllowed(
  entry: ProgramCatalogueEntry,
  allowDraftPreview = false,
  options: RuntimeProgramGateOptions = {},
): boolean {
  const readiness = getProgramRuntimeReadiness(entry, options);
  if (
    readiness.readyForPublication &&
    (options.enabledProgramIds ?? focusedReleaseManifest.enabledProgramIds).includes(
      entry.program.id,
    )
  )
    return true;
  return allowDraftPreview && readiness.hasExecutableVersion;
}

export function getProgramRuntimeStatusLabel(
  entry: ProgramCatalogueEntry,
  allowDraftPreview = false,
  options: RuntimeProgramGateOptions = {},
): string {
  const readiness = getProgramRuntimeReadiness(entry, options);
  if (
    readiness.readyForPublication &&
    (options.enabledProgramIds ?? focusedReleaseManifest.enabledProgramIds).includes(
      entry.program.id,
    )
  )
    return 'Ready to start';
  if (allowDraftPreview && readiness.hasExecutableVersion) return 'Draft preview';
  return 'Content in review';
}
