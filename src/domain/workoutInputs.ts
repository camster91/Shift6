import { loadUnitForSystem } from './loadUnits';
import type { UnitSystem } from './types';
import type { CompletedSet, SetTarget, Workout, WorkoutDraftSetValues } from './types';

type SetInputValues = WorkoutDraftSetValues;

export function buildInitialValues(
  workout: Workout,
  targetOverrides: Record<string, SetTarget> = {},
  unitSystem?: UnitSystem,
): Record<string, SetInputValues> {
  return Object.fromEntries(
    workout.exercises.flatMap((exercise) =>
      exercise.sets.map((workoutSet) => [
        setKey(exercise.id, workoutSet.setNumber),
        emptySetInput(targetOverrides[exercise.id] ?? workoutSet.target, unitSystem),
      ]),
    ),
  );
}

function mergeCompletedSetValues(
  initial: Record<string, SetInputValues>,
  completedSets: readonly CompletedSet[],
): Record<string, SetInputValues> {
  const completedByKey = new Map(
    completedSets.map((completedSet) => [
      setKey(completedSet.workoutExerciseId, completedSet.setNumber),
      completedSet,
    ]),
  );

  return Object.fromEntries(
    Object.entries(initial).map(([key, values]) => {
      const completedSet = completedByKey.get(key);
      if (!completedSet) return [key, values];

      return [
        key,
        {
          ...values,
          load: valueOrEmpty(completedSet.load),
          ...(completedSet.load !== undefined
            ? { loadUnit: completedSet.loadUnit ?? 'unknown' }
            : {}),
          reps: valueOrEmpty(completedSet.reps),
          duration: valueOrEmpty(completedSet.durationSeconds),
          distance: valueOrEmpty(completedSet.distanceMeters),
          rpe: valueOrEmpty(completedSet.rpe),
          rir: valueOrEmpty(completedSet.rir),
        },
      ];
    }),
  );
}

function mergeDraftValues(
  initial: Record<string, SetInputValues>,
  draft: Record<string, SetInputValues> | null,
): Record<string, SetInputValues> {
  if (!draft) return initial;

  return Object.fromEntries(
    Object.entries(initial).map(([key, values]) => {
      const recovered = draft[key];
      return [
        key,
        {
          ...values,
          ...(recovered ?? {}),
          // A recovered number is an actual input, not the current prescription.
          // Legacy drafts cannot inherit a new target/profile unit silently.
          ...(recovered?.load.trim() && !recovered.loadUnit
            ? { loadUnit: 'unknown' as const }
            : {}),
        },
      ];
    }),
  );
}

function valueOrEmpty(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

export function emptySetInput(target?: SetTarget, unitSystem?: UnitSystem): SetInputValues {
  const reps = typeof target?.reps === 'number' ? String(target.reps) : '';
  const load = target?.load?.value !== undefined ? String(target.load.value) : '';
  const duration = target?.durationSeconds !== undefined ? String(target.durationSeconds) : '';
  const distance = target?.distanceMeters !== undefined ? String(target.distanceMeters) : '';
  // Effort targets describe the prescription, never a report of actual effort.
  const rpe = '';
  const rir = '';
  return {
    load,
    reps,
    duration,
    distance,
    rpe,
    rir,
    ...(target?.load?.unit || unitSystem
      ? { loadUnit: loadUnitForSystem(target?.load?.unit ?? unitSystem!) }
      : {}),
  };
}

function setKey(id: string, number: number): string {
  return `${id}:${number}`;
}

export function hydrateWorkoutValues(
  workout: Workout,
  overrides: Record<string, SetTarget>,
  completedSets: readonly CompletedSet[],
  draft: Record<string, SetInputValues> | null,
  current?: Record<string, SetInputValues>,
  unitSystem?: UnitSystem,
): Record<string, SetInputValues> {
  // Suggestions initialize a new session. Only a previously hydrated session has
  // trusted in-memory edits; persisted completed sets remain authoritative.
  const initial = buildInitialValues(workout, overrides, unitSystem);
  const withDraft = mergeDraftValues(initial, draft);
  const withEdits = current ? mergeDraftValues(withDraft, current) : withDraft;
  return mergeCompletedSetValues(withEdits, completedSets);
}
