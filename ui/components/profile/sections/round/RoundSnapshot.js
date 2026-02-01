/**
 * Round Snapshot Section [C1]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include: round type/stage, target, company link
 * - No invented heuristics
 * - Read-only display
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

function formatMoney(amount) {
  if (!amount) return null;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric' 
  });
}

export default function RoundSnapshot({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Round Snapshot">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const pctRaised = data.target > 0 
    ? Math.round((data.raised / data.target) * 100) 
    : 0;

  const statusColors = {
    active: 'bg-blue-100 text-blue-700',
    closed: 'bg-green-100 text-green-700',
    abandoned: 'bg-red-100 text-red-700',
  };

  return (
    <SectionWrapper title="Round Snapshot">
      <div className="space-y-4">
        {/* Header with stage and status */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-gray-900">
            {data.stage || data.type || data.roundType || 'Round'}
          </div>
          {data.status && (
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${statusColors[data.status] || 'bg-gray-100 text-gray-600'}`}>
              {data.status}
            </span>
          )}
        </div>
        
        {/* Company link */}
        {data.company && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Company</div>
            <EntityLink type="company" id={data.company.id}>
              <span className="text-sm font-medium text-gray-900 hover:text-blue-600">
                {data.company.name} →
              </span>
            </EntityLink>
          </div>
        )}
        
        {/* Amount progress */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm text-gray-500">Progress</span>
            <span className="text-sm font-medium">
              {formatMoney(data.raised)} / {formatMoney(data.target)}
              <span className="text-gray-500 ml-1">({pctRaised}%)</span>
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                data.status === 'closed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(pctRaised, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Lead firm */}
        {data.leadFirm && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Lead Investor</div>
            <EntityLink type="firm" id={data.leadFirm.id}>
              <span className="text-sm font-medium text-gray-900 hover:text-blue-600">
                {data.leadFirm.name}
              </span>
            </EntityLink>
          </div>
        )}
        
        {/* Timeline */}
        <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
          {data.openedAt && (
            <div>
              <div className="text-xs text-gray-500">Opened</div>
              <div className="text-gray-900">{formatDate(data.openedAt)}</div>
            </div>
          )}
          {data.closedAt && (
            <div>
              <div className="text-xs text-gray-500">Closed</div>
              <div className="text-gray-900">{formatDate(data.closedAt)}</div>
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
