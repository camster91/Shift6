import { parseDateKey } from './calendar';
import type { TrainingCycle } from './types';

/** Local date keys are inclusive at the start and exclusive at the end. */
export interface PauseInterval {
  startDate: string;
  endDate?: string;
}

export interface ShiftCalendarPosition {
  asOfDate: string;
  elapsedDays: number;
  elapsedCalendarWeek: number;
  pausedDays: number;
  activeDays: number;
  cycleWeek: number;
  isPaused: boolean;
  plannedReviewDate: string | null;
}

/**
 * A read-only time projection. Neither elapsed days nor pauses advance a
 * prescription or a measured result. #315's write transactions own confirmed
 * pause/repeat/review-date revisions and the reviewed return rules from #309.
 */
export function projectShiftCalendarPosition(
  cycle: Pick<TrainingCycle, 'currentWeek'>,
  startDate: string,
  asOfDate: string,
  pauses: readonly PauseInterval[] = [],
  plannedReviewDate: string | null = null,
): ShiftCalendarPosition {
  const start = dayNumber(startDate);
  const today = dayNumber(asOfDate);
  if (today < start) throw new Error('The projection date cannot precede the Shift start.');
  if (!Number.isInteger(cycle.currentWeek) || cycle.currentWeek < 1 || cycle.currentWeek > 6)
    throw new Error('Cycle week must be between 1 and 6.');
  if (plannedReviewDate !== null) dayNumber(plannedReviewDate);

  const ordered = pauses
    .map((pause) => ({
      start: dayNumber(pause.startDate),
      end: pause.endDate === undefined ? null : dayNumber(pause.endDate),
    }))
    .sort((left, right) => left.start - right.start);
  let previousEnd = start;
  let pausedDays = 0;
  let isPaused = false;
  for (const pause of ordered) {
    if (
      pause.start < start ||
      pause.start < previousEnd ||
      (pause.end !== null && pause.end <= pause.start)
    )
      throw new Error('Pause intervals must be non-overlapping and within the Shift.');
    if (pause.end === null && pause !== ordered.at(-1))
      throw new Error('Only the last pause interval can be open.');
    const effectiveEnd = Math.min(pause.end ?? today + 1, today + 1);
    pausedDays += Math.max(0, effectiveEnd - pause.start);
    if (pause.start <= today && (pause.end === null || today < pause.end)) isPaused = true;
    previousEnd = pause.end ?? Infinity;
  }

  const elapsedDays = today - start + 1;
  return {
    asOfDate,
    elapsedDays,
    elapsedCalendarWeek: Math.floor((elapsedDays - 1) / 7) + 1,
    pausedDays,
    activeDays: elapsedDays - pausedDays,
    cycleWeek: cycle.currentWeek,
    isPaused,
    plannedReviewDate,
  };
}

function dayNumber(key: string): number {
  parseDateKey(key);
  // Date-only UTC arithmetic avoids DST changing the number of calendar days.
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year!, month! - 1, day!);
  return Math.floor(date.getTime() / 86_400_000);
}
