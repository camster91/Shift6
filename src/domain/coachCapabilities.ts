import type { TrainingWorkoutSelection } from './trainingSelection';
export { selectTrainingWorkout as selectCoachWorkout } from './trainingSelection';
export type CoachWorkoutSelection = TrainingWorkoutSelection;

export const coachNavigationCapabilities = [
  { id: 'open-setup', label: 'Review your setup' },
  { id: 'build-private-plan', label: 'Build a private plan' },
  { id: 'open-workout-controls', label: 'Open workout controls' },
  { id: 'open-calendar', label: 'Open your training calendar' },
  { id: 'open-goal', label: 'Open your personal goal' },
  { id: 'open-local-review', label: 'Review recent training' },
  { id: 'open-history', label: 'Review saved training history' },
  { id: 'open-guidance', label: 'Open movement guidance' },
  { id: 'open-health-controls', label: 'Open optional health controls' },
  { id: 'open-data-controls', label: 'Open export and data controls' },
] as const;
export type CoachNavigationCapability = (typeof coachNavigationCapabilities)[number]['id'];
export interface CoachCapabilityAvailability {
  id: CoachNavigationCapability;
  label: string;
  available: boolean;
  reason?: string;
}
export interface CoachCapabilityState {
  hasProfile: boolean;
  hasCycle: boolean;
  selection: CoachWorkoutSelection | null;
  guidanceId: string | null;
}

export function availableCoachCapabilities(
  state: CoachCapabilityState,
): CoachCapabilityAvailability[] {
  return coachNavigationCapabilities.map((capability) => {
    let reason: string | undefined;
    if (capability.id === 'build-private-plan' && !state.hasProfile)
      reason = 'Complete your setup before building a private plan.';
    if (
      ['open-calendar', 'open-goal', 'open-local-review'].includes(capability.id) &&
      !state.hasCycle
    )
      reason = 'Start a private cycle first.';
    if (capability.id === 'open-workout-controls' && !state.selection)
      reason =
        'No scheduled or resumable workout is available now. Check your calendar or build a private plan.';
    if (capability.id === 'open-guidance' && !state.guidanceId)
      reason = 'No owned custom or reviewed movement is available for the selected workout.';
    return {
      ...capability,
      label:
        capability.id === 'open-setup' && !state.hasProfile
          ? 'Continue setup'
          : capability.id === 'open-workout-controls' && state.selection
            ? `${state.selection.basis === 'resumable' ? 'Resume' : 'Today'}: ${state.selection.workout.title}`
            : capability.label,
      available: reason === undefined,
      ...(reason ? { reason } : {}),
    };
  });
}

export function isCoachNavigationCapability(value: unknown): value is CoachNavigationCapability {
  return (
    typeof value === 'string' &&
    coachNavigationCapabilities.some((capability) => capability.id === value)
  );
}
