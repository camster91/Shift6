import { goalFromCanonical, goalToCanonical, goalUnit, goalValueLabel } from './goalPresentation';
test('imperial load and distance convert at the persistence boundary without rounding', () => {
  expect(goalToCanonical(100, 'load-for-reps', 'imperial')).toBeCloseTo(45.359237, 8);
  expect(goalToCanonical(1, 'distance', 'imperial')).toBe(1609.344);
  expect(goalFromCanonical(1609.344, 'distance', 'imperial')).toBe(1);
  expect(
    goalFromCanonical(
      goalToCanonical(135.5, 'load-for-reps', 'imperial'),
      'load-for-reps',
      'imperial',
    ),
  ).toBeCloseTo(135.5, 12);
});
test('display includes units and leaves duration, repetitions and missing data honest', () => {
  expect(goalValueLabel(1609.344, 'distance', 'imperial')).toBe('1 miles');
  expect(goalValueLabel(45.359237, 'load-for-reps', 'imperial')).toBe('100 lb');
  expect(goalValueLabel(undefined, 'distance', 'imperial')).toBe('Not measured');
  expect(goalToCanonical(60, 'fixed-distance-time', 'imperial')).toBe(60);
  expect(goalUnit('hold-duration', 'imperial')).toBe('seconds');
  expect(goalValueLabel(false, 'completion', 'imperial')).toBe('Not completed');
});
