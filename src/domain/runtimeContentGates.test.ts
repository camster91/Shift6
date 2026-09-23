import { foundationalExercises } from './fixtures/exercises';
import { programLibrary } from './programLibrary';
import {
  getProgramRuntimeReadiness,
  getProgramRuntimeStatusLabel,
  isExerciseAvailableToUser,
  isProgramStartAllowed,
} from './runtimeContentGates';

describe('runtime content release gates', () => {
  it('hides unreviewed public exercises in production while allowing development preview', () => {
    const exercise = foundationalExercises[0]!;

    expect(isExerciseAvailableToUser(exercise, false)).toBe(false);
    expect(isExerciseAvailableToUser(exercise, true)).toBe(true);
  });

  it('keeps private custom exercises available without promoting them to public content', () => {
    const customExercise = {
      ...foundationalExercises[0]!,
      id: 'exercise-private-custom',
      isCustom: true,
      contentStatus: 'draft' as const,
    };

    expect(isExerciseAvailableToUser(customExercise, false)).toBe(true);
  });

  it('fails closed for launch programs without exercise and fitness-review evidence', () => {
    const barbell30 = programLibrary.find((entry) => entry.program.slug === 'barbell-30')!;

    const readiness = getProgramRuntimeReadiness(barbell30);
    expect(readiness.readyForPublication).toBe(false);
    expect(readiness.fitnessContentReviewed).toBe(false);
    expect(isProgramStartAllowed(barbell30, false)).toBe(false);
    expect(getProgramRuntimeStatusLabel(barbell30, false)).toBe('Content in review');
  });

  it('allows an explicit development preview for executable draft programs', () => {
    const barbell30 = programLibrary.find((entry) => entry.program.slug === 'barbell-30')!;

    expect(isProgramStartAllowed(barbell30, true)).toBe(true);
    expect(getProgramRuntimeStatusLabel(barbell30, true)).toBe('Draft preview');
  });

  it('allows production start only when exercise and program review evidence both pass', () => {
    const barbell30 = programLibrary.find((entry) => entry.program.slug === 'barbell-30')!;
    const reviewedExercises = foundationalExercises.map((exercise) => ({
      ...exercise,
      contentStatus: 'reviewed' as const,
      reviewedAt: '2026-09-19T00:00:00.000Z',
      reviewedBy: 'fitness-content-reviewer',
    }));
    const reviews = [
      {
        programId: barbell30.program.id,
        reviewedAt: '2026-09-19T00:00:00.000Z',
        reviewReference: 'review/fitness/barbell-30/v1',
      },
    ];

    expect(isProgramStartAllowed(barbell30, false, { exercises: reviewedExercises, reviews })).toBe(
      false,
    );
    expect(
      isProgramStartAllowed(barbell30, false, {
        exercises: reviewedExercises,
        reviews,
        enabledProgramIds: [barbell30.program.id],
      }),
    ).toBe(true);
  });
});
