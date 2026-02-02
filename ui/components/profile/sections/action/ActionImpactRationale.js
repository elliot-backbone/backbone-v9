/**
 * Action Impact Rationale Section [C2]
 * 
 * Displays unified goal-centric upside model:
 * - Upside magnitude (0-100)
 * - Goal impacts breakdown
 * - Explanation strings
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
  
  const variantStyles = {
    positive: 'border-l-green-400 bg-green-50/30',
    negative: 'border-l-red-400 bg-red-50/30',
    neutral: 'border-l-gray-300 bg-bb-panel/30',
  };
  
  const style = variantStyles[variant] || variantStyles.neutral;
  
  return (
    <div className={`py-2 px-3 border-l-2 mb-3 last:mb-0 ${style}`}>
      <div className="text-xs text-bb-text-muted mb-1">{label}</div>
      <div className="text-sm text-bb-text">{content}</div>
    </div>
  );
}

function GoalImpactRow({ goalImpact }) {
  const { goal, lift, impact } = goalImpact;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-bb-border last:border-0">
      <span className="text-sm text-bb-text-secondary">{goal}</span>
      <span className="text-sm font-medium text-bb-green">+{lift}%</span>
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
    impact,
    expectedNetValue,
    netValue,
    expectedImpact,
    ifExecuted,
    changesIfExecuted,
    ifDelayed,
    breaksIfDelayed,
    rationale,
    reasoning
  } = data;
  
  // New unified impact model
  const upsideMagnitude = impact?.upsideMagnitude;
  const goalImpacts = impact?.goalImpacts || [];
  const explainList = impact?.explain || [];
  
  // Legacy fields
  const netValueDisplay = expectedNetValue ?? netValue ?? expectedImpact;
  const executedOutcome = ifExecuted || changesIfExecuted;
  const delayedOutcome = ifDelayed || breaksIfDelayed;
  const rationaleText = rationale || reasoning;
  
  // Check if any impact data exists
  const hasImpactData = 
    upsideMagnitude !== undefined ||
    goalImpacts.length > 0 ||
    explainList.length > 0 ||
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
      {/* Upside Score (primary display) */}
      {upsideMagnitude !== undefined && (
        <div className="mb-4 py-3 px-4 bg-gradient-to-r from-green-50 to-white rounded-lg border border-green-100">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs text-bb-text-muted mb-0.5">Goal Impact Score</div>
              <div className="text-2xl font-semibold text-bb-text">{upsideMagnitude}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-bb-text-muted">out of 100</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Explanation strings */}
      {explainList.length > 0 && (
        <div className="mb-4">
          {explainList.map((exp, i) => (
            <div key={i} className="text-sm text-bb-text-secondary py-1">
              • {exp}
            </div>
          ))}
        </div>
      )}
      
      {/* Goal impacts breakdown */}
      {goalImpacts.length > 0 && (
        <div className="mb-4 py-2 px-3 bg-bb-panel rounded">
          <div className="text-xs text-bb-text-muted mb-2">Affected Goals</div>
          {goalImpacts.map((gi, i) => (
            <GoalImpactRow key={i} goalImpact={gi} />
          ))}
        </div>
      )}
      
      {/* Legacy: Expected net value */}
      {netValueDisplay !== undefined && upsideMagnitude === undefined && (
        <div className="mb-4 py-2 px-3 bg-bb-panel rounded">
          <div className="text-xs text-bb-text-muted mb-1">Expected Net Value</div>
          <div className="text-lg font-medium text-bb-text">
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
          <p className="text-sm text-bb-text-secondary">{rationaleText}</p>
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
