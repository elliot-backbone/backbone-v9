/**
 * PersonRelationshipMap Section
 * Displays person's relationships with other people
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [P2]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

export default function PersonRelationshipMap({ data }) {
  const relationships = data?.relationships || [];

  if (relationships.length === 0) {
    return (
      <SectionWrapper label="Relationships">
        <EmptyState message="No relationships mapped" />
      </SectionWrapper>
    );
  }

  // Group by relationship type
  const byType = relationships.reduce((acc, rel) => {
    const type = rel.relationshipType || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(rel);
    return acc;
  }, {});

  return (
    <SectionWrapper label="Relationships">
      <div className="space-y-4">
        {Object.entries(byType).map(([type, rels]) => (
          <div key={type}>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2 capitalize">
              {type.replace(/-/g, ' ')} ({rels.length})
            </div>
            <div className="space-y-2">
              {rels.map((rel) => (
                <div key={rel.id} className="text-sm flex items-center justify-between">
                  <EntityLink type="person" id={rel.personId} className="text-blue-600 hover:underline">
                    {rel.personName}
                  </EntityLink>
                  <div className="text-xs text-gray-400">
                    {rel.strength && (
                      <span className={`mr-2 ${rel.strength >= 80 ? 'text-green-600' : rel.strength >= 50 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {rel.strength}%
                      </span>
                    )}
                    {rel.channel && <span>{rel.channel}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
