import { buildCycleSchedule } from './calendar';
import type {
  ProgramVersion,
  TrainingCycle,
  Workout,
  WorkoutScheduleOverride,
  WorkoutScheduleSession,
} from './types';

export interface CoachWorkoutSelection {
  workout: Workout;
  basis: 'resumable' | 'scheduled';
  scheduledDate: string;
}

/** Use owned saved cycle occurrences, never the first template workout or a
 * weekday fallback. A paused/mismatched prescription cannot advertise training. */
export function selectCoachWorkout(
  cycle: TrainingCycle,
  version: ProgramVersion,
  overrides: readonly WorkoutScheduleOverride[],
  sessions: readonly WorkoutScheduleSession[],
  now: Date,
): CoachWorkoutSelection | null {
  if (cycle.status !== 'active' || cycle.programVersionId !== version.id) return null;
  const occurrences = buildCycleSchedule(cycle, version, overrides, sessions, now).filter(
    (occurrence) => occurrence.cycleWeek === cycle.currentWeek,
  );
  const unfinished = [...sessions]
    .reverse()
    .find((session) => session.cycleWeek === cycle.currentWeek && session.status === 'in-progress');
  const resumable = occurrences.find(
    (occurrence) => occurrence.workout.id === unfinished?.workoutId,
  );
  if (resumable)
    return {
      workout: resumable.workout,
      basis: 'resumable',
      scheduledDate: resumable.scheduledDate,
    };
  const current = occurrences.find((occurrence) => occurrence.status === 'current');
  return current
    ? { workout: current.workout, basis: 'scheduled', scheduledDate: current.scheduledDate }
    : null;
}

export const coachNavigationCapabilities = [
  { id: 'open-setup', label: 'Review your setup' },
  { id: 'build-private-plan', label: 'Build a private plan' },
  { id: 'open-workout-controls', label: 'Open workout controls' },
  { id: 'open-calendar', label: 'Open your training calendar' },
  { id: 'open-goal', label: 'Open your personal goal' },
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
    if (['open-calendar', 'open-goal'].includes(capability.id) && !state.hasCycle)
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
