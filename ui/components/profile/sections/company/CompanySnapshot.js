/**
 * CompanySnapshot Section
 * Displays: stage, ownership, last round, sector, geography
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [C1]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

export default function CompanySnapshot({ data }) {
  // Check if we have any snapshot data
  const hasData = data?.stage || data?.sector || data?.hq || data?.tagline || data?.raising;
  
  if (!hasData) {
    return (
      <SectionWrapper label="Snapshot">
        <EmptyState message="No snapshot data available" />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper label="Snapshot">
      <div className="space-y-3">
        {data.tagline && (
          <p className="text-sm text-bb-text-secondary italic">{data.tagline}</p>
        )}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {data.stage && (
            <div className="text-sm">
              <span className="text-bb-text-muted">Stage:</span>{' '}
              <span className="font-medium text-bb-text">{data.stage}</span>
            </div>
          )}
          {data.sector && (
            <div className="text-sm">
              <span className="text-bb-text-muted">Sector:</span>{' '}
              <span className="font-medium text-bb-text">{data.sector}</span>
            </div>
          )}
          {data.hq && (
            <div className="text-sm">
              <span className="text-bb-text-muted">HQ:</span>{' '}
              <span className="font-medium text-bb-text">{data.hq}</span>
            </div>
          )}
          {data.raising !== undefined && (
            <div className="text-sm">
              <span className="text-bb-text-muted">Status:</span>{' '}
              <span className={`font-medium ${data.raising ? 'text-bb-blue' : 'text-bb-text'}`}>
                {data.raising ? 'Raising' : 'Not Raising'}
              </span>
            </div>
          )}
          {data.raising && data.roundTarget && (
            <div className="text-sm">
              <span className="text-bb-text-muted">Target:</span>{' '}
              <span className="font-medium text-bb-lime font-mono">${(data.roundTarget / 1000000).toFixed(1)}M</span>
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
