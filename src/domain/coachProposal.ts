import {
  replaceExerciseInWorkout,
  setWorkoutExerciseSetCount,
  setWorkoutExerciseTarget,
} from './programBuilder';
import type {
  CoachProposal,
  CoachProposalChange,
  ProgramVersion,
  SetTarget,
  WorkoutExercise,
} from './types';
import { isValidCoachProposal } from '../services/coachSafety';

const targetFields = new Set([
  'load',
  'reps',
  'durationSeconds',
  'distanceMeters',
  'rpe',
  'rir',
  'tempo',
]);

/**
 * Applies only deterministic, user-approved change types to a private version.
 * Callers should create a new version ID before persisting the returned value.
 */
export function applyCoachProposalToProgramVersion(
  sourceVersion: ProgramVersion,
  proposal: CoachProposal,
): ProgramVersion {
  if (!isValidCoachProposal(proposal)) {
    throw new Error('Only a validated pending coach proposal can be applied.');
  }

  return proposal.changes.reduce((version, change) => applyChange(version, change), sourceVersion);
}

function applyChange(version: ProgramVersion, change: CoachProposalChange): ProgramVersion {
  if (change.type === 'target-change') {
    if (!targetFields.has(change.field)) {
      throw new Error(`Coach target field ${change.field} is not supported.`);
    }
    const location = resolveWorkoutExercise(version, change);
    const currentTarget = location.workoutExercise.sets[0]?.target;
    if (!currentTarget) throw new Error(`Coach change ${change.id} has no target to update.`);

    return setWorkoutExerciseTarget(
      version,
      location.workoutId,
      location.workoutExercise.id,
      applyTargetField(currentTarget, change.field, change.to),
    );
  }

  if (change.type === 'exercise-substitution') {
    if (change.field !== 'exerciseId' || !change.to.trim()) {
      throw new Error(`Coach substitution ${change.id} must provide a replacement exercise ID.`);
    }
    const location = resolveWorkoutExercise(version, change);
    return replaceExerciseInWorkout(
      version,
      location.workoutId,
      location.workoutExercise.id,
      change.to.trim(),
    );
  }

  if (change.type === 'set-count-change') {
    if (change.field !== 'setCount') {
      throw new Error(`Coach set-count change ${change.id} uses an unsupported field.`);
    }
    const location = resolveWorkoutExercise(version, change);
    const setCount = parseInteger(change.to);
    if (setCount === undefined) {
      throw new Error(`Coach set-count change ${change.id} must use a whole-number target.`);
    }
    return setWorkoutExerciseSetCount(
      version,
      location.workoutId,
      location.workoutExercise.id,
      setCount,
    );
  }

  throw new Error(`Coach change ${change.id} requires a separate schedule or program workflow.`);
}

function resolveWorkoutExercise(
  version: ProgramVersion,
  change: CoachProposalChange,
): { workoutId: string; workoutExercise: WorkoutExercise } {
  if (change.workoutId && change.workoutExerciseId) {
    const workout = version.workouts.find((candidate) => candidate.id === change.workoutId);
    const workoutExercise = workout?.exercises.find(
      (candidate) => candidate.id === change.workoutExerciseId,
    );
    if (!workout || !workoutExercise) {
      throw new Error(`Coach change ${change.id} does not identify a current movement.`);
    }
    if (change.exerciseId && workoutExercise.exerciseId !== change.exerciseId) {
      throw new Error(`Coach change ${change.id} does not match the current movement.`);
    }
    return { workoutId: workout.id, workoutExercise };
  }

  if (change.workoutId || change.workoutExerciseId) {
    throw new Error(`Coach change ${change.id} needs both workout and movement IDs.`);
  }
  if (!change.exerciseId?.trim()) {
    throw new Error(`Coach change ${change.id} must identify the affected exercise.`);
  }

  const matches = version.workouts.flatMap((workout) =>
    workout.exercises
      .filter((workoutExercise) => workoutExercise.exerciseId === change.exerciseId)
      .map((workoutExercise) => ({ workoutId: workout.id, workoutExercise })),
  );
  if (matches.length !== 1) {
    throw new Error(
      `Coach change ${change.id} must identify one unambiguous workout movement before it can be applied.`,
    );
  }
  return matches[0]!;
}

function applyTargetField(currentTarget: SetTarget, field: string, rawValue: string): SetTarget {
  if (field === 'tempo') {
    const tempo = rawValue.trim();
    if (!tempo) throw new Error('Coach tempo changes need a non-empty value.');
    return { ...currentTarget, tempo };
  }

  if (field === 'reps') {
    const range = parseRepRange(rawValue);
    if (range) return { ...currentTarget, reps: range };
  }

  const value = parseNumber(rawValue);
  if (value === undefined) throw new Error(`Coach ${field} changes need a numeric value.`);
  if (field === 'rpe' && (value < 1 || value > 10)) {
    throw new Error('Coach RPE changes must be between 1 and 10.');
  }
  if (field === 'rir' && (value < 0 || value > 10)) {
    throw new Error('Coach RIR changes must be between 0 and 10.');
  }

  switch (field) {
    case 'load':
      return {
        ...currentTarget,
        load: { unit: currentTarget.load?.unit ?? 'imperial', value },
      };
    case 'reps':
      if (!Number.isInteger(value) || value < 1) {
        throw new Error('Coach rep changes must be a positive whole number or range.');
      }
      return { ...currentTarget, reps: value };
    case 'durationSeconds':
      return { ...currentTarget, durationSeconds: value };
    case 'distanceMeters':
      return { ...currentTarget, distanceMeters: value };
    case 'rpe':
      return { ...currentTarget, rpe: value };
    case 'rir':
      return { ...currentTarget, rir: value };
    default:
      throw new Error(`Coach target field ${field} is not supported.`);
  }
}

function parseRepRange(rawValue: string): { min: number; max: number } | undefined {
  const match = rawValue.trim().match(/^(\d+)\s*[-–]\s*(\d+)\s*(?:reps?)?$/i);
  if (!match) return undefined;
  const min = Number(match[1]);
  const max = Number(match[2]);
  return min >= 1 && max >= min ? { min, max } : undefined;
}

function parseInteger(rawValue: string): number | undefined {
  const value = parseNumber(rawValue);
  return value !== undefined && Number.isInteger(value) ? value : undefined;
}

function parseNumber(rawValue: string): number | undefined {
  const match = rawValue.trim().match(/^-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0]);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}
