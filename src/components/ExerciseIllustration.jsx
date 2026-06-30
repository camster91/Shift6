/**
 * ExerciseIllustration — lazy-loaded illustration for an exercise.
 *
 * Renders an <img loading="lazy"> for the given exerciseId, if one
 * exists. Falls back to a simple "no image" placeholder if the
 * exercise has no illustration. The image is `decoding="async"`
 * so the main thread isn't blocked while the browser decodes
 * the WebP.
 *
 * Styling: square aspect ratio, rounded corners, light gray
 * background to keep the visual calm. Adjusts size for
 * `compact` (smaller, used on dashboard primary-lift card) vs
 * full size (used on the workout active-set screen).
 *
 * Dark-mode treatment: the illustrations are designed against a
 * neutral light-gray background that clashes with the dark UI.
 * The CSS rule for `.exercise-illustration-img` in index.css
 * applies a brightness/saturate filter in dark mode so the image
 * integrates with the surface color; light mode is unaffected.
 */
import { getExerciseImage } from '../data/exerciseImages';

export default function ExerciseIllustration({
  exerciseId,
  compact = false,
  className = '',
  alt,
}) {
  const src = getExerciseImage(exerciseId);
  if (!src) return null;

  const altText = alt || `${exerciseId.replace(/_/g, ' ')} demonstration`;

  if (compact) {
    return (
      <div
        className={`relative w-full aspect-square overflow-hidden rounded-xl bg-[var(--color-surface-1)] ${className}`}
        role="img"
        aria-label={altText}
      >
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain exercise-illustration-img"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full max-w-md mx-auto aspect-square overflow-hidden rounded-2xl bg-[var(--color-surface-1)] ${className}`}
      role="img"
      aria-label={altText}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-contain exercise-illustration-img"
      />
    </div>
  );
}