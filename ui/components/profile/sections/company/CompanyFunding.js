/**
 * CompanyFunding Section
 * Displays: funding rounds with links to round profiles
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [C2]
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
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function CompanyFunding({ data }) {
  const rounds = data?.rounds || [];
  
  if (rounds.length === 0) {
    return (
      <SectionWrapper label="Funding History">
        <EmptyState message="No funding rounds recorded" />
      </SectionWrapper>
    );
  }

  // Sort rounds by stage (Pre-seed → Seed → Series A → ...)
  const stageOrder = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D'];
  const sortedRounds = [...rounds].sort((a, b) => {
    const aIdx = stageOrder.indexOf(a.stage) ?? 99;
    const bIdx = stageOrder.indexOf(b.stage) ?? 99;
    return aIdx - bIdx;
  });

  return (
    <SectionWrapper label="Funding History">
      <div className="space-y-3">
        {sortedRounds.map((round) => {
          const pctRaised = round.target > 0 
            ? Math.round((round.raised / round.target) * 100) 
            : 0;
          
          return (
            <div 
              key={round.id} 
              className="border border-bb-border rounded-lg p-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <EntityLink type="round" id={round.id}>
                    <span className="font-medium text-bb-text hover:text-bb-blue">
                      {round.stage}
                    </span>
                  </EntityLink>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    round.status === 'active' 
                      ? 'bg-bb-blue/20 text-bb-blue' 
                      : round.status === 'closed'
                      ? 'bg-bb-green/20 text-bb-green'
                      : 'bg-bb-card text-bb-text-secondary'
                  }`}>
                    {round.status}
                  </span>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium text-bb-text">
                    {formatMoney(round.raised)} / {formatMoney(round.target)}
                  </div>
                  <div className="text-xs text-bb-text-muted">
                    {pctRaised}% raised
                  </div>
                </div>
              </div>
              
              {/* Progress bar for active rounds */}
              {round.status === 'active' && (
                <div className="mt-2">
                  <div className="h-1.5 bg-bb-card rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(pctRaised, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Timeline info */}
              <div className="mt-2 text-xs text-bb-text-muted flex gap-4">
                {round.openedAt && (
                  <span>Opened: {formatDate(round.openedAt)}</span>
                )}
                {round.closedAt && (
                  <span>Closed: {formatDate(round.closedAt)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-bb-border">
        <div className="text-sm text-bb-text-secondary">
          <span className="font-medium">{rounds.length}</span> round{rounds.length !== 1 ? 's' : ''} total
          {' · '}
          <span className="font-medium">
            {formatMoney(rounds.reduce((sum, r) => sum + (r.raised || 0), 0))}
          </span>
          {' raised'}
        </div>
      </div>
    </SectionWrapper>
  );
}
