import Link from 'next/link';

/**
 * ActionCard - FM-style action display
 * 
 * Dense, data-rich card with:
 * - Left accent border by type
 * - Rank score badge
 * - Entity link
 * - Quick metrics
 */
export default function ActionCard({ action, onClick }) {
  const {
    title,
    entityRef,
    sourceType,
    upside = 0,
    rankScore = 0,
    probability = 0,
    effort = 0,
    lifecycle = 'proposed',
  } = action;

  // Accent color by source type
  const accentClass = sourceType === 'issue' 
    ? 'border-l-bb-red' 
    : sourceType === 'preissue' 
      ? 'border-l-bb-amber' 
      : 'border-l-bb-lime';

  // Score ring color
  const scoreColor = rankScore >= 80 
    ? 'ring-bb-lime text-bb-lime' 
    : rankScore >= 60 
      ? 'ring-bb-amber text-bb-amber' 
      : 'ring-bb-text-muted text-bb-text-muted';

  // Source badge color
  const sourceBadgeClass = sourceType === 'issue'
    ? 'bg-bb-red/20 text-bb-red'
    : 'bg-bb-amber/20 text-bb-amber';

  return (
    <div
      onClick={onClick}
      className={`bg-bb-card border border-bb-border hover:border-bb-border-light cursor-pointer transition-all group border-l-2 ${accentClass}`}
    >
      <div className="p-4 flex items-start gap-4">
        {/* Rank Score */}
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 rounded-full ring-2 ${scoreColor} flex items-center justify-center font-mono text-lg relative`}>
            {rankScore}
            {rankScore >= 80 && (
              <div className="absolute inset-0 rounded-full ring-2 ring-bb-lime animate-ping opacity-20" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: entity + source */}
          <div className="flex items-center gap-2 mb-1">
            {entityRef && (
              <Link
                href={`/entities/${entityRef.type}/${entityRef.id}`}
                onClick={e => e.stopPropagation()}
                className="text-bb-text-secondary hover:text-bb-lime text-sm font-mono transition-colors"
              >
                {entityRef.name || entityRef.id}
              </Link>
            )}
            <span className={`px-2 py-0.5 text-xs font-mono rounded ${sourceBadgeClass}`}>
              {sourceType?.toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-bb-text font-medium group-hover:text-bb-lime transition-colors truncate">
            {title}
          </h3>

          {/* Bottom row: metrics */}
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="font-mono text-bb-text-muted">
              P:<span className="text-bb-text ml-1">{Math.round(probability * 100)}%</span>
            </span>
            <span className="font-mono text-bb-text-muted">
              E:<span className="text-bb-text ml-1">{effort}</span>
            </span>
            <span className={`font-mono uppercase text-xs ${
              lifecycle === 'proposed' ? 'text-bb-text-muted' :
              lifecycle === 'executed' ? 'text-bb-blue' :
              'text-bb-green'
            }`}>
              {lifecycle}
            </span>
          </div>
        </div>

        {/* Upside */}
        <div className="flex-shrink-0 text-right">
          <div className="text-xl font-mono text-bb-lime">
            ${(upside / 1000000).toFixed(2)}M
          </div>
          <div className="mt-1 w-20 h-1 bg-bb-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-bb-lime/50"
              style={{ width: `${Math.min((upside / 5000000) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
