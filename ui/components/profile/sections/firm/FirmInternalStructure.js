/**
 * FirmInternalStructure Section
 * Displays firm's internal structure: partners, team
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function FirmInternalStructure({ entity, profileData }) {
  if (!profileData?.structure) {
    return (
      <SectionWrapper label="Internal Structure">
        <EmptyState message="No structure data available" />
      </SectionWrapper>
    );
  }

  const { structure } = profileData;

  return (
    <SectionWrapper label="Internal Structure">
      <div className="space-y-4">
        {structure.partners?.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Partners</div>
            <div className="space-y-1">
              {structure.partners.map((partner, i) => (
                <div key={i} className="text-sm">{partner.name || partner}</div>
              ))}
            </div>
          </div>
        )}
        {structure.teamSize && (
          <div className="text-sm">
            <span className="text-gray-500">Team Size:</span>{' '}
            <span className="font-medium">{structure.teamSize}</span>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
