/**
 * FirmInternalStructure Section
 * Displays firm's partners/team
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [F3]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

export default function FirmInternalStructure({ data }) {
  const partners = data?.partners || [];

  if (partners.length === 0) {
    return (
      <SectionWrapper label="Team">
        <EmptyState message="No team members linked" />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper label="Team">
      <div className="space-y-2">
        {partners.map((partner) => (
          <div key={partner.id} className="text-sm flex items-center justify-between">
            <EntityLink type="person" id={partner.id} className="text-blue-600 hover:underline">
              {partner.name}
            </EntityLink>
            {partner.role && (
              <span className="text-gray-500 text-xs">{partner.role}</span>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
