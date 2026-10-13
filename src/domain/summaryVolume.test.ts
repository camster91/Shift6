import { summaryVolumeLabel } from './summaryVolume';
import type { CompletedSet } from './types';
const actual = (load: number | undefined, reps: number | undefined): CompletedSet => ({
  id: 'synthetic',
  sessionId: 'session',
  workoutExerciseId: 'movement',
  setNumber: 1,
  load,
  reps,
  completedAt: '2026-10-13T12:00:00Z',
  idempotencyKey: 'synthetic',
});
test('legacy loaded sets with unknown or potentially mixed units produce no reconciled volume', () => {
  const sets = [actual(40, 8), actual(100, 5)];
  const before = JSON.stringify(sets);
  expect(summaryVolumeLabel(sets)).toBe('Load units unknown');
  expect(summaryVolumeLabel([actual(40, 8)])).toBe('Load units unknown');
  expect(JSON.stringify(sets)).toBe(before);
  expect(summaryVolumeLabel(sets)).not.toMatch(/lb|kg|820|reps/);
});
test('unloaded, missing or nonfinite load/reps do not manufacture volume measurements', () => {
  expect(summaryVolumeLabel([])).toBe('Not measured');
  expect(
    summaryVolumeLabel([actual(0, 8), actual(undefined, 8), actual(40, undefined), actual(NaN, 8)]),
  ).toBe('Not measured');
});
