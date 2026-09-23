import releaseManifest from '../../content/release-manifest.json';
import { assessExerciseContent, assessProgramVersion } from './contentReadiness';
import {
  programContentReviewEvidence,
  type ProgramContentReviewEvidence,
} from './programContentReview';
import type { ProgramCatalogueEntry } from './programLibrary';
import type { Exercise } from './types';

export const focusedReleaseManifest = releaseManifest;

export interface FocusedReleaseManifest {
  schemaVersion: number;
  enabledProgramIds: readonly string[];
  enabledExerciseIds: readonly string[];
}

export function assessFocusedReleaseContent(
  manifest: FocusedReleaseManifest,
  entries: readonly ProgramCatalogueEntry[],
  exercises: readonly Exercise[],
  reviews: readonly ProgramContentReviewEvidence[] = programContentReviewEvidence,
): string[] {
  const blockers: string[] = [];
  if (manifest.schemaVersion !== 1) blockers.push('Unsupported release manifest schema.');
  if (manifest.enabledProgramIds.length === 0)
    blockers.push('No reviewed Shift is enabled for release.');
  const uniquePrograms = new Set(manifest.enabledProgramIds);
  const uniqueExercises = new Set(manifest.enabledExerciseIds);
  if (uniquePrograms.size !== manifest.enabledProgramIds.length)
    blockers.push('Duplicate enabled program ID.');
  if (uniqueExercises.size !== manifest.enabledExerciseIds.length)
    blockers.push('Duplicate enabled exercise ID.');

  const programsById = new Map(entries.map((entry) => [entry.program.id, entry]));
  const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  for (const id of manifest.enabledProgramIds) {
    const entry = programsById.get(id);
    if (!entry?.version) {
      blockers.push(`Enabled Shift ${id} has no executable version.`);
      continue;
    }
    const review = reviews.filter(
      (candidate) =>
        candidate.programId === id &&
        candidate.reviewedAt.trim() &&
        candidate.reviewReference.trim(),
    );
    if (review.length !== 1)
      blockers.push(`Enabled Shift ${id} needs one traceable fitness-content review.`);
    const report = assessProgramVersion(entry.program, entry.version, exercises);
    blockers.push(...report.blockers.map((reason) => `${id}: ${reason}`));
    blockers.push(...report.reviewWarnings.map((reason) => `${id}: ${reason}`));
    for (const workout of entry.version.workouts) {
      for (const movement of workout.exercises) {
        if (!uniqueExercises.has(movement.exerciseId)) {
          blockers.push(
            `Enabled Shift ${id} references exercise ${movement.exerciseId} outside the release allowlist.`,
          );
        }
      }
    }
  }
  for (const id of manifest.enabledExerciseIds) {
    const exercise = exercisesById.get(id);
    if (!exercise || exercise.isCustom || !assessExerciseContent(exercise).readyForPublication) {
      blockers.push(`Enabled exercise ${id} lacks reviewed public content, safety or provenance.`);
    }
  }
  return [...new Set(blockers)];
}
