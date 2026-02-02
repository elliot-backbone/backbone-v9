/**
 * FirmRelationshipState Section
 * Displays relationship state with this firm
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [F4]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function FirmRelationshipState({ data }) {
  const deals = data?.deals || [];
  const partners = data?.partners || [];
  
  // Derive relationship state from deals
  const hasActiveDeals = deals.some(d => ['meeting', 'dd', 'termsheet'].includes(d.status));
  const hasClosedDeals = deals.some(d => d.status === 'closed');
  
  const relationshipState = hasClosedDeals ? 'investor' : hasActiveDeals ? 'active' : 'prospective';

  return (
    <SectionWrapper label="Relationship State">
      <div className="space-y-3">
        <div className="text-sm">
          <span className="text-bb-text-muted">Status:</span>{' '}
          <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium capitalize ${
            relationshipState === 'investor' ? 'bg-purple-100 text-purple-700' :
            relationshipState === 'active' ? 'bg-bb-blue/20 text-bb-blue' :
            'bg-bb-card text-bb-text-secondary'
          }`}>
            {relationshipState}
          </span>
        </div>
        
        <div className="text-sm">
          <span className="text-bb-text-muted">Active Deals:</span>{' '}
          <span className="font-medium">{deals.length}</span>
        </div>
        
        {partners.length > 0 && (
          <div className="text-sm">
            <span className="text-bb-text-muted">Known Contacts:</span>{' '}
            <span className="font-medium">{partners.length}</span>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
