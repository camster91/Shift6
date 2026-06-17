import { forwardRef } from 'react';

/**
 * Card — surface container primitive. Use `interactive` to get
 * armor-press tap feedback, focus ring, and keyboard support.
 * @param {boolean} padded     - Apply default padding (p-5). Default: true.
 * @param {boolean} interactive - Add armor-press for tap feedback. Default: false.
 * @param {string}  className - Additional CSS classes.
 */
const Card = forwardRef(({
  children,
  padded = true,
  interactive = false,
  className = '',
  onKeyDown,
  ...props
}, ref) => {
  const base = 'armor-surface-1 rounded-2xl relative';
  const padClass = padded ? 'p-5' : '';
  const interactiveClass = interactive
    ? 'armor-press cursor-pointer outline-none'
    : '';

  const handleKeyDown = (e) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      props.onClick?.(e);
    }
    onKeyDown?.(e);
  };

  return (
    <div
      ref={ref}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={handleKeyDown}
      className={`${base} ${padClass} ${interactiveClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
