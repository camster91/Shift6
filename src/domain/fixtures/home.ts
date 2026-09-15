import type {
  CoachProposal,
  CycleWeek,
  Equipment,
  Program,
  ProgramVersion,
  TrainingCycle,
  User,
  Workout,
  WeeklyScheduleEntry,
} from '../types';

export type { WeeklyScheduleEntry } from '../types';

const now = '2026-09-13T12:00:00.000Z';

export const demoEquipment: Equipment[] = [
  { id: 'equipment-barbell', name: 'Barbell', category: 'free-weight', aliases: ['bar'] },
  { id: 'equipment-plates', name: 'Plates', category: 'free-weight', aliases: ['weight plates'] },
  { id: 'equipment-rack', name: 'Rack', category: 'free-weight', aliases: ['squat rack'] },
  { id: 'equipment-bench', name: 'Bench', category: 'free-weight', aliases: ['flat bench'] },
  {
    id: 'equipment-pull-up-bar',
    name: 'Pull-up bar',
    category: 'bodyweight',
    aliases: ['chin-up bar'],
  },
  { id: 'equipment-bike', name: 'Stationary bike', category: 'cardio', aliases: ['bike'] },
  {
    id: 'equipment-bodyweight',
    name: 'Bodyweight',
    category: 'bodyweight',
    aliases: ['no equipment'],
  },
];

export const demoUser: User = {
  id: 'user-demo-cameron',
  displayName: 'Cameron',
  unitSystem: 'imperial',
  goals: ['strength', 'consistent-training'],
  experience: 'intermediate',
  equipmentIds: demoEquipment.map((equipment) => equipment.id),
  trainingDaysPerWeek: 3,
  preferredSessionMinutes: 30,
  preferredTrainingTime: 'morning',
  createdAt: now,
  updatedAt: now,
};

const workingSets = (prefix: string, reps: number | { min: number; max: number }, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-set-${index + 1}`,
    setNumber: index + 1,
    target: { reps, rir: 2 },
    restSeconds: 120,
  }));

const timedSets = (prefix: string, durationSeconds: number, count = 1) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-set-${index + 1}`,
    setNumber: index + 1,
    target: { durationSeconds },
    restSeconds: 30,
  }));

const strengthA: Workout = {
  id: 'workout-barbell-30-strength-a',
  programVersionId: 'program-version-barbell-30-v1',
  title: 'Strength A',
  dayOfWeek: 1,
  focus: 'strength',
  estimatedDurationMinutes: 30,
  equipmentIds: ['equipment-barbell', 'equipment-plates', 'equipment-rack', 'equipment-bench'],
  exercises: [
    {
      id: 'workout-exercise-strength-a-squat',
      exerciseId: 'exercise-back-squat',
      order: 1,
      section: 'working',
      sets: workingSets('strength-a-squat', 5, 3),
    },
    {
      id: 'workout-exercise-strength-a-bench',
      exerciseId: 'exercise-bench-press',
      order: 2,
      section: 'working',
      sets: workingSets('strength-a-bench', 5, 3),
    },
    {
      id: 'workout-exercise-strength-a-row',
      exerciseId: 'exercise-barbell-row',
      order: 3,
      section: 'working',
      sets: workingSets('strength-a-row', { min: 8, max: 10 }, 3),
    },
    {
      id: 'workout-exercise-strength-a-pull-up',
      exerciseId: 'exercise-pull-up',
      order: 4,
      section: 'working',
      sets: workingSets('strength-a-pull-up', { min: 5, max: 10 }, 2),
    },
  ],
};

const strengthB: Workout = {
  id: 'workout-barbell-30-strength-b',
  programVersionId: 'program-version-barbell-30-v1',
  title: 'Strength B',
  dayOfWeek: 3,
  focus: 'strength',
  estimatedDurationMinutes: 30,
  equipmentIds: ['equipment-barbell', 'equipment-plates', 'equipment-rack'],
  exercises: [
    {
      id: 'workout-exercise-strength-b-deadlift',
      exerciseId: 'exercise-deadlift',
      order: 1,
      section: 'working',
      sets: workingSets('strength-b-deadlift', { min: 3, max: 5 }, 3),
    },
    {
      id: 'workout-exercise-strength-b-press',
      exerciseId: 'exercise-overhead-press',
      order: 2,
      section: 'working',
      sets: workingSets('strength-b-press', 5, 3),
    },
    {
      id: 'workout-exercise-strength-b-lunge',
      exerciseId: 'exercise-reverse-lunge',
      order: 3,
      section: 'working',
      sets: workingSets('strength-b-lunge', { min: 6, max: 8 }, 2),
    },
  ],
};

const strengthC: Workout = {
  id: 'workout-barbell-30-strength-c',
  programVersionId: 'program-version-barbell-30-v1',
  title: 'Strength C',
  dayOfWeek: 5,
  focus: 'strength',
  estimatedDurationMinutes: 30,
  equipmentIds: ['equipment-barbell', 'equipment-plates', 'equipment-rack', 'equipment-bench'],
  exercises: [
    {
      id: 'workout-exercise-strength-c-squat',
      exerciseId: 'exercise-back-squat',
      order: 1,
      section: 'working',
      sets: workingSets('strength-c-squat', 5, 3),
    },
    {
      id: 'workout-exercise-strength-c-bench',
      exerciseId: 'exercise-bench-press',
      order: 2,
      section: 'working',
      sets: workingSets('strength-c-bench', { min: 6, max: 8 }, 3),
    },
    {
      id: 'workout-exercise-strength-c-rdl',
      exerciseId: 'exercise-romanian-deadlift',
      order: 3,
      section: 'working',
      sets: workingSets('strength-c-rdl', { min: 6, max: 8 }, 3),
    },
  ],
};

const cardioA: Workout = {
  id: 'workout-barbell-30-cardio-a',
  programVersionId: 'program-version-barbell-30-v1',
  title: 'Cardio A',
  dayOfWeek: 2,
  focus: 'cardio',
  estimatedDurationMinutes: 30,
  isOptional: true,
  equipmentIds: ['equipment-bike'],
  exercises: [
    {
      id: 'workout-exercise-cardio-a-bike',
      exerciseId: 'exercise-stationary-bike',
      order: 1,
      section: 'cardio',
      sets: timedSets('cardio-a-bike', 1800),
    },
  ],
};

const cardioB: Workout = {
  id: 'workout-barbell-30-cardio-b',
  programVersionId: 'program-version-barbell-30-v1',
  title: 'Cardio B',
  dayOfWeek: 4,
  focus: 'cardio',
  estimatedDurationMinutes: 30,
  isOptional: true,
  equipmentIds: ['equipment-bike'],
  exercises: [
    {
      id: 'workout-exercise-cardio-b-bike',
      exerciseId: 'exercise-stationary-bike',
      order: 1,
      section: 'cardio',
      sets: timedSets('cardio-b-bike', 1800),
    },
  ],
};

export const demoProgram: Program = {
  id: 'program-barbell-30',
  slug: 'barbell-30',
  title: 'Barbell 30',
  description: 'Efficient strength sessions with easy cardio between lifts.',
  goals: ['strength', 'consistent-training'],
  targetUser: 'People who want a long-term barbell framework in about 30 minutes.',
  experience: ['beginner', 'intermediate'],
  daysPerWeek: 3,
  sessionLengthMinutes: 30,
  requiredEquipmentIds: ['equipment-barbell', 'equipment-plates', 'equipment-rack'],
  optionalEquipmentIds: ['equipment-bench', 'equipment-pull-up-bar', 'equipment-bike'],
  progressionStrategy: 'double-progression',
  currentVersionId: 'program-version-barbell-30-v1',
  isTemplate: true,
};

export const demoProgramVersion: ProgramVersion = {
  id: 'program-version-barbell-30-v1',
  programId: demoProgram.id,
  version: 1,
  status: 'published',
  cycleModel: {
    lengthWeeks: 6,
    weekSixMeaning: 'consolidation',
    phases: {
      1: 'Establish',
      2: 'Repeatability',
      3: 'Build',
      4: 'Build',
      5: 'Challenge',
      6: 'Consolidate and review',
    },
  },
  workouts: [strengthA, cardioA, strengthB, cardioB, strengthC],
  progressionRuleIds: ['rule-barbell-30-double-progression'],
  createdAt: now,
};

export const demoCycleWeeks: CycleWeek[] = Array.from({ length: 6 }, (_, index) => {
  const weekNumber = index + 1;
  return {
    weekNumber,
    label: `Week ${weekNumber}`,
    phase: demoProgramVersion.cycleModel.phases[weekNumber] ?? 'Training',
    status: weekNumber === 1 ? 'current' : 'upcoming',
    completedWorkoutCount: 0,
    plannedWorkoutCount: 3,
  };
});

export const demoCycle: TrainingCycle = {
  id: 'cycle-demo-barbell-30-2026-09',
  userId: demoUser.id,
  programVersionId: demoProgramVersion.id,
  status: 'active',
  currentWeek: 1,
  startedAt: now,
  weeks: demoCycleWeeks,
};

export const demoWorkout = strengthA;

export const demoSchedule: WeeklyScheduleEntry[] = [
  {
    id: 'schedule-mon',
    day: 'Mon',
    title: 'Strength A',
    workoutId: 'workout-barbell-30-strength-a',
    category: 'strength',
    status: 'current',
  },
  {
    id: 'schedule-tue',
    day: 'Tue',
    title: 'Cardio',
    workoutId: 'workout-barbell-30-cardio-a',
    category: 'cardio',
    status: 'upcoming',
  },
  {
    id: 'schedule-wed',
    day: 'Wed',
    title: 'Strength B',
    workoutId: 'workout-barbell-30-strength-b',
    category: 'strength',
    status: 'upcoming',
  },
  {
    id: 'schedule-thu',
    day: 'Thu',
    title: 'Cardio',
    workoutId: 'workout-barbell-30-cardio-b',
    category: 'cardio',
    status: 'upcoming',
  },
  {
    id: 'schedule-fri',
    day: 'Fri',
    title: 'Strength C',
    workoutId: 'workout-barbell-30-strength-c',
    category: 'strength',
    status: 'upcoming',
  },
  { id: 'schedule-sat', day: 'Sat', title: 'Active', category: 'recovery', status: 'upcoming' },
  { id: 'schedule-sun', day: 'Sun', title: 'Rest', category: 'rest', status: 'rest' },
];

export const demoCoachProposal: CoachProposal = {
  id: 'coach-proposal-demo',
  summary: 'Your first week is ready to establish a repeatable baseline.',
  confidence: 'high',
  evidence: ['Cycle is in week 1', 'Barbell 30 is built for three 30-minute strength sessions'],
  changes: [],
  safetyNotes: [],
  status: 'pending',
  createdAt: now,
};
