/**
 * Related Actions Selector
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 Phase UI-P3 compliance:
 * - Read-only selector (no writes to storage)
 * - Returns empty arrays when backing store unavailable
 * - Categorizes actions by lifecycle: Current / Executed / Deferred
 * - Does not act as a second global ranking surface
 */

/**
 * Filter and categorize actions related to a specific entity
 * 
 * @param {Array} allActions - All actions from the runtime
 * @param {string} entityType - Type of the entity (company, person, etc.)
 * @param {string} entityId - ID of the entity
 * @returns {{ current: Array, executed: Array, deferred: Array }}
 */
export function relatedActionsForEntity(allActions, entityType, entityId) {
  // Guard: return empty structure if no actions available
  if (!Array.isArray(allActions) || !entityId) {
    return { current: [], executed: [], deferred: [] };
  }

  // Filter actions that reference this entity
  const related = allActions.filter(action => {
    if (!action) return false;
    
    // Direct entity reference
    if (action.entityId === entityId) return true;
    if (action.companyId === entityId) return true;
    if (action.targetId === entityId) return true;
    if (action.subjectId === entityId) return true;
    if (action.personId === entityId) return true;
    if (action.firmId === entityId) return true;
    if (action.dealId === entityId) return true;
    if (action.roundId === entityId) return true;
    if (action.goalId === entityId) return true;
    if (action.issueId === entityId) return true;
    
    // Check linked entities array
    if (Array.isArray(action.linkedEntities)) {
      if (action.linkedEntities.some(e => e?.id === entityId)) return true;
    }
    
    // Check participants array (for deals/rounds)
    if (Array.isArray(action.participants)) {
      if (action.participants.some(p => p?.id === entityId)) return true;
    }
    
    // Check dependencies (for action profiles)
    if (entityType === 'action') {
      if (Array.isArray(action.upstream) && action.upstream.includes(entityId)) return true;
      if (Array.isArray(action.downstream) && action.downstream.includes(entityId)) return true;
    }
    
    return false;
  });

  // Categorize by lifecycle state
  const current = [];
  const executed = [];
  const deferred = [];

  for (const action of related) {
    const lifecycle = normalizeLifecycle(action);
    
    if (lifecycle === 'executed' || lifecycle === 'observed') {
      executed.push(action);
    } else if (lifecycle === 'deferred' || lifecycle === 'skipped') {
      deferred.push(action);
    } else {
      // pending, surfaced, or any other active state
      current.push(action);
    }
  }

  // Sort each category by timestamp (most recent first)
  const sortByTime = (a, b) => {
    const timeA = a.updatedAt || a.createdAt || a.timestamp || 0;
    const timeB = b.updatedAt || b.createdAt || b.timestamp || 0;
    return new Date(timeB) - new Date(timeA);
  };

  current.sort(sortByTime);
  executed.sort(sortByTime);
  deferred.sort(sortByTime);

  return { current, executed, deferred };
}

/**
 * Normalize action lifecycle state from various possible field names
 * 
 * @param {Object} action - Action object
 * @returns {string} Normalized lifecycle state
 */
function normalizeLifecycle(action) {
  // Explicit lifecycle field takes precedence
  if (action.lifecycle) {
    return action.lifecycle.toLowerCase();
  }
  
  // Check boolean flags (legacy format)
  if (action.executed === true) return 'executed';
  if (action.observed === true) return 'observed';
  if (action.deferred === true) return 'deferred';
  if (action.skipped === true) return 'skipped';
  
  // Check state field
  if (action.state) {
    return action.state.toLowerCase();
  }
  
  // Default to pending/active
  return 'pending';
}

/**
 * Check if an entity has any related actions
 * 
 * @param {Array} allActions - All actions from the runtime
 * @param {string} entityType - Type of the entity
 * @param {string} entityId - ID of the entity
 * @returns {boolean}
 */
export function hasRelatedActions(allActions, entityType, entityId) {
  const { current, executed, deferred } = relatedActionsForEntity(allActions, entityType, entityId);
  return current.length > 0 || executed.length > 0 || deferred.length > 0;
}

/**
 * Get count of related actions by category
 * 
 * @param {Array} allActions - All actions from the runtime
 * @param {string} entityType - Type of the entity
 * @param {string} entityId - ID of the entity
 * @returns {{ current: number, executed: number, deferred: number, total: number }}
 */
export function countRelatedActions(allActions, entityType, entityId) {
  const { current, executed, deferred } = relatedActionsForEntity(allActions, entityType, entityId);
  return {
    current: current.length,
    executed: executed.length,
    deferred: deferred.length,
    total: current.length + executed.length + deferred.length,
  };
}

export default relatedActionsForEntity;
