/**
 * PageHeader — h1 title + optional count chip + description + actions row.
 * Wraps to flex-col on narrow viewports, flex-row on sm+.
 *
 * @param {string}       title       - armor-text-large-title heading
 * @param {number|string|undefined} count - Optional badge count
 * @param {string|undefined} description - Optional secondary text
 * @param {React.ReactNode|undefined} actions - Right-aligned buttons/elements
 */
const PageHeader = ({
  title,
  count,
  description,
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
      {/* Left: title + count chip + description */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="armor-text-large-title">{title}</h1>
          {count !== undefined && (
            <span className="armor-badge armor-badge-accent">
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="armor-text-footnote">{description}</p>
        )}
      </div>

      {/* Right: actions */}
      {actions && (
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

PageHeader.displayName = 'PageHeader';

export default PageHeader;
