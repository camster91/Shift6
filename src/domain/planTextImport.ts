import type { Exercise, Program, ProgramVersion, SetTarget } from './types';
import {
  addExerciseToWorkout,
  setWorkoutExerciseNotes,
  setWorkoutExerciseRestSeconds,
} from './programBuilder';

export interface PlanTextRow {
  original: string;
  name: string;
  exerciseId?: string;
  setCount?: number;
  target: SetTarget;
  restSeconds?: number;
  errors: string[];
}
export interface PlanTextPreview {
  rows: PlanTextRow[];
  errors: string[];
}
const amount = '(\\d+(?:\\.\\d+)?)';
function unitValue(raw: string, units: Record<string, number>, max: number): number | undefined {
  const match = raw.match(new RegExp(`^${amount}\\s*(${Object.keys(units).join('|')})$`, 'i'));
  if (!match) return undefined;
  const value = Number(match[1]) * units[match[2]!.toLowerCase()]!;
  return Number.isFinite(value) && value >= 0 && value <= max ? value : undefined;
}

/** Strict user-supplied notation, never a training prescription or model instruction. */
export function parsePlanText(text: string, available: readonly Exercise[]): PlanTextPreview {
  if (text.length > 10000) return { rows: [], errors: ['Use at most 10,000 characters.'] };
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length || lines.length > 20)
    return { rows: [], errors: ['Paste 1–20 movement lines.'] };
  const rows = lines.map((original): PlanTextRow => {
    const [name = '', ...parts] = original.split('|').map((part) => part.trim());
    const row: PlanTextRow = { original, name, target: {}, errors: [] };
    if (original.length > 450) row.errors.push('Use at most 450 characters per line.');
    const matches = available.filter(
      (exercise) => exercise.name.toLowerCase() === name.toLowerCase(),
    );
    const ids = [...new Set(matches.map((exercise) => exercise.id))];
    if (ids.length !== 1)
      row.errors.push(
        ids.length
          ? 'Movement name is ambiguous; use a uniquely named private movement.'
          : 'Movement is not available. Create or choose your exact private movement first.',
      );
    else row.exerciseId = ids[0];
    const fields = new Map<string, string>();
    for (const part of parts) {
      const pair = part.match(/^(sets|reps|time|distance|load|rest)\s*=\s*(.+)$/i);
      if (!pair) {
        row.errors.push(`Unsupported field: ${part || '(empty)'}.`);
        continue;
      }
      const key = pair[1]!.toLowerCase();
      if (fields.has(key)) row.errors.push(`Duplicate ${key}; keep one explicit value.`);
      fields.set(key, pair[2]!.trim());
    }
    const sets = fields.get('sets');
    if (!sets || !/^\d+$/.test(sets) || Number(sets) < 1 || Number(sets) > 20)
      row.errors.push('Specify sets=1–20.');
    else row.setCount = Number(sets);
    if (fields.has('reps')) {
      const reps = fields.get('reps')!.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      const min = Number(reps?.[1]),
        max = Number(reps?.[2] ?? reps?.[1]);
      if (!reps || min < 1 || max < min || max > 1000)
        row.errors.push('Reps must be 1–1000 or an ordered range, such as reps=8-12.');
      else row.target.reps = min === max ? min : { min, max };
    }
    if (fields.has('time')) {
      const value = unitValue(fields.get('time')!, { s: 1, min: 60 }, 86400);
      if (value === undefined || value <= 0 || !Number.isInteger(value))
        row.errors.push('Specify positive whole seconds, such as time=30s or time=2min.');
      else row.target.durationSeconds = value;
    }
    if (fields.has('distance')) {
      const value = unitValue(
        fields.get('distance')!,
        { m: 1, km: 1000, miles: 1609.344 },
        1000000,
      );
      if (value === undefined || value <= 0)
        row.errors.push('Specify positive distance with m, km or miles.');
      else row.target.distanceMeters = value;
    }
    if (fields.has('load')) {
      const load = fields.get('load')!.match(/^(\d+(?:\.\d+)?)\s*(kg|lb)$/i);
      if (!load || Number(load[1]) > 1000)
        row.errors.push('Load needs an explicit kg or lb unit and a value from 0–1000.');
      else
        row.target.load = {
          value: Number(load[1]),
          unit: load[2]!.toLowerCase() === 'kg' ? 'metric' : 'imperial',
        };
    }
    const rest = fields.get('rest');
    const restValue = rest === undefined ? undefined : unitValue(rest, { s: 1, min: 60 }, 3600);
    if (restValue === undefined || !Number.isInteger(restValue))
      row.errors.push('Specify rest explicitly, such as rest=90s, rest=2min or rest=0s.');
    else row.restSeconds = restValue;
    const tracking = matches[0]?.trackingType;
    if (tracking === 'reps' && (fields.has('time') || fields.has('distance')))
      row.errors.push('Reps-tracked movement cannot also import time/distance targets.');
    if (tracking === 'time' && (fields.has('reps') || fields.has('distance')))
      row.errors.push('Time-tracked movement cannot also import reps/distance targets.');
    if (tracking === 'distance' && (fields.has('reps') || fields.has('time')))
      row.errors.push('Distance-tracked movement cannot also import reps/time targets.');
    if (tracking === 'duration-and-distance' && fields.has('reps'))
      row.errors.push('Duration-and-distance movement cannot import a reps target.');
    if (tracking === 'reps' && row.target.reps === undefined)
      row.errors.push('This movement requires an explicit reps target.');
    if (
      (tracking === 'time' || tracking === 'duration-and-distance') &&
      row.target.durationSeconds === undefined
    )
      row.errors.push('This movement requires an explicit time target.');
    if (
      (tracking === 'distance' || tracking === 'duration-and-distance') &&
      row.target.distanceMeters === undefined
    )
      row.errors.push('This movement requires an explicit distance target.');
    if (
      !Object.keys(row.target).some((key) =>
        ['reps', 'durationSeconds', 'distanceMeters'].includes(key),
      )
    )
      row.errors.push('Specify reps, time or distance; no target will be guessed.');
    return row;
  });
  return { rows, errors: [] };
}

/** Revalidate current owner, available movements and text at apply; source/history stays immutable. */
export function appendPlanText(
  program: Program,
  version: ProgramVersion,
  owner: string,
  workoutId: string,
  text: string,
  available: readonly Exercise[],
): ProgramVersion {
  if (
    program.ownerId !== owner ||
    program.isTemplate ||
    version.programId !== program.id ||
    version.status !== 'draft'
  )
    throw new Error('Import requires your own private draft version.');
  const preview = parsePlanText(text, available);
  if (preview.errors.length || preview.rows.some((row) => row.errors.length))
    throw new Error('Resolve every import field before adding movements.');
  let result = version;
  for (const row of preview.rows) {
    result = addExerciseToWorkout(result, workoutId, {
      exerciseId: row.exerciseId!,
      setCount: row.setCount!,
      target: row.target,
    });
    const added = result.workouts.find((workout) => workout.id === workoutId)!.exercises.at(-1)!;
    result = setWorkoutExerciseRestSeconds(result, workoutId, added.id, row.restSeconds);
    result = setWorkoutExerciseNotes(
      result,
      workoutId,
      added.id,
      `Imported user-owned note: ${row.original}`,
    );
  }
  return result;
}
