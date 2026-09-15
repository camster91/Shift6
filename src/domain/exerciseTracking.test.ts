import { createCustomExercise } from './programBuilder';
import { defaultTargetForTrackingType, resolveTrackingType } from './exerciseTracking';

describe('exercise tracking resolution', () => {
  it('uses the persisted exercise record when available', () => {
    const exercise = createCustomExercise({
      id: 'custom-bike',
      name: 'Custom bike block',
      movementPattern: 'cyclical-cardio',
      primaryMuscles: ['heart'],
      equipmentIds: ['equipment-bike'],
      trackingType: 'duration-and-distance',
    });

    expect(resolveTrackingType(exercise.id, { reps: 8 }, [exercise])).toBe('duration-and-distance');
  });

  it('infers a safe field shape from a target for an unknown exercise', () => {
    expect(resolveTrackingType('unknown', { durationSeconds: 300 }, [])).toBe('time');
    expect(resolveTrackingType('unknown', { distanceMeters: 1000 }, [])).toBe('distance');
    expect(resolveTrackingType('unknown', { durationSeconds: 300, distanceMeters: 1000 }, [])).toBe(
      'duration-and-distance',
    );
    expect(resolveTrackingType('unknown', { reps: 8 }, [])).toBe('reps');
  });

  it('provides conservative targets for catalogue exercises', () => {
    expect(defaultTargetForTrackingType('reps')).toEqual({ reps: 8 });
    expect(defaultTargetForTrackingType('time')).toEqual({ durationSeconds: 30 });
    expect(defaultTargetForTrackingType('distance')).toEqual({ distanceMeters: 500 });
    expect(defaultTargetForTrackingType('duration-and-distance')).toEqual({
      durationSeconds: 300,
      distanceMeters: 500,
    });
  });
});
