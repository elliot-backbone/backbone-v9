/**
 * forbidden.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Forbidden Derived Field Enforcement
 * 
 * INVARIANT: Derived values must NEVER be stored in raw data.
 * This module enforces that invariant through:
 * - Deep scanning for forbidden keys
 * - Validation gates that hard-fail on violations
 * - Export firewalls to prevent re-contamination
 * 
 * @module forbidden
 */

/**
 * B1: CANONICAL FORBIDDEN DERIVED FIELDS
 * 
 * If a value can be calculated, it must NEVER be persisted.
 * This list is exhaustive and authoritative.
 */
export const FORBIDDEN_DERIVED_FIELDS = [
  // Core derivations
  'runway',
  'health',
  'priority',
  
  // Scoring/ranking
  'impact',
  'urgency',
  'risk',
  'score',
  
  // Classification bands
  'tier',
  'band',
  'label',
  
  // Progress metrics
  'progressPct',
  'coverage',
  
  // Probabilistic computations
  'expectedValue',
  'conversionProb',
  
  // Trajectory outputs (Phase 3.1 addition)
  'onTrack',
  'projectedDate',
  'velocity',
  
  // Issue/priority outputs
  'issues',
  'priorities',
  'actions',
  
  // Health components
  'healthBand',
  'healthSignals',
  'runwayMonths',
  
  // Ripple effect outputs
  'rippleScore',
  'rippleEffect',
  
  // Phase 3.2: Action impact model fields
  'actionId',
  'expectedNetImpact',
  'upsideMagnitude',
  'probabilityOfSuccess',
  'executionProbability',
  'downsideMagnitude',
  'timeToImpactDays',
  'effortCost',
  'secondOrderLeverage',
  'impactModel',
  'explain',
  
  // Phase 3.2: Predictive outputs
  'goalTrajectory',
  'probabilityOfHit',
  'preissues',
  'preIssues',
  'likelihood',
  'timeToBreachDays',
  
  // Phase 3.2: Action artifacts
  'actionCandidates',
  'rankedActions',
  'rank',
  'timing',
  'timingRationale',
  'timingConfidence',
  'timingScore',
  'escalation',
  'escalationDate',
  'daysUntilEscalation',
  'isImminent',
  'costOfDelay',
  'costMultiplier',
  'costCurve',
  'conversionLift',
  'isSecondOrder',
  'secondOrder',
  
  // Phase 4.5: Ranking surface (single scalar)
  'rankScore',
  'rankComponents',
  'trustPenalty',
  'executionFrictionPenalty',
  'timeCriticalityBoost',
  
  // Phase 4.5: Calibration outputs
  'calibratedProbability',
  'introducerPrior',
  'pathTypePrior',
  'targetTypePrior',
  'successRate',
  
  // Phase 4.5: Followup tracking
  'followupFor',
  'daysSinceSent'
];

/**
 * Alias for backward compatibility
 */
export const FORBIDDEN_FIELDS = FORBIDDEN_DERIVED_FIELDS;

/**
 * Create a Set for O(1) lookup
 */
const FORBIDDEN_SET = new Set(FORBIDDEN_DERIVED_FIELDS);

/**
 * B2: DEEP SCAN
 * 
 * Recursively scan raw input for forbidden keys at any depth.
 * Returns JSON paths to all violations.
 * 
 * @param {any} obj - Object to scan
 * @param {string} [path=''] - Current JSON path
 * @returns {string[]} - Array of JSON paths where forbidden keys were found
 */
export function deepScanForbidden(obj, path = '') {
  const violations = [];

  if (obj === null || obj === undefined) {
    return violations;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      violations.push(...deepScanForbidden(item, `${path}[${index}]`));
    });
    return violations;
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if this key is forbidden
      if (FORBIDDEN_SET.has(key)) {
        violations.push(currentPath);
      }
      
      // Recurse into value
      violations.push(...deepScanForbidden(obj[key], currentPath));
    }
  }

  return violations;
}

/**
 * B3: VALIDATION GATE
 * 
 * Hard-fail validation if ANY forbidden key is found.
 * This is the enforcement mechanism - no exceptions.
 * 
 * @param {any} raw - Raw input data to validate
 * @returns {{ valid: boolean, violations: string[], message: string }}
 */
export function validateNoForbiddenFields(raw) {
  const violations = deepScanForbidden(raw);
  
  if (violations.length === 0) {
    return {
      valid: true,
      violations: [],
      message: 'No forbidden derived fields found'
    };
  }

  return {
    valid: false,
    violations,
    message: `FORBIDDEN DERIVED FIELDS DETECTED:\n${violations.map(v => `  - ${v}`).join('\n')}\n\nDerived values must NEVER be stored. Remove these fields.`
  };
}

/**
 * Throw on forbidden fields (hard gate)
 * 
 * @param {any} raw - Raw input data
 * @throws {Error} if forbidden fields found
 */
export function assertNoForbiddenFields(raw) {
  const result = validateNoForbiddenFields(raw);
  if (!result.valid) {
    throw new Error(result.message);
  }
}

/**
 * B4: EXPORT FIREWALL - exportRaw
 * 
 * Strip all derived fields from raw data before storage.
 * Returns a clean copy safe for persistence.
 * 
 * @param {any} obj - Object to clean
 * @returns {any} - Deep copy with forbidden fields removed
 */
export function exportRaw(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => exportRaw(item));
  }

  if (typeof obj === 'object') {
    const cleaned = {};
    for (const key of Object.keys(obj)) {
      // Skip forbidden keys
      if (FORBIDDEN_SET.has(key)) {
        continue;
      }
      // Recurse into value
      cleaned[key] = exportRaw(obj[key]);
    }
    return cleaned;
  }

  // Primitives pass through
  return obj;
}

/**
 * B4: EXPORT FIREWALL - exportComputed
 * 
 * Extract ONLY derived fields from computed output.
 * Used to separate concerns: raw storage vs computed view.
 * 
 * @param {Object} computed - Computed output with derived fields
 * @param {string[]} [fields] - Specific fields to extract (defaults to all forbidden)
 * @returns {Object} - Object containing only derived values
 */
export function exportComputed(computed, fields = null) {
  const extractFields = fields || FORBIDDEN_DERIVED_FIELDS;
  const result = {};

  if (!computed || typeof computed !== 'object') {
    return result;
  }

  // Extract top-level derived fields
  for (const field of extractFields) {
    if (computed[field] !== undefined) {
      result[field] = computed[field];
    }
  }

  // Also check for 'derived' namespace (engine output pattern)
  if (computed.derived && typeof computed.derived === 'object') {
    result.derived = {};
    for (const field of extractFields) {
      if (computed.derived[field] !== undefined) {
        result.derived[field] = computed.derived[field];
      }
    }
  }

  return result;
}

/**
 * Check if a single key is forbidden
 * 
 * @param {string} key - Field name to check
 * @returns {boolean}
 */
export function isForbidden(key) {
  return FORBIDDEN_SET.has(key);
}

/**
 * Get list of forbidden fields (for documentation/tooling)
 * 
 * @returns {string[]}
 */
export function getForbiddenList() {
  return [...FORBIDDEN_DERIVED_FIELDS];
}

export default {
  FORBIDDEN_DERIVED_FIELDS,
  deepScanForbidden,
  validateNoForbiddenFields,
  assertNoForbiddenFields,
  exportRaw,
  exportComputed,
  isForbidden,
  getForbiddenList
};
