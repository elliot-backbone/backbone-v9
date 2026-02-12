/**
 * ActionSlot — Single category row within a CompanyCard
 *
 * Shows: category label, action title, impact badge, done/skip buttons.
 */

import { getImpactBucket } from '../lib/actionCategories';

const IMPACT_STYLES = {
  high:   'bg-bb-red/20 text-bb-red',
  medium: 'bg-bb-amber/20 text-bb-amber',
  low:    'text-bb-text-muted',
};

export default function ActionSlot({ slot, onActionClick, onDone, onSkip }) {
  const { category, label, topAction, remaining } = slot;

  if (!topAction) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 text-bb-text-muted text-xs font-mono opacity-40">
        <span className="w-16 truncate">{label}</span>
        <span className="flex-1 text-center">—</span>
      </div>
    );
  }

  const bucket = getImpactBucket(topAction.rankScore || 0);
  const badgeClass = IMPACT_STYLES[bucket] || IMPACT_STYLES.low;

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 group hover:bg-bb-card/50 transition-colors rounded">
      {/* Category label */}
      <span className="w-16 text-[10px] font-mono text-bb-text-muted uppercase tracking-wide truncate flex-shrink-0">
        {label}
      </span>

      {/* Action title */}
      <button
        onClick={() => onActionClick(topAction)}
        className="flex-1 text-left text-xs text-bb-text-secondary hover:text-bb-accent transition-colors truncate"
        title={topAction.title}
      >
        {topAction.title}
      </button>

      {/* Impact badge */}
      <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded uppercase flex-shrink-0 ${badgeClass}`}>
        {bucket[0].toUpperCase()}
      </span>

      {/* Done / Skip buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onDone(topAction); }}
          className="w-5 h-5 flex items-center justify-center text-[10px] text-bb-text-muted hover:text-bb-lime hover:bg-bb-lime/10 rounded transition-colors"
          title="Done"
        >
          ✓
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(topAction); }}
          className="w-5 h-5 flex items-center justify-center text-[10px] text-bb-text-muted hover:text-bb-red hover:bg-bb-red/10 rounded transition-colors"
          title="Skip"
        >
          ✗
        </button>
      </div>

      {/* Remaining count */}
      {remaining > 0 && (
        <span className="text-[9px] font-mono text-bb-text-muted flex-shrink-0">
          +{remaining}
        </span>
      )}
    </div>
  );
}
