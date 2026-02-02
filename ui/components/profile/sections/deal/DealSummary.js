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
    closed: 'bg-bb-green/20 text-bb-green',
    termsheet: 'bg-bb-blue/20 text-bb-blue',
    dd: 'bg-yellow-100 text-yellow-700',
    meeting: 'bg-purple-100 text-purple-700',
    outreach: 'bg-bb-card text-bb-text-secondary',
    passed: 'bg-bb-red/20 text-bb-red',
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
          <div className="text-2xl font-semibold text-bb-text">
            {formatMoney(data.amount)}
          </div>
          {data.status && (
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${statusColors[data.status] || 'bg-bb-card text-bb-text-secondary'}`}>
              {statusLabels[data.status] || data.status}
            </span>
          )}
        </div>
        
        {data.isLead && (
          <div className="text-sm text-bb-blue font-medium">
            ★ Lead Investor
          </div>
        )}
        
        {/* Links grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Company */}
          {data.company && (
            <div>
              <div className="text-xs text-bb-text-muted mb-1">Company</div>
              <EntityLink type="company" id={data.company.id}>
                <span className="text-sm font-medium text-bb-text hover:text-bb-blue">
                  {data.company.name}
                </span>
              </EntityLink>
            </div>
          )}
          
          {/* Firm */}
          {(data.firm || data.firmId) && (
            <div>
              <div className="text-xs text-bb-text-muted mb-1">Firm</div>
              <EntityLink type="firm" id={data.firm?.id || data.firmId}>
                <span className="text-sm font-medium text-bb-text hover:text-bb-blue">
                  {data.firm?.name || data.firmName}
                </span>
              </EntityLink>
            </div>
          )}
          
          {/* Lead Partner */}
          {data.leadPerson && (
            <div>
              <div className="text-xs text-bb-text-muted mb-1">Lead Partner</div>
              <EntityLink type="person" id={data.leadPerson.id}>
                <span className="text-sm font-medium text-bb-text hover:text-bb-blue">
                  {data.leadPerson.name}
                </span>
              </EntityLink>
            </div>
          )}
          
          {/* Round */}
          {data.round?.id && (
            <div>
              <div className="text-xs text-bb-text-muted mb-1">Round</div>
              <EntityLink type="round" id={data.round.id}>
                <span className="text-sm font-medium text-bb-text hover:text-bb-blue">
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
              <span className="text-bb-text-muted">Close Probability</span>
              <span className={`font-medium ${
                data.probability >= 70 ? 'text-bb-green' : 
                data.probability >= 40 ? 'text-bb-amber' : 
                'text-bb-text-secondary'
              }`}>
                {data.probability}%
              </span>
            </div>
            <div className="h-1.5 bg-bb-card rounded-full overflow-hidden">
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
        <div className="pt-2 border-t border-bb-border text-xs text-bb-text-muted space-y-1">
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
