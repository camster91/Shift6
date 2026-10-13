import type { MeasurementProtocol } from './shift';
import type { UnitSystem } from './types';

type Metric = MeasurementProtocol['metric'];
export function goalUnit(metric: Metric, units: UnitSystem): string {
  if (metric === 'load-for-reps') return units === 'imperial' ? 'lb' : 'kg';
  if (metric === 'distance') return units === 'imperial' ? 'miles' : 'meters';
  if (metric === 'reps') return 'reps';
  if (metric === 'completion') return 'completed';
  return 'seconds';
}
export function goalToCanonical(value: number, metric: Metric, units: UnitSystem): number {
  if (units !== 'imperial') return value;
  if (metric === 'load-for-reps') return value * 0.45359237;
  if (metric === 'distance') return value * 1609.344;
  return value;
}
export function goalFromCanonical(value: number, metric: Metric, units: UnitSystem): number {
  if (units !== 'imperial') return value;
  if (metric === 'load-for-reps') return value / 0.45359237;
  if (metric === 'distance') return value / 1609.344;
  return value;
}
export function goalValueLabel(
  value: number | boolean | undefined,
  metric: Metric,
  units: UnitSystem,
): string {
  if (value === undefined) return 'Not measured';
  if (typeof value === 'boolean') return value ? 'Completed' : 'Not completed';
  return `${Number(goalFromCanonical(value, metric, units).toPrecision(8))} ${goalUnit(metric, units)}`;
}
