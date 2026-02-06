/**
 * raw/introOutcome.js Ã¢â‚¬â€ IntroOutcome Ledger Schema (Phase 4.5)
 * 
 * Tracks introduction outcomes for calibration.
 * This is a RAW entity - stored, not derived.
 * 
 * Status flow: drafted Ã¢â€ â€™ sent Ã¢â€ â€™ replied Ã¢â€ â€™ meeting Ã¢â€ â€™ positive|negative|ghosted
 * 
 * @module raw/introOutcome
 */

// =============================================================================
// SCHEMA CONSTANTS
// =============================================================================

export const INTRO_STATUSES = [
  'drafted',    // Action created but not executed
  'sent',       // Introduction email/message sent
  'replied',    // Target responded
  'meeting',    // Meeting scheduled or held
  'positive',   // Led to desired outcome (deal, partnership, etc.)
  'negative',   // Explicit rejection
  'ghosted'     // No response after followup window
];

export const TERMINAL_STATUSES = ['positive', 'negative', 'ghosted'];

// Days after 'sent' with no reply to consider ghosted
export const GHOST_THRESHOLD_DAYS = 14;

// Days after 'sent' to trigger followup
export const FOLLOWUP_THRESHOLD_DAYS = 7;

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate IntroOutcome object
 * @param {any} outcome 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateIntroOutcome(outcome) {
  const errors = [];
  
  if (!outcome || typeof outcome !== 'object') {
    return { valid: false, errors: ['outcome must be an object'] };
  }
  
  // Required: id
  if (typeof outcome.id !== 'string' || !outcome.id) {
    errors.push('id must be a non-empty string');
  }
  
  // Required: createdAt (ISO timestamp)
  if (typeof outcome.createdAt !== 'string' || !outcome.createdAt) {
    errors.push('createdAt must be an ISO timestamp string');
  }
  
  // Required: actionId (link to source action)
  if (typeof outcome.actionId !== 'string' || !outcome.actionId) {
    errors.push('actionId must be a non-empty string');
  }
  
  // Required: introducerPersonId
  if (typeof outcome.introducerPersonId !== 'string' || !outcome.introducerPersonId) {
    errors.push('introducerPersonId must be a non-empty string');
  }
  
  // Required: targetPersonId OR targetOrgId (at least one)
  const hasTargetPerson = typeof outcome.targetPersonId === 'string' && outcome.targetPersonId;
  const hasTargetOrg = typeof outcome.targetOrgId === 'string' && outcome.targetOrgId;
  if (!hasTargetPerson && !hasTargetOrg) {
    errors.push('must have targetPersonId or targetOrgId');
  }
  
  // Required: status (enum)
  if (!INTRO_STATUSES.includes(outcome.status)) {
    errors.push(`status must be one of: ${INTRO_STATUSES.join(', ')}`);
  }
  
  // Required: statusUpdatedAt (ISO timestamp)
  if (typeof outcome.statusUpdatedAt !== 'string' || !outcome.statusUpdatedAt) {
    errors.push('statusUpdatedAt must be an ISO timestamp string');
  }
  
  // Optional: companyId (which portfolio company this intro is for)
  if (outcome.companyId !== undefined && typeof outcome.companyId !== 'string') {
    errors.push('companyId must be a string if provided');
  }
  
  // Optional: introType (e.g., 'investor', 'customer', 'partner')
  if (outcome.introType !== undefined && typeof outcome.introType !== 'string') {
    errors.push('introType must be a string if provided');
  }
  
  // Optional: pathType (e.g., 'direct', 'warm', 'second-order')
  if (outcome.pathType !== undefined && typeof outcome.pathType !== 'string') {
    errors.push('pathType must be a string if provided');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate array of IntroOutcomes
 * @param {any[]} outcomes 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateIntroOutcomes(outcomes) {
  if (!Array.isArray(outcomes)) {
    return { valid: false, errors: ['introOutcomes must be an array'] };
  }
  
  const errors = [];
  const seenIds = new Set();
  
  outcomes.forEach((outcome, i) => {
    const result = validateIntroOutcome(outcome);
    if (!result.valid) {
      errors.push(...result.errors.map(e => `introOutcomes[${i}]: ${e}`));
    }
    
    // Check for duplicate IDs
    if (outcome.id) {
      if (seenIds.has(outcome.id)) {
        errors.push(`introOutcomes[${i}]: duplicate id '${outcome.id}'`);
      }
      seenIds.add(outcome.id);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a new IntroOutcome
 * @param {Object} params 
 * @returns {Object}
 */
export function createIntroOutcome({
  id,
  actionId,
  introducerPersonId,
  targetPersonId = null,
  targetOrgId = null,
  companyId = null,
  introType = null,
  pathType = 'direct',
  status = 'drafted',
  createdAt = new Date().toISOString()
}) {
  return {
    id,
    createdAt,
    actionId,
    introducerPersonId,
    targetPersonId,
    targetOrgId,
    companyId,
    introType,
    pathType,
    status,
    statusUpdatedAt: createdAt
  };
}

/**
 * Update outcome status
 * @param {Object} outcome 
 * @param {string} newStatus 
 * @param {string} [timestamp] 
 * @returns {Object}
 */
export function updateOutcomeStatus(outcome, newStatus, timestamp = new Date().toISOString()) {
  if (!INTRO_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }
  
  return {
    ...outcome,
    status: newStatus,
    statusUpdatedAt: timestamp
  };
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get outcomes needing followup
 * @param {Object[]} outcomes 
 * @param {Date} now 
 * @returns {Object[]}
 */
export function getOutcomesNeedingFollowup(outcomes, now = new Date()) {
  const cutoff = new Date(now.getTime() - FOLLOWUP_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  
  return outcomes.filter(o => {
    if (o.status !== 'sent') return false;
    const sentAt = new Date(o.statusUpdatedAt);
    return sentAt < cutoff;
  });
}

/**
 * Get outcomes that should be marked ghosted
 * @param {Object[]} outcomes 
 * @param {Date} now 
 * @returns {Object[]}
 */
export function getGhostedCandidates(outcomes, now = new Date()) {
  const cutoff = new Date(now.getTime() - GHOST_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  
  return outcomes.filter(o => {
    if (o.status !== 'sent') return false;
    const sentAt = new Date(o.statusUpdatedAt);
    return sentAt < cutoff;
  });
}

/**
 * Check if outcome is terminal
 * @param {Object} outcome 
 * @returns {boolean}
 */
export function isTerminal(outcome) {
  return TERMINAL_STATUSES.includes(outcome.status);
}

/**
 * Get outcomes by introducer
 * @param {Object[]} outcomes 
 * @param {string} introducerPersonId 
 * @returns {Object[]}
 */
export function getByIntroducer(outcomes, introducerPersonId) {
  return outcomes.filter(o => o.introducerPersonId === introducerPersonId);
}

/**
 * Get terminal outcomes (for calibration)
 * @param {Object[]} outcomes 
 * @returns {Object[]}
 */
export function getTerminalOutcomes(outcomes) {
  return outcomes.filter(isTerminal);
}

export default {
  INTRO_STATUSES,
  TERMINAL_STATUSES,
  GHOST_THRESHOLD_DAYS,
  FOLLOWUP_THRESHOLD_DAYS,
  validateIntroOutcome,
  validateIntroOutcomes,
  createIntroOutcome,
  updateOutcomeStatus,
  getOutcomesNeedingFollowup,
  getGhostedCandidates,
  isTerminal,
  getByIntroducer,
  getTerminalOutcomes
};
