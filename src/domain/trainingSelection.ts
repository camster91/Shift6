import { buildCycleSchedule } from './calendar';
import type {
  ProgramVersion,
  TrainingCycle,
  Workout,
  WorkoutScheduleOverride,
  WorkoutScheduleSession,
} from './types';

export interface TrainingWorkoutSelection {
  workout: Workout;
  basis: 'resumable' | 'scheduled';
  scheduledDate: string;
}

/** Shared Home/Coach selection from owned saved cycle occurrences. Sessions
 * arrive in repository order (started_at then id ascending), so the last
 * unfinished attempt takes priority. Never guess a template/weekday workout. */
export function selectTrainingWorkout(
  cycle: TrainingCycle,
  version: ProgramVersion,
  overrides: readonly WorkoutScheduleOverride[],
  sessions: readonly WorkoutScheduleSession[],
  now: Date,
): TrainingWorkoutSelection | null {
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
