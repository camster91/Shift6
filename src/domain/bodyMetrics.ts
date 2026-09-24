import type { UnitSystem } from './types';

export type BodyMetricType = 'weight';

export interface BodyMetric {
  id: string;
  userId: string;
  type: BodyMetricType;
  /** Canonical storage value. Weight is stored in kilograms. */
  value: number;
  unit: 'kg';
  measuredAt: string;
  createdAt: string;
}

const POUNDS_PER_KILOGRAM = 2.2046226218;

export function createManualWeightMetric({
  userId,
  value,
  unitSystem,
  measuredAt,
  createdAt = measuredAt,
}: {
  userId: string;
  value: number;
  unitSystem: UnitSystem;
  measuredAt: string;
  createdAt?: string;
}): BodyMetric {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('A user ID is required for a body metric.');
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Weight must be a positive number.');
  }

  const normalizedMeasuredAt = normalizeDate(measuredAt, 'measurement');
  const normalizedCreatedAt = normalizeDate(createdAt, 'creation');
  const kilograms = unitSystem === 'imperial' ? poundsToKilograms(value) : value;

  return {
    id: `body-metric-weight-${normalizedUserId}-${Date.parse(normalizedMeasuredAt)}`,
    userId: normalizedUserId,
    type: 'weight',
    value: round(kilograms, 4),
    unit: 'kg',
    measuredAt: normalizedMeasuredAt,
    createdAt: normalizedCreatedAt,
  };
}

export function bodyMetricValueForUnitSystem(metric: BodyMetric, unitSystem: UnitSystem): number {
  return unitSystem === 'imperial' ? kilogramsToPounds(metric.value) : metric.value;
}

export function bodyMetricUnitLabel(unitSystem: UnitSystem): 'lb' | 'kg' {
  return unitSystem === 'imperial' ? 'lb' : 'kg';
}

export function kilogramsToPounds(value: number): number {
  return round(value * POUNDS_PER_KILOGRAM, 1);
}

export function poundsToKilograms(value: number): number {
  return round(value / POUNDS_PER_KILOGRAM, 4);
}

function normalizeDate(value: string, label: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`A valid ${label} timestamp is required.`);
  return new Date(timestamp).toISOString();
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
