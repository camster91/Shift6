import Button from './Button.jsx';

/**
 * EmptyState — centered empty state with icon, title, description, optional CTA.
 * @param {React.ReactNode} icon        - Already instantiated icon (e.g. <Dumbbell size={48} />)
 * @param {string}          title       - Bold title
 * @param {string}          description - Secondary explanation
 * @param {{ label: string, onClick: function }|undefined} action - Optional CTA
 */
const EmptyState = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Icon */}
      <div className="text-[var(--text-tertiary)] mb-4 flex items-center justify-center">
        {icon}
      </div>

      {/* Title */}
      <p className="text-lg font-bold text-[var(--text-primary)] mb-2">
        {title}
      </p>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs">
        {description}
      </p>

      {/* Optional CTA */}
      {action && (
        <Button
          variant="primary"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

export default EmptyState;