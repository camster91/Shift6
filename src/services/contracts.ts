import type { CoachProposal, EntityId, ISODateString, TrainingCycle, User } from '../domain/types';

export type AuthProviderKind = 'apple' | 'google' | 'email';

export interface AuthSession {
  userId: EntityId;
  provider: AuthProviderKind;
  accessToken: string;
  expiresAt?: ISODateString;
}

/** Authentication is injected at the app boundary; domain logic never owns tokens. */
export interface AuthProvider {
  getSession(): Promise<AuthSession | null>;
  getAccessToken(): Promise<string | null>;
  signOut(): Promise<void>;
}

export interface SyncMutation {
  id: EntityId;
  idempotencyKey: string;
  entityType:
    | 'workout-session'
    | 'completed-set'
    | 'profile'
    | 'program-version'
    | 'exercise'
    | 'training-cycle'
    | 'coach-proposal'
    | 'workout-check-in'
    | 'cycle-review'
    | 'notification-preference'
    | 'workout-schedule-override';
  entityId: EntityId;
  payload: Record<string, unknown>;
  createdAt: ISODateString;
}

export type SyncConflictCode = 'version-conflict' | 'ownership-conflict' | 'validation-conflict';

export interface SyncConflict {
  mutationId: EntityId;
  code: SyncConflictCode;
}

export interface SyncResult {
  acknowledgedMutationIds: EntityId[];
  rejectedMutationIds: EntityId[];
  conflicts?: SyncConflict[];
  serverVersion?: number;
}

export interface AccountDeletionResult {
  deleted: true;
}

/** Backend boundary. Implementations may target Supabase or another backend. */
export interface BackendClient {
  sync(mutations: readonly SyncMutation[]): Promise<SyncResult>;
  deleteAccount(): Promise<AccountDeletionResult>;
}

export type CoachTask =
  | 'explain-workout'
  | 'substitution'
  | 'shorten-workout'
  | 'weekly-review'
  | 'cycle-review'
  | 'freeform';

/** Maximum free-text payload accepted by a provider-backed Coach request. */
export const MAX_COACH_PROMPT_LENGTH = 500;

export interface CoachContext {
  user: Pick<User, 'id' | 'unitSystem' | 'goals' | 'experience'>;
  cycle: Pick<TrainingCycle, 'id' | 'programVersionId' | 'currentWeek' | 'status'>;
  structuredFacts: Record<string, unknown>;
}

export interface CoachMessageResult {
  kind: 'message' | 'safety-route' | 'unavailable';
  text: string;
  factsUsed: string[];
}

/** AI boundary. Provider and model adapters must remain behind this interface. */
export interface CoachGateway {
  generateMessage(
    context: CoachContext,
    task: CoachTask,
    prompt?: string,
  ): Promise<CoachMessageResult>;
  generateProposal(context: CoachContext, task: CoachTask): Promise<CoachProposal>;
}

export type AnalyticsEventName =
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'program_started'
  | 'workout_started'
  | 'workout_completed'
  | 'workout_partial'
  | 'workout_skipped'
  | 'week_2_reached'
  | 'cycle_completed'
  | 'next_cycle_started'
  | 'coach_proposal_shown'
  | 'coach_proposal_accepted'
  | 'custom_program_created'
  | 'exercise_substituted'
  | 'health_connected';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  occurredAt: ISODateString;
  properties?: Record<string, string | number | boolean>;
}

export interface AnalyticsClient {
  track(event: AnalyticsEvent): void;
}

export type ErrorReportContext = Record<string, string | number | boolean>;

/**
 * Crash/error boundary. Implementations must receive only allowlisted technical
 * context; raw health data, workout notes, Coach prompts, tokens, and other user
 * content must never be attached to error reports.
 */
export interface ErrorReporter {
  captureException(error: unknown, context?: ErrorReportContext): void;
  captureMessage(message: string, context?: ErrorReportContext): void;
}
