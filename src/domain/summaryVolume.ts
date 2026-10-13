import type { CompletedSet } from './types';

/** Legacy completed sets carry numeric loads but no unit provenance. Neither
 * current preferences nor a later prescription can identify their units. */
export function summaryVolumeLabel(sets: readonly CompletedSet[]): string {
  const hasLoadedReps = sets.some(
    (set) =>
      typeof set.load === 'number' &&
      Number.isFinite(set.load) &&
      set.load > 0 &&
      typeof set.reps === 'number' &&
      Number.isFinite(set.reps) &&
      set.reps > 0,
  );
  return hasLoadedReps ? 'Load units unknown' : 'Not measured';
}
