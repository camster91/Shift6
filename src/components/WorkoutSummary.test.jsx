/**
 * WorkoutSummary.test.jsx — verifies the post-workout summary modal
 * renders the right stats and the right copy for each scenario
 * (first workout, regular workout, cycle complete).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkoutSummary from './WorkoutSummary';

const baseWorkout = {
  date: '2026-06-30',
  day: 1,
  week: 1,
  completed: true,
  exercises: [
    { id: 'barbell_squat', sets: [
      { reps: 8, weight: 180 },
      { reps: 8, weight: 180 },
      { reps: 8, weight: 180 },
      { reps: 8, weight: 180 },
    ]},
    { id: 'leg_press', sets: [
      { reps: 12, weight: 400 },
      { reps: 12, weight: 400 },
      { reps: 12, weight: 400 },
    ]},
  ],
};

describe('WorkoutSummary', () => {
  it('renders null when workout is null', () => {
    const { container } = render(<WorkoutSummary workout={null} onDismiss={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows first-workout copy when isFirstWorkout is true', () => {
    render(
      <WorkoutSummary
        workout={baseWorkout}
        onDismiss={() => {}}
        isFirstWorkout
      />
    );
    expect(screen.getByText(/First Workout Logged/i)).toBeTruthy();
    expect(screen.getByText(/1 of 24/i)).toBeTruthy();
  });

  it('shows standard completion copy otherwise', () => {
    render(<WorkoutSummary workout={baseWorkout} onDismiss={() => {}} />);
    expect(screen.getByText(/Workout Complete/i)).toBeTruthy();
    expect(screen.getByText(/Saved to history/i)).toBeTruthy();
  });

  it('shows cycle-complete copy when isCycleComplete is true', () => {
    render(
      <WorkoutSummary
        workout={baseWorkout}
        onDismiss={() => {}}
        isCycleComplete
      />
    );
    expect(screen.getByText(/6-Week Cycle Complete/i)).toBeTruthy();
  });

  it('computes correct set / rep / volume stats from the workout', () => {
    // 4 + 3 = 7 sets
    // 4*8 + 3*12 = 68 reps
    // (4*8*180) + (3*12*400) = 5760 + 14400 = 20,160 volume
    render(<WorkoutSummary workout={baseWorkout} onDismiss={() => {}} />);
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('68')).toBeTruthy();
    expect(screen.getByText('20,160')).toBeTruthy();
  });

  it('handles zero-set workouts with "Workout Ended Early" copy, no stats, no confetti', () => {
    const empty = { completed: false, day: 1, week: 1 };
    render(<WorkoutSummary workout={empty} onDismiss={() => {}} />);
    expect(screen.getByText(/Workout Ended Early/i)).toBeTruthy();
    expect(screen.getByText(/No sets logged/i)).toBeTruthy();
    // Stats row is hidden for empty workouts
    expect(screen.queryByText('Sets')).toBeNull();
    expect(screen.queryByText('Volume lbs')).toBeNull();
  });

  it('shows the next workout preview when provided', () => {
    const next = { name: 'Heavy Bench', type: 'strength', primary: 'bench_press' };
    render(
      <WorkoutSummary
        workout={baseWorkout}
        onDismiss={() => {}}
        nextWorkout={next}
      />
    );
    expect(screen.getByText(/Up next/i)).toBeTruthy();
    expect(screen.getByText(/Heavy Bench/i)).toBeTruthy();
  });

  it('omits next-workout section when none provided', () => {
    render(<WorkoutSummary workout={baseWorkout} onDismiss={() => {}} />);
    expect(screen.queryByText(/Up next/i)).toBeNull();
  });

  it('calls onDismiss when Done button is clicked', () => {
    const onDismiss = vi.fn();
    render(<WorkoutSummary workout={baseWorkout} onDismiss={onDismiss} />);
    const doneBtn = screen.getByText(/Done/i);
    fireEvent.click(doneBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when backdrop is clicked', () => {
    const onDismiss = vi.fn();
    const { container } = render(<WorkoutSummary workout={baseWorkout} onDismiss={onDismiss} />);
    // The backdrop is the first fixed inset-0 div
    const backdrop = container.querySelector('.fixed.inset-0.z-\\[90\\]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalled();
  });
});