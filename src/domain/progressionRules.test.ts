import { demoProgramVersion } from './fixtures/home';
import { progressionRuleCatalogue, resolveProgressionParameters } from './progressionRules';

describe('versioned progression rules', () => {
  it('resolves the reviewed Barbell 30 rule in the user unit system', () => {
    expect(progressionRuleCatalogue).toHaveLength(1);
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

  it('uses conservative defaults when a draft has no reviewed rule yet', () => {
    expect(resolveProgressionParameters([], 'linear-load', 'imperial')).toEqual({
      loadIncrement: 5,
      durationIncrementSeconds: 60,
      distanceIncrementMeters: 250,
    });
  });
});
