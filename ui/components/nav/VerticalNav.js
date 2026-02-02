/**
 * Vertical Navigation - Entity Sidebar
 * 
 * Burger menu that expands to show all internal entity types.
 * Collapsed: shows stacked burger icon
 * Expanded: shows entity type links with counts
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ENTITY_TYPES, ENTITY_TYPE_LABELS } from '../../lib/entities/entityTypes';

// Icons for each entity type
const ENTITY_ICONS = {
  company: '🏢',
  person: '👤',
  firm: '🏛️',
  deal: '🤝',
  round: '💰',
  goal: '🎯',
  issue: '⚠️',
  action: '⚡',
};

// Entity type order for nav
const NAV_ORDER = [
  'company',
  'person', 
  'firm',
  'deal',
  'round',
  'goal',
  'issue',
  'action',
];

export default function VerticalNav() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // Get current entity type from route
  const currentType = router.query.type;

  // Fetch entity counts
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch('/api/entities?counts=true');
        if (res.ok) {
          const data = await res.json();
          setCounts(data.counts || {});
        }
      } catch (e) {
        console.error('Failed to fetch entity counts:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchCounts();
  }, []);

  // Close nav when route changes
  useEffect(() => {
    setExpanded(false);
  }, [router.asPath]);

  return (
    <>
      {/* Sidebar */}
      <nav 
        className={`fixed left-0 top-0 h-full bg-bb-panel border-r border-bb-border z-40 transition-all duration-200 ${
          expanded ? 'w-56' : 'w-12'
        }`}
      >
        {/* Burger Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full h-12 flex items-center justify-center hover:bg-bb-card transition-colors border-b border-bb-border"
          aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
        >
          <div className="flex flex-col gap-1">
            <span className={`block w-5 h-0.5 bg-bb-text-muted transition-transform ${expanded ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`block w-5 h-0.5 bg-bb-text-muted transition-opacity ${expanded ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-bb-text-muted transition-transform ${expanded ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </div>
        </button>

        {/* Logo/Home Link */}
        <Link 
          href="/"
          className={`flex items-center h-12 border-b border-bb-border hover:bg-bb-card transition-colors ${
            expanded ? 'px-4 gap-3' : 'justify-center'
          }`}
        >
          <img src="/backbone-icon.svg" alt="Backbone" className="h-5 w-5" />
          {expanded && (
            <span className="text-bb-text font-display text-sm">Actions</span>
          )}
        </Link>

        {/* Entity Type Links */}
        <div className="py-2">
          {NAV_ORDER.map(type => {
            const isActive = currentType === type;
            const count = counts[type] || 0;
            
            return (
              <Link
                key={type}
                href={`/entities/${type}`}
                className={`flex items-center h-10 transition-colors ${
                  expanded ? 'px-4 gap-3' : 'justify-center'
                } ${
                  isActive 
                    ? 'bg-bb-card border-l-2 border-bb-accent text-bb-accent' 
                    : 'text-bb-text-muted hover:text-bb-text hover:bg-bb-card'
                }`}
              >
                <span className="text-base" title={ENTITY_TYPE_LABELS[type]}>
                  {ENTITY_ICONS[type]}
                </span>
                {expanded && (
                  <>
                    <span className="flex-1 text-sm font-mono">
                      {ENTITY_TYPE_LABELS[type]}
                    </span>
                    {!loading && count > 0 && (
                      <span className="text-xs text-bb-text-muted font-mono">
                        {count}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Overlay when expanded (mobile) */}
      {expanded && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setExpanded(false)}
        />
      )}
    </>
  );
}
