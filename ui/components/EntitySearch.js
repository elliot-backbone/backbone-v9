/**
 * Entity Search Component
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Positioned in top-left (non-dominant)
 * - Does NOT replace Next Action as primary surface
 * - Provides discovery path to profile pages
 * - Minimal, unobtrusive design
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { routeForEntity } from '../lib/entities/routeForEntity';
import { getEntityTypeLabel } from '../lib/entities/entityTypes';

const TYPE_COLORS = {
  company: 'bg-blue-50 text-blue-700',
  person: 'bg-green-50 text-green-700',
  firm: 'bg-purple-50 text-purple-700',
  deal: 'bg-amber-50 text-amber-700',
  goal: 'bg-teal-50 text-teal-700',
  issue: 'bg-red-50 text-red-700',
  action: 'bg-gray-100 text-gray-700',
  round: 'bg-indigo-50 text-indigo-700',
};

export default function EntitySearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch entities on open or query change
  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    
    fetch(`/api/entities?${params}`)
      .then(res => res.json())
      .then(data => {
        setResults(data.entities || []);
      })
      .catch(() => {
        setResults([]);
      })
      .finally(() => {
        setLoading(false);
      });
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

  // Keyboard shortcut: Cmd/Ctrl + K to open
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="fixed top-4 left-4 z-50">
      {/* Trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 rounded">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Search panel */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entities..."
                className="flex-1 text-sm outline-none placeholder-gray-400"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-400 text-center">Loading...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 text-center">
                {query ? 'No results found' : 'Start typing to search'}
              </div>
            ) : (
              <div className="py-2">
                {results.slice(0, 20).map((entity) => {
                  const route = routeForEntity(entity.type, entity.id);
                  const typeColor = TYPE_COLORS[entity.type] || TYPE_COLORS.action;
                  
                  return (
                    <Link
                      key={`${entity.type}-${entity.id}`}
                      href={route || '#'}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <span className={`px-1.5 py-0.5 text-xs rounded ${typeColor}`}>
                        {getEntityTypeLabel(entity.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 truncate">{entity.name}</div>
                        {entity.descriptor && (
                          <div className="text-xs text-gray-500 truncate">{entity.descriptor}</div>
                        )}
                      </div>
                    </Link>
                  );
                })}
                {results.length > 20 && (
                  <div className="px-3 py-2 text-xs text-gray-400 text-center">
                    +{results.length - 20} more results
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
