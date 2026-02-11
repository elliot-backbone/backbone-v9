/**
 * preissues.js - Forecasted Issues (Phase 4.0 PF2)
 * 
 * Pre-issues are issues that will likely emerge if no action is taken.
 * They generate preventative actions.
 * 
 * PF2 Additions:
 * - Escalation window (T + delta): when pre-issue becomes real issue
 * - Cost-of-delay curve: how cost increases over time
 * - Imminent pre-issues convert to Actions
 * 
 * NO ALERTS, NO SEVERITY COLORS - just data for ranking.
 * Derived output - never persisted.
 * 
 * @module preissues
 */

import { deriveRunway } from '../derive/runway.js';
import { getStageParams } from '../raw/stageParams.js';

// =============================================================================
// PRE-ISSUE TYPES
// =============================================================================

export const PREISSUE_TYPES = {
  // Company preissues (existing)
  RUNWAY_BREACH: 'RUNWAY_BREACH',
  GOAL_MISS: 'GOAL_MISS',
  DEAL_STALL: 'DEAL_STALL',
  BURN_ACCELERATION: 'BURN_ACCELERATION',
  TEAM_CAPACITY: 'TEAM_CAPACITY',
  
  // NEW: Firm preissues
  FIRM_RELATIONSHIP_DECAY: 'FIRM_RELATIONSHIP_DECAY',
  PORTFOLIO_CONCENTRATION: 'PORTFOLIO_CONCENTRATION',
  
  // NEW: Deal preissues
  DEAL_MOMENTUM_LOSS: 'DEAL_MOMENTUM_LOSS',
  COMMITMENT_AT_RISK: 'COMMITMENT_AT_RISK',
  
  // NEW: Round preissues
  ROUND_STALL: 'ROUND_STALL',
  LEAD_VACANCY: 'LEAD_VACANCY',
  COVERAGE_GAP: 'COVERAGE_GAP',
  
  // NEW: Person preissues
  CHAMPION_DEPARTURE: 'CHAMPION_DEPARTURE',
  RELATIONSHIP_COOLING: 'RELATIONSHIP_COOLING',
  
  // NEW: Relationship preissues
  CONNECTION_DORMANT: 'CONNECTION_DORMANT',

  // A3: Meeting-derived preissues
  MEETING_RISK: 'MEETING_RISK',

  // Phase 5.3: Pre-issue heuristics (from design contract)
  RUNWAY_COMPRESSION_RISK: 'RUNWAY_COMPRESSION_RISK',
  GOAL_FEASIBILITY_RISK: 'GOAL_FEASIBILITY_RISK',
  DEPENDENCY_RISK: 'DEPENDENCY_RISK',
  TIMING_WINDOW_RISK: 'TIMING_WINDOW_RISK',
  DATA_BLINDSPOT_RISK: 'DATA_BLINDSPOT_RISK',
};

// =============================================================================
// IRREVERSIBILITY LOOKUP
// =============================================================================

/**
 * Get irreversibility score for a pre-issue.
 * Values per HEURISTICS_V1.md spec.
 *
 * @param {string} preIssueType
 * @param {Object} preissue - full preissue for dynamic calculation
 * @returns {number} 0–1
 */
function getIrreversibility(preIssueType, preissue = {}) {
  switch (preIssueType) {
    case PREISSUE_TYPES.RUNWAY_COMPRESSION_RISK: {
      // 0.8 if burn accelerating (burn growth > 0), else 0.6
      const burnGrowth = preissue.evidence?.burnGrowth ?? 0;
      return burnGrowth > 0 ? 0.8 : 0.6;
    }
    case PREISSUE_TYPES.GOAL_FEASIBILITY_RISK: {
      // clamp(1 - (daysLeft / 365), 0.2, 0.9)
      const daysLeft = preissue.ttiDays ?? preissue.timeToBreachDays ?? 180;
      return Math.max(0.2, Math.min(0.9, 1 - daysLeft / 365));
    }
    case PREISSUE_TYPES.DEPENDENCY_RISK: {
      // 0.7 if dependency is relationship/regulatory type, else 0.5
      const depType = preissue.evidence?.dependencyType;
      return (depType === 'relationship' || depType === 'regulatory') ? 0.7 : 0.5;
    }
    case PREISSUE_TYPES.TIMING_WINDOW_RISK:
      return 0.9; // fixed — windows rarely reopen
    case PREISSUE_TYPES.DATA_BLINDSPOT_RISK:
      return 0.6; // fixed
    case PREISSUE_TYPES.GOAL_MISS: {
      // clamp(1 - (daysLeft / 365), 0.2, 0.8)
      const daysLeft = preissue.ttiDays ?? preissue.timeToBreachDays ?? 180;
      return Math.max(0.2, Math.min(0.8, 1 - daysLeft / 365));
    }
    case PREISSUE_TYPES.DEAL_STALL:
      return 0.5;
    case PREISSUE_TYPES.ROUND_STALL:
      return 0.6;
    case PREISSUE_TYPES.LEAD_VACANCY:
      return 0.7;
    default:
      return 0.5;
  }
}

/**
 * Stamp spec-required fields onto a pre-issue:
 *  - irreversibility (float 0–1)
 *  - rationale (alias of explain[0])
 *  - linkedGoals (array wrapper around goalId)
 *  - supportingSignals (alias of evidence)
 *  - expectedFutureCost updated to P × I × impactMagnitude
 *
 * Existing fields (explain, goalId, evidence) are preserved.
 */
function stampSpecFields(preissue) {
  const I = getIrreversibility(preissue.preIssueType, preissue);
  const P = preissue.probability ?? preissue.likelihood ?? 0;

  // Determine impactMagnitude from existing expectedFutureCost or type-default
  const IMPACT_MAGNITUDE_BY_TYPE = {
    [PREISSUE_TYPES.RUNWAY_COMPRESSION_RISK]: 80,
    [PREISSUE_TYPES.GOAL_FEASIBILITY_RISK]: 60,
    [PREISSUE_TYPES.DEPENDENCY_RISK]: 50,
    [PREISSUE_TYPES.TIMING_WINDOW_RISK]: 70,
    [PREISSUE_TYPES.DATA_BLINDSPOT_RISK]: 40,
    [PREISSUE_TYPES.RUNWAY_BREACH]: 80,
    [PREISSUE_TYPES.GOAL_MISS]: 60,
    [PREISSUE_TYPES.DEAL_STALL]: 50,
    [PREISSUE_TYPES.BURN_ACCELERATION]: 70,
    [PREISSUE_TYPES.TEAM_CAPACITY]: 40,
    [PREISSUE_TYPES.FIRM_RELATIONSHIP_DECAY]: 30,
    [PREISSUE_TYPES.PORTFOLIO_CONCENTRATION]: 35,
    [PREISSUE_TYPES.DEAL_MOMENTUM_LOSS]: 55,
    [PREISSUE_TYPES.COMMITMENT_AT_RISK]: 60,
    [PREISSUE_TYPES.ROUND_STALL]: 55,
    [PREISSUE_TYPES.LEAD_VACANCY]: 60,
    [PREISSUE_TYPES.COVERAGE_GAP]: 45,
    [PREISSUE_TYPES.CHAMPION_DEPARTURE]: 65,
    [PREISSUE_TYPES.RELATIONSHIP_COOLING]: 30,
    [PREISSUE_TYPES.CONNECTION_DORMANT]: 25,
    [PREISSUE_TYPES.MEETING_RISK]: 35,
  };
  const impactMagnitude = IMPACT_MAGNITUDE_BY_TYPE[preissue.preIssueType] || 50;

  return {
    ...preissue,
    irreversibility: Math.round(I * 100) / 100,
    probability: Math.round(P * 100) / 100,
    ttiDays: preissue.ttiDays ?? preissue.timeToBreachDays ?? 30,
    expectedFutureCost: Math.round(P * I * impactMagnitude * 100) / 100,
    // Canonical aliases (additions, not replacements)
    rationale: Array.isArray(preissue.explain) ? preissue.explain[0] || '' : (typeof preissue.explain === 'string' ? preissue.explain : ''),
    linkedGoals: preissue.goalId ? [preissue.goalId] : [],
    supportingSignals: preissue.evidence || {},
  };
}

// =============================================================================
// PF2: ESCALATION WINDOW COMPUTATION
// =============================================================================

/**
 * Compute escalation window: when pre-issue becomes real issue
 * Returns { escalationDate, daysUntilEscalation, isImminent }
 * 
 * @param {Object} preissue
 * @param {Date} now
 * @returns {Object}
 */
function computeEscalationWindow(preissue, now) {
  const timeToBreachDays = preissue.timeToBreachDays || 30;
  
  // Escalation happens when:
  // - For runway: when we hit critical threshold (not just breach)
  // - For goals: when we can no longer catch up mathematically
  // - For deals: when momentum is lost
  
  // Delta = buffer before breach where intervention is still effective
  let deltaDays;
  switch (preissue.preIssueType) {
    case PREISSUE_TYPES.RUNWAY_BREACH:
      // Need 3-6 months to raise, so escalate early
      deltaDays = Math.max(0, timeToBreachDays - 90);
      break;
    case PREISSUE_TYPES.GOAL_MISS:
      // Need time to course correct
      deltaDays = Math.max(0, timeToBreachDays - 14);
      break;
    case PREISSUE_TYPES.DEAL_STALL:
      // Deals go cold fast
      deltaDays = Math.max(0, timeToBreachDays - 7);
      break;
    default:
      deltaDays = Math.max(0, timeToBreachDays - 14);
  }
  
  const escalationDate = new Date(now.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  const daysUntilEscalation = deltaDays;
  
  // Imminent = escalation within 7 days
  const isImminent = daysUntilEscalation <= 7;
  
  return {
    escalationDate: escalationDate.toISOString(),
    daysUntilEscalation,
    isImminent,
    breachDate: new Date(now.getTime() + timeToBreachDays * 24 * 60 * 60 * 1000).toISOString()
  };
}

// =============================================================================
// PF2: COST-OF-DELAY CURVE
// =============================================================================

/**
 * Compute cost-of-delay curve
 * Returns multiplier showing how cost increases if action is delayed
 * 
 * Formula: cost increases non-linearly as we approach escalation
 * - At T-30 days: 1.0x (baseline)
 * - At T-14 days: 1.5x
 * - At T-7 days: 2.5x
 * - At T-0 (escalation): 5.0x
 * - Post-escalation: 10x+ (damage done)
 * 
 * @param {number} daysUntilEscalation
 * @param {string} preIssueType
 * @returns {{ costMultiplier: number, costCurve: Object, explain: string }}
 */
function computeCostOfDelay(daysUntilEscalation, preIssueType) {
  // Cost curve: exponential as we approach escalation
  let costMultiplier;
  let explain;
  
  if (daysUntilEscalation > 30) {
    costMultiplier = 1.0;
    explain = 'Baseline cost - ample time to act';
  } else if (daysUntilEscalation > 14) {
    costMultiplier = 1.0 + (30 - daysUntilEscalation) / 32; // 1.0 to 1.5
    explain = 'Cost rising - action window narrowing';
  } else if (daysUntilEscalation > 7) {
    costMultiplier = 1.5 + (14 - daysUntilEscalation) / 7; // 1.5 to 2.5
    explain = 'Elevated cost - limited options remaining';
  } else if (daysUntilEscalation > 0) {
    costMultiplier = 2.5 + (7 - daysUntilEscalation) / 2.8; // 2.5 to 5.0
    explain = 'High cost - urgent action required';
  } else {
    costMultiplier = 5.0 + Math.abs(daysUntilEscalation) / 2; // 5.0+
    explain = 'Critical cost - damage accumulating';
  }
  
  // Adjust by type - some pre-issues have steeper cost curves
  const typeMultiplier = {
    // Company
    [PREISSUE_TYPES.RUNWAY_BREACH]: 1.5, // Existential
    [PREISSUE_TYPES.GOAL_MISS]: 1.0,
    [PREISSUE_TYPES.DEAL_STALL]: 1.2, // Momentum matters
    [PREISSUE_TYPES.BURN_ACCELERATION]: 1.3,
    [PREISSUE_TYPES.TEAM_CAPACITY]: 0.9,
    // Firm
    [PREISSUE_TYPES.FIRM_RELATIONSHIP_DECAY]: 0.7, // Slower burn
    [PREISSUE_TYPES.PORTFOLIO_CONCENTRATION]: 0.6,
    // Deal
    [PREISSUE_TYPES.DEAL_MOMENTUM_LOSS]: 1.3, // Fast decay
    [PREISSUE_TYPES.COMMITMENT_AT_RISK]: 1.4,
    // Round
    [PREISSUE_TYPES.ROUND_STALL]: 1.2,
    [PREISSUE_TYPES.LEAD_VACANCY]: 1.3,
    [PREISSUE_TYPES.COVERAGE_GAP]: 1.1,
    // Person
    [PREISSUE_TYPES.CHAMPION_DEPARTURE]: 1.4, // High impact
    [PREISSUE_TYPES.RELATIONSHIP_COOLING]: 0.8,
    // Relationship
    [PREISSUE_TYPES.CONNECTION_DORMANT]: 0.6,
    // Meeting
    [PREISSUE_TYPES.MEETING_RISK]: 0.8,
  };

  costMultiplier *= (typeMultiplier[preIssueType] || 1.0);
  
  // Build curve data points for visualization (not for alerts!)
  const costCurve = {
    today: costMultiplier,
    in7Days: computeCostAtDays(daysUntilEscalation - 7, preIssueType),
    in14Days: computeCostAtDays(daysUntilEscalation - 14, preIssueType),
    atEscalation: computeCostAtDays(0, preIssueType)
  };
  
  return {
    costMultiplier: Math.round(costMultiplier * 100) / 100,
    costCurve,
    explain
  };
}

/**
 * Helper to compute cost at specific days-until-escalation
 */
function computeCostAtDays(days, preIssueType) {
  let cost;
  if (days > 30) cost = 1.0;
  else if (days > 14) cost = 1.0 + (30 - days) / 32;
  else if (days > 7) cost = 1.5 + (14 - days) / 7;
  else if (days > 0) cost = 2.5 + (7 - days) / 2.8;
  else cost = 5.0 + Math.abs(days) / 2;
  
  const typeMultiplier = {
    // Company
    [PREISSUE_TYPES.RUNWAY_BREACH]: 1.5,
    [PREISSUE_TYPES.GOAL_MISS]: 1.0,
    [PREISSUE_TYPES.DEAL_STALL]: 1.2,
    [PREISSUE_TYPES.BURN_ACCELERATION]: 1.3,
    [PREISSUE_TYPES.TEAM_CAPACITY]: 0.9,
    // Firm
    [PREISSUE_TYPES.FIRM_RELATIONSHIP_DECAY]: 0.7,
    [PREISSUE_TYPES.PORTFOLIO_CONCENTRATION]: 0.6,
    // Deal
    [PREISSUE_TYPES.DEAL_MOMENTUM_LOSS]: 1.3,
    [PREISSUE_TYPES.COMMITMENT_AT_RISK]: 1.4,
    // Round
    [PREISSUE_TYPES.ROUND_STALL]: 1.2,
    [PREISSUE_TYPES.LEAD_VACANCY]: 1.3,
    [PREISSUE_TYPES.COVERAGE_GAP]: 1.1,
    // Person
    [PREISSUE_TYPES.CHAMPION_DEPARTURE]: 1.4,
    [PREISSUE_TYPES.RELATIONSHIP_COOLING]: 0.8,
    // Relationship
    [PREISSUE_TYPES.CONNECTION_DORMANT]: 0.6,
    // Meeting
    [PREISSUE_TYPES.MEETING_RISK]: 0.8,
  };

  return Math.round(cost * (typeMultiplier[preIssueType] || 1.0) * 100) / 100;
}

// =============================================================================
// PRE-ISSUE DETECTION
// =============================================================================

/**
 * Detect runway breach pre-issue
 */
function detectRunwayBreachPreIssue(company, runwayData, now) {
  if (!runwayData || runwayData.months === null || runwayData.months === undefined) return null;
  
  const criticalThreshold = 6;
  const warningThreshold = 9;
  
  if (runwayData.months >= warningThreshold) return null;
  
  const daysToBreachEstimate = runwayData.months * 30;
  const likelihood = runwayData.months < criticalThreshold ? 0.8 : 0.5;
  const runwayMonthsStr = typeof runwayData.months === 'number' ? runwayData.months.toFixed(1) : 'unknown';
  
  const preissue = {
    preIssueId: `preissue-runway-${company.id}`,
    preIssueType: PREISSUE_TYPES.RUNWAY_BREACH,
    entityRef: { type: 'company', id: company.id },
    companyId: company.id,
    companyName: company.name,
    title: `Runway will breach ${criticalThreshold}mo threshold`,
    description: `Current runway: ${runwayMonthsStr} months. Without fundraise or burn reduction, will hit critical level.`,
    likelihood,
    timeToBreachDays: daysToBreachEstimate,
    severity: runwayData.months < criticalThreshold ? 'high' : 'medium',
    explain: [
      `Runway: ${runwayMonthsStr} months`,
      `Burn: $${(company.burn / 1000).toFixed(0)}K/mo`,
      likelihood > 0.7 ? 'High likelihood without intervention' : 'Moderate likelihood'
    ],
    preventativeActions: ['REDUCE_BURN']  // Single best action per preissue
  };
  
  // PF2: Add escalation window and cost-of-delay
  const escalation = computeEscalationWindow(preissue, now);
  const costOfDelay = computeCostOfDelay(escalation.daysUntilEscalation, preissue.preIssueType);

  return stampSpecFields({
    ...preissue,
    escalation,
    costOfDelay
  });
}

/**
 * Get goal-type-specific preventative actions
 * Different goal types need different interventions
 */
function getGoalTypePreventativeActions(goalType, goalName) {
  const nameLower = (goalName || '').toLowerCase();
  
  // Infer goal type from name if goalType not set
  const isFundraise = goalType === 'fundraise' || 
    nameLower.includes('round') || 
    nameLower.includes('fundraise') ||
    nameLower.includes('series');
  
  const isHiring = goalType === 'hiring' || 
    nameLower.includes('hire') || 
    nameLower.includes('team') ||
    nameLower.includes('fte');
  
  const isProduct = goalType === 'product' || 
    nameLower.includes('product') || 
    nameLower.includes('mvp') ||
    nameLower.includes('launch') ||
    nameLower.includes('beta');
  
  const isRevenue = goalType === 'revenue' || 
    nameLower.includes('revenue') || 
    nameLower.includes('arr') ||
    nameLower.includes('growth');
  
  const isRunway = nameLower.includes('runway') || 
    nameLower.includes('burn');
  
  const isDealClose = goalType === 'deal_close' ||
    nameLower.includes('close') ||
    nameLower.includes('deal');
  
  // Single best action per goal type
  if (isFundraise) return ['ACCELERATE_FUNDRAISE'];
  if (isHiring) return ['HIRING_PUSH'];
  if (isProduct) return ['PRODUCT_SPRINT'];
  if (isRunway) return ['REDUCE_BURN'];
  if (isRevenue) return ['REVENUE_PUSH'];
  if (isDealClose) return ['FOLLOW_UP_INVESTOR'];
  
  // Default fallback
  return ['ACCELERATE_GOAL'];
}

/**
 * Detect goal miss pre-issue from trajectory
 */
function detectGoalMissPreIssue(trajectory, company, now) {
  if (trajectory.probabilityOfHit >= 0.6 || trajectory.probabilityOfHit === 0) return null;
  if (trajectory.onTrack === true) return null;
  if (trajectory.daysLeft === null || trajectory.daysLeft < 0) return null;
  
  // Select preventative actions based on goal type
  const preventativeActions = getGoalTypePreventativeActions(trajectory.goalType, trajectory.goalName);
  
  const preissue = {
    preIssueId: `preissue-goal-${company.id}-${trajectory.goalId}`,
    preIssueType: PREISSUE_TYPES.GOAL_MISS,
    entityRef: { type: 'company', id: company.id },
    companyId: company.id,
    companyName: company.name,
    goalId: trajectory.goalId,
    goalName: trajectory.goalName,
    goalType: trajectory.goalType,
    title: `Goal "${trajectory.goalName}" likely to miss target`,
    description: `${(trajectory.probabilityOfHit * 100).toFixed(0)}% probability of hitting ${trajectory.target} by ${trajectory.due}. Currently at ${trajectory.current}.`,
    likelihood: 1 - trajectory.probabilityOfHit,
    timeToBreachDays: trajectory.daysLeft,
    severity: trajectory.probabilityOfHit < 0.3 ? 'high' : 'medium',
    explain: trajectory.explain,
    preventativeActions
  };
  
  // PF2: Add escalation window and cost-of-delay
  const escalation = computeEscalationWindow(preissue, now);
  const costOfDelay = computeCostOfDelay(escalation.daysUntilEscalation, preissue.preIssueType);

  return stampSpecFields({
    ...preissue,
    escalation,
    costOfDelay
  });
}

/**
 * Detect deal stall pre-issue
 */
function detectDealStallPreIssues(company, now) {
  const preissues = [];
  
  for (const deal of company.deals || []) {
    if (!deal.asOf) continue;
    
    const lastUpdate = new Date(deal.asOf);
    const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > 14 && deal.status !== 'closed') {
      const likelihood = Math.min(0.9, 0.3 + (daysSinceUpdate - 14) / 30);
      
      const preissue = {
        preIssueId: `preissue-deal-${company.id}-${deal.id}`,
        preIssueType: PREISSUE_TYPES.DEAL_STALL,
        entityRef: { type: 'deal', id: deal.id },
        companyId: company.id,
        companyName: company.name,
        dealId: deal.id,
        investor: deal.investor,
        title: `Deal with ${deal.investor} may be stalling`,
        description: `No update in ${Math.floor(daysSinceUpdate)} days. Status: ${deal.status}. Amount: $${(deal.amount / 1000000).toFixed(1)}M`,
        likelihood,
        timeToBreachDays: 14,
        severity: deal.amount > 2000000 ? 'high' : 'medium',
        explain: [
          `${Math.floor(daysSinceUpdate)} days since last update`,
          `Current status: ${deal.status}`,
          `Deal value: $${(deal.amount / 1000000).toFixed(1)}M`
        ],
        preventativeActions: ['FOLLOW_UP_INVESTOR']  // Single best action per preissue
      };
      
      // PF2: Add escalation window and cost-of-delay
      const escalation = computeEscalationWindow(preissue, now);
      const costOfDelay = computeCostOfDelay(escalation.daysUntilEscalation, preissue.preIssueType);

      preissues.push(stampSpecFields({
        ...preissue,
        escalation,
        costOfDelay
      }));
    }
  }

  return preissues;
}

// =============================================================================
// NEW: FIRM PREISSUE DETECTION
// =============================================================================

/**
 * Detect firm relationship decay pre-issue
 * Triggers when a firm relationship hasn't had activity in a while
 */
export function detectFirmRelationshipDecay(firm, relationships, people, now) {
  // Note: people use 'org' field, not 'firmId'
  const firmPartners = people.filter(p => p.org === firm.id || p.firmId === firm.id);
  if (firmPartners.length === 0) return null;
  
  // Find most recent interaction with anyone at this firm
  let mostRecentContact = null;
  for (const partner of firmPartners) {
    const partnerRels = relationships.filter(r => 
      r.p1Id === partner.id || r.p2Id === partner.id
    );
    for (const rel of partnerRels) {
      if (rel.lastContact) {
        const contactDate = new Date(rel.lastContact);
        if (!mostRecentContact || contactDate > mostRecentContact) {
          mostRecentContact = contactDate;
        }
      }
    }
  }
  
  if (!mostRecentContact) return null;
  
  const daysSinceContact = (now - mostRecentContact) / (1000 * 60 * 60 * 24);
  const dormantThreshold = 60; // 60 days = dormant
  
  if (daysSinceContact < dormantThreshold) return null;
  
  const likelihood = Math.min(0.85, 0.4 + (daysSinceContact - dormantThreshold) / 120);
  
  const preissue = {
    preIssueId: `preissue-firm-decay-${firm.id}`,
    preIssueType: PREISSUE_TYPES.FIRM_RELATIONSHIP_DECAY,
    entityRef: { type: 'firm', id: firm.id },
    firmId: firm.id,
    firmName: firm.name,
    title: `Relationship with ${firm.name} may be cooling`,
    description: `No contact with ${firm.name} partners in ${Math.floor(daysSinceContact)} days`,
    likelihood,
    timeToBreachDays: 30,
    severity: daysSinceContact > 90 ? 'high' : 'medium',
    explain: [
      `${Math.floor(daysSinceContact)} days since last contact`,
      `${firmPartners.length} known partners at firm`,
      'Relationship may be going cold'
    ],
    preventativeActions: ['SCHEDULE_TOUCHPOINT']  // Single best action per preissue
  };
  
  const escalation = computeEscalationWindow(preissue, now);
  const costOfDelay = computeCostOfDelay(escalation.daysUntilEscalation, preissue.preIssueType);

  return stampSpecFields({ ...preissue, escalation, costOfDelay });
}

// =============================================================================
// NEW: ROUND PREISSUE DETECTION
// =============================================================================

/**
 * Detect round stall pre-issue
 * Triggers when a round is active but coverage velocity is too slow
 */
export function detectRoundStall(round, deals, company, now) {
  // Status may be lowercase or titlecase
  if (round.status !== 'Active' && round.status !== 'active') return null;
  
  const roundDeals = deals.filter(d => d.roundId === round.id);
  const totalCommitted = roundDeals.reduce((sum, d) => sum + (d.hardCommit || 0), 0);
  const coverage = round.targetAmount > 0 ? totalCommitted / round.targetAmount : 0;
  
  // Check velocity - how fast is the round filling?
  const roundAge = round.startDate 
    ? (now - new Date(round.startDate)) / (1000 * 60 * 60 * 24)
    : 30; // Default assumption
  
  const expectedCoverageAtThisPoint = Math.min(1, roundAge / 90); // Expect full coverage in 90 days
  const coverageGap = expectedCoverageAtThisPoint - coverage;
  
  if (coverageGap < 0.2) return null; // On track
  
  const likelihood = Math.min(0.9, 0.3 + coverageGap);
  
  const preissue = {
    preIssueId: `preissue-round-stall-${round.id}`,
    preIssueType: PREISSUE_TYPES.ROUND_STALL,
    entityRef: { type: 'round', id: round.id },
    roundId: round.id,
    roundStage: round.stage || 'Round',
    companyId: company.id,
    companyName: company.name,
    title: `${round.stage || 'Round'} for ${company.name} is behind schedule`,
    description: `Round ${(coverage * 100).toFixed(0)}% covered vs ${(expectedCoverageAtThisPoint * 100).toFixed(0)}% expected`,
    likelihood,
    timeToBreachDays: round.targetCloseDate 
      ? Math.max(7, (new Date(round.targetCloseDate) - now) / (1000 * 60 * 60 * 24))
      : 60,
    severity: coverageGap > 0.4 ? 'high' : 'medium',
    explain: [
      `Current coverage: ${(coverage * 100).toFixed(0)}%`,
      `Expected by now: ${(expectedCoverageAtThisPoint * 100).toFixed(0)}%`,
      `Gap: ${(coverageGap * 100).toFixed(0)}%`,
      `${roundDeals.length} active deals`
    ],
    preventativeActions: ['EXPAND_INVESTOR_LIST']  // Single best action per preissue
  };
  
  const escalation = computeEscalationWindow(preissue, now);
  const costOfDelay = computeCostOfDelay(escalation.daysUntilEscalation, preissue.preIssueType);

  return stampSpecFields({ ...preissue, escalation, costOfDelay });
}

/**
 * Detect lead vacancy pre-issue
 * Triggers when a round has no lead investor committed
 */
export function detectLeadVacancy(round, deals, company, now) {
  if (round.status !== 'Active' && round.status !== 'active') return null;
  
  const roundDeals = deals.filter(d => d.roundId === round.id);
  const hasLead = roundDeals.some(d => d.isLead === true || d.leadStatus === 'confirmed');
  
  if (hasLead) return null;
  
  // Check how long the round has been active
  const roundAge = round.startDate 
    ? (now - new Date(round.startDate)) / (1000 * 60 * 60 * 24)
    : 30;
  
  if (roundAge < 30) return null; // Still early
  
  const likelihood = Math.min(0.85, 0.4 + (roundAge - 30) / 90);
  
  const preissue = {
    preIssueId: `preissue-lead-vacancy-${round.id}`,
    preIssueType: PREISSUE_TYPES.LEAD_VACANCY,
    entityRef: { type: 'round', id: round.id },
    roundId: round.id,
    roundStage: round.stage || 'Round',
    companyId: company.id,
    companyName: company.name,
    title: `${round.stage || 'Round'} for ${company.name} needs a lead`,
    description: `Round active for ${Math.floor(roundAge)} days with no lead investor confirmed`,
    likelihood,
    timeToBreachDays: 45,
    severity: roundAge > 60 ? 'high' : 'medium',
    explain: [
      `Round active for ${Math.floor(roundAge)} days`,
      'No lead investor confirmed',
      `${roundDeals.length} investors in pipeline`
    ],
    preventativeActions: ['PRIORITIZE_LEAD_CANDIDATES']  // Single best action per preissue
  };
  
  const escalation = computeEscalationWindow(preissue, now);
  const costOfDelay = computeCostOfDelay(escalation.daysUntilEscalation, preissue.preIssueType);

  return stampSpecFields({ ...preissue, escalation, costOfDelay });
}

// =============================================================================
// NEW: RELATIONSHIP/PERSON PREISSUE DETECTION
// =============================================================================

/**
 * Detect dormant connection pre-issue
 */
export function detectDormantConnection(relationship, now) {
  if (!relationship.lastContact) return null;
  
  const lastContact = new Date(relationship.lastContact);
  const daysSinceContact = (now - lastContact) / (1000 * 60 * 60 * 24);
  const dormantThreshold = 90;
  
  if (daysSinceContact < dormantThreshold) return null;
  
  const likelihood = Math.min(0.8, 0.3 + (daysSinceContact - dormantThreshold) / 180);
  
  const preissue = {
    preIssueId: `preissue-dormant-${relationship.id}`,
    preIssueType: PREISSUE_TYPES.CONNECTION_DORMANT,
    entityRef: { type: 'relationship', id: relationship.id, name: `${relationship.p1Name || 'Person 1'} ↔ ${relationship.p2Name || 'Person 2'}` },
    relationshipId: relationship.id,
    companyName: `${relationship.p1Name || 'Person 1'} ↔ ${relationship.p2Name || 'Person 2'}`,
    p1Id: relationship.p1Id,
    p2Id: relationship.p2Id,
    title: `Connection between ${relationship.p1Name || 'Person 1'} and ${relationship.p2Name || 'Person 2'} going dormant`,
    description: `No contact in ${Math.floor(daysSinceContact)} days`,
    likelihood,
    timeToBreachDays: 30,
    severity: daysSinceContact > 180 ? 'high' : 'medium',
    explain: [
      `${Math.floor(daysSinceContact)} days since last contact`,
      `Relationship strength: ${relationship.strength || 'unknown'}`,
      'Connection may need re-activation'
    ],
    preventativeActions: ['SEND_TOUCHPOINT']  // Single best action per preissue
  };
  
  const escalation = computeEscalationWindow(preissue, now);
  const costOfDelay = computeCostOfDelay(escalation.daysUntilEscalation, preissue.preIssueType);

  return stampSpecFields({ ...preissue, escalation, costOfDelay });
}

// =============================================================================
// PHASE 5.3: PRE-ISSUE HEURISTICS (Design Contract)
// =============================================================================

/**
 * Runway Compression Risk
 * P = clamp(1 - runway_months/required_runway, 0, 1)
 * Trigger: P >= 0.25 AND TTI <= 180d
 */
function detectRunwayCompressionRisk(company, { snapshot, params, now }) {
  const cash = snapshot?.metrics?.cash ?? company.cash;
  const burn = snapshot?.metrics?.burn ?? company.burn;
  if (!cash || !burn || burn <= 0) return null;

  const runwayMonths = cash / burn;
  const requiredRunway = params?.runwayTarget || 12;
  const P = Math.max(0, Math.min(1, 1 - runwayMonths / requiredRunway));

  if (P < 0.25) return null;

  const ttiDays = Math.round(runwayMonths * 30);
  if (ttiDays > 180) return null;

  const impactMagnitude = 80;
  const expectedFutureCost = P * impactMagnitude;

  return {
    preIssueId: `preissue-runway-compression-${company.id}`,
    preIssueType: PREISSUE_TYPES.RUNWAY_COMPRESSION_RISK,
    entityRef: { type: 'company', id: company.id },
    companyId: company.id,
    companyName: company.name,
    title: `Runway compression risk for ${company.name}`,
    description: `Runway ${runwayMonths.toFixed(1)} months vs ${requiredRunway} required. P=${(P * 100).toFixed(0)}%`,
    likelihood: P,
    probability: Math.round(P * 100) / 100,
    ttiDays,
    timeToBreachDays: ttiDays,
    expectedFutureCost: Math.round(expectedFutureCost * 100) / 100,
    severity: P >= 0.6 ? 'high' : 'medium',
    explain: [
      `Runway: ${runwayMonths.toFixed(1)} months`,
      `Required: ${requiredRunway} months`,
      `Compression probability: ${(P * 100).toFixed(0)}%`
    ],
    evidence: { runwayMonths: Math.round(runwayMonths * 10) / 10, requiredRunway },
    preventativeActions: ['REDUCE_BURN'],
    detectedAt: now.toISOString(),
  };
}

/**
 * Goal Feasibility Risk
 * P = clamp((required_slope - ṁ) / max(|required_slope|, ε), 0, 1) × volatility
 * Trigger: P >= 0.3 AND D <= 270d
 */
function detectGoalFeasibilityRisk(company, { goalTrajectories, now }) {
  const results = [];
  for (const traj of (goalTrajectories || [])) {
    if (!traj.daysLeft || traj.daysLeft < 0 || traj.daysLeft > 270) continue;
    if (traj.onTrack === true) continue;

    const current = traj.current ?? 0;
    const target = traj.target ?? 0;
    const gap = target - current;
    if (gap <= 0) continue;

    const requiredSlope = traj.daysLeft > 0 ? gap / traj.daysLeft : gap;
    const actualSlope = traj.velocity ?? 0;
    const epsilon = 0.001;
    const denominator = Math.max(Math.abs(requiredSlope), epsilon);
    const rawP = (requiredSlope - actualSlope) / denominator;
    const volatility = traj.volatility ?? 1.0;
    const P = Math.max(0, Math.min(1, rawP)) * Math.min(volatility, 1.5);
    const clampedP = Math.max(0, Math.min(1, P));

    if (clampedP < 0.3) continue;

    results.push({
      preIssueId: `preissue-goal-feasibility-${company.id}-${traj.goalId}`,
      preIssueType: PREISSUE_TYPES.GOAL_FEASIBILITY_RISK,
      entityRef: { type: 'company', id: company.id },
      companyId: company.id,
      companyName: company.name,
      goalId: traj.goalId,
      goalName: traj.goalName,
      title: `Goal "${traj.goalName}" feasibility at risk`,
      description: `Required slope ${requiredSlope.toFixed(2)} vs actual ${actualSlope.toFixed(2)}. P=${(clampedP * 100).toFixed(0)}%`,
      likelihood: clampedP,
      probability: Math.round(clampedP * 100) / 100,
      ttiDays: traj.daysLeft,
      timeToBreachDays: traj.daysLeft,
      expectedFutureCost: Math.round(clampedP * 60 * 100) / 100,
      severity: clampedP >= 0.6 ? 'high' : 'medium',
      explain: [
        `Required slope: ${requiredSlope.toFixed(2)}/day`,
        `Actual slope: ${actualSlope.toFixed(2)}/day`,
        `${traj.daysLeft} days remaining`
      ],
      evidence: { requiredSlope, actualSlope, daysLeft: traj.daysLeft },
      preventativeActions: ['ACCELERATE_GOAL'],
      detectedAt: now.toISOString(),
    });
  }
  return results;
}

/**
 * Dependency Risk
 * P = missing/required prerequisites
 * Trigger: P >= 0.4 AND TTI <= 120d
 */
function detectDependencyRisk(company, { goalTrajectories, now }) {
  const results = [];
  for (const traj of (goalTrajectories || [])) {
    if (!traj.daysLeft || traj.daysLeft < 0 || traj.daysLeft > 120) continue;

    const deps = traj.dependencies || [];
    if (deps.length === 0) continue;

    const missing = deps.filter(d => !d.met).length;
    const P = missing / deps.length;

    if (P < 0.4) continue;

    results.push({
      preIssueId: `preissue-dependency-${company.id}-${traj.goalId}`,
      preIssueType: PREISSUE_TYPES.DEPENDENCY_RISK,
      entityRef: { type: 'company', id: company.id },
      companyId: company.id,
      companyName: company.name,
      goalId: traj.goalId,
      goalName: traj.goalName,
      title: `Dependency risk for "${traj.goalName}"`,
      description: `${missing}/${deps.length} prerequisites unmet. P=${(P * 100).toFixed(0)}%`,
      likelihood: P,
      probability: Math.round(P * 100) / 100,
      ttiDays: traj.daysLeft,
      timeToBreachDays: traj.daysLeft,
      expectedFutureCost: Math.round(P * 50 * 100) / 100,
      severity: P >= 0.7 ? 'high' : 'medium',
      explain: [
        `${missing} of ${deps.length} prerequisites unmet`,
        `${traj.daysLeft} days until deadline`
      ],
      evidence: { missing, total: deps.length, daysLeft: traj.daysLeft },
      preventativeActions: ['ACCELERATE_GOAL'],
      detectedAt: now.toISOString(),
    });
  }
  return results;
}

/**
 * Timing Window Risk
 * P = policy-defined closing factor
 * Trigger: P >= 0.5 AND TTI <= 150d
 */
function detectTimingWindowRisk(company, { deals, now }) {
  const results = [];
  for (const deal of (deals || [])) {
    if (deal.status === 'closed' || deal.status === 'dead') continue;
    if (!deal.targetCloseDate) continue;

    const closeDate = new Date(deal.targetCloseDate);
    const daysLeft = Math.round((closeDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0 || daysLeft > 150) continue;

    // Policy-defined closing factor: harder to close as window narrows
    const P = Math.max(0, Math.min(1, 1 - (daysLeft / 150)));

    if (P < 0.5) continue;

    results.push({
      preIssueId: `preissue-timing-${company.id}-${deal.id}`,
      preIssueType: PREISSUE_TYPES.TIMING_WINDOW_RISK,
      entityRef: { type: 'deal', id: deal.id },
      companyId: company.id,
      companyName: company.name,
      dealId: deal.id,
      title: `Timing window closing on ${deal.investor || 'deal'}`,
      description: `${daysLeft} days until close window expires. P=${(P * 100).toFixed(0)}%`,
      likelihood: P,
      probability: Math.round(P * 100) / 100,
      ttiDays: daysLeft,
      timeToBreachDays: daysLeft,
      expectedFutureCost: Math.round(P * 70 * 100) / 100,
      severity: P >= 0.75 ? 'high' : 'medium',
      explain: [
        `${daysLeft} days until target close`,
        `Closing probability declining`
      ],
      evidence: { daysLeft, targetCloseDate: deal.targetCloseDate },
      preventativeActions: ['FOLLOW_UP_INVESTOR'],
      detectedAt: now.toISOString(),
    });
  }
  return results;
}

/**
 * Data Blindspot Risk
 * P = stale/required metrics
 * Trigger: P >= 0.5 AND TTI <= 90d
 */
function detectDataBlindspotRisk(company, { snapshot, now }) {
  const coreMetrics = ['cash', 'burn', 'arr', 'employees'];
  const staleDays = 30;

  let staleCount = 0;
  let requiredCount = coreMetrics.length;

  for (const key of coreMetrics) {
    const days = snapshot?.staleness?.[key];
    const value = snapshot?.metrics?.[key];
    if (value === undefined || value === null || (days !== undefined && days > staleDays)) {
      staleCount++;
    }
  }

  const P = staleCount / requiredCount;
  if (P < 0.5) return null;

  // TTI: how soon does stale data cause a missed signal?
  const ttiDays = 90; // conservative: stale data becomes dangerous within a quarter
  if (ttiDays > 90) return null;

  return {
    preIssueId: `preissue-data-blindspot-${company.id}`,
    preIssueType: PREISSUE_TYPES.DATA_BLINDSPOT_RISK,
    entityRef: { type: 'company', id: company.id },
    companyId: company.id,
    companyName: company.name,
    title: `Data blindspot for ${company.name}`,
    description: `${staleCount}/${requiredCount} core metrics stale or missing. P=${(P * 100).toFixed(0)}%`,
    likelihood: P,
    probability: Math.round(P * 100) / 100,
    ttiDays,
    timeToBreachDays: ttiDays,
    expectedFutureCost: Math.round(P * 40 * 100) / 100,
    severity: P >= 0.75 ? 'high' : 'medium',
    explain: [
      `${staleCount} of ${requiredCount} core metrics stale/missing`,
      `Threshold: ${staleDays} days`
    ],
    evidence: { staleCount, requiredCount, staleDays },
    preventativeActions: ['REQUEST_DATA_UPDATE'],
    detectedAt: now.toISOString(),
  };
}

// =============================================================================
// MAIN DERIVATION
// =============================================================================

/**
 * Derive pre-issues for a company
 */
export function deriveCompanyPreIssues(company, goalTrajectories, runwayData, now, meetings = null, { snapshot, params } = {}) {
  const preissues = [];
  // Max one per entity per heuristic — track seen types
  const seenHeuristics = new Set();

  const runwayPreIssue = detectRunwayBreachPreIssue(company, runwayData, now);
  if (runwayPreIssue) preissues.push(runwayPreIssue);

  for (const traj of goalTrajectories) {
    const goalPreIssue = detectGoalMissPreIssue(traj, company, now);
    if (goalPreIssue) preissues.push(goalPreIssue);
  }

  const dealPreIssues = detectDealStallPreIssues(company, now);
  preissues.push(...dealPreIssues);

  // A3: Generate preissues from meeting risks
  if (meetings?.risks?.length > 0) {
    for (const risk of meetings.risks) {
      const slug = (risk.text || '').slice(0, 30).replace(/\W+/g, '-');
      const meetingPreissue = {
        preIssueId: `preissue-meeting-risk-${company.id}-${slug}`,
        preIssueType: PREISSUE_TYPES.MEETING_RISK,
        entityRef: { type: 'company', id: company.id },
        companyId: company.id,
        companyName: company.name,
        title: `Meeting risk: ${risk.text}`,
        likelihood: 0.5,
        timeToBreachDays: 14,
        explain: [`Meeting intelligence: ${risk.text}`],
        evidence: { source: 'meeting', text: risk.text },
        preventativeActions: ['SCHEDULE_CHECK_IN'],
        escalation: computeEscalationWindow({ timeToBreachDays: 14, preIssueType: PREISSUE_TYPES.MEETING_RISK }, now),
        costOfDelay: computeCostOfDelay(14, PREISSUE_TYPES.MEETING_RISK)
      };
      preissues.push(stampSpecFields(meetingPreissue));
    }
  }

  // Phase 5.3: Pre-issue heuristics (max one per entity per heuristic)
  const stageParams = params || getStageParams(company.stage);

  // 1. Runway Compression Risk
  const rcKey = `${company.id}-RUNWAY_COMPRESSION_RISK`;
  if (!seenHeuristics.has(rcKey)) {
    const rc = detectRunwayCompressionRisk(company, { snapshot, params: stageParams, now });
    if (rc) {
      const esc = computeEscalationWindow(rc, now);
      const cod = computeCostOfDelay(esc.daysUntilEscalation, rc.preIssueType);
      preissues.push(stampSpecFields({ ...rc, escalation: esc, costOfDelay: cod }));
      seenHeuristics.add(rcKey);
    }
  }

  // 2. Goal Feasibility Risk
  const gfResults = detectGoalFeasibilityRisk(company, { goalTrajectories, now });
  for (const gf of gfResults) {
    const gfKey = `${company.id}-GOAL_FEASIBILITY_RISK-${gf.goalId}`;
    if (!seenHeuristics.has(gfKey)) {
      const esc = computeEscalationWindow(gf, now);
      const cod = computeCostOfDelay(esc.daysUntilEscalation, gf.preIssueType);
      preissues.push(stampSpecFields({ ...gf, escalation: esc, costOfDelay: cod }));
      seenHeuristics.add(gfKey);
    }
  }

  // 3. Dependency Risk
  const depResults = detectDependencyRisk(company, { goalTrajectories, now });
  for (const dep of depResults) {
    const depKey = `${company.id}-DEPENDENCY_RISK-${dep.goalId}`;
    if (!seenHeuristics.has(depKey)) {
      const esc = computeEscalationWindow(dep, now);
      const cod = computeCostOfDelay(esc.daysUntilEscalation, dep.preIssueType);
      preissues.push(stampSpecFields({ ...dep, escalation: esc, costOfDelay: cod }));
      seenHeuristics.add(depKey);
    }
  }

  // 4. Timing Window Risk
  const twResults = detectTimingWindowRisk(company, { deals: company.deals || [], now });
  for (const tw of twResults) {
    const twKey = `${company.id}-TIMING_WINDOW_RISK-${tw.dealId}`;
    if (!seenHeuristics.has(twKey)) {
      const esc = computeEscalationWindow(tw, now);
      const cod = computeCostOfDelay(esc.daysUntilEscalation, tw.preIssueType);
      preissues.push(stampSpecFields({ ...tw, escalation: esc, costOfDelay: cod }));
      seenHeuristics.add(twKey);
    }
  }

  // 5. Data Blindspot Risk
  const dbKey = `${company.id}-DATA_BLINDSPOT_RISK`;
  if (!seenHeuristics.has(dbKey)) {
    const db = detectDataBlindspotRisk(company, { snapshot, now });
    if (db) {
      const esc = computeEscalationWindow(db, now);
      const cod = computeCostOfDelay(esc.daysUntilEscalation, db.preIssueType);
      preissues.push(stampSpecFields({ ...db, escalation: esc, costOfDelay: cod }));
      seenHeuristics.add(dbKey);
    }
  }

  return preissues;
}

/**
 * Derive pre-issues for portfolio (company-centric)
 */
export function derivePortfolioPreIssues(companies, goalTrajectoriesByCompany, runwayByCompany, now) {
  const byCompany = {};
  const all = [];
  
  for (const company of companies) {
    const trajectories = goalTrajectoriesByCompany[company.id] || [];
    const runway = runwayByCompany[company.id] || null;
    const companyPreIssues = deriveCompanyPreIssues(company, trajectories, runway, now);
    byCompany[company.id] = companyPreIssues;
    all.push(...companyPreIssues);
  }
  
  return { byCompany, all };
}

/**
 * NEW: Derive pre-issues across all entity types
 * Full portfolio analysis including firms, rounds, relationships
 * 
 * @param {Object} data - Full data context
 * @param {Object} derivedData - Derived data (trajectories, runway, etc.)
 * @param {Date} now
 * @returns {{ byEntity: Object, all: Object[], summary: Object }}
 */
export function deriveAllEntityPreIssues(data, derivedData, now) {
  const { companies, firms, people, deals, rounds, relationships } = data;
  const { goalTrajectoriesByCompany, runwayByCompany } = derivedData;
  
  const byEntity = {
    company: {},
    firm: {},
    round: {},
    relationship: {},
  };
  const all = [];
  
  // 1. Company preissues (existing)
  for (const company of companies) {
    const trajectories = goalTrajectoriesByCompany?.[company.id] || [];
    const runway = runwayByCompany?.[company.id] || null;
    const companyPreIssues = deriveCompanyPreIssues(company, trajectories, runway, now);
    byEntity.company[company.id] = companyPreIssues;
    all.push(...companyPreIssues);
  }
  
  // 2. Firm preissues (relationship decay)
  for (const firm of firms || []) {
    const firmPreIssue = detectFirmRelationshipDecay(firm, relationships || [], people || [], now);
    if (firmPreIssue) {
      byEntity.firm[firm.id] = byEntity.firm[firm.id] || [];
      byEntity.firm[firm.id].push(firmPreIssue);
      all.push(firmPreIssue);
    }
  }
  
  // 3. Round preissues (stall, lead vacancy)
  for (const round of rounds || []) {
    const company = companies.find(c => c.id === round.companyId);
    if (!company) continue;
    
    const roundDeals = (deals || []).filter(d => d.roundId === round.id);
    
    const stallPreIssue = detectRoundStall(round, roundDeals, company, now);
    if (stallPreIssue) {
      byEntity.round[round.id] = byEntity.round[round.id] || [];
      byEntity.round[round.id].push(stallPreIssue);
      all.push(stallPreIssue);
    }
    
    const leadPreIssue = detectLeadVacancy(round, roundDeals, company, now);
    if (leadPreIssue) {
      byEntity.round[round.id] = byEntity.round[round.id] || [];
      byEntity.round[round.id].push(leadPreIssue);
      all.push(leadPreIssue);
    }
  }
  
  // 4. Relationship preissues (dormant connections)
  // Sort by lastContact to prioritize older relationships, then sample
  const sortedRelationships = [...(relationships || [])]
    .filter(r => r.strength === 'strong' || r.strength === 'medium')
    .filter(r => r.lastContact) // Must have lastContact
    .sort((a, b) => new Date(a.lastContact) - new Date(b.lastContact)) // Oldest first
    .slice(0, 100); // Take oldest 100
  
  for (const rel of sortedRelationships) {
    const dormantPreIssue = detectDormantConnection(rel, now);
    if (dormantPreIssue) {
      byEntity.relationship[rel.id] = byEntity.relationship[rel.id] || [];
      byEntity.relationship[rel.id].push(dormantPreIssue);
      all.push(dormantPreIssue);
    }
  }
  
  // Build summary
  const summary = {
    total: all.length,
    byType: {},
    byEntityType: {
      company: Object.keys(byEntity.company).length,
      firm: Object.keys(byEntity.firm).length,
      round: Object.keys(byEntity.round).length,
      relationship: Object.keys(byEntity.relationship).length,
    },
    bySeverity: {
      high: all.filter(p => p.severity === 'high').length,
      medium: all.filter(p => p.severity === 'medium').length,
      low: all.filter(p => p.severity === 'low').length,
    },
    imminent: all.filter(p => p.escalation?.isImminent).length,
  };
  
  for (const p of all) {
    summary.byType[p.preIssueType] = (summary.byType[p.preIssueType] || 0) + 1;
  }
  
  return { byEntity, all, summary };
}

/**
 * PF2: Get imminent pre-issues that should become Actions
 * @param {Object[]} preissues
 * @returns {Object[]} Pre-issues where escalation is imminent
 */
export function getImminentPreIssues(preissues) {
  return preissues.filter(p => p.escalation?.isImminent === true);
}

/**
 * PF2: Rank pre-issues by cost-of-delay urgency
 * Higher cost multiplier = higher priority
 * @param {Object[]} preissues
 * @returns {Object[]}
 */
export function rankPreIssuesByCostOfDelay(preissues) {
  return [...preissues].sort((a, b) => {
    const costA = a.costOfDelay?.costMultiplier || 1;
    const costB = b.costOfDelay?.costMultiplier || 1;
    return costB - costA;
  });
}

/**
 * Validate pre-issue structure
 */
export function validatePreIssue(preissue) {
  const errors = [];
  
  if (!preissue.preIssueId) errors.push('Missing preIssueId');
  if (!preissue.preIssueType) errors.push('Missing preIssueType');
  if (!preissue.entityRef) errors.push('Missing entityRef');
  if (typeof preissue.likelihood !== 'number') errors.push('likelihood must be number');
  if (preissue.likelihood < 0 || preissue.likelihood > 1) errors.push('likelihood must be 0-1');
  if (typeof preissue.timeToBreachDays !== 'number') errors.push('timeToBreachDays must be number');
  if (!Array.isArray(preissue.explain)) errors.push('explain must be array');
  
  // PF2 validations
  if (!preissue.escalation) errors.push('Missing escalation window');
  if (!preissue.costOfDelay) errors.push('Missing costOfDelay');
  
  return { valid: errors.length === 0, errors };
}

export default {
  PREISSUE_TYPES,
  deriveCompanyPreIssues,
  derivePortfolioPreIssues,
  deriveAllEntityPreIssues, // NEW
  validatePreIssue,
  getImminentPreIssues,
  rankPreIssuesByCostOfDelay,
  computeEscalationWindow,
  computeCostOfDelay,
  // NEW: Individual detectors (for testing/extension)
  detectFirmRelationshipDecay,
  detectRoundStall,
  detectLeadVacancy,
  detectDormantConnection,
};
