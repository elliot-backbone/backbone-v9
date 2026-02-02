/**
 * FirmPortfolioExposure Section
 * Displays firm's deals/investments
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [F2]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

export default function FirmPortfolioExposure({ data }) {
  const deals = data?.deals || [];

  if (deals.length === 0) {
    return (
      <SectionWrapper label="Portfolio Exposure">
        <EmptyState message="No active deals" />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper label="Portfolio Exposure">
      <div className="space-y-3">
        <div className="text-xs text-bb-text-muted uppercase tracking-wide mb-2">
          Active Deals ({deals.length})
        </div>
        {deals.map((deal) => (
          <div key={deal.id} className="text-sm p-2 bg-bb-panel rounded flex items-center justify-between">
            <div>
              <EntityLink type="deal" id={deal.id} className="text-bb-blue hover:underline font-medium">
                {deal.companyName}
              </EntityLink>
              {deal.status && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                  deal.status === 'termsheet' ? 'bg-bb-green/20 text-bb-green' :
                  deal.status === 'dd' ? 'bg-bb-blue/20 text-bb-blue' :
                  'bg-bb-card text-bb-text-secondary'
                }`}>
                  {deal.status === 'dd' ? 'DD' : deal.status}
                </span>
              )}
            </div>
            {deal.amount && (
              <span className="text-bb-text-muted">${(deal.amount / 1000000).toFixed(1)}M</span>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
