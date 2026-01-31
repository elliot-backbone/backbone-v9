/**
 * decide/ranking.js Ã¢â‚¬â€ Unified Action Ranking (Phase 4.5)
 * 
 * SINGLE CANONICAL RANKING SURFACE
 * 
 * All actions are ordered by exactly ONE scalar: rankScore
 * 
 * Formula:
 *   rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost
 * 
 * Where:
 *   expectedNetImpact = (upside * combinedProb) + leverage - (downside * failProb) - effort - timePenalty
 *   combinedProb = executionProbability * probabilityOfSuccess
 * 
 * No other number may reorder Actions.
 * 
 * @module decide/ranking
 */

import {
  WEIGHTS,
  computeTrustPenalty,
  computeExecutionFrictionPenalty,
  computeTimeCriticalityBoost,
  timePenalty
} from './weights.js';

// =============================================================================
// EXPECTED NET IMPACT (base formula)
// =============================================================================

/**
 * Compute expected net impact from impact model
 * @param {Object} impact - ImpactModel
 * @returns {number}
 */
export function computeExpectedNetImpact(impact) {
  const {
    upsideMagnitude = 0,
    probabilityOfSuccess = 0.5,
    executionProbability = 1,
    downsideMagnitude = 0,
    timeToImpactDays = 14,
    effortCost = 0,
    secondOrderLeverage = 0
  } = impact;
  
  const combinedProbability = executionProbability * probabilityOfSuccess;
  const expectedUpside = upsideMagnitude * combinedProbability;
  const expectedDownside = downsideMagnitude * (1 - combinedProbability);
  const timePen = timePenalty(timeToImpactDays);
  
  return expectedUpside + secondOrderLeverage - expectedDownside - effortCost - timePen;
}

// =============================================================================
// RANK SCORE COMPUTATION
// =============================================================================

/**
 * Compute canonical rankScore for an action
 * 
 * @param {Object} action - Action with impact model
 * @param {Object} options - Additional context
 * @param {number} [options.trustRisk] - Trust risk score (0-1)
 * @param {number} [options.daysUntilDeadline] - Days until action deadline
 * @returns {{ rankScore: number, components: Object }}
 */
export function computeRankScore(action, options = {}) {
  const { trustRisk = 0, daysUntilDeadline = null } = options;
  
  // Base expected net impact
  const expectedNetImpact = computeExpectedNetImpact(action.impact);
  
  // Penalties
  const trustPenalty = computeTrustPenalty(trustRisk);
  const executionFrictionPenalty = computeExecutionFrictionPenalty(action);
  
  // Boost
  const timeCriticalityBoost = computeTimeCriticalityBoost(daysUntilDeadline);
  
  // Final score
  const rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost;
  
  return {
    rankScore,
    components: {
      expectedNetImpact,
      trustPenalty,
      executionFrictionPenalty,
      timeCriticalityBoost
    }
  };
}

// =============================================================================
// ACTION RANKING
// =============================================================================

/**
 * Rank all actions by rankScore (single surface)
 * 
 * @param {Object[]} actions - Actions with impact models
 * @param {Object} context - Context for computing penalties/boosts
 * @param {Map<string, number>} [context.trustRiskByAction] - Trust risk per action
 * @param {Map<string, number>} [context.deadlinesByAction] - Days until deadline per action
 * @returns {Object[]} - Actions sorted by rankScore, with rank and components
 */
export function rankActions(actions, context = {}) {
  if (!actions || actions.length === 0) return [];
  
  const { trustRiskByAction = new Map(), deadlinesByAction = new Map() } = context;
  
  // Compute rankScore for each action
  const scored = actions.map(action => {
    const options = {
      trustRisk: trustRiskByAction.get(action.actionId) || action.trustRisk || 0,
      daysUntilDeadline: deadlinesByAction.get(action.actionId) || action.daysUntilDeadline
    };
    
    const { rankScore, components } = computeRankScore(action, options);
    
    return {
      ...action,
      rankScore,
      rankComponents: components,
      // Keep expectedNetImpact for backward compatibility
      expectedNetImpact: components.expectedNetImpact
    };
  });
  
  // Sort by rankScore (descending)
  // Break ties by actionId for determinism
  scored.sort((a, b) => {
    const diff = b.rankScore - a.rankScore;
    if (Math.abs(diff) > 0.0001) return diff;
    return a.actionId.localeCompare(b.actionId);
  });
  
  // Assign ranks (1-indexed)
  return scored.map((action, index) => ({
    ...action,
    rank: index + 1
  }));
}

/**
 * Get top N actions
 * @param {Object[]} rankedActions 
 * @param {number} n 
 * @returns {Object[]}
 */
export function getTopActions(rankedActions, n = 5) {
  return rankedActions.slice(0, n);
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that ranking uses only rankScore
 * @param {Object[]} rankedActions 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRanking(rankedActions) {
  const errors = [];
  
  if (rankedActions.length === 0) return { valid: true, errors: [] };
  
  // Check all actions have rankScore
  for (const action of rankedActions) {
    if (typeof action.rankScore !== 'number' || isNaN(action.rankScore)) {
      errors.push(`Action ${action.actionId}: missing or invalid rankScore`);
    }
    
    if (typeof action.rank !== 'number' || action.rank < 1) {
      errors.push(`Action ${action.actionId}: missing or invalid rank`);
    }
  }
  
  // Verify sorting is correct
  for (let i = 1; i < rankedActions.length; i++) {
    const prev = rankedActions[i - 1];
    const curr = rankedActions[i];
    
    if (curr.rankScore > prev.rankScore + 0.0001) {
      errors.push(`Actions not sorted by rankScore at position ${i}`);
    }
  }
  
  // Verify rank sequence
  for (let i = 0; i < rankedActions.length; i++) {
    if (rankedActions[i].rank !== i + 1) {
      errors.push(`Rank sequence broken at position ${i}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Verify determinism
 * @param {Object[]} actions 
 * @param {Object} context 
 * @returns {boolean}
 */
export function verifyDeterminism(actions, context = {}) {
  const ranked1 = rankActions(actions, context);
  const ranked2 = rankActions(actions, context);
  
  if (ranked1.length !== ranked2.length) return false;
  
  for (let i = 0; i < ranked1.length; i++) {
    if (ranked1[i].actionId !== ranked2[i].actionId) return false;
    if (Math.abs(ranked1[i].rankScore - ranked2[i].rankScore) > 0.0001) return false;
  }
  
  return true;
}

export default {
  computeExpectedNetImpact,
  computeRankScore,
  rankActions,
  getTopActions,
  validateRanking,
  verifyDeterminism
};
