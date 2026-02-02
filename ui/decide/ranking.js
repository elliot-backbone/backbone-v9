/**
 * decide/ranking.js - Unified Action Ranking (Phase 4.5 + UI-3)
 * 
 * SINGLE CANONICAL RANKING SURFACE
 * 
 * All actions are ordered by exactly ONE scalar: rankScore
 * 
 * Formula:
 *   rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost + patternLift
 * 
 * Where:
 *   expectedNetImpact = (upside * combinedProb) + leverage - (downside * failProb) - effort - timePenalty
 *   combinedProb = executionProbability * probabilityOfSuccess
 *   patternLift = UI-3 bounded adjustment from observation patterns (runtime-derived only)
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
  computeSourceTypeBoost,
  timePenalty
} from './weights.js';
import { computeAllPatternLifts, LIFT_MAX } from '../derive/patternLift.js';
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
  
  // Boosts
  const timeCriticalityBoost = computeTimeCriticalityBoost(daysUntilDeadline);
  const sourceTypeBoost = computeSourceTypeBoost(action);
  
  // Final score
  const rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost + sourceTypeBoost;
  
  return {
    rankScore,
    components: {
      expectedNetImpact,
      trustPenalty,
      executionFrictionPenalty,
      timeCriticalityBoost,
      sourceTypeBoost
    }
  };
}
// =============================================================================
// ACTION RANKING
// =============================================================================
/**
 * Rank all actions by rankScore (single surface)
 * 
 * UI-3: Now accepts events for pattern lift computation (runtime-derived only)
 * 
 * @param {Object[]} actions - Actions with impact models
 * @param {Object} context - Context for computing penalties/boosts
 * @param {Map<string, number>} [context.trustRiskByAction] - Trust risk per action
 * @param {Map<string, number>} [context.deadlinesByAction] - Days until deadline per action
 * @param {Object[]} [context.events] - Event stream for pattern detection (UI-3)
 * @param {Date} [context.now] - Current time for pattern decay
 * @returns {Object[]} - Actions sorted by rankScore, with rank and components
 */
export function rankActions(actions, context = {}) {
  if (!actions || actions.length === 0) return [];
  
  const { 
    trustRiskByAction = new Map(), 
    deadlinesByAction = new Map(),
    events = [],
    now = new Date()
  } = context;
  
  // UI-3: Compute pattern lifts (runtime-derived, never persisted)
  const patternLifts = computeAllPatternLifts(actions, events, now);
  
  // Compute rankScore for each action
  const scored = actions.map(action => {
    const options = {
      trustRisk: trustRiskByAction.get(action.actionId) || action.trustRisk || 0,
      daysUntilDeadline: deadlinesByAction.get(action.actionId) || action.daysUntilDeadline
    };
    
    const { rankScore: baseScore, components } = computeRankScore(action, options);
    
    // UI-3: Add pattern lift (bounded, cannot dominate ranking)
    const patternLift = patternLifts.get(action.actionId) || 0;
    const rankScore = baseScore + patternLift;
    
    return {
      ...action,
      rankScore,
      rankComponents: {
        ...components,
        patternLift // Include in components for transparency
      },
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
  
  // NOTE: We no longer deduplicate by problem type here.
  // Each action has a unique actionId tied to a specific issue/preissue.
  // Deduplication by actionId happens in engine.js.
  // Showing multiple DEAL_STALE actions across different companies is intentional.
  
  // NOTE: We no longer cap by category. The ranking itself should naturally
  // surface the most important actions. UI can paginate/filter as needed.
  
  // Assign ranks (1-indexed)
  return scored.map((action, index) => ({
    ...action,
    rank: index + 1
  }));
}

/**
 * Determine action category for diversity filtering
 */
function getActionCategory(action) {
  const source = action.sources?.[0];
  const issueType = source?.issueType || source?.preIssueType || '';
  
  // Fundraise-related
  if (['ROUND_STALL', 'DEAL_STALL', 'LEAD_VACANCY', 'PIPELINE_GAP', 
       'ROUND_DELAY', 'DEAL_STALE', 'ROUND_STALE'].includes(issueType)) {
    return 'fundraise';
  }
  
  // Operational/runway
  if (['RUNWAY_WARNING', 'RUNWAY_CRITICAL', 'BURN_SPIKE', 'DATA_QUALITY'].includes(issueType)) {
    return 'operational';
  }
  
  // Relationship
  if (['CONNECTION_DORMANT', 'RELATIONSHIP_DECAY'].includes(issueType)) {
    return 'relationship';
  }
  
  // Goal-based
  if (source?.sourceType === 'GOAL' || issueType === 'GOAL_MISS' || issueType === 'GOAL_STALLED') {
    return 'goal';
  }
  
  return 'other';
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
