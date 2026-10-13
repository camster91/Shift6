import { declaredLoad } from './loadUnits';
import type { CompletedSet } from './types';

/** Legacy completed sets carry numeric loads but no unit provenance. Neither
 * current preferences nor a later prescription can identify their units. */
export function summaryVolumeLabel(sets: readonly CompletedSet[]): string {
  const loaded = sets.filter(
    (set) =>
      typeof set.load === 'number' &&
      Number.isFinite(set.load) &&
      set.load > 0 &&
      typeof set.reps === 'number' &&
      Number.isFinite(set.reps) &&
      set.reps > 0,
  );
  const unknown = loaded.filter((set) => declaredLoad(set.load, set.loadUnit) === undefined).length;
  const volume = loaded.reduce(
    (total, set) => total + (declaredLoad(set.load, set.loadUnit) ?? 0) * (set.reps ?? 0),
    0,
  );
  if (!volume) return unknown ? 'Load units unknown' : 'Not measured';
  return `${Number(volume.toFixed(2)).toLocaleString()} kg-reps${unknown ? ` (${unknown} unknown-unit sets excluded)` : ''}`;
}
