import type { UnitSystem } from './types';
export type LoadUnit = 'kg' | 'lb';
export const loadProvenanceSections = {
  completedSetLoadProvenance: 'completed_set_load_provenance',
  workoutDraftLoadUnits: 'workout_draft_load_units',
} as const;
export const loadUnitForSystem = (unit: UnitSystem): LoadUnit => (unit === 'metric' ? 'kg' : 'lb');
export const systemForLoadUnit = (unit: LoadUnit): UnitSystem =>
  unit === 'kg' ? 'metric' : 'imperial';
export function convertLoad(value: number, from: LoadUnit, to: LoadUnit): number {
  if (!Number.isFinite(value) || value < 0) throw new Error('Use a nonnegative measured load.');
  return from === to ? value : from === 'lb' ? value * 0.45359237 : value / 0.45359237;
}
export function declaredLoad(
  value: number | undefined,
  unit: LoadUnit | undefined,
  to: LoadUnit = 'kg',
): number | undefined {
  return value !== undefined &&
    Number.isFinite(value) &&
    value >= 0 &&
    (unit === 'kg' || unit === 'lb')
    ? convertLoad(value, unit, to)
    : undefined;
}
export function actualLoadUnit(inputUnit: unknown): LoadUnit | undefined {
  return inputUnit === 'kg' || inputUnit === 'lb' ? inputUnit : undefined;
}

/** Previous actuals keep their declared entry unit; profile/target preferences
 * cannot supply missing historical provenance. */
export function formatActualLoad(value: number, unit: LoadUnit | undefined): string {
  const declared = actualLoadUnit(unit);
  return declared ? `${value} ${declared}` : `${value} (unit unknown)`;
}
