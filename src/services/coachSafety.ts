import type { CoachProposal, CoachProposalChange } from '../domain/types';

export type CoachSafetyRoute =
  | 'standard'
  | 'urgent-care'
  | 'professional-evaluation'
  | 'medication-boundary'
  | 'nutrition-boundary';

export interface CoachSafetyResult {
  route: CoachSafetyRoute;
  matchedSignals: string[];
  response: string;
  shouldStopTraining: boolean;
}

interface SafetyRule {
  route: Exclude<CoachSafetyRoute, 'standard'>;
  signals: readonly string[];
  response: string;
  shouldStopTraining: boolean;
}

const safetyRules: readonly SafetyRule[] = [
  {
    route: 'medication-boundary',
    signals: [
      'insulin',
      'medication',
      'medicine',
      'prescription',
      'dosage',
      'dose of',
      'change my dose',
      'adjust my dose',
    ],
    response:
      'SHIFT6 cannot advise on medication or insulin dosing. Please ask your prescribing clinician or pharmacist.',
    shouldStopTraining: false,
  },
  {
    route: 'urgent-care',
    signals: [
      'chest pain',
      'fainting',
      'passed out',
      'severe shortness of breath',
      'trouble breathing',
      'cannot breathe',
      'face droop',
      'slurred speech',
      'one-sided weakness',
      'severe allergic',
    ],
    response:
      'Stop exercising and seek urgent medical care. If symptoms are severe or life-threatening, contact local emergency services now.',
    shouldStopTraining: true,
  },
  {
    route: 'professional-evaluation',
    signals: [
      'serious injury',
      'major injury',
      'broken bone',
      'dislocation',
      'severe pain',
      'sharp pain',
      'worsening pain',
      'radiating pain',
      'numbness',
      'cannot bear weight',
      "can't bear weight",
      'significant swelling',
      'diagnose',
      'diagnosis',
      'is this an injury',
    ],
    response:
      'SHIFT6 cannot diagnose health conditions. Pause the affected activity and seek qualified medical advice, especially if symptoms persist or worsen.',
    shouldStopTraining: true,
  },
  {
    route: 'nutrition-boundary',
    signals: [
      'how many calories',
      'calorie target',
      'macro target',
      'macros should',
      'meal plan',
      'diet plan',
      'what should i eat',
      'what should i drink',
      'nutrition plan',
    ],
    response:
      'SHIFT6 cannot provide individualized nutrition, calorie, macro, or meal-plan advice. Use qualified nutrition guidance that accounts for your health needs.',
    shouldStopTraining: false,
  },
];

const allowedChangeFields: Record<CoachProposalChange['type'], readonly string[]> = {
  'target-change': ['load', 'reps', 'durationSeconds', 'distanceMeters', 'rpe', 'rir', 'tempo'],
  'exercise-substitution': ['exerciseId', 'variantId'],
  'set-count-change': ['setCount'],
  'schedule-change': ['dayOfWeek', 'daysPerWeek'],
  'program-change': ['programId'],
};

const prohibitedProposalTerms = [
  'insulin',
  'medication',
  'medicine',
  'prescription',
  'dosage',
  'dose of',
  'calorie',
  'macro',
  'meal plan',
  'diet plan',
  'nutrition plan',
  'diagnose',
  'diagnosis',
  'treatment',
] as const;

const maxTargetIncrease = 0.25;

export function classifyCoachSafety(message: string): CoachSafetyResult {
  const normalizedMessage = message.trim().toLowerCase();

  for (const rule of safetyRules) {
    const matchedSignals = rule.signals.filter((signal) => normalizedMessage.includes(signal));
    if (matchedSignals.length > 0) {
      return {
        route: rule.route,
        matchedSignals,
        response: rule.response,
        shouldStopTraining: rule.shouldStopTraining,
      };
    }
  }

  return {
    route: 'standard',
    matchedSignals: [],
    response: '',
    shouldStopTraining: false,
  };
}

export function validateCoachProposal(proposal: CoachProposal): string[] {
  const errors: string[] = [];

  if (!proposal.id.trim()) errors.push('Proposal ID is required.');
  if (!proposal.summary.trim()) errors.push('Proposal summary is required.');
  if (proposal.evidence.length === 0) errors.push('At least one evidence item is required.');
  if (proposal.status !== 'pending') {
    errors.push('New coach proposals must start in the pending state.');
  }

  const proposalText = [
    proposal.summary,
    ...proposal.evidence,
    ...proposal.safetyNotes,
    ...proposal.changes.flatMap((change) => [change.field, change.from, change.to]),
  ]
    .join(' ')
    .toLowerCase();
  const unsafeProposalTerms = prohibitedProposalTerms.filter((term) => proposalText.includes(term));
  if (unsafeProposalTerms.length > 0) {
    errors.push(
      `Coach proposals cannot include medication, medical-treatment, or individualized nutrition advice: ${unsafeProposalTerms.join(', ')}.`,
    );
  }

  proposal.changes.forEach((change, index) => {
    const prefix = `Change ${index + 1}`;
    if (change.requiresUserConfirmation !== true) {
      errors.push(`${prefix} must require explicit user confirmation.`);
    }
    if (!change.from.trim() || !change.to.trim()) {
      errors.push(`${prefix} must include both current and proposed values.`);
    }
    if (!allowedChangeFields[change.type].includes(change.field)) {
      errors.push(`${prefix} uses a field that is not allowed for its change type.`);
    }
    if (change.type === 'exercise-substitution' && !change.exerciseId?.trim()) {
      errors.push(`${prefix} must identify the affected exercise.`);
    }
    if (
      (change.workoutId && !change.workoutExerciseId) ||
      (!change.workoutId && change.workoutExerciseId)
    ) {
      errors.push(`${prefix} must include both workout and movement IDs when scoped.`);
    }

    if (change.type === 'target-change') {
      validateTargetChange(change, prefix, errors);
    }
    if (change.type === 'set-count-change') {
      const setCount = parseSimpleNumber(change.to);
      if (setCount === undefined || !Number.isInteger(setCount) || setCount < 1 || setCount > 20) {
        errors.push(`${prefix} set count must stay between 1 and 20.`);
      }
    }
    if (change.type === 'schedule-change') {
      const scheduleValue = parseSimpleNumber(change.to);
      if (
        scheduleValue === undefined ||
        !Number.isInteger(scheduleValue) ||
        scheduleValue < 1 ||
        scheduleValue > 7
      ) {
        errors.push(`${prefix} schedule value must stay between 1 and 7.`);
      }
    }
  });

  return errors;
}

export function isValidCoachProposal(proposal: CoachProposal): boolean {
  return validateCoachProposal(proposal).length === 0;
}

function validateTargetChange(
  change: CoachProposalChange,
  prefix: string,
  errors: string[],
): void {
  if (change.field === 'tempo') return;

  const from = parseSimpleNumber(change.from);
  const to = parseSimpleNumber(change.to);
  if (from === undefined || to === undefined) {
    errors.push(`${prefix} target values must include valid numeric values.`);
    return;
  }

  if (change.field === 'rpe' && (to < 1 || to > 10)) {
    errors.push(`${prefix} RPE must stay between 1 and 10.`);
  }
  if (change.field === 'rir' && (to < 0 || to > 10)) {
    errors.push(`${prefix} RIR must stay between 0 and 10.`);
  }
  if (['load', 'reps', 'durationSeconds', 'distanceMeters'].includes(change.field) && to <= 0) {
    errors.push(`${prefix} ${change.field} must stay above zero.`);
  }

  if (from > 0 && to > from && (to - from) / from > maxTargetIncrease) {
    errors.push(`${prefix} increases ${change.field} by more than the allowed 25%.`);
  }
}

function parseSimpleNumber(value: string): number | undefined {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(?:\s*[a-z%]+)?$/i);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}
