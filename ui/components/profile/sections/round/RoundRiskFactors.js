/**
 * Round Risk Factors Section [C3]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include (derived if defined): concentration flags, missing anchor flags, adverse signal flags
 * - No invented heuristics - only display if engine/API provides
 * - Read-only display
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

function RiskFlag({ type, severity, description, linkedEntities }) {
  // Semantic color based on severity (per contract: color is semantic only)
  const severityStyles = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-amber-50 border-amber-200 text-amber-800',
    low: 'bg-bb-panel border-bb-border text-bb-text-secondary',
  };
  
  const style = severityStyles[severity] || severityStyles.low;
  
  return (
    <div className={`py-2 px-3 border rounded text-sm mb-2 last:mb-0 ${style}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{type}</span>
        {severity && (
          <span className="text-xs uppercase tracking-wide opacity-75">
            {severity}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-sm opacity-90">{description}</p>
      )}
      {linkedEntities && linkedEntities.length > 0 && (
        <div className="mt-1 text-xs opacity-75">
          Related:{' '}
          {linkedEntities.map((e, i) => (
            <span key={e.id || i}>
              {i > 0 && ', '}
              <EntityLink type={e.type} id={e.id} name={e.name} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.data - Round data with risk factor information
 */
export default function RoundRiskFactors({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Risk Factors">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const { riskFactors, concentrationFlags, missingAnchorFlags, adverseSignals } = data;
  
  // Collect all risk flags from various possible data shapes
  const allFlags = [];
  
  // Handle pre-structured riskFactors array
  if (Array.isArray(riskFactors)) {
    allFlags.push(...riskFactors);
  }
  
  // Handle individual flag types
  if (concentrationFlags) {
    if (Array.isArray(concentrationFlags)) {
      concentrationFlags.forEach(f => allFlags.push({ 
        type: 'Concentration', 
        ...f 
      }));
    } else if (concentrationFlags.active) {
      allFlags.push({ 
        type: 'Concentration', 
        severity: concentrationFlags.severity || 'medium',
        description: concentrationFlags.description 
      });
    }
  }
  
  if (missingAnchorFlags) {
    if (Array.isArray(missingAnchorFlags)) {
      missingAnchorFlags.forEach(f => allFlags.push({ 
        type: 'Missing Anchor', 
        ...f 
      }));
    } else if (missingAnchorFlags.active) {
      allFlags.push({ 
        type: 'Missing Anchor', 
        severity: missingAnchorFlags.severity || 'high',
        description: missingAnchorFlags.description 
      });
    }
  }
  
  if (adverseSignals) {
    if (Array.isArray(adverseSignals)) {
      adverseSignals.forEach(f => allFlags.push({ 
        type: 'Adverse Signal', 
        ...f 
      }));
    } else if (adverseSignals.active) {
      allFlags.push({ 
        type: 'Adverse Signal', 
        severity: adverseSignals.severity || 'medium',
        description: adverseSignals.description 
      });
    }
  }
  
  if (allFlags.length === 0) {
    return (
      <SectionWrapper title="Risk Factors">
        <EmptyState message="No risk factors identified" />
      </SectionWrapper>
    );
  }
  
  return (
    <SectionWrapper title="Risk Factors">
      <div>
        {allFlags.map((flag, index) => (
          <RiskFlag
            key={flag.id || index}
            type={flag.type}
            severity={flag.severity}
            description={flag.description}
            linkedEntities={flag.linkedEntities}
          />
        ))}
      </div>
    </SectionWrapper>
  );
}
