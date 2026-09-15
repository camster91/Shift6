import type { CoachProposal, CoachProposalChange } from '../domain/types';

export type CoachSafetyRoute =
  'standard' | 'urgent-care' | 'professional-evaluation' | 'medication-boundary';

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
    signals: ['insulin', 'medication', 'medicine', 'prescription', 'dosage', 'dose of'],
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
      'diagnose',
      'diagnosis',
      'is this an injury',
    ],
    response:
      'SHIFT6 cannot diagnose health conditions. Pause the affected activity and seek qualified medical advice, especially if symptoms persist or worsen.',
    shouldStopTraining: true,
  },
];

const allowedChangeFields: Record<CoachProposalChange['type'], readonly string[]> = {
  'target-change': ['load', 'reps', 'durationSeconds', 'distanceMeters', 'rpe', 'rir', 'tempo'],
  'exercise-substitution': ['exerciseId', 'variantId'],
  'set-count-change': ['setCount'],
  'schedule-change': ['dayOfWeek', 'daysPerWeek'],
  'program-change': ['programId'],
};

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
  });

  return errors;
}

export function isValidCoachProposal(proposal: CoachProposal): boolean {
  return validateCoachProposal(proposal).length === 0;
}
