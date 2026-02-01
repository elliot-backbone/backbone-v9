/**
 * Events Selector
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 Phase UI-P3 compliance:
 * - Read-only selector (no writes to storage)
 * - Returns empty array when backing store unavailable
 * - Append-only semantics respected (no edits/deletes/reordering)
 * - Provides explicit empty state support
 */

/**
 * Filter events related to a specific entity
 * 
 * @param {Array} allEvents - All events from the event store
 * @param {string} entityType - Type of the entity (company, person, etc.)
 * @param {string} entityId - ID of the entity
 * @param {Object} options - Optional filters
 * @param {string} options.eventType - Filter by event type
 * @param {number} options.limit - Maximum number of events to return
 * @returns {Array} Filtered and sorted events
 */
export function eventsForEntity(allEvents, entityType, entityId, options = {}) {
  // Guard: return empty array if no events available
  if (!Array.isArray(allEvents) || !entityId) {
    return [];
  }

  const { eventType, limit } = options;

  // Filter events that reference this entity
  let filtered = allEvents.filter(event => {
    if (!event) return false;
    
    // Direct entity reference
    if (event.entityId === entityId) return true;
    if (event.subjectId === entityId) return true;
    if (event.targetId === entityId) return true;
    
    // Type-specific ID fields
    if (event.companyId === entityId) return true;
    if (event.personId === entityId) return true;
    if (event.firmId === entityId) return true;
    if (event.dealId === entityId) return true;
    if (event.roundId === entityId) return true;
    if (event.goalId === entityId) return true;
    if (event.issueId === entityId) return true;
    if (event.actionId === entityId) return true;
    
    // Check related entities array
    if (Array.isArray(event.relatedEntities)) {
      if (event.relatedEntities.some(e => e?.id === entityId)) return true;
    }
    
    // Check participants
    if (Array.isArray(event.participants)) {
      if (event.participants.some(p => p?.id === entityId || p === entityId)) return true;
    }
    
    // Check affected entities (for ripple/impact events)
    if (Array.isArray(event.affectedEntities)) {
      if (event.affectedEntities.some(e => e?.id === entityId || e === entityId)) return true;
    }
    
    return false;
  });

  // Apply event type filter if specified
  if (eventType) {
    filtered = filtered.filter(event => {
      const type = event.type || event.eventType;
      return type === eventType;
    });
  }

  // Sort by timestamp (most recent first) - append-only means newest at top
  filtered.sort((a, b) => {
    const timeA = a.timestamp || a.createdAt || a.occurredAt || 0;
    const timeB = b.timestamp || b.createdAt || b.occurredAt || 0;
    return new Date(timeB) - new Date(timeA);
  });

  // Apply limit if specified
  if (limit && limit > 0) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Get unique event types for an entity (for filter UI)
 * 
 * @param {Array} allEvents - All events from the event store
 * @param {string} entityType - Type of the entity
 * @param {string} entityId - ID of the entity
 * @returns {Array<string>} Unique event types
 */
export function eventTypesForEntity(allEvents, entityType, entityId) {
  const events = eventsForEntity(allEvents, entityType, entityId);
  const types = new Set();
  
  for (const event of events) {
    const type = event.type || event.eventType;
    if (type) {
      types.add(type);
    }
  }
  
  return Array.from(types).sort();
}

/**
 * Check if an entity has any events
 * 
 * @param {Array} allEvents - All events from the event store
 * @param {string} entityType - Type of the entity
 * @param {string} entityId - ID of the entity
 * @returns {boolean}
 */
export function hasEvents(allEvents, entityType, entityId) {
  return eventsForEntity(allEvents, entityType, entityId).length > 0;
}

/**
 * Get count of events for an entity
 * 
 * @param {Array} allEvents - All events from the event store
 * @param {string} entityType - Type of the entity
 * @param {string} entityId - ID of the entity
 * @returns {number}
 */
export function countEvents(allEvents, entityType, entityId) {
  return eventsForEntity(allEvents, entityType, entityId).length;
}

/**
 * Get the most recent event for an entity
 * 
 * @param {Array} allEvents - All events from the event store
 * @param {string} entityType - Type of the entity
 * @param {string} entityId - ID of the entity
 * @returns {Object|null} Most recent event or null
 */
export function mostRecentEvent(allEvents, entityType, entityId) {
  const events = eventsForEntity(allEvents, entityType, entityId, { limit: 1 });
  return events[0] || null;
}

/**
 * Get time since last event for an entity (for At-a-Glance tile)
 * 
 * @param {Array} allEvents - All events from the event store
 * @param {string} entityType - Type of the entity
 * @param {string} entityId - ID of the entity
 * @returns {{ days: number, timestamp: string }|null}
 */
export function timeSinceLastEvent(allEvents, entityType, entityId) {
  const recent = mostRecentEvent(allEvents, entityType, entityId);
  
  if (!recent) return null;
  
  const timestamp = recent.timestamp || recent.createdAt || recent.occurredAt;
  if (!timestamp) return null;
  
  const eventDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now - eventDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    days: diffDays,
    timestamp,
  };
}

export default eventsForEntity;
