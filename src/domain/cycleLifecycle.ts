import type { CycleLifecycleEvent } from './localPersistence';
import { parseDateKey } from './calendar';

export function lifecycleDate(instant: string, timeZone: string): string {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new Error('Use a valid recorded time.');
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function summarizeLifecycle(events: readonly CycleLifecycleEvent[]) {
  const roots = events.filter((event) => event.previousEventId === null);
  if (events.length && roots.length !== 1) throw new Error('Cycle history needs one root.');
  const children = new Map<string, CycleLifecycleEvent>();
  for (const event of events)
    if (event.previousEventId) {
      if (children.has(event.previousEventId))
        throw new Error('Cycle history has conflicting revisions.');
      children.set(event.previousEventId, event);
    }
  const ordered: CycleLifecycleEvent[] = [];
  const seen = new Set<string>();
  let event = roots[0];
  let pauseStart: string | null = null;
  let unknownPriorPause = false;
  let reviewDate: string | null = null;
  const intervals: { startDate: string; endDate?: string }[] = [];
  while (event) {
    if (seen.has(event.id)) throw new Error('Cycle history contains a loop.');
    seen.add(event.id);
    parseDateKey(event.effectiveDate);
    ordered.push(event);
    if (event.kind === 'pause') pauseStart = event.effectiveDate;
    if (event.kind === 'resume') {
      // A same-day pause/return spans no whole calendar days. Its timestamps
      // remain in ordered history; do not invent an elapsed duration.
      if (pauseStart && pauseStart !== event.effectiveDate)
        intervals.push({ startDate: pauseStart, endDate: event.effectiveDate });
      else if (!pauseStart) unknownPriorPause = true;
      pauseStart = null;
    }
    if (event.kind === 'review-date') reviewDate = event.effectiveDate;
    event = children.get(event.id)!;
  }
  if (seen.size !== events.length) throw new Error('Cycle history is disconnected.');
  if (pauseStart) intervals.push({ startDate: pauseStart });
  return { ordered, latest: ordered.at(-1) ?? null, reviewDate, intervals, unknownPriorPause };
}
