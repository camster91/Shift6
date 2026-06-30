/**
 * TravelModeBanner.test.jsx — verifies the travel mode banner shows
 * the right copy when toggled on, and stays hidden when toggled off
 * (parent handles the conditional render).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TravelModeBanner from './TravelModeBanner';

describe('TravelModeBanner', () => {
  it('renders a heading identifying the mode', () => {
    render(<TravelModeBanner todayExerciseId="pushups" />);
    expect(screen.getByText(/Travel Mode Active/i)).toBeTruthy();
  });

  it('shows the substituted exercise name in the body', () => {
    render(<TravelModeBanner todayExerciseId="goblet_squat" />);
    // Body contains "Today's lift has been swapped..." and the exercise
    // name "goblet squat" (humanized).
    expect(screen.getByText(/goblet squat/i)).toBeTruthy();
  });

  it('handles missing exerciseId gracefully', () => {
    render(<TravelModeBanner />);
    expect(screen.getByText(/Travel Mode Active/i)).toBeTruthy();
    // No exercise name should be in the DOM, no crash
    expect(screen.queryByText(/Current:/i)).toBeNull();
  });

  it('announces itself to assistive tech via role=status', () => {
    render(<TravelModeBanner todayExerciseId="pushups" />);
    const banner = screen.getByTestId('travel-mode-banner');
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });
});