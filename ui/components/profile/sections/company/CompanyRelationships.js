/**
 * CompanyRelationships Section
 * Displays company relationships: investors, board, key people
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function CompanyRelationships({ entity, profileData }) {
  if (!profileData?.relationships) {
    return (
      <SectionWrapper label="Relationships">
        <EmptyState message="No relationship data available" />
      </SectionWrapper>
    );
  }

  const { relationships } = profileData;

  return (
    <SectionWrapper label="Relationships">
      <div className="space-y-4">
        {relationships.investors?.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Investors</div>
            <div className="space-y-1">
              {relationships.investors.map((inv, i) => (
                <div key={i} className="text-sm">{inv.name || inv}</div>
              ))}
            </div>
          </div>
        )}
        {relationships.keyPeople?.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Key People</div>
            <div className="space-y-1">
              {relationships.keyPeople.map((person, i) => (
                <div key={i} className="text-sm">
                  {person.name} {person.role && <span className="text-gray-500">({person.role})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
