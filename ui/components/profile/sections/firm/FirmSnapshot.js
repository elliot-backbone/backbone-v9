/**
 * FirmSnapshot Section
 * Displays firm overview
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function FirmSnapshot({ entity, profileData }) {
  if (!profileData?.snapshot) {
    return (
      <SectionWrapper label="Firm Snapshot">
        <EmptyState message="No snapshot data available" />
      </SectionWrapper>
    );
  }

  const { snapshot } = profileData;

  return (
    <SectionWrapper label="Firm Snapshot">
      <div className="space-y-3">
        {snapshot.type && (
          <div className="text-sm">
            <span className="text-gray-500">Type:</span>{' '}
            <span className="font-medium">{snapshot.type}</span>
          </div>
        )}
        {snapshot.aum && (
          <div className="text-sm">
            <span className="text-gray-500">AUM:</span>{' '}
            <span className="font-medium">${snapshot.aum}</span>
          </div>
        )}
        {snapshot.focus && (
          <div className="text-sm">
            <span className="text-gray-500">Focus:</span>{' '}
            <span className="font-medium">{snapshot.focus}</span>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
