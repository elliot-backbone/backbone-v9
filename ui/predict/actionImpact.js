/**
 * actionImpact.js - Impact Model Attachment (Phase 4.0)
 * 
 * Attaches explainable impact model to each action.
 * 
 * Impact dimensions (canonical):
 * - upsideMagnitude (0-100)
 * - probabilityOfSuccess (0-1) - Will it work if executed?
 * - executionProbability (0-1) - Will founder actually do it? (PF1)
 * - downsideMagnitude (0-100)
 * - timeToImpactDays (>=0)
 * - effortCost (0-100)
 * - secondOrderLeverage (0-100)
 * 
 * PF4: INTRODUCTION actions use timing to adjust impact model
 * 
 * @module actionImpact
 */

import { getAnyResolution } from './actionCandidates.js';
import { calculateIssueRipple } from './ripple.js';

// PF4: Timing multipliers (conservative by design)
const TIMING_UPSIDE_MULTIPLIER = {
  'NOW': 1.2,   // Boost upside for NOW
  'SOON': 1.0,  // Neutral
  'LATER': 0.7, // Penalize - we're uncertain
  'NEVER': 0.0  // Should not reach here
};

const TIMING_EXEC_PROBABILITY_ADJUST = {
  'NOW': 0.1,   // Urgent = more likely to act
  'SOON': 0.0,  // Neutral
  'LATER': -0.15, // Lower urgency = less likely
  'NEVER': -1.0
};

// Entity type weights for preissue impact calculation
// Company preissues are most important, peripheral entities less so
const ENTITY_WEIGHTS = {
  'company': 1.0,   // Primary focus
  'deal': 0.85,     // High impact - affects capital
  'round': 0.80,    // Important - fundraising context
  'firm': 0.65,     // Relationship maintenance
  'person': 0.55,   // Individual relationship
  'relationship': 0.50, // Connection maintenance
};

/**
 * Get entity weight for impact calculation
 */
function getEntityWeight(entityType) {
  return ENTITY_WEIGHTS[entityType] || 0.6;
}

// =============================================================================
// IMPACT DERIVATION RULES
// =============================================================================

/**
 * Derive upside magnitude from action source
 */
function deriveUpsideMagnitude(action, context) {
  const source = action.sources[0];
  const resolution = getAnyResolution(action.resolutionId);
  const baseImpact = resolution?.defaultImpact || 0.5;
  
  let value = baseImpact * 50;
  let explain = '';
  
  switch (source.sourceType) {
    case 'ISSUE': {
      const issue = context.issues?.find(i => i.issueId === source.issueId);
      if (issue?.severity === 'critical') {
        // Critical issues get high upside regardless of resolution
        value = Math.max(70, baseImpact * 85); // Min 70, max 85
        explain = `Critical issue resolution (${issue.issueType})`;
      } else if (issue?.severity === 'high') {
        value = Math.max(55, baseImpact * 70); // Min 55, max 70
        explain = `High-severity issue resolution`;
      } else {
        value = Math.max(40, baseImpact * 55); // Min 40, max 55
        explain = `Issue resolution (${source.issueType})`;
      }
      break;
    }
    
    case 'PREISSUE': {
      const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
      if (preissue) {
        // Entity type weighting - company preissues matter most
        const entityWeight = getEntityWeight(preissue.entityRef?.type || 'company');
        
        // Base value adjusted by severity and entity type
        const baseSeverity = preissue.severity === 'high' ? 55 : 40;
        value = baseSeverity * entityWeight;
        
        // Likelihood adjustment (reduced multiplier to prevent compression)
        value *= (0.6 + preissue.likelihood * 0.4); // Range: 0.6-1.0 instead of 0-1
        
        // Cross-entity multiplier - preissues affecting multiple entities get boost
        const affectedCount = preissue.affectedEntities?.length || 1;
        if (affectedCount > 1) {
          value *= 1 + (affectedCount - 1) * 0.1; // 10% boost per additional entity
        }
        
        // Cost-of-delay multiplier (capped to prevent runaway)
        const costMultiplier = preissue.costOfDelay?.costMultiplier || 1;
        if (costMultiplier > 1.5) {
          value *= Math.min(1.25, 1 + (costMultiplier - 1.5) / 4);
        }
        
        // CRITICAL: Cap PREISSUE upside at 65 - reactive issues should rank higher
        value = Math.min(65, value);
        
        const imminentTag = preissue.escalation?.isImminent ? ' [IMMINENT]' : '';
        const entityTag = preissue.entityRef?.type !== 'company' ? ` [${preissue.entityRef?.type}]` : '';
        explain = `Prevention of ${preissue.preIssueType}${entityTag}${imminentTag} (${(preissue.likelihood * 100).toFixed(0)}% likely)`;
      } else {
        value = 35;
        explain = 'Preventative action';
      }
      break;
    }
    
    case 'GOAL': {
      const traj = context.goalTrajectories?.find(t => t.goalId === source.goalId);
      if (traj) {
        const achievability = traj.probabilityOfHit;
        const gap = 1 - achievability;
        value = 50 + (gap * 40);
        explain = `Goal advancement: ${traj.goalName} (${(achievability * 100).toFixed(0)}% current prob)`;
      } else {
        value = 50;
        explain = 'Goal advancement';
      }
      break;
    }
    
    case 'INTRODUCTION': {
      // PF4: Intro actions use timing-adjusted upside
      const timing = action.timing || 'LATER';
      const multiplier = TIMING_UPSIDE_MULTIPLIER[timing] || 0.7;
      const optionality = action.optionalityGain || 30;
      const relevance = action.relevanceScore || 50;
      
      // Base upside from optionality and relevance
      value = ((optionality * 0.6) + (relevance * 0.4)) * multiplier;
      
      // Timing affects explanation
      if (timing === 'NOW') {
        explain = `High-value intro (timing: NOW)`;
      } else if (timing === 'SOON') {
        explain = `Network opportunity (timing: SOON)`;
      } else {
        explain = `Potential intro (timing: ${timing} - wait for better signal)`;
      }
      break;
    }
    
    default:
      value = 30;
      explain = 'Manual action';
  }
  
  return { value: Math.round(value), explain };
}

/**
 * Derive probability of success (will action work IF executed?)
 */
function deriveProbabilityOfSuccess(action, context) {
  const resolution = getAnyResolution(action.resolutionId);
  const source = action.sources[0];
  
  const effort = resolution?.defaultEffort || 7;
  let baseProb = effort <= 1 ? 0.9 : effort <= 7 ? 0.7 : effort <= 14 ? 0.5 : 0.4;
  let explain = '';
  
  switch (source.sourceType) {
    case 'ISSUE': {
      const issue = context.issues?.find(i => i.issueId === source.issueId);
      if (issue?.issueType?.startsWith('DATA_')) {
        baseProb = Math.min(1, baseProb + 0.2);
        explain = 'Data fix - high success probability';
      } else if (issue?.issueType?.includes('CRITICAL')) {
        baseProb = Math.max(0.3, baseProb - 0.1);
        explain = 'Critical issue - complex resolution';
      } else {
        explain = `Standard resolution (${effort}d effort)`;
      }
      break;
    }
    
    case 'PREISSUE': {
      const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
      if (preissue && preissue.timeToBreachDays > 30) {
        baseProb = Math.min(1, baseProb + 0.15);
        explain = 'Early intervention - good odds';
      } else {
        explain = 'Preventative action';
      }
      break;
    }
    
    case 'GOAL': {
      const traj = context.goalTrajectories?.find(t => t.goalId === source.goalId);
      if (traj) {
        baseProb = 0.5 + (traj.confidence * 0.3);
        explain = `Goal confidence: ${(traj.confidence * 100).toFixed(0)}%`;
      } else {
        explain = 'Goal action';
      }
      break;
    }
    
    case 'INTRODUCTION': {
      // PF4: Use intro's computed probability
      baseProb = action.probability || 0.4;
      const confidence = action.timingConfidence || 0.5;
      explain = `Intro success: ${(baseProb * 100).toFixed(0)}% (confidence: ${(confidence * 100).toFixed(0)}%)`;
      break;
    }
    
    default:
      explain = 'Standard probability';
  }
  
  return { value: Math.round(baseProb * 100) / 100, explain };
}

/**
 * Derive execution probability (will founder actually do it?) - PF1
 */
function deriveExecutionProbability(action, context) {
  const company = context.company;
  const resolution = getAnyResolution(action.resolutionId);
  const source = action.sources[0];
  
  let baseExec = 0.7;
  let explain = '';
  const factors = [];
  
  // Factor 1: Goal velocity
  const trajectories = context.goalTrajectories || [];
  if (trajectories.length > 0) {
    const avgProb = trajectories.reduce((sum, t) => sum + (t.probabilityOfHit || 0.5), 0) / trajectories.length;
    if (avgProb >= 0.7) {
      baseExec = Math.min(1, baseExec + 0.15);
      factors.push('Strong execution history');
    } else if (avgProb < 0.4) {
      baseExec = Math.max(0.3, baseExec - 0.2);
      factors.push('Weak execution history');
    }
  }
  
  // Factor 2: Action complexity
  const steps = action.steps?.length || 0;
  const effort = resolution?.defaultEffort || 7;
  if (steps > 5 || effort > 14) {
    baseExec = Math.max(0.3, baseExec - 0.15);
    factors.push('High complexity');
  } else if (steps <= 2 && effort <= 3) {
    baseExec = Math.min(1, baseExec + 0.1);
    factors.push('Low complexity');
  }
  
  // Factor 3: Runway pressure
  if (company) {
    const runway = company.cash && company.burn ? company.cash / company.burn : null;
    if (runway !== null && runway < 6) {
      if (source.sourceType !== 'ISSUE' || !context.issues?.find(i => i.issueId === source.issueId)?.severity === 'critical') {
        baseExec = Math.max(0.3, baseExec - 0.1);
        factors.push('Bandwidth constrained (low runway)');
      }
    }
  }
  
  // Factor 4: Source type affects execution
  switch (source.sourceType) {
    case 'ISSUE': {
      const issue = context.issues?.find(i => i.issueId === source.issueId);
      if (issue?.severity === 'critical') {
        baseExec = Math.min(1, baseExec + 0.1);
        factors.push('Critical - high urgency');
      }
      break;
    }
    case 'PREISSUE': {
      // PF2: Imminent pre-issues have higher execution probability
      const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
      if (preissue?.escalation?.isImminent) {
        baseExec = Math.min(1, baseExec + 0.1);
        factors.push('Imminent escalation - urgent');
      } else {
        baseExec = Math.max(0.3, baseExec - 0.1);
        factors.push('Preventative (low urgency)');
      }
      break;
    }
    case 'GOAL': {
      const traj = context.goalTrajectories?.find(t => t.goalId === source.goalId);
      if (traj?.goalType === 'fundraise' && company?.raising) {
        baseExec = Math.min(1, baseExec + 0.1);
        factors.push('Active fundraise focus');
      }
      break;
    }
    case 'INTRODUCTION': {
      // PF4: Timing directly affects execution probability
      const timing = action.timing || 'LATER';
      const adjust = TIMING_EXEC_PROBABILITY_ADJUST[timing] || -0.15;
      baseExec = Math.max(0.2, Math.min(1, baseExec + adjust));
      
      if (timing === 'NOW') {
        factors.push('Timing: NOW - high urgency');
      } else if (timing === 'SOON') {
        factors.push('Timing: SOON');
      } else {
        factors.push(`Timing: ${timing} - lower urgency`);
      }
      break;
    }
  }
  
  if (factors.length > 0) {
    explain = factors.slice(0, 2).join('; ');
  } else {
    explain = 'Standard execution probability';
  }
  
  return { value: Math.round(baseExec * 100) / 100, explain };
}

/**
 * Derive downside magnitude (failure cost)
 */
function deriveDownsideMagnitude(action, context) {
  const source = action.sources[0];
  let value = 10;
  let explain = '';
  
  switch (source.sourceType) {
    case 'ISSUE': {
      const resolution = getAnyResolution(action.resolutionId);
      const effort = resolution?.defaultEffort || 7;
      value = Math.min(50, effort * 2);
      explain = `Effort wasted if unsuccessful (${effort}d)`;
      break;
    }
    
    case 'PREISSUE': {
      value = 15;
      explain = 'Low downside - preventative action';
      break;
    }
    
    case 'GOAL': {
      value = 20;
      explain = 'Opportunity cost if goal push fails';
      break;
    }
    
    case 'INTRODUCTION': {
      // PF4: Trust risk IS the downside for intros
      const trustRiskScore = action.trustRisk?.trustRiskScore || 30;
      value = Math.round(trustRiskScore * 0.5); // Convert to 0-50 scale
      explain = `Trust risk: ${action.trustRisk?.trustRiskBand || 'moderate'}`;
      break;
    }
    
    default:
      value = 10;
      explain = 'Minimal downside';
  }
  
  return { value: Math.round(value), explain };
}

/**
 * Derive time to impact
 */
function deriveTimeToImpactDays(action, context) {
  const source = action.sources[0];
  
  if (source.sourceType === 'INTRODUCTION') {
    // PF4: Timing affects expected time to impact
    const timing = action.timing || 'LATER';
    const timingDays = {
      'NOW': 14,
      'SOON': 30,
      'LATER': 60,
      'NEVER': 180
    };
    const value = timingDays[timing] || 60;
    return { value, explain: `Intro timing: ${timing}` };
  }
  
  const resolution = getAnyResolution(action.resolutionId);
  const effort = resolution?.defaultEffort || 7;
  const value = Math.ceil(effort * 1.2);
  return { value, explain: `Based on ${effort}d effort estimate` };
}

/**
 * Derive effort cost
 */
function deriveEffortCost(action, context) {
  const source = action.sources[0];
  
  if (source.sourceType === 'INTRODUCTION') {
    // Intros are low effort (2-3 days typically)
    return { value: 10, explain: '2-3 days effort for intro' };
  }
  
  const resolution = getAnyResolution(action.resolutionId);
  const effort = resolution?.defaultEffort || 7;
  const value = Math.min(100, Math.round((effort / 30) * 100));
  return { value, explain: `${effort} days of effort` };
}

/**
 * Derive second order leverage (ripple upside)
 */
function deriveSecondOrderLeverage(action, context) {
  const source = action.sources[0];
  let value = 10;
  let explain = '';
  
  const companyId = action.entityRef.id;
  
  switch (source.sourceType) {
    case 'ISSUE': {
      const issue = context.issues?.find(i => i.issueId === source.issueId);
      if (issue) {
        const issueRipple = calculateIssueRipple(issue);
        value = Math.round(issueRipple.rippleScore * 80);
        explain = issueRipple.rippleExplain[0] || 'Removes downstream risk';
      }
      break;
    }
    
    case 'PREISSUE': {
      const preissue = context.preissues?.find(p => p.preIssueId === source.preIssueId);
      if (preissue) {
        value = Math.round(preissue.likelihood * 60);
        explain = `Prevents ${preissue.preIssueType} cascade`;
      }
      break;
    }
    
    case 'GOAL': {
      const traj = context.goalTrajectories?.find(t => t.goalId === source.goalId);
      if (traj?.goalType === 'fundraise') {
        value = 70;
        explain = 'Fundraise success enables growth';
      } else if (traj?.goalType === 'revenue') {
        value = 50;
        explain = 'Revenue growth compounds';
      } else {
        value = 30;
        explain = 'Goal achievement builds momentum';
      }
      break;
    }
    
    case 'INTRODUCTION': {
      // PF4: Optionality IS leverage for intros
      const optionality = action.optionalityGain || 20;
      value = Math.round(optionality);
      explain = `Network optionality: ${optionality}`;
      break;
    }
    
    default:
      explain = 'Limited second-order effects';
  }
  
  return { value: Math.round(value), explain };
}

// =============================================================================
// IMPACT MODEL ASSEMBLY
// =============================================================================

/**
 * Attach impact model to an action
 */
export function attachImpactModel(action, context) {
  const upside = deriveUpsideMagnitude(action, context);
  const prob = deriveProbabilityOfSuccess(action, context);
  const execProb = deriveExecutionProbability(action, context);
  const downside = deriveDownsideMagnitude(action, context);
  const time = deriveTimeToImpactDays(action, context);
  const effort = deriveEffortCost(action, context);
  const leverage = deriveSecondOrderLeverage(action, context);
  
  // Build explanation (2-6 items)
  const explain = [
    upside.explain,
    prob.explain,
    execProb.explain !== 'Standard execution probability' ? execProb.explain : null,
    leverage.value > 30 ? leverage.explain : null,
    downside.value > 30 ? downside.explain : null
  ].filter(Boolean).slice(0, 6);
  
  if (explain.length < 2) {
    explain.push(effort.explain);
  }
  
  // PF4: For INTRODUCTION actions, include timing rationale in explain
  if (action.type === 'INTRODUCTION' && action.timingRationale) {
    // Insert timing rationale as first explanation
    explain.unshift(`Timing: ${action.timing} - ${action.timingRationale[0]}`);
  }
  
  const impact = {
    upsideMagnitude: upside.value,
    probabilityOfSuccess: prob.value,
    executionProbability: execProb.value,
    downsideMagnitude: downside.value,
    timeToImpactDays: time.value,
    effortCost: effort.value,
    secondOrderLeverage: leverage.value,
    explain: explain.slice(0, 6) // Max 6
  };
  
  return { ...action, impact };
}

/**
 * Attach impact models to all actions for a company
 */
export function attachCompanyImpactModels(actions, context) {
  return actions.map(action => attachImpactModel(action, context));
}

/**
 * Attach impact models to all actions in portfolio
 */
export function attachPortfolioImpactModels({
  actionsByCompany,
  issuesByCompany,
  preissuesByCompany,
  goalTrajectoriesByCompany,
  rippleByCompany,
  companies
}) {
  const byCompany = {};
  const all = [];
  
  for (const company of companies) {
    const context = {
      issues: issuesByCompany[company.id] || [],
      preissues: preissuesByCompany[company.id] || [],
      goalTrajectories: goalTrajectoriesByCompany[company.id] || [],
      rippleByCompany,
      company
    };
    
    const actions = actionsByCompany[company.id] || [];
    const withImpact = attachCompanyImpactModels(actions, context);
    byCompany[company.id] = withImpact;
    all.push(...withImpact);
  }
  
  return { byCompany, all };
}

export default {
  attachImpactModel,
  attachCompanyImpactModels,
  attachPortfolioImpactModels
};
