/**
 * Impact Normalization
 * 
 * Normalizes impact values to [0, 1] range for ranking.
 * 
 * ═══════════════════════════════════════════════════════════════
 * RUNTIME ONLY — Never persist normalized values to storage.
 * ═══════════════════════════════════════════════════════════════
 * 
 * @module impactNormalized
 */

import { ASSUMPTIONS } from '../raw/assumptions_policy.js';

// Get bounds from assumptions
const { impactMax, componentFloor, componentCeiling } = ASSUMPTIONS.rankingBounds;

/**
 * Normalize a raw impact value to [0, 1] range.
 * 
 * @param {number} rawImpact - Unnormalized impact value (typically 0-100)
 * @returns {number} Normalized impact in [0, 1]
 */
export function normalizeImpact(rawImpact) {
  if (typeof rawImpact !== 'number' || isNaN(rawImpact)) {
    return 0;
  }
  
  // Clamp to valid range first
  const clamped = Math.max(0, Math.min(impactMax, rawImpact));
  
  // Normalize to [0, 1]
  return clamped / impactMax;
}

/**
 * Clamp a component value to ranking bounds.
 * Prevents any single component from zeroing the entire score.
 * 
 * @param {number} value - Component value in [0, 1]
 * @returns {number} Clamped value in [componentFloor, componentCeiling]
 */
export function clampComponent(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return componentFloor;
  }
  
  return Math.max(componentFloor, Math.min(componentCeiling, value));
}

/**
 * Normalize and clamp an impact value in one step.
 * 
 * @param {number} rawImpact - Raw impact value
 * @returns {number} Normalized and clamped value
 */
export function normalizeAndClampImpact(rawImpact) {
  const normalized = normalizeImpact(rawImpact);
  return clampComponent(normalized);
}

/**
 * Normalize feasibility components to single score.
 * 
 * @param {Object} params
 * @param {number} params.executionProbability - Probability of execution (0-1)
 * @param {number} params.trustRiskScore - Trust risk score (0-100)
 * @param {number} params.effortCost - Effort in days
 * @returns {number} Normalized feasibility in [0, 1]
 */
export function normalizeFeasibility({ 
  executionProbability = 0.5, 
  trustRiskScore = 0, 
  effortCost = 0 
}) {
  // Execution probability is already 0-1
  const execProb = Math.max(0, Math.min(1, executionProbability));
  
  // Trust factor: convert 0-100 risk to 0-1 factor (higher = better)
  const trustFactor = 1 - (Math.max(0, Math.min(100, trustRiskScore)) / 100);
  
  // Effort factor: more effort = lower feasibility
  // Cap at 30 days for normalization
  const effortFactor = 1 - Math.min(effortCost / 30, 0.5);
  
  // Combine multiplicatively
  return execProb * trustFactor * effortFactor;
}

/**
 * Normalize timing factor based on time to impact.
 * 
 * @param {number} timeToImpactDays - Days until impact is realized
 * @returns {number} Timing factor in [0, 1] (higher = more immediate)
 */
export function normalizeTiming(timeToImpactDays) {
  if (typeof timeToImpactDays !== 'number' || isNaN(timeToImpactDays)) {
    return 0.5; // Default middle value
  }
  
  // Exponential decay with 60-day half-life
  // Immediate impact = 1.0
  // 60 days = 0.5
  // 120 days = 0.25
  const decayRate = Math.log(2) / 60; // Half-life of 60 days
  return Math.exp(-decayRate * Math.max(0, timeToImpactDays));
}

/**
 * Validate that a value looks like a normalized component.
 * Useful for QA checks.
 * 
 * @param {number} value - Value to check
 * @returns {boolean} True if valid normalized component
 */
export function isValidNormalizedComponent(value) {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    value >= 0 &&
    value <= 1
  );
}

/**
 * Validate that a value looks like a clamped component.
 * 
 * @param {number} value - Value to check
 * @returns {boolean} True if valid clamped component
 */
export function isValidClampedComponent(value) {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    value >= componentFloor &&
    value <= componentCeiling
  );
}

export default {
  normalizeImpact,
  clampComponent,
  normalizeAndClampImpact,
  normalizeFeasibility,
  normalizeTiming,
  isValidNormalizedComponent,
  isValidClampedComponent,
};
