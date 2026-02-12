/**
 * Rounds Overview Page
 * Route: /rounds
 *
 * Groups rounds by company, shows stage progression.
 * Active rounds get visual prominence. Closed rounds are secondary.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/nav';

const STAGE_ORDER = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C'];

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

function RoundRow({ round, isActive }) {
  return (
    <Link
      href={`/entities/round/${encodeURIComponent(round.id)}`}
      className={`flex items-center gap-4 px-4 py-3 hover:bg-bb-card/50 transition-colors group ${
        isActive ? 'bg-bb-card border-l-2 border-l-bb-lime' : 'border-l-2 border-l-transparent'
      }`}
    >
      <div className="w-20 flex-shrink-0">
        <StageBadge stage={round.stage} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-bb-text font-mono text-sm group-hover:text-bb-accent transition-colors">
          ${(round.amt / 1000000).toFixed(1)}M
        </span>
      </div>
      <div className="w-32 text-right">
        <span className="text-bb-text-secondary text-xs font-mono">
          {round.leadName || '—'}
        </span>
      </div>
      <div className="w-24 text-right">
        <span className="text-bb-text-muted text-xs font-mono">
          {round.closeDate || '—'}
        </span>
      </div>
      <div className="w-20 text-right">
        <StatusBadge status={round.status} />
      </div>
    </Link>
  );
}

function CompanyRoundGroup({ companyName, companyId, rounds }) {
  const activeRound = rounds.find(r => r.status === 'active');
  const sortedRounds = [...rounds].sort((a, b) => {
    return STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
  });

  return (
    <div className="bg-bb-panel border border-bb-border mb-4">
      {/* Company header */}
      <div className="px-4 py-3 border-b border-bb-border/50 flex items-center justify-between">
        <Link
          href={`/entities/company/${companyId}`}
          className="text-sm font-medium text-bb-text hover:text-bb-accent transition-colors"
        >
          {companyName}
        </Link>
        <div className="flex items-center gap-3 text-xs font-mono text-bb-text-muted">
          <span>{rounds.length} round{rounds.length !== 1 ? 's' : ''}</span>
          {activeRound && (
            <span className="text-bb-lime">
              Raising ${(activeRound.amt / 1000000).toFixed(1)}M {activeRound.stage}
            </span>
          )}
        </div>
      </div>

      {/* Round rows in stage order */}
      <div className="divide-y divide-bb-border/30">
        {sortedRounds.map(round => (
          <RoundRow
            key={round.id}
            round={round}
            isActive={round.status === 'active'}
          />
        ))}
      </div>
    </div>
  );
}

export default function RoundsPage() {
  const [rounds, setRounds] = useState([]);
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/entities?type=round').then(r => r.json()),
      fetch('/api/entities?type=company').then(r => r.json()),
    ])
      .then(([roundsData, companiesData]) => {
        const companyMap = {};
        const portfolioIds = new Set();
        (companiesData.entities || []).forEach(c => {
          companyMap[c.id] = c;
          if (c.isPortfolio) portfolioIds.add(c.id);
        });

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

  // Filter
  const filteredRounds = rounds.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  // Group by company
  const byCompany = {};
  for (const round of filteredRounds) {
    const cId = round.companyId;
    if (!byCompany[cId]) byCompany[cId] = [];
    byCompany[cId].push(round);
  }

  // Sort companies: those with active rounds first, then by company name
  const companyGroups = Object.entries(byCompany)
    .map(([companyId, companyRounds]) => ({
      companyId,
      companyName: companies[companyId]?.name || companyId,
      rounds: companyRounds,
      hasActive: companyRounds.some(r => r.status === 'active'),
    }))
    .sort((a, b) => {
      if (a.hasActive && !b.hasActive) return -1;
      if (!a.hasActive && b.hasActive) return 1;
      return a.companyName.localeCompare(b.companyName);
    });

  // Aggregate stats
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
            {companyGroups.length} companies &middot; {filteredRounds.length} rounds
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

        {/* Grouped Rounds */}
        {!loading && !error && (
          <div>
            {companyGroups.map(group => (
              <CompanyRoundGroup
                key={group.companyId}
                companyId={group.companyId}
                companyName={group.companyName}
                rounds={group.rounds}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && companyGroups.length === 0 && (
          <div className="text-center py-20 text-bb-text-muted font-mono">
            No rounds found
          </div>
        )}
      </div>
    </AppLayout>
  );
}
