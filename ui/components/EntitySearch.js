/**
 * Entity Search Component - Football Manager Style
 * 
 * Dark themed search panel with:
 * - Keyboard shortcut support
 * - Entity type badges
 * - Compact results display
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { routeForEntity } from '../lib/entities/routeForEntity';
import { getEntityTypeLabel } from '../lib/entities/entityTypes';

const TYPE_COLORS = {
  company: { bg: 'bg-bb-blue/10', text: 'text-bb-blue', border: 'border-bb-blue' },
  person: { bg: 'bg-bb-green/10', text: 'text-bb-green', border: 'border-bb-green' },
  firm: { bg: 'bg-bb-purple/10', text: 'text-bb-purple', border: 'border-bb-purple' },
  deal: { bg: 'bg-bb-amber/10', text: 'text-bb-amber', border: 'border-bb-amber' },
  goal: { bg: 'bg-bb-lime/10', text: 'text-bb-lime', border: 'border-bb-lime' },
  issue: { bg: 'bg-bb-red/10', text: 'text-bb-red', border: 'border-bb-red' },
  action: { bg: 'bg-bb-text-muted/10', text: 'text-bb-text-muted', border: 'border-bb-text-muted' },
  round: { bg: 'bg-bb-blue/10', text: 'text-bb-blue', border: 'border-bb-blue' },
};

export default function EntitySearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch entities
  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    
    fetch(`/api/entities?${params}`)
      .then(res => res.json())
      .then(data => {
        setResults(data.entities || []);
        setSelectedIndex(0);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [isOpen, query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % Math.min(results.length, 20));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + Math.min(results.length, 20)) % Math.min(results.length, 20));
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results.length]);

  return (
    <div ref={containerRef} className="fixed top-4 left-4 z-50">
      {/* Trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-bb-panel border border-bb-border rounded hover:border-bb-border-light hover:bg-bb-card transition-colors group"
        >
          <svg className="w-4 h-4 text-bb-text-muted group-hover:text-bb-lime transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden sm:inline text-bb-text-muted group-hover:text-bb-text transition-colors">Search</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] text-bb-text-muted bg-bb-border rounded">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Search panel */}
      {isOpen && (
        <div className="w-96 bg-bb-darker border border-bb-border rounded shadow-fm animate-fade-in">
          {/* Search input */}
          <div className="p-3 border-b border-bb-border">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-bb-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entities..."
                className="flex-1 bg-transparent text-sm text-bb-text outline-none placeholder-bb-text-muted"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-bb-text-muted hover:text-bb-lime transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-bb-border border-t-bb-lime rounded-full animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center">
                <span className="font-mono text-xs text-bb-text-muted uppercase tracking-wider">
                  {query ? 'No results' : 'Type to search'}
                </span>
              </div>
            ) : (
              <div className="py-1">
                {results.slice(0, 20).map((entity, index) => {
                  const route = routeForEntity(entity.type, entity.id);
                  const colors = TYPE_COLORS[entity.type] || TYPE_COLORS.action;
                  
                  return (
                    <Link
                      key={`${entity.type}-${entity.id}`}
                      href={route || '#'}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2 transition-colors
                        ${index === selectedIndex 
                          ? 'bg-bb-card' 
                          : 'hover:bg-bb-panel'
                        }
                      `}
                    >
                      <span className={`bb-badge ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {getEntityTypeLabel(entity.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-bb-text truncate">{entity.name}</div>
                        {entity.descriptor && (
                          <div className="text-xs text-bb-text-muted truncate">{entity.descriptor}</div>
                        )}
                      </div>
                      {index === selectedIndex && (
                        <kbd className="px-1.5 py-0.5 font-mono text-[10px] text-bb-text-muted bg-bb-border rounded">
                          ↵
                        </kbd>
                      )}
                    </Link>
                  );
                })}
                {results.length > 20 && (
                  <div className="px-3 py-2 text-center">
                    <span className="font-mono text-xs text-bb-text-muted">
                      +{results.length - 20} more
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer hints */}
          <div className="px-3 py-2 border-t border-bb-border flex items-center gap-4 text-[10px] text-bb-text-muted">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-bb-border rounded">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-bb-border rounded">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-bb-border rounded">esc</kbd>
              close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
