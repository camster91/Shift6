import { equipmentCatalog } from './equipment';
import {
  accessibilityNeedOptions,
  movementConsiderationOptions,
  type AccessibilityNeed,
  type MovementConsideration,
} from './considerations';
import {
  coachInterventionOptions,
  coachToneOptions,
  experienceOptions,
  goalOptions,
  healthConnectionOptions,
  preferredTrainingTimeOptions,
  unitOptions,
  type OnboardingDraft,
} from './onboarding';

export const onboardingFlows = {
  essential: [1, 2, 3, 4, 6, 9],
  detailed: Array.from({ length: 10 }, (_, index) => index),
  optional: [1, 2, 3, 4, 6, 0, 5, 7, 8, 9],
};

export interface OnboardingRecoveryState {
  version: 1;
  flow: keyof typeof onboardingFlows;
  step: number;
  draft: OnboardingDraft;
  movementConsiderations: MovementConsideration[];
  accessibilityNeeds: AccessibilityNeed[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const listed = (value: unknown, choices: readonly unknown[]) => choices.includes(value);
const nullable = (value: unknown, choices: readonly unknown[]) =>
  value === null || listed(value, choices);
const arrayOf = (value: unknown, choices: readonly unknown[]) =>
  Array.isArray(value) &&
  value.length <= choices.length &&
  value.every((item) => listed(item, choices));

/** An interrupted setup is local input, never a completed or synced profile. */
export function parseOnboardingRecoveryState(value: unknown): OnboardingRecoveryState | null {
  if (!record(value) || value.version !== 1 || !record(value.draft)) return null;
  if (!listed(value.flow, Object.keys(onboardingFlows))) return null;
  const flow = value.flow as OnboardingRecoveryState['flow'];
  if (
    !Number.isInteger(value.step) ||
    (value.step as number) < 0 ||
    (value.step as number) >= onboardingFlows[flow].length
  )
    return null;
  const draft = value.draft;
  if (
    typeof draft.displayName !== 'string' ||
    draft.displayName.length > 200 ||
    !arrayOf(
      draft.goals,
      goalOptions.map((option) => option.value),
    ) ||
    !nullable(
      draft.experience,
      experienceOptions.map((option) => option.value),
    ) ||
    !arrayOf(
      draft.equipmentIds,
      equipmentCatalog.map((option) => option.id),
    ) ||
    !nullable(draft.trainingDaysPerWeek, [2, 3, 4, 5, 6]) ||
    !nullable(draft.preferredSessionMinutes, [20, 30, 45, 60]) ||
    !nullable(
      draft.preferredTrainingTime,
      preferredTrainingTimeOptions.map((option) => option.value),
    ) ||
    !nullable(
      draft.unitSystem,
      unitOptions.map((option) => option.value),
    ) ||
    !nullable(
      draft.coachTone,
      coachToneOptions.map((option) => option.value),
    ) ||
    !nullable(
      draft.coachIntervention,
      coachInterventionOptions.map((option) => option.value),
    ) ||
    !nullable(
      draft.healthConnection,
      healthConnectionOptions.map((option) => option.value),
    ) ||
    !arrayOf(
      value.movementConsiderations,
      movementConsiderationOptions.map((option) => option.value),
    ) ||
    !arrayOf(
      value.accessibilityNeeds,
      accessibilityNeedOptions.map((option) => option.value),
    )
  )
    return null;
  return value as unknown as OnboardingRecoveryState;
}
