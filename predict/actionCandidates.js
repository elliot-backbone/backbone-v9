/**
 * actionCandidates.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Action Generation (Phase 3.2)
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

import { getResolution, getResolutionById, RESOLUTIONS } from './resolutions.js';
import { createAction } from './actionSchema.js';

// =============================================================================
// PREVENTATIVE RESOLUTION TEMPLATES (for pre-issues)
// =============================================================================

export const PREVENTATIVE_RESOLUTIONS = {
  REDUCE_BURN: {
    resolutionId: 'REDUCE_BURN',
    title: 'Reduce burn rate',
    defaultEffort: 7,
    defaultImpact: 0.7,
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
    actionSteps: [
      'Identify backup investors',
      'Warm them up',
      'Prepare to pivot if needed'
    ]
  },
  
  // NEW: Firm relationship resolutions
  SCHEDULE_TOUCHPOINT: {
    resolutionId: 'SCHEDULE_TOUCHPOINT',
    title: 'Schedule relationship touchpoint',
    defaultEffort: 0.5,
    defaultImpact: 0.4,
    actionSteps: [
      'Review relationship history',
      'Identify reason for touchpoint',
      'Send calendar invite',
      'Prepare talking points'
    ]
  },
  SEND_UPDATE: {
    resolutionId: 'SEND_UPDATE',
    title: 'Send portfolio update',
    defaultEffort: 1,
    defaultImpact: 0.35,
    actionSteps: [
      'Compile recent news/progress',
      'Draft personalized update',
      'Send email',
      'Note in CRM'
    ]
  },
  REQUEST_MEETING: {
    resolutionId: 'REQUEST_MEETING',
    title: 'Request in-person meeting',
    defaultEffort: 2,
    defaultImpact: 0.5,
    actionSteps: [
      'Draft meeting request',
      'Propose multiple times',
      'Prepare agenda',
      'Confirm logistics'
    ]
  },
  
  // NEW: Round stall resolutions
  ACCELERATE_OUTREACH: {
    resolutionId: 'ACCELERATE_OUTREACH',
    title: 'Accelerate investor outreach',
    defaultEffort: 3,
    defaultImpact: 0.65,
    actionSteps: [
      'Identify 10 new prospects',
      'Send warm intros',
      'Schedule meetings this week',
      'Follow up aggressively'
    ]
  },
  EXPAND_INVESTOR_LIST: {
    resolutionId: 'EXPAND_INVESTOR_LIST',
    title: 'Expand investor target list',
    defaultEffort: 2,
    defaultImpact: 0.5,
    actionSteps: [
      'Research additional funds',
      'Identify angel networks',
      'Add to pipeline',
      'Prioritize and sequence'
    ]
  },
  REVISIT_TERMS: {
    resolutionId: 'REVISIT_TERMS',
    title: 'Revisit round terms',
    defaultEffort: 3,
    defaultImpact: 0.55,
    actionSteps: [
      'Review market comparables',
      'Identify sticking points',
      'Propose adjusted terms',
      'Socialize with leads'
    ]
  },
  
  // NEW: Lead vacancy resolutions
  PRIORITIZE_LEAD_CANDIDATES: {
    resolutionId: 'PRIORITIZE_LEAD_CANDIDATES',
    title: 'Prioritize lead investor candidates',
    defaultEffort: 2,
    defaultImpact: 0.6,
    actionSteps: [
      'Rank investors by lead potential',
      'Assess check sizes',
      'Identify decision makers',
      'Focus energy on top 3'
    ]
  },
  OFFER_LEAD_TERMS: {
    resolutionId: 'OFFER_LEAD_TERMS',
    title: 'Offer lead investor terms',
    defaultEffort: 3,
    defaultImpact: 0.65,
    actionSteps: [
      'Prepare term sheet template',
      'Offer board seat if needed',
      'Discuss governance preferences',
      'Create urgency with timeline'
    ]
  },
  EXPAND_SEARCH: {
    resolutionId: 'EXPAND_SEARCH',
    title: 'Expand lead investor search',
    defaultEffort: 5,
    defaultImpact: 0.5,
    actionSteps: [
      'Research non-obvious leads',
      'Consider strategic investors',
      'Explore international funds',
      'Reach out to portfolio founders'
    ]
  },
  
  // NEW: Dormant relationship resolutions
  SEND_TOUCHPOINT: {
    resolutionId: 'SEND_TOUCHPOINT',
    title: 'Send relationship touchpoint',
    defaultEffort: 0.25,
    defaultImpact: 0.3,
    actionSteps: [
      'Draft brief personal message',
      'Reference shared interest/news',
      'Send via preferred channel',
      'Log interaction'
    ]
  },
  SCHEDULE_CALL: {
    resolutionId: 'SCHEDULE_CALL',
    title: 'Schedule catch-up call',
    defaultEffort: 1,
    defaultImpact: 0.45,
    actionSteps: [
      'Propose call time',
      'Send calendar invite',
      'Prepare talking points',
      'Follow up if no response'
    ]
  },
  FIND_REASON_TO_CONNECT: {
    resolutionId: 'FIND_REASON_TO_CONNECT',
    title: 'Find reason to re-connect',
    defaultEffort: 1,
    defaultImpact: 0.4,
    actionSteps: [
      'Research recent activity',
      'Identify shared connections',
      'Find relevant news or intro',
      'Craft personalized outreach'
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
  
  // For goal-related issues, include the goalId in sources
  const goalId = issue.entityRef?.type === 'goal' ? issue.entityRef.id : null;
  
  return createAction({
    entityRef: { type: 'company', id: companyId, name: companyName },
    title: `${companyName}: ${resolution.title}`,
    sources: [{
      sourceType: 'ISSUE',
      issueId: issue.issueId,
      issueType: issue.issueType,
      ...(goalId && { goalId }) // Include goalId if this is a goal-related issue
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
  
  // Build context-aware prefix from preissue type
  const contextPrefix = getPreissueContextPrefix(preissue);
  
  for (const resolutionKey of preissue.preventativeActions || []) {
    // Look up in both PREVENTATIVE_RESOLUTIONS and GOAL_RESOLUTIONS
    const resolution = PREVENTATIVE_RESOLUTIONS[resolutionKey] || GOAL_RESOLUTIONS[resolutionKey];
    if (!resolution) continue;
    
    // Generate title with context
    // e.g., "CloudOps Series A: Accelerate outreach" instead of "CloudOps: Accelerate investor outreach (preventative)"
    const title = contextPrefix 
      ? `${preissue.companyName} ${contextPrefix}: ${resolution.title}`
      : `${preissue.companyName}: ${resolution.title}`;
    
    actions.push(createAction({
      entityRef: { ...preissue.entityRef, name: preissue.companyName },
      title,
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

/**
 * Get context prefix based on preissue type
 */
function getPreissueContextPrefix(preissue) {
  switch (preissue.preIssueType) {
    case 'ROUND_STALL':
    case 'LEAD_VACANCY':
      // Extract round stage from preissue title or entityRef
      if (preissue.roundStage) return preissue.roundStage;
      if (preissue.title?.includes('Seed')) return 'Seed';
      if (preissue.title?.includes('Series A')) return 'Series A';
      if (preissue.title?.includes('Series B')) return 'Series B';
      return 'Round';
    case 'DEAL_STALL':
      // Use investor name if available
      return preissue.investorName || 'Deal';
    case 'GOAL_MISS':
      // Use goal name if available
      return preissue.goalName ? `"${preissue.goalName}"` : 'Goal';
    case 'CONNECTION_DORMANT':
      // Use person name if available
      return preissue.personName || 'Connection';
    default:
      return null;
  }
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
    entityRef: { type: 'company', id: trajectory.companyId, name: trajectory.companyName },
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
