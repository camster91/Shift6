import { foundationalExercises } from './fixtures/exercises';
import { searchExercises } from './exerciseCatalog';

describe('exercise catalogue search', () => {
  it('searches names, movement patterns, muscles, and tags', () => {
    expect(searchExercises(foundationalExercises, { query: 'posterior-chain' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'exercise-deadlift' }),
        expect.objectContaining({ id: 'exercise-back-extension' }),
      ]),
    );
    expect(searchExercises(foundationalExercises, { query: 'shoulders' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'exercise-overhead-press' })]),
    );
  });

  it('can limit results to movements compatible with the equipment profile', () => {
    const results = searchExercises(foundationalExercises, {
      availableEquipmentIds: ['equipment-bodyweight'],
      compatibleOnly: true,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ id: 'exercise-back-squat' }),
        expect.objectContaining({ id: 'exercise-bench-press' }),
      ]),
    );
  });

  it('filters by difficulty, stance, classification, and training category', () => {
    expect(
      searchExercises(foundationalExercises, {
        difficulty: 'intermediate',
        classification: 'compound',
        category: 'power',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'exercise-kettlebell-swing' }),
        expect.objectContaining({ id: 'exercise-box-jump' }),
      ]),
    );
    expect(
      searchExercises(foundationalExercises, {
        unilateral: true,
        category: 'mobility',
      }),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'exercise-thoracic-rotation' })]),
    );
    expect(
      searchExercises(foundationalExercises, {
        classification: 'isolation',
      }),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'exercise-lateral-raise' })]));
  });

  it('keeps search semantics stable with more than 500 records', () => {
    const largeCatalogue = Array.from({ length: 10 }, (_, batch) =>
      foundationalExercises.map((exercise) => ({
        ...exercise,
        id: `${exercise.id}-batch-${batch}`,
        aliases: [...exercise.aliases],
        primaryMuscles: [...exercise.primaryMuscles],
        secondaryMuscles: [...exercise.secondaryMuscles],
        equipmentIds: [...exercise.equipmentIds],
        instructions: [...exercise.instructions],
        techniqueCues: [...exercise.techniqueCues],
        commonMistakes: [...exercise.commonMistakes],
        safetyNotes: [...exercise.safetyNotes],
        tags: [...exercise.tags],
        media: [...exercise.media],
      })),
    ).flat();

    expect(largeCatalogue).toHaveLength(580);
    const results = searchExercises(largeCatalogue, {
      query: 'posterior-chain',
      availableEquipmentIds: ['equipment-barbell', 'equipment-plates', 'equipment-bodyweight'],
      compatibleOnly: true,
    });

    expect(results).toHaveLength(40);
    expect(new Set(results.map((exercise) => exercise.id)).size).toBe(results.length);
    expect(
      results.every(
        (exercise) =>
          exercise.tags.includes('posterior-chain') &&
          !exercise.equipmentIds.includes('equipment-rack'),
      ),
    ).toBe(true);
  });
});
