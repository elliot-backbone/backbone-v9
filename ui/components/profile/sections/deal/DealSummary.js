/**
 * DealSummary Section
 * Displays deal overview: firm, lead partner, company, round, amount, status
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [D1]
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

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric' 
  });
}

export default function DealSummary({ data }) {
  if (!data) {
    return (
      <SectionWrapper label="Deal Summary">
        <EmptyState message="No deal data available" />
      </SectionWrapper>
    );
  }

  const statusColors = {
    closed: 'bg-green-100 text-green-700',
    termsheet: 'bg-blue-100 text-blue-700',
    dd: 'bg-yellow-100 text-yellow-700',
    meeting: 'bg-purple-100 text-purple-700',
    outreach: 'bg-gray-100 text-gray-600',
    passed: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    dd: 'Due Diligence',
    termsheet: 'Term Sheet',
    outreach: 'Outreach',
    meeting: 'Meeting',
    closed: 'Closed',
    passed: 'Passed',
  };

  return (
    <SectionWrapper label="Deal Summary">
      <div className="space-y-4">
        {/* Amount and Status header */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-semibold text-gray-900">
            {formatMoney(data.amount)}
          </div>
          {data.status && (
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${statusColors[data.status] || 'bg-gray-100 text-gray-600'}`}>
              {statusLabels[data.status] || data.status}
            </span>
          )}
        </div>
        
        {data.isLead && (
          <div className="text-sm text-blue-600 font-medium">
            ★ Lead Investor
          </div>
        )}
        
        {/* Links grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Company */}
          {data.company && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Company</div>
              <EntityLink type="company" id={data.company.id}>
                <span className="text-sm font-medium text-gray-900 hover:text-blue-600">
                  {data.company.name}
                </span>
              </EntityLink>
            </div>
          )}
          
          {/* Firm */}
          {(data.firm || data.firmId) && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Firm</div>
              <EntityLink type="firm" id={data.firm?.id || data.firmId}>
                <span className="text-sm font-medium text-gray-900 hover:text-blue-600">
                  {data.firm?.name || data.firmName}
                </span>
              </EntityLink>
            </div>
          )}
          
          {/* Lead Partner */}
          {data.leadPerson && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Lead Partner</div>
              <EntityLink type="person" id={data.leadPerson.id}>
                <span className="text-sm font-medium text-gray-900 hover:text-blue-600">
                  {data.leadPerson.name}
                </span>
              </EntityLink>
            </div>
          )}
          
          {/* Round */}
          {data.round?.id && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Round</div>
              <EntityLink type="round" id={data.round.id}>
                <span className="text-sm font-medium text-gray-900 hover:text-blue-600">
                  View Round →
                </span>
              </EntityLink>
            </div>
          )}
        </div>
        
        {/* Probability */}
        {data.probability !== undefined && data.probability < 100 && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">Close Probability</span>
              <span className={`font-medium ${
                data.probability >= 70 ? 'text-green-600' : 
                data.probability >= 40 ? 'text-amber-600' : 
                'text-gray-600'
              }`}>
                {data.probability}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  data.probability >= 70 ? 'bg-green-500' : 
                  data.probability >= 40 ? 'bg-amber-500' : 
                  'bg-gray-400'
                }`}
                style={{ width: `${data.probability}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Timeline */}
        <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          {data.firstContact && (
            <div>First Contact: {formatDate(data.firstContact)}</div>
          )}
          {data.lastActivity && (
            <div>Last Activity: {formatDate(data.lastActivity)}</div>
          )}
          {data.closedAt && (
            <div>Closed: {formatDate(data.closedAt)}</div>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
