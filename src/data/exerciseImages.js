/**
 * exerciseImages.js — maps Armor exercise IDs to their illustration
 * assets. Used by <ExerciseIllustration /> to render a small image
 * next to the exercise name in ArmorWorkoutSession and
 * ArmorDashboard.
 *
 * Asset ownership: every image in this map was generated via text-
 * to-image on MiniMax image-01 (3 exercises) or Imagen 4 (1
 * exercise), then converted to WebP. No reference images were used
 * in generation, no third-party dataset was bundled — the outputs
 * are owned outright under each vendor's commercial-use terms.
 *
 * To add a new illustration:
 *   1. Generate the image (T2I, no reference). Style: clean
 *      technical illustration, neutral gray bg, no text/logos.
 *   2. Convert to WebP at q=80: `cwebp -q 80 input.jpg out.webp`
 *   3. Drop the .webp into public/exercises/<id>.webp
 *   4. Add the entry to EXERCISE_IMAGES below.
 */
export const EXERCISE_IMAGES = {
  barbell_squat: '/exercises/barbell_squat.webp',
  bench_press: '/exercises/bench_press.webp',
  deadlift: '/exercises/deadlift.webp',
  dumbbell_press: '/exercises/dumbbell_press.webp',
  goblet_squat: '/exercises/goblet_squat.webp',
  romanian_deadlift: '/exercises/romanian_deadlift.webp',
};

/**
 * Returns the illustration URL for an exercise, or null if no
 * illustration exists. Callers should render a fallback (text
 * only) when this returns null.
 */
export function getExerciseImage(exerciseId) {
  return EXERCISE_IMAGES[exerciseId] || null;
}