/**
 * PersonActivitySignals Section
 * Displays recent activity signals for this person
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [P3]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function PersonActivitySignals({ data }) {
  // Activity signals would come from events/actions system
  const signals = data?.activitySignals || data?.recentActivity || [];
  const lastTouchAt = data?.relationships?.[0]?.lastTouchAt;

  if (signals.length === 0 && !lastTouchAt) {
    return (
      <SectionWrapper label="Activity Signals">
        <EmptyState message="No recent activity signals" />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper label="Activity Signals">
      <div className="space-y-3">
        {lastTouchAt && (
          <div className="text-sm">
            <span className="text-gray-500">Last Contact:</span>{' '}
            <span className="font-medium">
              {new Date(lastTouchAt).toLocaleDateString()}
            </span>
          </div>
        )}
        {signals.length > 0 && (
          <div className="space-y-2">
            {signals.map((signal, i) => (
              <div key={signal.id || i} className="text-sm p-2 bg-gray-50 rounded">
                <div className="font-medium">{signal.type || signal.action}</div>
                {signal.timestamp && (
                  <div className="text-xs text-gray-500">
                    {new Date(signal.timestamp).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
