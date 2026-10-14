import { appendConfirmedLocalMemory, memoryProvenance } from './coachMemory';
import type { CoachMemorySnapshot } from '../db/coachMemoryRepository';
import { demoUser } from '../domain/fixtures/home';
const snapshot: CoachMemorySnapshot = {
  owner: 'owner',
  enabled: true,
  preferenceUpdatedAt: '2026-10-13T12:00:00.000Z',
  profile: {
    user: { ...demoUser, id: 'owner', preferredTrainingTime: 'morning' },
    coachTone: 'concise',
    coachIntervention: 'balanced',
    healthConnection: 'not-now',
    completedAt: '2026-10-13T12:00:00.000Z',
  },
  facts: [
    {
      id: 'local-confirmed',
      userId: 'owner',
      value: { kind: 'training-time', value: 'evening' },
      revision: 1,
      operationId: 'confirm',
      confirmedAt: '2026-10-13T12:00:00.000Z',
      updatedAt: '2026-10-13T12:00:00.000Z',
    },
  ],
};
const message = {
  kind: 'message' as const,
  text: 'The saved record has one completed session.',
  factsUsed: ['completed workout count'],
};
test('enabled local preferences stay separate from canonical facts and disclose conflicts', () => {
  const before = JSON.stringify(snapshot);
  const result = appendConfirmedLocalMemory(message, snapshot);
  expect(result.text).toContain('Training time: evening');
  expect(result.text).toContain('Differs from your current setup');
  expect(result.text).toContain(message.text);
  expect(JSON.stringify(snapshot)).toBe(before);
  expect(memoryProvenance(snapshot.facts[0]!, { ...snapshot, profile: null })).toContain(
    'provenance is missing',
  );
});
test('disabled memory and urgent routes expose no preference values', () => {
  expect(appendConfirmedLocalMemory(message, { ...snapshot, enabled: false })).toBe(message);
  const safety = { ...message, kind: 'safety-route' as const, text: 'Stop training.' };
  expect(appendConfirmedLocalMemory(safety, snapshot)).toBe(safety);
});
