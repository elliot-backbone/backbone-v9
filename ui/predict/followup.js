/**
 * predict/followup.js Ã¢â‚¬â€ Followup Action Generator (Phase 4.5)
 * 
 * Generates followup Actions for intros that need them.
 * 
 * Rules:
 * - Trigger: outcome status = 'sent' and no response after FOLLOWUP_THRESHOLD_DAYS
 * - Generate exactly ONE followup action per outcome
 * - Link to original action + outcome
 * - Strict deduplication
 * 
 * @module predict/followup
 */

import { createHash } from 'crypto';
import { getOutcomesNeedingFollowup, FOLLOWUP_THRESHOLD_DAYS } from '../raw/introOutcome.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const FOLLOWUP_SOURCE_TYPE = 'FOLLOWUP';

// =============================================================================
// FOLLOWUP GENERATION
// =============================================================================

/**
 * Generate deterministic followup action ID
 * @param {string} originalActionId 
 * @param {string} outcomeId 
 * @returns {string}
 */
function generateFollowupActionId(originalActionId, outcomeId) {
  const hash = createHash('sha256')
    .update(`followup|${originalActionId}|${outcomeId}`)
    .digest('hex')
    .slice(0, 12);
  
  return `followup-${hash}`;
}

/**
 * Generate followup action for an outcome
 * @param {Object} outcome - IntroOutcome needing followup
 * @param {Object} originalAction - Original intro action (optional, for context)
 * @param {Date} now - Current time
 * @returns {Object} - Action object
 */
export function generateFollowupAction(outcome, originalAction = null, now = new Date()) {
  const actionId = generateFollowupActionId(outcome.actionId, outcome.id);
  
  // Calculate days since sent - handle both Date objects and strings
  const sentAt = outcome.statusUpdatedAt instanceof Date 
    ? outcome.statusUpdatedAt 
    : new Date(outcome.statusUpdatedAt);
  const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24));
  
  // Build entity ref
  const entityRef = {
    type: 'person',
    id: outcome.targetPersonId || outcome.targetOrgId
  };
  
  // If we have company context, use that
  if (outcome.companyId) {
    entityRef.type = 'company';
    entityRef.id = outcome.companyId;
  }
  
  // Build action
  return {
    actionId,
    title: `Follow up on introduction to ${outcome.targetPersonId || outcome.targetOrgId}`,
    entityRef,
    sources: [{
      sourceType: FOLLOWUP_SOURCE_TYPE,
      originalActionId: outcome.actionId,
      outcomeId: outcome.id,
      daysSinceSent
    }],
    resolutionId: 'followup-intro',
    steps: [
      `Check if ${outcome.introducerPersonId} has any updates`,
      `Send a polite follow-up message`,
      `Update outcome status based on response`
    ],
    impact: {
      upsideMagnitude: originalAction?.impact?.upsideMagnitude * 0.7 || 30,
      probabilityOfSuccess: 0.25, // Lower probability for followup
      executionProbability: 0.9, // High - easy to execute
      downsideMagnitude: 5, // Low downside
      timeToImpactDays: 7,
      effortCost: 5, // Low effort
      secondOrderLeverage: 0,
      explain: [
        `No response after ${daysSinceSent} days`,
        'Followup can revive stalled intro',
        'Low effort, meaningful upside'
      ]
    },
    createdAt: now.toISOString(),
    // Link to original
    followupFor: {
      actionId: outcome.actionId,
      outcomeId: outcome.id,
      introducerPersonId: outcome.introducerPersonId
    }
  };
}

/**
 * Generate all followup actions needed
 * @param {Object[]} outcomes - All IntroOutcomes
 * @param {Object[]} existingActions - Existing actions (to check for duplicates)
 * @param {Map<string, Object>} originalActionsById - Map of original action IDs to actions
 * @param {Date} now 
 * @returns {Object[]} - New followup actions
 */
export function generateFollowupActions(outcomes, existingActions, originalActionsById = new Map(), now = new Date()) {
  const needingFollowup = getOutcomesNeedingFollowup(outcomes, now);
  const followupActions = [];
  
  // Track existing followup action IDs to avoid duplicates
  const existingFollowupIds = new Set(
    existingActions
      .filter(a => a.sources?.[0]?.sourceType === FOLLOWUP_SOURCE_TYPE)
      .map(a => a.actionId)
  );
  
  for (const outcome of needingFollowup) {
    const actionId = generateFollowupActionId(outcome.actionId, outcome.id);
    
    // Skip if already exists
    if (existingFollowupIds.has(actionId)) continue;
    
    const originalAction = originalActionsById.get(outcome.actionId);
    const followupAction = generateFollowupAction(outcome, originalAction, now);
    
    followupActions.push(followupAction);
    existingFollowupIds.add(actionId); // Prevent duplicates within batch
  }
  
  return followupActions;
}

/**
 * Check if an action is a followup action
 * @param {Object} action 
 * @returns {boolean}
 */
export function isFollowupAction(action) {
  return action.sources?.[0]?.sourceType === FOLLOWUP_SOURCE_TYPE;
}

/**
 * Get original action ID from followup
 * @param {Object} followupAction 
 * @returns {string|null}
 */
export function getOriginalActionId(followupAction) {
  if (!isFollowupAction(followupAction)) return null;
  return followupAction.sources?.[0]?.originalActionId || followupAction.followupFor?.actionId;
}

// =============================================================================
// DEDUPLICATION VERIFICATION
// =============================================================================

/**
 * Verify no duplicate followups exist
 * @param {Object[]} actions 
 * @returns {{ valid: boolean, duplicates: string[] }}
 */
export function verifyNoFollowupDuplicates(actions) {
  const followups = actions.filter(isFollowupAction);
  const seen = new Map();
  const duplicates = [];
  
  for (const action of followups) {
    const key = `${action.followupFor?.actionId}|${action.followupFor?.outcomeId}`;
    if (seen.has(key)) {
      duplicates.push(action.actionId);
    } else {
      seen.set(key, action.actionId);
    }
  }
  
  return { valid: duplicates.length === 0, duplicates };
}

export default {
  FOLLOWUP_SOURCE_TYPE,
  generateFollowupActionId,
  generateFollowupAction,
  generateFollowupActions,
  isFollowupAction,
  getOriginalActionId,
  verifyNoFollowupDuplicates
};
