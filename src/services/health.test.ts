import { UnavailableHealthProvider, healthTypesForPreference, type HealthDataType } from './health';

describe('health provider boundary', () => {
  it('does not claim availability or fabricate samples without a native adapter', async () => {
    const provider = new UnavailableHealthProvider();
    const types: HealthDataType[] = ['steps', 'workouts'];

    await expect(provider.isAvailable()).resolves.toBe(false);
    await expect(provider.requestPermissions(types)).resolves.toEqual({
      status: 'unavailable',
      grantedTypes: [],
      deniedTypes: types,
    });
    await expect(
      provider.readSummaries(types, {
        startAt: '2026-09-01T00:00:00.000Z',
        endAt: '2026-09-07T23:59:59.999Z',
      }),
    ).resolves.toEqual([]);
  });

  it('keeps the onboarding health choice opt-in', () => {
    expect(healthTypesForPreference('not-now')).toEqual([]);
    expect(healthTypesForPreference('apple-health')).toContain('steps');
    expect(healthTypesForPreference('health-connect')).toContain('sleep-duration');
  });
});
