/**
 * ASSUMPTIONS POLICY
 * 
 * Editable beliefs about leverage, progress, and timing.
 * These are PRIORS, not truth. They must be transformed before
 * affecting rankScore.
 * 
 * ═══════════════════════════════════════════════════════════════
 * ARCHITECTURAL RULE: No value here may flow directly to rankScore.
 * All values must pass through derivation layer before ranking.
 * ═══════════════════════════════════════════════════════════════
 * 
 * @module assumptions_policy
 */

export const ASSUMPTIONS = {
  // ═══════════════════════════════════════════════════════════════
  // GOAL WEIGHTS BY STAGE
  // ═══════════════════════════════════════════════════════════════
  // Multipliers for goal importance at different company stages.
  // These inform impact calculations but are not scores themselves.
  
  goalWeightsByStage: {
    'Pre-seed': { 
      fundraise: 1.2,   // Critical for survival
      revenue: 0.7,     // Less critical early
      product: 1.0, 
      hiring: 0.8,
      partnership: 0.6,
      operational: 0.9,
    },
    'Seed': { 
      fundraise: 1.1, 
      revenue: 0.9, 
      product: 0.9, 
      hiring: 0.9,
      partnership: 0.7,
      operational: 0.9,
    },
    'Series A': { 
      fundraise: 1.0, 
      revenue: 1.0, 
      product: 1.0, 
      hiring: 1.0,
      partnership: 0.9,
      operational: 1.0,
    },
    'Series B': { 
      fundraise: 0.8,   // Less existential
      revenue: 1.1,     // More critical
      product: 1.0, 
      hiring: 1.0,
      partnership: 1.0,
      operational: 1.0,
    },
    'Series C': { 
      fundraise: 0.7, 
      revenue: 1.2, 
      product: 0.9, 
      hiring: 1.0,
      partnership: 1.1,
      operational: 1.0,
    },
    'Series D': { 
      fundraise: 0.6, 
      revenue: 1.2, 
      product: 0.8, 
      hiring: 0.9,
      partnership: 1.1,
      operational: 1.0,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // RELATIONSHIP DYNAMICS
  // ═══════════════════════════════════════════════════════════════
  
  // Days until relationship strength halves without interaction
  relationshipDecayHalfLife: 90,
  
  // Days of dormancy before relationship is considered "cold"
  relationshipColdThreshold: 180,
  
  // Relationship strength thresholds
  relationshipStrengthBands: {
    strong: 70,    // >= 70 is strong
    moderate: 40,  // >= 40 is moderate
    weak: 0,       // < 40 is weak
  },

  // ═══════════════════════════════════════════════════════════════
  // INTRO CONVERSION BASELINES
  // ═══════════════════════════════════════════════════════════════
  // Historical baseline conversion rates for introductions.
  // Actual rates should be calibrated from observed outcomes.
  
  introConversionBaseline: {
    oneHop: 0.15,   // Direct intro: 15% baseline
    twoHop: 0.06,   // Second-order intro: 6% baseline
  },
  
  // Minimum lift required for second-order paths to be worth complexity
  secondOrderMinLift: 1.2,

  // ═══════════════════════════════════════════════════════════════
  // TIMING WINDOW URGENCY
  // ═══════════════════════════════════════════════════════════════
  // Days until deadline that trigger urgency levels.
  
  timingWindowUrgency: {
    critical: 7,    // <= 7 days = critical
    high: 14,       // <= 14 days = high
    medium: 30,     // <= 30 days = medium
    low: 60,        // <= 60 days = low (default)
  },

  // ═══════════════════════════════════════════════════════════════
  // OPTIONALITY DISCOUNT
  // ═══════════════════════════════════════════════════════════════
  // Rate at which optionality value decays per month of delay.
  // 0.1 = 10% less valuable per month delayed.
  
  optionalityDiscountRate: 0.1,
  
  // Maximum months in future for optionality to have value
  optionalityMaxHorizon: 12,

  // ═══════════════════════════════════════════════════════════════
  // URGENCY GATES
  // ═══════════════════════════════════════════════════════════════
  // Thresholds that trigger urgency gates (CAT1/CAT2).
  
  urgencyGates: {
    // CAT1: Catastrophic
    runwayCliffMonths: 3,       // Runway < 3 months = CAT1
    legalDeadlineDays: 14,      // Legal deadline within 14 days = CAT1
    
    // CAT2: Blocking
    dataBlockerStaleDays: 7,    // Data older than 7 days = potential blocker
    deckOutdatedDays: 30,       // Deck older than 30 days during fundraise = blocker
  },

  // ═══════════════════════════════════════════════════════════════
  // RANKING COMPONENT BOUNDS
  // ═══════════════════════════════════════════════════════════════
  // Used to normalize and clamp ranking components.
  
  rankingBounds: {
    impactMax: 100,             // Maximum raw impact value
    componentFloor: 0.2,        // Minimum component value after clamping
    componentCeiling: 1.0,      // Maximum component value after clamping
    obviousnessCap: 0.8,        // Maximum obviousness penalty
  },

  // ═══════════════════════════════════════════════════════════════
  // PROACTIVITY DISTRIBUTION TARGETS
  // ═══════════════════════════════════════════════════════════════
  // Minimum ratios of OPPORTUNITY-sourced actions in top N.
  
  proactivityTargets: {
    noGate: 0.7,     // ≥70% OPPORTUNITY when no gate active
    cat2Gate: 0.5,   // ≥50% OPPORTUNITY when CAT2 gate active
    cat1Gate: 0,     // No requirement when CAT1 (survival mode)
  },

  // ═══════════════════════════════════════════════════════════════
  // SYNERGY DETECTION THRESHOLDS
  // ═══════════════════════════════════════════════════════════════
  // Minimum scores for detecting cross-entity synergies.
  
  synergyThresholds: {
    sectorOverlapMin: 0.3,      // Minimum sector similarity for tech fit
    customerOverlapMin: 0.4,    // Minimum customer segment overlap
    investorOverlapMin: 2,      // Minimum shared investors for facilitated intro
  },

  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  
  version: '1.0.0',
  updatedAt: '2026-02-02',
  changelog: [
    '1.0.0 - Initial assumptions for proactive action system',
  ],
};

/**
 * Get goal weight for a specific goal type and company stage.
 * 
 * @param {string} goalType - fundraise|revenue|product|hiring|partnership|operational
 * @param {string} stage - Pre-seed|Seed|Series A|B|C|D
 * @returns {number} Weight multiplier (default 1.0 if not found)
 */
export function getGoalWeight(goalType, stage) {
  const stageWeights = ASSUMPTIONS.goalWeightsByStage[stage];
  if (!stageWeights) return 1.0;
  return stageWeights[goalType] ?? 1.0;
}

/**
 * Get timing urgency level based on days until deadline.
 * 
 * @param {number} daysUntil - Days until deadline
 * @returns {'critical'|'high'|'medium'|'low'}
 */
export function getTimingUrgency(daysUntil) {
  const { critical, high, medium } = ASSUMPTIONS.timingWindowUrgency;
  if (daysUntil <= critical) return 'critical';
  if (daysUntil <= high) return 'high';
  if (daysUntil <= medium) return 'medium';
  return 'low';
}

/**
 * Compute optionality discount based on months until needed.
 * 
 * @param {number} monthsUntilNeeded - Estimated months until action is needed
 * @returns {number} Discount factor (0-1, where 1 = full value)
 */
export function computeOptionalityDiscount(monthsUntilNeeded) {
  const { optionalityDiscountRate, optionalityMaxHorizon } = ASSUMPTIONS;
  
  if (monthsUntilNeeded > optionalityMaxHorizon) return 0;
  
  return Math.pow(1 - optionalityDiscountRate, monthsUntilNeeded);
}

/**
 * Get relationship strength band.
 * 
 * @param {number} strength - Relationship strength (0-100)
 * @returns {'strong'|'moderate'|'weak'}
 */
export function getRelationshipBand(strength) {
  const { strong, moderate } = ASSUMPTIONS.relationshipStrengthBands;
  if (strength >= strong) return 'strong';
  if (strength >= moderate) return 'moderate';
  return 'weak';
}

export default ASSUMPTIONS;
