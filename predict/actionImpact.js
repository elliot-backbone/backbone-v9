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
// ENTITY WEIGHTS FOR PREISSUE STAKE CALCULATION
// =============================================================================

const ENTITY_WEIGHTS = {
  company: 1.0,
  round: 0.9,
  deal: 0.7,
  firm: 0.6,
  person: 0.5,
  relationship: 0.4
};

/**
 * Get entity weight for impact calculation
 */
function getEntityWeight(entityType) {
  return ENTITY_WEIGHTS[entityType] || 0.6;
}

/**
 * Derive stake ($ at risk) for a preissue based on actual data
 * Returns dollar value representing what could be lost if preissue becomes issue
 */
function derivePreissueStake(preissue, context) {
  const company = context.company;
  const entityType = preissue.entityRef?.type || 'company';
  const entityId = preissue.entityRef?.id;
  
  let stake = 500000; // Default fallback
  
  switch (preissue.preIssueType) {
    case 'RUNWAY_WARNING':
    case 'BURN_SPIKE':
      // Stake = 3 months of burn (what we'd lose if runway runs out)
      stake = (company?.burn || 100000) * 3;
      break;
      
    case 'GOAL_MISS': {
      // Stake = gap between current and target, or % of ARR
      const goal = context.goals?.find(g => g.id === preissue.goalId || g.id === preissue.goalRef?.id);
      if (goal) {
        const cur = goal.cur ?? goal.current ?? 0;
        const tgt = goal.tgt ?? goal.target ?? 0;
        if (goal.type === 'revenue' || goal.type === 'fundraise') {
          stake = Math.max(0, tgt - cur);
        } else if (goal.type === 'hiring') {
          // Hiring: gap × avg cost per hire
          stake = Math.max(0, tgt - cur) * 50000;
        } else {
          stake = (company?.burn || 100000) * 3;
        }
      } else {
        stake = (company?.arr || 500000) * 0.15;
      }
      break;
    }
    
    case 'DEAL_STALL':
    case 'DEAL_STALE': {
      // Stake = deal amount at risk
      const deal = context.deals?.find(d => d.id === entityId);
      stake = deal?.amt || 500000;
      break;
    }
    
    case 'ROUND_STALL':
    case 'ROUND_DELAY': {
      // Stake = round target amount
      const round = context.rounds?.find(r => r.id === entityId);
      stake = round?.amt || company?.roundTarget || 2000000;
      break;
    }
    
    case 'LEAD_VACANCY': {
      // Stake = round amount (no lead = entire round at risk)
      const round = context.rounds?.find(r => r.id === entityId);
      stake = round?.amt || company?.roundTarget || 2000000;
      break;
    }
    
    case 'CONNECTION_DORMANT':
    case 'RELATIONSHIP_DECAY':
    case 'FIRM_RELATIONSHIP_DECAY': {
      // Stake = estimated relationship value (scaled by relationship type)
      const rel = context.relationships?.find(r => r.id === entityId);
      // Strategic relationships worth more
      if (rel?.type === 'investor' || rel?.type === 'board') {
        stake = 300000;
      } else if (rel?.type === 'advisor') {
        stake = 150000;
      } else {
        stake = 75000;
      }
      // If we know the firm, scale by their typical deal size
      const firm = context.firms?.find(f => f.id === preissue.firmRef?.id);
      const firmDeals = context.deals?.filter(d => d.firmId === firm?.id);
      if (firmDeals?.length > 0) {
        stake = firmDeals.reduce((sum, d) => sum + (d.amt || 0), 0) / firmDeals.length;
      }
      break;
    }
    
    case 'KEY_HIRE_DEPARTURE':
    case 'EXEC_FLIGHT_RISK': {
      // Stake = replacement cost + productivity loss
      const isExecutive = preissue.role?.includes('VP') || preissue.role?.includes('Chief') || preissue.role?.includes('C-');
      const isFounder = preissue.role?.includes('Founder') || preissue.role?.includes('CEO');
      stake = isFounder ? 1000000 : isExecutive ? 400000 : 150000;
      break;
    }
    
    case 'HIRING_STALLED': {
      // Stake = cost of unfilled roles (productivity loss + recruiting)
      const hiringGap = preissue.hiringGap || 3;
      stake = hiringGap * 15000 * 3 + hiringGap * 20000;
      break;
    }
    
    default:
      stake = 500000;
  }
  
  return stake;
}

/**
 * Derive stake ($ at risk) for an ISSUE based on issue type
 */
function deriveIssueStake(issue, context) {
  const company = context.company;
  let stake = 500000; // Default fallback
  
  switch (issue.issueType) {
    case 'RUNWAY_CRITICAL':
    case 'RUNWAY_WARNING':
      // Stake = remaining cash + what we'd need to survive
      stake = (company?.cash || 0) + (company?.burn || 100000) * 6;
      break;
      
    case 'BURN_SPIKE':
      // Stake = excess burn × 12 months
      const expectedBurn = company?.burn || 100000;
      stake = expectedBurn * 0.3 * 12; // 30% over budget for a year
      break;
      
    case 'GOAL_BEHIND':
    case 'GOAL_STALLED':
    case 'GOAL_MISSED': {
      // Stake = gap between current and target
      const goalId = issue.goalId || (issue.entityRef?.type === 'goal' ? issue.entityRef.id : null);
      const goal = goalId ? context.goals?.find(g => g.id === goalId) : null;
      if (goal) {
        const cur = goal.cur ?? goal.current ?? 0;
        const tgt = goal.tgt ?? goal.target ?? 0;
        if (goal.type === 'revenue' || goal.type === 'fundraise') {
          stake = Math.max(0, tgt - cur);
        } else if (goal.type === 'hiring') {
          stake = Math.max(0, tgt - cur) * 50000;
        } else {
          stake = (company?.burn || 100000) * 3;
        }
      } else {
        stake = (company?.arr || 1000000) * 0.2;
      }
      break;
    }
    
    case 'DEAL_STALE':
    case 'DEAL_LOST': {
      const dealId = issue.dealId || (issue.entityRef?.type === 'deal' ? issue.entityRef.id : null);
      const deal = dealId ? context.deals?.find(d => d.id === dealId) : null;
      stake = deal?.amt || 1000000;
      break;
    }
    
    case 'ROUND_STALLED':
    case 'PIPELINE_GAP': {
      const roundId = issue.roundId || (issue.entityRef?.type === 'round' ? issue.entityRef.id : null);
      const round = roundId ? context.rounds?.find(r => r.id === roundId) : null;
      stake = round?.amt || company?.roundTarget || 2000000;
      break;
    }
    
    case 'DATA_QUALITY':
    case 'NO_GOALS':
    case 'STALE_DATA':
      // Lower stakes for data quality issues
      stake = (company?.arr || 500000) * 0.1;
      break;
      
    default:
      stake = (company?.arr || 1000000) * 0.15;
  }
  
  return stake;
}

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
      // Severity: 3=critical, 2=high, 1=medium, 0=low (handle both numeric and string)
      const sev = issue?.severity;
      let severity = 1;
      if (sev === 'critical' || sev === 3) severity = 3;
      else if (sev === 'high' || sev === 2) severity = 2;
      else if (sev === 'medium' || sev === 1) severity = 1;
      return [0.12, 0.18, 0.28, 0.40][severity] || 0.15;
    }
    
    case 'PREISSUE': {
      const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
      if (!preissue) return 0.05;
      
      // STAKE-BASED calculation: What's actually at risk?
      const stake = derivePreissueStake(preissue, context);
      
      // Normalize stake to 0-0.35 range using log scale
      // $100K stake → ~0.15, $1M stake → ~0.25, $10M stake → ~0.35
      const normalizedStake = Math.min(0.35, 0.08 * Math.log10(1 + stake / 50000));
      
      // Weight by likelihood
      const likelihood = preissue.likelihood || 0.5;
      let lift = normalizedStake * (0.3 + likelihood * 0.7);
      
      // Severity boost
      const sev = preissue.severity;
      if (sev === 'high' || sev === 'critical' || sev >= 2) {
        lift *= 1.15;
      }
      
      // Imminent escalation boost
      if (preissue.escalation?.isImminent) {
        lift *= 1.1;
      }
      
      return Math.min(0.35, Math.max(0.05, lift));
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
 * 
 * For ISSUE/PREISSUE: Use direct stake-based calculation for better differentiation
 */
function deriveUpsideMagnitude(action, context) {
  const affectedGoals = getAffectedGoals(action, context);
  const source = action.sources?.[0];
  
  // ISSUE: Direct stake-based calculation with severity floor
  if (source?.sourceType === 'ISSUE') {
    const issue = context.issues?.find(i => i.issueId === source.issueId);
    if (issue) {
      // Calculate stake based on issue type
      const stake = deriveIssueStake(issue, context);
      
      // Normalize stake using log scale
      const normalizedStake = Math.min(80, 20 * Math.log10(1 + stake / 100000));
      
      // Severity floor (issues are real problems)
      const sev = issue.severity;
      let severityFloor;
      if (sev === 'critical' || sev === 3) {
        severityFloor = 55;
      } else if (sev === 'high' || sev === 2) {
        severityFloor = 45;
      } else {
        severityFloor = 35;
      }
      
      // Use max of stake-based and severity floor
      let value = Math.max(severityFloor, normalizedStake);
      
      // Cap at 85 (leave room for truly exceptional situations)
      value = Math.min(85, Math.round(value));
      
      // Format explanation
      const stakeK = stake >= 1000000 ? `$${(stake/1000000).toFixed(1)}M` : `$${Math.round(stake/1000)}K`;
      const sevName = sev === 3 || sev === 'critical' ? 'Critical' : 
                      sev === 2 || sev === 'high' ? 'High' : 
                      sev === 1 || sev === 'medium' ? 'Medium' : 'Low';
      const explain = `${sevName} issue: ${issue.issueType} (${stakeK} at stake)`;
      
      return { value, explain, impacts: [] };
    }
  }
  
  // PREISSUE: Direct stake-based calculation for better differentiation
  if (source?.sourceType === 'PREISSUE') {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    if (preissue) {
      const stake = derivePreissueStake(preissue, context);
      
      // Normalize stake to 15-65 range using log scale
      // $100K → ~25, $500K → ~35, $2M → ~45, $10M → ~55, $50M → ~65
      const normalizedStake = Math.min(65, 15 + 18 * Math.log10(1 + stake / 50000));
      
      // Weight by likelihood
      const likelihood = preissue.likelihood || 0.5;
      let value = normalizedStake * (0.5 + likelihood * 0.5);
      
      // Severity boost
      const sev = preissue.severity;
      if (sev === 'high' || sev === 'critical' || sev >= 2) {
        value += 5;
      }
      
      // Imminent escalation boost
      if (preissue.escalation?.isImminent) {
        value += 3;
      }
      
      // Cap at 65 - PREISSUE must rank below ISSUE
      value = Math.min(65, Math.max(15, Math.round(value)));
      
      // Format explanation with stake visibility
      const stakeK = stake >= 1000000 ? `$${(stake/1000000).toFixed(1)}M` : `$${Math.round(stake/1000)}K`;
      const imminentTag = preissue.escalation?.isImminent ? ' [IMMINENT]' : '';
      const explain = `Prevention of ${preissue.preIssueType} (${stakeK} at stake)${imminentTag}`;
      
      return { value, explain, impacts: [] };
    }
  }
  
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
    const sev = issue?.severity;
    // Handle both numeric (2=high, 3=critical) and string severity
    if (sev === 'high' || sev === 'critical' || sev >= 2) {
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
  
  // PREISSUE: Prevention has inherent leverage - avoiding a problem is valuable
  if (source?.sourceType === 'PREISSUE') {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    if (preissue) {
      // Higher stake = more leverage from prevention
      const stake = derivePreissueStake(preissue, context);
      if (stake > 1000000) {
        return { value: 50, explain: `Prevents $${(stake/1000000).toFixed(1)}M at risk` };
      } else if (stake > 100000) {
        return { value: 35, explain: `Prevents $${(stake/1000).toFixed(0)}K at risk` };
      }
      return { value: 25, explain: 'Preventative action' };
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
