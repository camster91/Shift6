/**
 * exerciseImages.js — maps Armor exercise IDs to their illustration
 * assets. Used by <ExerciseIllustration /> to render a small image
 * next to the exercise name in ArmorWorkoutSession and
 * ArmorDashboard.
 *
 * Asset ownership: every image in this map was generated via text-
 * to-image on MiniMax image-01 (4 exercises), Imagen 4 (6 exercises)
 * or Imagen 4 Ultra (1 exercise) — no reference images used, no
 * third-party dataset bundled. Outputs are owned outright under each
 * vendor's commercial-use terms.
 *
 * To add a new illustration:
 *   1. Generate the image (T2I, no reference). Style: clean
 *      technical illustration, neutral gray bg, no text/logos.
 *   2. Convert to WebP at q=80: `cwebp -q 80 input.png out.webp`
 *   3. Drop the .webp into public/exercises/<id>.webp
 *   4. Add the entry to EXERCISE_IMAGES below.
 */
export const EXERCISE_IMAGES = {
  // Primary lifts — barbell / chest-held dumbbell / hip hinge
  barbell_squat: '/exercises/barbell_squat.webp',       // MiniMax
  bench_press: '/exercises/bench_press.webp',           // MiniMax
  deadlift: '/exercises/deadlift.webp',                 // MiniMax
  dumbbell_press: '/exercises/dumbbell_press.webp',     // Imagen 4 Ultra
  goblet_squat: '/exercises/goblet_squat.webp',         // Imagen 4
  romanian_deadlift: '/exercises/romanian_deadlift.webp', // Imagen 4
  // Accessories — bodyweight / simple dumbbell
  pushups: '/exercises/pushups.webp',                   // Imagen 4
  plank: '/exercises/plank.webp',                       // Imagen 4
  lunges: '/exercises/lunges.webp',                     // Imagen 4
  glute_bridge: '/exercises/glute_bridge.webp',         // Imagen 4
  calf_raises: '/exercises/calf_raises.webp',           // Imagen 4 Ultra
};

/**
 * Returns the illustration URL for an exercise, or null if no
 * illustration exists. Callers should render a fallback (text
 * only) when this returns null.
 */
export function getExerciseImage(exerciseId) {
  return EXERCISE_IMAGES[exerciseId] || null;
}