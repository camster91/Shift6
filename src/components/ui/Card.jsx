import { forwardRef } from 'react';

/**
 * Card — surface container primitive.
 * @param {boolean} padded   - Apply default padding (p-5). Default: true.
 * @param {boolean} interactive - Add armor-press for tap feedback. Default: false.
 * @param {string}  className - Additional CSS classes.
 */
const Card = forwardRef(({
  children,
  padded = true,
  interactive = false,
  className = '',
}, ref) => {
  const base = 'armor-surface-1 rounded-2xl';
  const padClass = padded ? 'p-5' : '';
  const interactiveClass = interactive ? 'armor-press cursor-pointer' : '';

  return (
    <div
      ref={ref}
      className={`${base} ${padClass} ${interactiveClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;