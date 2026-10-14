import type { Exercise, Program, ProgramVersion } from './types';

/** Local-only export additions. These are not provider packets or sync entities. */
export const persistenceSections = {
  cycleLifecycleEvents: 'cycle_lifecycle_events',
  coachMemoryPreferences: 'coach_memory_preferences',
  coachMemoryFacts: 'coach_memory_facts',
  builderRecoveryDrafts: 'builder_recovery_drafts',
  setFeedbackEvents: 'set_feedback_events',
} as const;
export type PersistenceSection = keyof typeof persistenceSections;
export type LifecycleKind = 'pause' | 'resume' | 'review-date';
export type SetDifficulty = 'easier-than-expected' | 'about-right' | 'harder-than-expected';
export type CoachMemoryValue =
  | { kind: 'training-time'; value: 'morning' | 'afternoon' | 'evening' }
  | { kind: 'session-minutes'; value: number }
  | { kind: 'equipment'; value: string[] }
  | { kind: 'coach-style'; value: 'concise' | 'supportive' | 'technical' };
export interface BuilderRecoverySnapshot {
  program: Program;
  version: ProgramVersion;
  customExercises: Exercise[];
  imports: { workoutId: string; text: string; previewText: string | null }[];
}
export interface CycleLifecycleEvent {
  id: string;
  userId: string;
  cycleId: string;
  kind: LifecycleKind;
  effectiveDate: string;
  timeZone: string;
  previousEventId: string | null;
  operationId: string;
  recordedAt: string;
}
export interface SetFeedbackEvent {
  id: string;
  userId: string;
  sessionId: string;
  completedSetId: string;
  difficulty: SetDifficulty;
  correctsEventId: string | null;
  operationId: string;
  recordedAt: string;
}
export interface CoachMemoryFact {
  id: string;
  userId: string;
  value: CoachMemoryValue;
  revision: number;
  operationId: string;
  confirmedAt: string;
  updatedAt: string;
}
export interface CoachMemoryPreferences {
  userId: string;
  enabled: boolean;
  updatedAt: string;
}
export interface BuilderRecoveryDraft {
  id: string;
  userId: string;
  snapshot: BuilderRecoverySnapshot;
  revision: number;
  updatedAt: string;
}
