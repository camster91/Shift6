import type { AnalyticsClient, AnalyticsEvent, AnalyticsEventName } from './contracts';

type AnalyticsProperty = string | number | boolean;

const allowedProperties: Record<AnalyticsEventName, readonly string[]> = {
  onboarding_started: [],
  onboarding_completed: ['goalCount', 'equipmentCount', 'trainingDays', 'healthConnectionSelected'],
  program_started: ['programId', 'daysPerWeek', 'sessionLengthMinutes'],
  workout_started: ['workoutId', 'cycleWeek', 'offline'],
  workout_completed: ['workoutId', 'cycleWeek', 'offline'],
  workout_partial: ['workoutId', 'cycleWeek', 'reason', 'offline'],
  workout_skipped: ['workoutId', 'cycleWeek', 'reason', 'offline'],
  week_2_reached: ['cycleId'],
  cycle_completed: ['cycleId', 'completedWorkoutCount', 'completionRate'],
  next_cycle_started: ['cycleId', 'programId'],
  coach_proposal_shown: ['proposalId', 'changeCount', 'confidence'],
  coach_proposal_accepted: ['proposalId', 'changeCount'],
  custom_program_created: ['programId', 'workoutCount'],
  exercise_substituted: ['sourceExerciseId', 'replacementExerciseId'],
  health_connected: ['provider', 'grantedTypeCount'],
};

export function sanitizeAnalyticsEvent(event: AnalyticsEvent): AnalyticsEvent {
  const allowed = new Set(allowedProperties[event.name]);
  const properties = Object.fromEntries(
    Object.entries(event.properties ?? {}).filter(([key, value]) => {
      return allowed.has(key) && isAnalyticsProperty(value);
    }),
  ) as Record<string, AnalyticsProperty>;

  return {
    name: event.name,
    occurredAt: event.occurredAt,
    ...(Object.keys(properties).length > 0 ? { properties } : {}),
  };
}

/** Wraps any future analytics transport with the event allowlist. */
export class PrivacySafeAnalyticsClient implements AnalyticsClient {
  constructor(private readonly send: (event: AnalyticsEvent) => void) {}

  track(event: AnalyticsEvent): void {
    this.send(sanitizeAnalyticsEvent(event));
  }
}

/** Default guest-shell client. It keeps instrumentation callable without a vendor or network. */
export function createNoopAnalyticsClient(): AnalyticsClient {
  return new PrivacySafeAnalyticsClient(() => undefined);
}

export function trackAnalyticsEvent(
  client: AnalyticsClient,
  name: AnalyticsEventName,
  properties?: Record<string, AnalyticsProperty>,
): void {
  client.track({
    name,
    occurredAt: new Date().toISOString(),
    ...(properties ? { properties } : {}),
  });
}

function isAnalyticsProperty(value: unknown): value is AnalyticsProperty {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}
