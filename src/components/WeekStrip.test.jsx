/**
 * WeekStrip.test.jsx — verifies the 7-day activity strip renders the
 * right state for each day based on completed-dates, mvd-dates, and
 * whether each day is in the past, today, or future.
 *
 * Timezone-sensitive: the component reads local dates via
 * `getLocalDateString()`. Tests inject the date strings directly so
 * they don't depend on the machine's current date.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import WeekStrip from './WeekStrip';
import { getLocalDateString } from '../utils/date';

function todayMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return getLocalDateString(d);
}

describe('WeekStrip', () => {
  it('renders 7 day badges', () => {
    const { container } = render(<WeekStrip />);
    // The wrapper itself has aria-label="Last 7 days of activity",
    // so the day-badge querySelector has to be more specific.
    const strip = container.querySelector('[aria-label="Last 7 days of activity"]');
    expect(strip).toBeTruthy();
    const badges = strip.children;
    expect(badges).toHaveLength(7);
  });

  it('labels today as "today" and 6 days ago as "missed" with no data', () => {
    const { container } = render(<WeekStrip />);
    const today = container.querySelector('[aria-label*="today"]');
    const sixAgo = container.querySelector(`[aria-label="${getDayLabel(todayMinus(6))}: missed"]`);
    expect(today).toBeTruthy();
    expect(sixAgo).toBeTruthy();
  });

  it('marks a completed date as "done" with the accent color', () => {
    const { container } = render(
      <WeekStrip completedDates={[todayMinus(2)]} mvdDates={[]} />
    );
    const done = container.querySelector(`[aria-label="${getDayLabel(todayMinus(2))}: done"]`);
    expect(done).toBeTruthy();
    // The 'done' class string includes bg-[var(--color-accent)]
    expect(done.className).toContain('bg-[var(--color-accent)]');
  });

  it('marks an MVD date as "mvd" with the warning color', () => {
    const { container } = render(
      <WeekStrip completedDates={[]} mvdDates={[todayMinus(1)]} />
    );
    const mvd = container.querySelector(`[aria-label="${getDayLabel(todayMinus(1))}: mvd"]`);
    expect(mvd).toBeTruthy();
    expect(mvd.className).toContain('bg-[var(--color-warning-muted)]');
  });

  it('prefers "done" over "mvd" when both apply to the same day', () => {
    // Real-world rule: a day with a completed workout is shown as done,
    // not as MVD. MVD is the fallback for streak-protection days when
    // the user skips the full workout.
    const { container } = render(
      <WeekStrip completedDates={[todayMinus(3)]} mvdDates={[todayMinus(3)]} />
    );
    const done = container.querySelector(`[aria-label="${getDayLabel(todayMinus(3))}: done"]`);
    expect(done).toBeTruthy();
  });

  it('ignores future dates outside the 7-day window', () => {
    // The strip only looks at the last 7 days. A "completion" in the
    // future should not be rendered (we don't know yet whether it'll
    // count as done, mvd, or missed).
    const futureDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      return getLocalDateString(d);
    })();
    const { container } = render(
      <WeekStrip completedDates={[futureDate]} mvdDates={[]} />
    );
    // 7 badges total, none should be 'done'
    const dones = container.querySelectorAll('[aria-label$=": done"]');
    expect(dones).toHaveLength(0);
  });
});

// Build the same aria-label string the component uses, so tests can
// target a specific day precisely.
function getDayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getDate()}`;
}
