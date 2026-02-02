/**
 * Entity List Page
 * Route: /entities/[type]
 * 
 * Lists all entities of a given type with search/filter
 */

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/nav';
import { isValidEntityType, ENTITY_TYPE_LABELS } from '../../lib/entities/entityTypes';

export default function EntityListPage() {
  const router = useRouter();
  const { type } = router.query;
  
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!type) return;
    
    if (!isValidEntityType(type)) {
      setError(`Unknown entity type: ${type}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/entities?type=${encodeURIComponent(type)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch entities');
        return res.json();
      })
      .then(data => {
        setEntities(data.entities || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [type]);

  // Filter entities by search
  const filtered = search
    ? entities.filter(e => {
        const name = e.name || e.label || e.title || e.id || '';
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : entities;

  if (!type) return null;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-display text-bb-text mb-2">
            {ENTITY_TYPE_LABELS[type] || type}
          </h1>
          <p className="text-bb-text-muted text-sm font-mono">
            {entities.length} total
          </p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${ENTITY_TYPE_LABELS[type] || type}...`}
            className="w-full max-w-md px-4 py-2 bg-bb-card border border-bb-border text-bb-text font-mono text-sm focus:outline-none focus:border-bb-accent"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-bb-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-bb-panel border border-bb-red p-4 text-bb-red font-mono text-sm">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 text-bb-text-muted font-mono">
            {search ? 'No matches found' : 'No entities'}
          </div>
        )}

        {/* Entity List */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-2">
            {filtered.map(entity => (
              <Link
                key={entity.id}
                href={`/entities/${type}/${encodeURIComponent(entity.id)}`}
                className="block bg-bb-panel border border-bb-border hover:border-bb-accent p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-bb-text font-mono">
                      {entity.name || entity.label || entity.title || entity.id}
                    </div>
                    {entity.descriptor && (
                      <div className="text-bb-text-muted text-sm mt-1">
                        {entity.descriptor}
                      </div>
                    )}
                  </div>
                  <span className="text-bb-text-muted text-sm">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
