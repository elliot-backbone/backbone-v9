import Link from 'next/link';
import { routeForEntity } from '../lib/entities/routeForEntity';

/**
 * ActionCard - Compact action display for feed view
 * 
 * Shows:
 * - Rank score badge
 * - Source type indicator
 * - Entity name + action title
 * - Upside magnitude bar
 */
export default function ActionCard({ action, onClick, isSelected }) {
  if (!action) return null;

  const impact = action.impact || {};
  const source = action.sources?.[0] || {};
  
  // Source type colors
  const sourceStyles = {
    'ISSUE': { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50' },
    'PREISSUE': { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50' },
    'INTRODUCTION': { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50' }
  };
  const style = sourceStyles[source.sourceType] || { bg: 'bg-gray-500', text: 'text-gray-700', light: 'bg-gray-50' };

  // Upside bar width (0-100 scale)
  const upsideWidth = Math.min(100, Math.max(0, impact.upsideMagnitude || 0));

  return (
    <div 
      onClick={onClick}
      className={`
        p-4 border rounded-lg cursor-pointer transition-all
        ${isSelected 
          ? 'border-gray-900 bg-gray-50 shadow-sm' 
          : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
        }
      `}
    >
      {/* Top row: Score + Source + Entity */}
      <div className="flex items-center gap-3 mb-2">
        {/* Rank score badge */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 text-white font-semibold text-sm">
          {action.rankScore?.toFixed(0) || '—'}
        </div>
        
        {/* Source type pill */}
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${style.light} ${style.text}`}>
          {source.sourceType || 'ACTION'}
        </span>
        
        {/* Entity name */}
        <Link
          href={routeForEntity(action.entityRef?.type, action.entityRef?.id)}
          onClick={e => e.stopPropagation()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {action.entityRef?.name || 'Unknown'}
        </Link>
      </div>

      {/* Title */}
      <h3 className="text-gray-900 font-medium mb-3 line-clamp-2">
        {action.title}
      </h3>

      {/* Bottom row: Upside bar + metrics */}
      <div className="flex items-center gap-4">
        {/* Upside bar */}
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${style.bg} rounded-full transition-all`}
            style={{ width: `${upsideWidth}%` }}
          />
        </div>
        
        {/* Upside number */}
        <span className="text-sm text-gray-600 font-medium w-8 text-right">
          {impact.upsideMagnitude || 0}
        </span>
      </div>

      {/* Issue/preissue type (subtle) */}
      {(source.issueType || source.preIssueType) && (
        <div className="mt-2 text-xs text-gray-400">
          {source.issueType || source.preIssueType}
        </div>
      )}
    </div>
  );
}
