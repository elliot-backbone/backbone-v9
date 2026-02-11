/**
 * UpcomingConstraints Section
 * Displays: company pre-issues sorted by expectedFutureCost desc
 *
 * Fetches preissues from /api/actions/today (engine-computed),
 * filters by company ID, renders as a collapsible list.
 */
import { useState, useEffect } from 'react';
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

// Pre-issue type labels
const TYPE_LABELS = {
  GOAL_MISS: 'Goal Miss',
  DEAL_STALL: 'Deal Stall',
  RUNWAY_COMPRESSION_RISK: 'Runway Risk',
  GOAL_FEASIBILITY_RISK: 'Feasibility Risk',
  DEPENDENCY_RISK: 'Dependency Risk',
  TIMING_WINDOW_RISK: 'Timing Window',
  DATA_BLINDSPOT_RISK: 'Data Blindspot',
  ROUND_STALL: 'Round Stall',
  LEAD_VACANCY: 'Lead Vacancy',
  MEETING_RISK: 'Meeting Risk',
};

// Type badge colors
const TYPE_COLORS = {
  RUNWAY_COMPRESSION_RISK: 'bg-bb-red/20 text-bb-red',
  GOAL_FEASIBILITY_RISK: 'bg-bb-amber/20 text-bb-amber',
  TIMING_WINDOW_RISK: 'bg-bb-red/20 text-bb-red',
  DEPENDENCY_RISK: 'bg-bb-amber/20 text-bb-amber',
  DATA_BLINDSPOT_RISK: 'bg-bb-text-muted/20 text-bb-text-muted',
};

function PreIssueCard({ preissue }) {
  const typeLabel = TYPE_LABELS[preissue.preIssueType] || preissue.preIssueType;
  const colorClass = TYPE_COLORS[preissue.preIssueType] || 'bg-bb-amber/20 text-bb-amber';
  const cost = preissue.expectedFutureCost || 0;
  const irrev = preissue.irreversibility || 0;
  const ttiDays = preissue.ttiDays || 0;

  return (
    <div className="text-sm p-3 bg-bb-panel rounded border border-bb-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-mono rounded ${colorClass}`}>
              {typeLabel}
            </span>
            {ttiDays <= 14 && (
              <span className="px-1.5 py-0.5 text-xs font-mono rounded bg-bb-red/20 text-bb-red">
                IMMINENT
              </span>
            )}
          </div>
          <div className="text-bb-text font-medium truncate">{preissue.title}</div>
          {preissue.rationale && (
            <div className="text-xs text-bb-text-muted mt-0.5 truncate">
              {preissue.rationale}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-mono text-bb-amber">{cost.toFixed(1)}</div>
          <div className="text-xs text-bb-text-muted">EFC</div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs font-mono text-bb-text-muted">
        <span>P: <span className="text-bb-text">{Math.round((preissue.probability || 0) * 100)}%</span></span>
        <span>I: <span className="text-bb-text">{irrev.toFixed(2)}</span></span>
        <span>TTI: <span className="text-bb-text">{ttiDays}d</span></span>
      </div>
    </div>
  );
}

export default function UpcomingConstraints({ data }) {
  const [preissues, setPreissues] = useState([]);
  const [loading, setLoading] = useState(true);
  const companyId = data?.id;

  useEffect(() => {
    if (!companyId) return;

    fetch('/api/actions/today')
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed')))
      .then(result => {
        const companyPreissues = (result.preissues || [])
          .filter(p => p.companyId === companyId)
          .sort((a, b) => (b.expectedFutureCost || 0) - (a.expectedFutureCost || 0));
        setPreissues(companyPreissues);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return (
      <SectionWrapper label="Upcoming Constraints">
        <div className="text-sm text-bb-text-muted font-mono animate-pulse">Loading...</div>
      </SectionWrapper>
    );
  }

  if (preissues.length === 0) {
    return (
      <SectionWrapper label="Upcoming Constraints">
        <EmptyState message="No upcoming constraints detected" />
      </SectionWrapper>
    );
  }

  // Show top 5, rest in collapsible
  const top = preissues.slice(0, 5);
  const rest = preissues.slice(5);

  return (
    <SectionWrapper label="Upcoming Constraints">
      <div className="space-y-2">
        {top.map(p => (
          <PreIssueCard key={p.preIssueId} preissue={p} />
        ))}
        {rest.length > 0 && (
          <details className="text-sm">
            <summary className="text-xs text-bb-text-muted uppercase tracking-wide cursor-pointer hover:text-bb-text-secondary mt-2">
              +{rest.length} more constraints
            </summary>
            <div className="mt-2 space-y-2">
              {rest.map(p => (
                <PreIssueCard key={p.preIssueId} preissue={p} />
              ))}
            </div>
          </details>
        )}
      </div>
    </SectionWrapper>
  );
}
