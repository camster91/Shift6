import type { CoachMemorySnapshot } from '../db/coachMemoryRepository';
import type { CoachMemoryFact, CoachMemoryValue } from '../domain/localPersistence';
import type { CoachMessageResult } from './contracts';
import { equipmentCatalog } from '../domain/equipment';

export const memoryKindLabels: Record<CoachMemoryValue['kind'], string> = {
  'training-time': 'Training time',
  'session-minutes': 'Session minutes',
  equipment: 'Equipment preference',
  'coach-style': 'Coach style',
};
export function memoryValueLabel(value: CoachMemoryValue): string {
  if (value.kind === 'equipment')
    return value.value.length
      ? value.value
          .map((id) => equipmentCatalog.find((item) => item.id === id)?.name ?? 'Unknown equipment')
          .join(', ')
      : 'No equipment selected';
  return String(value.value);
}
export function memoryProvenance(fact: CoachMemoryFact, snapshot: CoachMemorySnapshot): string {
  const profile = snapshot.profile;
  if (!profile || profile.user.id !== fact.userId)
    return 'Current profile provenance is missing. This preference cannot replace training records.';
  const canonical =
    fact.value.kind === 'training-time'
      ? profile.user.preferredTrainingTime
      : fact.value.kind === 'session-minutes'
        ? profile.user.preferredSessionMinutes
        : fact.value.kind === 'coach-style'
          ? profile.coachTone
          : [...profile.user.equipmentIds].sort();
  const practical =
    fact.value.kind === 'equipment' ? [...fact.value.value].sort() : fact.value.value;
  return JSON.stringify(canonical) === JSON.stringify(practical)
    ? 'Matches your current setup. This is a confirmed local preference, not a training result.'
    : 'Differs from your current setup. Your saved profile, plan and results remain authoritative; memory does not change them.';
}
export function appendConfirmedLocalMemory(
  message: CoachMessageResult,
  snapshot: CoachMemorySnapshot,
): CoachMessageResult {
  if (
    !snapshot.enabled ||
    message.kind !== 'message' ||
    !snapshot.profile ||
    !snapshot.facts.length
  )
    return message;
  const notes = snapshot.facts
    .slice(0, 4)
    .map(
      (fact) =>
        `${memoryKindLabels[fact.value.kind]}: ${memoryValueLabel(fact.value).slice(0, 160)}. ${memoryProvenance(fact, snapshot)}`,
    );
  return {
    ...message,
    text: `${message.text}\n\nConfirmed local preferences (no plan changes): ${notes.join(' ')}`,
    factsUsed: [...message.factsUsed, 'confirmed local practical preferences'],
  };
}
