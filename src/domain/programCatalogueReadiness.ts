import { assessProgramVersion } from './contentReadiness';
import type { ProgramCatalogueEntry } from './programLibrary';
import {
  programContentReviewEvidence,
  type ProgramContentReviewEvidence,
} from './programContentReview';
import type { Exercise } from './types';

export const LAUNCH_PROGRAM_TARGET = 20;

export interface ProgramCatalogueReadinessReport {
  targetCount: number;
  catalogueCount: number;
  executableCount: number;
  contentReviewedCount: number;
  publicationReadyCount: number;
  duplicateProgramIds: string[];
  duplicateProgramSlugs: string[];
  blockers: string[];
  readyForLaunch: boolean;
}

export function assessLaunchProgramCatalogue(
  entries: readonly ProgramCatalogueEntry[],
  exercises: readonly Exercise[],
  reviews: readonly ProgramContentReviewEvidence[] = programContentReviewEvidence,
  targetCount = LAUNCH_PROGRAM_TARGET,
): ProgramCatalogueReadinessReport {
  if (!Number.isInteger(targetCount) || targetCount < 1) {
    throw new Error('Program catalogue target must be a positive whole number.');
  }

  const blockers: string[] = [];
  const duplicateProgramIds = findDuplicates(entries.map((entry) => entry.program.id));
  const duplicateProgramSlugs = findDuplicates(entries.map((entry) => entry.program.slug));
  const reviewByProgramId = buildReviewMap(entries, reviews, blockers);
  let executableCount = 0;
  let contentReviewedCount = 0;
  let publicationReadyCount = 0;

  entries.forEach((entry) => {
    const metadataIssues = assessProgramMetadata(entry);
    blockers.push(...metadataIssues);

    if (entry.version) executableCount += 1;

    const review = reviewByProgramId.get(entry.program.id);
    const hasValidReview =
      review !== undefined &&
      review.programVersionId === entry.version?.id &&
      review.reviewedAt.trim().length > 0 &&
      review.reviewReference.trim().length > 0;
    if (hasValidReview) contentReviewedCount += 1;

    if (!entry.version || metadataIssues.length > 0 || !hasValidReview) return;

    const versionReadiness = assessProgramVersion(entry.program, entry.version, exercises);
    if (versionReadiness.readyForPublication) publicationReadyCount += 1;
  });

  if (entries.length < targetCount) {
    blockers.push(
      `Launch program catalogue needs at least ${targetCount} entries; found ${entries.length}.`,
    );
  }
  if (executableCount < targetCount) {
    blockers.push(
      `Launch program catalogue needs at least ${targetCount} executable versions; found ${executableCount}.`,
    );
  }
  if (contentReviewedCount < targetCount) {
    blockers.push(
      `Launch program catalogue needs at least ${targetCount} fitness-content reviews; found ${contentReviewedCount}.`,
    );
  }
  if (publicationReadyCount < targetCount) {
    blockers.push(
      `Launch program catalogue needs at least ${targetCount} publication-ready versions; found ${publicationReadyCount}.`,
    );
  }
  if (duplicateProgramIds.length > 0) {
    blockers.push(`Program IDs must be unique; duplicates: ${duplicateProgramIds.join(', ')}.`);
  }
  if (duplicateProgramSlugs.length > 0) {
    blockers.push(`Program slugs must be unique; duplicates: ${duplicateProgramSlugs.join(', ')}.`);
  }

  const uniqueBlockers = [...new Set(blockers)];
  return {
    targetCount,
    catalogueCount: entries.length,
    executableCount,
    contentReviewedCount,
    publicationReadyCount,
    duplicateProgramIds,
    duplicateProgramSlugs,
    blockers: uniqueBlockers,
    readyForLaunch: uniqueBlockers.length === 0,
  };
}

function assessProgramMetadata(entry: ProgramCatalogueEntry): string[] {
  const { program, version } = entry;
  const blockers: string[] = [];

  if (!program.id.trim()) blockers.push('Program ID is required.');
  if (!program.slug.trim()) blockers.push(`${program.title}: program slug is required.`);
  if (!program.title.trim()) blockers.push('Program title is required.');
  if (!program.description.trim()) blockers.push(`${program.title}: description is required.`);
  if (program.goals.length === 0) blockers.push(`${program.title}: at least one goal is required.`);
  if (!program.targetUser.trim()) blockers.push(`${program.title}: target audience is required.`);
  if (
    !Number.isInteger(program.daysPerWeek) ||
    program.daysPerWeek < 1 ||
    program.daysPerWeek > 7
  ) {
    blockers.push(`${program.title}: days per week must be between 1 and 7.`);
  }
  if (!Number.isInteger(program.sessionLengthMinutes) || program.sessionLengthMinutes < 1) {
    blockers.push(`${program.title}: session duration must be a positive whole number.`);
  }
  if (program.requiredEquipmentIds.length === 0) {
    blockers.push(`${program.title}: at least one required equipment item is needed.`);
  }
  if (!program.progressionStrategy) {
    blockers.push(`${program.title}: progression strategy is required.`);
  }
  if (!version) {
    blockers.push(`${program.title}: executable program version is missing.`);
  } else if (program.currentVersionId !== version.id) {
    blockers.push(
      `${program.title}: current version identifier does not match the executable version.`,
    );
  }

  return blockers;
}

function buildReviewMap(
  entries: readonly ProgramCatalogueEntry[],
  reviews: readonly ProgramContentReviewEvidence[],
  blockers: string[],
): Map<string, ProgramContentReviewEvidence> {
  const knownProgramIds = new Set(entries.map((entry) => entry.program.id));
  const reviewMap = new Map<string, ProgramContentReviewEvidence>();
  const duplicateReviewIds = new Set<string>();

  reviews.forEach((review) => {
    if (!knownProgramIds.has(review.programId)) {
      blockers.push(`Program content review references unknown program ${review.programId}.`);
      return;
    }
    if (reviewMap.has(review.programId)) duplicateReviewIds.add(review.programId);
    reviewMap.set(review.programId, review);
  });

  if (duplicateReviewIds.size > 0) {
    blockers.push(
      `Program content review evidence must be unique; duplicates: ${[...duplicateReviewIds]
        .sort()
        .join(', ')}.`,
    );
  }

  return reviewMap;
}

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });

  return [...duplicates].sort();
}
