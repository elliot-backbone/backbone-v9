/**
 * ripple.js - Ripple Effect Engine (Phase H)
 * 
 * DOCTRINE: Predictive > Reactive (Scaffolded)
 * Ripple and likelihood may be primitive, but the architecture must allow them.
 * 
 * H1: v0 Rule-Based Ripple
 * - Runway issues -> insolvency risk
 * - Pipeline issues -> fundraise risk  
 * - Data staleness -> confidence penalty
 * 
 * Output:
 * - rippleScore (0-1)
 * - rippleExplain[]
 * 
 * H2: Priority Incorporates Ripple
 * - Ripple affects rank explicitly
 * 
 * @module ripple
 */

import { ISSUE_TYPES } from './issues.js';

// =============================================================================
// RIPPLE RULES (v0)
// =============================================================================

/**
 * Rule-based ripple effects
 * Each rule: condition -> downstream consequence
 */
const RIPPLE_RULES = {
  // Runway issues cascade to insolvency
  RUNWAY_CRITICAL: {
    rippleScore: 0.9,
    consequences: [
      'High probability of insolvency within 6 months',
      'Unable to make new hires or investments',
      'Fundraise becomes distressed/down round',
      'Team morale and retention at risk'
    ]
  },
  
  RUNWAY_WARNING: {
    rippleScore: 0.5,
    consequences: [
      'Fundraise pressure increases',
      'Strategic optionality reduced',
      'May need to cut non-critical expenses'
    ]
  },
  
  // Pipeline issues cascade to fundraise failure
  NO_PIPELINE: {
    rippleScore: 0.8,
    consequences: [
      'Fundraise timeline at severe risk',
      'May need to extend runway via cuts',
      'Negotiating leverage diminished'
    ]
  },
  
  PIPELINE_GAP: {
    rippleScore: 0.5,
    consequences: [
      'Fundraise may miss target or timeline',
      'May need to accept less favorable terms'
    ]
  },
  
  // Goal issues cascade to metrics/narrative
  GOAL_MISSED: {
    rippleScore: 0.4,
    consequences: [
      'Investor confidence may decrease',
      'Narrative for fundraise weakened'
    ]
  },
  
  GOAL_BEHIND: {
    rippleScore: 0.3,
    consequences: [
      'May miss key milestones',
      'Investor updates less compelling'
    ]
  },
  
  GOAL_STALLED: {
    rippleScore: 0.5,
    consequences: [
      'Underlying blocker may be systemic',
      'Team execution capability questioned'
    ]
  },
  
  // Deal issues cascade to specific opportunities
  DEAL_STALE: {
    rippleScore: 0.3,
    consequences: [
      'Investor interest may have cooled',
      'Momentum lost in process'
    ]
  },
  
  DEAL_AT_RISK: {
    rippleScore: 0.4,
    consequences: [
      'May lose this investor entirely',
      'Need to rebuild pipeline'
    ]
  },
  
  // Data issues cascade to decision quality
  DATA_STALE: {
    rippleScore: 0.2,
    consequences: [
      'Decisions based on outdated information',
      'May miss emerging problems'
    ]
  },
  
  DATA_MISSING: {
    rippleScore: 0.3,
    consequences: [
      'Cannot assess true state',
      'Blind spots in portfolio view'
    ]
  },
  
  // Default for unmapped issues
  DEFAULT: {
    rippleScore: 0.1,
    consequences: ['Minor downstream effects possible']
  }
};

// =============================================================================
// RIPPLE CALCULATION
// =============================================================================

/**
 * Calculate ripple effect for a single issue
 * 
 * @param {Object} issue 
 * @returns {{rippleScore: number, rippleExplain: string[]}}
 */
export function calculateIssueRipple(issue) {
  const rule = RIPPLE_RULES[issue.issueType] || RIPPLE_RULES.DEFAULT;
  
  return {
    rippleScore: rule.rippleScore,
    rippleExplain: rule.consequences
  };
}

/**
 * Calculate aggregate ripple for a set of issues
 * Uses max ripple with diminishing returns for additional issues
 * 
 * @param {Array<Object>} issues 
 * @returns {{rippleScore: number, rippleExplain: string[], byIssue: Object[]}}
 */
export function calculateAggregateRipple(issues) {
  if (!issues || issues.length === 0) {
    return {
      rippleScore: 0,
      rippleExplain: ['No issues detected'],
      byIssue: []
    };
  }

  const byIssue = issues.map(issue => ({
    issueId: issue.issueId,
    issueType: issue.issueType,
    ...calculateIssueRipple(issue)
  }));

  // Sort by ripple score descending
  byIssue.sort((a, b) => b.rippleScore - a.rippleScore);

  // Aggregate: max + diminishing contribution from others
  let aggregateScore = 0;
  const allExplanations = [];
  
  for (let i = 0; i < byIssue.length; i++) {
    const issue = byIssue[i];
    // First issue contributes full score, subsequent issues contribute less
    const contribution = issue.rippleScore * Math.pow(0.5, i);
    aggregateScore += contribution;
    
    // Only include explanations from significant ripples
    if (issue.rippleScore >= 0.3) {
      allExplanations.push(...issue.rippleExplain);
    }
  }

  // Cap at 1.0
  aggregateScore = Math.min(aggregateScore, 1.0);
  aggregateScore = Math.round(aggregateScore * 100) / 100;

  return {
    rippleScore: aggregateScore,
    rippleExplain: [...new Set(allExplanations)], // Deduplicate
    byIssue
  };
}

/**
 * Calculate ripple for a company based on its issues
 * 
 * @param {Object} company 
 * @param {Array<Object>} issues - Pre-detected issues for this company
 * @returns {{rippleScore: number, rippleExplain: string[], riskLevel: string}}
 */
export function calculateCompanyRipple(company, issues) {
  const ripple = calculateAggregateRipple(issues);
  
  // Determine risk level
  let riskLevel;
  if (ripple.rippleScore >= 0.7) {
    riskLevel = 'HIGH';
  } else if (ripple.rippleScore >= 0.4) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return {
    companyId: company.id,
    companyName: company.name,
    rippleScore: ripple.rippleScore,
    rippleExplain: ripple.rippleExplain,
    riskLevel,
    byIssue: ripple.byIssue
  };
}

/**
 * Adjust priority score based on ripple effect
 * H2: Priority Incorporates Ripple
 * 
 * @param {number} basePriority - Original priority score
 * @param {number} rippleScore - Ripple score 0-1
 * @param {number} [weight=0.2] - How much ripple affects priority
 * @returns {number}
 */
export function adjustPriorityForRipple(basePriority, rippleScore, weight = 0.2) {
  // Ripple boosts priority of high-ripple issues
  const adjustment = rippleScore * weight;
  const adjusted = basePriority * (1 + adjustment);
  return Math.round(adjusted * 100) / 100;
}

export default {
  calculateIssueRipple,
  calculateAggregateRipple,
  calculateCompanyRipple,
  adjustPriorityForRipple,
  RIPPLE_RULES
};
