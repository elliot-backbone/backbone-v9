/**
 * issues.js - Issue Detection Engine (Phase E Compliance)
 * 
 * DOCTRINE: Issues = Gaps
 * All absence, staleness, and deviation belong to Issues, not Health.
 * 
 * E1: CANONICAL ISSUE OBJECT
 * Each Issue must include:
 * - issueId
 * - issueType  
 * - entityRef
 * - severity
 * - evidence
 * - detectedAt
 * 
 * E2: ALL ABSENCE LIVES HERE
 * Examples:
 * - NO_GOALS
 * - DATA_MISSING
 * - DATA_STALE
 * - GOAL_BEHIND
 * 
 * Pure derivation: no storage of computed values.
 * 
 * @module issues
 */

import { deriveRunway } from '../derive/runway.js';
import { deriveTrajectory } from '../derive/trajectory.js';

// =============================================================================
// SEVERITY LEVELS
// =============================================================================

export const SEVERITY = {
  CRITICAL: 3,  // Immediate action required
  HIGH: 2,      // Action needed soon
  MEDIUM: 1,    // Should address
  LOW: 0        // Nice to address
};

// =============================================================================
// CANONICAL ISSUE TYPES (E2)
// =============================================================================

export const ISSUE_TYPES = {
  // Runway issues
  RUNWAY_CRITICAL: 'RUNWAY_CRITICAL',
  RUNWAY_WARNING: 'RUNWAY_WARNING',
  
  // Data issues (absence/staleness)
  DATA_MISSING: 'DATA_MISSING',
  DATA_STALE: 'DATA_STALE',
  DATA_NO_TIMESTAMP: 'DATA_NO_TIMESTAMP',
  
  // Goal issues (absence/deviation)
  NO_GOALS: 'NO_GOALS',
  GOAL_BEHIND: 'GOAL_BEHIND',
  GOAL_STALLED: 'GOAL_STALLED',
  GOAL_MISSED: 'GOAL_MISSED',
  GOAL_NO_HISTORY: 'GOAL_NO_HISTORY',
  
  // Deal/Pipeline issues
  NO_PIPELINE: 'NO_PIPELINE',
  PIPELINE_GAP: 'PIPELINE_GAP',
  DEAL_STALE: 'DEAL_STALE',
  DEAL_AT_RISK: 'DEAL_AT_RISK'
};

// =============================================================================
// THRESHOLDS
// =============================================================================

const THRESHOLDS = {
  RUNWAY_CRITICAL_MONTHS: 6,
  RUNWAY_WARNING_MONTHS: 12,
  DATA_STALE_DAYS: 14,
  DEAL_STALE_DAYS: 7,
  GOAL_DEADLINE_BUFFER_DAYS: 7
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

import { createHash } from 'crypto';

/**
 * Generate deterministic issue ID from stable inputs only
 * Uses type + entityId + dealId (if applicable) for stability
 */
function generateIssueId(type, entityId, stableKey = '') {
  const hash = createHash('sha256')
    .update(`${type}|${entityId}|${stableKey}`)
    .digest('hex')
    .slice(0, 6);
  return `${type}-${entityId}-${hash}`;
}

/**
 * E1: Create canonical issue object
 * stableKey: optional additional identifier for uniqueness (e.g., dealId)
 */
function createIssue({ issueType, entityRef, severity, evidence, detectedAt, stableKey = '' }) {
  return {
    issueId: generateIssueId(issueType, entityRef.id, stableKey),
    issueType,
    entityRef,
    severity,
    evidence,
    detectedAt,
    // Legacy compatibility fields
    type: issueType,
    entity: entityRef,
    explain: evidence.explain
  };
}

// =============================================================================
// ISSUE DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect runway issues
 */
function detectRunwayIssues(company, now) {
  const issues = [];
  
  const runway = deriveRunway(
    company.cash,
    company.burn,
    company.asOf,
    company.asOf,
    now
  );

  if (runway.value === null) {
    issues.push(createIssue({
      issueType: ISSUE_TYPES.DATA_MISSING,
      entityRef: { type: 'company', id: company.id },
      severity: SEVERITY.HIGH,
      evidence: {
        field: 'runway',
        reason: 'missing_inputs',
        inputs_missing: runway.inputs_missing,
        explain: 'Cannot calculate runway: missing cash or burn data'
      },
      detectedAt: now.toISOString()
    }));
    return issues;
  }

  if (runway.value !== Infinity) {
    if (runway.value < THRESHOLDS.RUNWAY_CRITICAL_MONTHS) {
      issues.push(createIssue({
        issueType: ISSUE_TYPES.RUNWAY_CRITICAL,
        entityRef: { type: 'company', id: company.id },
        severity: SEVERITY.CRITICAL,
        evidence: {
          value: runway.value,
          threshold: THRESHOLDS.RUNWAY_CRITICAL_MONTHS,
          explain: `Runway ${runway.value.toFixed(1)} months < ${THRESHOLDS.RUNWAY_CRITICAL_MONTHS} month critical threshold`
        },
        detectedAt: now.toISOString()
      }));
    } else if (runway.value < THRESHOLDS.RUNWAY_WARNING_MONTHS) {
      issues.push(createIssue({
        issueType: ISSUE_TYPES.RUNWAY_WARNING,
        entityRef: { type: 'company', id: company.id },
        severity: SEVERITY.HIGH,
        evidence: {
          value: runway.value,
          threshold: THRESHOLDS.RUNWAY_WARNING_MONTHS,
          explain: `Runway ${runway.value.toFixed(1)} months < ${THRESHOLDS.RUNWAY_WARNING_MONTHS} month warning threshold`
        },
        detectedAt: now.toISOString()
      }));
    }
  }

  return issues;
}

/**
 * Detect goal issues using trajectory
 */
function detectGoalIssues(company, now) {
  const issues = [];
  const goals = company.goals || [];

  // E2: NO_GOALS is an absence issue
  if (goals.length === 0) {
    issues.push(createIssue({
      issueType: ISSUE_TYPES.NO_GOALS,
      entityRef: { type: 'company', id: company.id },
      severity: SEVERITY.MEDIUM,
      evidence: {
        reason: 'no_goals_defined',
        explain: 'No goals defined - cannot track progress'
      },
      detectedAt: now.toISOString()
    }));
    return issues;
  }

  for (const goal of goals) {
    if (goal.status !== 'active') continue;

    const trajectory = deriveTrajectory(goal, now);
    const dueDate = new Date(goal.due);
    const daysToDeadline = daysBetween(now, dueDate);

    // Goal already missed
    if (daysToDeadline < 0 && goal.current < goal.target) {
      issues.push(createIssue({
        issueType: ISSUE_TYPES.GOAL_MISSED,
        entityRef: { type: 'goal', id: goal.id, companyId: company.id },
        severity: SEVERITY.HIGH,
        evidence: {
          goalName: goal.name || goal.type,
          current: goal.current,
          target: goal.target,
          due: goal.due,
          daysOverdue: Math.abs(daysToDeadline),
          explain: trajectory.explain
        },
        detectedAt: now.toISOString()
      }));
      continue;
    }

    // Check trajectory status
    if (trajectory.onTrack === false) {
      if (trajectory.projectedDate === null) {
        // Stalled (zero/negative velocity)
        issues.push(createIssue({
          issueType: ISSUE_TYPES.GOAL_STALLED,
          entityRef: { type: 'goal', id: goal.id, companyId: company.id },
          severity: SEVERITY.HIGH,
          evidence: {
            goalName: goal.name || goal.type,
            current: goal.current,
            target: goal.target,
            due: goal.due,
            explain: trajectory.explain
          },
          detectedAt: now.toISOString()
        }));
      } else {
        // Behind schedule
        const severity = daysToDeadline < THRESHOLDS.GOAL_DEADLINE_BUFFER_DAYS 
          ? SEVERITY.CRITICAL 
          : SEVERITY.HIGH;
        
        issues.push(createIssue({
          issueType: ISSUE_TYPES.GOAL_BEHIND,
          entityRef: { type: 'goal', id: goal.id, companyId: company.id },
          severity,
          evidence: {
            goalName: goal.name || goal.type,
            current: goal.current,
            target: goal.target,
            due: goal.due,
            projectedDate: trajectory.projectedDate,
            confidence: trajectory.confidence,
            explain: trajectory.explain
          },
          detectedAt: now.toISOString()
        }));
      }
    }

    // Unknown trajectory (insufficient data)
    if (trajectory.onTrack === null) {
      issues.push(createIssue({
        issueType: ISSUE_TYPES.GOAL_NO_HISTORY,
        entityRef: { type: 'goal', id: goal.id, companyId: company.id },
        severity: SEVERITY.LOW,
        evidence: {
          goalName: goal.name || goal.type,
          reason: 'insufficient_history',
          explain: trajectory.explain
        },
        detectedAt: now.toISOString()
      }));
    }
  }

  return issues;
}

/**
 * Detect deal pipeline issues
 */
function detectDealIssues(company, now) {
  const issues = [];
  const deals = company.deals || [];

  // Check if raising but no/insufficient pipeline
  if (company.raising && company.roundTarget > 0) {
    const totalPipeline = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const weightedPipeline = deals.reduce((sum, d) => 
      sum + (d.amount || 0) * (d.probability || 0) / 100, 0
    );

    if (deals.length === 0) {
      issues.push(createIssue({
        issueType: ISSUE_TYPES.NO_PIPELINE,
        entityRef: { type: 'company', id: company.id },
        severity: SEVERITY.CRITICAL,
        evidence: {
          roundTarget: company.roundTarget,
          reason: 'no_deals',
          explain: `Raising $${(company.roundTarget/1000000).toFixed(1)}M but no deals in pipeline`
        },
        detectedAt: now.toISOString()
      }));
    } else if (weightedPipeline < company.roundTarget * 0.5) {
      issues.push(createIssue({
        issueType: ISSUE_TYPES.PIPELINE_GAP,
        entityRef: { type: 'company', id: company.id },
        severity: SEVERITY.HIGH,
        evidence: {
          roundTarget: company.roundTarget,
          weightedPipeline,
          coverage: weightedPipeline / company.roundTarget,
          explain: `Weighted pipeline $${(weightedPipeline/1000000).toFixed(1)}M < 50% of $${(company.roundTarget/1000000).toFixed(1)}M target`
        },
        detectedAt: now.toISOString()
      }));
    }
  }

  // Check individual deal health
  for (const deal of deals) {
    const daysSinceUpdate = daysBetween(deal.asOf, now);

    // Stale deal
    if (daysSinceUpdate > THRESHOLDS.DEAL_STALE_DAYS) {
      issues.push(createIssue({
        issueType: ISSUE_TYPES.DEAL_STALE,
        entityRef: { type: 'deal', id: deal.id, companyId: company.id },
        severity: SEVERITY.MEDIUM,
        evidence: {
          investor: deal.investor,
          daysSinceUpdate,
          threshold: THRESHOLDS.DEAL_STALE_DAYS,
          explain: `Deal with ${deal.investor} not updated in ${daysSinceUpdate} days`
        },
        detectedAt: now.toISOString()
      }));
    }

    // Low probability deals in late stages
    if (deal.status === 'dd' && deal.probability < 50) {
      issues.push(createIssue({
        issueType: ISSUE_TYPES.DEAL_AT_RISK,
        entityRef: { type: 'deal', id: deal.id, companyId: company.id },
        severity: SEVERITY.MEDIUM,
        evidence: {
          investor: deal.investor,
          status: deal.status,
          probability: deal.probability,
          explain: `Deal with ${deal.investor} in DD but only ${deal.probability}% probability`
        },
        detectedAt: now.toISOString()
      }));
    }
  }

  return issues;
}

/**
 * Detect data staleness issues
 */
function detectDataIssues(company, now) {
  const issues = [];

  if (!company.asOf) {
    issues.push(createIssue({
      issueType: ISSUE_TYPES.DATA_NO_TIMESTAMP,
      entityRef: { type: 'company', id: company.id },
      severity: SEVERITY.HIGH,
      evidence: {
        reason: 'no_timestamp',
        explain: 'Company data has no timestamp - freshness unknown'
      },
      detectedAt: now.toISOString()
    }));
    return issues;
  }

  const daysSinceUpdate = daysBetween(company.asOf, now);
  
  if (daysSinceUpdate > THRESHOLDS.DATA_STALE_DAYS) {
    issues.push(createIssue({
      issueType: ISSUE_TYPES.DATA_STALE,
      entityRef: { type: 'company', id: company.id },
      severity: SEVERITY.MEDIUM,
      evidence: {
        daysSinceUpdate,
        threshold: THRESHOLDS.DATA_STALE_DAYS,
        explain: `Company data ${daysSinceUpdate} days old (threshold: ${THRESHOLDS.DATA_STALE_DAYS})`
      },
      detectedAt: now.toISOString()
    }));
  }

  return issues;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Detect all issues for a company
 * 
 * @param {Object} company - Company with facts
 * @param {Date} [now] - Reference date
 * @returns {{issues: Array, summary: Object}}
 */
export function detectIssues(company, now = new Date()) {
  const refDate = typeof now === 'string' ? new Date(now) : now;

  const allIssues = [
    ...detectRunwayIssues(company, refDate),
    ...detectGoalIssues(company, refDate),
    ...detectDealIssues(company, refDate),
    ...detectDataIssues(company, refDate)
  ];

  // Sort by severity (highest first)
  allIssues.sort((a, b) => b.severity - a.severity);

  // Generate summary
  const summary = {
    total: allIssues.length,
    critical: allIssues.filter(i => i.severity === SEVERITY.CRITICAL).length,
    high: allIssues.filter(i => i.severity === SEVERITY.HIGH).length,
    medium: allIssues.filter(i => i.severity === SEVERITY.MEDIUM).length,
    low: allIssues.filter(i => i.severity === SEVERITY.LOW).length,
    types: [...new Set(allIssues.map(i => i.issueType))]
  };

  return { issues: allIssues, summary };
}

/**
 * Detect issues across entire portfolio
 * 
 * @param {Array<Object>} companies 
 * @param {Date} [now]
 * @returns {{byCompany: Object, portfolio: Object}}
 */
export function detectPortfolioIssues(companies, now = new Date()) {
  const refDate = typeof now === 'string' ? new Date(now) : now;
  
  const byCompany = {};
  let allIssues = [];

  for (const company of companies) {
    const result = detectIssues(company, refDate);
    byCompany[company.id] = result;
    allIssues = allIssues.concat(result.issues);
  }

  // Sort all issues by severity
  allIssues.sort((a, b) => b.severity - a.severity);

  const portfolio = {
    total: allIssues.length,
    critical: allIssues.filter(i => i.severity === SEVERITY.CRITICAL).length,
    high: allIssues.filter(i => i.severity === SEVERITY.HIGH).length,
    medium: allIssues.filter(i => i.severity === SEVERITY.MEDIUM).length,
    low: allIssues.filter(i => i.severity === SEVERITY.LOW).length,
    topIssues: allIssues.slice(0, 10)
  };

  return { byCompany, portfolio };
}

export default { detectIssues, detectPortfolioIssues, SEVERITY, ISSUE_TYPES };
