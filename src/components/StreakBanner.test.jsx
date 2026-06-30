/**
 * StreakBanner.test.jsx — verifies the dashboard streak banner:
 *  - 'at_risk' state shows warning copy with current streak
 *  - 'broken' state shows muted copy acknowledging the lost streak
 *  - 'ok' state renders nothing
 *  - component is a no-op if no status passed
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakBanner from './StreakBanner';

describe('StreakBanner', () => {
  it('renders nothing when no status passed', () => {
    const { container } = render(<StreakBanner />);
    expect(container.querySelector('[data-testid="streak-banner"]')).toBeNull();
  });

  it('renders nothing when status.banner is null (ok state)', () => {
    const { container } = render(<StreakBanner status={{ state: 'ok', banner: null }} />);
    expect(container.querySelector('[data-testid="streak-banner"]')).toBeNull();
  });

  it('shows the at-risk copy when banner.kind === "at_risk"', () => {
    const status = {
      state: 'at_risk',
      banner: {
        kind: 'at_risk',
        title: "Don't break your 7-day streak",
        body: 'Log today\'s workout or MVD to keep it alive.',
        cta: null,
      },
    };
    render(<StreakBanner status={status} />);
    expect(screen.getByText(/Don't break your 7-day streak/i)).toBeTruthy();
    expect(screen.getByText(/Log today/i)).toBeTruthy();
  });

  it('shows the broken copy when banner.kind === "broken"', () => {
    const status = {
      state: 'broken',
      banner: {
        kind: 'broken',
        title: 'Streak ended',
        body: 'Your 14-day streak ended. Streak freezes reset each week.',
        cta: 'Streak is gone — keep logging!',
      },
    };
    render(<StreakBanner status={status} />);
    expect(screen.getByText(/14-day streak ended/i)).toBeTruthy();
    expect(screen.getByText(/Streak freezes reset each week/i)).toBeTruthy();
  });

  it('announces itself via role=status + aria-live=polite', () => {
    const status = {
      state: 'at_risk',
      banner: {
        kind: 'at_risk',
        title: 'Test',
        body: 'Test body',
      },
    };
    render(<StreakBanner status={status} />);
    const banner = screen.getByTestId('streak-banner');
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });
});
