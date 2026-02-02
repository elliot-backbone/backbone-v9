/**
 * Obviousness Derivation
 * 
 * Computes how "obvious" an action is to the user.
 * Used as a discount (not driver) in ranking.
 * 
 * ═══════════════════════════════════════════════════════════════
 * RUNTIME ONLY — Never persist these values to storage.
 * ═══════════════════════════════════════════════════════════════
 * 
 * UNCONSIDERED means:
 * "Not already cognitively, procedurally, or temporally priced 
 *  into the user's current plan."
 * 
 * UNCONSIDERED does NOT mean: novelty, cleverness, randomness.
 * Optimizing for surprise will destroy trust.
 * 
 * @module obviousness
 */

import { 
  DISMISSAL_REASONS, 
  DISMISSAL_PENALTY_STRENGTH,
  DISMISSAL_DECAY_HALFLIFE,
  isStrongDismissal,
} from '../raw/dismissalSchema.js';
import { ASSUMPTIONS } from '../raw/assumptions_policy.js';

// Constants from assumptions
const OBVIOUSNESS_CAP = ASSUMPTIONS.rankingBounds.obviousnessCap;

/**
 * Compute obviousness penalty for an action.
 * 
 * @param {Object} action - Action to evaluate
 * @param {Object} context - Evaluation context
 * @param {Object[]} [context.recentUserActions] - Actions user has taken recently
 * @param {Object[]} [context.recentlySurfaced] - Actions we've shown recently
 * @param {string[]} [context.userFocusEntities] - Companies/goals user is actively managing
 * @param {Object[]} [context.dismissals] - Explicit user dismissals
 * @param {Date} [context.now] - Current time (for testing)
 * @returns {number} Penalty in [0, OBVIOUSNESS_CAP]
 */
export function computeObviousnessPenalty(action, context = {}) {
  const {
    recentUserActions = [],
    recentlySurfaced = [],
    userFocusEntities = [],
    dismissals = [],
    now = new Date(),
  } = context;
  
  let penalty = 0;
  
  // ═══════════════════════════════════════════════════════════════
  // 1. Already acting on similar actions (strong signal: +0.4)
  // ═══════════════════════════════════════════════════════════════
  if (matchesRecentAction(action, recentUserActions, now)) {
    penalty += 0.4;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 2. Explicitly dismissed by user
  // ═══════════════════════════════════════════════════════════════
  const dismissal = findDismissal(action, dismissals);
  if (dismissal) {
    const basePenalty = DISMISSAL_PENALTY_STRENGTH[dismissal.reason] || 0.1;
    const halfLife = DISMISSAL_DECAY_HALFLIFE[dismissal.reason] || 14;
    const daysSinceDismissal = daysBetween(new Date(dismissal.dismissedAt), now);
    
    // Exponential decay
    const decayFactor = Math.pow(0.5, daysSinceDismissal / halfLife);
    penalty += basePenalty * decayFactor;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 3. Recently surfaced but no explicit dismissal
  //    Apply mild penalty with decay (user may have deferred)
  // ═══════════════════════════════════════════════════════════════
  if (!dismissal && wasSurfacedRecently(action, recentlySurfaced, now)) {
    const daysSinceSurfaced = getDaysSinceSurfaced(action, recentlySurfaced, now);
    // Decay with 14-day half-life, max 0.15
    const decayedPenalty = 0.15 * Math.exp(-daysSinceSurfaced / 14);
    penalty += decayedPenalty;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 4. Same entity as current focus (user is probably aware: +0.15)
  // ═══════════════════════════════════════════════════════════════
  if (isCurrentFocus(action, userFocusEntities)) {
    penalty += 0.15;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 5. Direct, obvious path (+0.1)
  // ═══════════════════════════════════════════════════════════════
  if (isObviousPath(action)) {
    penalty += 0.1;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CAP: Never fully suppress (max 0.8)
  // ═══════════════════════════════════════════════════════════════
  return Math.min(penalty, OBVIOUSNESS_CAP);
}

/**
 * Find most recent dismissal for an action.
 * Matches by actionId or by similar action signature.
 * 
 * @param {Object} action
 * @param {Object[]} dismissals
 * @returns {Object|null}
 */
function findDismissal(action, dismissals) {
  if (!dismissals || dismissals.length === 0) return null;
  
  // Direct match by actionId
  const directMatch = dismissals.find(d => d.actionId === action.actionId);
  if (directMatch) return directMatch;
  
  // Fallback: match by similar action signature
  // Same company + same source type + similar title pattern
  const companyId = action.entityRef?.id;
  const sourceType = action.sources?.[0]?.sourceType;
  const opportunityClass = action.sources?.[0]?.opportunityClass;
  
  const similarMatch = dismissals
    .filter(d => 
      d.companyId === companyId &&
      d.sourceType === sourceType
    )
    .sort((a, b) => new Date(b.dismissedAt) - new Date(a.dismissedAt))
    [0];
  
  return similarMatch || null;
}

/**
 * Check if action matches a recent user action.
 * 
 * @param {Object} action
 * @param {Object[]} recentUserActions
 * @param {Date} now
 * @returns {boolean}
 */
function matchesRecentAction(action, recentUserActions, now) {
  if (!recentUserActions || recentUserActions.length === 0) return false;
  
  return recentUserActions.some(recent => {
    // Same company
    if (recent.companyId !== action.entityRef?.id) return false;
    
    // Same goal
    if (action.goalId && recent.goalId !== action.goalId) return false;
    
    // Recent enough (within 30 days)
    if (recent.completedAt) {
      const daysSince = daysBetween(new Date(recent.completedAt), now);
      if (daysSince > 30) return false;
    }
    
    return true;
  });
}

/**
 * Check if action was recently surfaced to user.
 * 
 * @param {Object} action
 * @param {Object[]} recentlySurfaced
 * @param {Date} now
 * @returns {boolean}
 */
function wasSurfacedRecently(action, recentlySurfaced, now) {
  if (!recentlySurfaced || recentlySurfaced.length === 0) return false;
  
  return recentlySurfaced.some(surfaced => {
    if (surfaced.actionId !== action.actionId) return false;
    
    const daysSince = daysBetween(new Date(surfaced.surfacedAt), now);
    return daysSince < 14;
  });
}

/**
 * Get days since action was surfaced.
 * 
 * @param {Object} action
 * @param {Object[]} recentlySurfaced
 * @param {Date} now
 * @returns {number}
 */
function getDaysSinceSurfaced(action, recentlySurfaced, now) {
  const match = recentlySurfaced.find(s => s.actionId === action.actionId);
  if (!match || !match.surfacedAt) return Infinity;
  return daysBetween(new Date(match.surfacedAt), now);
}

/**
 * Check if action is for an entity the user is currently focused on.
 * 
 * @param {Object} action
 * @param {string[]} userFocusEntities
 * @returns {boolean}
 */
function isCurrentFocus(action, userFocusEntities) {
  if (!userFocusEntities || userFocusEntities.length === 0) return false;
  
  return userFocusEntities.includes(action.entityRef?.id) ||
         userFocusEntities.includes(action.goalId);
}

/**
 * Check if action path is obvious.
 * 
 * @param {Object} action
 * @returns {boolean}
 */
function isObviousPath(action) {
  const source = action.sources?.[0];
  if (!source) return false;
  
  // Direct issue resolution is obvious
  if (source.sourceType === 'ISSUE') {
    return true;
  }
  
  // 1-hop intro with very recent touch is obvious
  if (source.opportunityClass === 'relationship_leverage') {
    if (source.pathLength === 1) {
      // Would need relationship data to check recency
      // Conservative: assume not obvious unless we have more data
      return false;
    }
  }
  
  return false;
}

/**
 * Calculate days between two dates.
 * 
 * @param {Date} date1
 * @param {Date} date2
 * @returns {number}
 */
function daysBetween(date1, date2) {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  const diff = Math.abs(d2 - d1);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Compute decay factor based on half-life.
 * 
 * @param {number} daysSince - Days since event
 * @param {number} halfLife - Half-life in days
 * @returns {number} Decay factor in [0, 1]
 */
export function computeDecayFactor(daysSince, halfLife) {
  return Math.pow(0.5, daysSince / halfLife);
}

/**
 * Get penalty breakdown for debugging/transparency.
 * 
 * @param {Object} action
 * @param {Object} context
 * @returns {Object} Breakdown of penalty components
 */
export function getObviousnessPenaltyBreakdown(action, context = {}) {
  const {
    recentUserActions = [],
    recentlySurfaced = [],
    userFocusEntities = [],
    dismissals = [],
    now = new Date(),
  } = context;
  
  const breakdown = {
    recentActionMatch: 0,
    dismissalPenalty: 0,
    surfacedPenalty: 0,
    focusPenalty: 0,
    obviousPathPenalty: 0,
    total: 0,
    capped: false,
  };
  
  // 1. Recent action match
  if (matchesRecentAction(action, recentUserActions, now)) {
    breakdown.recentActionMatch = 0.4;
  }
  
  // 2. Dismissal
  const dismissal = findDismissal(action, dismissals);
  if (dismissal) {
    const basePenalty = DISMISSAL_PENALTY_STRENGTH[dismissal.reason] || 0.1;
    const halfLife = DISMISSAL_DECAY_HALFLIFE[dismissal.reason] || 14;
    const daysSinceDismissal = daysBetween(new Date(dismissal.dismissedAt), now);
    breakdown.dismissalPenalty = basePenalty * Math.pow(0.5, daysSinceDismissal / halfLife);
  }
  
  // 3. Surfaced penalty
  if (!dismissal && wasSurfacedRecently(action, recentlySurfaced, now)) {
    const daysSinceSurfaced = getDaysSinceSurfaced(action, recentlySurfaced, now);
    breakdown.surfacedPenalty = 0.15 * Math.exp(-daysSinceSurfaced / 14);
  }
  
  // 4. Focus penalty
  if (isCurrentFocus(action, userFocusEntities)) {
    breakdown.focusPenalty = 0.15;
  }
  
  // 5. Obvious path
  if (isObviousPath(action)) {
    breakdown.obviousPathPenalty = 0.1;
  }
  
  // Total
  const rawTotal = 
    breakdown.recentActionMatch +
    breakdown.dismissalPenalty +
    breakdown.surfacedPenalty +
    breakdown.focusPenalty +
    breakdown.obviousPathPenalty;
  
  breakdown.total = Math.min(rawTotal, OBVIOUSNESS_CAP);
  breakdown.capped = rawTotal > OBVIOUSNESS_CAP;
  
  return breakdown;
}

export default {
  computeObviousnessPenalty,
  computeDecayFactor,
  getObviousnessPenaltyBreakdown,
};
