/**
 * trajectory.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Goal Progress & Completion Projection
 * 
 * Computes goal trajectory from historical snapshots.
 * Pure derivation: no storage of computed values.
 * 
 * @module trajectory
 */

/**
 * Calculate velocity (rate of change) from historical data points
 * @param {Array<{value: number, asOf: string}>} history - Chronological snapshots
 * @returns {{velocity: number, dataPoints: number, spanDays: number}}
 */
export function calculateVelocity(history) {
  if (!history || history.length < 2) {
    return { velocity: 0, dataPoints: history?.length || 0, spanDays: 0 };
  }

  // Sort by date ascending - handle both Date objects and strings
  const sorted = [...history].sort((a, b) => {
    const dateA = a.asOf instanceof Date ? a.asOf : new Date(a.asOf);
    const dateB = b.asOf instanceof Date ? b.asOf : new Date(b.asOf);
    return dateA.getTime() - dateB.getTime();
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const startDate = first.asOf instanceof Date ? first.asOf : new Date(first.asOf);
  const endDate = last.asOf instanceof Date ? last.asOf : new Date(last.asOf);
  const spanDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

  if (spanDays === 0) {
    return { velocity: 0, dataPoints: sorted.length, spanDays: 0 };
  }

  const delta = last.value - first.value;
  const velocity = delta / spanDays; // units per day

  return {
    velocity,
    dataPoints: sorted.length,
    spanDays
  };
}

/**
 * Project completion date given current trajectory
 * @param {number} current - Current value
 * @param {number} target - Target value
 * @param {number} velocity - Units per day (can be negative for decreasing goals)
 * @param {Date} now - Reference date
 * @returns {Date|null} - Projected completion date, or null if unreachable
 */
export function projectCompletionDate(current, target, velocity, now) {
  const gap = target - current;
  
  // Already achieved
  if (gap <= 0) {
    return now;
  }
  
  // Moving away or stagnant - unreachable
  if (velocity <= 0) {
    return null;
  }

  const daysToCompletion = gap / velocity;
  const completionDate = new Date(now);
  completionDate.setDate(completionDate.getDate() + daysToCompletion);
  
  return completionDate;
}

/**
 * Calculate confidence based on data quality and trajectory consistency
 * @param {Object} params
 * @param {number} params.dataPoints - Number of historical snapshots
 * @param {number} params.spanDays - Days covered by history
 * @param {number} params.daysToDeadline - Days until due date
 * @param {number} params.velocityVariance - How consistent the velocity is (0-1, lower=better)
 * @returns {number} - Confidence score 0-1
 */
export function calculateConfidence({ dataPoints, spanDays, daysToDeadline, velocityVariance = 0 }) {
  let confidence = 0.5; // Base confidence

  // More data points = higher confidence (up to +0.2)
  const dataBonus = Math.min(dataPoints / 10, 1) * 0.2;
  confidence += dataBonus;

  // Longer historical span relative to projection = higher confidence (up to +0.2)
  if (daysToDeadline > 0 && spanDays > 0) {
    const coverageRatio = Math.min(spanDays / daysToDeadline, 1);
    confidence += coverageRatio * 0.2;
  }

  // Consistent velocity = higher confidence (up to +0.1)
  confidence += (1 - velocityVariance) * 0.1;

  return Math.min(Math.max(confidence, 0), 1);
}

/**
 * Derive trajectory for a goal
 * 
 * @param {Object} goal - Goal object with target, due, current, history
 * @param {string} goal.metric - What we're measuring (e.g., "ARR", "users")
 * @param {number} goal.target - Target value to reach
 * @param {string} goal.due - ISO date string for deadline
 * @param {number} goal.current - Current value
 * @param {Array<{value: number, asOf: string}>} [goal.history] - Historical snapshots
 * @param {Date|string} [now] - Reference date (defaults to current time)
 * @returns {{onTrack: boolean, projectedDate: string|null, confidence: number, explain: string}}
 */
export function deriveTrajectory(goal, now = new Date()) {
  const refDate = typeof now === 'string' ? new Date(now) : now;

  // Normalize short field names (goals may use cur/tgt instead of current/target)
  const current = goal.current ?? goal.cur ?? null;
  const target = goal.target ?? goal.tgt ?? null;
  const due = goal.due ?? null;

  // Validate required fields
  if (target === undefined || target === null) {
    return {
      onTrack: false,
      projectedDate: null,
      confidence: 0,
      explain: 'Missing target value'
    };
  }

  if (!due) {
    return {
      onTrack: false,
      projectedDate: null,
      confidence: 0,
      explain: 'Missing due date'
    };
  }

  if (current === undefined || current === null) {
    return {
      onTrack: false,
      projectedDate: null,
      confidence: 0,
      explain: 'Missing current value'
    };
  }

  const dueDate = new Date(due);
  const daysToDeadline = (dueDate - refDate) / (1000 * 60 * 60 * 24);

  // Already achieved?
  if (current >= target) {
    return {
      onTrack: true,
      projectedDate: refDate.toISOString().split('T')[0],
      confidence: 1,
      explain: `Goal achieved: ${current} >= ${target}`
    };
  }

  // Past deadline and not achieved
  if (daysToDeadline < 0) {
    return {
      onTrack: false,
      projectedDate: null,
      confidence: 1,
      explain: `Missed: ${current}/${target} by ${due}`
    };
  }

  // Calculate velocity from history
  const history = goal.history || [];
  const { velocity, dataPoints, spanDays } = calculateVelocity(history);

  // No velocity data - use required rate
  if (dataPoints < 2) {
    const gap = target - current;
    const requiredVelocity = gap / daysToDeadline;

    return {
      onTrack: null, // Unknown without velocity data
      projectedDate: null,
      confidence: 0.2,
      explain: `Insufficient history. Need ${requiredVelocity.toFixed(2)}/day to hit ${target} by ${due}`
    };
  }

  // Project completion
  const projectedDate = projectCompletionDate(current, target, velocity, refDate);
  
  // Calculate confidence
  const confidence = calculateConfidence({
    dataPoints,
    spanDays,
    daysToDeadline,
    velocityVariance: 0 // TODO: implement variance calculation
  });

  // Determine if on track
  if (projectedDate === null) {
    return {
      onTrack: false,
      projectedDate: null,
      confidence,
      explain: `Stalled or regressing at ${velocity.toFixed(2)}/day. Current: ${current}, Target: ${target}`
    };
  }

  const projectedDateStr = projectedDate.toISOString().split('T')[0];
  const onTrack = projectedDate <= dueDate;

  if (onTrack) {
    const daysEarly = Math.floor((dueDate - projectedDate) / (1000 * 60 * 60 * 24));
    return {
      onTrack: true,
      projectedDate: projectedDateStr,
      confidence,
      explain: `On track at ${velocity.toFixed(2)}/day. Projected ${daysEarly > 0 ? daysEarly + ' days early' : 'on deadline'}`
    };
  } else {
    const daysLate = Math.floor((projectedDate - dueDate) / (1000 * 60 * 60 * 24));
    return {
      onTrack: false,
      projectedDate: projectedDateStr,
      confidence,
      explain: `Behind at ${velocity.toFixed(2)}/day. Projected ${daysLate} days late`
    };
  }
}

export default { deriveTrajectory, calculateVelocity, projectCompletionDate, calculateConfidence };
