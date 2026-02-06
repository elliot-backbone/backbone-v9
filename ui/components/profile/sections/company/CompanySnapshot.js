/**
 * CompanySnapshot Section
 * Displays: stage, ownership, last round, sector, geography
 * Plus engine-derived snapshot metrics when available
 *
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [C1]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

function formatMetricValue(value, unit) {
  if (value === null || value === undefined) return '—';
  if (unit === 'usd' || unit === 'USD') {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${Math.round(value / 1000)}K`;
    return `$${value}`;
  }
  if (unit === 'usd_monthly' || unit === 'usd/mo') {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M/mo`;
    if (value >= 1000) return `$${Math.round(value / 1000)}K/mo`;
    return `$${value}/mo`;
  }
  if (unit === 'count' || unit === 'headcount') return String(value);
  if (unit === 'months') return `${value.toFixed(1)} mo`;
  if (unit === 'ratio') return value.toFixed(2);
  return String(value);
}

function StalenessIndicator({ days }) {
  if (!days && days !== 0) return null;
  const color = days <= 7 ? 'text-bb-green' : days <= 30 ? 'text-bb-amber' : 'text-bb-red';
  const label = days === 0 ? 'today' : days === 1 ? '1d ago' : `${days}d ago`;
  return <span className={`text-xs ${color}`}>{label}</span>;
}

export default function CompanySnapshot({ data }) {
  const hasBasicData = data?.stage || data?.sector || data?.hq || data?.tagline || data?.raising;
  const snapshot = data?.snapshot;
  const hasSnapshotMetrics = snapshot?.metrics && Object.keys(snapshot.metrics).length > 0;

  if (!hasBasicData && !hasSnapshotMetrics) {
    return (
      <SectionWrapper label="Snapshot">
        <EmptyState message="No snapshot data available" />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper label="Snapshot">
      <div className="space-y-3">
        {data.tagline && (
          <p className="text-sm text-bb-text-secondary italic">{data.tagline}</p>
        )}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {data.stage && (
            <div className="text-sm">
              <span className="text-bb-text-muted">Stage:</span>{' '}
              <span className="font-medium text-bb-text">{data.stage}</span>
            </div>
          )}
          {data.sector && (
            <div className="text-sm">
              <span className="text-bb-text-muted">Sector:</span>{' '}
              <span className="font-medium text-bb-text">{data.sector}</span>
            </div>
          )}
          {data.hq && (
            <div className="text-sm">
              <span className="text-bb-text-muted">HQ:</span>{' '}
              <span className="font-medium text-bb-text">{data.hq}</span>
            </div>
          )}
          {data.raising !== undefined && (
            <div className="text-sm">
              <span className="text-bb-text-muted">Status:</span>{' '}
              <span className={`font-medium ${data.raising ? 'text-bb-blue' : 'text-bb-text'}`}>
                {data.raising ? 'Raising' : 'Not Raising'}
              </span>
            </div>
          )}
          {data.raising && data.roundTarget && (
            <div className="text-sm">
              <span className="text-bb-text-muted">Target:</span>{' '}
              <span className="font-medium text-bb-lime font-mono">${(data.roundTarget / 1000000).toFixed(1)}M</span>
            </div>
          )}
        </div>

        {hasSnapshotMetrics && (
          <div className="mt-3 pt-3 border-t border-bb-border">
            <div className="text-xs text-bb-text-muted uppercase tracking-wide mb-2">
              Metric Snapshot
              {snapshot.confidence !== undefined && (
                <span className="ml-2 normal-case">
                  ({Math.round(snapshot.confidence * 100)}% confidence)
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
              {Object.entries(snapshot.metrics).map(([key, value]) => (
                <div key={key} className="text-sm flex items-center justify-between">
                  <span className="text-bb-text-muted capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-mono font-medium text-bb-text">
                    {formatMetricValue(value, snapshot.sources?.[key]?.unit)}
                    {snapshot.staleness?.[key] !== undefined && (
                      <>{' '}<StalenessIndicator days={snapshot.staleness[key]} /></>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
