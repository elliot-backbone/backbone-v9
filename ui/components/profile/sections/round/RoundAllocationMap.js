/**
 * Round Allocation Map Section [C2]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Shows all deals in this round with links
 * - Groups by status: closed, termsheet, active, passed
 * - Links to deal profiles and firm profiles
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

function formatMoney(amount) {
  if (!amount) return '-';
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

function DealRow({ deal }) {
  const statusColors = {
    closed: 'bg-bb-green/20 text-bb-green',
    termsheet: 'bg-bb-blue/20 text-bb-blue',
    dd: 'bg-yellow-100 text-yellow-700',
    meeting: 'bg-purple-100 text-purple-700',
    outreach: 'bg-bb-card text-bb-text-secondary',
    passed: 'bg-bb-red/20 text-bb-red',
  };
  
  return (
    <div className="py-2 border-b border-bb-border last:border-0">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <EntityLink type="deal" id={deal.id}>
            <span className="text-sm font-medium text-bb-text hover:text-bb-blue">
              {deal.firmName}
            </span>
          </EntityLink>
          {deal.isLead && (
            <span className="ml-2 text-xs text-bb-blue font-medium">Lead</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-bb-text">
            {formatMoney(deal.amount)}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[deal.status] || 'bg-bb-card text-bb-text-secondary'}`}>
            {deal.status}
          </span>
        </div>
      </div>
      {deal.probability !== undefined && deal.probability < 100 && (
        <div className="mt-1 text-xs text-bb-text-muted">
          {deal.probability}% probability
        </div>
      )}
    </div>
  );
}

export default function RoundAllocationMap({ data }) {
  const deals = data?.deals || [];
  
  if (deals.length === 0) {
    return (
      <SectionWrapper title="Allocation Map">
        <EmptyState message="No deals in this round" />
      </SectionWrapper>
    );
  }
  
  // Group deals by status
  const closedDeals = deals.filter(d => d.status === 'closed');
  const termsheetDeals = deals.filter(d => d.status === 'termsheet');
  const activeDeals = deals.filter(d => ['dd', 'meeting', 'outreach'].includes(d.status));
  const passedDeals = deals.filter(d => d.status === 'passed');
  
  // Calculate totals
  const committedAmount = [...closedDeals, ...termsheetDeals]
    .reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalTarget = data?.target || 0;
  const pctFilled = totalTarget > 0 ? Math.round((committedAmount / totalTarget) * 100) : 0;
  
  return (
    <SectionWrapper title="Allocation Map">
      {/* Summary bar */}
      <div className="mb-4 p-3 bg-bb-panel rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-bb-text-secondary">Round Progress</span>
          <span className="text-sm font-medium">
            {formatMoney(committedAmount)} / {formatMoney(totalTarget)}
            <span className="text-bb-text-muted ml-1">({pctFilled}%)</span>
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${Math.min(pctFilled, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Committed (closed + termsheet) */}
      {(closedDeals.length > 0 || termsheetDeals.length > 0) && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-bb-text-muted uppercase tracking-wider mb-2">
            Committed ({closedDeals.length + termsheetDeals.length})
          </h4>
          <div className="divide-y divide-gray-100">
            {[...closedDeals, ...termsheetDeals].map(deal => (
              <DealRow key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      )}
      
      {/* Active negotiations */}
      {activeDeals.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-bb-text-muted uppercase tracking-wider mb-2">
            In Progress ({activeDeals.length})
          </h4>
          <div className="divide-y divide-gray-100">
            {activeDeals.map(deal => (
              <DealRow key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      )}
      
      {/* Passed */}
      {passedDeals.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-bb-text-muted uppercase tracking-wider mb-2">
            Passed ({passedDeals.length})
          </h4>
          <div className="divide-y divide-gray-100">
            {passedDeals.map(deal => (
              <DealRow key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      )}
    </SectionWrapper>
  );
}
