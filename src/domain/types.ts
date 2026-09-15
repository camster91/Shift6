export type EntityId = string;
export type ISODateString = string;

export type UnitSystem = 'metric' | 'imperial';
export type Goal =
  | 'general-health'
  | 'strength'
  | 'muscle'
  | 'conditioning'
  | 'fat-loss-support'
  | 'mobility'
  | 'athletic-performance'
  | 'healthy-ageing'
  | 'consistent-training';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ExerciseClassification = 'compound' | 'isolation';
export type EquipmentCategory =
  'free-weight' | 'machine' | 'cardio' | 'bodyweight' | 'accessory' | 'mobility' | 'custom';
export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'horizontal-push'
  | 'vertical-push'
  | 'horizontal-pull'
  | 'vertical-pull'
  | 'lunge-split-stance'
  | 'carry'
  | 'rotation'
  | 'anti-rotation'
  | 'anti-extension'
  | 'locomotion'
  | 'cyclical-cardio'
  | 'mobility'
  | 'power'
  | 'balance';
export type TrackingType = 'reps' | 'time' | 'distance' | 'duration-and-distance' | 'custom';
export type ProgressionStrategy =
  | 'linear-load'
  | 'double-progression'
  | 'rep-target'
  | 'rpe-rir'
  | 'volume'
  | 'density'
  | 'time'
  | 'distance'
  | 'cardio'
  | 'skill';
export type CycleStatus = 'planned' | 'active' | 'complete' | 'paused' | 'cancelled';
export type CycleWeekStatus = 'completed' | 'current' | 'upcoming' | 'missed' | 'partial';
export type WorkoutSessionStatus =
  'planned' | 'in-progress' | 'complete' | 'partial' | 'skipped' | 'abandoned';
export type WorkoutScheduleStatus =
  'complete' | 'partial' | 'skipped' | 'in-progress' | 'missed' | 'current' | 'upcoming';
export type WorkoutSessionCompletionReason =
  'all-targets' | 'time-limited' | 'readiness' | 'discomfort' | 'equipment' | 'other';
export type WorkoutGroupType = 'superset' | 'circuit';
export type WorkoutReadiness = 'ready' | 'limited' | 'rest';
export type CoachProposalStatus =
  'pending' | 'accepted' | 'partially-accepted' | 'rejected' | 'expired';
export type CoachTone = 'concise' | 'supportive' | 'technical';
export type CoachIntervention = 'conservative' | 'balanced' | 'proactive';
export type HealthConnectionPreference = 'not-now' | 'apple-health' | 'health-connect';
export type PreferredTrainingTime = 'morning' | 'afternoon' | 'evening';
export type NotificationPreferenceKey =
  'workoutReminders' | 'restTimer' | 'weeklyReview' | 'cycleReview' | 'coachMessages';

export interface User {
  id: EntityId;
  displayName: string;
  unitSystem: UnitSystem;
  goals: Goal[];
  experience: ExperienceLevel;
  equipmentIds: EntityId[];
  trainingDaysPerWeek: number;
  preferredSessionMinutes: number;
  preferredTrainingTime: PreferredTrainingTime;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface OnboardingProfile {
  user: User;
  coachTone: CoachTone;
  coachIntervention: CoachIntervention;
  healthConnection: HealthConnectionPreference;
  completedAt: ISODateString;
}

export interface NotificationPreference {
  userId: EntityId;
  workoutReminders: boolean;
  restTimer: boolean;
  weeklyReview: boolean;
  cycleReview: boolean;
  coachMessages: boolean;
  updatedAt: ISODateString;
}

export interface Equipment {
  id: EntityId;
  name: string;
  category: EquipmentCategory;
  aliases: string[];
  description?: string;
}

export interface ExerciseMedia {
  id: EntityId;
  type: 'image' | 'video';
  uri: string;
  altText: string;
  reviewStatus: 'draft' | 'technique-review' | 'approved';
}

export interface Exercise {
  id: EntityId;
  name: string;
  aliases: string[];
  movementPattern: MovementPattern;
  classification?: ExerciseClassification;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipmentIds: EntityId[];
  setup: string;
  notes?: string;
  difficulty: Difficulty;
  instructions: string[];
  techniqueCues: string[];
  commonMistakes: string[];
  safetyNotes: string[];
  unilateral: boolean;
  trackingType: TrackingType;
  tags: string[];
  media: ExerciseMedia[];
  isCustom: boolean;
  contentStatus: 'draft' | 'reviewed' | 'retired';
  reviewedAt?: ISODateString;
}

export interface ExerciseVariant {
  id: EntityId;
  exerciseId: EntityId;
  name: string;
  equipmentIds: EntityId[];
  movementPattern: MovementPattern;
  trackingType: TrackingType;
  notes?: string;
  isDefault: boolean;
}

export interface RepRange {
  min: number;
  max: number;
}

export interface SetTarget {
  reps?: number | RepRange;
  load?: {
    value?: number;
    unit: UnitSystem;
    percentOfEstimatedOneRepMax?: number;
  };
  durationSeconds?: number;
  distanceMeters?: number;
  rpe?: number;
  rir?: number;
  tempo?: string;
}

export interface WorkoutSet {
  id: EntityId;
  setNumber: number;
  target: SetTarget;
  restSeconds?: number;
}

export interface WorkoutExercise {
  id: EntityId;
  exerciseId: EntityId;
  variantId?: EntityId;
  order: number;
  section: 'warm-up' | 'working' | 'cooldown' | 'cardio' | 'mobility';
  supersetGroupId?: EntityId;
  groupType?: WorkoutGroupType;
  notes?: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: EntityId;
  sourceWorkoutId?: EntityId;
  programVersionId: EntityId;
  title: string;
  dayOfWeek: number;
  focus: 'strength' | 'cardio' | 'mobility' | 'conditioning' | 'recovery' | 'mixed';
  estimatedDurationMinutes: number;
  isOptional?: boolean;
  equipmentIds: EntityId[];
  exercises: WorkoutExercise[];
}

export interface WeeklyScheduleEntry {
  id: string;
  day: string;
  date?: string;
  title: string;
  workoutId?: EntityId;
  category: 'strength' | 'cardio' | 'recovery' | 'rest';
  status: 'complete' | 'current' | 'upcoming' | 'rest';
}

export interface CycleModel {
  lengthWeeks: 6;
  weekSixMeaning:
    'evaluation' | 'consolidation' | 'reduced-volume' | 'rep-pr' | 'technique' | 'normal-training';
  phases: Record<number, string>;
}

export interface Program {
  id: EntityId;
  slug: string;
  title: string;
  description: string;
  goals: Goal[];
  targetUser: string;
  experience: ExperienceLevel[];
  daysPerWeek: number;
  sessionLengthMinutes: number;
  requiredEquipmentIds: EntityId[];
  optionalEquipmentIds: EntityId[];
  progressionStrategy: ProgressionStrategy;
  currentVersionId: EntityId;
  isTemplate: boolean;
  ownerId?: EntityId;
  sourceProgramId?: EntityId;
}

export interface ProgramVersion {
  id: EntityId;
  programId: EntityId;
  version: number;
  status: 'draft' | 'published' | 'retired';
  cycleModel: CycleModel;
  workouts: Workout[];
  progressionRuleIds: EntityId[];
  createdAt: ISODateString;
}

export interface CycleWeek {
  weekNumber: number;
  label: string;
  phase: string;
  status: CycleWeekStatus;
  completedWorkoutCount: number;
  plannedWorkoutCount: number;
}

export interface TrainingCycle {
  id: EntityId;
  userId: EntityId;
  programVersionId: EntityId;
  status: CycleStatus;
  currentWeek: number;
  startedAt: ISODateString;
  weeks: CycleWeek[];
}

export interface WorkoutSession {
  id: EntityId;
  cycleId: EntityId;
  cycleWeek: number;
  workoutId: EntityId;
  programVersionId: EntityId;
  workoutFocus: Workout['focus'];
  status: WorkoutSessionStatus;
  startedAt: ISODateString;
  completedAt?: ISODateString;
  completionReason?: WorkoutSessionCompletionReason;
  isOffline: boolean;
  readiness?: WorkoutReadiness;
  note?: string;
}

export interface WorkoutScheduleOverride {
  id: EntityId;
  userId: EntityId;
  cycleId: EntityId;
  cycleWeek: number;
  workoutId: EntityId;
  originalDate: string;
  scheduledDate: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface WorkoutScheduleSession {
  cycleWeek: number;
  workoutId: EntityId;
  status: WorkoutSessionStatus;
  completedAt?: ISODateString;
}

export type CheckInRating = 1 | 2 | 3 | 4 | 5;

export type CycleReviewFocus =
  | 'same-course'
  | 'more-strength'
  | 'more-conditioning'
  | 'more-mobility'
  | 'improve-consistency'
  | 'recover-better';

export type CycleReviewAction =
  'repeat' | 'progress' | 'adjust' | 'change-exercises' | 'change-program' | 'build-new';

export interface CycleReview {
  id: EntityId;
  userId: EntityId;
  cycleId: EntityId;
  overallRating?: CheckInRating;
  focus?: CycleReviewFocus;
  nextAction?: CycleReviewAction;
  note?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface WorkoutCheckIn {
  sessionId: EntityId;
  energy?: CheckInRating;
  soreness?: CheckInRating;
  perceivedExertion?: CheckInRating;
  discomfortReported: boolean;
  note?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CompletedSet {
  id: EntityId;
  sessionId: EntityId;
  workoutExerciseId: EntityId;
  exerciseId?: EntityId;
  setNumber: number;
  load?: number;
  reps?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  rpe?: number;
  rir?: number;
  completedAt: ISODateString;
  idempotencyKey: string;
}

export type PersonalRecordMetric =
  'load' | 'reps' | 'duration' | 'distance' | 'estimated-one-rep-max';

export interface ProgressPoint {
  sessionId: EntityId;
  exerciseId: EntityId;
  completedAt: ISODateString;
  bestLoad?: number;
  bestReps?: number;
  bestDurationSeconds?: number;
  bestDistanceMeters?: number;
  estimatedOneRepMax?: number;
  volume: number;
}

export interface PersonalRecord {
  id: EntityId;
  exerciseId: EntityId;
  metric: PersonalRecordMetric;
  value: number;
  sessionId: EntityId;
  achievedAt: ISODateString;
}

export interface WorkoutDraftSetValues {
  load: string;
  reps: string;
  duration: string;
  distance: string;
  rpe: string;
  rir: string;
}

export type WorkoutDraftValues = Record<string, WorkoutDraftSetValues>;

export interface ProgressionRule {
  id: EntityId;
  strategy: ProgressionStrategy;
  scope: 'exercise' | 'workout' | 'program' | 'cycle';
  exerciseId?: EntityId;
  parameters: Record<string, string | number | boolean>;
}

export interface CoachProposalChange {
  id: EntityId;
  type:
    | 'target-change'
    | 'exercise-substitution'
    | 'set-count-change'
    | 'schedule-change'
    | 'program-change';
  exerciseId?: EntityId;
  workoutId?: EntityId;
  workoutExerciseId?: EntityId;
  field: string;
  from: string;
  to: string;
  requiresUserConfirmation: true;
}

export interface CoachProposal {
  id: EntityId;
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
  changes: CoachProposalChange[];
  safetyNotes: string[];
  status: CoachProposalStatus;
  createdAt: ISODateString;
}
