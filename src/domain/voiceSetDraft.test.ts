import { parseVoiceSet, type VoiceSetBinding } from './voiceSetDraft';
const binding: VoiceSetBinding = {
  ownerId: 'a',
  sessionId: 's',
  programVersionId: 'v',
  workoutExerciseId: 'w',
  exerciseId: 'e',
  setNumber: 1,
  loadUnit: 'metric',
  required: ['reps'],
  allowed: ['reps', 'load', 'rpe', 'rir'],
};
test('explicit results and words, no planned-value inference', () => {
  expect(parseVoiceSet('eight reps, forty kilograms, two reps left', binding)).toEqual({
    values: { reps: '8', load: '40', rir: '2' },
    unresolved: [],
  });
  expect(parseVoiceSet('forty kilograms', binding).unresolved).toContain(
    'Report reps explicitly; a planned value is not a result.',
  );
});
test('actual target unit, independent of profile presentation', () => {
  expect(parseVoiceSet('8 reps, 40 pounds', binding).values.load).toBe(String(40 * 0.45359237));
  expect(
    parseVoiceSet('8 reps, 40 kilograms', { ...binding, loadUnit: 'imperial' }).values.load,
  ).toBe(String(40 / 0.45359237));
});
test.each([
  '8 reps, 9 reps',
  'one two reps',
  '8 reps, forty',
  '8 reps, minus 2 pounds',
  '8 reps, rpe 11',
  '8.5 reps',
  '8 reps then save',
])('ambiguous or invalid %s stays unresolved', (text) => {
  expect(parseVoiceSet(text, binding).unresolved.length).toBeGreaterThan(0);
});
test('time and distance have canonical seconds and meters only for appropriate sets', () => {
  const timed = {
    ...binding,
    required: ['duration', 'distance'] as const,
    allowed: ['duration', 'distance'] as const,
  };
  expect(parseVoiceSet('two minutes, one point five kilometers', timed)).toEqual({
    values: { duration: '120', distance: '1500' },
    unresolved: [],
  });
  expect(parseVoiceSet('8 reps, thirty seconds', binding).unresolved).toContain(
    'duration does not belong to this set. Use manual entry.',
  );
});
