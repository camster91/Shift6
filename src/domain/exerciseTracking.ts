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
