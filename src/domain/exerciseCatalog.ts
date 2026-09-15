import { isExerciseCompatible } from './equipment';
import type { Difficulty, Exercise, ExerciseClassification } from './types';

export type ExerciseCategoryFilter = 'mobility' | 'power' | 'cardio';

export interface ExerciseSearchOptions {
  query?: string;
  availableEquipmentIds?: readonly string[];
  compatibleOnly?: boolean;
  difficulty?: Difficulty;
  unilateral?: boolean;
  classification?: ExerciseClassification;
  category?: ExerciseCategoryFilter;
  limit?: number;
}

export function searchExercises(
  exercises: readonly Exercise[],
  {
    query = '',
    availableEquipmentIds = [],
    compatibleOnly = false,
    difficulty,
    unilateral,
    classification,
    category,
    limit,
  }: ExerciseSearchOptions = {},
): Exercise[] {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = exercises.filter((exercise) => {
    if (compatibleOnly && !isExerciseCompatible(exercise, availableEquipmentIds)) {
      return false;
    }
    if (difficulty && exercise.difficulty !== difficulty) return false;
    if (unilateral !== undefined && exercise.unilateral !== unilateral) return false;
    if (classification && resolveClassification(exercise) !== classification) return false;
    if (category && !matchesCategory(exercise, category)) return false;

    if (!normalizedQuery) return true;

    return [
      exercise.name,
      ...exercise.aliases,
      exercise.movementPattern,
      resolveClassification(exercise),
      ...exercise.primaryMuscles,
      ...exercise.secondaryMuscles,
      ...exercise.tags,
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });

  return limit === undefined ? filtered : filtered.slice(0, Math.max(0, limit));
}

function resolveClassification(exercise: Exercise): ExerciseClassification {
  return exercise.classification ?? (exercise.primaryMuscles.length > 1 ? 'compound' : 'isolation');
}

function matchesCategory(exercise: Exercise, category: ExerciseCategoryFilter): boolean {
  if (exercise.tags.includes(category)) return true;
  if (category === 'mobility') return exercise.movementPattern === 'mobility';
  if (category === 'power') return exercise.movementPattern === 'power';
  return exercise.movementPattern === 'cyclical-cardio';
}
