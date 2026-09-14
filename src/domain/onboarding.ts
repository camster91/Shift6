import type {
  EntityId,
  ExperienceLevel,
  Goal,
  CoachIntervention,
  CoachTone,
  HealthConnectionPreference,
  OnboardingProfile,
  Program,
  UnitSystem,
} from './types';

export interface OnboardingDraft {
  displayName: string;
  goals: Goal[];
  experience: ExperienceLevel | null;
  equipmentIds: EntityId[];
  trainingDaysPerWeek: number | null;
  preferredSessionMinutes: number | null;
  unitSystem: UnitSystem | null;
  coachTone: CoachTone | null;
  coachIntervention: CoachIntervention | null;
  healthConnection: HealthConnectionPreference | null;
}

export interface ProgramRecommendation {
  program: Program;
  score: number;
  compatible: boolean;
  reasons: string[];
  missingRequiredEquipmentIds: EntityId[];
}

export interface RecommendationPreferences {
  goals: readonly Goal[];
  experience: ExperienceLevel;
  equipmentIds: readonly EntityId[];
  trainingDaysPerWeek: number;
  preferredSessionMinutes: number;
}

export const goalOptions: readonly { value: Goal; label: string; description: string }[] = [
  {
    value: 'general-health',
    label: 'General health',
    description: 'Build a balanced, sustainable routine.',
  },
  { value: 'strength', label: 'Strength', description: 'Get stronger with progressive training.' },
  {
    value: 'muscle',
    label: 'Muscle',
    description: 'Build muscle with consistent resistance work.',
  },
  {
    value: 'conditioning',
    label: 'Conditioning',
    description: 'Improve stamina and work capacity.',
  },
  {
    value: 'fat-loss-support',
    label: 'Fat-loss support',
    description: 'Train consistently while supporting a broader goal.',
  },
  { value: 'mobility', label: 'Mobility', description: 'Move with more control and confidence.' },
  {
    value: 'athletic-performance',
    label: 'Athletic performance',
    description: 'Develop power, speed, and useful strength.',
  },
  {
    value: 'healthy-ageing',
    label: 'Healthy ageing',
    description: 'Build strength, balance, and aerobic capacity for life.',
  },
  {
    value: 'consistent-training',
    label: 'Consistent training',
    description: 'Make showing up feel easier and more repeatable.',
  },
];

export const experienceOptions: readonly {
  value: ExperienceLevel;
  label: string;
  description: string;
}[] = [
  { value: 'beginner', label: 'Beginner', description: 'I am new to structured training.' },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'I have training experience and want a clear next block.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'I am comfortable managing structured progression.',
  },
];

export const unitOptions: readonly { value: UnitSystem; label: string; description: string }[] = [
  { value: 'imperial', label: 'Imperial', description: 'Pounds, miles, and feet.' },
  { value: 'metric', label: 'Metric', description: 'Kilograms, kilometres, and metres.' },
];

export const coachToneOptions: readonly {
  value: CoachTone;
  label: string;
  description: string;
}[] = [
  { value: 'concise', label: 'Concise', description: 'Short cues and clear next actions.' },
  {
    value: 'supportive',
    label: 'Supportive',
    description: 'Encouraging context with a calm tone.',
  },
  { value: 'technical', label: 'Technical', description: 'More detail about training decisions.' },
];

export const coachInterventionOptions: readonly {
  value: CoachIntervention;
  label: string;
  description: string;
}[] = [
  {
    value: 'conservative',
    label: 'Conservative',
    description: 'Only surface changes when the evidence is strong.',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Offer practical adjustments while keeping a reserve.',
  },
  {
    value: 'proactive',
    label: 'Proactive',
    description: 'Call out useful opportunities earlier for review.',
  },
];

export const healthConnectionOptions: readonly {
  value: HealthConnectionPreference;
  label: string;
  description: string;
}[] = [
  {
    value: 'not-now',
    label: 'Not now',
    description: 'Keep SHIFT6 fully usable without health access.',
  },
  {
    value: 'apple-health',
    label: 'Apple Health',
    description: 'Connect later to bring in supported movement and recovery summaries.',
  },
  {
    value: 'health-connect',
    label: 'Health Connect',
    description: 'Connect later to bring in supported movement and recovery summaries.',
  },
];

export function createOnboardingDraft(displayName = ''): OnboardingDraft {
  return {
    displayName,
    goals: [],
    experience: null,
    equipmentIds: [],
    trainingDaysPerWeek: null,
    preferredSessionMinutes: null,
    unitSystem: null,
    coachTone: null,
    coachIntervention: null,
    healthConnection: null,
  };
}

export function fromOnboardingProfile(profile: OnboardingProfile): OnboardingDraft {
  return {
    displayName: profile.user.displayName,
    goals: [...profile.user.goals],
    experience: profile.user.experience,
    equipmentIds: [...profile.user.equipmentIds],
    trainingDaysPerWeek: profile.user.trainingDaysPerWeek,
    preferredSessionMinutes: profile.user.preferredSessionMinutes,
    unitSystem: profile.user.unitSystem,
    coachTone: profile.coachTone,
    coachIntervention: profile.coachIntervention,
    healthConnection: profile.healthConnection,
  };
}

export function isOnboardingComplete(draft: OnboardingDraft): boolean {
  return Boolean(
    draft.displayName.trim() &&
    draft.goals.length > 0 &&
    draft.experience &&
    draft.trainingDaysPerWeek &&
    draft.preferredSessionMinutes &&
    draft.unitSystem &&
    draft.coachTone &&
    draft.coachIntervention &&
    draft.healthConnection,
  );
}

export function toOnboardingProfile(
  draft: OnboardingDraft,
  now: string,
  userId = 'guest-user',
): OnboardingProfile {
  if (!isOnboardingComplete(draft)) {
    throw new Error('Onboarding is incomplete');
  }

  return {
    user: {
      id: userId,
      displayName: draft.displayName.trim(),
      unitSystem: draft.unitSystem as UnitSystem,
      goals: draft.goals,
      experience: draft.experience as ExperienceLevel,
      equipmentIds: draft.equipmentIds,
      trainingDaysPerWeek: draft.trainingDaysPerWeek as number,
      preferredSessionMinutes: draft.preferredSessionMinutes as number,
      createdAt: now,
      updatedAt: now,
    },
    coachTone: draft.coachTone as CoachTone,
    coachIntervention: draft.coachIntervention as CoachIntervention,
    healthConnection: draft.healthConnection as HealthConnectionPreference,
    completedAt: now,
  };
}

export function recommendPrograms(
  programs: readonly Program[],
  preferences: RecommendationPreferences,
): ProgramRecommendation[] {
  const equipment = new Set(preferences.equipmentIds);

  return programs
    .map((program) => {
      const missingRequiredEquipmentIds = program.requiredEquipmentIds.filter(
        (equipmentId) => !equipment.has(equipmentId),
      );
      const matchingGoals = program.goals.filter((goal) => preferences.goals.includes(goal));
      const matchesExperience = program.experience.includes(preferences.experience);
      const daysDifference = Math.abs(program.daysPerWeek - preferences.trainingDaysPerWeek);
      const durationDifference = Math.abs(
        program.sessionLengthMinutes - preferences.preferredSessionMinutes,
      );
      const compatible = missingRequiredEquipmentIds.length === 0;
      const reasons: string[] = [];
      let score = 0;

      if (matchingGoals.length > 0) {
        score += matchingGoals.length * 4;
        reasons.push(`Matches your ${matchingGoals[0]!.replaceAll('-', ' ')} goal.`);
      }
      if (matchesExperience) {
        score += 3;
        reasons.push(`Designed for ${preferences.experience} training experience.`);
      }
      if (daysDifference === 0) {
        score += 3;
        reasons.push(`Fits your ${preferences.trainingDaysPerWeek}-day schedule.`);
      } else if (daysDifference === 1) {
        score += 1;
        reasons.push(`Close to your ${preferences.trainingDaysPerWeek}-day schedule.`);
      }
      if (durationDifference === 0) {
        score += 2;
        reasons.push(`Fits your ${preferences.preferredSessionMinutes}-minute sessions.`);
      } else if (durationDifference <= 10) {
        score += 1;
        reasons.push(
          `Close to your ${preferences.preferredSessionMinutes}-minute session preference.`,
        );
      }
      if (compatible) {
        score += 4;
        reasons.push('Uses equipment you have available.');
      } else {
        reasons.push(
          `Needs ${missingRequiredEquipmentIds.length} more required equipment item${missingRequiredEquipmentIds.length === 1 ? '' : 's'}.`,
        );
      }

      return { program, score, compatible, reasons, missingRequiredEquipmentIds };
    })
    .sort((left, right) => {
      if (left.compatible !== right.compatible) return left.compatible ? -1 : 1;
      if (left.score !== right.score) return right.score - left.score;
      return left.program.title.localeCompare(right.program.title);
    });
}
