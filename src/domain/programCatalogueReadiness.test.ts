import { foundationalExercises } from './fixtures/exercises';
import { programLibrary } from './programLibrary';
import { assessLaunchProgramCatalogue, LAUNCH_PROGRAM_TARGET } from './programCatalogueReadiness';
import type { ProgramContentReviewEvidence } from './programContentReview';
import type { Exercise } from './types';

const reviewedAt = '2026-09-16T12:00:00.000Z';

function reviewedExercises(): Exercise[] {
  return foundationalExercises.map((exercise) => ({
    ...exercise,
    contentStatus: 'reviewed' as const,
    reviewedAt,
  }));
}

function reviewEvidence(): ProgramContentReviewEvidence[] {
  return programLibrary.map((entry) => ({
    programId: entry.program.id,
    reviewedAt,
    reviewReference: `content-review/${entry.program.slug}`,
  }));
}

describe('launch program catalogue readiness', () => {
  it('reports all 20 programs as executable but not content-reviewed or publication-ready yet', () => {
    const report = assessLaunchProgramCatalogue(programLibrary, foundationalExercises);

    expect(report.targetCount).toBe(LAUNCH_PROGRAM_TARGET);
    expect(report.catalogueCount).toBe(20);
    expect(report.executableCount).toBe(20);
    expect(report.contentReviewedCount).toBe(0);
    expect(report.publicationReadyCount).toBe(0);
    expect(report.duplicateProgramIds).toEqual([]);
    expect(report.duplicateProgramSlugs).toEqual([]);
    expect(report.readyForLaunch).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        'Launch program catalogue needs at least 20 fitness-content reviews; found 0.',
        'Launch program catalogue needs at least 20 publication-ready versions; found 0.',
      ]),
    );
  });

  it('passes only when all 20 programs have traceable review evidence and reviewed exercise content', () => {
    const report = assessLaunchProgramCatalogue(
      programLibrary,
      reviewedExercises(),
      reviewEvidence(),
    );

    expect(report.catalogueCount).toBe(LAUNCH_PROGRAM_TARGET);
    expect(report.executableCount).toBe(LAUNCH_PROGRAM_TARGET);
    expect(report.contentReviewedCount).toBe(LAUNCH_PROGRAM_TARGET);
    expect(report.publicationReadyCount).toBe(LAUNCH_PROGRAM_TARGET);
    expect(report.readyForLaunch).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it('does not treat a review timestamp without a traceable review reference as complete', () => {
    const incompleteReviews = reviewEvidence().map((review, index) =>
      index === 0 ? { ...review, reviewReference: '' } : review,
    );
    const report = assessLaunchProgramCatalogue(
      programLibrary,
      reviewedExercises(),
      incompleteReviews,
    );

    expect(report.contentReviewedCount).toBe(LAUNCH_PROGRAM_TARGET - 1);
    expect(report.publicationReadyCount).toBe(LAUNCH_PROGRAM_TARGET - 1);
    expect(report.readyForLaunch).toBe(false);
  });

  it('blocks stale or duplicate program-review evidence', () => {
    const reviews = reviewEvidence();
    const report = assessLaunchProgramCatalogue(programLibrary, reviewedExercises(), [
      ...reviews,
      reviews[0]!,
      {
        programId: 'program-retired-example',
        reviewedAt,
        reviewReference: 'content-review/retired-example',
      },
    ]);

    expect(report.readyForLaunch).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        'Program content review references unknown program program-retired-example.',
        'Program content review evidence must be unique; duplicates: program-barbell-30.',
      ]),
    );
  });

  it('blocks missing launch metadata even when content-review evidence exists', () => {
    const brokenLibrary = programLibrary.map((entry, index) =>
      index === 0
        ? {
            ...entry,
            program: {
              ...entry.program,
              goals: [],
              targetUser: '',
              requiredEquipmentIds: [],
            },
          }
        : entry,
    );
    const report = assessLaunchProgramCatalogue(
      brokenLibrary,
      reviewedExercises(),
      reviewEvidence(),
    );

    expect(report.readyForLaunch).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        'Barbell 30: at least one goal is required.',
        'Barbell 30: target audience is required.',
        'Barbell 30: at least one required equipment item is needed.',
      ]),
    );
  });
});
