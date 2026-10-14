import { equipmentCatalog } from './equipment';
import {
  getOnboardingMissingFields,
  type OnboardingDraft,
  goalOptions,
  experienceOptions,
  unitOptions,
  coachToneOptions,
  coachInterventionOptions,
  healthConnectionOptions,
  preferredTrainingTimeOptions,
} from './onboarding';
import { onboardingFlows } from './onboardingRecovery';

/** Existing question IDs only. No inferred answers or conversational transcript. */
export function nextCoachSetupQuestion(draft: OnboardingDraft): number {
  return (
    onboardingFlows.detailed.find(
      (question) => question !== 9 && getOnboardingMissingFields(question, draft).length > 0,
    ) ?? 9
  );
}

export const coachSetupPrompts: Record<number, string> = {
  0: 'What name would you like to use?',
  1: 'What would you like training to support?',
  2: 'Which description matches your own training experience?',
  3: 'What equipment can you actually access? Bodyweight is an option.',
  4: 'Choose the days, session length and usual time that fit your week.',
  5: 'You can share optional movement and accessibility preferences. Skipping does not imply medical clearance.',
  6: 'Which units should your setup use?',
  7: 'Health connections are optional. This choice does not grant permissions.',
  8: 'How would you like Coach to communicate?',
  9: 'Review every choice below. Edit anything before explicitly saving your setup.',
};

export function coachSetupReview(draft: OnboardingDraft) {
  const label = (options: readonly { value: string; label: string }[], value: string | null) =>
    options.find((option) => option.value === value)?.label ?? 'Not chosen';
  return [
    { question: 0, name: 'Name', value: draft.displayName.trim() || 'Not chosen' },
    {
      question: 1,
      name: 'Training focus',
      value: draft.goals.map((goal) => label(goalOptions, goal)).join(', ') || 'Not chosen',
    },
    {
      question: 2,
      name: 'Experience (self-described)',
      value: label(experienceOptions, draft.experience),
    },
    {
      question: 3,
      name: 'Available equipment',
      value:
        draft.equipmentIds
          .map((id) => equipmentCatalog.find((item) => item.id === id)?.name ?? 'Unknown equipment')
          .join(', ') || 'Not chosen',
    },
    {
      question: 4,
      name: 'Schedule',
      value: `${draft.trainingDaysPerWeek ?? 'Not chosen'} days/week · ${draft.preferredSessionMinutes ?? 'Not chosen'} minutes · ${label(preferredTrainingTimeOptions, draft.preferredTrainingTime)}`,
    },
    { question: 6, name: 'Units', value: label(unitOptions, draft.unitSystem) },
    {
      question: 7,
      name: 'Optional health preference',
      value: label(healthConnectionOptions, draft.healthConnection),
    },
    {
      question: 8,
      name: 'Coach preferences',
      value: `${label(coachToneOptions, draft.coachTone)} · ${label(coachInterventionOptions, draft.coachIntervention)}`,
    },
  ];
}
