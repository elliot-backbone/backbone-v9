/**
 * CompanyRelationships Section
 * Displays: founders/execs, investors, operators/advisors
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [C3]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

export default function CompanyRelationships({ data }) {
  const founders = data?.founders || [];
  const deals = data?.deals || [];
  const investors = data?.investors || [];
  const advisors = data?.advisors || [];
  
  // Extract investors from deals if not provided directly
  const dealInvestors = deals.map(d => ({
    name: d.investor,
    id: d.investorId,
    status: d.status,
    amount: d.amount,
  }));
  
  const hasData = founders.length > 0 || dealInvestors.length > 0 || investors.length > 0 || advisors.length > 0;
  
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
        
        {dealInvestors.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Investors (Active Deals)</div>
            <div className="space-y-1">
              {dealInvestors.map((inv, i) => (
                <div key={inv.id || i} className="text-sm flex items-center gap-2">
                  {inv.id ? (
                    <EntityLink type="firm" id={inv.id} className="text-blue-600 hover:underline">
                      {inv.name}
                    </EntityLink>
                  ) : (
                    <span>{inv.name}</span>
                  )}
                  <span className="text-gray-400">·</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    inv.status === 'termsheet' ? 'bg-green-100 text-green-700' :
                    inv.status === 'dd' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {inv.status}
                  </span>
                  {inv.amount && (
                    <span className="text-gray-500">${(inv.amount / 1000000).toFixed(1)}M</span>
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
