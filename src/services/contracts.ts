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
    | 'workout-check-in';
  entityId: EntityId;
  payload: Record<string, unknown>;
  createdAt: ISODateString;
}

export interface SyncResult {
  acknowledgedMutationIds: EntityId[];
  rejectedMutationIds: EntityId[];
  serverVersion?: number;
}

/** Backend boundary. Implementations may target Supabase or another backend. */
export interface BackendClient {
  sync(mutations: readonly SyncMutation[]): Promise<SyncResult>;
}

export type CoachTask =
  | 'explain-workout'
  | 'substitution'
  | 'shorten-workout'
  | 'weekly-review'
  | 'cycle-review'
  | 'freeform';

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
  generateMessage(context: CoachContext, task: CoachTask): Promise<CoachMessageResult>;
  generateProposal(context: CoachContext, task: CoachTask): Promise<CoachProposal>;
}

export type AnalyticsEventName =
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'program_started'
  | 'workout_started'
  | 'workout_completed'
  | 'cycle_completed'
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
