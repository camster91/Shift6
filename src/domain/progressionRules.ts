import type { EntityId, ProgressionRule, ProgressionStrategy, UnitSystem } from './types';

export interface DeterministicProgressionParameters {
  loadIncrement: number;
  durationIncrementSeconds: number;
  distanceIncrementMeters: number;
  totalRepTarget?: number;
  skillReady?: boolean;
}

/**
 * The first reviewed rule in the catalogue. Rules are version-owned data: a
 * ProgramVersion references them by ID so a later program revision can change
 * its progression without rewriting completed workout history.
 */
export const barbell30DoubleProgressionRule: ProgressionRule = {
  id: 'rule-barbell-30-double-progression',
  strategy: 'double-progression',
  scope: 'program',
  parameters: {
    loadIncrementImperial: 5,
    loadIncrementMetric: 2.5,
    durationIncrementSeconds: 60,
    distanceIncrementMeters: 250,
  },
};

export const progressionRuleCatalogue: readonly ProgressionRule[] = [
  barbell30DoubleProgressionRule,
];

const safeDefaults: DeterministicProgressionParameters = {
  loadIncrement: 5,
  durationIncrementSeconds: 60,
  distanceIncrementMeters: 250,
};

/**
 * Resolve the deterministic parameters for a version's rule IDs.
 *
 * Unknown or incomplete rule data never becomes an exception in an active
 * workout. The domain uses conservative, documented defaults until the
 * program author supplies a reviewed rule, while the selected strategy still
 * controls the calculation in progression.ts.
 */
export function resolveProgressionParameters(
  ruleIds: readonly EntityId[],
  strategy: ProgressionStrategy,
  unitSystem: UnitSystem,
): DeterministicProgressionParameters {
  const rule = ruleIds
    .map((ruleId) => progressionRuleCatalogue.find((candidate) => candidate.id === ruleId))
    .find((candidate) => candidate?.strategy === strategy);

  if (!rule) return { ...safeDefaults };

  const parameters = rule.parameters;
  const unitLoadKey = unitSystem === 'imperial' ? 'loadIncrementImperial' : 'loadIncrementMetric';
  const totalRepTarget = readPositiveNumber(parameters.totalRepTarget);

  return {
    loadIncrement:
      readPositiveNumber(parameters[unitLoadKey]) ??
      readPositiveNumber(parameters.loadIncrement) ??
      safeDefaults.loadIncrement,
    durationIncrementSeconds:
      readPositiveNumber(parameters.durationIncrementSeconds) ??
      safeDefaults.durationIncrementSeconds,
    distanceIncrementMeters:
      readPositiveNumber(parameters.distanceIncrementMeters) ??
      safeDefaults.distanceIncrementMeters,
    ...(totalRepTarget === undefined ? {} : { totalRepTarget }),
    ...(typeof parameters.skillReady === 'boolean' ? { skillReady: parameters.skillReady } : {}),
  };
}

function readPositiveNumber(value: string | number | boolean | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return value;
}
