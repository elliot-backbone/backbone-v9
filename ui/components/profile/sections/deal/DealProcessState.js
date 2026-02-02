/**
 * DealProcessState Section
 * Displays deal process timeline/state
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [D3]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

const DEAL_STAGES = ['outreach', 'meeting', 'dd', 'termsheet', 'closed'];
const STAGE_LABELS = {
  outreach: 'Outreach',
  meeting: 'Meeting',
  dd: 'Due Diligence',
  termsheet: 'Term Sheet',
  closed: 'Closed'
};

export default function DealProcessState({ data }) {
  if (!data?.status) {
    return (
      <SectionWrapper label="Process State">
        <EmptyState message="No process state available" />
      </SectionWrapper>
    );
  }

  const { status, probability } = data;
  const currentIndex = DEAL_STAGES.indexOf(status);

  return (
    <SectionWrapper label="Process State">
      <div className="space-y-4">
        {/* Stage progress */}
        <div className="flex items-center gap-1">
          {DEAL_STAGES.map((stage, i) => {
            const isComplete = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isPending = i > currentIndex;
            
            return (
              <div key={stage} className="flex-1">
                <div className={`h-2 rounded-full ${
                  isComplete ? 'bg-green-500' :
                  isCurrent ? 'bg-blue-500' :
                  'bg-gray-200'
                }`} />
                <div className={`text-xs mt-1 text-center ${
                  isCurrent ? 'text-bb-blue font-medium' : 'text-bb-text-muted'
                }`}>
                  {STAGE_LABELS[stage]}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Current status detail */}
        <div className="text-sm text-center">
          <span className="text-bb-text-muted">Current Stage:</span>{' '}
          <span className="font-medium">{STAGE_LABELS[status] || status}</span>
          {probability !== undefined && (
            <span className="ml-2 text-bb-text-muted">({probability}% probability)</span>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
