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
  computeSourceTypeBoost,
  timePenalty
} from './weights.js';
import { computeAllPatternLifts, LIFT_MAX } from '../derive/patternLift.js';
import { computeObviousnessPenalty } from '../derive/obviousness.js';
import { deriveRunwayMonths } from '../derive/runwayDerived.js';
import { normalizeImpact, clampComponent, normalizeFeasibility, normalizeTiming } from '../derive/impactNormalized.js';
import { ASSUMPTIONS } from '../raw/assumptions_policy.js';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const GATE_CLASS = {
  CAT1: 'CAT1', // Catastrophic - unconditional surface
  CAT2: 'CAT2', // Blocking - must declare unblocks
};

const { componentFloor, componentCeiling, obviousnessCap } = ASSUMPTIONS.rankingBounds;
const { noGate: PROACTIVITY_TARGET_NO_GATE, cat2Gate: PROACTIVITY_TARGET_CAT2 } = ASSUMPTIONS.proactivityTargets;
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

// ═══════════════════════════════════════════════════════════════
// URGENCY GATES (CAT1 / CAT2)
// ═══════════════════════════════════════════════════════════════

/**
 * Apply urgency gates to determine if reactive action should surface
 * 
 * @param {Object} action
 * @param {Object} context
 * @returns {{ gated: boolean, gateClass: string|null, reason: string, unblocks?: string[] }}
 */
export function applyUrgencyGate(action, context = {}) {
  const { company = {}, goals = [], topOpportunityActions = [] } = context;
  
  const source = action.sources?.[0];
  const isReactive = source?.sourceType === 'ISSUE' || source?.sourceType === 'PREISSUE';
  
  // Non-reactive actions don't need gates
  if (!isReactive) {
    return { gated: false, gateClass: null };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CAT1: Catastrophic Gates (unconditional surface)
  // ═══════════════════════════════════════════════════════════════
  
  // Runway cliff
  const runwayMonths = deriveRunwayMonths(company);
  const hasActiveRaise = goals.some(g => g.type === 'fundraise' && g.status === 'active');
  const runwayCliffThreshold = ASSUMPTIONS.urgencyGates.runwayCliffMonths;
  
  if (runwayMonths < runwayCliffThreshold && !hasActiveRaise) {
    const issueType = source?.issueType || '';
    if (issueType.includes('RUNWAY') || issueType.includes('BURN')) {
      return { gated: true, gateClass: GATE_CLASS.CAT1, reason: 'RUNWAY_CLIFF' };
    }
  }
  
  // Legal deadline
  const legalDeadlineThreshold = ASSUMPTIONS.urgencyGates.legalDeadlineDays;
  if (source?.issueType === 'LEGAL_DEADLINE') {
    const daysUntil = source?.daysUntilDeadline ?? Infinity;
    if (daysUntil <= legalDeadlineThreshold) {
      return { gated: true, gateClass: GATE_CLASS.CAT1, reason: 'LEGAL_DEADLINE' };
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CAT2: Blocking Gates (must declare what they unblock)
  // ═══════════════════════════════════════════════════════════════
  
  const unblockedOpportunities = findUnblockedOpportunities(action, topOpportunityActions);
  if (unblockedOpportunities.length > 0) {
    return { 
      gated: true, 
      gateClass: GATE_CLASS.CAT2, 
      reason: 'BLOCKER_FOR_OPPORTUNITY',
      unblocks: unblockedOpportunities.map(o => o.actionId),
    };
  }
  
  // No gate triggered — reactive action should not surface
  return { gated: false, gateClass: null };
}

/**
 * Find which opportunity actions this reactive action would unblock
 */
function findUnblockedOpportunities(reactiveAction, topOpportunityActions) {
  const unblocked = [];
  
  const reactiveCompanyId = reactiveAction.entityRef?.id;
  const reactiveIssueType = reactiveAction.sources?.[0]?.issueType;
  
  for (const oppAction of topOpportunityActions) {
    if (oppAction.entityRef?.id !== reactiveCompanyId) continue;
    
    // Data dependency blocks
    if (reactiveIssueType === 'DATA_MISSING' && oppAction.requiresData) {
      unblocked.push(oppAction);
      continue;
    }
    
    // Deck/materials blocks fundraise opportunities
    if (reactiveIssueType === 'DECK_OUTDATED') {
      if (oppAction.goalId) {
        const oppClass = oppAction.sources?.[0]?.opportunityClass;
        if (oppClass === 'relationship_leverage' || oppClass === 'timing_window') {
          unblocked.push(oppAction);
          continue;
        }
      }
    }
    
    // Relationship stall blocks intro opportunities
    if (reactiveIssueType === 'RELATIONSHIP_STALL') {
      const oppClass = oppAction.sources?.[0]?.opportunityClass;
      if (oppClass === 'relationship_leverage') {
        unblocked.push(oppAction);
        continue;
      }
    }
  }
  
  return unblocked;
}

// ═══════════════════════════════════════════════════════════════
// PROACTIVE RANKING (NEW FORMULA)
// ═══════════════════════════════════════════════════════════════

/**
 * Compute rankScore using proactive formula with clamped components
 * 
 * rankScore = clamp(impact) × clamp(feasibility) × clamp(timing) × (1 - obviousnessPenalty)
 * 
 * @param {Object} action
 * @param {Object} context
 * @returns {{ rankScore: number, components: Object }}
 */
export function computeProactiveRankScore(action, context = {}) {
  const { obviousnessContext = {}, trustRisk = 0 } = context;
  
  // Get raw impact (use expectedNetImpact for backward compatibility)
  const rawImpact = action.impact?.upsideMagnitude ?? computeExpectedNetImpact(action.impact || {});
  
  // Normalize and clamp impact
  const normalizedImpact = normalizeImpact(rawImpact);
  const clampedImpact = clampComponent(normalizedImpact);
  
  // Compute feasibility
  const rawFeasibility = normalizeFeasibility({
    executionProbability: action.impact?.executionProbability ?? 0.5,
    trustRiskScore: trustRisk * 100,
    effortCost: action.impact?.effortCost ?? 0,
  });
  const clampedFeasibility = clampComponent(rawFeasibility);
  
  // Compute timing
  const rawTiming = normalizeTiming(action.impact?.timeToImpactDays ?? 14);
  const clampedTiming = clampComponent(rawTiming);
  
  // Compute obviousness penalty
  const obviousnessPenalty = Math.min(
    computeObviousnessPenalty(action, obviousnessContext),
    obviousnessCap
  );
  
  // Final score: multiplicative with clamped components
  const rankScore = clampedImpact * clampedFeasibility * clampedTiming * (1 - obviousnessPenalty);
  
  return {
    rankScore,
    components: {
      impact: clampedImpact,
      feasibility: clampedFeasibility,
      timing: clampedTiming,
      obviousnessPenalty,
      rawImpact: normalizedImpact,
      rawFeasibility,
      rawTiming,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// PROACTIVITY DISTRIBUTION VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate proactivity distribution
 * 
 * @param {Object[]} rankedActions
 * @param {Object} context
 * @returns {{ valid: boolean, ratio: number, violations: string[] }}
 */
export function validateProactivityDistribution(rankedActions, context = {}) {
  const { activeCat1Gate = false, activeCat2Gate = false } = context;
  const violations = [];
  
  const topN = rankedActions.slice(0, 10);
  if (topN.length === 0) return { valid: true, ratio: 1, violations: [] };
  
  const opportunityCount = topN.filter(a => 
    a.sources?.[0]?.sourceType === 'OPPORTUNITY'
  ).length;
  
  const ratio = opportunityCount / topN.length;
  
  // CAT1 active: no distribution requirement (survival mode)
  if (activeCat1Gate) {
    return { valid: true, ratio, violations: [] };
  }
  
  // CAT2 active: ≥50% OPPORTUNITY
  if (activeCat2Gate) {
    if (ratio < PROACTIVITY_TARGET_CAT2) {
      violations.push(`Proactivity ratio ${(ratio * 100).toFixed(0)}% < ${PROACTIVITY_TARGET_CAT2 * 100}% (CAT2 gate active)`);
    }
    return { valid: ratio >= PROACTIVITY_TARGET_CAT2, ratio, violations };
  }
  
  // No gate: ≥70% OPPORTUNITY
  if (ratio < PROACTIVITY_TARGET_NO_GATE) {
    violations.push(`Proactivity ratio ${(ratio * 100).toFixed(0)}% < ${PROACTIVITY_TARGET_NO_GATE * 100}% (no gate active)`);
  }
  
  return { valid: ratio >= PROACTIVITY_TARGET_NO_GATE, ratio, violations };
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
  
  // NOTE: We no longer cap by category. The ranking itself should naturally
  // surface the most important actions. UI can paginate/filter as needed.
  
  // Assign ranks (1-indexed)
  return positive.map((action, index) => ({
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
  GATE_CLASS,
  computeExpectedNetImpact,
  computeRankScore,
  computeProactiveRankScore,
  applyUrgencyGate,
  validateProactivityDistribution,
  rankActions,
  getTopActions,
  validateRanking,
  verifyDeterminism
};
