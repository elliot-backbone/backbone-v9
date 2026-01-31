/**
 * predict/calibration.js Ã¢â‚¬â€ Probability Calibration from Outcomes (Phase 4.5)
 * 
 * Computes calibrated priors from IntroOutcome ledger.
 * ALL computation is deterministic, no randomness.
 * 
 * Priors computed:
 * - Introducer priors (per person success rate)
 * - Path-type priors (direct vs warm vs second-order)
 * - Target-type priors (investor vs customer vs partner)
 * 
 * @module predict/calibration
 */

import { getTerminalOutcomes, getByIntroducer } from '../raw/introOutcome.js';

// =============================================================================
// CONSTANTS
// =============================================================================

// Baseline conversion rate (matches decide/weights.js)
const BASELINE_CONVERSION = 0.15;

// Minimum samples before using empirical rate
const MIN_SAMPLES_INTRODUCER = 3;
const MIN_SAMPLES_PATH = 5;
const MIN_SAMPLES_TARGET = 5;

// Bayesian prior strength (pseudo-counts)
const PRIOR_STRENGTH = 2;

// Clamp bounds
const MIN_PROBABILITY = 0.05;
const MAX_PROBABILITY = 0.85;

// =============================================================================
// CORE CALIBRATION FUNCTIONS
// =============================================================================

/**
 * Compute success rate with Bayesian smoothing
 * @param {number} successes 
 * @param {number} total 
 * @param {number} priorRate - baseline prior
 * @returns {number}
 */
function bayesianRate(successes, total, priorRate = BASELINE_CONVERSION) {
  // Add pseudo-counts based on prior
  const adjustedSuccesses = successes + PRIOR_STRENGTH * priorRate;
  const adjustedTotal = total + PRIOR_STRENGTH;
  
  const rate = adjustedSuccesses / adjustedTotal;
  
  // Clamp to reasonable bounds
  return Math.max(MIN_PROBABILITY, Math.min(MAX_PROBABILITY, rate));
}

/**
 * Compute introducer priors from outcomes
 * @param {Object[]} outcomes - All IntroOutcomes
 * @returns {Map<string, { successRate: number, samples: number }>}
 */
export function computeIntroducerPriors(outcomes) {
  const terminal = getTerminalOutcomes(outcomes);
  const priors = new Map();
  
  // Group by introducer
  const byIntroducer = new Map();
  for (const o of terminal) {
    if (!byIntroducer.has(o.introducerPersonId)) {
      byIntroducer.set(o.introducerPersonId, { successes: 0, total: 0 });
    }
    const stats = byIntroducer.get(o.introducerPersonId);
    stats.total++;
    if (o.status === 'positive') stats.successes++;
  }
  
  // Compute rates
  for (const [personId, stats] of byIntroducer) {
    const useEmpirical = stats.total >= MIN_SAMPLES_INTRODUCER;
    const rate = useEmpirical 
      ? bayesianRate(stats.successes, stats.total)
      : BASELINE_CONVERSION;
    
    priors.set(personId, {
      successRate: rate,
      samples: stats.total,
      empirical: useEmpirical
    });
  }
  
  return priors;
}

/**
 * Compute path-type priors from outcomes
 * @param {Object[]} outcomes 
 * @returns {Map<string, { successRate: number, samples: number }>}
 */
export function computePathTypePriors(outcomes) {
  const terminal = getTerminalOutcomes(outcomes);
  const priors = new Map();
  
  // Group by pathType
  const byPath = new Map();
  for (const o of terminal) {
    const pathType = o.pathType || 'direct';
    if (!byPath.has(pathType)) {
      byPath.set(pathType, { successes: 0, total: 0 });
    }
    const stats = byPath.get(pathType);
    stats.total++;
    if (o.status === 'positive') stats.successes++;
  }
  
  // Compute rates
  for (const [pathType, stats] of byPath) {
    const useEmpirical = stats.total >= MIN_SAMPLES_PATH;
    const rate = useEmpirical 
      ? bayesianRate(stats.successes, stats.total)
      : BASELINE_CONVERSION;
    
    priors.set(pathType, {
      successRate: rate,
      samples: stats.total,
      empirical: useEmpirical
    });
  }
  
  return priors;
}

/**
 * Compute target-type priors from outcomes
 * @param {Object[]} outcomes 
 * @returns {Map<string, { successRate: number, samples: number }>}
 */
export function computeTargetTypePriors(outcomes) {
  const terminal = getTerminalOutcomes(outcomes);
  const priors = new Map();
  
  // Group by introType
  const byType = new Map();
  for (const o of terminal) {
    const introType = o.introType || 'unknown';
    if (!byType.has(introType)) {
      byType.set(introType, { successes: 0, total: 0 });
    }
    const stats = byType.get(introType);
    stats.total++;
    if (o.status === 'positive') stats.successes++;
  }
  
  // Compute rates
  for (const [introType, stats] of byType) {
    const useEmpirical = stats.total >= MIN_SAMPLES_TARGET;
    const rate = useEmpirical 
      ? bayesianRate(stats.successes, stats.total)
      : BASELINE_CONVERSION;
    
    priors.set(introType, {
      successRate: rate,
      samples: stats.total,
      empirical: useEmpirical
    });
  }
  
  return priors;
}

// =============================================================================
// AGGREGATED CALIBRATION
// =============================================================================

/**
 * Compute all calibrated priors
 * @param {Object[]} outcomes 
 * @returns {Object}
 */
export function computeAllPriors(outcomes) {
  return {
    introducer: computeIntroducerPriors(outcomes),
    pathType: computePathTypePriors(outcomes),
    targetType: computeTargetTypePriors(outcomes)
  };
}

/**
 * Get calibrated probability for a specific intro action
 * @param {Object} action - Introduction action
 * @param {Object} priors - Output of computeAllPriors
 * @returns {{ probability: number, explain: string[] }}
 */
export function getCalibratedProbability(action, priors) {
  const explain = [];
  let probability = BASELINE_CONVERSION;
  
  // Extract intro details from action
  const introducerId = action.introducerPersonId || action.sources?.[0]?.introducerPersonId;
  const pathType = action.pathType || 'direct';
  const introType = action.introType || 'unknown';
  
  // Check introducer prior
  if (introducerId && priors.introducer.has(introducerId)) {
    const prior = priors.introducer.get(introducerId);
    if (prior.empirical) {
      probability = prior.successRate;
      explain.push(`Introducer has ${prior.samples} samples, ${(prior.successRate * 100).toFixed(0)}% success`);
    }
  }
  
  // Adjust by path type
  if (priors.pathType.has(pathType)) {
    const prior = priors.pathType.get(pathType);
    if (prior.empirical) {
      // Blend with current probability
      probability = (probability + prior.successRate) / 2;
      explain.push(`${pathType} path: ${(prior.successRate * 100).toFixed(0)}% baseline`);
    }
  }
  
  // Adjust by target type
  if (priors.targetType.has(introType)) {
    const prior = priors.targetType.get(introType);
    if (prior.empirical) {
      // Blend with current probability
      probability = (probability + prior.successRate) / 2;
      explain.push(`${introType} type: ${(prior.successRate * 100).toFixed(0)}% baseline`);
    }
  }
  
  // Default explanation if no calibration data
  if (explain.length === 0) {
    explain.push(`Using baseline conversion: ${(BASELINE_CONVERSION * 100).toFixed(0)}%`);
  }
  
  // Clamp final value
  probability = Math.max(MIN_PROBABILITY, Math.min(MAX_PROBABILITY, probability));
  
  return { probability, explain };
}

// =============================================================================
// DETERMINISM VERIFICATION
// =============================================================================

/**
 * Verify calibration is deterministic
 * @param {Object[]} outcomes 
 * @returns {boolean}
 */
export function verifyDeterminism(outcomes) {
  const priors1 = computeAllPriors(outcomes);
  const priors2 = computeAllPriors(outcomes);
  
  // Compare introducer maps
  for (const [key, val1] of priors1.introducer) {
    const val2 = priors2.introducer.get(key);
    if (!val2 || val1.successRate !== val2.successRate) return false;
  }
  
  // Compare path type maps
  for (const [key, val1] of priors1.pathType) {
    const val2 = priors2.pathType.get(key);
    if (!val2 || val1.successRate !== val2.successRate) return false;
  }
  
  // Compare target type maps
  for (const [key, val1] of priors1.targetType) {
    const val2 = priors2.targetType.get(key);
    if (!val2 || val1.successRate !== val2.successRate) return false;
  }
  
  return true;
}

export default {
  MIN_SAMPLES_INTRODUCER,
  MIN_SAMPLES_PATH,
  MIN_SAMPLES_TARGET,
  MIN_PROBABILITY,
  MAX_PROBABILITY,
  computeIntroducerPriors,
  computePathTypePriors,
  computeTargetTypePriors,
  computeAllPriors,
  getCalibratedProbability,
  verifyDeterminism
};
