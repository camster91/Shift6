/**
 * ExerciseIllustration.test.jsx — verifies the lazy-loaded illustration
 * component renders the right asset per exerciseId, falls back cleanly
 * when no illustration exists, and never breaks the surrounding layout.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ExerciseIllustration from './ExerciseIllustration';
import { getExerciseImage } from '../data/exerciseImages';

describe('getExerciseImage', () => {
  it('returns the asset path for an exercise that has an illustration', () => {
    // Primary lifts
    expect(getExerciseImage('barbell_squat')).toBe('/exercises/barbell_squat.webp');
    expect(getExerciseImage('bench_press')).toBe('/exercises/bench_press.webp');
    expect(getExerciseImage('deadlift')).toBe('/exercises/deadlift.webp');
    expect(getExerciseImage('dumbbell_press')).toBe('/exercises/dumbbell_press.webp');
    expect(getExerciseImage('goblet_squat')).toBe('/exercises/goblet_squat.webp');
    expect(getExerciseImage('romanian_deadlift')).toBe('/exercises/romanian_deadlift.webp');
    // Bodyweight accessories
    expect(getExerciseImage('pushups')).toBe('/exercises/pushups.webp');
    expect(getExerciseImage('plank')).toBe('/exercises/plank.webp');
    expect(getExerciseImage('lunges')).toBe('/exercises/lunges.webp');
    expect(getExerciseImage('glute_bridge')).toBe('/exercises/glute_bridge.webp');
    expect(getExerciseImage('calf_raises')).toBe('/exercises/calf_raises.webp');
    // Machine / cable accessories
    expect(getExerciseImage('leg_press')).toBe('/exercises/leg_press.webp');
    expect(getExerciseImage('leg_curls')).toBe('/exercises/leg_curls.webp');
    expect(getExerciseImage('incline_bench')).toBe('/exercises/incline_bench.webp');
    expect(getExerciseImage('lateral_raise')).toBe('/exercises/lateral_raise.webp');
    expect(getExerciseImage('bicep_curl')).toBe('/exercises/bicep_curl.webp');
    expect(getExerciseImage('tricep_dips')).toBe('/exercises/tricep_dips.webp');
  });

  it('returns null for an exercise without an illustration', () => {
    expect(getExerciseImage('hammer_curl')).toBeNull();
    expect(getExerciseImage('tricep_pushdown')).toBeNull();
    expect(getExerciseImage('does_not_exist')).toBeNull();
  });
});

describe('ExerciseIllustration', () => {
  it('renders an img for an exercise that has an illustration', () => {
    const { container } = render(<ExerciseIllustration exerciseId="barbell_squat" />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/exercises/barbell_squat.webp');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
  });

  it('renders null (no DOM) for an exercise without an illustration', () => {
    const { container } = render(<ExerciseIllustration exerciseId="hammer_curl" />);
    expect(container.innerHTML).toBe('');
  });

  it('uses compact sizing in compact mode (square aspect, no max-w)', () => {
    const { container } = render(
      <ExerciseIllustration exerciseId="deadlift" compact />
    );
    const root = container.firstChild;
    expect(root.className).toContain('aspect-square');
    expect(root.className).not.toContain('max-w-md');
  });

  it('uses full sizing in non-compact mode (max-w-md for larger card)', () => {
    const { container } = render(
      <ExerciseIllustration exerciseId="deadlift" />
    );
    const root = container.firstChild;
    expect(root.className).toContain('max-w-md');
  });

  it('marks the wrapper as role=img with a useful aria-label', () => {
    const { container } = render(
      <ExerciseIllustration exerciseId="barbell_squat" alt="Custom alt" />
    );
    const root = container.firstChild;
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('Custom alt');
  });

  it('derives a default alt text from the exerciseId when alt is not given', () => {
    const { container } = render(
      <ExerciseIllustration exerciseId="barbell_squat" />
    );
    const root = container.firstChild;
    expect(root.getAttribute('aria-label')).toBe('barbell squat demonstration');
  });

  it('applies a custom className to the wrapper', () => {
    const { container } = render(
      <ExerciseIllustration
        exerciseId="barbell_squat"
        className="mb-4 -mx-2"
      />
    );
    expect(container.firstChild.className).toContain('mb-4');
    expect(container.firstChild.className).toContain('-mx-2');
  });
});