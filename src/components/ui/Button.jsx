import { forwardRef } from 'react';

// ── Variant styles ────────────────────────────────────────────────────────────
const variantClasses = {
  primary:   'bg-cyan-600 text-white font-bold',
  secondary: 'bg-white/[0.04] text-white font-bold',
  ghost:     'text-slate-300 font-medium',
  danger:    'bg-red-500 text-white font-bold',
  success:   'bg-emerald-500 text-white font-bold',
};

// ── Size styles ───────────────────────────────────────────────────────────────
const sizeClasses = {
  sm: 'py-2 px-3 text-xs',
  md: 'py-3 px-4 text-sm',
  lg: 'py-4 px-5 text-base',
};

/**
 * Button — 5 variants × 3 sizes, built on armor-press + rounded-xl.
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
  const disabledClass = disabled ? 'opacity-50 pointer-events-none' : '';

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      {...props}
      className={[
        'rounded-xl armor-press transition-all',
        variantClasses[variant] ?? variantClasses.primary,
        sizeClasses[size] ?? sizeClasses.md,
        disabledClass,
        className,
      ].join(' ')}
    >
      {icon && (
        <span className="inline-flex items-center mr-2">
          {icon}
        </span>
      )}
      {children}
      {iconRight && (
        <span className="inline-flex items-center ml-2">
          {iconRight}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;