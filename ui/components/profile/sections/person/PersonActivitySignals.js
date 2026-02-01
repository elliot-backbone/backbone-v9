/**
 * PersonActivitySignals Section
 * Displays person's recent activity signals
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function PersonActivitySignals({ entity, profileData }) {
  if (!profileData?.signals || profileData.signals.length === 0) {
    return (
      <SectionWrapper label="Activity Signals">
        <EmptyState message="No recent activity signals" />
      </SectionWrapper>
    );
  }

  const { signals } = profileData;

  return (
    <SectionWrapper label="Activity Signals">
      <div className="space-y-2">
        {signals.map((signal, i) => (
          <div key={i} className="text-sm p-2 border-l-2 border-blue-400 pl-3">
            <div>{signal.description || signal.type}</div>
            {signal.date && (
              <div className="text-xs text-gray-500">{signal.date}</div>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
