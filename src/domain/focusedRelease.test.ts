import { foundationalExercises } from './fixtures/exercises';
import { programLibrary } from './programLibrary';
import { assessFocusedReleaseContent, focusedReleaseManifest } from './focusedRelease';

const barbell = programLibrary.find((entry) => entry.program.slug === 'barbell-30')!;
const exerciseIds = [
  ...new Set(
    barbell.version!.workouts.flatMap((workout) =>
      workout.exercises.map((item) => item.exerciseId),
    ),
  ),
];
const reviewedExercises = foundationalExercises.map((exercise) => ({
  ...exercise,
  contentStatus: 'reviewed' as const,
  reviewedAt: '2026-09-23T00:00:00Z',
  reviewedBy: 'fixture-reviewer',
}));
const review = [
  {
    programId: barbell.program.id,
    reviewedAt: '2026-09-23T00:00:00Z',
    reviewReference: 'fixture-only',
  },
];

describe('focused release allowlist', () => {
  it('keeps the checked-in unapproved manifest closed', () => {
    if (focusedReleaseManifest.enabledProgramIds.length > 0) return;
    expect(
      assessFocusedReleaseContent(focusedReleaseManifest, programLibrary, foundationalExercises),
    ).toContain('No reviewed Shift is enabled for release.');
  });
  it('requires actual enabled release content to pass every domain gate', () => {
    if (focusedReleaseManifest.enabledProgramIds.length === 0) return;
    expect(
      assessFocusedReleaseContent(focusedReleaseManifest, programLibrary, foundationalExercises),
    ).toEqual([]);
  });
  it('requires review and all referenced exercises, independent of future catalogue counts', () => {
    const manifest = {
      schemaVersion: 1,
      enabledProgramIds: [barbell.program.id],
      enabledExerciseIds: exerciseIds,
    };
    expect(
      assessFocusedReleaseContent(manifest, programLibrary, foundationalExercises, review).length,
    ).toBeGreaterThan(0);
    expect(
      assessFocusedReleaseContent(manifest, programLibrary, reviewedExercises, review),
    ).toEqual([]);
    expect(
      assessFocusedReleaseContent(
        { ...manifest, enabledExerciseIds: [] },
        programLibrary,
        reviewedExercises,
        review,
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining('outside the release allowlist')]));
    expect(assessFocusedReleaseContent(manifest, programLibrary, reviewedExercises, [])).toContain(
      `Enabled Shift ${barbell.program.id} needs one traceable fitness-content review.`,
    );
  });
  it('rejects unknown and duplicate enabled IDs', () => {
    expect(
      assessFocusedReleaseContent(
        {
          schemaVersion: 1,
          enabledProgramIds: ['missing', 'missing'],
          enabledExerciseIds: ['missing'],
        },
        programLibrary,
        foundationalExercises,
      ),
    ).toEqual(
      expect.arrayContaining([
        'Duplicate enabled program ID.',
        'Enabled Shift missing has no executable version.',
        'Enabled exercise missing lacks reviewed public content, safety or provenance.',
      ]),
    );
  });
});
