/**
 * Session state badge — OPEN, ACTIVE, PAUSED, CLOSED, DRAFT
 */
const stateStyles = {
  DRAFT:
    'bg-surface-elevated text-text-muted border border-border',
  OPEN:
    'bg-success/15 text-success border border-success/20',
  ACTIVE:
    'bg-primary/15 text-primary border border-primary/20 animate-pulse',
  PAUSED:
    'bg-warning/15 text-warning border border-warning/20',
  CLOSED:
    'bg-surface-elevated text-text-muted border border-border',
};

export default function StateBadge({ state }) {
  const style = stateStyles[state] || stateStyles.DRAFT;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${style}`}
    >
      {state}
    </span>
  );
}
