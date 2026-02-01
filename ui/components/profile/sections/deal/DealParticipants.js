/**
 * DealParticipants Section
 * Displays deal participants: company, investor contacts
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [D2]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

export default function DealParticipants({ data }) {
  if (!data) {
    return (
      <SectionWrapper label="Participants">
        <EmptyState message="No participant data available" />
      </SectionWrapper>
    );
  }

  const { company, investorPerson, investor, investorId } = data;
  const hasParticipants = company || investorPerson;

  if (!hasParticipants) {
    return (
      <SectionWrapper label="Participants">
        <EmptyState message="No participants linked" />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper label="Participants">
      <div className="space-y-4">
        {company && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Company</div>
            <EntityLink type="company" id={company.id} className="text-sm text-blue-600 hover:underline font-medium">
              {company.name}
            </EntityLink>
          </div>
        )}
        
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Investor</div>
          {investorId ? (
            <EntityLink type="firm" id={investorId} className="text-sm text-blue-600 hover:underline font-medium">
              {investor}
            </EntityLink>
          ) : (
            <span className="text-sm font-medium">{investor}</span>
          )}
        </div>
        
        {investorPerson && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Investor Contact</div>
            <EntityLink type="person" id={investorPerson.id} className="text-sm text-blue-600 hover:underline">
              {investorPerson.name}
            </EntityLink>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
