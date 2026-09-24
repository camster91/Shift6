import type { Workout, WorkoutSessionStatus } from './types';

export interface WorkoutHistoryInput {
  id: string;
  cycleId: string;
  cycleWeek: number;
  workoutId: string;
  title?: string;
  focus: Workout['focus'];
  status: WorkoutSessionStatus;
  startedAt: string;
  completedAt?: string | null;
  completionReason?: string | null;
  isOffline: boolean;
  completedSetCount: number;
  totalVolume: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
}

export interface WorkoutHistoryEntry {
  id: string;
  cycleId: string;
  cycleWeek: number;
  workoutId: string;
  title: string;
  focus: Workout['focus'];
  status: WorkoutSessionStatus;
  startedAt: string;
  completedAt?: string;
  completionReason?: string;
  isOffline: boolean;
  completedSetCount: number;
  totalVolume: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  durationMinutes?: number;
}

export function buildWorkoutHistoryEntry(input: WorkoutHistoryInput): WorkoutHistoryEntry {
  const completedAt = input.completedAt ?? undefined;
  const durationMinutes = completedAt
    ? getDurationMinutes(input.startedAt, completedAt)
    : undefined;

  return {
    id: input.id,
    cycleId: input.cycleId,
    cycleWeek: input.cycleWeek,
    workoutId: input.workoutId,
    title: input.title?.trim() || formatWorkoutFallback(input.workoutId),
    focus: input.focus,
    status: input.status,
    startedAt: input.startedAt,
    ...(completedAt ? { completedAt } : {}),
    ...(input.completionReason ? { completionReason: input.completionReason } : {}),
    isOffline: input.isOffline,
    completedSetCount: Math.max(0, Math.trunc(input.completedSetCount)),
    totalVolume: nonNegativeNumber(input.totalVolume),
    totalDurationSeconds: nonNegativeNumber(input.totalDurationSeconds),
    totalDistanceMeters: nonNegativeNumber(input.totalDistanceMeters),
    ...(durationMinutes === undefined ? {} : { durationMinutes }),
  };
}

export function sortWorkoutHistory(entries: readonly WorkoutHistoryEntry[]): WorkoutHistoryEntry[] {
  return [...entries].sort((left, right) => {
    const dateDelta =
      Date.parse(right.completedAt ?? right.startedAt) -
      Date.parse(left.completedAt ?? left.startedAt);
    return dateDelta || right.id.localeCompare(left.id);
  });
}

function getDurationMinutes(startedAt: string, completedAt: string): number | undefined {
  const durationMilliseconds = Date.parse(completedAt) - Date.parse(startedAt);
  return Number.isFinite(durationMilliseconds) && durationMilliseconds >= 0
    ? durationMilliseconds / 60_000
    : undefined;
}

function nonNegativeNumber(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatWorkoutFallback(workoutId: string): string {
  return workoutId
    .replace(/^workout-/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
