/**
 * CompanyRelationships Section
 * Displays: founders/execs, cap table investors, advisors
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [C3]
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

export default function CompanyRelationships({ data }) {
  const founders = data?.founders || [];
  const investors = data?.investors || [];
  const advisors = data?.advisors || [];
  
  const hasData = founders.length > 0 || investors.length > 0 || advisors.length > 0;
  
  if (!hasData) {
    return (
      <SectionWrapper label="Relationships">
        <EmptyState message="No relationship data available" />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper label="Relationships">
      <div className="space-y-4">
        {founders.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Founders & Executives</div>
            <div className="space-y-1">
              {founders.map((person, i) => (
                <div key={person.id || i} className="text-sm flex items-center gap-2">
                  {person.id ? (
                    <EntityLink type="person" id={person.id} className="text-blue-600 hover:underline">
                      {person.name}
                    </EntityLink>
                  ) : (
                    <span>{person.name}</span>
                  )}
                  {person.role && <span className="text-gray-500">· {person.role}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {investors.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Cap Table</div>
            <div className="space-y-1">
              {investors.map((inv, i) => (
                <div key={inv.id || i} className="text-sm flex items-center gap-2">
                  {inv.id ? (
                    <EntityLink type="firm" id={inv.id} className="text-blue-600 hover:underline">
                      {inv.name}
                    </EntityLink>
                  ) : (
                    <span>{inv.name}</span>
                  )}
                  {inv.totalInvested > 0 && (
                    <>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-600">{formatMoney(inv.totalInvested)}</span>
                    </>
                  )}
                  {inv.rounds && inv.rounds.length > 0 && (
                    <span className="text-xs text-gray-400">({inv.rounds.join(', ')})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {advisors.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Advisors</div>
            <div className="space-y-1">
              {advisors.map((person, i) => (
                <div key={person.id || i} className="text-sm">
                  {person.id ? (
                    <EntityLink type="person" id={person.id} className="text-blue-600 hover:underline">
                      {person.name}
                    </EntityLink>
                  ) : (
                    <span>{person.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
