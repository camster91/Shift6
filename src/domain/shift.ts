import type { EntityId, ISODateString, TrainingCycle } from './types';

export type MeasurementProtocol =
  | (ProtocolBase & { metric: 'reps'; canonicalUnit: 'reps'; direction: 'higher' })
  | (ProtocolBase & {
      metric: 'load-for-reps';
      canonicalUnit: 'kg';
      repCount: number;
      direction: 'higher';
    })
  | (ProtocolBase & { metric: 'hold-duration'; canonicalUnit: 'seconds'; direction: 'higher' })
  | (ProtocolBase & {
      metric: 'fixed-distance-time';
      canonicalUnit: 'seconds';
      fixedDistanceMeters: number;
      direction: 'lower';
    })
  | (ProtocolBase & { metric: 'distance'; canonicalUnit: 'meters'; direction: 'higher' })
  | (ProtocolBase & { metric: 'completion'; canonicalUnit: 'completed'; direction: 'complete' });

export interface ProtocolBase {
  id: EntityId;
  version: number;
  exerciseId: EntityId;
  variantId: EntityId;
  assistance: string;
  equipmentSetup: string;
}

export type MeasurementUnit =
  'reps' | 'kg' | 'lb' | 'seconds' | 'minutes' | 'meters' | 'km' | 'miles' | 'completed';
export type MeasurementSource = 'assessment' | 'historical-entry' | 'import' | 'qualifying-workout';

export interface ShiftObservation {
  id: EntityId;
  shiftId: EntityId;
  protocolId: EntityId;
  protocolVersion: number;
  measuredAt: ISODateString;
  source: MeasurementSource;
  value: number | boolean;
  unit: MeasurementUnit;
  // A correction is a new observation referencing the original, never a silent overwrite.
  correctsObservationId?: EntityId;
}

// Estimates never enter the measured observation series.
export interface ShiftEstimate {
  id: EntityId;
  shiftId: EntityId;
  protocolId: EntityId;
  protocolVersion: number;
  estimatedAt: ISODateString;
  canonicalValue: number;
  derivationVersion: string;
  sourceObservationIds: EntityId[];
}

export type Baseline =
  | { state: 'measured'; observationId: EntityId }
  | { state: 'not-yet-able' | 'deferred' | 'missing' };

export type ShiftReviewState = 'due' | 'completed' | 'declined' | 'postponed' | 'missing';
export type ShiftNextChoice = 'maintain' | 'repeat' | 'modify' | 'new-goal' | 'break' | 'undecided';

export interface Shift {
  id: EntityId;
  userId: EntityId;
  cycleId: EntityId;
  programVersionId: EntityId;
  templateId: EntityId;
  blockObjective: string;
  longerTermAspiration?: string;
  protocol: MeasurementProtocol;
  target: number | true;
  baseline: Baseline;
  reviewState: ShiftReviewState;
  nextChoice: ShiftNextChoice;
}

export interface MeasuredValue {
  observationId: EntityId;
  measuredAt: ISODateString;
  canonicalValue: number | boolean;
  canonicalUnit: MeasurementProtocol['canonicalUnit'];
}

export interface ShiftProgress {
  // Existing TrainingCycle position; #315 will define calendar position separately.
  cycleWeek: number;
  completedSessions: number;
  plannedSessions: number;
  baseline: MeasuredValue | null;
  latest: MeasuredValue | null;
  personalBest: MeasuredValue | null;
  change:
    'improved' | 'unchanged' | 'decreased' | 'not-tested' | 'not-comparable' | 'insufficient-data';
  absoluteChange: number | null;
  percentChange: number | null;
  attainment: 'met' | 'not-met' | 'unknown';
  baselineAlreadyMet: boolean;
  excludedObservationIds: EntityId[];
}

export function validateMeasurementProtocol(protocol: MeasurementProtocol): string[] {
  const errors: string[] = [];
  if (
    !protocol.id.trim() ||
    !protocol.exerciseId.trim() ||
    !protocol.variantId.trim() ||
    !protocol.assistance.trim() ||
    !protocol.equipmentSetup.trim()
  )
    errors.push('Protocol identity, variant, assistance and setup are required.');
  if (!Number.isInteger(protocol.version) || protocol.version < 1)
    errors.push('Protocol version must be a positive integer.');
  if (
    protocol.metric === 'load-for-reps' &&
    (!Number.isInteger(protocol.repCount) || protocol.repCount < 1)
  )
    errors.push('Load protocol needs a positive rep count.');
  if (
    protocol.metric === 'fixed-distance-time' &&
    (!Number.isFinite(protocol.fixedDistanceMeters) || protocol.fixedDistanceMeters <= 0)
  )
    errors.push('Time protocol needs a positive fixed distance.');
  return errors;
}

export function normalizeObservation(
  protocol: MeasurementProtocol,
  observation: ShiftObservation,
): MeasuredValue | null {
  if (observation.protocolId !== protocol.id || observation.protocolVersion !== protocol.version)
    return null;
  if (
    !observation.id.trim() ||
    !observation.shiftId.trim() ||
    !Number.isFinite(Date.parse(observation.measuredAt))
  )
    return null;
  if (protocol.metric === 'completion') {
    if (observation.unit !== 'completed' || typeof observation.value !== 'boolean') return null;
    return {
      observationId: observation.id,
      measuredAt: observation.measuredAt,
      canonicalValue: observation.value,
      canonicalUnit: protocol.canonicalUnit,
    };
  }
  if (
    typeof observation.value !== 'number' ||
    !Number.isFinite(observation.value) ||
    observation.value < 0
  )
    return null;
  if (protocol.metric === 'reps' && !Number.isInteger(observation.value)) return null;
  const conversions: Partial<Record<MeasurementUnit, number>> =
    protocol.canonicalUnit === 'kg'
      ? { kg: 1, lb: 0.45359237 }
      : protocol.canonicalUnit === 'seconds'
        ? { seconds: 1, minutes: 60 }
        : protocol.canonicalUnit === 'meters'
          ? { meters: 1, km: 1000, miles: 1609.344 }
          : { reps: 1 };
  const factor = conversions[observation.unit];
  if (factor === undefined) return null;
  return {
    observationId: observation.id,
    measuredAt: observation.measuredAt,
    canonicalValue: observation.value * factor,
    canonicalUnit: protocol.canonicalUnit,
  };
}

export function evaluateShift(
  shift: Shift,
  cycle: TrainingCycle,
  observations: readonly ShiftObservation[],
): ShiftProgress {
  if (
    shift.cycleId !== cycle.id ||
    shift.userId !== cycle.userId ||
    shift.programVersionId !== cycle.programVersionId
  )
    throw new Error('Shift and cycle ownership/version must agree.');
  if (validateMeasurementProtocol(shift.protocol).length > 0)
    throw new Error('Invalid measurement protocol.');
  if (
    shift.protocol.metric === 'completion'
      ? shift.target !== true
      : typeof shift.target !== 'number' || !Number.isFinite(shift.target) || shift.target < 0
  )
    throw new Error('Invalid Shift target.');
  const valid: MeasuredValue[] = [];
  const excludedObservationIds: EntityId[] = [];
  const normalized = new Map<EntityId, MeasuredValue>();
  for (const observation of observations) {
    if (observation.shiftId !== shift.id) continue;
    const value = normalizeObservation(shift.protocol, observation);
    if (value && !normalized.has(observation.id)) normalized.set(observation.id, value);
    else excludedObservationIds.push(observation.id);
  }
  const corrections = new Map<EntityId, EntityId>();
  const declaredCorrections = new Set<EntityId>();
  const children = new Map<EntityId, EntityId[]>();
  for (const observation of observations) {
    if (observation.shiftId !== shift.id || !observation.correctsObservationId) continue;
    declaredCorrections.add(observation.id);
    if (!normalized.has(observation.id) || !normalized.has(observation.correctsObservationId)) {
      if (normalized.has(observation.id)) excludedObservationIds.push(observation.id);
      continue;
    }
    corrections.set(observation.id, observation.correctsObservationId);
    children.set(observation.correctsObservationId, [
      ...(children.get(observation.correctsObservationId) ?? []),
      observation.id,
    ]);
  }
  const resolved = new Map<EntityId, { date: ISODateString; depth: number } | null>();
  const resolving = new Set<EntityId>();
  const resolve = (id: EntityId): { date: ISODateString; depth: number } | null => {
    if (resolved.has(id)) return resolved.get(id)!;
    if (resolving.has(id)) return null;
    const value = normalized.get(id);
    if (!value) return null;
    const parent = corrections.get(id);
    if (!parent) return { date: value.measuredAt, depth: 0 };
    if (children.get(parent)?.length !== 1) return null;
    resolving.add(id);
    const ancestor = resolve(parent);
    resolving.delete(id);
    const result = ancestor ? { date: ancestor.date, depth: ancestor.depth + 1 } : null;
    resolved.set(id, result);
    return result;
  };
  const superseded = new Set<EntityId>();
  const amendmentByOriginal = new Map<EntityId, EntityId>();
  for (const [id, parent] of [...corrections].sort(
    ([a], [b]) => (resolve(a)?.depth ?? Infinity) - (resolve(b)?.depth ?? Infinity),
  )) {
    const effective = resolve(id);
    if (!effective) {
      excludedObservationIds.push(id);
      continue;
    }
    // A correction changes the value at the original effort date, regardless of input order.
    normalized.set(id, { ...normalized.get(id)!, measuredAt: effective.date });
    superseded.add(parent);
    amendmentByOriginal.set(parent, id);
  }
  for (const [id, value] of normalized)
    if (
      !superseded.has(id) &&
      (!declaredCorrections.has(id) || (corrections.has(id) && resolve(id)))
    )
      valid.push(value);
  valid.sort(
    (a, b) =>
      a.measuredAt.localeCompare(b.measuredAt) || a.observationId.localeCompare(b.observationId),
  );
  const latest = valid.at(-1) ?? null;
  let baselineId = shift.baseline.state === 'measured' ? shift.baseline.observationId : null;
  const visited = new Set<EntityId>();
  while (baselineId && amendmentByOriginal.has(baselineId) && !visited.has(baselineId)) {
    visited.add(baselineId);
    baselineId = amendmentByOriginal.get(baselineId)!;
  }
  const baseline =
    baselineId && !superseded.has(baselineId) ? (normalized.get(baselineId) ?? null) : null;
  const best = valid.reduce<MeasuredValue | null>(
    (current, candidate) =>
      !current || better(shift.protocol, candidate.canonicalValue, current.canonicalValue)
        ? candidate
        : current,
    null,
  );
  const attained = (value: MeasuredValue | null) =>
    value !== null &&
    (shift.protocol.metric === 'completion'
      ? value.canonicalValue === true
      : typeof value.canonicalValue === 'number' &&
        typeof shift.target === 'number' &&
        (shift.protocol.direction === 'lower'
          ? value.canonicalValue <= shift.target
          : value.canonicalValue >= shift.target));
  const baselineAlreadyMet = attained(baseline);
  const attainment = !latest ? 'unknown' : attained(latest) ? 'met' : 'not-met';
  let change: ShiftProgress['change'] = 'insufficient-data';
  let absoluteChange: number | null = null;
  let percentChange: number | null = null;
  const declaredBaselineId =
    shift.baseline.state === 'measured' ? shift.baseline.observationId : null;
  if (!latest)
    change = observations.some((o) => o.shiftId === shift.id) ? 'not-comparable' : 'not-tested';
  else if (
    !baseline &&
    declaredBaselineId !== null &&
    observations.some((o) => o.id === declaredBaselineId)
  )
    change = 'not-comparable';
  else if (baseline && latest.observationId !== baseline.observationId) {
    if (typeof latest.canonicalValue === 'number' && typeof baseline.canonicalValue === 'number') {
      absoluteChange = latest.canonicalValue - baseline.canonicalValue;
      change =
        absoluteChange === 0
          ? 'unchanged'
          : better(shift.protocol, latest.canonicalValue, baseline.canonicalValue)
            ? 'improved'
            : 'decreased';
      if (baseline.canonicalValue !== 0)
        percentChange = (absoluteChange / Math.abs(baseline.canonicalValue)) * 100;
    } else change = latest.canonicalValue === baseline.canonicalValue ? 'unchanged' : 'improved';
  }
  return {
    cycleWeek: cycle.currentWeek,
    completedSessions: cycle.weeks.reduce((n, w) => n + w.completedWorkoutCount, 0),
    plannedSessions: cycle.weeks.reduce((n, w) => n + w.plannedWorkoutCount, 0),
    baseline,
    latest,
    personalBest: best,
    change,
    absoluteChange,
    percentChange,
    attainment,
    baselineAlreadyMet,
    excludedObservationIds,
  };
}

function better(
  protocol: MeasurementProtocol,
  left: number | boolean,
  right: number | boolean,
): boolean {
  if (protocol.direction === 'complete') return left === true && right === false;
  if (typeof left !== 'number' || typeof right !== 'number') return false;
  return protocol.direction === 'lower' ? left < right : left > right;
}
