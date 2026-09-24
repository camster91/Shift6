import { assessProgramVersion } from './contentReadiness';
import { foundationalExercises } from './fixtures/exercises';
import { demoProgramVersion } from './fixtures/home';
import { programLibrary } from './programLibrary';
import { progressionRuleCatalogue } from './progressionRules';

const canonicalLaunchSlugs = [
  'shift6-foundations',
  'barbell-30',
  'strength-3x5',
  'beginner-gym-3-day',
  'upper-lower-hypertrophy',
  'push-pull-legs',
  'dumbbell-only',
  'minimal-home-gym',
  'resistance-bands',
  'bodyweight-foundations',
  'calisthenics-strength',
  'strength-conditioning-hybrid',
  'busy-20',
  'mobility-strength',
  'healthy-ageing',
  'return-to-training',
  'runner-support',
  'cyclist-support',
  'power-athleticism',
  'cardio-base-strength',
] as const;

describe('program library metadata and executable drafts', () => {
  it('matches the canonical 20-program launch set with stable IDs and slugs', () => {
    expect(programLibrary).toHaveLength(20);
    expect(new Set(programLibrary.map((entry) => entry.program.id)).size).toBe(20);
    expect(new Set(programLibrary.map((entry) => entry.program.slug))).toEqual(
      new Set(canonicalLaunchSlugs),
    );
  });

  it('keeps Barbell 30 wired to its canonical version identifier', () => {
    const barbell30 = programLibrary.find((entry) => entry.program.slug === 'barbell-30');

    expect(barbell30).toMatchObject({
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

  it('provides a structurally runnable version for every launch program', () => {
    const executable = programLibrary.filter((entry) => entry.version !== undefined);
    expect(executable).toHaveLength(20);

    executable.forEach((entry) => {
      expect(entry.version).toBeDefined();
      if (!entry.version) return;

      expect(entry.program.currentVersionId).toBe(entry.version.id);
      const report = assessProgramVersion(entry.program, entry.version, foundationalExercises);
      expect(report.readyForCycle).toBe(true);
      expect(report.readyForPublication).toBe(false);
    });
  });

  it('keeps every workout within declared equipment compatibility', () => {
    programLibrary.forEach((entry) => {
      expect(entry.version).toBeDefined();
      if (!entry.version) return;

      const allowedEquipment = new Set([
        ...entry.program.requiredEquipmentIds,
        ...entry.program.optionalEquipmentIds,
        'equipment-bodyweight',
      ]);
      const workoutEquipment = entry.version.workouts.flatMap((workout) => workout.equipmentIds);

      workoutEquipment.forEach((equipmentId) => {
        expect(allowedEquipment.has(equipmentId)).toBe(true);
      });
    });
  });

  it('resolves every version-owned progression rule and keeps identifiers unique', () => {
    const knownRuleIds = new Set(progressionRuleCatalogue.map((rule) => rule.id));
    const workoutIds: string[] = [];
    const workoutExerciseIds: string[] = [];
    const setIds: string[] = [];

    programLibrary.forEach((entry) => {
      expect(entry.version).toBeDefined();
      if (!entry.version) return;

      entry.version.progressionRuleIds.forEach((ruleId) => {
        expect(knownRuleIds.has(ruleId)).toBe(true);
      });
      entry.version.workouts.forEach((workout) => {
        workoutIds.push(workout.id);
        workout.exercises.forEach((exercise) => {
          workoutExerciseIds.push(exercise.id);
          exercise.sets.forEach((set) => setIds.push(set.id));
        });
      });
    });

    expect(new Set(workoutIds).size).toBe(workoutIds.length);
    expect(new Set(workoutExerciseIds).size).toBe(workoutExerciseIds.length);
    expect(new Set(setIds).size).toBe(setIds.length);
  });

  it('preserves program-specific launch constraints from the canonical plan', () => {
    const strength3x5 = programLibrary.find((entry) => entry.program.slug === 'strength-3x5');
    const hybrid = programLibrary.find(
      (entry) => entry.program.slug === 'strength-conditioning-hybrid',
    );
    const runner = programLibrary.find((entry) => entry.program.slug === 'runner-support');
    const cyclist = programLibrary.find((entry) => entry.program.slug === 'cyclist-support');

    expect(strength3x5?.version?.workouts).toHaveLength(3);
    expect(
      strength3x5?.version?.workouts
        .flatMap((workout) => workout.exercises)
        .every((exercise) => exercise.sets.length === 3 && exercise.sets[0]?.target.reps === 5),
    ).toBe(true);

    expect(hybrid?.program.daysPerWeek).toBe(5);
    expect(
      hybrid?.version?.workouts.filter((workout) => workout.focus === 'strength'),
    ).toHaveLength(3);
    expect(hybrid?.version?.workouts.filter((workout) => workout.focus === 'cardio')).toHaveLength(
      2,
    );

    expect(runner?.program.daysPerWeek).toBe(2);
    expect(runner?.version?.workouts.filter((workout) => !workout.isOptional)).toHaveLength(2);
    expect(runner?.version?.workouts.filter((workout) => workout.isOptional)).toHaveLength(2);

    expect(cyclist?.program.daysPerWeek).toBe(2);
    expect(cyclist?.version?.workouts.filter((workout) => !workout.isOptional)).toHaveLength(2);
    expect(cyclist?.version?.workouts.filter((workout) => workout.isOptional)).toHaveLength(2);
  });

  it('keeps all non-canonical catalogue entries gated from public startability', () => {
    const drafts = programLibrary.filter((entry) => entry.program.slug !== 'barbell-30');

    expect(drafts.every((entry) => entry.status === 'metadata-draft')).toBe(true);
    expect(drafts.every((entry) => entry.buildStatus === 'executable-draft')).toBe(true);
    expect(programLibrary.some((entry) => entry.buildStatus === 'metadata-only')).toBe(false);
  });
});
