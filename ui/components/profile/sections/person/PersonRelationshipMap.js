/**
 * PersonRelationshipMap Section
 * Displays person's relationship network
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function PersonRelationshipMap({ entity, profileData }) {
  if (!profileData?.relationships) {
    return (
      <SectionWrapper label="Relationship Map">
        <EmptyState message="No relationship data available" />
      </SectionWrapper>
    );
  }

  const { relationships } = profileData;

  return (
    <SectionWrapper label="Relationship Map">
      <div className="space-y-3">
        {relationships.connections?.map((conn, i) => (
          <div key={i} className="text-sm p-2 bg-gray-50 rounded">
            <div className="font-medium">{conn.name}</div>
            {conn.relationship && (
              <div className="text-gray-500 text-xs">{conn.relationship}</div>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
