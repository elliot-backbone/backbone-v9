/**
 * CompanySnapshot Section
 * Displays company overview: name, stage, metrics summary
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function CompanySnapshot({ entity, profileData }) {
  if (!profileData?.snapshot) {
    return (
      <SectionWrapper label="Snapshot">
        <EmptyState message="No snapshot data available" />
      </SectionWrapper>
    );
  }

  const { snapshot } = profileData;

  return (
    <SectionWrapper label="Snapshot">
      <div className="space-y-3">
        {snapshot.stage && (
          <div className="text-sm">
            <span className="text-gray-500">Stage:</span>{' '}
            <span className="font-medium">{snapshot.stage}</span>
          </div>
        )}
        {snapshot.sector && (
          <div className="text-sm">
            <span className="text-gray-500">Sector:</span>{' '}
            <span className="font-medium">{snapshot.sector}</span>
          </div>
        )}
        {snapshot.description && (
          <p className="text-sm text-gray-600">{snapshot.description}</p>
        )}
      </div>
    </SectionWrapper>
  );
}
