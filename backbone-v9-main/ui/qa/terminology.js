/**
 * terminology.js - Terminology Lock (Phase J)
 * 
 * DOCTRINE: One concept = one word = one computation
 * 
 * ALLOWED TERMS:
 * - Raw
 * - Derived
 * - Health
 * - Issue
 * - Resolution
 * - Priority
 * - Action
 * - Ripple
 * 
 * BANNED UNLESS EXPLICITLY DEFINED:
 * - Focus
 * - Tier
 * - Generic Score
 * - Expected Value
 * - Conversion Probability
 * 
 * @module terminology
 */

// =============================================================================
// ALLOWED TERMINOLOGY
// =============================================================================

export const ALLOWED_TERMS = {
  // Data layer
  RAW: {
    term: 'Raw',
    definition: 'Input facts that are stored. Source of truth.',
    module: 'index.js',
    examples: ['company.cash', 'company.burn', 'goal.target']
  },
  
  DERIVED: {
    term: 'Derived',
    definition: 'Computed values that are NEVER stored. Ephemeral.',
    module: 'runway.js, trajectory.js',
    examples: ['runway.value', 'trajectory.onTrack', 'health.healthBand']
  },
  
  // State layer
  HEALTH: {
    term: 'Health',
    definition: 'Internal state assessment. What EXISTS and is COHERENT. NOT gaps or predictions.',
    module: 'health.js',
    examples: ['healthBand', 'healthSignals']
  },
  
  // Gap layer
  ISSUE: {
    term: 'Issue',
    definition: 'Detected gap requiring attention. Absence, staleness, deviation.',
    module: 'issues.js',
    examples: ['RUNWAY_CRITICAL', 'NO_GOALS', 'DATA_STALE']
  },
  
  // Resolution layer
  RESOLUTION: {
    term: 'Resolution',
    definition: 'Template for addressing an issue. Includes steps and effort.',
    module: 'resolutions.js',
    examples: ['RESOLVE_RUNWAY_CRITICAL', 'RESOLVE_NO_GOALS']
  },
  
  // Action layer
  PRIORITY: {
    term: 'Priority',
    definition: 'Ranked resolution. NOT a score. A thing to DO.',
    module: 'priority.js',
    examples: ['priority.rank', 'priority.action', 'priority.resolutionId']
  },
  
  ACTION: {
    term: 'Action',
    definition: 'Concrete step from a resolution. What to do next.',
    module: 'priority.js, resolutions.js',
    examples: ['actionSteps[]', 'getTodayActions()']
  },
  
  // Predictive layer
  RIPPLE: {
    term: 'Ripple',
    definition: 'Downstream consequence of an issue. Predictive scaffold.',
    module: 'ripple.js',
    examples: ['rippleScore', 'rippleExplain[]']
  }
};

// =============================================================================
// BANNED TERMINOLOGY
// =============================================================================

export const BANNED_TERMS = {
  FOCUS: {
    term: 'Focus',
    reason: 'Vague. Use Priority or Action instead.',
    replacement: 'Priority'
  },
  
  TIER: {
    term: 'Tier',
    reason: 'Static classification. Use derived Health or computed Priority.',
    replacement: 'Health (for state) or Priority.rank (for action order)'
  },
  
  SCORE: {
    term: 'Score (generic)',
    reason: 'Ambiguous. Specify what is being scored.',
    replacement: 'priority.priority, ripple.rippleScore, etc.'
  },
  
  EXPECTED_VALUE: {
    term: 'Expected Value',
    reason: 'Probabilistic computation not implemented. Would need calibration.',
    replacement: 'Not allowed in v9.1'
  },
  
  CONVERSION_PROB: {
    term: 'Conversion Probability',
    reason: 'Derived probability computation not implemented.',
    replacement: 'deal.probability (raw input) or ripple.rippleScore (derived)'
  },
  
  STATUS: {
    term: 'Status (for computed values)',
    reason: 'Conflates with raw status fields. Use Health or Issue.',
    replacement: 'Health (for state), Issue (for gap)'
  },
  
  LEVEL: {
    term: 'Level',
    reason: 'Ambiguous ranking. Use rank for priority, healthBand for health.',
    replacement: 'priority.rank, health.healthBand'
  },
  
  BAND: {
    term: 'Band (as stored value)',
    reason: 'Bands are derived, not stored.',
    replacement: 'Derive healthBand at runtime'
  }
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if a term is allowed
 */
export function isAllowedTerm(term) {
  const normalizedTerm = term.toUpperCase().replace(/\s+/g, '_');
  return ALLOWED_TERMS.hasOwnProperty(normalizedTerm);
}

/**
 * Check if a term is banned
 */
export function isBannedTerm(term) {
  const normalizedTerm = term.toUpperCase().replace(/\s+/g, '_');
  return BANNED_TERMS.hasOwnProperty(normalizedTerm);
}

/**
 * Get allowed term definition
 */
export function getTermDefinition(term) {
  const normalizedTerm = term.toUpperCase().replace(/\s+/g, '_');
  return ALLOWED_TERMS[normalizedTerm] || null;
}

/**
 * Get banned term info (why it's banned, what to use instead)
 */
export function getBannedTermInfo(term) {
  const normalizedTerm = term.toUpperCase().replace(/\s+/g, '_');
  return BANNED_TERMS[normalizedTerm] || null;
}

/**
 * Scan text for terminology violations
 */
export function scanForViolations(text) {
  const violations = [];
  const words = text.toLowerCase().split(/\W+/);
  
  for (const word of words) {
    if (isBannedTerm(word)) {
      const info = getBannedTermInfo(word);
      violations.push({
        term: word,
        reason: info.reason,
        replacement: info.replacement
      });
    }
  }
  
  return violations;
}

// =============================================================================
// GLOSSARY EXPORT
// =============================================================================

export function getGlossary() {
  return {
    allowed: Object.values(ALLOWED_TERMS),
    banned: Object.values(BANNED_TERMS)
  };
}

export default {
  ALLOWED_TERMS,
  BANNED_TERMS,
  isAllowedTerm,
  isBannedTerm,
  getTermDefinition,
  getBannedTermInfo,
  scanForViolations,
  getGlossary
};
