import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

/**
 * EntitySearch - Quick entity navigation
 * 
 * FM-style search with:
 * - Keyboard shortcut (⌘K)
 * - Type-ahead search
 * - Entity type badges
 */
export default function EntitySearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef(null);
  const router = useRouter();

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search entities
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchEntities = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/entities?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.entities || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchEntities, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigateToEntity(results[selectedIndex]);
    }
  };

  const navigateToEntity = (entity) => {
    router.push(`/entities/${entity.type}/${entity.id}`);
    setIsOpen(false);
    setQuery('');
  };

  // Entity type colors
  const typeColors = {
    company: 'bg-bb-blue/20 text-bb-blue',
    person: 'bg-bb-green/20 text-bb-green',
    firm: 'bg-bb-purple/20 text-bb-purple',
    deal: 'bg-bb-amber/20 text-bb-amber',
    goal: 'bg-bb-accent/20 text-bb-accent',
    issue: 'bg-bb-red/20 text-bb-red',
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-mono text-bb-text-muted hover:text-bb-text border border-bb-border hover:border-bb-accent transition-colors"
      >
        <span className="opacity-60">⌘</span>
        <span>Search</span>
        <span className="text-xs opacity-40">⌘K</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60"
        onClick={() => setIsOpen(false)}
      />

      {/* Search Panel */}
      <div className="relative w-full max-w-lg bg-bb-panel border border-bb-border shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-3 p-4 border-b border-bb-border">
          <span className="text-bb-accent">⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search entities..."
            className="flex-1 bg-transparent text-bb-text placeholder-bb-text-muted focus:outline-none font-mono"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-bb-accent border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {results.map((entity, i) => (
              <div
                key={`${entity.type}-${entity.id}`}
                onClick={() => navigateToEntity(entity)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  i === selectedIndex ? 'bg-bb-card' : 'hover:bg-bb-card/50'
                }`}
              >
                <span className={`px-2 py-0.5 text-xs font-mono rounded ${typeColors[entity.type] || 'bg-bb-border text-bb-text-muted'}`}>
                  {entity.type}
                </span>
                <span className="text-bb-text flex-1 truncate">
                  {entity.name || entity.id}
                </span>
                {i === selectedIndex && (
                  <span className="text-xs text-bb-text-muted">↵</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query && !loading && results.length === 0 && (
          <div className="p-4 text-center text-bb-text-muted text-sm font-mono">
            No entities found
          </div>
        )}

        {/* Hints */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-bb-border text-xs text-bb-text-muted">
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
