/**
 * Session card for student feed — department, creator (lecturer), title, state badge, capacity bar, Join or View position.
 */
import StateBadge from './StateBadge';

export default function SessionCard({ session, onJoin, joinDisabled, alreadyInQueue, onViewPosition }) {
  if (!session) return null;
  const { title, state = 'DRAFT', total_enrolled = 0, capacity = 1, slot_duration, department, creator, visibility } = session;
  const pct = capacity > 0 ? Math.round((total_enrolled / capacity) * 100) : 0;
  const barColor = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success';
  const isRestricted = visibility === 'RESTRICTED';
  const subtitle = [department?.name, creator?.full_name].filter(Boolean).join(' · ') || null;

  return (
    <div
      className="
        bg-surface/60 backdrop-blur-xl
        border border-border rounded-2xl p-5 sm:p-6
        shadow-xl shadow-black/20
        hover:border-border-strong
        transition-all duration-300
      "
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <StateBadge state={state} />
      </div>
      {(subtitle || isRestricted) && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
          {isRestricted && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30">
              For your course only
            </span>
          )}
        </div>
      )}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>{total_enrolled} / {capacity} slots</span>
          {slot_duration != null && <span>{slot_duration} min each</span>}
        </div>
        <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
      {(state === 'OPEN' || state === 'ACTIVE') && (
        alreadyInQueue && onViewPosition ? (
          <button
            type="button"
            onClick={() => onViewPosition(session)}
            className="
              w-full bg-surface-elevated hover:bg-surface
              border-2 border-primary text-primary font-semibold py-3 rounded-xl
              transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              min-h-[44px]
            "
          >
            View your position
          </button>
        ) : onJoin ? (
          <button
            type="button"
            onClick={() => onJoin(session)}
            disabled={joinDisabled}
            className="
              w-full bg-primary hover:bg-primary-hover
              text-white font-semibold py-3 rounded-xl
              shadow-lg shadow-primary/25 hover:shadow-primary/40
              transition-all duration-200
              hover:scale-[1.02] active:scale-[0.98]
              min-h-[44px]
              disabled:opacity-60 disabled:pointer-events-none
            "
          >
            {joinDisabled ? 'Joining...' : 'Join queue'}
          </button>
        ) : null
      )}
    </div>
  );
}
