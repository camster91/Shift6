import type { EntityId, PersonalRecord, ProgressPoint } from './types';

export interface ProgressSetInput {
  sessionId: EntityId;
  exerciseId: EntityId;
  completedAt: string;
  load?: number;
  reps?: number;
}

export interface ExerciseProgress {
  exerciseId: EntityId;
  points: ProgressPoint[];
  personalRecords: PersonalRecord[];
}

export function buildExerciseProgress(
  exerciseId: EntityId,
  sets: readonly ProgressSetInput[],
): ExerciseProgress {
  const grouped = new Map<string, ProgressSetInput[]>();
  for (const set of sets) {
    if (set.exerciseId !== exerciseId) continue;
    const sessionSets = grouped.get(set.sessionId) ?? [];
    sessionSets.push(set);
    grouped.set(set.sessionId, sessionSets);
  }

  const points = [...grouped.values()]
    .map((sessionSets) => buildPoint(exerciseId, sessionSets))
    .sort((left, right) => {
      const dateDelta = Date.parse(left.completedAt) - Date.parse(right.completedAt);
      return dateDelta || left.sessionId.localeCompare(right.sessionId);
    });

  return {
    exerciseId,
    points,
    personalRecords: buildPersonalRecords(exerciseId, points),
  };
}

export function estimateOneRepMax(
  load: number | undefined,
  reps: number | undefined,
): number | undefined {
  if (load === undefined || reps === undefined || load <= 0 || reps < 1 || reps > 12)
    return undefined;
  return load * (1 + reps / 30);
}

function buildPoint(exerciseId: EntityId, sets: readonly ProgressSetInput[]): ProgressPoint {
  const bestLoad = max(sets.map((set) => set.load));
  const bestReps = max(sets.map((set) => set.reps));
  const estimatedOneRepMax = max(sets.map((set) => estimateOneRepMax(set.load, set.reps)));
  const volume = sets.reduce((total, set) => total + (set.load ?? 0) * (set.reps ?? 0), 0);
  const latestSet = [...sets].sort((left, right) => {
    const dateDelta = Date.parse(left.completedAt) - Date.parse(right.completedAt);
    return dateDelta || left.sessionId.localeCompare(right.sessionId);
  })[0];

  return {
    sessionId: latestSet?.sessionId ?? 'unknown-session',
    exerciseId,
    completedAt: latestSet?.completedAt ?? new Date(0).toISOString(),
    ...(bestLoad === undefined ? {} : { bestLoad }),
    ...(bestReps === undefined ? {} : { bestReps }),
    ...(estimatedOneRepMax === undefined ? {} : { estimatedOneRepMax }),
    volume,
  };
}

function buildPersonalRecords(
  exerciseId: EntityId,
  points: readonly ProgressPoint[],
): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  const previous: Partial<Record<PersonalRecord['metric'], number>> = {};

  for (const point of points) {
    const candidates: Array<[PersonalRecord['metric'], number | undefined]> = [
      ['load', point.bestLoad],
      ['reps', point.bestReps],
      ['estimated-one-rep-max', point.estimatedOneRepMax],
    ];
    for (const [metric, value] of candidates) {
      if (value === undefined || (previous[metric] !== undefined && value <= previous[metric])) {
        continue;
      }
      previous[metric] = value;
      records.push({
        id: `record-${exerciseId}-${metric}-${point.sessionId}`,
        exerciseId,
        metric,
        value,
        sessionId: point.sessionId,
        achievedAt: point.completedAt,
      });
    }
  }

  return records;
}

function max(values: readonly (number | undefined)[]): number | undefined {
  const present = values.filter((value): value is number => value !== undefined);
  return present.length === 0 ? undefined : Math.max(...present);
}
