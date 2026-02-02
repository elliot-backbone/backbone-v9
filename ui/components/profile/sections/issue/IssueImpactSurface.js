/**
 * Issue Impact Surface Section [C2]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include: affected entities (links), downstream risk (derived if defined)
 * - Read-only display
 * - No invented heuristics
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

function AffectedEntityRow({ entity }) {
  return (
    <div className="py-2 border-b border-bb-border last:border-0">
      <div className="flex items-center justify-between">
        <EntityLink
          type={entity.type}
          id={entity.id}
          name={entity.name}
          showType={true}
          className="text-sm"
        />
        {entity.impactLevel && (
          <span className="text-xs text-bb-text-muted">
            {entity.impactLevel} impact
          </span>
        )}
      </div>
      {entity.description && (
        <p className="text-xs text-bb-text-muted mt-1">{entity.description}</p>
      )}
    </div>
  );
}

function DownstreamRiskIndicator({ risk }) {
  if (!risk) return null;
  
  // Semantic color based on risk level
  const riskStyles = {
    high: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-bb-red/20 border-red-300 text-red-900',
    medium: 'bg-amber-50 border-amber-200 text-amber-800',
    low: 'bg-green-50 border-green-200 text-bb-green',
  };
  
  const level = typeof risk === 'object' ? risk.level : risk;
  const description = typeof risk === 'object' ? risk.description : null;
  const style = riskStyles[level] || 'bg-bb-panel border-bb-border text-bb-text-secondary';
  
  return (
    <div className={`mt-4 py-2 px-3 border rounded text-sm ${style}`}>
      <div className="flex justify-between items-center">
        <span className="font-medium">Downstream Risk</span>
        <span className="text-xs uppercase tracking-wide">
          {level || 'Unknown'}
        </span>
      </div>
      {description && (
        <p className="mt-1 text-xs opacity-80">{description}</p>
      )}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.data - Issue data with impact surface information
 */
export default function IssueImpactSurface({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Impact Surface">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const { 
    affectedEntities, 
    impactedEntities,
    entities,
    downstreamRisk,
    rippleEffect 
  } = data;
  
  // Normalize affected entities from various data shapes
  const allAffected = affectedEntities || impactedEntities || entities || [];
  
  const hasData = allAffected.length > 0 || downstreamRisk || rippleEffect;
  
  if (!hasData) {
    return (
      <SectionWrapper title="Impact Surface">
        <EmptyState message="No impact data available" />
      </SectionWrapper>
    );
  }
  
  return (
    <SectionWrapper title="Impact Surface">
      {/* Affected entities list */}
      {allAffected.length > 0 ? (
        <>
          <div className="mb-2 text-xs text-bb-text-muted">
            {allAffected.length} affected entit{allAffected.length !== 1 ? 'ies' : 'y'}
          </div>
          <div>
            {allAffected.map((entity, index) => (
              <AffectedEntityRow 
                key={entity.id || index} 
                entity={entity} 
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-sm text-bb-text-muted mb-2">
          No affected entities identified
        </div>
      )}
      
      {/* Downstream risk indicator (derived if defined) */}
      <DownstreamRiskIndicator risk={downstreamRisk || rippleEffect} />
    </SectionWrapper>
  );
}
