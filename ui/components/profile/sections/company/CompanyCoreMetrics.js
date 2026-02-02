/**
 * CompanyCoreMetrics Section
 * Displays: burn, runway (derived), revenue/traction, headcount
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [C2]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function CompanyCoreMetrics({ data }) {
  // Check if we have any metrics data
  const hasData = data?.burn || data?.cash || data?.employees || data?.revenue || data?.mrr;
  
  if (!hasData) {
    return (
      <SectionWrapper label="Core Metrics">
        <EmptyState message="No metrics data available" />
      </SectionWrapper>
    );
  }

  // Derive runway if we have cash and burn (runtime calculation, not persisted)
  const runway = (data.cash && data.burn && data.burn > 0) 
    ? Math.round(data.cash / data.burn) 
    : null;

  return (
    <SectionWrapper label="Core Metrics">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.burn && (
          <div>
            <div className="text-xs text-bb-text-muted uppercase tracking-wide">Monthly Burn</div>
            <div className="text-lg font-semibold">${(data.burn / 1000).toFixed(0)}K</div>
          </div>
        )}
        {data.cash && (
          <div>
            <div className="text-xs text-bb-text-muted uppercase tracking-wide">Cash</div>
            <div className="text-lg font-semibold">${(data.cash / 1000000).toFixed(2)}M</div>
          </div>
        )}
        {runway && (
          <div>
            <div className="text-xs text-bb-text-muted uppercase tracking-wide">
              Runway <span className="text-bb-text-muted text-[10px]">(derived)</span>
            </div>
            <div className={`text-lg font-semibold ${runway < 6 ? 'text-bb-red' : runway < 12 ? 'text-bb-amber' : ''}`}>
              {runway} mo
            </div>
          </div>
        )}
        {data.employees && (
          <div>
            <div className="text-xs text-bb-text-muted uppercase tracking-wide">Headcount</div>
            <div className="text-lg font-semibold">{data.employees}</div>
          </div>
        )}
        {data.revenue && (
          <div>
            <div className="text-xs text-bb-text-muted uppercase tracking-wide">Revenue</div>
            <div className="text-lg font-semibold">${(data.revenue / 1000000).toFixed(1)}M</div>
          </div>
        )}
        {data.mrr && (
          <div>
            <div className="text-xs text-bb-text-muted uppercase tracking-wide">MRR</div>
            <div className="text-lg font-semibold">${(data.mrr / 1000).toFixed(0)}K</div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
