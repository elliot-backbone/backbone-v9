/**
 * Relationships Overview Page
 * Route: /relationships
 * 
 * Summary view of key relationships in the network.
 * Click through to individual person profiles.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/nav';

// Relationship type colors
const TYPE_COLORS = {
  co_invested: 'bg-bb-lime/20 text-bb-lime',
  advised: 'bg-bb-blue/20 text-bb-blue',
  introduced_by: 'bg-bb-amber/20 text-bb-amber',
  worked_together: 'bg-bb-accent/20 text-bb-accent',
  knows: 'bg-bb-text-muted/20 text-bb-text-muted',
};

// Strength indicator
function StrengthBar({ strength }) {
  const widths = { weak: '33%', medium: '66%', strong: '100%' };
  const colors = { weak: 'bg-bb-text-muted', medium: 'bg-bb-amber', strong: 'bg-bb-lime' };
  return (
    <div className="w-16 h-1 bg-bb-border rounded-full overflow-hidden">
      <div 
        className={`h-full ${colors[strength] || colors.weak} transition-all`}
        style={{ width: widths[strength] || '33%' }}
      />
    </div>
  );
}

// Relationship card component
function RelationshipCard({ relationship }) {
  const daysSinceContact = relationship.lastContact 
    ? Math.floor((Date.now() - new Date(relationship.lastContact)) / (1000 * 60 * 60 * 24))
    : null;
  
  const contactStatus = daysSinceContact === null 
    ? 'text-bb-text-muted' 
    : daysSinceContact < 30 
      ? 'text-bb-lime' 
      : daysSinceContact < 90 
        ? 'text-bb-amber' 
        : 'text-bb-red';

  return (
    <div className="bg-bb-card border border-bb-border p-4 transition-all hover:border-bb-border-light">
      {/* People */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/entities/person/${encodeURIComponent(relationship.p1Id)}`}
            className="text-bb-text hover:text-bb-accent font-mono text-sm transition-colors"
          >
            {relationship.p1Name}
          </Link>
          <span className="text-bb-text-muted text-xs">↔</span>
          <Link
            href={`/entities/person/${encodeURIComponent(relationship.p2Id)}`}
            className="text-bb-text hover:text-bb-accent font-mono text-sm transition-colors"
          >
            {relationship.p2Name}
          </Link>
        </div>
        <StrengthBar strength={relationship.strength} />
      </div>
      
      {/* Type and Contact */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 text-xs font-mono rounded ${TYPE_COLORS[relationship.type] || TYPE_COLORS.knows}`}>
          {relationship.type?.replace(/_/g, ' ').toUpperCase()}
        </span>
        <span className={`text-xs font-mono ${contactStatus}`}>
          {daysSinceContact !== null ? `${daysSinceContact}d ago` : '—'}
        </span>
      </div>
    </div>
  );
}

export default function RelationshipsPage() {
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStrength, setFilterStrength] = useState('all');

  useEffect(() => {
    fetch('/api/entities?type=relationship')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch relationships');
        return res.json();
      })
      .then(data => {
        setRelationships(data.entities || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Get unique types for filter
  const types = [...new Set(relationships.map(r => r.type))].filter(Boolean);

  // Filter relationships
  const filtered = relationships.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterStrength !== 'all' && r.strength !== filterStrength) return false;
    return true;
  });

  // Sort by last contact (most recent first), then by strength
  const sorted = [...filtered].sort((a, b) => {
    // Strong relationships first
    const strengthOrder = { strong: 0, medium: 1, weak: 2 };
    const strengthDiff = (strengthOrder[a.strength] || 2) - (strengthOrder[b.strength] || 2);
    if (strengthDiff !== 0) return strengthDiff;
    
    // Then by last contact
    const dateA = a.lastContact ? new Date(a.lastContact) : new Date(0);
    const dateB = b.lastContact ? new Date(b.lastContact) : new Date(0);
    return dateB - dateA;
  });

  // Calculate stats
  const strongCount = relationships.filter(r => r.strength === 'strong').length;
  const recentCount = relationships.filter(r => {
    if (!r.lastContact) return false;
    const days = (Date.now() - new Date(r.lastContact)) / (1000 * 60 * 60 * 24);
    return days < 30;
  }).length;
  const staleCount = relationships.filter(r => {
    if (!r.lastContact) return true;
    const days = (Date.now() - new Date(r.lastContact)) / (1000 * 60 * 60 * 24);
    return days > 90;
  }).length;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-display text-bb-text mb-2">Relationships</h1>
          <p className="text-bb-text-muted text-sm font-mono">
            {relationships.length} connections in network
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Total</div>
            <div className="text-xl font-mono text-bb-accent">{relationships.length}</div>
          </div>
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Strong</div>
            <div className="text-xl font-mono text-bb-lime">{strongCount}</div>
          </div>
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Recent (&lt;30d)</div>
            <div className="text-xl font-mono text-bb-blue">{recentCount}</div>
          </div>
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Stale (&gt;90d)</div>
            <div className="text-xl font-mono text-bb-red">{staleCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-6 mb-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-bb-text-muted text-sm">Type:</span>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-bb-card border border-bb-border text-bb-text text-sm font-mono px-2 py-1 focus:outline-none focus:border-bb-accent"
            >
              <option value="all">All</option>
              {types.map(type => (
                <option key={type} value={type}>
                  {type?.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          
          {/* Strength Filter */}
          <div className="flex items-center gap-2">
            <span className="text-bb-text-muted text-sm">Strength:</span>
            {['all', 'strong', 'medium', 'weak'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStrength(s)}
                className={`px-2 py-1 text-xs font-mono transition-colors ${
                  filterStrength === s 
                    ? 'bg-bb-card text-bb-accent border border-bb-accent' 
                    : 'text-bb-text-muted hover:text-bb-text'
                }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
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

        {/* Relationships Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-3">
            {sorted.map(rel => (
              <RelationshipCard key={rel.id} relationship={rel} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sorted.length === 0 && (
          <div className="text-center py-20 text-bb-text-muted font-mono">
            No relationships found
          </div>
        )}
      </div>
    </AppLayout>
  );
}
