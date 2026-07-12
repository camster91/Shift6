/**
 * WeekStrip — 7-day activity history at a glance.
 *
 * Shows the last 7 days as a row of small badges. Each badge is one of:
 *   - 'done'   (full primary color, completed workout that day)
 *   - 'mvd'    (warning color, Minimum Viable Day completed)
 *   - 'missed' (dim, day is in the past and nothing was logged)
 *   - 'today'  (outlined, today — not yet decided)
 *   - 'future' (very dim, future days in the rolling window)
 *
 * Tap a day badge to see the day-of-week label. The strip is purely
 * informational — it does not navigate.
 *
 * Pure: takes the activity data, computes the strip. No data fetching.
 */
import { memo } from 'react';
import { getLocalDateString } from '../utils/date';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * @param {object} props
 * @param {string[]} props.completedDates - YYYY-MM-DD strings for full workouts
 * @param {string[]} props.mvdDates - YYYY-MM-DD strings for MVD completions
 */
const WeekStrip = memo(({ completedDates = [], mvdDates = [], className = '' }) => {
  const today = new Date();
  const todayStr = getLocalDateString(today);

  // Build the 7-day window: 6 days ago through today. Anything in the
  // past with no activity is "missed". Today without activity is "today"
  // (highlighted, not yet decided).
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const dateStr = getLocalDateString(d);
    const isToday = dateStr === todayStr;
    const isCompleted = completedDates.includes(dateStr);
    const isMvd = mvdDates.includes(dateStr);
    let state;
    if (isCompleted) state = 'done';
    else if (isMvd) state = 'mvd';
    else if (isToday) state = 'today';
    else state = 'missed';

    days.push({
      dateStr,
      dayLabel: DAY_LABELS[d.getDay()],
      dayNum: d.getDate(),
      isToday,
      state,
    });
  }

  return (
    <div className={`flex items-center justify-between gap-1 ${className}`} aria-label="Last 7 days of activity">
      {days.map((day) => (
        <DayBadge key={day.dateStr} day={day} />
      ))}
    </div>
  );
});

WeekStrip.displayName = 'WeekStrip';

export default WeekStrip;

function DayBadge({ day }) {
  // Color map driven by design tokens. Light mode (--color-warning) and
  // dark mode both have a real color value, so this degrades cleanly.
  //
  // 'mvd' uses a half-fill effect: a left-half gradient from warning to
  // transparent. This visually says "partial credit" without competing
  // with the full-accent 'done' state.
  const stateClasses = {
    done:   'bg-[var(--color-accent)] text-[var(--elevation-0-bg)] border-transparent',
    mvd:    'bg-[var(--color-warning-muted)] text-[var(--color-warning)] border-[var(--color-warning)]/30',
    today:  'bg-transparent text-[var(--text-primary)] border-[var(--color-accent)]',
    missed: 'bg-[var(--color-surface-1)] text-[var(--text-disabled)] border-transparent',
  };
  const base = 'flex-1 relative flex flex-col items-center justify-center gap-0.5 h-12 rounded-xl border-2 text-[10px] font-bold overflow-hidden';
  return (
    <div
      className={`${base} ${stateClasses[day.state]}`}
      aria-label={`${day.dayLabel} ${day.dayNum}: ${day.state}`}
    >
      {day.state === 'mvd' && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-1/2 bg-[var(--color-warning)] opacity-50"
        />
      )}
      <span className="relative text-[9px] uppercase tracking-wider opacity-70">{day.dayLabel}</span>
      <span className="relative text-sm leading-none tabular-nums">{day.dayNum}</span>
    </div>
  );
}
