import {
  equipmentCatalog,
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

  it('ships a first 50-record draft tranche with stable IDs and schema-complete metadata', () => {
    expect(foundationalExercises).toHaveLength(50);
    expect(new Set(foundationalExercises.map((exercise) => exercise.id)).size).toBe(50);
    expect(foundationalExercises.every((exercise) => exercise.contentStatus === 'draft')).toBe(
      true,
    );
    expect(foundationalExercises.every((exercise) => exercise.instructions.length > 0)).toBe(true);
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
});
