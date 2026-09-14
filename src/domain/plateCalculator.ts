import type { UnitSystem } from './types';

export interface PlateInventory {
  weight: number;
  count: number;
}

export interface PlatePair {
  weight: number;
  pairCount: number;
}

export type PlateCalculationStatus = 'exact' | 'underloaded' | 'invalid';

export interface PlateCalculation {
  status: PlateCalculationStatus;
  targetLoad: number;
  barbellLoad: number;
  requestedPlateLoad: number;
  loadedPlateLoad: number;
  achievableLoad: number;
  perSide: PlatePair[];
  message: string;
}

export const defaultBarbellWeights: Readonly<Record<UnitSystem, number>> = {
  imperial: 45,
  metric: 20,
};

const defaultInventories: Readonly<Record<UnitSystem, readonly PlateInventory[]>> = {
  imperial: [
    { weight: 45, count: 2 },
    { weight: 25, count: 2 },
    { weight: 10, count: 2 },
    { weight: 5, count: 2 },
    { weight: 2.5, count: 2 },
  ],
  metric: [
    { weight: 20, count: 2 },
    { weight: 15, count: 2 },
    { weight: 10, count: 2 },
    { weight: 5, count: 2 },
    { weight: 2.5, count: 2 },
    { weight: 1.25, count: 2 },
  ],
};

const INTEGER_SCALE = 1000;
const MAX_LOAD = 10000;

export function getDefaultPlateInventory(unitSystem: UnitSystem): PlateInventory[] {
  return defaultInventories[unitSystem].map((plate) => ({ ...plate }));
}

/**
 * Finds the heaviest safe symmetric plate loading that does not exceed the
 * requested total. The barbell is excluded from `perSide`; `pairCount` is the
 * number of plates of that size on each side. An exact result is preferred,
 * while an underloaded result remains explicit instead of suggesting an unsafe
 * overshoot. Counts are total plates, so an unpaired plate is never loaded.
 */
export function calculatePlateLoadout(input: {
  targetLoad: number;
  barbellLoad: number;
  availablePlates: readonly PlateInventory[];
}): PlateCalculation {
  const { targetLoad, barbellLoad, availablePlates } = input;
  if (!isValidLoad(targetLoad) || !isValidLoad(barbellLoad)) {
    return invalidResult(targetLoad, barbellLoad, 'Enter valid non-negative loads.');
  }
  if (targetLoad < barbellLoad) {
    return invalidResult(
      targetLoad,
      barbellLoad,
      'The target must be at least the barbell weight before plates are added.',
    );
  }

  const normalized = normalizeInventory(availablePlates);
  if (!normalized) {
    return invalidResult(
      targetLoad,
      barbellLoad,
      'Plate weights must be positive and counts must be whole numbers.',
    );
  }

  const requestedPlateLoad = targetLoad - barbellLoad;
  const targetUnits = Math.round(requestedPlateLoad * INTEGER_SCALE);
  const states = new Map<number, Selection>([[0, { pairs: [], plateCount: 0 }]]);

  for (const plate of normalized) {
    const pairWeight = Math.round(plate.weight * 2 * INTEGER_SCALE);
    const maxPairs = Math.floor(plate.count / 2);
    const currentStates = [...states.entries()];

    for (const [currentWeight, selection] of currentStates) {
      for (let pairCount = 1; pairCount <= maxPairs; pairCount += 1) {
        const nextWeight = currentWeight + pairWeight * pairCount;
        if (nextWeight > targetUnits) break;

        const candidate: Selection = {
          pairs: [...selection.pairs, { weight: plate.weight, pairCount }],
          plateCount: selection.plateCount + pairCount * 2,
        };
        const existing = states.get(nextWeight);
        if (!existing || isBetterSelection(candidate, existing)) {
          states.set(nextWeight, candidate);
        }
      }
    }
  }

  let bestWeight = 0;
  for (const weight of states.keys()) {
    if (weight > bestWeight) bestWeight = weight;
  }

  const selection = states.get(bestWeight) ?? { pairs: [], plateCount: 0 };
  const loadedPlateLoad = bestWeight / INTEGER_SCALE;
  const achievableLoad = barbellLoad + loadedPlateLoad;
  const exact = bestWeight === targetUnits;

  return {
    status: exact ? 'exact' : 'underloaded',
    targetLoad,
    barbellLoad,
    requestedPlateLoad,
    loadedPlateLoad,
    achievableLoad,
    perSide: [...selection.pairs].sort((left, right) => right.weight - left.weight),
    message: exact
      ? 'Exact symmetric loading found.'
      : `Closest safe loading is ${formatNumber(achievableLoad)}; add or change plates for the target.`,
  };
}

function normalizeInventory(inventory: readonly PlateInventory[]): PlateInventory[] | null {
  const combined = new Map<number, number>();
  for (const plate of inventory) {
    if (
      !Number.isFinite(plate.weight) ||
      plate.weight <= 0 ||
      plate.weight > MAX_LOAD ||
      !Number.isInteger(plate.count) ||
      plate.count < 0 ||
      plate.count > 1000
    ) {
      return null;
    }
    combined.set(plate.weight, (combined.get(plate.weight) ?? 0) + plate.count);
  }

  return [...combined.entries()]
    .map(([weight, count]) => ({ weight, count }))
    .sort((left, right) => right.weight - left.weight);
}

function isValidLoad(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_LOAD;
}

function invalidResult(targetLoad: number, barbellLoad: number, message: string): PlateCalculation {
  return {
    status: 'invalid',
    targetLoad,
    barbellLoad,
    requestedPlateLoad: Math.max(0, targetLoad - barbellLoad),
    loadedPlateLoad: 0,
    achievableLoad: barbellLoad,
    perSide: [],
    message,
  };
}

function isBetterSelection(candidate: Selection, existing: Selection): boolean {
  if (candidate.plateCount !== existing.plateCount) {
    return candidate.plateCount < existing.plateCount;
  }

  return selectionSignature(candidate) < selectionSignature(existing);
}

function selectionSignature(selection: Selection): string {
  return selection.pairs
    .map((pair) => `${String(pair.weight).padStart(12, '0')}:${pair.pairCount}`)
    .join('|');
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '');
}

interface Selection {
  pairs: PlatePair[];
  plateCount: number;
}
