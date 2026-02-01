/**
 * Action Impact Rationale Section [C2]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include (if defined by engine): expected net value (or equivalent derived measure),
 *   what changes if executed, what breaks if delayed
 * - No invented narratives
 * - Read-only display
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

function ImpactBlock({ label, content, variant = 'neutral' }) {
  if (!content) return null;
  
  // Semantic styling based on variant
  const variantStyles = {
    positive: 'border-l-green-400 bg-green-50/30',
    negative: 'border-l-red-400 bg-red-50/30',
    neutral: 'border-l-gray-300 bg-gray-50/30',
  };
  
  const style = variantStyles[variant] || variantStyles.neutral;
  
  return (
    <div className={`py-2 px-3 border-l-2 mb-3 last:mb-0 ${style}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-800">{content}</div>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.data - Action data with impact rationale
 */
export default function ActionImpactRationale({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Impact Rationale">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const {
    expectedNetValue,
    netValue,
    expectedImpact,
    impact,
    ifExecuted,
    changesIfExecuted,
    ifDelayed,
    breaksIfDelayed,
    rationale,
    reasoning
  } = data;
  
  // Normalize data from various shapes
  const netValueDisplay = expectedNetValue ?? netValue ?? expectedImpact ?? impact;
  const executedOutcome = ifExecuted || changesIfExecuted;
  const delayedOutcome = ifDelayed || breaksIfDelayed;
  const rationaleText = rationale || reasoning;
  
  // Check if any impact data exists
  const hasImpactData = 
    netValueDisplay !== undefined ||
    executedOutcome ||
    delayedOutcome ||
    rationaleText;
  
  if (!hasImpactData) {
    return (
      <SectionWrapper title="Impact Rationale">
        <EmptyState message="No impact rationale available" />
      </SectionWrapper>
    );
  }
  
  return (
    <SectionWrapper title="Impact Rationale">
      {/* Expected net value if available */}
      {netValueDisplay !== undefined && (
        <div className="mb-4 py-2 px-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-500 mb-1">Expected Net Value</div>
          <div className="text-lg font-medium text-gray-900">
            {typeof netValueDisplay === 'number' 
              ? netValueDisplay.toFixed(2)
              : netValueDisplay
            }
          </div>
        </div>
      )}
      
      {/* General rationale if provided */}
      {rationaleText && (
        <div className="mb-4">
          <p className="text-sm text-gray-700">{rationaleText}</p>
        </div>
      )}
      
      {/* What changes if executed */}
      <ImpactBlock
        label="If Executed"
        content={executedOutcome}
        variant="positive"
      />
      
      {/* What breaks if delayed */}
      <ImpactBlock
        label="If Delayed"
        content={delayedOutcome}
        variant="negative"
      />
    </SectionWrapper>
  );
}
