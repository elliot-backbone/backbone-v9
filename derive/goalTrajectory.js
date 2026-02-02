/**
 * goalTrajectory.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Goal Forecast & Probability-of-Hit (Phase 3.2)
 * 
 * Extends trajectory.js with probability-based forecasting.
 * Outputs feed into pre-issues and action generation.
 * Derived output - never persisted.
 * 
 * @module goalTrajectory
 */

import { deriveTrajectory, calculateVelocity } from './trajectory.js';
import { calculateProgress, daysRemaining } from './metrics.js';

// =============================================================================
// MULTI-ENTITY GOAL SUPPORT
// =============================================================================

/**
 * Normalize goal to use entityRefs (compatible with goalSchema.js)
 */
function normalizeGoalEntityRefs(goal) {
  if (goal.entityRefs && goal.entityRefs.length > 0) {
    return goal.entityRefs;
  }
  
  const entityRefs = [];
  if (goal.companyId) {
    entityRefs.push({ type: 'company', id: goal.companyId, role: 'primary' });
  }
  if (goal.firmId) {
    entityRefs.push({ type: 'firm', id: goal.firmId, role: 'target' });
  }
  if (goal.dealId) {
    entityRefs.push({ type: 'deal', id: goal.dealId, role: 'participant' });
  }
  if (goal.roundId) {
    entityRefs.push({ type: 'round', id: goal.roundId, role: 'participant' });
  }
  if (goal.personId) {
    entityRefs.push({ type: 'person', id: goal.personId, role: 'target' });
  }
  
  return entityRefs;
}

/**
 * Check if goal is multi-entity
 */
export function isMultiEntityGoal(goal) {
  const refs = normalizeGoalEntityRefs(goal);
  const types = new Set(refs.map(r => r.type));
  return types.size > 1;
}

// =============================================================================
// PROBABILITY OF HIT
// =============================================================================

/**
 * Calculate probability of hitting goal by due date
 * Uses trajectory data + progress + time remaining
 * 
 * @param {Object} params
 * @param {number} params.progress - Current progress 0-1
 * @param {number|null} params.daysLeft - Days until due
 * @param {boolean|null} params.onTrack - From trajectory (null if unknown)
 * @param {number} params.confidence - Trajectory confidence 0-1
 * @param {number} params.velocity - Current velocity
 * @param {number} params.requiredVelocity - Velocity needed to hit target
 * @returns {number} Probability 0-1
 */
export function calculateProbabilityOfHit({
  progress,
  daysLeft,
  onTrack,
  confidence,
  velocity,
  requiredVelocity
}) {
  // Already achieved
  if (progress >= 1) return 1;
  
  // Past due and not achieved
  if (daysLeft !== null && daysLeft < 0) return 0;
  
  // Base probability from progress
  let prob = progress * 0.3;
  
  // Trajectory component
  if (onTrack === true) {
    prob += 0.4 * confidence;
  } else if (onTrack === false) {
    // Scale down based on how far behind
    if (velocity > 0 && requiredVelocity > 0) {
      const velocityRatio = Math.min(1, velocity / requiredVelocity);
      prob += 0.2 * velocityRatio * confidence;
    }
  } else {
    // Unknown trajectory - use time-based heuristic
    if (daysLeft !== null && daysLeft > 0) {
      const timeBuffer = Math.min(1, daysLeft / 30); // More time = higher prob
      prob += 0.2 * timeBuffer;
    }
  }
  
  // Time pressure adjustment
  if (daysLeft !== null) {
    if (daysLeft > 60) {
      prob += 0.2; // Plenty of time
    } else if (daysLeft > 30) {
      prob += 0.15;
    } else if (daysLeft > 14) {
      prob += 0.1;
    } else if (daysLeft > 7) {
      prob += 0.05;
    }
    // Very little time - no bonus
  }
  
  return Math.min(1, Math.max(0, prob));
}

// =============================================================================
// GOAL TRAJECTORY DERIVATION
// =============================================================================

/**
 * Derive full trajectory + probability for a goal
 * 
 * @param {Object} goal - Goal object
 * @param {Date} now - Reference date
 * @returns {Object} GoalTrajectory
 */
export function deriveGoalTrajectory(goal, now) {
  // Get base trajectory
  const trajectory = deriveTrajectory(goal, now);
  
  // Calculate progress
  const progress = goal.target > 0 ? Math.min(1, goal.current / goal.target) : 0;
  
  // Days remaining
  const daysLeft = goal.due ? daysRemaining({ due: goal.due }, now) : null;
  
  // Required velocity
  const gap = goal.target - goal.current;
  const requiredVelocity = daysLeft && daysLeft > 0 ? gap / daysLeft : Infinity;
  
  // Current velocity
  const { velocity } = calculateVelocity(goal.history || []);
  
  // Probability of hit
  const probabilityOfHit = calculateProbabilityOfHit({
    progress,
    daysLeft,
    onTrack: trajectory.onTrack,
    confidence: trajectory.confidence,
    velocity,
    requiredVelocity
  });
  
  // Build explanation
  const explain = [trajectory.explain];
  if (probabilityOfHit >= 0.8) {
    explain.push(`High confidence (${(probabilityOfHit * 100).toFixed(0)}%) of hitting target`);
  } else if (probabilityOfHit >= 0.5) {
    explain.push(`Moderate confidence (${(probabilityOfHit * 100).toFixed(0)}%) - may need acceleration`);
  } else if (probabilityOfHit >= 0.2) {
    explain.push(`At risk (${(probabilityOfHit * 100).toFixed(0)}%) - intervention needed`);
  } else {
    explain.push(`Unlikely to hit (${(probabilityOfHit * 100).toFixed(0)}%) without major change`);
  }
  
  return {
    goalId: goal.id,
    goalName: goal.name,
    goalType: goal.type,
    metricKey: goal.type || 'custom',
    
    // Multi-entity support
    entityRefs: normalizeGoalEntityRefs(goal),
    isMultiEntity: isMultiEntityGoal(goal),
    
    // Progress
    current: goal.current,
    target: goal.target,
    progress,
    
    // Timing
    due: goal.due,
    daysLeft,
    
    // Trajectory
    onTrack: trajectory.onTrack,
    projectedDate: trajectory.projectedDate,
    velocity,
    requiredVelocity: isFinite(requiredVelocity) ? requiredVelocity : null,
    
    // Probability
    probabilityOfHit,
    confidence: trajectory.confidence,
    
    // Explanation
    explain
  };
}

/**
 * Derive goal trajectories for a company
 * 
 * @param {Object} company
 * @param {Date} now
 * @returns {Object[]} Array of GoalTrajectory
 */
export function deriveCompanyGoalTrajectories(company, now) {
  const trajectories = [];
  
  for (const goal of company.goals || []) {
    // Include active and at_risk goals (not completed, abandoned, or blocked)
    if (goal.status === 'active' || goal.status === 'at_risk') {
      const traj = deriveGoalTrajectory(goal, now);
      traj.companyId = company.id;
      traj.companyName = company.name;
      trajectories.push(traj);
    }
  }
  
  return trajectories;
}

/**
 * Derive goal trajectories for portfolio
 * 
 * @param {Object[]} companies
 * @param {Date} now
 * @returns {{ byCompany: Object, all: Object[] }}
 */
export function derivePortfolioGoalTrajectories(companies, now) {
  const byCompany = {};
  const all = [];
  
  for (const company of companies) {
    const trajectories = deriveCompanyGoalTrajectories(company, now);
    byCompany[company.id] = trajectories;
    all.push(...trajectories);
  }
  
  return { byCompany, all };
}

/**
 * Get at-risk goals (probability < threshold)
 * 
 * @param {Object[]} trajectories
 * @param {number} threshold - Default 0.5
 * @returns {Object[]}
 */
export function getAtRiskGoals(trajectories, threshold = 0.5) {
  return trajectories
    .filter(t => t.probabilityOfHit < threshold)
    .sort((a, b) => a.probabilityOfHit - b.probabilityOfHit);
}

export default {
  calculateProbabilityOfHit,
  deriveGoalTrajectory,
  deriveCompanyGoalTrajectories,
  derivePortfolioGoalTrajectories,
  getAtRiskGoals,
  isMultiEntityGoal
};
