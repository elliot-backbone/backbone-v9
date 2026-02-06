/**
 * decide/ranking.js - Unified Action Ranking (Phase 4.5 + UI-3 + Proactive)
 *
 * SINGLE CANONICAL RANKING SURFACE
 *
 * All actions are ordered by exactly ONE scalar: rankScore
 *
 * NEW Formula (Proactive Action Model):
 *   rankScore = clamp(impact) × clamp(feasibility) × clamp(timing) × (1 - obviousnessPenalty)
 *
 * Where:
 *   - All components normalized to [0, 1]
 *   - Components clamped to [0.2, 1.0] to prevent collapse
 *   - obviousnessPenalty capped at 0.8
 *
 * Urgency Gates:
 *   - CAT1 (Catastrophic): ISSUE/PREISSUE actions surface unconditionally
 *   - CAT2 (Blocking): ISSUE/PREISSUE actions surface if they unblock opportunities
 *   - No Gate: OPPORTUNITY actions dominate (≥70% of top N)
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
  computeSourceTypeBoost
} from './weights.js';
import { computeAllPatternLifts, LIFT_MAX } from '../derive/patternLift.js';
import { computeExpectedNetImpact } from '../derive/impact.js';

export { computeExpectedNetImpact };

// =============================================================================
// RANK SCORE COMPUTATION (CANONICAL — engine-reachable via rankActions)
// =============================================================================
/**
 * Compute canonical rankScore for an action (additive EV formula).
 * This is the ONLY scoring function reachable from the engine.
 *
 * rankScore = expectedNetImpact - trustPenalty - frictionPenalty + timeBoost + sourceBoost + patternLift
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
 * Rank all actions by rankScore (single surface).
 * EXECUTION PATH: Called by engine `actionRanker` node and portfolio-level re-rank.
 * Canonical scorer is `computeRankScore` (additive EV). No other scoring function is engine-reachable.
 *
 * @param {Object[]} actions - Actions with impact models
 * @param {Object} context - Context for computing penalties/boosts
 * @param {Map<string, number>} [context.trustRiskByAction] - Trust risk per action
 * @param {Map<string, number>} [context.deadlinesByAction] - Days until deadline per action
 * @param {Object[]} [context.events] - Event stream for pattern detection
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

  // Compute pattern lifts (runtime-derived, never persisted)
  const patternLifts = computeAllPatternLifts(actions, events, now);

  // Compute rankScore for each action
  const scored = actions.map(action => {
    const options = {
      trustRisk: trustRiskByAction.get(action.actionId) || action.trustRisk || 0,
      daysUntilDeadline: deadlinesByAction.get(action.actionId) || action.daysUntilDeadline
    };

    const { rankScore: baseScore, components } = computeRankScore(action, options);

    // Add pattern lift (bounded, cannot dominate ranking)
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

  // Allow up to 5 actions per company per source type (reactive/proactive)
  // This gives diversity while avoiding spam
  const MAX_PER_COMPANY_PER_TYPE = 5;
  const countByCompanyType = {};
  const deduped = scored.filter(action => {
    const companyName = (action.entityRef?.name || action.companyName || 'unknown').toLowerCase().replace(/\s+/g, '');
    const sourceType = action.sources?.[0]?.sourceType || 'OTHER';
    const key = `${companyName}::${sourceType}`;

    countByCompanyType[key] = (countByCompanyType[key] || 0) + 1;
    return countByCompanyType[key] <= MAX_PER_COMPANY_PER_TYPE;
  });

  // Filter out negative scores - these are actions where effort > upside
  const positive = deduped.filter(action => action.rankScore > 0);

  // Assign ranks (1-indexed)
  return positive.map((action, index) => ({
    ...action,
    rank: index + 1
  }));
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

export default {
  computeExpectedNetImpact,
  computeRankScore,
  rankActions,
  validateRanking
};
