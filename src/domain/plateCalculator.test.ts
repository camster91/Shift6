import { calculatePlateLoadout, getDefaultPlateInventory } from './plateCalculator';

describe('plate calculator', () => {
  it('finds an exact symmetric imperial loading', () => {
    const result = calculatePlateLoadout({
      targetLoad: 185,
      barbellLoad: 45,
      availablePlates: getDefaultPlateInventory('imperial'),
    });

    expect(result).toMatchObject({
      status: 'exact',
      requestedPlateLoad: 140,
      loadedPlateLoad: 140,
      achievableLoad: 185,
    });
    expect(result.perSide).toEqual([
      { weight: 45, pairCount: 1 },
      { weight: 25, pairCount: 1 },
    ]);
  });

  it('uses the closest safe loading without overshooting when inventory is limited', () => {
    const result = calculatePlateLoadout({
      targetLoad: 100,
      barbellLoad: 45,
      availablePlates: [
        { weight: 25, count: 2 },
        { weight: 10, count: 2 },
      ],
    });

    expect(result).toMatchObject({
      status: 'underloaded',
      loadedPlateLoad: 50,
      achievableLoad: 95,
    });
    expect(result.achievableLoad).toBeLessThanOrEqual(100);
  });

  it('does not load an unpaired plate and treats the empty bar as exact', () => {
    expect(
      calculatePlateLoadout({
        targetLoad: 45,
        barbellLoad: 45,
        availablePlates: [{ weight: 2.5, count: 1 }],
      }),
    ).toMatchObject({ status: 'exact', perSide: [], achievableLoad: 45 });
  });

  it('rejects a target below the barbell weight', () => {
    expect(
      calculatePlateLoadout({
        targetLoad: 40,
        barbellLoad: 45,
        availablePlates: [],
      }),
    ).toMatchObject({ status: 'invalid' });
  });
});
