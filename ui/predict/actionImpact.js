/**
 * actionImpact.js - Unified Goal-Centric Impact Model
 * 
 * ALL upside = Σ (goalWeight × Δprobability)
 * 
 * Every action's value is measured by its impact on goal fulfillment.
 * 
 * Impact dimensions:
 * - upsideMagnitude (0-100) - Goal probability improvement
 * - probabilityOfSuccess (0-1) - Will it work if executed?
 * - executionProbability (0-1) - Will founder actually do it?
 * - downsideMagnitude (0-100)
 * - timeToImpactDays (>=0)
 * - effortCost (0-100)
 * - secondOrderLeverage (0-100)
 * 
 * @module actionImpact
 */

import { getAnyResolution } from './actionCandidates.js';
import { calculateIssueRipple } from './ripple.js';

// =============================================================================
// GOAL WEIGHTS BY TYPE
// =============================================================================

const GOAL_TYPE_WEIGHTS = {
  fundraise: 90,
  revenue: 85,
  operational: 70,
  hiring: 60,
  product: 55,
  partnership: 50
};

const STAGE_MODIFIERS = {
  'Pre-seed': { fundraise: 1.2, revenue: 0.7, operational: 1.1 },
  'Seed':     { fundraise: 1.15, revenue: 0.8, operational: 1.0 },
  'Series A': { fundraise: 1.0, revenue: 1.0, operational: 0.9 },
  'Series B': { fundraise: 0.8, revenue: 1.1, operational: 0.85 },
  'Series C': { fundraise: 0.7, revenue: 1.2, operational: 0.8 },
};

// =============================================================================
// ISSUE/PREISSUE → GOAL TYPE MAPPING
// =============================================================================

const ISSUE_AFFECTS_GOALS = {
  'RUNWAY_WARNING':    ['fundraise', 'operational'],
  'RUNWAY_CRITICAL':   ['fundraise', 'operational'],
  'BURN_SPIKE':        ['operational', 'fundraise'],
  'DATA_QUALITY':      ['operational', 'revenue'],
  'DEAL_STALE':        ['fundraise'],
  'ROUND_STALE':       ['fundraise'],
};

const PREISSUE_AFFECTS_GOALS = {
  'RUNWAY_WARNING':     ['fundraise', 'operational'],
  'BURN_SPIKE':         ['operational'],
  'GOAL_MISS':          null, // Direct link via goalId
  'DEAL_STALL':         ['fundraise'],
  'DEAL_STALE':         ['fundraise'],
  'ROUND_STALL':        ['fundraise'],
  'ROUND_DELAY':        ['fundraise'],
  'LEAD_VACANCY':       ['fundraise'],
  'CONNECTION_DORMANT': ['partnership', 'fundraise'],
  'RELATIONSHIP_DECAY': ['partnership'],
};

// Timing multipliers for INTRODUCTION actions
const TIMING_UPSIDE_MULTIPLIER = {
  'NOW': 1.2,
  'SOON': 1.0,
  'LATER': 0.7,
  'NEVER': 0.0
};

const TIMING_EXEC_PROBABILITY_ADJUST = {
  'NOW': 0.1,
  'SOON': 0.0,
  'LATER': -0.15,
  'NEVER': -1.0
};

// =============================================================================
// GOAL-CENTRIC UPSIDE CALCULATION
// =============================================================================

/**
 * Get weight for a goal based on type and company stage
 */
function getGoalWeight(goal, company) {
  const baseWeight = GOAL_TYPE_WEIGHTS[goal.type] || 50;
  const stageMod = STAGE_MODIFIERS[company?.stage] || {};
  const modifier = stageMod[goal.type] || 1.0;
  
  // User-set priority overrides
  if (goal.priority) return goal.priority;
  
  return Math.round(baseWeight * modifier);
}

/**
 * Get goals affected by an action
 */
function getAffectedGoals(action, context) {
  const source = action.sources?.[0];
  const goals = context.goals || [];
  
  if (!source) return [];
  
  // Direct goal link from source
  if (source.goalId) {
    const goal = goals.find(g => g.id === source.goalId);
    return goal ? [goal] : [];
  }
  
  // PREISSUE with goalId (e.g., GOAL_MISS)
  if (source.sourceType === 'PREISSUE') {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    if (preissue?.goalId) {
      const goal = goals.find(g => g.id === preissue.goalId);
      if (goal) return [goal];
    }
  }
  
  // Map by issue/preissue type
  let affectedTypes = [];
  
  if (source.sourceType === 'ISSUE') {
    affectedTypes = ISSUE_AFFECTS_GOALS[source.issueType] || [];
  } else if (source.sourceType === 'PREISSUE') {
    affectedTypes = PREISSUE_AFFECTS_GOALS[source.preIssueType] || [];
  }
  
  // Determine company ID - trace from action or entity
  let companyId = action.companyId || action.entityRef?.id;
  
  // If entityRef is a round/deal, look up its companyId from context
  if (action.entityRef?.type === 'round') {
    const round = context.rounds?.find(r => r.id === action.entityRef.id);
    if (round?.companyId) companyId = round.companyId;
  } else if (action.entityRef?.type === 'deal') {
    const deal = context.deals?.find(d => d.id === action.entityRef.id);
    if (deal?.companyId) companyId = deal.companyId;
  }
  
  // Fallback to context company
  if (!companyId && context.company?.id) {
    companyId = context.company.id;
  }
  
  // Find active goals of matching types FOR THIS COMPANY
  const matched = goals.filter(g => 
    affectedTypes.includes(g.type) && 
    g.status !== 'completed' && 
    g.status !== 'abandoned' &&
    (!companyId || g.companyId === companyId)
  );
  
  // If no explicit goals, create implicit goal based on stage
  if (matched.length === 0 && context.company) {
    const stage = context.company.stage;
    if (['Pre-seed', 'Seed', 'Series A'].includes(stage) && affectedTypes.includes('fundraise')) {
      return [{ id: 'implicit-fundraise', type: 'fundraise', name: 'Fundraise', implicit: true }];
    }
    if (affectedTypes.includes('operational')) {
      return [{ id: 'implicit-operational', type: 'operational', name: 'Operations', implicit: true }];
    }
  }
  
  return matched;
}

/**
 * Calculate probability lift for an action on a goal
 */
function probabilityLift(action, goal, context) {
  const source = action.sources?.[0];
  if (!source) return 0;
  
  switch (source.sourceType) {
    case 'ISSUE': {
      const issue = context.issues?.find(i => i.issueId === source.issueId);
      // Issues are ACTUAL problems - higher lift when resolved
      // Severity: 3=critical, 2=high, 1=medium
      const severity = issue?.severity || 1;
      return [0.12, 0.18, 0.28, 0.40][severity] || 0.15;
    }
    
    case 'PREISSUE': {
      const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
      if (!preissue) return 0.05;
      
      // Prevention is valuable but less than fixing actual problems
      const severityImpact = preissue.severity === 'high' ? 0.15 : 0.08;
      return preissue.likelihood * severityImpact;
    }
    
    case 'GOAL': {
      const traj = context.goalTrajectories?.find(t => t.goalId === source.goalId);
      const gap = 1 - (traj?.probabilityOfHit || 0.5);
      return gap * 0.25;
    }
    
    case 'INTRODUCTION': {
      // Introductions affect relationship/fundraise goals
      return 0.10;
    }
    
    default:
      return 0.05;
  }
}

/**
 * UNIFIED UPSIDE: upside = Σ (goalWeight × Δprobability)
 */
function deriveUpsideMagnitude(action, context) {
  const affectedGoals = getAffectedGoals(action, context);
  const source = action.sources?.[0];
  
  // Fallback for unlinked actions
  if (affectedGoals.length === 0) {
    const resolution = getAnyResolution(action.resolutionId);
    const baseImpact = resolution?.defaultImpact || 0.5;
    return {
      value: Math.round(25 + baseImpact * 25),
      explain: 'General improvement (no linked goals)'
    };
  }
  
  let totalUpside = 0;
  const impacts = [];
  
  for (const goal of affectedGoals) {
    const weight = getGoalWeight(goal, context.company);
    const lift = probabilityLift(action, goal, context);
    const impact = weight * lift;
    
    totalUpside += impact;
    impacts.push({ 
      goal: goal.name || goal.type, 
      lift: Math.round(lift * 100),
      impact: Math.round(impact)
    });
  }
  
  // Apply timing multiplier for INTRODUCTION actions
  if (action.timing && TIMING_UPSIDE_MULTIPLIER[action.timing]) {
    totalUpside *= TIMING_UPSIDE_MULTIPLIER[action.timing];
  }
  
  const value = Math.min(100, Math.max(10, Math.round(totalUpside)));
  
  // Build explanation from top impact
  const top = impacts.sort((a, b) => b.impact - a.impact)[0];
  const explain = top 
    ? `+${top.lift}% on ${top.goal} goal`
    : 'Marginal goal improvement';
  
  return { value, explain, impacts };
}

// =============================================================================
// OTHER IMPACT DIMENSIONS (unchanged)
// =============================================================================

function deriveProbabilityOfSuccess(action, context) {
  const resolution = getAnyResolution(action.resolutionId);
  const baseProb = resolution?.defaultSuccessRate || 0.6;
  
  let value = baseProb;
  let explain = 'Standard success probability';
  
  // Adjust based on company health
  const health = context.company?.health?.overall;
  if (health) {
    if (health > 70) {
      value = Math.min(0.95, value + 0.1);
      explain = 'Higher probability - healthy company';
    } else if (health < 40) {
      value = Math.max(0.2, value - 0.15);
      explain = 'Lower probability - company under stress';
    }
  }
  
  return { value, explain };
}

function deriveExecutionProbability(action, context) {
  let value = 0.5;
  let explain = 'Standard execution probability';
  
  const resolution = getAnyResolution(action.resolutionId);
  if (resolution?.executionDifficulty) {
    const difficultyMap = { 'easy': 0.7, 'medium': 0.5, 'hard': 0.3 };
    value = difficultyMap[resolution.executionDifficulty] || 0.5;
    explain = `${resolution.executionDifficulty} execution`;
  }
  
  // Timing adjustment for introductions
  if (action.timing && TIMING_EXEC_PROBABILITY_ADJUST[action.timing]) {
    value = Math.max(0.1, Math.min(0.9, value + TIMING_EXEC_PROBABILITY_ADJUST[action.timing]));
  }
  
  return { value, explain };
}

function deriveDownsideMagnitude(action, context) {
  const source = action.sources?.[0];
  
  if (source?.sourceType === 'ISSUE') {
    const issue = context.issues?.find(i => i.issueId === source.issueId);
    if (issue?.severity >= 2) {
      return { value: 15, explain: 'Minimal downside - addresses existing problem' };
    }
  }
  
  return { value: 10, explain: 'Low downside risk' };
}

function deriveTimeToImpact(action, context) {
  const resolution = getAnyResolution(action.resolutionId);
  const baseDays = resolution?.typicalTimeToImpactDays || 14;
  return { value: baseDays, explain: `~${baseDays} days to see results` };
}

function deriveEffortCost(action, context) {
  const resolution = getAnyResolution(action.resolutionId);
  const baseEffort = resolution?.effortCost || 40;
  return { value: baseEffort, explain: resolution?.effortLevel || 'Moderate effort' };
}

function deriveSecondOrderLeverage(action, context) {
  const source = action.sources?.[0];
  
  if (source?.sourceType === 'ISSUE') {
    const ripple = calculateIssueRipple(source.issueId, context.rippleByCompany);
    if (ripple?.totalImpact > 50) {
      return { value: ripple.totalImpact, explain: `Unlocks ${ripple.blockedCount} blocked items` };
    }
  }
  
  // Multi-goal actions have inherent leverage
  const affectedGoals = getAffectedGoals(action, context);
  if (affectedGoals.length > 1) {
    return { value: 30 + affectedGoals.length * 10, explain: `Affects ${affectedGoals.length} goals` };
  }
  
  return { value: 10, explain: 'Limited second-order effects' };
}

// =============================================================================
// MAIN EXPORT: attachImpactModel
// =============================================================================

function attachImpactModel(action, context) {
  const upside = deriveUpsideMagnitude(action, context);
  const prob = deriveProbabilityOfSuccess(action, context);
  const execProb = deriveExecutionProbability(action, context);
  const downside = deriveDownsideMagnitude(action, context);
  const time = deriveTimeToImpact(action, context);
  const effort = deriveEffortCost(action, context);
  const leverage = deriveSecondOrderLeverage(action, context);
  
  // Build explanation array
  const explain = [
    upside.explain,
    prob.explain !== 'Standard success probability' ? prob.explain : null,
    leverage.value > 25 ? leverage.explain : null,
  ].filter(Boolean).slice(0, 4);
  
  const impact = {
    upsideMagnitude: upside.value,
    probabilityOfSuccess: prob.value,
    executionProbability: execProb.value,
    downsideMagnitude: downside.value,
    timeToImpactDays: time.value,
    effortCost: effort.value,
    secondOrderLeverage: leverage.value,
    explain,
    goalImpacts: upside.impacts
  };
  
  return { ...action, impact };
}

/**
 * Attach impact models to all actions for a company
 */
export function attachCompanyImpactModels(actions, context) {
  return actions.map(action => attachImpactModel(action, context));
}

export default attachImpactModel;
