import Link from 'next/link';
import { routeForEntity } from '../lib/entities/routeForEntity';

/**
 * ActionCard - Football Manager Style
 * 
 * Dense data card showing:
 * - Rank score with colored ring
 * - Source type badge
 * - Entity + action title
 * - Impact metrics bar
 * - Upside gauge
 */
export default function ActionCard({ action, onClick, isSelected }) {
  if (!action) return null;

  const impact = action.impact || {};
  const source = action.sources?.[0] || {};
  
  // Source type styling
  const sourceConfig = {
    'ISSUE': { 
      bg: 'bg-bb-red/10', 
      text: 'text-bb-red', 
      border: 'border-bb-red',
      accent: 'bb-accent-red',
      glow: 'hover:shadow-glow-red'
    },
    'PREISSUE': { 
      bg: 'bg-bb-amber/10', 
      text: 'text-bb-amber', 
      border: 'border-bb-amber',
      accent: 'bb-accent-amber',
      glow: 'hover:shadow-glow-lime'
    },
    'INTRODUCTION': { 
      bg: 'bg-bb-blue/10', 
      text: 'text-bb-blue', 
      border: 'border-bb-blue',
      accent: 'bb-accent-blue',
      glow: 'hover:shadow-glow-lime'
    }
  };
  
  const style = sourceConfig[source.sourceType] || { 
    bg: 'bg-bb-border', 
    text: 'text-bb-text-muted', 
    border: 'border-bb-border',
    accent: 'bb-accent-lime',
    glow: 'hover:shadow-glow-lime'
  };

  // Score color based on value
  const score = action.rankScore || 0;
  const scoreColor = score >= 80 ? 'text-bb-lime' : score >= 60 ? 'text-bb-amber' : score >= 40 ? 'text-bb-text' : 'text-bb-text-muted';
  const ringColor = score >= 80 ? 'border-bb-lime' : score >= 60 ? 'border-bb-amber' : score >= 40 ? 'border-bb-text-muted' : 'border-bb-border';
  
  // Upside bar calculation
  const upsideWidth = Math.min(100, Math.max(0, impact.upsideMagnitude || 0));
  const upsideColor = source.sourceType === 'ISSUE' ? 'bg-bb-red' : source.sourceType === 'PREISSUE' ? 'bg-bb-amber' : 'bg-bb-lime';

  return (
    <div 
      onClick={onClick}
      className={`
        group relative bg-bb-card border border-bb-border rounded cursor-pointer 
        transition-all duration-200 ${style.glow}
        ${isSelected 
          ? 'border-bb-lime bg-bb-panel shadow-glow-lime' 
          : 'hover:border-bb-border-light hover:bg-bb-panel'
        }
      `}
    >
      {/* Accent border on left */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
        source.sourceType === 'ISSUE' ? 'bg-bb-red' : 
        source.sourceType === 'PREISSUE' ? 'bg-bb-amber' : 'bg-bb-lime'
      }`} />
      
      <div className="p-4 pl-5">
        {/* Top Row: Score + Source + Entity */}
        <div className="flex items-center gap-4 mb-3">
          {/* Rank Score Circle */}
          <div className={`
            relative flex items-center justify-center w-12 h-12 rounded-full 
            border-2 ${ringColor} bg-bb-darker
          `}>
            <span className={`font-mono text-lg font-semibold ${scoreColor}`}>
              {score.toFixed(0)}
            </span>
            {/* Animated ring for high scores */}
            {score >= 80 && (
              <div className="absolute inset-0 rounded-full border-2 border-bb-lime animate-pulse-slow opacity-50" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Source badge + Entity */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`bb-badge ${style.bg} ${style.text} border ${style.border}`}>
                {source.sourceType || 'ACTION'}
              </span>
              
              <Link
                href={routeForEntity(action.entityRef?.type, action.entityRef?.id)}
                onClick={e => e.stopPropagation()}
                className="text-xs text-bb-text-secondary hover:text-bb-lime transition-colors truncate"
              >
                {action.entityRef?.name || 'Unknown'}
              </Link>
            </div>
            
            {/* Title */}
            <h3 className="text-bb-text font-medium leading-tight line-clamp-2 group-hover:text-bb-lime transition-colors">
              {action.title}
            </h3>
          </div>
          
          {/* Upside Value Display */}
          <div className="text-right">
            <div className="font-mono text-2xl font-bold text-bb-lime">
              {impact.upsideMagnitude || 0}
            </div>
            <div className="font-mono text-[10px] text-bb-text-muted uppercase tracking-wider">
              upside
            </div>
          </div>
        </div>

        {/* Bottom Row: Progress Bar + Metrics */}
        <div className="flex items-center gap-4">
          {/* Upside bar */}
          <div className="flex-1">
            <div className="h-1 bg-bb-border rounded-full overflow-hidden">
              <div 
                className={`h-full ${upsideColor} rounded-full transition-all duration-500`}
                style={{ width: `${upsideWidth}%` }}
              />
            </div>
          </div>
          
          {/* Quick metrics */}
          <div className="flex items-center gap-3 text-xs">
            {impact.probabilityOfSuccess && (
              <div className="flex items-center gap-1">
                <span className="text-bb-text-muted">P:</span>
                <span className="font-mono text-bb-text">{Math.round(impact.probabilityOfSuccess * 100)}%</span>
              </div>
            )}
            {impact.effort && (
              <div className="flex items-center gap-1">
                <span className="text-bb-text-muted">E:</span>
                <span className="font-mono text-bb-text">{impact.effort}</span>
              </div>
            )}
          </div>
        </div>

        {/* Issue/preissue type label */}
        {(source.issueType || source.preIssueType) && (
          <div className="mt-2 pt-2 border-t border-bb-border">
            <span className="font-mono text-[10px] text-bb-text-muted uppercase tracking-wider">
              {source.issueType || source.preIssueType}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
