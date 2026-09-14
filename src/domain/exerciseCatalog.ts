import { isExerciseCompatible } from './equipment';
import type { Exercise } from './types';

export interface ExerciseSearchOptions {
  query?: string;
  availableEquipmentIds?: readonly string[];
  compatibleOnly?: boolean;
  limit?: number;
}

export function searchExercises(
  exercises: readonly Exercise[],
  {
    query = '',
    availableEquipmentIds = [],
    compatibleOnly = false,
    limit,
  }: ExerciseSearchOptions = {},
): Exercise[] {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = exercises.filter((exercise) => {
    if (compatibleOnly && !isExerciseCompatible(exercise, availableEquipmentIds)) {
      return false;
    }

    if (!normalizedQuery) return true;

    return [
      exercise.name,
      ...exercise.aliases,
      exercise.movementPattern,
      ...exercise.primaryMuscles,
      ...exercise.secondaryMuscles,
      ...exercise.tags,
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });

  return limit === undefined ? filtered : filtered.slice(0, Math.max(0, limit));
}
