import { demoCycle } from './fixtures/home';
import {
  evaluateShift,
  normalizeObservation,
  validateMeasurementProtocol,
  type MeasurementProtocol,
  type Shift,
  type ShiftObservation,
} from './shift';

const cycle = demoCycle;
const repProtocol: MeasurementProtocol = {
  id: 'protocol-reps',
  version: 1,
  metric: 'reps',
  canonicalUnit: 'reps',
  direction: 'higher',
  exerciseId: 'exercise-push-up',
  variantId: 'standard',
  assistance: 'none',
  equipmentSetup: 'floor',
};
const baseShift: Shift = {
  id: 'shift-one',
  userId: cycle.userId,
  cycleId: cycle.id,
  programVersionId: cycle.programVersionId,
  templateId: 'template-reps',
  blockObjective: 'Work toward 12 reps',
  protocol: repProtocol,
  target: 12,
  baseline: { state: 'measured', observationId: 'baseline' },
  reviewState: 'missing',
  nextChoice: 'undecided',
};
function observation(
  id: string,
  value: number | boolean,
  overrides: Partial<ShiftObservation> = {},
): ShiftObservation {
  return {
    id,
    shiftId: baseShift.id,
    protocolId: repProtocol.id,
    protocolVersion: 1,
    measuredAt: id === 'baseline' ? '2026-09-01T10:00:00Z' : '2026-09-10T10:00:00Z',
    source: 'assessment',
    value,
    unit: 'reps',
    ...overrides,
  };
}

describe('Shift outcome integrity', () => {
  it('keeps adherence, latest measurement and personal best separate', () => {
    const training = {
      ...cycle,
      currentWeek: 4,
      weeks: cycle.weeks.map((week) => ({ ...week, completedWorkoutCount: 2 })),
    };
    const result = evaluateShift(baseShift, training, [
      observation('baseline', 5),
      observation('best', 11),
      observation('latest', 8, { measuredAt: '2026-09-15T10:00:00Z' }),
    ]);
    expect(result.cycleWeek).toBe(4);
    expect(result.completedSessions).toBeGreaterThan(0);
    expect(result.latest?.canonicalValue).toBe(8);
    expect(result.personalBest?.canonicalValue).toBe(11);
    expect(result.attainment).toBe('not-met');
    expect(result.change).toBe('improved');
  });
  it('does not infer performance from completed sessions or a missing baseline', () => {
    const result = evaluateShift({ ...baseShift, baseline: { state: 'deferred' } }, cycle, []);
    expect(result.latest).toBeNull();
    expect(result.attainment).toBe('unknown');
    expect(result.change).toBe('not-tested');
  });
  it('handles zero, already-met and exceeded targets without fabricated percentages', () => {
    const zero = evaluateShift(baseShift, cycle, [
      observation('baseline', 0),
      observation('latest', 14),
    ]);
    expect(zero.percentChange).toBeNull();
    expect(zero.absoluteChange).toBe(14);
    expect(zero.latest?.canonicalValue).toBe(14);
    expect(zero.attainment).toBe('met');
    expect(evaluateShift(baseShift, cycle, [observation('baseline', 12)]).baselineAlreadyMet).toBe(
      true,
    );
    expect(
      evaluateShift(baseShift, cycle, [observation('baseline', 12), observation('latest', 9)])
        .attainment,
    ).toBe('not-met');
  });
  it('compares fixed-distance time as lower-is-better and retains original entry units', () => {
    const protocol: MeasurementProtocol = {
      ...repProtocol,
      id: '5k',
      metric: 'fixed-distance-time',
      canonicalUnit: 'seconds',
      direction: 'lower',
      fixedDistanceMeters: 5000,
    };
    const shift: Shift = { ...baseShift, protocol, target: 1500 };
    const measurements = [
      observation('baseline', 28, { protocolId: '5k', unit: 'minutes' }),
      observation('latest', 26, { protocolId: '5k', unit: 'minutes' }),
    ];
    const result = evaluateShift(shift, cycle, measurements);
    expect(measurements[0]?.value).toBe(28);
    expect(result.latest?.canonicalValue).toBe(1560);
    expect(result.change).toBe('improved');
    expect(result.attainment).toBe('not-met');
  });
  it('requires comparable protocol, variant and rep count through versioned identity', () => {
    const protocol: MeasurementProtocol = {
      ...repProtocol,
      id: 'bench-5',
      metric: 'load-for-reps',
      canonicalUnit: 'kg',
      direction: 'higher',
      repCount: 5,
      exerciseId: 'bench',
      variantId: 'barbell',
    };
    expect(
      normalizeObservation(protocol, observation('one', 100, { protocolId: 'bench-5', unit: 'lb' }))
        ?.canonicalValue,
    ).toBeCloseTo(45.359237);
    expect(
      normalizeObservation(
        protocol,
        observation('two', 100, { protocolId: 'bench-5', protocolVersion: 2, unit: 'lb' }),
      ),
    ).toBeNull();
    expect(validateMeasurementProtocol({ ...protocol, repCount: 0 })).toContain(
      'Load protocol needs a positive rep count.',
    );
    const changedVariant: MeasurementProtocol = {
      ...protocol,
      id: 'assisted-bench',
      variantId: 'assisted',
    };
    expect(
      normalizeObservation(
        changedVariant,
        observation('three', 50, { protocolId: 'bench-5', unit: 'kg' }),
      ),
    ).toBeNull();
  });

  it('marks a changed protocol series as non-comparable to the old baseline', () => {
    const revised: Shift = { ...baseShift, protocol: { ...repProtocol, version: 2 } };
    const result = evaluateShift(revised, cycle, [
      observation('baseline', 5),
      observation('latest', 8, { protocolVersion: 2 }),
    ]);
    expect(result.change).toBe('not-comparable');
    expect(result.latest?.canonicalValue).toBe(8);
    expect(result.baseline).toBeNull();
  });
  it('rejects invalid values and mismatched owners without changing history', () => {
    expect(normalizeObservation(repProtocol, observation('negative', -1))).toBeNull();
    expect(normalizeObservation(repProtocol, observation('fraction', 2.5))).toBeNull();
    expect(normalizeObservation(repProtocol, observation('nan', Number.NaN))).toBeNull();
    expect(
      normalizeObservation(repProtocol, observation('wrong-unit', 4, { unit: 'kg' })),
    ).toBeNull();
    expect(() => evaluateShift({ ...baseShift, userId: 'other' }, cycle, [])).toThrow(
      'ownership/version',
    );
  });
  it('keeps correction history while deriving results from the amendment', () => {
    const original = observation('wrong', 20);
    const correction = observation('corrected', 9, {
      correctsObservationId: 'wrong',
      measuredAt: '2026-09-15T10:00:00Z',
    });
    const result = evaluateShift(baseShift, cycle, [
      observation('baseline', 5),
      original,
      correction,
    ]);
    expect(result.latest?.canonicalValue).toBe(9);
    expect(result.personalBest?.canonicalValue).toBe(9);
    expect(original.value).toBe(20);
    const laterResult = observation('later-result', 10, { measuredAt: '2026-09-12T10:00:00Z' });
    expect(
      evaluateShift(baseShift, cycle, [
        observation('baseline', 5),
        original,
        laterResult,
        correction,
      ]).latest?.canonicalValue,
    ).toBe(10);
    const invalidCorrection = observation('invalid', -2, { correctsObservationId: 'corrected' });
    expect(
      evaluateShift(baseShift, cycle, [
        observation('baseline', 5),
        original,
        correction,
        invalidCorrection,
      ]).latest?.canonicalValue,
    ).toBe(9);
    const correctedBaseline = observation('baseline-revised', 4, {
      correctsObservationId: 'baseline',
      measuredAt: '2026-09-02T10:00:00Z',
    });
    expect(
      evaluateShift(baseShift, cycle, [observation('baseline', 5), correctedBaseline, correction])
        .baseline?.canonicalValue,
    ).toBe(4);
  });
  it('resolves correction chains independent of input order and rejects ambiguous amendments', () => {
    const baseline = observation('baseline', 5);
    const original = observation('original', 8, { measuredAt: '2026-09-04T10:00:00Z' });
    const first = observation('first', 9, {
      correctsObservationId: 'original',
      measuredAt: '2026-09-15T10:00:00Z',
    });
    const second = observation('second', 10, {
      correctsObservationId: 'first',
      measuredAt: '2026-09-18T10:00:00Z',
    });
    const later = observation('later', 7, { measuredAt: '2026-09-10T10:00:00Z' });
    const reversed = evaluateShift(baseShift, cycle, [second, later, first, original, baseline]);
    expect(reversed.latest?.observationId).toBe('later');
    expect(reversed.personalBest?.canonicalValue).toBe(10);
    expect(reversed).toEqual(
      evaluateShift(baseShift, cycle, [baseline, original, first, second, later]),
    );

    const competing = observation('competing', 11, { correctsObservationId: 'original' });
    const ambiguous = evaluateShift(baseShift, cycle, [baseline, original, first, competing]);
    expect(ambiguous.latest?.canonicalValue).toBe(8);
    expect(ambiguous.excludedObservationIds).toEqual(
      expect.arrayContaining(['first', 'competing']),
    );
    const dangling = observation('dangling', 20, { correctsObservationId: 'missing' });
    expect(evaluateShift(baseShift, cycle, [baseline, dangling]).latest?.canonicalValue).toBe(5);
  });
  it('allows a closed block without conflating review with target attainment', () => {
    const result = evaluateShift(
      { ...baseShift, reviewState: 'completed', nextChoice: 'maintain' },
      { ...cycle, status: 'complete' },
      [observation('baseline', 5), observation('latest', 8)],
    );
    expect(result.attainment).toBe('not-met');
    expect(result.change).toBe('improved');
  });
});
