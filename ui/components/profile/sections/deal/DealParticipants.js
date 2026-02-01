/**
 * DealParticipants Section
 * Displays deal participants: investors, founders
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function DealParticipants({ entity, profileData }) {
  if (!profileData?.participants) {
    return (
      <SectionWrapper label="Participants">
        <EmptyState message="No participant data available" />
      </SectionWrapper>
    );
  }

  const { participants } = profileData;

  return (
    <SectionWrapper label="Participants">
      <div className="space-y-4">
        {participants.lead && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-1">Lead</div>
            <div className="text-sm font-medium">{participants.lead}</div>
          </div>
        )}
        {participants.coinvestors?.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Co-investors</div>
            <div className="space-y-1">
              {participants.coinvestors.map((inv, i) => (
                <div key={i} className="text-sm">{inv.name || inv}</div>
              ))}
            </div>
          </div>
        )}
        {participants.founders?.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Founders</div>
            <div className="space-y-1">
              {participants.founders.map((founder, i) => (
                <div key={i} className="text-sm">{founder.name || founder}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
