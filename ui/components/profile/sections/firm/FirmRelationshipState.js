/**
 * FirmRelationshipState Section
 * Displays firm's relationship state with Backbone
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function FirmRelationshipState({ entity, profileData }) {
  if (!profileData?.relationshipState) {
    return (
      <SectionWrapper label="Relationship State">
        <EmptyState message="No relationship state data available" />
      </SectionWrapper>
    );
  }

  const { relationshipState } = profileData;

  return (
    <SectionWrapper label="Relationship State">
      <div className="space-y-3">
        {relationshipState.status && (
          <div className="text-sm">
            <span className="text-gray-500">Status:</span>{' '}
            <span className="font-medium">{relationshipState.status}</span>
          </div>
        )}
        {relationshipState.lastContact && (
          <div className="text-sm">
            <span className="text-gray-500">Last Contact:</span>{' '}
            <span className="font-medium">{relationshipState.lastContact}</span>
          </div>
        )}
        {relationshipState.notes && (
          <p className="text-sm text-gray-600">{relationshipState.notes}</p>
        )}
      </div>
    </SectionWrapper>
  );
}
