import type { SQLiteDatabase } from 'expo-sqlite';
import { getOnboardingProfile } from '../db/profileRepository';
import { getActiveTrainingCycle } from '../db/cycleRepository';
import { getUserExercises, getUserProgramVersion } from '../db/programRepository';
import { getWorkoutScheduleOverrides, getWorkoutScheduleSessions } from '../db/calendarRepository';
import { foundationalExercises } from '../domain/fixtures/exercises';
import { isExerciseAvailableToUser } from '../domain/runtimeContentGates';
import {
  availableCoachCapabilities,
  isCoachNavigationCapability,
  selectCoachWorkout,
  type CoachCapabilityState,
} from '../domain/coachCapabilities';
import type { OnboardingProfile, Program, ProgramVersion, TrainingCycle } from '../domain/types';

export interface CoachNavigationSnapshot extends CoachCapabilityState {
  owner: string;
  profile: OnboardingProfile | null;
  cycle: TrainingCycle | null;
  snapshot: { program: Program; version: ProgramVersion } | null;
}

export async function loadCoachNavigationSnapshot(
  db: SQLiteDatabase,
  owner: string,
  now = new Date(),
): Promise<CoachNavigationSnapshot> {
  if (!owner.trim()) throw new Error('A local owner is required for Coach controls.');
  const [profile, cycle] = await Promise.all([
    getOnboardingProfile(db, owner),
    getActiveTrainingCycle(db, owner),
  ]);
  if ((profile && profile.user.id !== owner) || (cycle && cycle.userId !== owner))
    throw new Error('Coach ownership changed. Reload before continuing.');
  const snapshot = cycle ? await getUserProgramVersion(db, owner, cycle.programVersionId) : null;
  if (
    snapshot &&
    cycle &&
    (snapshot.version.id !== cycle.programVersionId ||
      snapshot.version.programId !== snapshot.program.id)
  )
    throw new Error('The current plan snapshot is unavailable.');
  let selection: CoachCapabilityState['selection'] = null,
    guidanceId: string | null = null;
  if (cycle && snapshot && profile) {
    const [overrides, sessions, custom] = await Promise.all([
      getWorkoutScheduleOverrides(db, owner, cycle.id),
      getWorkoutScheduleSessions(db, cycle.id),
      getUserExercises(db, owner),
    ]);
    if (overrides.some((item) => item.userId !== owner || item.cycleId !== cycle.id))
      throw new Error('Coach schedule ownership changed.');
    selection = selectCoachWorkout(cycle, snapshot.version, overrides, sessions, now);
    for (const movement of selection?.workout.exercises ?? []) {
      const exercise =
        custom.find((item) => item.id === movement.exerciseId) ??
        foundationalExercises.find((item) => item.id === movement.exerciseId);
      // No draft-preview exception: public content must pass the actual gate.
      if (exercise && isExerciseAvailableToUser(exercise, false)) {
        guidanceId = exercise.id;
        break;
      }
    }
  }
  return {
    owner,
    profile,
    cycle,
    snapshot,
    selection,
    guidanceId,
    hasProfile: profile !== null,
    hasCycle: Boolean(cycle && snapshot && profile),
  };
}

export type CoachNavigationRoute =
  | '/onboarding'
  | '/'
  | '/calendar'
  | '/goal'
  | '/coach-review'
  | '/history'
  | '/health'
  | '/profile'
  | { pathname: '/builder'; params: { mode: 'blank' } }
  | { pathname: '/exercise/[id]'; params: { id: string } };

/** Resolve only a built-in capability against fresh local ownership. This
 * dispatcher never executes model text, URLs, SQL or mutations. Workout controls
 * open Home because /workout itself creates a session on mount. */
export async function resolveCoachNavigation(
  db: SQLiteDatabase,
  owner: string,
  requested: unknown,
  now = new Date(),
): Promise<{ status: 'ready-to-open'; route: CoachNavigationRoute; owner: string }> {
  if (!isCoachNavigationCapability(requested))
    throw new Error('That Coach action is not available.');
  const state = await loadCoachNavigationSnapshot(db, owner, now);
  const capability = availableCoachCapabilities(state).find((item) => item.id === requested)!;
  if (!capability.available)
    throw new Error(capability.reason ?? 'That Coach action is not available now.');
  let route: CoachNavigationRoute;
  switch (requested) {
    case 'open-setup':
      route = '/onboarding';
      break;
    case 'build-private-plan':
      route = { pathname: '/builder', params: { mode: 'blank' } };
      break;
    case 'open-workout-controls':
      route = '/';
      break;
    case 'open-calendar':
      route = '/calendar';
      break;
    case 'open-goal':
      route = '/goal';
      break;
    case 'open-local-review':
      route = '/coach-review';
      break;
    case 'open-history':
      route = '/history';
      break;
    case 'open-guidance':
      route = { pathname: '/exercise/[id]', params: { id: state.guidanceId! } };
      break;
    case 'open-health-controls':
      route = '/health';
      break;
    case 'open-data-controls':
      route = '/profile';
      break;
  }
  return { status: 'ready-to-open', route, owner };
}
