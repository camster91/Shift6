import { assessProgramVersion } from './contentReadiness';
import { foundationalExercises } from './fixtures/exercises';
import { demoProgramVersion } from './fixtures/home';
import { programLibrary } from './programLibrary';

describe('program library metadata and executable drafts', () => {
  it('keeps the 20-program launch target with stable IDs and slugs', () => {
    expect(programLibrary).toHaveLength(20);
    expect(new Set(programLibrary.map((entry) => entry.program.id)).size).toBe(20);
    expect(new Set(programLibrary.map((entry) => entry.program.slug)).size).toBe(20);
  });

  it('keeps Barbell 30 wired to its canonical version identifier', () => {
    expect(programLibrary[0]).toMatchObject({
      status: 'published',
      buildStatus: 'canonical',
      program: {
        id: 'program-barbell-30',
        currentVersionId: demoProgramVersion.id,
      },
      version: {
        id: demoProgramVersion.id,
        programId: 'program-barbell-30',
      },
    });
  });

  it('provides structurally runnable draft versions for every launch program except bands', () => {
    const executable = programLibrary.filter((entry) => entry.version !== undefined);
    expect(executable).toHaveLength(19);

    const resistanceBands = programLibrary.find(
      (entry) => entry.program.slug === 'resistance-bands',
    );
    expect(resistanceBands).toMatchObject({
      buildStatus: 'metadata-only',
      status: 'metadata-draft',
    });
    expect(resistanceBands?.version).toBeUndefined();

    executable.forEach((entry) => {
      expect(entry.version).toBeDefined();
      if (!entry.version) return;

      expect(entry.program.currentVersionId).toBe(entry.version.id);
      const report = assessProgramVersion(entry.program, entry.version, foundationalExercises);
      expect(report.readyForCycle).toBe(true);
      expect(report.readyForPublication).toBe(false);
    });
  });

  it('keeps draft catalogue entries visibly gated from public startability', () => {
    expect(programLibrary.slice(1).every((entry) => entry.status === 'metadata-draft')).toBe(true);
    expect(
      programLibrary.filter((entry) => entry.buildStatus === 'executable-draft'),
    ).toHaveLength(18);
  });
});
