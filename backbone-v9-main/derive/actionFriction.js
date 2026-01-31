/**
 * Action Friction
 * Phase 4.6: Action Outcome Memory
 * 
 * Derives friction penalty from historical outcomes.
 * Output clamped to [0, 1] per contract.
 * 
 * Friction increases with:
 * - Long delays between events
 * - Failed/abandoned outcomes
 */

import { computeOutcomeStats, getStatsForType } from './actionOutcomeStats.js';

// Clamp bounds per contract
const MIN_FRICTION = 0;
const MAX_FRICTION = 1;

// Default when no history exists
const DEFAULT_FRICTION = 0.1;

// Minimum sample size before trusting learned value
const MIN_SAMPLES = 3;

// Delay thresholds (in days) for friction calculation
const IDEAL_DELAY_DAYS = 2;    // No friction added below this
const MAX_DELAY_DAYS = 14;      // Full delay friction at this point

// Weights for friction components
const WEIGHTS = {
  failureRate: 0.5,      // Weight for failed/abandoned ratio
  delayFactor: 0.3,      // Weight for average delay
  abandonRate: 0.2       // Extra weight for abandoned (worse than failed)
};

/**
 * Clamp friction to valid range
 * @param {number} friction - Raw friction
 * @returns {number} Clamped friction
 */
function clamp(friction) {
  return Math.max(MIN_FRICTION, Math.min(MAX_FRICTION, friction));
}

/**
 * Compute learned friction penalty for an action
 * 
 * @param {Object} action - Action to compute friction for
 * @param {Map<string, Object>} statsByType - Stats from computeOutcomeStats
 * @returns {number} Friction penalty in [0, 1]
 */
export function learnedFrictionPenalty(action, statsByType) {
  if (!action || !action.actionType) {
    return DEFAULT_FRICTION;
  }

  const stats = getStatsForType(statsByType, action.actionType);
  
  if (!stats || stats.outcomeCount < MIN_SAMPLES) {
    return DEFAULT_FRICTION;
  }

  // Component 1: Failure rate (failed + abandoned / total outcomes)
  const failureRate = stats.outcomeCount > 0
    ? (stats.totalFailures + stats.totalAbandoned) / stats.outcomeCount
    : 0;

  // Component 2: Abandon rate (extra penalty for abandoned vs just failed)
  const abandonRate = stats.outcomeCount > 0
    ? stats.totalAbandoned / stats.outcomeCount
    : 0;

  // Component 3: Delay factor (normalized average delay)
  let delayFactor = 0;
  if (stats.delayCount > 0) {
    const avgDelay = stats.delaySum / stats.delayCount;
    // Normalize: 0 at IDEAL_DELAY_DAYS, 1 at MAX_DELAY_DAYS
    delayFactor = Math.max(0, Math.min(1, 
      (avgDelay - IDEAL_DELAY_DAYS) / (MAX_DELAY_DAYS - IDEAL_DELAY_DAYS)
    ));
  }

  // Weighted combination
  const friction = 
    WEIGHTS.failureRate * failureRate +
    WEIGHTS.delayFactor * delayFactor +
    WEIGHTS.abandonRate * abandonRate;

  return clamp(friction);
}

/**
 * Compute friction penalty directly from events
 * Convenience wrapper that computes stats first
 * 
 * @param {Object} action - Action to compute friction for
 * @param {Object[]} events - Array of action events
 * @param {Object[]} actions - All actions (for type mapping)
 * @returns {number} Friction penalty in [0, 1]
 */
export function computeFrictionPenalty(action, events, actions) {
  const statsByType = computeOutcomeStats(events, actions);
  return learnedFrictionPenalty(action, statsByType);
}

/**
 * Batch compute friction penalties for multiple actions
 * More efficient than calling individually
 * 
 * @param {Object[]} actions - Actions to compute for
 * @param {Object[]} events - Array of action events
 * @returns {Map<string, number>} actionId -> friction
 */
export function batchFrictionPenalties(actions, events) {
  const statsByType = computeOutcomeStats(events, actions);
  const result = new Map();

  for (const action of actions) {
    result.set(action.id, learnedFrictionPenalty(action, statsByType));
  }

  return result;
}

export default {
  learnedFrictionPenalty,
  computeFrictionPenalty,
  batchFrictionPenalties,
  MIN_FRICTION,
  MAX_FRICTION,
  DEFAULT_FRICTION,
  MIN_SAMPLES,
  WEIGHTS
};
