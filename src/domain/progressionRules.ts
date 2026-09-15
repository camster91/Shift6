import type { EntityId, ProgressionRule, ProgressionStrategy, UnitSystem } from './types';

export interface DeterministicProgressionParameters {
  loadIncrement: number;
  durationIncrementSeconds: number;
  distanceIncrementMeters: number;
  totalRepTarget?: number;
  skillReady?: boolean;
}

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

const defaultRuleParameters: Readonly<
  Record<ProgressionStrategy, ProgressionRule['parameters']>
> = {
  'linear-load': { loadIncrementImperial: 5, loadIncrementMetric: 2.5 },
  'double-progression': { loadIncrementImperial: 5, loadIncrementMetric: 2.5 },
  'rep-target': {
    loadIncrementImperial: 5,
    loadIncrementMetric: 2.5,
    totalRepTarget: 30,
  },
  'rpe-rir': { loadIncrementImperial: 5, loadIncrementMetric: 2.5 },
  volume: {},
  density: { durationIncrementSeconds: 10 },
  time: { durationIncrementSeconds: 15 },
  distance: { distanceIncrementMeters: 250 },
  cardio: { durationIncrementSeconds: 60, distanceIncrementMeters: 250 },
  skill: {},
};

export const defaultProgressionRules: readonly ProgressionRule[] = (
  Object.entries(defaultRuleParameters) as [
    ProgressionStrategy,
    ProgressionRule['parameters'],
  ][]
).map(([strategy, parameters]) => ({
  id: defaultProgressionRuleId(strategy),
  strategy,
  scope: 'program',
  parameters,
}));

export const progressionRuleCatalogue: readonly ProgressionRule[] = [
  barbell30DoubleProgressionRule,
  ...defaultProgressionRules,
];

const safeDefaults: DeterministicProgressionParameters = {
  loadIncrement: 5,
  durationIncrementSeconds: 60,
  distanceIncrementMeters: 250,
};

export function defaultProgressionRuleId(strategy: ProgressionStrategy): string {
  return `rule-default-${strategy}`;
}

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
