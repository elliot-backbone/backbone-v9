/**
 * Portfolio Overview Page
 * Route: /portfolio
 * 
 * Summary view of all portfolio companies with key metrics.
 * Click through to individual company profiles.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/nav';

// Stage color mapping
const STAGE_COLORS = {
  'Pre-seed': 'text-bb-text-muted',
  'Seed': 'text-bb-amber',
  'Series A': 'text-bb-lime',
  'Series B': 'text-bb-blue',
  'Series C': 'text-bb-accent',
};

// Runway status indicator
function RunwayBadge({ months }) {
  if (months === null || months === undefined || months === Infinity) {
    return <span className="text-bb-text-muted font-mono text-xs">—</span>;
  }
  const color = months < 6 ? 'bg-bb-red' : months < 12 ? 'bg-bb-amber' : 'bg-bb-lime';
  return (
    <span className={`${color} text-bb-bg px-2 py-0.5 text-xs font-mono rounded`}>
      {Math.round(months)}mo
    </span>
  );
}

// Company card component
function CompanyCard({ company }) {
  const runway = company.burn > 0 ? company.cash / company.burn : null;
  const raising = company.raising;
  
  return (
    <Link
      href={`/entities/company/${encodeURIComponent(company.id)}`}
      className="block bg-bb-card border border-bb-border hover:border-bb-accent p-4 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-bb-text font-medium group-hover:text-bb-accent transition-colors">
            {company.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-mono ${STAGE_COLORS[company.stage] || 'text-bb-text-muted'}`}>
              {company.stage}
            </span>
            <span className="text-bb-text-muted text-xs">•</span>
            <span className="text-bb-text-muted text-xs font-mono">{company.sector}</span>
          </div>
        </div>
        {raising && (
          <span className="bg-bb-amber/20 text-bb-amber px-2 py-0.5 text-xs font-mono rounded">
            RAISING
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-bb-text-muted text-xs mb-1">Cash</div>
          <div className="font-mono text-bb-text">${(company.cash / 1000000).toFixed(1)}M</div>
        </div>
        <div>
          <div className="text-bb-text-muted text-xs mb-1">Burn</div>
          <div className="font-mono text-bb-text">${(company.burn / 1000).toFixed(0)}K/mo</div>
        </div>
        <div>
          <div className="text-bb-text-muted text-xs mb-1">ARR</div>
          <div className="font-mono text-bb-text">
            {company.arr > 0 ? `$${(company.arr / 1000000).toFixed(1)}M` : '—'}
          </div>
        </div>
        <div>
          <div className="text-bb-text-muted text-xs mb-1">Runway</div>
          <RunwayBadge months={runway} />
        </div>
      </div>
    </Link>
  );
}

// Seeing Around Corners — top portfolio pre-issues strip
function SeeingAroundCorners({ preissues }) {
  if (!preissues || preissues.length === 0) return null;

  // Sort by expectedFutureCost desc, take top 5
  const top5 = [...preissues]
    .sort((a, b) => (b.expectedFutureCost || 0) - (a.expectedFutureCost || 0))
    .slice(0, 5);

  return (
    <div className="mb-6">
      <div className="text-xs text-bb-text-muted uppercase tracking-wider mb-2 font-mono">
        Seeing Around Corners
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {top5.map(p => (
          <Link
            key={p.preIssueId}
            href={`/entities/company/${encodeURIComponent(p.companyId)}`}
            className="flex-shrink-0 w-56 bg-bb-panel border border-bb-border hover:border-bb-amber p-3 transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-bb-amber truncate">
                {p.companyName}
              </span>
              <span className="text-xs font-mono text-bb-text-muted ml-2">
                {(p.expectedFutureCost || 0).toFixed(1)}
              </span>
            </div>
            <div className="text-sm text-bb-text truncate">{p.title}</div>
            <div className="flex items-center gap-2 mt-1 text-xs font-mono text-bb-text-muted">
              <span>{p.ttiDays || '?'}d</span>
              <span>P:{Math.round((p.probability || 0) * 100)}%</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [companies, setCompanies] = useState([]);
  const [preissues, setPreissues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('runway'); // runway, cash, arr, name

  useEffect(() => {
    // Fetch companies and preissues in parallel
    Promise.all([
      fetch('/api/entities?type=company').then(r => r.ok ? r.json() : Promise.reject(new Error('Failed'))),
      fetch('/api/actions/today').then(r => r.ok ? r.json() : { preissues: [] }),
    ])
      .then(([companyData, actionData]) => {
        const portfolio = (companyData.entities || []).filter(c => c.isPortfolio);
        setCompanies(portfolio);
        setPreissues(actionData.preissues || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Sort companies
  const sortedCompanies = [...companies].sort((a, b) => {
    if (sortBy === 'runway') {
      const runwayA = a.burn > 0 ? a.cash / a.burn : Infinity;
      const runwayB = b.burn > 0 ? b.cash / b.burn : Infinity;
      return runwayA - runwayB; // Shortest runway first (most urgent)
    }
    if (sortBy === 'cash') return b.cash - a.cash;
    if (sortBy === 'arr') return b.arr - a.arr;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  // Calculate aggregate stats (handle null values)
  const totalCash = companies.reduce((sum, c) => sum + (c.cash || 0), 0);
  const totalBurn = companies.reduce((sum, c) => sum + (c.burn || 0), 0);
  const totalARR = companies.reduce((sum, c) => sum + (c.arr || 0), 0);
  const raisingCount = companies.filter(c => c.raising).length;
  const criticalRunway = companies.filter(c => {
    const runway = c.burn > 0 ? c.cash / c.burn : Infinity;
    return runway < 6;
  }).length;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-display text-bb-text mb-2">Portfolio</h1>
          <p className="text-bb-text-muted text-sm font-mono">
            {companies.length} companies
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Total Cash</div>
            <div className="text-xl font-mono text-bb-accent">${(totalCash / 1000000).toFixed(1)}M</div>
          </div>
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Monthly Burn</div>
            <div className="text-xl font-mono text-bb-text">${(totalBurn / 1000000).toFixed(1)}M</div>
          </div>
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Total ARR</div>
            <div className="text-xl font-mono text-bb-lime">${(totalARR / 1000000).toFixed(1)}M</div>
          </div>
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Raising</div>
            <div className="text-xl font-mono text-bb-amber">{raisingCount}</div>
          </div>
          <div className="bg-bb-panel border border-bb-border p-4">
            <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">&lt;6mo Runway</div>
            <div className="text-xl font-mono text-bb-red">{criticalRunway}</div>
          </div>
        </div>

        {/* Seeing Around Corners — top portfolio pre-issues */}
        <SeeingAroundCorners preissues={preissues} />

        {/* Sort Controls */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-bb-text-muted text-sm">Sort by:</span>
          {['runway', 'cash', 'arr', 'name'].map(option => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-3 py-1 text-sm font-mono transition-colors ${
                sortBy === option 
                  ? 'bg-bb-card text-bb-accent border border-bb-accent' 
                  : 'text-bb-text-muted hover:text-bb-text'
              }`}
            >
              {option.toUpperCase()}
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

        {/* Company Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-4">
            {sortedCompanies.map(company => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
