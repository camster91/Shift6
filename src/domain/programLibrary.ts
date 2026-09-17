import type {
  ExperienceLevel,
  Goal,
  Program,
  ProgramVersion,
  ProgressionStrategy,
} from './types';
import { assessProgramVersion } from './contentReadiness';
import { foundationalExercises } from './fixtures/exercises';
import { buildLaunchProgramVersion } from './fixtures/programVersions';
import { demoProgramVersion } from './fixtures/home';

const metadata: readonly Omit<Program, 'currentVersionId' | 'isTemplate'>[] = [
  {
    id: 'program-barbell-30',
    slug: 'barbell-30',
    title: 'Barbell 30',
    description: 'Efficient strength sessions with easy cardio between lifts.',
    goals: ['strength', 'consistent-training'],
    targetUser: 'People who want a long-term barbell framework in about 30 minutes.',
    experience: ['beginner', 'intermediate'],
    daysPerWeek: 3,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: [
      'equipment-barbell',
      'equipment-plates',
      'equipment-rack',
      'equipment-bench',
    ],
    optionalEquipmentIds: ['equipment-pull-up-bar', 'equipment-bike'],
    progressionStrategy: 'double-progression',
  },
  {
    id: 'program-shift6-foundations',
    slug: 'shift6-foundations',
    title: 'SHIFT6 Foundations',
    description: 'A beginner-friendly full-body introduction to repeatable training.',
    goals: ['strength', 'general-health', 'consistent-training'],
    targetUser: 'New lifters who want a simple general-fitness starting point.',
    experience: ['beginner'],
    daysPerWeek: 3,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: ['equipment-bodyweight'],
    optionalEquipmentIds: ['equipment-dumbbells'],
    progressionStrategy: 'double-progression',
  },
  {
    id: 'program-strength-3x5',
    slug: 'strength-3x5',
    title: 'Strength 3×5',
    description: 'A simple squat, press, pull, and deadlift progression built around low-rep sets.',
    goals: ['strength'],
    targetUser: 'Lifters who want a compact barbell-focused strength block.',
    experience: ['beginner', 'intermediate'],
    daysPerWeek: 3,
    sessionLengthMinutes: 45,
    requiredEquipmentIds: [
      'equipment-barbell',
      'equipment-plates',
      'equipment-rack',
      'equipment-bench',
    ],
    optionalEquipmentIds: ['equipment-pull-up-bar'],
    progressionStrategy: 'linear-load',
  },
  {
    id: 'program-beginner-gym-3-day',
    slug: 'beginner-gym-3-day',
    title: 'Beginner Gym 3-Day',
    description: 'Three approachable gym sessions using simple free-weight and bodyweight patterns.',
    goals: ['strength', 'general-health', 'consistent-training'],
    targetUser: 'New gym members who want clear sessions without unnecessary complexity.',
    experience: ['beginner'],
    daysPerWeek: 3,
    sessionLengthMinutes: 45,
    requiredEquipmentIds: ['equipment-dumbbells'],
    optionalEquipmentIds: [
      'equipment-bench',
      'equipment-cable-machine',
      'equipment-selectorized-machine',
    ],
    progressionStrategy: 'double-progression',
  },
  {
    id: 'program-upper-lower-hypertrophy',
    slug: 'upper-lower-hypertrophy',
    title: 'Upper/Lower Hypertrophy 4-Day',
    description: 'A four-day upper/lower split with structured volume and rep progression.',
    goals: ['muscle', 'strength'],
    targetUser: 'Intermediate lifters who want a sustainable muscle-building split.',
    experience: ['intermediate', 'advanced'],
    daysPerWeek: 4,
    sessionLengthMinutes: 60,
    requiredEquipmentIds: ['equipment-dumbbells', 'equipment-bench'],
    optionalEquipmentIds: ['equipment-cable-machine', 'equipment-selectorized-machine'],
    progressionStrategy: 'volume',
  },
  {
    id: 'program-push-pull-legs',
    slug: 'push-pull-legs',
    title: 'Push/Pull/Legs',
    description: 'A focused three-day split that can be repeated when recovery and schedule allow.',
    goals: ['muscle', 'strength'],
    targetUser: 'Intermediate lifters who prefer movement-focused training days.',
    experience: ['intermediate', 'advanced'],
    daysPerWeek: 3,
    sessionLengthMinutes: 60,
    requiredEquipmentIds: ['equipment-dumbbells'],
    optionalEquipmentIds: ['equipment-bench', 'equipment-cable-machine', 'equipment-pull-up-bar'],
    progressionStrategy: 'rep-target',
  },
  {
    id: 'program-dumbbell-only',
    slug: 'dumbbell-only',
    title: 'Dumbbell Only',
    description: 'A complete three-day block built around dumbbells and bodyweight.',
    goals: ['strength', 'muscle', 'general-health'],
    targetUser: 'People training at home or in a gym without a barbell setup.',
    experience: ['beginner', 'intermediate'],
    daysPerWeek: 3,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: ['equipment-dumbbells'],
    optionalEquipmentIds: ['equipment-bench'],
    progressionStrategy: 'double-progression',
  },
  {
    id: 'program-minimal-home-gym',
    slug: 'minimal-home-gym',
    title: 'Minimal Home Gym',
    description: 'Practical full-body training for a small home setup.',
    goals: ['strength', 'general-health', 'consistent-training'],
    targetUser: 'Home trainees with limited space and a small equipment collection.',
    experience: ['beginner', 'intermediate'],
    daysPerWeek: 3,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: ['equipment-dumbbells'],
    optionalEquipmentIds: ['equipment-bench', 'equipment-resistance-bands'],
    progressionStrategy: 'double-progression',
  },
  {
    id: 'program-resistance-bands',
    slug: 'resistance-bands',
    title: 'Resistance Bands',
    description: 'Portable resistance training with clear rep targets and simple progressions.',
    goals: ['strength', 'general-health'],
    targetUser: 'People training while travelling or with limited space.',
    experience: ['beginner', 'intermediate'],
    daysPerWeek: 3,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: ['equipment-resistance-bands'],
    optionalEquipmentIds: ['equipment-bodyweight'],
    progressionStrategy: 'rep-target',
  },
  {
    id: 'program-bodyweight-foundations',
    slug: 'bodyweight-foundations',
    title: 'Bodyweight Foundations',
    description: 'Build basic strength, control, and consistency without external load.',
    goals: ['general-health', 'strength', 'mobility'],
    targetUser: 'Beginners who want a no-gym starting point.',
    experience: ['beginner'],
    daysPerWeek: 3,
    sessionLengthMinutes: 20,
    requiredEquipmentIds: ['equipment-bodyweight'],
    optionalEquipmentIds: [],
    progressionStrategy: 'skill',
  },
  {
    id: 'program-calisthenics-strength',
    slug: 'calisthenics-strength',
    title: 'Calisthenics Strength',
    description: 'Progress pull-ups, dips, push-ups, squats, and trunk control across six weeks.',
    goals: ['strength', 'athletic-performance'],
    targetUser: 'Trainees who want bodyweight strength with measurable skill progressions.',
    experience: ['intermediate', 'advanced'],
    daysPerWeek: 3,
    sessionLengthMinutes: 45,
    requiredEquipmentIds: ['equipment-pull-up-bar'],
    optionalEquipmentIds: ['equipment-suspension-trainer'],
    progressionStrategy: 'skill',
  },
  {
    id: 'program-strength-conditioning-hybrid',
    slug: 'strength-conditioning-hybrid',
    title: 'Strength + Conditioning Hybrid',
    description: 'Three strength sessions plus two conditioning days in one coordinated block.',
    goals: ['strength', 'conditioning'],
    targetUser: 'Intermediate trainees who want strength without giving up work capacity.',
    experience: ['intermediate', 'advanced'],
    daysPerWeek: 5,
    sessionLengthMinutes: 45,
    requiredEquipmentIds: ['equipment-dumbbells'],
    optionalEquipmentIds: ['equipment-bike', 'equipment-rower', 'equipment-kettlebell'],
    progressionStrategy: 'cardio',
  },
  {
    id: 'program-busy-20',
    slug: 'busy-20',
    title: 'Busy 20',
    description: 'Short full-body sessions designed to protect consistency when time is tight.',
    goals: ['consistent-training', 'general-health'],
    targetUser: 'Busy people who want useful training in about 20 minutes.',
    experience: ['beginner', 'intermediate', 'advanced'],
    daysPerWeek: 4,
    sessionLengthMinutes: 20,
    requiredEquipmentIds: ['equipment-bodyweight'],
    optionalEquipmentIds: ['equipment-dumbbells'],
    progressionStrategy: 'density',
  },
  {
    id: 'program-mobility-strength',
    slug: 'mobility-strength',
    title: 'Mobility + Strength',
    description: 'Strength work paired with dedicated mobility and control practice.',
    goals: ['mobility', 'general-health', 'strength'],
    targetUser: 'People who want strength training with mobility built into the week.',
    experience: ['beginner', 'intermediate'],
    daysPerWeek: 3,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: ['equipment-bodyweight'],
    optionalEquipmentIds: ['equipment-dumbbells', 'equipment-resistance-bands'],
    progressionStrategy: 'skill',
  },
  {
    id: 'program-healthy-ageing',
    slug: 'healthy-ageing',
    title: 'Healthy Ageing',
    description: 'Conservative strength, power, balance, mobility, and aerobic practice.',
    goals: ['healthy-ageing', 'strength', 'mobility'],
    targetUser: 'Adults who want to preserve strength, balance, capacity, and confidence.',
    experience: ['beginner', 'intermediate'],
    daysPerWeek: 3,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: ['equipment-bodyweight'],
    optionalEquipmentIds: ['equipment-dumbbells', 'equipment-bike'],
    progressionStrategy: 'skill',
  },
  {
    id: 'program-return-to-training',
    slug: 'return-to-training',
    title: 'Return to Training',
    description: 'A lower-volume ramp-in for previously trained people rebuilding consistency.',
    goals: ['strength', 'consistent-training', 'general-health'],
    targetUser: 'Previously trained people returning after a meaningful break.',
    experience: ['beginner', 'intermediate', 'advanced'],
    daysPerWeek: 3,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: ['equipment-bodyweight'],
    optionalEquipmentIds: ['equipment-dumbbells'],
    progressionStrategy: 'rpe-rir',
  },
  {
    id: 'program-runner-support',
    slug: 'runner-support',
    title: 'Runner Support',
    description: 'Two strength sessions that support running without trying to replace it.',
    goals: ['strength', 'athletic-performance', 'conditioning'],
    targetUser: 'Runners who want durable strength around an existing running schedule.',
    experience: ['beginner', 'intermediate', 'advanced'],
    daysPerWeek: 2,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: ['equipment-bodyweight'],
    optionalEquipmentIds: ['equipment-dumbbells'],
    progressionStrategy: 'double-progression',
  },
  {
    id: 'program-cyclist-support',
    slug: 'cyclist-support',
    title: 'Cyclist Support',
    description: 'Two strength and trunk-control sessions designed around cycling.',
    goals: ['strength', 'athletic-performance', 'conditioning'],
    targetUser: 'Cyclists who want useful strength without overwhelming riding volume.',
    experience: ['beginner', 'intermediate', 'advanced'],
    daysPerWeek: 2,
    sessionLengthMinutes: 30,
    requiredEquipmentIds: ['equipment-bodyweight'],
    optionalEquipmentIds: ['equipment-dumbbells', 'equipment-bike'],
    progressionStrategy: 'double-progression',
  },
  {
    id: 'program-power-athleticism',
    slug: 'power-athleticism',
    title: 'Power & Athleticism',
    description: 'Power, movement quality, repeatable conditioning, and strength foundations.',
    goals: ['athletic-performance', 'conditioning', 'strength'],
    targetUser: 'Intermediate athletes who can safely perform basic jumping and landing drills.',
    experience: ['intermediate', 'advanced'],
    daysPerWeek: 4,
    sessionLengthMinutes: 45,
    requiredEquipmentIds: ['equipment-bodyweight', 'equipment-plyo-box'],
    optionalEquipmentIds: ['equipment-medicine-ball', 'equipment-dumbbells'],
    progressionStrategy: 'skill',
  },
  {
    id: 'program-cardio-base-strength',
    slug: 'cardio-base-strength',
    title: 'Cardio Base + Strength',
    description: 'Aerobic development paired with two full-body strength sessions.',
    goals: ['conditioning', 'strength', 'general-health'],
    targetUser: 'People who want aerobic consistency without losing strength work.',
    experience: ['beginner', 'intermediate'],
    daysPerWeek: 4,
    sessionLengthMinutes: 40,
    requiredEquipmentIds: ['equipment-bodyweight'],
    optionalEquipmentIds: ['equipment-dumbbells', 'equipment-bike', 'equipment-rower'],
    progressionStrategy: 'cardio',
  },
];

export type ProgramCatalogueStatus = 'published' | 'metadata-draft';
export type ProgramBuildStatus = 'canonical' | 'executable-draft' | 'metadata-only';

export interface ProgramCatalogueEntry {
  program: Program;
  status: ProgramCatalogueStatus;
  buildStatus: ProgramBuildStatus;
  version?: ProgramVersion;
}

export const programLibrary: readonly ProgramCatalogueEntry[] = metadata.map((entry) => {
  const isCanonicalBarbell30 = entry.slug === 'barbell-30';
  const currentVersionId = isCanonicalBarbell30 ? demoProgramVersion.id : `${entry.id}-version-1`;
  const program: Program = {
    ...entry,
    currentVersionId,
    isTemplate: true,
  };
  const version = isCanonicalBarbell30
    ? demoProgramVersion
    : buildLaunchProgramVersion(program);
  const releaseReady =
    version !== undefined &&
    assessProgramVersion(program, version, foundationalExercises).readyForPublication;

  return {
    program,
    status: releaseReady ? 'published' : 'metadata-draft',
    buildStatus: isCanonicalBarbell30
      ? 'canonical'
      : version === undefined
        ? 'metadata-only'
        : 'executable-draft',
    ...(version ? { version } : {}),
  };
});

export const programLibraryPrograms = programLibrary.map((entry) => entry.program);

export function getProgramCatalogueStatusLabel(status: ProgramCatalogueStatus): string {
  return status === 'published' ? 'Ready to start' : 'Content in review';
}

export function canStartProgramCatalogueEntry(
  entry: ProgramCatalogueEntry,
  allowDraftPreview = false,
): boolean {
  if (!entry.version) return false;
  if (entry.status === 'published') return true;
  return allowDraftPreview && entry.buildStatus !== 'metadata-only';
}

export type ProgramGoal = Goal;
export type ProgramExperience = ExperienceLevel;
export type ProgramStrategy = ProgressionStrategy;
