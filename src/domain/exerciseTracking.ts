import type { Exercise, SetTarget, TrackingType } from './types';

export function resolveTrackingType(
  exerciseId: string,
  target: SetTarget | undefined,
  exercises: readonly Exercise[],
): TrackingType {
  const exercise = exercises.find((candidate) => candidate.id === exerciseId);
  if (exercise) return exercise.trackingType;

  if (target?.durationSeconds !== undefined && target.distanceMeters !== undefined) {
    return 'duration-and-distance';
  }
  if (target?.durationSeconds !== undefined) return 'time';
  if (target?.distanceMeters !== undefined) return 'distance';
  return 'reps';
}

export function defaultTargetForTrackingType(trackingType: TrackingType): SetTarget {
  switch (trackingType) {
    case 'time':
      return { durationSeconds: 30 };
    case 'distance':
      return { distanceMeters: 500 };
    case 'duration-and-distance':
      return { durationSeconds: 300, distanceMeters: 500 };
    case 'custom':
    case 'reps':
      return { reps: 8 };
  }
}
