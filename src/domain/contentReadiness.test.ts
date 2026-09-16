import { assessExerciseContent, assessProgramVersion } from './contentReadiness';
import { foundationalExercises } from './fixtures/exercises';
import { demoProgram, demoProgramVersion } from './fixtures/home';
import type { Exercise, ExerciseMedia } from './types';

const reviewedAt = '2026-09-16T12:00:00.000Z';

function reviewedExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    ...foundationalExercises[0]!,
    contentStatus: 'reviewed',
    reviewedAt,
    ...overrides,
  };
}

function approvedMedia(overrides: Partial<ExerciseMedia> = {}): ExerciseMedia {
  return {
    id: 'media-1',
    type: 'image',
    uri: 'https://media.example/exercise.png',
    altText: 'Athlete demonstrating the exercise setup.',
    reviewStatus: 'approved',
    provenance: {
      sourceKind: 'original',
      sourceLabel: 'SHIFT6 original media',
      rightsConfirmedAt: reviewedAt,
      techniqueReviewedAt: reviewedAt,
    },
    ...overrides,
  };
}

describe('content readiness', () => {
  it('keeps structurally complete draft exercises runnable but not publication-ready', () => {
    const report = assessExerciseContent(foundationalExercises[0]!);

    expect(report.readyForCycle).toBe(true);
    expect(report.readyForPublication).toBe(false);
    expect(report.blockers).toEqual([]);
    expect(report.reviewWarnings[0]).toContain('human technique review is pending');
  });

  it('allows reviewed public exercises to publish without media', () => {
    const report = assessExerciseContent(reviewedExercise());

    expect(report.readyForCycle).toBe(true);
    expect(report.readyForPublication).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.reviewWarnings).toEqual([]);
  });

  it('requires muscle, equipment, instruction, cue and safety metadata for runnable exercises', () => {
    const report = assessExerciseContent(
      reviewedExercise({
        primaryMuscles: [],
        equipmentIds: [],
        instructions: [],
        techniqueCues: [],
        safetyNotes: [],
      }),
    );

    expect(report.readyForCycle).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        'Back squat: at least one primary muscle is required.',
        'Back squat: at least one equipment requirement is required.',
        'Back squat: at least one instruction is required.',
        'Back squat: at least one technique cue is required.',
        'Back squat: safety notes are required.',
      ]),
    );
  });

  it('requires common-mistake guidance before a public exercise can publish', () => {
    const report = assessExerciseContent(reviewedExercise({ commonMistakes: [] }));

    expect(report.readyForCycle).toBe(true);
    expect(report.readyForPublication).toBe(false);
    expect(report.reviewWarnings).toContain(
      'Back squat: public records need common-mistake guidance.',
    );
  });

  it('keeps custom exercises private even if their record is otherwise reviewed', () => {
    const report = assessExerciseContent(reviewedExercise({ isCustom: true }));

    expect(report.readyForCycle).toBe(true);
    expect(report.readyForPublication).toBe(false);
    expect(report.reviewWarnings).toContain('Back squat: custom exercises stay private by default.');
  });

  it('requires provenance before approved media can publish', () => {
    const report = assessExerciseContent(
      reviewedExercise({ media: [approvedMedia({ provenance: undefined })] }),
    );

    expect(report.readyForCycle).toBe(true);
    expect(report.readyForPublication).toBe(false);
    expect(report.reviewWarnings).toContain(
      'Back squat: approved media media-1 needs provenance metadata.',
    );
  });

  it('requires human technique review for generated media even after rights are confirmed', () => {
    const report = assessExerciseContent(
      reviewedExercise({
        media: [
          approvedMedia({
            provenance: {
              sourceKind: 'generated',
              sourceLabel: 'Internal image generator',
              rightsConfirmedAt: reviewedAt,
            },
          }),
        ],
      }),
    );

    expect(report.readyForCycle).toBe(true);
    expect(report.readyForPublication).toBe(false);
    expect(report.reviewWarnings).toContain(
      'Back squat: generated media media-1 needs human technique review.',
    );
  });

  it('allows generated media only after explicit human technique review', () => {
    const report = assessExerciseContent(
      reviewedExercise({
        media: [
          approvedMedia({
            provenance: {
              sourceKind: 'generated',
              sourceLabel: 'Internal image generator',
              rightsConfirmedAt: reviewedAt,
              techniqueReviewedAt: reviewedAt,
            },
          }),
        ],
      }),
    );

    expect(report.readyForCycle).toBe(true);
    expect(report.readyForPublication).toBe(true);
    expect(report.reviewWarnings).toEqual([]);
  });

  it('requires source and licence metadata for licensed approved media', () => {
    const report = assessExerciseContent(
      reviewedExercise({
        media: [
          approvedMedia({
            provenance: {
              sourceKind: 'licensed',
              sourceLabel: 'Licensed exercise library',
              rightsConfirmedAt: reviewedAt,
            },
          }),
        ],
      }),
    );

    expect(report.readyForPublication).toBe(false);
    expect(report.reviewWarnings).toEqual(
      expect.arrayContaining([
        'Back squat: licensed media media-1 needs a source URI.',
        'Back squat: licensed media media-1 needs licence metadata.',
      ]),
    );
  });

  it('requires reviewed records before a public program version is publication-ready', () => {
    const report = assessProgramVersion(demoProgram, demoProgramVersion, foundationalExercises);

    expect(report.readyForCycle).toBe(true);
    expect(report.readyForPublication).toBe(false);
    expect(report.blockers).toEqual([]);
    expect(report.reviewWarnings.length).toBeGreaterThan(0);
  });

  it('blocks missing exercise references and invalid six-week structure', () => {
    const report = assessProgramVersion(
      demoProgram,
      {
        ...demoProgramVersion,
        cycleModel: { ...demoProgramVersion.cycleModel, phases: { 1: 'Only one week' } },
        workouts: [
          {
            ...demoProgramVersion.workouts[0]!,
            exercises: [
              {
                ...demoProgramVersion.workouts[0]!.exercises[0]!,
                exerciseId: 'exercise-missing',
              },
            ],
          },
        ],
      },
      foundationalExercises,
    );

    expect(report.readyForCycle).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        'Week 2 needs a named cycle phase.',
        'Workout count must match the program weekly schedule.',
        'Strength A: exercise exercise-missing is missing.',
      ]),
    );
  });
});
