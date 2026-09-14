import { foundationalExercises } from './fixtures/exercises';
import { demoProgram, demoProgramVersion } from './fixtures/home';
import { assessExerciseContent, assessProgramVersion } from './contentReadiness';

describe('content readiness', () => {
  it('keeps structurally complete draft exercises runnable but not publication-ready', () => {
    const report = assessExerciseContent(foundationalExercises[0]!);

    expect(report.readyForCycle).toBe(true);
    expect(report.readyForPublication).toBe(false);
    expect(report.blockers).toEqual([]);
    expect(report.reviewWarnings[0]).toContain('human technique review is pending');
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
