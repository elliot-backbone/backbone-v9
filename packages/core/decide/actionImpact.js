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
import { calculateIssueRipple, calculateAggregateRipple } from '../predict/ripple.js';

// =============================================================================
// GOAL WEIGHTS BY TYPE
// =============================================================================

const GOAL_TYPE_WEIGHTS = {
  fundraise: 90,
  revenue: 85,
  round_completion: 85,
  deal_close: 80,
  operational: 70,
  hiring: 60,
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
 * Compute goal-centric upside using goalDamage entries + resolutionEffectiveness.
 */
function computeGoalDamageUpside(action, context) {
  const goalDamage = context.goalDamage || [];
  const source = action.sources?.[0];
  if (!source || goalDamage.length === 0) return null;

  const resolution = getAnyResolution(action.resolutionId);
  const effectiveness = resolution?.effectiveness ?? 0.5;

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
  return { value: Math.min(100, Math.round(totalUpside * 100)), impacts };
}

/**
 * UNIFIED UPSIDE: upside = Σ (goalWeight × Δprobability)
 * Uses goalDamage × effectiveness when available, heuristic lift otherwise.
 */
function deriveUpsideMagnitude(action, context) {
  const affectedGoals = getAffectedGoals(action, context);
  const source = action.sources?.[0];

  // Try goalDamage-based upside first
  const goalDamageResult = computeGoalDamageUpside(action, context);

  // Fallback for unlinked actions
  if (affectedGoals.length === 0 && !goalDamageResult) {
    const resolution = getAnyResolution(action.resolutionId);
    const baseImpact = resolution?.effectiveness ?? resolution?.defaultImpact ?? 0.5;
    return {
      value: Math.round(25 + baseImpact * 25),
      explain: 'General improvement (no linked goals)',
      impacts: []
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

  // Use goalDamage upside if available
  let finalUpside = goalDamageResult?.value > 0 ? goalDamageResult.value : totalUpside;

  // Apply timing multiplier for INTRODUCTION actions
  if (action.timing && TIMING_UPSIDE_MULTIPLIER[action.timing]) {
    finalUpside *= TIMING_UPSIDE_MULTIPLIER[action.timing];
  }

  const value = Math.min(100, Math.max(10, Math.round(finalUpside)));

  const mergedImpacts = goalDamageResult?.impacts?.length > 0
    ? goalDamageResult.impacts
    : impacts;

  // Build explanation from top impact
  const top = mergedImpacts.sort((a, b) => (b.impact || 0) - (a.impact || 0))[0];
  const explain = top
    ? `+${top.lift || top.deltaProbability || 0}% on ${top.goal || top.goalName} goal`
    : 'Marginal goal improvement';

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

  if (source?.sourceType === 'ISSUE') {
    const issue = context.issues?.find(i => i.issueId === source.issueId);
    const severity = issue?.severity ?? 1;
    // Critical issues are well-defined problems — targeted resolutions work better
    // Low-severity issues are vague — harder to know if action will help
    value += (severity - 1) * 0.05; // sev 3 → +0.10, sev 1 → 0, sev 0 → -0.05
    if (severity >= 3) explain = 'Well-defined critical problem — targeted fix';
    else if (severity <= 0) explain = 'Vague issue — uncertain if action addresses root cause';
  } else if (source?.sourceType === 'PREISSUE') {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    if (preissue) {
      // Preventative actions on high-probability preissues have clearer targets
      const likelihood = preissue.likelihood ?? preissue.probability ?? 0.5;
      // High likelihood means the problem is real → resolution more likely to help
      // Low likelihood means we might be solving a non-problem
      value += (likelihood - 0.5) * 0.15;
      if (preissue.severity === 'high') {
        value -= 0.05; // Harder problems are harder to solve
        explain = 'High-severity forecast — harder to prevent';
      } else {
        explain = `Prevention success scales with threat clarity (P=${(likelihood * 100).toFixed(0)}%)`;
      }
    }
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

  // Goal trajectory: action on a goal that's already way off-track is harder
  if (source?.goalId || source?.preIssueId) {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    const goalId = source.goalId || preissue?.goalId;
    if (goalId) {
      const traj = (context.goalTrajectories || []).find(t => t.goalId === goalId);
      if (traj && typeof traj.probabilityOfHit === 'number') {
        // Very off-track goals are harder to fix
        if (traj.probabilityOfHit < 0.2) {
          value -= 0.08;
          explain = 'Goal deeply off-track — low recovery probability';
        } else if (traj.probabilityOfHit < 0.4) {
          value -= 0.03;
        }
      }
    }
  }

  value = Math.max(0.15, Math.min(0.95, Math.round(value * 100) / 100));
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
  if (effort <= 1) value = 0.75;       // Trivial — will likely do it
  else if (effort <= 3) value = 0.65;   // Light — probably do it
  else if (effort <= 7) value = 0.55;   // Moderate — might do it
  else if (effort <= 14) value = 0.45;  // Significant — needs convincing
  else value = 0.35;                    // Major — founder pushback likely

  let explain = `Effort-based: ${effort <= 3 ? 'low' : effort <= 14 ? 'moderate' : 'high'} effort required`;

  // Step count friction: more steps = lower execution
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

  // Imminence drives execution: if escalation is imminent, founder will act
  if (source?.sourceType === 'PREISSUE') {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    if (preissue?.escalation?.isImminent) {
      value += 0.12;
      explain = 'Imminent escalation — urgency drives action';
    } else if (preissue?.costOfDelay?.costMultiplier > 2.0) {
      value += 0.06;
      explain = 'Rising cost-of-delay — increasing pressure to act';
    }
  }

  // Issue severity drives execution: critical issues get attention
  if (source?.sourceType === 'ISSUE') {
    const issue = context.issues?.find(i => i.issueId === source.issueId);
    if (issue?.severity >= 3) {
      value += 0.15;
      explain = 'Critical issue — demands immediate execution';
    } else if (issue?.severity >= 2) {
      value += 0.08;
      explain = 'High-severity issue — likely to be prioritized';
    }
  }

  // Entity type: company-level actions feel more natural to founders
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
 * - Entity type affects blast radius (company > deal > relationship)
 */
function deriveDownsideMagnitude(action, context) {
  const source = action.sources?.[0];
  const resolution = getAnyResolution(action.resolutionId);

  let value = 5; // Baseline: most actions have minimal downside
  let explain = 'Low downside risk';

  if (source?.sourceType === 'ISSUE') {
    const issue = context.issues?.find(i => i.issueId === source.issueId);
    const severity = issue?.severity ?? 1;
    // Higher severity issues: wrong action has higher opportunity cost
    // (you spent time on wrong fix while the real problem worsened)
    value = 5 + severity * 5; // sev 0→5, 1→10, 2→15, 3→20
    if (severity >= 3) explain = 'Critical issue — wrong action wastes precious time';
    else if (severity >= 2) explain = 'High severity — moderate opportunity cost if wrong';
    else explain = 'Low severity — minimal downside from wrong approach';
  } else if (source?.sourceType === 'PREISSUE') {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    if (preissue) {
      // Irreversibility: acting on irreversible situations incorrectly is costly
      const irr = preissue.irreversibility ?? 0.5;
      // Cost-of-delay multiplier: high cost = wrong action is more costly
      const costMult = preissue.costOfDelay?.costMultiplier ?? 1.0;
      value = Math.round(3 + irr * 15 + Math.min(costMult, 3) * 3);
      if (irr >= 0.8) explain = 'High irreversibility — wrong move is costly';
      else if (costMult >= 2.5) explain = 'Accelerating cost curve — errors amplified';
      else explain = `Moderate downside (irr=${(irr * 100).toFixed(0)}%)`;
    }
  }

  // Effort wasted: bigger effort = more resources lost if action fails
  const effort = resolution?.defaultEffort ?? 7;
  if (effort >= 21) value += 5;
  else if (effort >= 14) value += 3;

  // Entity type blast radius
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
 * - Issue severity (critical issues get fast-tracked → faster impact)
 * - Company stage (earlier stage = things move faster)
 * - Resolution type (some actions inherently take longer)
 */
function deriveTimeToImpact(action, context) {
  const resolution = getAnyResolution(action.resolutionId);
  const source = action.sources?.[0];

  // Base: resolution defaultEffort is days of work, impact lags by ~1.5x
  const effort = resolution?.defaultEffort ?? 7;
  let value = Math.round(effort * 1.5);
  let explain = `~${value} days based on resolution scope`;

  // Floor and ceiling
  if (value < 1) value = 1;
  if (value > 60) value = 60;

  if (source?.sourceType === 'PREISSUE') {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    if (preissue) {
      // Escalation window constrains time: if breach in 14 days, impact must come faster
      const tti = preissue.ttiDays ?? preissue.timeToBreachDays ?? 30;
      if (tti < value) {
        // Can't take longer than the breach window — urgency compresses timeline
        value = Math.max(1, Math.round(tti * 0.7));
        explain = `Compressed by ${tti}d breach window`;
      }
      // Imminent escalation = fast-track everything
      if (preissue.escalation?.isImminent) {
        value = Math.min(value, 7);
        explain = 'Imminent escalation — fast-tracked';
      }
    }
  }

  if (source?.sourceType === 'ISSUE') {
    const issue = context.issues?.find(i => i.issueId === source.issueId);
    if (issue?.severity >= 3) {
      // Critical issues get dropped-everything urgency
      value = Math.min(value, 7);
      explain = 'Critical issue — immediate action, fast results';
    } else if (issue?.severity >= 2) {
      value = Math.min(value, Math.round(value * 0.7));
      explain = 'High severity — accelerated timeline';
    }
  }

  // Stage: earlier-stage companies move faster (smaller teams, less process)
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
 * - Preissue complexity (multi-factor preissues need more work)
 */
function deriveEffortCost(action, context) {
  const resolution = getAnyResolution(action.resolutionId);
  const source = action.sources?.[0];

  // Base: map resolution defaultEffort (days) to 0-100 scale
  // 0.25 days → ~8, 1 day → ~15, 7 days → ~35, 14 days → ~50, 30 days → ~70
  const effort = resolution?.defaultEffort ?? 7;
  let value = Math.round(10 + Math.min(effort, 30) * 2);
  let explain = `${effort <= 2 ? 'Light' : effort <= 7 ? 'Moderate' : effort <= 14 ? 'Significant' : 'Major'} effort`;

  // Step count overhead: coordination cost scales with steps
  const stepCount = action.steps?.length || resolution?.actionSteps?.length || 4;
  if (stepCount <= 2) value -= 5;
  else if (stepCount === 3) value -= 2;
  else if (stepCount >= 5) value += 3;
  else if (stepCount >= 7) value += 8;

  // Stage overhead: later-stage companies have more process
  const stageOverhead = {
    'Pre-seed': -5,
    'Seed': -2,
    'Series A': 0,
    'Series B': 3,
    'Series C': 5,
  };
  value += stageOverhead[context.company?.stage] ?? 0;

  // Entity type: cross-entity actions require coordination
  const entityType = action.entityRef?.type;
  if (entityType === 'round') value += 5;    // Rounds involve multiple parties
  else if (entityType === 'deal') value += 3; // Deals need investor coordination
  else if (entityType === 'relationship') value -= 3; // Touchpoints are lightweight

  // Preissue complexity: multi-factor preissues need more investigation
  if (source?.sourceType === 'PREISSUE') {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    if (preissue) {
      // High irreversibility means you need to be more careful → more effort
      const irr = preissue.irreversibility ?? 0.5;
      if (irr >= 0.8) {
        value += 5;
        explain += ' (careful execution needed — high irreversibility)';
      }
    }
  }

  // Issue-sourced: critical issues are all-hands → extra coordination
  if (source?.sourceType === 'ISSUE') {
    const issue = context.issues?.find(i => i.issueId === source.issueId);
    if (issue?.severity >= 3) value += 8;
    else if (issue?.severity >= 2) value += 3;
  }

  value = Math.max(5, Math.min(85, value));
  return { value, explain };
}

/**
 * Second-Order Leverage: Does this action unlock downstream value?
 *
 * Uses ripple effects for issues, goal damage breadth for preissues:
 * - Issues with high ripple scores affect multiple downstream concerns
 * - Actions affecting multiple goals have inherent leverage
 * - Preissues with high expected future cost have leverage (preventing big losses)
 * - Runway/fundraise actions have structural leverage (enable everything else)
 */
function deriveSecondOrderLeverage(action, context) {
  const source = action.sources?.[0];
  let value = 10;
  let explain = 'Limited second-order effects';

  if (source?.sourceType === 'ISSUE') {
    // Use ripple score from company ripple data
    const companyId = action.entityRef?.id;
    const rippleData = companyId ? context.rippleByCompany?.[companyId] : null;
    if (rippleData?.rippleScore > 0) {
      // rippleScore is 0-1, map to 10-80 range
      const rippleLeverage = Math.round(10 + rippleData.rippleScore * 70);
      if (rippleLeverage > value) {
        value = rippleLeverage;
        explain = `Ripple score ${rippleData.rippleScore.toFixed(2)} — downstream effects on ${rippleData.rippleExplain?.length || 0} areas`;
      }
    }

    // Issue type structural leverage
    const issue = context.issues?.find(i => i.issueId === source.issueId);
    const issueType = issue?.issueType || source.issueType;
    if (issueType === 'RUNWAY_CRITICAL' || issueType === 'RUNWAY_WARNING') {
      value = Math.max(value, 60); // Runway enables everything
      explain = 'Runway underpins all operations';
    } else if (issueType === 'NO_PIPELINE' || issueType === 'PIPELINE_GAP') {
      value = Math.max(value, 45); // Pipeline enables fundraise
      explain = 'Pipeline feeds fundraise goal';
    }
  } else if (source?.sourceType === 'PREISSUE') {
    const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
    if (preissue) {
      // Expected future cost: preventing large costs has high leverage
      const efc = preissue.expectedFutureCost ?? 0;
      if (efc > 30) {
        value = Math.max(value, Math.min(65, Math.round(15 + efc * 0.8)));
        explain = `Prevents $${efc.toFixed(0)} expected future cost`;
      }

      // Structural preissue types
      const structuralTypes = {
        'RUNWAY_BREACH': 55,
        'RUNWAY_COMPRESSION_RISK': 50,
        'ROUND_STALL': 40,
        'LEAD_VACANCY': 40,
        'DEAL_MOMENTUM_LOSS': 35,
        'COMMITMENT_AT_RISK': 35,
        'CHAMPION_DEPARTURE': 30,
      };
      const structuralValue = structuralTypes[preissue.preIssueType];
      if (structuralValue && structuralValue > value) {
        value = structuralValue;
        explain = `${preissue.preIssueType} affects structural foundation`;
      }
    }
  }

  // Multi-goal leverage: actions affecting multiple goals unlock more value
  const affectedGoals = getAffectedGoals(action, context);
  if (affectedGoals.length > 1) {
    const multiGoalValue = 25 + affectedGoals.length * 8;
    if (multiGoalValue > value) {
      value = multiGoalValue;
      explain = `Affects ${affectedGoals.length} goals simultaneously`;
    }
  }

  // Goal damage leverage: if action addresses goal damage entries
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
  
  // Build explanation array (upside.explain may be array or string)
  const upsideExplains = Array.isArray(upside.explain) ? upside.explain : [upside.explain];
  const explain = [
    ...upsideExplains,
    prob.explain !== 'Based on resolution type effectiveness' ? prob.explain : null,
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
