/**
 * derive/patternLift.js — UI-3 Pattern Detection (Engine Only)
 * 
 * DOCTRINE COMPLIANCE:
 * - Runtime-derived only, never persisted
 * - Bounded adjustment to rankScore
 * - Cold-start safe (returns 0 with insufficient data)
 * - Recency-weighted decay
 * 
 * Question answered: "Which Actions tend to matter here?"
 * 
 * @module derive/patternLift
 */

// =============================================================================
// CONSTANTS (Doctrine: bounded, cannot dominate ranking)
// =============================================================================

export const LIFT_MAX = 0.5;           // Maximum absolute lift value
const MIN_OBSERVATIONS = 3;     // Cold-start threshold
const DECAY_HALF_LIFE_DAYS = 30; // Recency half-life

// =============================================================================
// PATTERN LIFT COMPUTATION
// =============================================================================

/**
 * Compute time-decayed weight for an observation
 * @param {Date} observedAt - When observation occurred
 * @param {Date} now - Current time
 * @returns {number} - Weight between 0 and 1
 */
function computeDecay(observedAt, now) {
  const daysSince = (now - new Date(observedAt)) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, daysSince / DECAY_HALF_LIFE_DAYS);
}

/**
 * Extract action type from action (fallback to resolutionId)
 * @param {Object} action
 * @returns {string}
 */
function getActionType(action) {
  return action.actionType || action.resolutionId || action.type || 'UNKNOWN';
}

/**
 * Compute pattern statistics from events
 * Runtime-derived only - never persisted
 * 
 * @param {Object[]} events - Event stream
 * @param {Date} now - Current time
 * @returns {Map<string, { observedCount: number, weightedSum: number }>}
 */
function computePatternStats(events, now) {
  const stats = new Map();
  
  // Filter to outcome_recorded events only
  const observations = events.filter(e => e.eventType === 'outcome_recorded');
  
  for (const event of observations) {
    const actionType = event.payload?.actionType || event.actionType || 'UNKNOWN';
    const hasNotes = !!(event.payload?.notes);
    
    // Weight: recent observations count more
    const decay = computeDecay(event.timestamp, now);
    
    // Signal: observation with notes = positive signal (user engaged)
    // observation without notes = neutral (still completed the loop)
    const signal = hasNotes ? 1 : 0.5;
    
    if (!stats.has(actionType)) {
      stats.set(actionType, { observedCount: 0, weightedSum: 0 });
    }
    
    const s = stats.get(actionType);
    s.observedCount += 1;
    s.weightedSum += signal * decay;
  }
  
  return stats;
}

/**
 * Compute pattern lift for a single action
 * 
 * UI-3 Contract Requirements:
 * - Returns scalar adjustment for rankScore
 * - Bounded: abs(lift) <= LIFT_MAX
 * - Cold-start: returns 0 with < MIN_OBSERVATIONS
 * - Recency-weighted
 * 
 * @param {Object} action - Action to compute lift for
 * @param {Object[]} events - Event stream (raw facts)
 * @param {Date} now - Current time
 * @returns {number} - Lift value between -LIFT_MAX and +LIFT_MAX
 */
export function computePatternLift(action, events, now = new Date()) {
  if (!events || events.length === 0) {
    return 0; // Cold start
  }
  
  const stats = computePatternStats(events, now);
  const actionType = getActionType(action);
  const typeStats = stats.get(actionType);
  
  // Cold start check
  if (!typeStats || typeStats.observedCount < MIN_OBSERVATIONS) {
    return 0;
  }
  
  // Compute average weighted signal
  const avgSignal = typeStats.weightedSum / typeStats.observedCount;
  
  // Normalize to [-1, 1] range (0.5 is neutral baseline)
  const normalized = (avgSignal - 0.5) * 2;
  
  // Apply confidence scaling based on sample size
  // More observations = more confidence, but diminishing returns
  const confidenceScale = Math.min(1, Math.log(typeStats.observedCount) / Math.log(20));
  
  // Final lift, bounded
  const rawLift = normalized * confidenceScale * LIFT_MAX;
  return Math.max(-LIFT_MAX, Math.min(LIFT_MAX, rawLift));
}

/**
 * Batch compute pattern lifts for all actions
 * 
 * @param {Object[]} actions - Actions to compute lifts for
 * @param {Object[]} events - Event stream
 * @param {Date} now - Current time
 * @returns {Map<string, number>} - actionId -> lift
 */
export function computeAllPatternLifts(actions, events, now = new Date()) {
  const lifts = new Map();
  
  // Pre-compute stats once (efficiency)
  const stats = computePatternStats(events, now);
  
  for (const action of actions) {
    const actionType = getActionType(action);
    const typeStats = stats.get(actionType);
    
    let lift = 0;
    
    if (typeStats && typeStats.observedCount >= MIN_OBSERVATIONS) {
      const avgSignal = typeStats.weightedSum / typeStats.observedCount;
      const normalized = (avgSignal - 0.5) * 2;
      const confidenceScale = Math.min(1, Math.log(typeStats.observedCount) / Math.log(20));
      const rawLift = normalized * confidenceScale * LIFT_MAX;
      lift = Math.max(-LIFT_MAX, Math.min(LIFT_MAX, rawLift));
    }
    
    lifts.set(action.actionId, lift);
  }
  
  return lifts;
}

// =============================================================================
// VALIDATION (QA Gates)
// =============================================================================

/**
 * Validate pattern lift bounds
 * @param {number} lift
 * @returns {boolean}
 */
export function validateLiftBounds(lift) {
  return typeof lift === 'number' && 
         !isNaN(lift) && 
         Math.abs(lift) <= LIFT_MAX;
}

/**
 * Verify cold start behavior
 * @param {Object[]} actions
 * @returns {boolean}
 */
export function verifyColdStart(actions) {
  const lifts = computeAllPatternLifts(actions, [], new Date());
  return Array.from(lifts.values()).every(lift => lift === 0);
}

export default {
  computePatternLift,
  computeAllPatternLifts,
  validateLiftBounds,
  verifyColdStart,
  LIFT_MAX,
  MIN_OBSERVATIONS
};
