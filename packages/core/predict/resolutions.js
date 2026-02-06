/**
 * resolutions.js - Resolution Library (Phase F)
 * 
 * F1: Map issue types to resolution templates.
 * F2: No free text - Priorities must reference resolutionId.
 * 
 * Each resolution defines:
 * - resolutionId
 * - title
 * - defaultEffort (days)
 * - defaultImpact (0-1)
 * - actionSteps[]
 * 
 * @module resolutions
 */

import { ISSUE_TYPES } from './issues.js';

// =============================================================================
// RESOLUTION DEFINITIONS
// =============================================================================

export const RESOLUTIONS = {
  // =========================================================================
  // RUNWAY RESOLUTIONS
  // =========================================================================
  
  RESOLVE_RUNWAY_CRITICAL: {
    resolutionId: 'RESOLVE_RUNWAY_CRITICAL',
    issueType: ISSUE_TYPES.RUNWAY_CRITICAL,
    title: 'Emergency runway extension',
    defaultEffort: 30,
    defaultImpact: 1.0,
    actionSteps: [
      'Assess immediate cost reduction options',
      'Identify bridge funding sources',
      'Initiate emergency fundraise conversations',
      'Prepare 30-60-90 day cash plan'
    ]
  },
  
  RESOLVE_RUNWAY_WARNING: {
    resolutionId: 'RESOLVE_RUNWAY_WARNING',
    issueType: ISSUE_TYPES.RUNWAY_WARNING,
    title: 'Plan runway extension',
    defaultEffort: 14,
    defaultImpact: 0.7,
    actionSteps: [
      'Review burn rate optimization opportunities',
      'Start fundraise planning if not already',
      'Evaluate revenue acceleration options',
      'Build 6-month financial projection'
    ]
  },
  
  // =========================================================================
  // DATA RESOLUTIONS
  // =========================================================================
  
  RESOLVE_DATA_MISSING: {
    resolutionId: 'RESOLVE_DATA_MISSING',
    issueType: ISSUE_TYPES.DATA_MISSING,
    title: 'Gather missing data',
    defaultEffort: 1,
    defaultImpact: 0.4,
    actionSteps: [
      'Identify missing data fields',
      'Request data from company',
      'Update system with new data',
      'Verify data completeness'
    ]
  },
  
  RESOLVE_DATA_STALE: {
    resolutionId: 'RESOLVE_DATA_STALE',
    issueType: ISSUE_TYPES.DATA_STALE,
    title: 'Request data update',
    defaultEffort: 0.5,
    defaultImpact: 0.3,
    actionSteps: [
      'Request updated metrics from company',
      'Update system timestamps',
      'Flag any significant changes'
    ]
  },
  
  RESOLVE_DATA_NO_TIMESTAMP: {
    resolutionId: 'RESOLVE_DATA_NO_TIMESTAMP',
    issueType: ISSUE_TYPES.DATA_NO_TIMESTAMP,
    title: 'Add data timestamps',
    defaultEffort: 0.25,
    defaultImpact: 0.3,
    actionSteps: [
      'Add asOf timestamp to data',
      'Record provenance information'
    ]
  },
  
  // =========================================================================
  // GOAL RESOLUTIONS
  // =========================================================================
  
  RESOLVE_NO_GOALS: {
    resolutionId: 'RESOLVE_NO_GOALS',
    issueType: ISSUE_TYPES.NO_GOALS,
    title: 'Define measurable goals',
    defaultEffort: 2,
    defaultImpact: 0.5,
    actionSteps: [
      'Schedule goal-setting session with founders',
      'Define 2-3 key metrics with targets',
      'Set deadlines for each goal',
      'Enter goals into system'
    ]
  },
  
  RESOLVE_GOAL_BEHIND: {
    resolutionId: 'RESOLVE_GOAL_BEHIND',
    issueType: ISSUE_TYPES.GOAL_BEHIND,
    title: 'Course correct goal trajectory',
    defaultEffort: 3,
    defaultImpact: 0.6,
    actionSteps: [
      'Analyze root cause of delay',
      'Identify acceleration opportunities',
      'Consider target or deadline adjustment',
      'Implement corrective actions'
    ]
  },
  
  RESOLVE_GOAL_STALLED: {
    resolutionId: 'RESOLVE_GOAL_STALLED',
    issueType: ISSUE_TYPES.GOAL_STALLED,
    title: 'Diagnose and restart stalled goal',
    defaultEffort: 2,
    defaultImpact: 0.7,
    actionSteps: [
      'Identify blockers causing stall',
      'Reallocate resources if needed',
      'Consider goal relevance',
      'Establish new momentum'
    ]
  },
  
  RESOLVE_GOAL_MISSED: {
    resolutionId: 'RESOLVE_GOAL_MISSED',
    issueType: ISSUE_TYPES.GOAL_MISSED,
    title: 'Post-mortem and reset goal',
    defaultEffort: 1,
    defaultImpact: 0.5,
    actionSteps: [
      'Conduct goal post-mortem',
      'Document lessons learned',
      'Decide: abandon, extend, or redefine',
      'Update goal status in system'
    ]
  },
  
  RESOLVE_GOAL_NO_HISTORY: {
    resolutionId: 'RESOLVE_GOAL_NO_HISTORY',
    issueType: ISSUE_TYPES.GOAL_NO_HISTORY,
    title: 'Add historical data points',
    defaultEffort: 0.5,
    defaultImpact: 0.2,
    actionSteps: [
      'Request historical progress data',
      'Add past data points to goal history',
      'Verify trajectory calculation works'
    ]
  },
  
  // =========================================================================
  // PIPELINE RESOLUTIONS
  // =========================================================================
  
  RESOLVE_NO_PIPELINE: {
    resolutionId: 'RESOLVE_NO_PIPELINE',
    issueType: ISSUE_TYPES.NO_PIPELINE,
    title: 'Begin investor outreach',
    defaultEffort: 7,
    defaultImpact: 0.9,
    actionSteps: [
      'Build target investor list',
      'Prepare outreach materials',
      'Start initial outreach',
      'Track responses and schedule meetings'
    ]
  },
  
  RESOLVE_PIPELINE_GAP: {
    resolutionId: 'RESOLVE_PIPELINE_GAP',
    issueType: ISSUE_TYPES.PIPELINE_GAP,
    title: 'Expand investor pipeline',
    defaultEffort: 5,
    defaultImpact: 0.7,
    actionSteps: [
      'Identify additional target investors',
      'Request warm introductions',
      'Increase outreach velocity',
      'Review and optimize materials'
    ]
  },
  
  RESOLVE_DEAL_STALE: {
    resolutionId: 'RESOLVE_DEAL_STALE',
    issueType: ISSUE_TYPES.DEAL_STALE,
    title: 'Follow up with investor',
    defaultEffort: 0.5,
    defaultImpact: 0.5,
    actionSteps: [
      'Send follow-up email or message',
      'Provide any requested updates',
      'Confirm next steps',
      'Update deal status'
    ]
  },
  
  RESOLVE_DEAL_AT_RISK: {
    resolutionId: 'RESOLVE_DEAL_AT_RISK',
    issueType: ISSUE_TYPES.DEAL_AT_RISK,
    title: 'Address investor concerns',
    defaultEffort: 2,
    defaultImpact: 0.6,
    actionSteps: [
      'Schedule call with investor',
      'Identify specific concerns',
      'Prepare responses to objections',
      'Provide additional materials if needed'
    ]
  }
};

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Get resolution for an issue type
 * @param {string} issueType 
 * @returns {Object|null}
 */
export function getResolution(issueType) {
  for (const resolution of Object.values(RESOLUTIONS)) {
    if (resolution.issueType === issueType) {
      return resolution;
    }
  }
  return null;
}

/**
 * Get resolution by ID
 * @param {string} resolutionId 
 * @returns {Object|null}
 */
export function getResolutionById(resolutionId) {
  return RESOLUTIONS[resolutionId] || null;
}

/**
 * Get all resolutions as array
 * @returns {Array<Object>}
 */
export function getAllResolutions() {
  return Object.values(RESOLUTIONS);
}

/**
 * Validate that an issue type has a resolution
 * @param {string} issueType 
 * @returns {boolean}
 */
export function hasResolution(issueType) {
  return getResolution(issueType) !== null;
}

export default {
  RESOLUTIONS,
  getResolution,
  getResolutionById,
  getAllResolutions,
  hasResolution
};
