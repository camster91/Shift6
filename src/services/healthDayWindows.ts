import type { HealthDateRange } from '../domain/health';
const DAY_MS = 86_400_000;
/** UTC calendar days, intersected with the selected range; never read extra history. */
export function utcHealthWindows(range: HealthDateRange): HealthDateRange[] {
  const start = Date.parse(range.startAt),
    end = Date.parse(range.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error('Choose a valid health import range.');
  if (end - start > 366 * DAY_MS) throw new Error('Health import range is too large.');
  const windows: HealthDateRange[] = [];
  for (let day = Math.floor(start / DAY_MS) * DAY_MS; day < end; day += DAY_MS) {
    windows.push({
      startAt: new Date(Math.max(day, start)).toISOString(),
      endAt: new Date(Math.min(day + DAY_MS, end)).toISOString(),
    });
  }
  return windows;
}
export function utcHealthReplacementRange(range: HealthDateRange): HealthDateRange {
  utcHealthWindows(range);
  return {
    startAt: new Date(Math.floor(Date.parse(range.startAt) / DAY_MS) * DAY_MS).toISOString(),
    endAt: new Date(Math.ceil(Date.parse(range.endAt) / DAY_MS) * DAY_MS).toISOString(),
  };
}
