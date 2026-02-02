/**
 * Vertical Navigation - Portfolio Sidebar
 * 
 * FM-style burger menu for portfolio-scoped navigation.
 * Collapsed: shows stacked burger icon
 * Expanded: shows portfolio nav links
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Portfolio-scoped navigation items
const NAV_ITEMS = [
  { key: 'portfolio', label: 'Portfolio', icon: '📊', href: '/portfolio' },
  { key: 'rounds', label: 'Rounds', icon: '💰', href: '/rounds' },
  { key: 'relationships', label: 'Relationships', icon: '🤝', href: '/relationships' },
];

export default function VerticalNav() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  // Determine active nav item from current path
  const currentPath = router.asPath;

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

        {/* Logo/Home Link - Actions Inbox */}
        <Link 
          href="/"
          className={`flex items-center h-12 border-b border-bb-border hover:bg-bb-card transition-colors ${
            expanded ? 'px-4 gap-3' : 'justify-center'
          } ${currentPath === '/' ? 'bg-bb-card border-l-2 border-bb-accent' : ''}`}
        >
          <span className="text-base">⚡</span>
          {expanded && (
            <span className="text-bb-text font-display text-sm">Actions</span>
          )}
        </Link>

        {/* Portfolio Nav Links */}
        <div className="py-2">
          {NAV_ITEMS.map(item => {
            const isActive = currentPath.startsWith(item.href);
            
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center h-10 transition-colors ${
                  expanded ? 'px-4 gap-3' : 'justify-center'
                } ${
                  isActive 
                    ? 'bg-bb-card border-l-2 border-bb-accent text-bb-accent' 
                    : 'text-bb-text-muted hover:text-bb-text hover:bg-bb-card'
                }`}
              >
                <span className="text-base" title={item.label}>
                  {item.icon}
                </span>
                {expanded && (
                  <span className="flex-1 text-sm font-mono">
                    {item.label}
                  </span>
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
