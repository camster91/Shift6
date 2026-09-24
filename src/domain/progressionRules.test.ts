import { demoProgramVersion } from './fixtures/home';
import {
  defaultProgressionRuleId,
  defaultProgressionRules,
  progressionRuleCatalogue,
  resolveProgressionParameters,
} from './progressionRules';
import type { ProgressionStrategy } from './types';

const strategies: readonly ProgressionStrategy[] = [
  'linear-load',
  'double-progression',
  'rep-target',
  'rpe-rir',
  'volume',
  'density',
  'time',
  'distance',
  'cardio',
  'skill',
];

describe('versioned progression rules', () => {
  it('resolves the reviewed Barbell 30 rule in the user unit system', () => {
    expect(
      resolveProgressionParameters(
        demoProgramVersion.progressionRuleIds,
        'double-progression',
        'metric',
      ),
    ).toMatchObject({
      loadIncrement: 2.5,
      durationIncrementSeconds: 60,
      distanceIncrementMeters: 250,
    });
  });

  it('provides an explicit deterministic default rule for every supported strategy', () => {
    expect(defaultProgressionRules).toHaveLength(strategies.length);
    expect(progressionRuleCatalogue).toHaveLength(strategies.length + 1);

    strategies.forEach((strategy) => {
      expect(
        progressionRuleCatalogue.some(
          (rule) => rule.id === defaultProgressionRuleId(strategy) && rule.strategy === strategy,
        ),
      ).toBe(true);
    });
  });

  it('resolves default rule parameters without depending on an AI provider', () => {
    expect(
      resolveProgressionParameters(
        [defaultProgressionRuleId('rep-target')],
        'rep-target',
        'imperial',
      ),
    ).toMatchObject({
      loadIncrement: 5,
      totalRepTarget: 30,
    });

    expect(
      resolveProgressionParameters([defaultProgressionRuleId('cardio')], 'cardio', 'metric'),
    ).toMatchObject({
      durationIncrementSeconds: 60,
      distanceIncrementMeters: 250,
    });
  });

  it('uses conservative defaults when a draft has no version-owned rule yet', () => {
    expect(resolveProgressionParameters([], 'linear-load', 'imperial')).toEqual({
      loadIncrement: 5,
      durationIncrementSeconds: 60,
      distanceIncrementMeters: 250,
    });
  });
});
