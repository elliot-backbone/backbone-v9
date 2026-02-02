/**
 * Dismissal Event Schema
 * 
 * Captures explicit user feedback on surfaced actions.
 * Append-only event log — never delete or modify past events.
 * 
 * @module dismissalSchema
 */

/**
 * Valid dismissal reasons
 */
export const DISMISSAL_REASONS = {
  NOT_NOW: 'not_now',           // Timing is wrong (mild penalty, decays quickly)
  NOT_RELEVANT: 'not_relevant', // Doesn't apply (strong penalty)
  ALREADY_DOING: 'already_doing', // User is handling differently (mild penalty)
  DISAGREE: 'disagree',         // User thinks advice is wrong (strong penalty)
};

/**
 * Penalty strength by reason
 * Strong reasons: apply higher base penalty, decay slower
 * Mild reasons: apply lower base penalty, decay faster
 */
export const DISMISSAL_PENALTY_STRENGTH = {
  [DISMISSAL_REASONS.NOT_NOW]: 0.1,
  [DISMISSAL_REASONS.NOT_RELEVANT]: 0.35,
  [DISMISSAL_REASONS.ALREADY_DOING]: 0.1,
  [DISMISSAL_REASONS.DISAGREE]: 0.35,
};

/**
 * Decay half-life in days by reason
 * Strong reasons decay slower (60 days)
 * Mild reasons decay faster (14 days)
 */
export const DISMISSAL_DECAY_HALFLIFE = {
  [DISMISSAL_REASONS.NOT_NOW]: 14,
  [DISMISSAL_REASONS.NOT_RELEVANT]: 60,
  [DISMISSAL_REASONS.ALREADY_DOING]: 14,
  [DISMISSAL_REASONS.DISAGREE]: 60,
};

/**
 * Check if a reason is a "strong" dismissal
 */
export function isStrongDismissal(reason) {
  return reason === DISMISSAL_REASONS.NOT_RELEVANT || 
         reason === DISMISSAL_REASONS.DISAGREE;
}

/**
 * Dismissal event structure
 * 
 * @typedef {Object} DismissalEvent
 * @property {string} eventId - Unique event ID
 * @property {string} actionId - Which action was dismissed
 * @property {string} reason - One of DISMISSAL_REASONS
 * @property {string} userId - Who dismissed
 * @property {string} dismissedAt - ISO timestamp
 * @property {string} companyId - Denormalized for query efficiency
 * @property {string} [goalId] - Denormalized for query efficiency
 * @property {string} sourceType - ISSUE | PREISSUE | OPPORTUNITY
 */

/**
 * Create a dismissal event
 * 
 * @param {Object} params
 * @returns {DismissalEvent}
 */
export function createDismissalEvent({
  actionId,
  reason,
  userId,
  companyId,
  goalId = null,
  sourceType,
  dismissedAt = new Date().toISOString(),
}) {
  if (!Object.values(DISMISSAL_REASONS).includes(reason)) {
    throw new Error(`Invalid dismissal reason: ${reason}`);
  }
  
  return {
    eventId: `dismissal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actionId,
    reason,
    userId,
    dismissedAt,
    companyId,
    goalId,
    sourceType,
  };
}

/**
 * Validate a dismissal event
 * 
 * @param {any} event
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDismissalEvent(event) {
  const errors = [];
  
  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['event must be an object'] };
  }
  
  if (typeof event.eventId !== 'string' || !event.eventId) {
    errors.push('eventId is required');
  }
  
  if (typeof event.actionId !== 'string' || !event.actionId) {
    errors.push('actionId is required');
  }
  
  if (!Object.values(DISMISSAL_REASONS).includes(event.reason)) {
    errors.push(`reason must be one of: ${Object.values(DISMISSAL_REASONS).join(', ')}`);
  }
  
  if (typeof event.userId !== 'string' || !event.userId) {
    errors.push('userId is required');
  }
  
  if (typeof event.dismissedAt !== 'string' || !event.dismissedAt) {
    errors.push('dismissedAt is required');
  }
  
  return { valid: errors.length === 0, errors };
}

export default {
  DISMISSAL_REASONS,
  DISMISSAL_PENALTY_STRENGTH,
  DISMISSAL_DECAY_HALFLIFE,
  isStrongDismissal,
  createDismissalEvent,
  validateDismissalEvent,
};
