/**
 * Toggle — a switch control bound to a boolean. Used in Settings rows
 * for "enable daily habit reminder" / "enable workout reminder" etc.
 *
 * @param {boolean} checked       - Whether the toggle is on
 * @param {string}  ariaLabel     - Accessible label (e.g. "Toggle daily habits reminder")
 * @param {function} onChange      - Called with the new value
 * @param {string}  accent        - The accent token name. Default: 'cyan'.
 */
export default function Toggle({ checked, ariaLabel, onChange, accent = 'cyan' }) {
  const trackColor = checked
    ? accent === 'success'
      ? 'bg-[var(--color-success)]'
      : 'bg-[var(--color-accent)]'
    : 'bg-[var(--color-surface-active)]';
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`armor-press relative w-11 h-6 rounded-full transition-colors ${trackColor} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--elevation-0-bg)]`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}
