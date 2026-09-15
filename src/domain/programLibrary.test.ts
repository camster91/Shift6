import { programLibrary } from './programLibrary';

describe('program library metadata', () => {
  it('keeps the 20-program launch target as stable, versionable metadata', () => {
    expect(programLibrary).toHaveLength(20);
    expect(new Set(programLibrary.map((entry) => entry.program.id)).size).toBe(20);
    expect(new Set(programLibrary.map((entry) => entry.program.slug)).size).toBe(20);
    expect(programLibrary[0]).toMatchObject({
      status: 'published',
      program: { id: 'program-barbell-30', currentVersionId: 'program-barbell-30-version-1' },
      version: { id: 'program-version-barbell-30-v1', programId: 'program-barbell-30' },
    });
    expect(programLibrary.slice(1).every((entry) => entry.status === 'metadata-draft')).toBe(true);
    expect(
      programLibrary.every(
        (entry) =>
          entry.program.daysPerWeek > 0 &&
          entry.program.sessionLengthMinutes > 0 &&
          entry.program.requiredEquipmentIds.length > 0,
      ),
    ).toBe(true);
  });
});
