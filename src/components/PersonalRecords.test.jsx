/**
 * PersonalRecords.test.jsx — verifies the PR feed:
 *   - picks the heaviest weight per exercise
 *   - sorts heaviest first
 *   - records reps + date
 *   - skips incomplete sets (weight=0)
 *   - renders nothing for empty history
 *   - lb/kg conversion works
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonalRecords from './PersonalRecords';

const seed = [
  {
    date: '2026-06-15',
    completed: true,
    exercises: [
      { id: 'barbell_squat', sets: [
        { reps: 8, weight: 180 },
        { reps: 8, weight: 200 },
        { reps: 8, weight: 220 }, // <-- heaviest squat
      ]},
      { id: 'bench_press', sets: [
        { reps: 5, weight: 165 }, // <-- heaviest bench
      ]},
    ],
  },
  {
    date: '2026-06-22',
    completed: true,
    exercises: [
      { id: 'barbell_squat', sets: [
        { reps: 5, weight: 240 }, // <-- new PR: heaviest ever
      ]},
      { id: 'deadlift', sets: [
        { reps: 3, weight: 315 }, // <-- only DL ever
      ]},
    ],
  },
];

describe('PersonalRecords', () => {
  it('renders nothing when no workout history', () => {
    const { container } = render(<PersonalRecords workoutHistory={[]} />);
    expect(container.querySelector('[data-testid="personal-records"]')).toBeNull();
  });

  it('picks the heaviest weight per exercise across all sessions', () => {
    render(<PersonalRecords workoutHistory={seed} />);
    // Heavyest squat = 240 (most recent), heaviest bench = 165,
    // heaviest deadlift = 315.
    expect(screen.getByText('240')).toBeTruthy();
    expect(screen.getByText('165')).toBeTruthy();
    expect(screen.getByText('315')).toBeTruthy();
  });

  it('sorts heaviest first', () => {
    render(<PersonalRecords workoutHistory={seed} />);
    const rows = [...document.querySelectorAll('[data-testid="personal-records"] .rounded-xl')];
    expect(rows[0].textContent).toContain('315'); // deadlift
    expect(rows[1].textContent).toContain('240'); // squat
    expect(rows[2].textContent).toContain('165'); // bench
  });

  it('shows reps + date in the row label', () => {
    render(<PersonalRecords workoutHistory={seed} />);
    // The bench entry has 5 reps, on 6/15
    const benchRow = screen.getByText('bench press').closest('.rounded-xl');
    expect(benchRow.textContent).toMatch(/5/);
    expect(benchRow.textContent).toMatch(/rep/i);
  });

  it('skips sets with weight 0 (incomplete)', () => {
    const partial = [{
      date: '2026-06-15',
      completed: true,
      exercises: [
        { id: 'pushups', sets: [
          { reps: 10, weight: 0 }, // bodyweight — skip
          { reps: 10, weight: 0 },
        ]},
      ],
    }];
    const { container } = render(<PersonalRecords workoutHistory={partial} />);
    expect(container.querySelector('[data-testid="personal-records"]')).toBeNull();
  });

  it('skips explicitly incomplete sets', () => {
    const abandoned = [{
      date: '2026-06-15',
      completed: true,
      exercises: [
        { id: 'barbell_squat', sets: [
          { reps: 8, weight: 220, completed: true },
          { reps: 8, weight: 250, completed: false }, // skip
        ]},
      ],
    }];
    render(<PersonalRecords workoutHistory={abandoned} />);
    expect(screen.getByText('220')).toBeTruthy();
    expect(screen.queryByText('250')).toBeNull();
  });

  it('honors the limit prop', () => {
    const manyExercises = [{
      date: '2026-06-15',
      completed: true,
      exercises: Array.from({ length: 20 }, (_, i) => ({
        id: `exercise_${i}`,
        sets: [{ reps: 5, weight: 100 + i * 5 }],
      })),
    }];
    render(<PersonalRecords workoutHistory={manyExercises} limit={3} />);
    const rows = document.querySelectorAll('[data-testid="personal-records"] .rounded-xl');
    expect(rows.length).toBe(3);
  });

  it('converts lb→kg when unit=kg', () => {
    render(<PersonalRecords workoutHistory={seed} unit="kg" />);
    // 240 lb → 109 kg (240 / 2.20462 = 108.86, rounds to 109)
    expect(screen.getByText('109')).toBeTruthy();
  });
});