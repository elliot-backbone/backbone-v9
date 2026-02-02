/**
 * FirmSnapshot Section
 * Displays firm overview: name, AUM, focus
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [F1]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function FirmSnapshot({ data }) {
  if (!data) {
    return (
      <SectionWrapper label="Firm Snapshot">
        <EmptyState message="No firm data available" />
      </SectionWrapper>
    );
  }

  const { name, aum, stageFocus, sectorFocus, asOf } = data;

  return (
    <SectionWrapper label="Firm Snapshot">
      <div className="space-y-3">
        {aum && (
          <div className="text-sm">
            <span className="text-bb-text-muted">AUM:</span>{' '}
            <span className="font-medium">${aum}</span>
          </div>
        )}
        
        {stageFocus && (
          <div className="text-sm">
            <span className="text-bb-text-muted">Stage Focus:</span>{' '}
            <span className="font-medium">{stageFocus}</span>
          </div>
        )}
        
        {sectorFocus && (
          <div className="text-sm">
            <span className="text-bb-text-muted">Sector Focus:</span>{' '}
            <span className="font-medium">{sectorFocus}</span>
          </div>
        )}
        
        {asOf && (
          <div className="text-xs text-bb-text-muted mt-2">
            As of {new Date(asOf).toLocaleDateString()}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
