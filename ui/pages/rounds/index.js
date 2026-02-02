/**
 * Rounds Overview Page
 * Route: /rounds
 * 
 * Summary view of all funding rounds for portfolio companies.
 * Click through to individual round profiles.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/nav';

// Status badge component
function StatusBadge({ status }) {
  const colors = {
    active: 'bg-bb-lime/20 text-bb-lime',
    closed: 'bg-bb-text-muted/20 text-bb-text-muted',
    cancelled: 'bg-bb-red/20 text-bb-red',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-mono rounded ${colors[status] || colors.closed}`}>
      {status?.toUpperCase()}
    </span>
  );
}

// Stage badge
function StageBadge({ stage }) {
  const colors = {
    'Pre-seed': 'text-bb-text-muted',
    'Seed': 'text-bb-amber',
    'Series A': 'text-bb-lime',
    'Series B': 'text-bb-blue',
    'Series C': 'text-bb-accent',
  };
  return (
    <span className={`text-xs font-mono ${colors[stage] || 'text-bb-text-muted'}`}>
      {stage}
    </span>
  );
}

// Round card component
function RoundCard({ round, company }) {
  return (
    <Link
      href={`/entities/round/${encodeURIComponent(round.id)}`}
      className="block bg-bb-card border border-bb-border hover:border-bb-accent p-4 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-bb-text-secondary text-sm font-mono mb-1">
            {company?.name || round.companyId}
          </div>
          <div className="flex items-center gap-2">
            <StageBadge stage={round.stage} />
            <span className="text-bb-text-muted text-xs">•</span>
            <span className="text-bb-text font-mono text-lg">
              ${(round.amt / 1000000).toFixed(1)}M
            </span>
          </div>
        </div>
        <StatusBadge status={round.status} />
      </div>
      
      <div className="flex items-center justify-between text-sm mt-3">
        <div>
          <span className="text-bb-text-muted text-xs">Lead: </span>
          <span className="text-bb-text-secondary font-mono">{round.leadName || '—'}</span>
        </div>
        <div className="text-bb-text-muted text-xs font-mono">
          {round.closeDate}
        </div>
      </div>
    </Link>
  );
}

export default function RoundsPage() {
  const [rounds, setRounds] = useState([]);
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, closed

  useEffect(() => {
    Promise.all([
      fetch('/api/entities?type=round').then(r => r.json()),
      fetch('/api/entities?type=company').then(r => r.json()),
    ])
      .then(([roundsData, companiesData]) => {
        // Build company lookup
        const companyMap = {};
        const portfolioIds = new Set();
        (companiesData.entities || []).forEach(c => {
          companyMap[c.id] = c;
          if (c.isPortfolio) portfolioIds.add(c.id);
        });
        
        // Filter rounds to portfolio companies only
        const portfolioRounds = (roundsData.entities || []).filter(r => 
          portfolioIds.has(r.companyId)
        );
        
        setCompanies(companyMap);
        setRounds(portfolioRounds);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter rounds
  const filteredRounds = rounds.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  // Sort by close date (most recent first), then active before closed
  const sortedRounds = [...filteredRounds].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    return new Date(b.closeDate) - new Date(a.closeDate);
  });

  // Calculate aggregate stats
  const activeRounds = rounds.filter(r => r.status === 'active');
  const totalActive = activeRounds.reduce((sum, r) => sum + r.amt, 0);
  const closedThisYear = rounds.filter(r => 
    r.status === 'closed' && r.closeDate?.startsWith('2026')
  );
  const totalClosed = closedThisYear.reduce((sum, r) => sum + r.amt, 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-display text-bb-text mb-2">Rounds</h1>
          <p className="text-bb-text-muted text-sm font-mono">
            {rounds.length} portfolio funding rounds
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Active Rounds</div>
            <div className="text-xl font-mono text-bb-lime">{activeRounds.length}</div>
          </div>
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Active Total</div>
            <div className="text-xl font-mono text-bb-accent">${(totalActive / 1000000).toFixed(1)}M</div>
          </div>
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Closed This Year</div>
            <div className="text-xl font-mono text-bb-text">{closedThisYear.length}</div>
          </div>
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Closed Total</div>
            <div className="text-xl font-mono text-bb-text">${(totalClosed / 1000000).toFixed(1)}M</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-bb-border">
          {['all', 'active', 'closed'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 text-sm font-mono transition-colors ${
                filter === tab 
                  ? 'text-bb-accent border-b-2 border-bb-accent bg-bb-card' 
                  : 'text-bb-text-muted hover:text-bb-text'
              }`}
            >
              {tab.toUpperCase()}
              <span className="ml-2 text-xs opacity-60">
                {tab === 'all' ? rounds.length : rounds.filter(r => r.status === tab).length}
              </span>
            </button>
          ))}
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

        {/* Rounds Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-4">
            {sortedRounds.map(round => (
              <RoundCard 
                key={round.id} 
                round={round} 
                company={companies[round.companyId]}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sortedRounds.length === 0 && (
          <div className="text-center py-20 text-bb-text-muted font-mono">
            No rounds found
          </div>
        )}
      </div>
    </AppLayout>
  );
}
