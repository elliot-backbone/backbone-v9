/**
 * Action Events Schema Validator
 * Phase 4.6: Action Outcome Memory
 * 
 * Validates append-only action event ledger entries.
 * NO derived fields allowed in events.
 */

const VALID_EVENT_TYPES = [
  'created',
  'assigned',
  'started',
  'completed',
  'outcome_recorded',
  'followup_created',
  'note_added'
];

const VALID_OUTCOMES = ['success', 'partial', 'failed', 'abandoned'];

// Derived fields forbidden in event payloads (per NS3)
const FORBIDDEN_PAYLOAD_KEYS = [
  'rankScore',
  'expectedNetImpact',
  'impactScore',
  'rippleScore',
  'priorityScore',
  'healthScore',
  'executionProbability',
  'frictionPenalty',
  'calibratedProbability'
];

/**
 * Validate a single action event
 * @param {Object} event - Event to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateActionEvent(event) {
  const errors = [];

  // Required fields
  if (!event.id || typeof event.id !== 'string') {
    errors.push('Event missing required string field: id');
  }
  if (!event.actionId || typeof event.actionId !== 'string') {
    errors.push('Event missing required string field: actionId');
  }
  if (!event.eventType || typeof event.eventType !== 'string') {
    errors.push('Event missing required string field: eventType');
  }
  if (!event.timestamp || typeof event.timestamp !== 'string') {
    errors.push('Event missing required string field: timestamp');
  }
  if (!event.actor || typeof event.actor !== 'string') {
    errors.push('Event missing required string field: actor');
  }
  if (event.payload === undefined || typeof event.payload !== 'object') {
    errors.push('Event missing required object field: payload');
  }

  // EventType validation
  if (event.eventType && !VALID_EVENT_TYPES.includes(event.eventType)) {
    errors.push(`Invalid eventType: ${event.eventType}. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  // Timestamp validation (ISO 8601)
  if (event.timestamp) {
    const parsed = Date.parse(event.timestamp);
    if (isNaN(parsed)) {
      errors.push(`Invalid timestamp format: ${event.timestamp}. Must be ISO 8601.`);
    }
  }

  // Payload validation for outcome_recorded
  if (event.eventType === 'outcome_recorded' && event.payload) {
    if (!event.payload.outcome) {
      errors.push('outcome_recorded event requires payload.outcome');
    } else if (!VALID_OUTCOMES.includes(event.payload.outcome)) {
      errors.push(`Invalid outcome: ${event.payload.outcome}. Must be one of: ${VALID_OUTCOMES.join(', ')}`);
    }

    // Optional numeric fields
    if (event.payload.impactObserved !== undefined && typeof event.payload.impactObserved !== 'number') {
      errors.push('payload.impactObserved must be a number if provided');
    }
    if (event.payload.timeToOutcomeDays !== undefined && typeof event.payload.timeToOutcomeDays !== 'number') {
      errors.push('payload.timeToOutcomeDays must be a number if provided');
    }
  }

  // Forbidden derived keys in payload
  if (event.payload && typeof event.payload === 'object') {
    for (const key of FORBIDDEN_PAYLOAD_KEYS) {
      if (key in event.payload) {
        errors.push(`Forbidden derived key in payload: ${key}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate entire action events array
 * @param {Object[]} events - Array of events
 * @returns {{ valid: boolean, errors: string[], duplicateIds: string[] }}
 */
export function validateActionEvents(events) {
  if (!Array.isArray(events)) {
    return { valid: false, errors: ['actionEvents must be an array'], duplicateIds: [] };
  }

  const allErrors = [];
  const seenIds = new Set();
  const duplicateIds = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const { valid, errors } = validateActionEvent(event);
    
    if (!valid) {
      allErrors.push(...errors.map(e => `Event[${i}]: ${e}`));
    }

    // Check for duplicate IDs
    if (event.id) {
      if (seenIds.has(event.id)) {
        duplicateIds.push(event.id);
        allErrors.push(`Event[${i}]: Duplicate event ID: ${event.id}`);
      }
      seenIds.add(event.id);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    duplicateIds
  };
}

/**
 * Check referential integrity - all actionIds should reference known actions
 * @param {Object[]} events - Array of events
 * @param {Set<string>} knownActionIds - Set of valid action IDs
 * @returns {{ valid: boolean, orphanedRefs: string[] }}
 */
export function checkReferentialIntegrity(events, knownActionIds) {
  const orphanedRefs = [];
  
  for (const event of events) {
    if (event.actionId && !knownActionIds.has(event.actionId)) {
      orphanedRefs.push(event.actionId);
    }
  }

  return {
    valid: orphanedRefs.length === 0,
    orphanedRefs
  };
}

export default {
  validateActionEvent,
  validateActionEvents,
  checkReferentialIntegrity,
  VALID_EVENT_TYPES,
  VALID_OUTCOMES,
  FORBIDDEN_PAYLOAD_KEYS
};
