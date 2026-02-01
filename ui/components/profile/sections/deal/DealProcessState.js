/**
 * DealProcessState Section
 * Displays deal process state and timeline
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function DealProcessState({ entity, profileData }) {
  if (!profileData?.processState) {
    return (
      <SectionWrapper label="Process State">
        <EmptyState message="No process state data available" />
      </SectionWrapper>
    );
  }

  const { processState } = profileData;

  return (
    <SectionWrapper label="Process State">
      <div className="space-y-3">
        {processState.currentPhase && (
          <div className="text-sm">
            <span className="text-gray-500">Current Phase:</span>{' '}
            <span className="font-medium">{processState.currentPhase}</span>
          </div>
        )}
        {processState.nextMilestone && (
          <div className="text-sm">
            <span className="text-gray-500">Next Milestone:</span>{' '}
            <span className="font-medium">{processState.nextMilestone}</span>
          </div>
        )}
        {processState.timeline?.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Timeline</div>
            <div className="space-y-2">
              {processState.timeline.map((item, i) => (
                <div key={i} className="text-sm border-l-2 border-gray-300 pl-3">
                  <div className="font-medium">{item.event}</div>
                  {item.date && <div className="text-xs text-gray-500">{item.date}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
