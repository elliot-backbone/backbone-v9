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
  round_completion: 85,
  deal_close: 80,
  operational: 70,
  retention: 65,
  efficiency: 65,
  hiring: 60,
  customer_growth: 60,
  product: 55,
  partnership: 50,
  intro_target: 45,
  relationship_build: 40,
  investor_activation: 35,
  champion_cultivation: 30,
};

const STAGE_MODIFIERS = {
  'Pre-seed': { fundraise: 1.2, revenue: 0.7, operational: 1.1 },
  'Seed':     { fundraise: 1.15, revenue: 0.8, operational: 1.0 },
  'Series A': { fundraise: 1.0, revenue: 1.0, operational: 0.9 },
  'Series B': { fundraise: 0.8, revenue: 1.1, operational: 0.85 },
  'Series C': { fundraise: 0.7, revenue: 1.2, operational: 0.8 },
};

// =============================================================================
// UNIFIED SOURCE → GOAL TYPE MAPPING (issue + preissue types merged)
// =============================================================================

const SOURCE_AFFECTS_GOALS = {
  'RUNWAY_WARNING':     ['fundraise', 'operational'],
  'RUNWAY_CRITICAL':    ['fundraise', 'operational'],
  'BURN_SPIKE':         ['operational', 'fundraise'],
  'DATA_QUALITY':       ['operational', 'revenue'],
  'DEAL_STALE':         ['fundraise'],
  'ROUND_STALE':        ['fundraise'],
  'GOAL_MISS':          null, // Direct link via goalId
  'DEAL_STALL':         ['fundraise'],
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
        if (goal.type === 'fundraise') {
          // Fundraise goals: stake = round amount (entire round at risk)
          const activeRound = context.rounds?.find(r => r.companyId === company?.id && r.status === 'active');
          stake = activeRound?.amt || company?.roundTarget || tgt || 2000000;
        } else if (goal.type === 'revenue') {
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
// UNIFIED SIGNAL EXTRACTION
// =============================================================================

/**
 * Extract unified signals from any source type (ISSUE or PREISSUE).
 * Returns the same shape regardless of source, enabling one scoring formula.
 *
 * Signals: stake ($), probability (0-1), ttiDays, severity (0-3), irreversibility (0-1)
 */
function extractSignals(action, context) {
  const source = action.sources?.[0];
  const defaults = { stake: 500000, probability: 0.5, ttiDays: 14, severity: 1, irreversibility: 0.5 };
  if (!source) return defaults;

  if (source.sourceType === 'ISSUE') {
    const issue = context.issues?.find(i => i.issueId === source.issueId);
    if (!issue) return defaults;

    const stake = deriveIssueStake(issue, context);
    const sev = issue.severity;
    let severity, probability;
    if (sev === 'critical' || sev === 3) { severity = 3; probability = 0.9; }
    else if (sev === 'high' || sev === 2) { severity = 2; probability = 0.75; }
    else if (sev === 'medium' || sev === 1) { severity = 1; probability = 0.6; }
    else { severity = 0; probability = 0.5; }

    const ttiDays = severity >= 3 ? 3 : severity >= 2 ? 7 : 14;
    const irreversibility = severity >= 3 ? 0.8 : severity >= 2 ? 0.6 : 0.4;

    return { stake, probability, ttiDays, severity, irreversibility };
  }

  if (source.sourceType === 'PREISSUE') {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    if (!preissue) return defaults;

    const stake = derivePreissueStake(preissue, context);
    const probability = preissue.probability || preissue.likelihood || 0.5;
    const ttiDays = preissue.ttiDays || preissue.timeToBreachDays || 30;

    const sev = preissue.severity;
    let severity;
    if (sev === 'critical' || sev === 3) severity = 3;
    else if (sev === 'high' || sev === 2) severity = 2;
    else if (sev === 'medium' || sev === 1) severity = 1;
    else severity = 0;

    const irreversibility = preissue.irreversibility ?? 0.5;

    return { stake, probability, ttiDays, severity, irreversibility };
  }

  if (source.sourceType === 'GOAL') {
    const goal = context.goals?.find(g => g.id === source.goalId);
    if (!goal) return defaults;

    const weight = GOAL_TYPE_WEIGHTS[goal.type] || 50;
    const cur = goal.cur ?? goal.current ?? 0;
    const tgt = goal.tgt ?? goal.target ?? 100;
    const gap = tgt > 0 ? Math.max(0, tgt - cur) / tgt : 0.5;
    const severity = (goal.severity ?? (gap > 0.5 ? 2 : gap > 0.2 ? 1 : 0));

    // Stake derived from goal weight and gap
    const stake = weight * gap * 10000;
    const probability = Math.min(0.9, 0.4 + gap * 0.5);
    const ttiDays = goal.due ? Math.max(7, Math.round((new Date(goal.due) - Date.now()) / 86400000)) : 30;

    return { stake, probability, ttiDays, severity, irreversibility: 0.3 };
  }

  return defaults;
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
  
  // Map by source kind (unified for issue + preissue)
  const sourceKind = source.issueType || source.preIssueType;
  let affectedTypes = SOURCE_AFFECTS_GOALS[sourceKind] || [];
  
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
  
  // Unified path for ISSUE and PREISSUE — same formula, same signals
  if (source.sourceType === 'ISSUE' || source.sourceType === 'PREISSUE') {
    const signals = extractSignals(action, context);
    const normalizedStake = Math.min(0.40, 0.08 * Math.log10(1 + signals.stake / 50000));
    let lift = normalizedStake * (0.3 + signals.probability * 0.7);
    if (signals.severity >= 2) lift *= 1.15;
    if (signals.ttiDays <= 7) lift *= 1.1;
    return Math.min(0.40, Math.max(0.05, lift));
  }

  switch (source.sourceType) {
    case 'GOAL': {
      // Goal-sourced actions: lift proportional to goal gap × resolution effectiveness
      const goalForLift = (context.goals || []).find(g => g.id === source.goalId);
      if (goalForLift) {
        const cur = goalForLift.cur ?? goalForLift.current ?? 0;
        const tgt = goalForLift.tgt ?? goalForLift.target ?? 100;
        const gapRatio = tgt > 0 ? Math.max(0, tgt - cur) / tgt : 0.5;
        const resolution = getAnyResolution(action.resolutionId);
        const effectiveness = resolution?.effectiveness ?? 0.5;
        return Math.min(0.35, Math.max(0.08, gapRatio * effectiveness * 0.4));
      }
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
 * Compute goal-centric upside using goalDamage entries + resolutionEffectiveness.
 *
 * Formula: upside = Σ(goalWeight × effectiveness × damage)
 * where damage comes from goalDamage derivation and effectiveness from resolution template.
 *
 * Falls back to heuristic probability lift when goalDamage is unavailable.
 */
function computeGoalDamageUpside(action, context) {
  const goalDamage = context.goalDamage || [];
  const source = action.sources?.[0];
  if (!source || goalDamage.length === 0) return null;

  // Get resolution effectiveness
  const resolution = getAnyResolution(action.resolutionId);
  const effectiveness = resolution?.effectiveness ?? 0.5;

  // Find goalDamage entries matching this action's source issue/preissue
  const issueId = source.issueId || source.preIssueId;
  if (!issueId) return null;

  const relevantDamage = goalDamage.filter(d => d.issueId === issueId);
  if (relevantDamage.length === 0) return null;

  let totalUpside = 0;
  const impacts = [];

  for (const dmg of relevantDamage) {
    const goal = (context.goals || []).find(g => g.id === dmg.goalId);
    const goalWeight = (goal?.weight || dmg.goalWeight || 50) / 100;
    const deltaProbability = effectiveness * dmg.damage;
    const impact = goalWeight * deltaProbability;
    totalUpside += impact;

    impacts.push({
      goalId: dmg.goalId,
      goalName: goal?.name || dmg.goalType || 'Unknown',
      goalType: goal?.type || dmg.goalType,
      damage: dmg.damage,
      effectiveness,
      deltaProbability: Math.round(deltaProbability * 100),
      weight: Math.round(goalWeight * 100),
      impact: Math.round(impact * 100)
    });
  }

  impacts.sort((a, b) => b.impact - a.impact);
  const value = Math.min(100, Math.round(totalUpside * 100));

  return { value, impacts };
}

/**
 * UNIFIED UPSIDE: upside = Σ (goalWeight × Δprobability)
 *
 * For ISSUE/PREISSUE: Use goalDamage × effectiveness when available,
 * stake-based calculation for differentiation, goal context for explanation.
 */
function deriveUpsideMagnitude(action, context) {
  const affectedGoals = getAffectedGoals(action, context);
  const source = action.sources?.[0];

  // Try goalDamage-based upside first (new goal-centric formula)
  const goalDamageUpside = computeGoalDamageUpside(action, context);

  // Calculate goal impacts for ALL actions (used for explanation and future ranking)
  const goalImpacts = [];
  let goalBasedUpside = 0;

  for (const goal of affectedGoals) {
    const weight = getGoalWeight(goal, context.company);
    const lift = probabilityLift(action, goal, context);
    const impact = weight * lift;

    // Calculate gap (delta to goal)
    const gap = goal.tgt && goal.cur !== undefined ? goal.tgt - goal.cur : 0;
    const gapPct = goal.tgt ? Math.round((gap / goal.tgt) * 100) : 0;

    goalBasedUpside += impact;
    goalImpacts.push({
      goalId: goal.id,
      goalName: goal.name || goal.type,
      goalType: goal.type,
      current: goal.cur,
      target: goal.tgt,
      gap: gap,
      gapPct: gapPct,
      lift: Math.round(lift * 100),
      weight: weight,
      impact: Math.round(impact)
    });
  }

  // Sort by impact
  goalImpacts.sort((a, b) => b.impact - a.impact);

  // Merge goalDamage impacts into goalImpacts for richer explanation
  const mergedImpacts = goalDamageUpside?.impacts?.length > 0
    ? goalDamageUpside.impacts
    : goalImpacts;

  // GOAL source: upside = goalWeight × gap × effectiveness
  if (source?.sourceType === 'GOAL') {
    const goal = (context.goals || []).find(g => g.id === source.goalId);
    const resolution = getAnyResolution(action.resolutionId);
    const effectiveness = resolution?.effectiveness ?? 0.5;

    if (goal) {
      const weight = getGoalWeight(goal, context.company);
      const cur = goal.cur ?? goal.current ?? 0;
      const tgt = goal.tgt ?? goal.target ?? 100;
      const gap = tgt > 0 ? Math.max(0, tgt - cur) / tgt : 0.5;
      const severity = goal.severity ?? (gap > 0.5 ? 2 : gap > 0.2 ? 1 : 0);

      const severityFloor = [25, 30, 40, 55][severity] || 25;
      const ceiling = [55, 65, 75, 85][severity] || 55;
      let value = Math.round(weight * gap * effectiveness);
      value = Math.min(ceiling, Math.max(severityFloor, value));

      // Primary category bonus
      if (action.isPrimary) value = Math.min(ceiling, value + 5);

      const gapPct = Math.round(gap * 100);
      const explains = [
        `Goal "${goal.name}" (gap: ${gapPct}%, weight: ${weight}, effectiveness: ${Math.round(effectiveness * 100)}%)`,
      ];

      return {
        value,
        explain: explains,
        impacts: [{
          goalId: goal.id,
          goalName: goal.name || goal.type,
          goalType: goal.type,
          gap: Math.round(gap * 100),
          gapPct,
          weight,
          lift: Math.round(gap * effectiveness * 100),
          impact: value,
        }],
      };
    }

    return {
      value: Math.round(30 + effectiveness * 20),
      explain: ['Goal-driven action'],
      impacts: mergedImpacts,
    };
  }

  // UNIFIED: One formula for ISSUE and PREISSUE — same signals, same math
  if (source?.sourceType === 'ISSUE' || source?.sourceType === 'PREISSUE') {
    const signals = extractSignals(action, context);

    const normalizedStake = Math.min(85, 20 + 18 * Math.log10(1 + signals.stake / 50000));
    let value = normalizedStake * (0.5 + signals.probability * 0.5);

    // Severity floors and ceilings (critical problems score higher)
    const severityFloor = [30, 35, 45, 55][signals.severity] || 30;
    const ceiling = [65, 75, 85, 95][signals.severity] || 65;
    value = Math.min(ceiling, Math.max(severityFloor, Math.round(value)));

    // Blend goalDamage when available
    if (goalDamageUpside && goalDamageUpside.value > 0) {
      value = Math.min(ceiling, Math.round(value * 0.6 + goalDamageUpside.value * 0.4));
      value = Math.max(severityFloor, value);
    }

    const stakeK = signals.stake >= 1000000 ? `$${(signals.stake/1000000).toFixed(1)}M` : `$${Math.round(signals.stake/1000)}K`;
    const sourceKind = source.issueType || source.preIssueType || 'Issue';
    const explains = [`${sourceKind} (${stakeK} at stake, P=${Math.round(signals.probability*100)}%)`];
    if (mergedImpacts.length > 0) {
      explains.push(`Affects ${mergedImpacts.length} goal${mergedImpacts.length > 1 ? 's' : ''}: ${mergedImpacts.map(g => g.goalName).join(', ')}`);
    }

    return { value, explain: explains, impacts: mergedImpacts };
  }

  // Fallback for unlinked actions
  if (affectedGoals.length === 0) {
    const resolution = getAnyResolution(action.resolutionId);
    const baseImpact = resolution?.effectiveness ?? resolution?.defaultImpact ?? 0.5;
    return {
      value: Math.round(25 + baseImpact * 25),
      explain: ['General improvement (no linked goals)'],
      impacts: []
    };
  }

  // Pure goal-based calculation (for non-issue/preissue actions)
  // Use goalDamage upside if available, otherwise heuristic
  let finalUpside = goalDamageUpside?.value > 0 ? goalDamageUpside.value : goalBasedUpside;

  if (action.timing && TIMING_UPSIDE_MULTIPLIER[action.timing]) {
    finalUpside *= TIMING_UPSIDE_MULTIPLIER[action.timing];
  }

  const value = Math.min(100, Math.max(10, Math.round(finalUpside)));
  const top = mergedImpacts[0];
  const explain = top
    ? [`+${top.lift || top.deltaProbability || 0}% on ${top.goalName} (${top.gapPct !== undefined ? `gap: ${top.gapPct}% to target` : `damage: ${Math.round((top.damage || 0) * 100)}%`})`]
    : ['Marginal goal improvement'];

  return { value, explain, impacts: mergedImpacts };
}

// =============================================================================
// OTHER IMPACT DIMENSIONS — Context-Sensitive Derivation
// =============================================================================

/**
 * Probability of Success: Will the action work if executed?
 *
 * Uses resolution effectiveness as base, then adjusts for:
 * - Preissue severity (high severity = harder problem = lower success)
 * - Issue severity (critical issues = well-understood problems = higher success)
 * - Company stage (earlier = more uncertain)
 * - Goal trajectory (actions on off-track goals face headwinds)
 */
function deriveProbabilityOfSuccess(action, context) {
  const resolution = getAnyResolution(action.resolutionId);
  const source = action.sources?.[0];

  // Base: use resolution effectiveness (ranges 0.2–1.0 across templates)
  let value = resolution?.effectiveness ?? 0.6;
  let explain = 'Based on resolution type effectiveness';

  // Unified confidence for ISSUE and PREISSUE (executionProbability = 1.0, absorbed here)
  if (source?.sourceType === 'ISSUE' || source?.sourceType === 'PREISSUE') {
    const signals = extractSignals(action, context);
    // Scale effectiveness by problem clarity: clearer signal → more targeted fix
    value = value * (0.7 + 0.3 * signals.probability);
    // Urgency boosts confidence (imminent → focused → effective)
    if (signals.ttiDays <= 7) value += 0.1;
    else if (signals.ttiDays <= 14) value += 0.05;
    explain = `Confidence ${(value * 100).toFixed(0)}% (clarity P=${Math.round(signals.probability * 100)}%)`;
  }

  // Stage modifier: earlier stages are more uncertain
  const stagePenalty = {
    'Pre-seed': -0.08,
    'Seed': -0.04,
    'Series A': 0,
    'Series B': 0.03,
    'Series C': 0.05,
  };
  value += stagePenalty[context.company?.stage] ?? 0;

  value = Math.max(0.25, Math.min(0.90, Math.round(value * 100) / 100));
  return { value, explain };
}

/**
 * Execution Probability: Will the founder actually do it?
 *
 * Uses resolution effort as a proxy for execution friction, then adjusts for:
 * - Number of steps (more steps = less likely to complete)
 * - Company stage (later stage = better execution capacity)
 * - Preissue imminence (imminent threats drive execution)
 * - Entity type (company actions > relationship actions for founder motivation)
 */
function deriveExecutionProbability(action, context) {
  const resolution = getAnyResolution(action.resolutionId);
  const source = action.sources?.[0];

  // Base: derive from resolution effort (lower effort = higher execution probability)
  // defaultEffort ranges: 0.25 (trivial) to 30 (major project)
  const effort = resolution?.defaultEffort ?? 7;
  let value;
  if (effort <= 1) value = 0.75;
  else if (effort <= 3) value = 0.65;
  else if (effort <= 7) value = 0.55;
  else if (effort <= 14) value = 0.45;
  else value = 0.35;

  let explain = `Effort-based: ${effort <= 3 ? 'low' : effort <= 14 ? 'moderate' : 'high'} effort required`;

  // Step count friction
  const stepCount = action.steps?.length || resolution?.actionSteps?.length || 4;
  if (stepCount <= 2) value += 0.05;
  else if (stepCount >= 5) value -= 0.03;

  // Stage: later-stage companies have better execution capacity
  const stageBoost = {
    'Pre-seed': -0.05,
    'Seed': -0.02,
    'Series A': 0,
    'Series B': 0.04,
    'Series C': 0.06,
  };
  value += stageBoost[context.company?.stage] ?? 0;

  // Unified: execution probability absorbed into confidence for issue/preissue/goal
  if (source?.sourceType === 'ISSUE' || source?.sourceType === 'PREISSUE' || source?.sourceType === 'GOAL') {
    return { value: 1.0, explain: 'Absorbed into confidence' };
  }

  // Entity type
  const entityType = action.entityRef?.type;
  if (entityType === 'relationship') value -= 0.05;
  else if (entityType === 'firm') value -= 0.03;

  // Timing adjustment for introductions
  if (action.timing && TIMING_EXEC_PROBABILITY_ADJUST[action.timing]) {
    value += TIMING_EXEC_PROBABILITY_ADJUST[action.timing];
  }

  value = Math.max(0.1, Math.min(0.9, Math.round(value * 100) / 100));
  return { value, explain };
}

/**
 * Downside Magnitude: What's the cost if this action backfires?
 *
 * Uses preissue irreversibility and cost-of-delay for rich variance:
 * - High irreversibility + wrong action = larger downside
 * - Issue severity maps to opportunity cost of wrong fix
 * - Effort wasted on failed actions scales with resolution effort
 * - Entity type affects blast radius
 */
function deriveDownsideMagnitude(action, context) {
  const source = action.sources?.[0];
  const resolution = getAnyResolution(action.resolutionId);

  let value = 5;
  let explain = 'Low downside risk';

  // Unified downside for ISSUE and PREISSUE — irreversibility drives downside
  if (source?.sourceType === 'ISSUE' || source?.sourceType === 'PREISSUE') {
    const signals = extractSignals(action, context);
    value = Math.round(5 + signals.irreversibility * 15);
    explain = signals.irreversibility >= 0.7 ? 'High irreversibility' :
              signals.irreversibility >= 0.4 ? 'Moderate downside' : 'Low downside risk';
    return { value, explain };
  }

  // Non-issue path: effort wasted + entity blast radius
  const effort = resolution?.defaultEffort ?? 7;
  if (effort >= 21) value += 5;
  else if (effort >= 14) value += 3;

  const entityType = action.entityRef?.type;
  if (entityType === 'company') value += 2;
  else if (entityType === 'relationship') value -= 2;

  value = Math.max(2, Math.min(40, value));
  return { value, explain };
}

/**
 * Time to Impact: How many days until results appear?
 *
 * Uses resolution defaultEffort as base proxy, then adjusts for:
 * - Preissue escalation window (imminent = faster needed, faster seen)
 * - Issue severity (critical issues get fast-tracked)
 * - Company stage (earlier stage = things move faster)
 */
function deriveTimeToImpact(action, context) {
  const resolution = getAnyResolution(action.resolutionId);
  const source = action.sources?.[0];

  // Base: resolution defaultEffort is days of work, impact lags by ~1.5x
  const effort = resolution?.defaultEffort ?? 7;
  let value = Math.round(effort * 1.5);
  let explain = `~${value} days based on resolution scope`;

  if (value < 1) value = 1;
  if (value > 60) value = 60;

  // Unified TTI from signals — same formula for ISSUE and PREISSUE
  if (source?.sourceType === 'ISSUE' || source?.sourceType === 'PREISSUE') {
    const signals = extractSignals(action, context);
    value = Math.max(1, Math.min(60, Math.round(signals.ttiDays * 0.5)));
    explain = `${signals.ttiDays}d window → ${value}d to impact`;
  }

  // Stage: earlier-stage companies move faster
  const stageScale = {
    'Pre-seed': 0.7,
    'Seed': 0.8,
    'Series A': 1.0,
    'Series B': 1.1,
    'Series C': 1.2,
  };
  value = Math.round(value * (stageScale[context.company?.stage] ?? 1.0));

  value = Math.max(1, Math.min(60, value));
  return { value, explain };
}

/**
 * Effort Cost: How much work does this action require? (0-100)
 *
 * Uses resolution defaultEffort as base, then adjusts for:
 * - Step count (more steps = more coordination overhead)
 * - Company stage (later = more process overhead)
 * - Entity type (cross-entity actions require more coordination)
 * - Preissue complexity (high irreversibility = careful execution)
 */
function deriveEffortCost(action, context) {
  const resolution = getAnyResolution(action.resolutionId);
  const source = action.sources?.[0];

  // Base: map resolution defaultEffort (days) to 0-100 scale
  const effort = resolution?.defaultEffort ?? 7;
  let value = Math.round(10 + Math.min(effort, 30) * 2);
  let explain = `${effort <= 2 ? 'Light' : effort <= 7 ? 'Moderate' : effort <= 14 ? 'Significant' : 'Major'} effort`;

  // Step count overhead
  const stepCount = action.steps?.length || resolution?.actionSteps?.length || 4;
  if (stepCount <= 2) value -= 5;
  else if (stepCount === 3) value -= 2;
  else if (stepCount >= 7) value += 8;
  else if (stepCount >= 5) value += 3;

  // Stage overhead
  const stageOverhead = {
    'Pre-seed': -5,
    'Seed': -2,
    'Series A': 0,
    'Series B': 3,
    'Series C': 5,
  };
  value += stageOverhead[context.company?.stage] ?? 0;

  // Entity type
  const entityType = action.entityRef?.type;
  if (entityType === 'round') value += 5;
  else if (entityType === 'deal') value += 3;
  else if (entityType === 'relationship') value -= 3;

  // Unified effort adjustment for ISSUE and PREISSUE
  if (source?.sourceType === 'ISSUE' || source?.sourceType === 'PREISSUE') {
    const signals = extractSignals(action, context);
    // High irreversibility = careful execution needed
    if (signals.irreversibility >= 0.8) {
      value += 5;
      explain += ' (careful execution needed)';
    }
    // High severity = extra coordination
    if (signals.severity >= 3) value += 8;
    else if (signals.severity >= 2) value += 3;
  }

  value = Math.max(5, Math.min(85, value));
  return { value, explain };
}

/**
 * Second-Order Leverage: Does this action unlock downstream value?
 *
 * Uses ripple effects for issues, preissue expected cost and structural type:
 * - Issues with high ripple scores affect multiple downstream concerns
 * - Actions affecting multiple goals have inherent leverage
 * - Preissues with high expected future cost have leverage
 * - Runway/fundraise actions have structural leverage
 */
function deriveSecondOrderLeverage(action, context) {
  const source = action.sources?.[0];
  let value = 10;
  let explain = 'Limited second-order effects';

  // Unified leverage for ISSUE and PREISSUE — stake-based + ripple
  if (source?.sourceType === 'ISSUE' || source?.sourceType === 'PREISSUE') {
    const signals = extractSignals(action, context);
    // Continuous log-scaled leverage from stake
    value = Math.round(Math.min(65, 15 + 15 * Math.log10(1 + signals.stake / 50000)));
    const stakeK = signals.stake >= 1000000 ? `$${(signals.stake/1000000).toFixed(1)}M` : `$${Math.round(signals.stake/1000)}K`;
    explain = `${stakeK} at risk`;

    // Ripple boost if available
    const companyId = action.entityRef?.id;
    const rippleData = companyId ? context.rippleByCompany?.[companyId] : null;
    if (rippleData?.rippleScore > 0) {
      const rippleLeverage = Math.round(10 + rippleData.rippleScore * 70);
      if (rippleLeverage > value) {
        value = rippleLeverage;
        explain = `Ripple score ${rippleData.rippleScore.toFixed(2)} — downstream effects`;
      }
    }

    // Structural leverage for runway/pipeline types
    const sourceKind = source.issueType || source.preIssueType;
    if (sourceKind === 'RUNWAY_CRITICAL' || sourceKind === 'RUNWAY_WARNING') {
      value = Math.max(value, 60);
      explain = 'Runway underpins all operations';
    } else if (sourceKind === 'NO_PIPELINE' || sourceKind === 'PIPELINE_GAP') {
      value = Math.max(value, 45);
      explain = 'Pipeline feeds fundraise goal';
    }
  }

  // Multi-goal leverage
  const affectedGoals = getAffectedGoals(action, context);
  if (affectedGoals.length > 1) {
    const multiGoalValue = 25 + affectedGoals.length * 8;
    if (multiGoalValue > value) {
      value = multiGoalValue;
      explain = `Affects ${affectedGoals.length} goals simultaneously`;
    }
  }

  // Goal damage leverage
  const goalDamage = context.goalDamage || [];
  const issueId = source?.issueId || source?.preIssueId;
  if (issueId) {
    const relevant = goalDamage.filter(d => d.issueId === issueId);
    if (relevant.length > 1) {
      const damageValue = 20 + relevant.length * 10;
      if (damageValue > value) {
        value = damageValue;
        explain = `Addresses damage across ${relevant.length} goals`;
      }
    }
  }

  value = Math.max(5, Math.min(80, value));
  return { value, explain };
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

  // Proactivity bonus: reward early detection / seeing around corners
  // More time to act + higher probability = more value from early warning
  let proactivityBonus = 0;
  const source = action.sources?.[0];
  if (source?.sourceType === 'ISSUE' || source?.sourceType === 'PREISSUE') {
    const signals = extractSignals(action, context);
    proactivityBonus = signals.probability * Math.min(15, 5 * Math.log2(1 + signals.ttiDays / 7));
  }

  // Build explanation array (upside.explain may be array or string)
  const upsideExplains = Array.isArray(upside.explain) ? upside.explain : [upside.explain];
  const explain = [
    ...upsideExplains,
    prob.explain !== 'Based on resolution type effectiveness' ? prob.explain : null,
    leverage.value > 25 ? leverage.explain : null,
    proactivityBonus > 3 ? `Proactivity bonus +${proactivityBonus.toFixed(1)}` : null,
  ].filter(Boolean).slice(0, 4);

  const impact = {
    upsideMagnitude: upside.value,
    probabilityOfSuccess: prob.value,
    executionProbability: execProb.value,
    downsideMagnitude: downside.value,
    timeToImpactDays: time.value,
    effortCost: effort.value,
    secondOrderLeverage: leverage.value,
    proactivityBonus,
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
