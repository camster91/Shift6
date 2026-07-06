import { forwardRef } from 'react';

// ── Variant styles ────────────────────────────────────────────────────────────
// All variants pull from the design-token system (var(--color-*)) rather than
// hardcoded Tailwind color classes. Theme changes (dark ↔ light) propagate
// automatically.
const variantClasses = {
  primary:   'armor-btn armor-btn-primary',
  secondary: 'armor-btn armor-btn-secondary',
  ghost:     'armor-btn armor-btn-ghost',
  danger:    'armor-btn armor-btn-danger',
  success:   'armor-btn armor-btn-success',
};

// ── Size styles ───────────────────────────────────────────────────────────────
const sizeClasses = {
  sm: 'armor-btn-sm',
  md: 'armor-btn-md',
  lg: 'armor-btn-lg',
};

/**
 * Button — 5 variants × 3 sizes, built on the armor-btn token system.
 * @param {'primary'|'secondary'|'ghost'|'danger'|'success'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {React.ReactNode} icon      - Left icon (already instantiated, e.g. <Flame size={14} />)
 * @param {React.ReactNode} iconRight - Right icon (already instantiated)
 * @param {boolean}         disabled
 */
const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  icon,
  iconRight,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'armor-press',
        variantClasses[variant] ?? variantClasses.primary,
        sizeClasses[size] ?? sizeClasses.md,
        className,
      ].join(' ')}
      {...props}
    >
      {icon && (
        <span className="inline-flex items-center">
          {icon}
        </span>
      )}
      {children}
      {iconRight && (
        <span className="inline-flex items-center">
          {iconRight}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
