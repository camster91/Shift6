import { assessExerciseContent } from './contentReadiness';
import {
  equipmentCatalog,
  explainExerciseSubstitution,
  findExerciseSubstitutions,
  isExerciseCompatible,
  missingEquipment,
} from './equipment';
import { foundationalExercises } from './fixtures/exercises';

describe('equipment-aware exercise catalogue', () => {
  it('provides stable taxonomy records and identifies missing requirements', () => {
    expect(equipmentCatalog).toHaveLength(23);
    expect(new Set(equipmentCatalog.map((item) => item.id)).size).toBe(equipmentCatalog.length);
    expect(
      missingEquipment(['equipment-barbell', 'equipment-rack'], ['equipment-barbell']),
    ).toEqual(['equipment-rack']);
  });

  it('ships a 58-record draft tranche with stable IDs and schema-complete metadata', () => {
    expect(foundationalExercises).toHaveLength(58);
    expect(new Set(foundationalExercises.map((exercise) => exercise.id)).size).toBe(58);
    expect(foundationalExercises.every((exercise) => exercise.contentStatus === 'draft')).toBe(
      true,
    );
    expect(foundationalExercises.every((exercise) => exercise.instructions.length > 0)).toBe(true);

    const readiness = foundationalExercises.map(assessExerciseContent);
    expect(readiness.every((report) => report.readyForCycle)).toBe(true);
    expect(readiness.every((report) => !report.readyForPublication)).toBe(true);
  });

  it('includes band-native movements that are compatible with a bands-only inventory', () => {
    const bandExercises = foundationalExercises.filter((exercise) =>
      exercise.equipmentIds.includes('equipment-resistance-bands'),
    );

    expect(bandExercises).toHaveLength(8);
    expect(
      bandExercises.every((exercise) =>
        isExerciseCompatible(exercise, ['equipment-resistance-bands']),
      ),
    ).toBe(true);
  });

  it('ranks compatible substitutions by movement pattern and available equipment', () => {
    const source = foundationalExercises.find((exercise) => exercise.id === 'exercise-back-squat')!;
    const substitutions = findExerciseSubstitutions(source, foundationalExercises, [
      'equipment-kettlebell',
    ]);

    expect(substitutions[0]?.id).toBe('exercise-goblet-squat');
    expect(
      substitutions.every((exercise) => isExerciseCompatible(exercise, ['equipment-kettlebell'])),
    ).toBe(true);
  });

  it('explains meaningful substitution similarities and differences', () => {
    const source = foundationalExercises.find((exercise) => exercise.id === 'exercise-back-squat');
    const candidate = foundationalExercises.find(
      (exercise) => exercise.id === 'exercise-goblet-squat',
    );

    expect(source).toBeDefined();
    expect(candidate).toBeDefined();
    if (!source || !candidate) return;

    const explanation = explainExerciseSubstitution(source, candidate);
    expect(explanation).toContain('Squat movement pattern');
    expect(explanation).toContain('Quadriceps');
    expect(explanation).toContain('Kettlebell instead of Barbell, Plates, and Rack');
  });
});
