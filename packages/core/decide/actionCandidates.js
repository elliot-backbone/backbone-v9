/**
 * actionCandidates.js ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Action Generation (Phase 3.2)
 * 
 * Generates candidate actions from:
 * - Issues (reactive)
 * - Pre-Issues (preventative)
 * - Goals (offensive/value-creating)
 * 
 * Actions are the primary decisioning object.
 * Derived output - never persisted.
 * 
 * @module actionCandidates
 */

import { getResolution, getResolutionById, RESOLUTIONS } from '../predict/resolutions.js';
import { createAction } from '../predict/actionSchema.js';

// =============================================================================
// PREVENTATIVE RESOLUTION TEMPLATES (for pre-issues)
// =============================================================================

export const PREVENTATIVE_RESOLUTIONS = {
  REDUCE_BURN: {
    resolutionId: 'REDUCE_BURN',
    title: 'Reduce burn rate',
    defaultEffort: 7,
    defaultImpact: 0.7,
    effectiveness: 0.7,
    actionSteps: [
      'Review all expense categories',
      'Identify non-essential costs',
      'Negotiate with vendors',
      'Implement cost reductions'
    ]
  },
  ACCELERATE_FUNDRAISE: {
    resolutionId: 'ACCELERATE_FUNDRAISE',
    title: 'Accelerate fundraising',
    defaultEffort: 14,
    defaultImpact: 0.8,
    effectiveness: 0.8,
    actionSteps: [
      'Expand investor pipeline',
      'Increase outreach velocity',
      'Fast-track promising leads',
      'Consider bridge financing'
    ]
  },
  BRIDGE_ROUND: {
    resolutionId: 'BRIDGE_ROUND',
    title: 'Secure bridge round',
    defaultEffort: 21,
    defaultImpact: 0.9,
    effectiveness: 0.9,
    actionSteps: [
      'Reach out to existing investors',
      'Prepare bridge terms',
      'Negotiate and close quickly',
      'Update cap table'
    ]
  },
  ACCELERATE_GOAL: {
    resolutionId: 'ACCELERATE_GOAL',
    title: 'Accelerate goal progress',
    defaultEffort: 7,
    defaultImpact: 0.6,
    effectiveness: 0.6,
    actionSteps: [
      'Identify acceleration levers',
      'Reallocate resources',
      'Remove blockers',
      'Track daily progress'
    ]
  },
  REVISE_TARGET: {
    resolutionId: 'REVISE_TARGET',
    title: 'Revise goal target',
    defaultEffort: 1,
    defaultImpact: 0.4,
    effectiveness: 0.4,
    actionSteps: [
      'Assess realistic attainment',
      'Propose revised target',
      'Document rationale',
      'Update goal in system'
    ]
  },
  ADD_RESOURCES: {
    resolutionId: 'ADD_RESOURCES',
    title: 'Add resources to goal',
    defaultEffort: 14,
    defaultImpact: 0.7,
    effectiveness: 0.7,
    actionSteps: [
      'Identify resource gaps',
      'Hire or reassign team members',
      'Provide necessary tools/budget',
      'Monitor progress lift'
    ]
  },
  FOLLOW_UP_INVESTOR: {
    resolutionId: 'FOLLOW_UP_INVESTOR',
    title: 'Follow up with investor',
    defaultEffort: 0.5,
    defaultImpact: 0.5,
    effectiveness: 0.5,
    actionSteps: [
      'Send check-in email',
      'Provide recent updates',
      'Ask about timeline',
      'Confirm next steps'
    ]
  },
  SCHEDULE_CHECK_IN: {
    resolutionId: 'SCHEDULE_CHECK_IN',
    title: 'Schedule investor check-in',
    defaultEffort: 0.25,
    defaultImpact: 0.4,
    effectiveness: 0.4,
    actionSteps: [
      'Propose call time',
      'Prepare talking points',
      'Conduct call',
      'Document outcomes'
    ]
  },
  PREPARE_ALTERNATIVES: {
    resolutionId: 'PREPARE_ALTERNATIVES',
    title: 'Prepare alternative investors',
    defaultEffort: 3,
    defaultImpact: 0.6,
    effectiveness: 0.6,
    actionSteps: [
      'Identify backup investors',
      'Warm them up',
      'Prepare to pivot if needed'
    ]
  }
};

// =============================================================================
// GOAL ACTION TEMPLATES
// =============================================================================

export const GOAL_RESOLUTIONS = {
  REVENUE_PUSH: {
    resolutionId: 'REVENUE_PUSH',
    title: 'Push revenue acceleration',
    defaultEffort: 14,
    defaultImpact: 0.7,
    effectiveness: 0.7,
    actionSteps: [
      'Review sales pipeline',
      'Identify quick wins',
      'Accelerate deal closing',
      'Increase outreach'
    ]
  },
  PRODUCT_SPRINT: {
    resolutionId: 'PRODUCT_SPRINT',
    title: 'Sprint to product milestone',
    defaultEffort: 14,
    defaultImpact: 0.6,
    effectiveness: 0.6,
    actionSteps: [
      'Define sprint scope',
      'Allocate engineering',
      'Clear blockers daily',
      'Track to milestone'
    ]
  },
  HIRING_PUSH: {
    resolutionId: 'HIRING_PUSH',
    title: 'Accelerate hiring',
    defaultEffort: 21,
    defaultImpact: 0.5,
    effectiveness: 0.5,
    actionSteps: [
      'Expand sourcing channels',
      'Speed up interview process',
      'Make competitive offers',
      'Onboard quickly'
    ]
  },
  PARTNERSHIP_OUTREACH: {
    resolutionId: 'PARTNERSHIP_OUTREACH',
    title: 'Expand partnership outreach',
    defaultEffort: 14,
    defaultImpact: 0.6,
    effectiveness: 0.6,
    actionSteps: [
      'Identify target partners',
      'Prepare partnership materials',
      'Initiate conversations',
      'Drive to commitment'
    ]
  },
  FUNDRAISE_CLOSE: {
    resolutionId: 'FUNDRAISE_CLOSE',
    title: 'Drive to fundraise close',
    defaultEffort: 30,
    defaultImpact: 0.9,
    effectiveness: 0.9,
    actionSteps: [
      'Finalize lead investor',
      'Complete due diligence',
      'Negotiate terms',
      'Execute closing'
    ]
  }
};

// =============================================================================
// ACTION GENERATION FROM ISSUES
// =============================================================================

/**
 * Generate action from an issue
 * @param {Object} issue 
 * @param {string} companyId 
 * @param {string} companyName 
 * @param {string} createdAt 
 * @returns {Object|null} Action candidate (without impact model)
 */
function generateActionFromIssue(issue, companyId, companyName, createdAt) {
  const resolution = getResolution(issue.issueType);
  if (!resolution) return null;
  
  return createAction({
    entityRef: { type: 'company', id: companyId },
    title: `${companyName}: ${resolution.title}`,
    sources: [{
      sourceType: 'ISSUE',
      issueId: issue.issueId,
      issueType: issue.issueType
    }],
    resolutionId: resolution.resolutionId,
    steps: resolution.actionSteps,
    impact: null, // Will be attached by actionImpact.js
    createdAt
  });
}

// =============================================================================
// ACTION GENERATION FROM PRE-ISSUES
// =============================================================================

/**
 * Generate actions from a pre-issue
 * @param {Object} preissue 
 * @param {string} createdAt 
 * @returns {Object[]} Action candidates
 */
function generateActionsFromPreIssue(preissue, createdAt) {
  const actions = [];
  
  for (const resolutionKey of preissue.preventativeActions || []) {
    const resolution = PREVENTATIVE_RESOLUTIONS[resolutionKey];
    if (!resolution) continue;
    
    actions.push(createAction({
      entityRef: preissue.entityRef,
      title: `${preissue.companyName}: ${resolution.title} (preventative)`,
      sources: [{
        sourceType: 'PREISSUE',
        preIssueId: preissue.preIssueId,
        preIssueType: preissue.preIssueType
      }],
      resolutionId: resolution.resolutionId,
      steps: resolution.actionSteps,
      impact: null,
      createdAt
    }));
  }
  
  return actions;
}

// =============================================================================
// ACTION GENERATION FROM GOALS
// =============================================================================

/**
 * Map goal type to resolution
 * @param {string} goalType 
 * @returns {Object|null}
 */
function getGoalResolution(goalType) {
  const mapping = {
    revenue: GOAL_RESOLUTIONS.REVENUE_PUSH,
    product: GOAL_RESOLUTIONS.PRODUCT_SPRINT,
    hiring: GOAL_RESOLUTIONS.HIRING_PUSH,
    partnership: GOAL_RESOLUTIONS.PARTNERSHIP_OUTREACH,
    fundraise: GOAL_RESOLUTIONS.FUNDRAISE_CLOSE
  };
  return mapping[goalType] || GOAL_RESOLUTIONS.REVENUE_PUSH;
}

/**
 * Generate action from goal trajectory
 * Only generates if goal is achievable but needs push
 * @param {Object} trajectory - GoalTrajectory
 * @param {string} createdAt 
 * @returns {Object|null} Action candidate
 */
function generateActionFromGoal(trajectory, createdAt) {
  // Don't generate action if already on track or already achieved
  if (trajectory.onTrack === true && trajectory.probabilityOfHit > 0.8) return null;
  
  // Don't generate if goal is missed (would be an issue)
  if (trajectory.daysLeft !== null && trajectory.daysLeft < 0) return null;
  
  const resolution = getGoalResolution(trajectory.goalType);
  
  return createAction({
    entityRef: { type: 'company', id: trajectory.companyId },
    title: `${trajectory.companyName}: ${resolution.title} for ${trajectory.goalName}`,
    sources: [{
      sourceType: 'GOAL',
      goalId: trajectory.goalId,
      metricKey: trajectory.metricKey
    }],
    resolutionId: resolution.resolutionId,
    steps: resolution.actionSteps,
    impact: null,
    createdAt
  });
}

// =============================================================================
// MAIN GENERATION
// =============================================================================

/**
 * Generate all action candidates for a company
 * @param {Object} params
 * @param {Object[]} params.issues - From issues.js
 * @param {Object[]} params.preissues - From preissues.js
 * @param {Object[]} params.goalTrajectories - From goalTrajectory.js
 * @param {string} params.companyId
 * @param {string} params.companyName
 * @param {string} params.createdAt
 * @returns {Object[]} Action candidates
 */
export function generateCompanyActionCandidates({
  issues,
  preissues,
  goalTrajectories,
  companyId,
  companyName,
  createdAt
}) {
  const candidates = [];
  
  // From issues
  for (const issue of issues) {
    const action = generateActionFromIssue(issue, companyId, companyName, createdAt);
    if (action) candidates.push(action);
  }
  
  // From pre-issues
  for (const preissue of preissues) {
    const actions = generateActionsFromPreIssue(preissue, createdAt);
    candidates.push(...actions);
  }
  
  // From goals
  for (const trajectory of goalTrajectories) {
    const action = generateActionFromGoal(trajectory, createdAt);
    if (action) candidates.push(action);
  }
  
  return candidates;
}

/**
 * Generate all action candidates for portfolio
 * @param {Object} params
 * @param {Object[]} params.companies
 * @param {Object} params.issuesByCompany
 * @param {Object} params.preissuesByCompany
 * @param {Object} params.goalTrajectoriesByCompany
 * @param {string} params.createdAt
 * @returns {{ byCompany: Object, all: Object[] }}
 */
export function generatePortfolioActionCandidates({
  companies,
  issuesByCompany,
  preissuesByCompany,
  goalTrajectoriesByCompany,
  createdAt
}) {
  const byCompany = {};
  const all = [];
  
  for (const company of companies) {
    const candidates = generateCompanyActionCandidates({
      issues: issuesByCompany[company.id] || [],
      preissues: preissuesByCompany[company.id] || [],
      goalTrajectories: goalTrajectoriesByCompany[company.id] || [],
      companyId: company.id,
      companyName: company.name,
      createdAt
    });
    byCompany[company.id] = candidates;
    all.push(...candidates);
  }
  
  return { byCompany, all };
}

/**
 * Get resolution by ID (includes preventative and goal resolutions)
 * @param {string} resolutionId 
 * @returns {Object|null}
 */
export function getAnyResolution(resolutionId) {
  return RESOLUTIONS[resolutionId] || 
         PREVENTATIVE_RESOLUTIONS[resolutionId] || 
         GOAL_RESOLUTIONS[resolutionId] || 
         null;
}

export default {
  PREVENTATIVE_RESOLUTIONS,
  GOAL_RESOLUTIONS,
  generateCompanyActionCandidates,
  generatePortfolioActionCandidates,
  getAnyResolution
};
