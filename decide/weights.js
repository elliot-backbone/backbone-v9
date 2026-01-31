/**
 * decide/weights.js Ã¢â‚¬â€ Centralized Ranking Weights (Phase 4.5)
 * 
 * ALL ranking weights live here. No magic numbers elsewhere.
 * Changes require QA validation.
 * 
 * @module decide/weights
 */

// =============================================================================
// RANKING FORMULA WEIGHTS
// =============================================================================

/**
 * rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost
 * 
 * Where:
 *   expectedNetImpact = impact * ripple * executionProbability * successProbability
 */

export const WEIGHTS = {
  // Trust penalty: penalize high-risk intros
  trustPenalty: {
    // trustRisk is 0-1, multiply by this to get penalty
    multiplier: 20,
    // threshold above which penalty applies
    threshold: 0.3
  },
  
  // Execution friction: penalize complex actions
  executionFriction: {
    // base penalty per step
    perStep: 0.5,
    // max steps before cap
    maxSteps: 10,
    // complexity multiplier (if action has complexity field)
    complexityMultiplier: 5
  },
  
  // Time criticality: boost actions with approaching deadlines
  timeCriticality: {
    // days until deadline to start boosting
    urgentThreshold: 7,
    // maximum boost
    maxBoost: 15,
    // decay rate (boost = maxBoost * e^(-days/decayRate))
    decayRate: 7
  },
  
  // Impact model weights (from actionSchema)
  impact: {
    // Time penalty: days / weeksPerPenaltyPoint
    timePenaltyWeeks: 7,
    // Max time penalty cap
    timePenaltyMax: 30
  },
  
  // Ripple effect weights
  ripple: {
    // Base multiplier for ripple score
    baseMultiplier: 1.0,
    // Decay per hop
    hopDecay: 0.5
  },
  
  // Introduction-specific weights
  intro: {
    // Baseline conversion rate
    baselineConversion: 0.15,
    // Minimum lift for second-order to count
    secondOrderMinLift: 1.2,
    // Max path depth for intro chains
    maxPathDepth: 2
  },
  
  // Pre-issue escalation
  preissue: {
    // Days until escalation to consider "imminent"
    imminentDays: 7,
    // Cost of delay exponential base
    costOfDelayBase: 1.1,
    // Max cost multiplier
    maxCostMultiplier: 3.0
  }
};

// =============================================================================
// DERIVED CONSTANTS (from weights, for convenience)
// =============================================================================

export const BASELINE_CONVERSION = WEIGHTS.intro.baselineConversion;
export const SECOND_ORDER_MIN_LIFT = WEIGHTS.intro.secondOrderMinLift;
export const MAX_PATH_DEPTH = WEIGHTS.intro.maxPathDepth;
export const IMMINENT_DAYS = WEIGHTS.preissue.imminentDays;

// =============================================================================
// PENALTY FUNCTIONS
// =============================================================================

/**
 * Compute trust penalty
 * @param {number} trustRisk - 0-1 risk score
 * @returns {number} - penalty to subtract from rankScore
 */
export function computeTrustPenalty(trustRisk) {
  if (trustRisk <= WEIGHTS.trustPenalty.threshold) return 0;
  return (trustRisk - WEIGHTS.trustPenalty.threshold) * WEIGHTS.trustPenalty.multiplier;
}

/**
 * Compute execution friction penalty
 * @param {Object} action - Action with steps array
 * @returns {number} - penalty to subtract from rankScore
 */
export function computeExecutionFrictionPenalty(action) {
  const stepCount = Math.min(action.steps?.length || 0, WEIGHTS.executionFriction.maxSteps);
  let penalty = stepCount * WEIGHTS.executionFriction.perStep;
  
  if (action.complexity) {
    penalty += action.complexity * WEIGHTS.executionFriction.complexityMultiplier;
  }
  
  return penalty;
}

/**
 * Compute time criticality boost
 * @param {number} daysUntilDeadline - days until action's deadline
 * @returns {number} - boost to add to rankScore
 */
export function computeTimeCriticalityBoost(daysUntilDeadline) {
  if (daysUntilDeadline == null || daysUntilDeadline <= 0) return 0;
  if (daysUntilDeadline > WEIGHTS.timeCriticality.urgentThreshold * 4) return 0;
  
  const { maxBoost, decayRate } = WEIGHTS.timeCriticality;
  return maxBoost * Math.exp(-daysUntilDeadline / decayRate);
}

/**
 * Compute time penalty (from impact model)
 * @param {number} days - timeToImpactDays
 * @returns {number}
 */
export function timePenalty(days) {
  return Math.min(WEIGHTS.impact.timePenaltyMax, days / WEIGHTS.impact.timePenaltyWeeks);
}

export default {
  WEIGHTS,
  BASELINE_CONVERSION,
  SECOND_ORDER_MIN_LIFT,
  MAX_PATH_DEPTH,
  IMMINENT_DAYS,
  computeTrustPenalty,
  computeExecutionFrictionPenalty,
  computeTimeCriticalityBoost,
  timePenalty
};
