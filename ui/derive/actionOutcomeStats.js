/**
 * Action Outcome Statistics
 * Phase 4.6: Action Outcome Memory
 * 
 * Derives aggregate statistics from action events.
 * Pure function - no persistence of derived values.
 */

/**
 * Compute outcome statistics from action events
 * Groups by actionType (V1 scope - global only)
 * 
 * @param {Object[]} events - Array of action events
 * @param {Object[]} actions - Array of actions (for type mapping)
 * @returns {Map<string, Object>} Stats by actionType
 */
export function computeOutcomeStats(events, actions) {
  // Build actionId -> actionType map
  const actionTypeMap = new Map();
  for (const action of actions) {
    if (action.id && action.actionType) {
      actionTypeMap.set(action.id, action.actionType);
    }
  }

  // Initialize stats buckets by actionType
  const statsByType = new Map();

  const ensureStats = (type) => {
    if (!statsByType.has(type)) {
      statsByType.set(type, {
        actionType: type,
        totalAttempts: 0,      // started OR completed
        totalCompleted: 0,     // completed events
        totalSuccesses: 0,     // outcome = success
        totalPartials: 0,      // outcome = partial
        totalFailures: 0,      // outcome = failed
        totalAbandoned: 0,     // outcome = abandoned
        totalTimeToOutcome: 0, // sum of days
        outcomeCount: 0,       // events with outcome
        delaySum: 0,           // sum of delays between events
        delayCount: 0
      });
    }
    return statsByType.get(type);
  };

  // Track event sequences per action for delay calculation
  const actionTimelines = new Map();

  // Sort events by timestamp for proper sequencing
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  for (const event of sortedEvents) {
    const actionType = actionTypeMap.get(event.actionId);
    if (!actionType) continue; // Skip events for unknown actions

    const stats = ensureStats(actionType);

    // Track timeline for delay calculation
    if (!actionTimelines.has(event.actionId)) {
      actionTimelines.set(event.actionId, []);
    }
    actionTimelines.get(event.actionId).push(event);

    // Count attempts (started or completed)
    if (event.eventType === 'started') {
      stats.totalAttempts++;
    }

    if (event.eventType === 'completed') {
      stats.totalAttempts++;  // completed counts as attempt too
      stats.totalCompleted++;
    }

    // Process outcome_recorded events
    if (event.eventType === 'outcome_recorded' && event.payload) {
      stats.outcomeCount++;

      switch (event.payload.outcome) {
        case 'success':
          stats.totalSuccesses++;
          break;
        case 'partial':
          stats.totalPartials++;
          break;
        case 'failed':
          stats.totalFailures++;
          break;
        case 'abandoned':
          stats.totalAbandoned++;
          break;
      }

      if (typeof event.payload.timeToOutcomeDays === 'number') {
        stats.totalTimeToOutcome += event.payload.timeToOutcomeDays;
      }
    }
  }

  // Calculate delays between events per action
  for (const [actionId, timeline] of actionTimelines) {
    const actionType = actionTypeMap.get(actionId);
    if (!actionType || timeline.length < 2) continue;

    const stats = statsByType.get(actionType);
    
    for (let i = 1; i < timeline.length; i++) {
      const prev = new Date(timeline[i - 1].timestamp);
      const curr = new Date(timeline[i].timestamp);
      const delayDays = (curr - prev) / (1000 * 60 * 60 * 24);
      
      if (!isNaN(delayDays) && delayDays >= 0) {
        stats.delaySum += delayDays;
        stats.delayCount++;
      }
    }
  }

  return statsByType;
}

/**
 * Get stats for a specific action type
 * @param {Map<string, Object>} statsByType - Stats map from computeOutcomeStats
 * @param {string} actionType - Action type to look up
 * @returns {Object|null} Stats object or null
 */
export function getStatsForType(statsByType, actionType) {
  return statsByType.get(actionType) || null;
}

/**
 * Compute global stats across all action types
 * @param {Map<string, Object>} statsByType - Stats map
 * @returns {Object} Aggregated global stats
 */
export function computeGlobalStats(statsByType) {
  const global = {
    totalAttempts: 0,
    totalCompleted: 0,
    totalSuccesses: 0,
    totalPartials: 0,
    totalFailures: 0,
    totalAbandoned: 0,
    totalTimeToOutcome: 0,
    outcomeCount: 0,
    delaySum: 0,
    delayCount: 0,
    typeCount: statsByType.size
  };

  for (const stats of statsByType.values()) {
    global.totalAttempts += stats.totalAttempts;
    global.totalCompleted += stats.totalCompleted;
    global.totalSuccesses += stats.totalSuccesses;
    global.totalPartials += stats.totalPartials;
    global.totalFailures += stats.totalFailures;
    global.totalAbandoned += stats.totalAbandoned;
    global.totalTimeToOutcome += stats.totalTimeToOutcome;
    global.outcomeCount += stats.outcomeCount;
    global.delaySum += stats.delaySum;
    global.delayCount += stats.delayCount;
  }

  return global;
}

export default {
  computeOutcomeStats,
  getStatsForType,
  computeGlobalStats
};
