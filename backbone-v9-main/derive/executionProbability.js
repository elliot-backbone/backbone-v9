/**
 * Execution Probability
 * Phase 4.6: Action Outcome Memory
 * 
 * Derives execution probability from historical outcomes.
 * Output clamped to [0.05, 0.95] per contract.
 */

import { computeOutcomeStats, getStatsForType } from './actionOutcomeStats.js';

// Clamp bounds per contract
const MIN_PROB = 0.05;
const MAX_PROB = 0.95;

// Default when no history exists
const DEFAULT_EXECUTION_PROB = 0.7;

// Minimum sample size before trusting learned value
const MIN_SAMPLES = 3;

/**
 * Clamp probability to valid range
 * @param {number} prob - Raw probability
 * @returns {number} Clamped probability
 */
function clamp(prob) {
  return Math.max(MIN_PROB, Math.min(MAX_PROB, prob));
}

/**
 * Compute learned execution probability for an action
 * 
 * Execution = completed / (started OR completed)
 * Attempts = started events + completed events (deduped by action)
 * 
 * @param {Object} action - Action to compute probability for
 * @param {Map<string, Object>} statsByType - Stats from computeOutcomeStats
 * @returns {number} Execution probability in [0.05, 0.95]
 */
export function learnedExecutionProbability(action, statsByType) {
  if (!action || !action.actionType) {
    return DEFAULT_EXECUTION_PROB;
  }

  const stats = getStatsForType(statsByType, action.actionType);
  
  if (!stats || stats.totalAttempts < MIN_SAMPLES) {
    return DEFAULT_EXECUTION_PROB;
  }

  // Execution probability = completed / attempts
  const execProb = stats.totalCompleted / stats.totalAttempts;
  
  return clamp(execProb);
}

/**
 * Compute execution probability directly from events
 * Convenience wrapper that computes stats first
 * 
 * @param {Object} action - Action to compute probability for
 * @param {Object[]} events - Array of action events
 * @param {Object[]} actions - All actions (for type mapping)
 * @returns {number} Execution probability in [0.05, 0.95]
 */
export function computeExecutionProbability(action, events, actions) {
  const statsByType = computeOutcomeStats(events, actions);
  return learnedExecutionProbability(action, statsByType);
}

/**
 * Batch compute execution probabilities for multiple actions
 * More efficient than calling individually
 * 
 * @param {Object[]} actions - Actions to compute for
 * @param {Object[]} events - Array of action events
 * @returns {Map<string, number>} actionId -> probability
 */
export function batchExecutionProbabilities(actions, events) {
  const statsByType = computeOutcomeStats(events, actions);
  const result = new Map();

  for (const action of actions) {
    result.set(action.id, learnedExecutionProbability(action, statsByType));
  }

  return result;
}

export default {
  learnedExecutionProbability,
  computeExecutionProbability,
  batchExecutionProbabilities,
  MIN_PROB,
  MAX_PROB,
  DEFAULT_EXECUTION_PROB,
  MIN_SAMPLES
};
