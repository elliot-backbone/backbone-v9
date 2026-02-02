/**
 * Horizontal Navigation - Top Bar
 * 
 * Fixed top bar with:
 * - Breadcrumbs / current location
 * - Entity search
 * - Refresh / actions
 * - Date display
 */

import { useRouter } from 'next/router';
import Link from 'next/link';
import EntitySearch from '../EntitySearch';
import { ENTITY_TYPE_LABELS } from '../../lib/entities/entityTypes';

export default function HorizontalNav({ onRefresh }) {
  const router = useRouter();
  const { type, id } = router.query;

  // Build breadcrumb
  const getBreadcrumb = () => {
    if (type && id) {
      return (
        <>
          <Link href="/" className="text-bb-text-muted hover:text-bb-accent transition-colors">
            Home
          </Link>
          <span className="text-bb-border mx-2">/</span>
          <Link 
            href={`/entities/${type}`} 
            className="text-bb-text-muted hover:text-bb-accent transition-colors"
          >
            {ENTITY_TYPE_LABELS[type] || type}
          </Link>
          <span className="text-bb-border mx-2">/</span>
          <span className="text-bb-text truncate max-w-[200px]">{id}</span>
        </>
      );
    }
    
    if (type) {
      return (
        <>
          <Link href="/" className="text-bb-text-muted hover:text-bb-accent transition-colors">
            Home
          </Link>
          <span className="text-bb-border mx-2">/</span>
          <span className="text-bb-text">{ENTITY_TYPE_LABELS[type] || type}</span>
        </>
      );
    }

    return (
      <span className="text-bb-accent font-display">Action Center</span>
    );
  };

  return (
    <header className="fixed top-0 left-12 right-0 h-12 bg-bb-panel border-b border-bb-border z-30 flex items-center px-4">
      {/* Left: Breadcrumb */}
      <div className="flex items-center text-sm font-mono flex-1 min-w-0">
        {getBreadcrumb()}
      </div>

      {/* Center: Search */}
      <div className="flex-shrink-0 mx-4">
        <EntitySearch />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1 text-sm font-mono text-bb-text-muted hover:text-bb-accent border border-bb-border hover:border-bb-accent transition-colors"
          >
            ↻
          </button>
        )}
        <div className="text-bb-text-muted text-sm font-mono">
          {new Date().toLocaleDateString('en-GB', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
          })}
        </div>
      </div>
    </header>
  );
}
