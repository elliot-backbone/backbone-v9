/**
 * health.js - HEALTH DERIVATION (Phase D Rewrite)
 * 
 * CRITICAL DOCTRINE:
 * - Health = Internal State ONLY
 * - Health reflects what EXISTS and is COHERENT
 * - Health does NOT reflect what is MISSING or LATE (that's Issues)
 * - Health does NOT predict outcomes (that's Trajectory)
 * 
 * D1: Health must NOT:
 * - Penalize missing data
 * - Penalize missing goals  
 * - Predict outcomes
 * 
 * D2: Health MAY reflect:
 * - Presence of internal state
 * - Internal coherence
 * - Optional data-integrity signals
 * 
 * D3: Health Output Shape:
 * {
 *   healthBand: "GREEN" | "YELLOW" | "RED",
 *   healthSignals: string[],
 *   confidence: number
 * }
 * 
 * INVARIANT: This is a runtime derivation. Never store the result.
 * 
 * @module health
 */

import { deriveRunway } from '../derive/runway.js';

/**
 * @typedef {'GREEN' | 'YELLOW' | 'RED'} HealthBand
 */

/**
 * @typedef {Object} HealthResult
 * @property {HealthBand} value - Health band (alias: healthBand)
 * @property {HealthBand} healthBand - Health band
 * @property {string[]} healthSignals - Signals that contributed to health
 * @property {number} confidence - 0-1 confidence score
 * @property {string} explain - Human-readable explanation
 */

/**
 * Health thresholds (in months of runway)
 * 
 * NOTE: These reflect CURRENT STATE, not predictions.
 * A company with 3 months runway IS in a critical state.
 * This is a fact about now, not a prediction about failure.
 */
const THRESHOLDS = {
  CRITICAL_RUNWAY: 6,   // RED: Company currently has < 6 months runway
  WARNING_RUNWAY: 12    // YELLOW: Company currently has < 12 months runway
};

/**
 * Compute health band for a company
 * 
 * Health reflects INTERNAL STATE only:
 * - Current runway (cash/burn ratio) 
 * - Data coherence (required fields present)
 * 
 * Health does NOT consider:
 * - Missing goals (Issue: NO_GOALS)
 * - Goal progress (Issue: GOAL_BEHIND, GOAL_STALLED)
 * - Pipeline gaps (Issue: PIPELINE_GAP)
 * - Data staleness (Issue: DATA_STALE)
 * 
 * @param {Object} company - Company raw data
 * @param {Date} now - Current time (explicit for determinism)
 * @returns {HealthResult}
 */
export function deriveHealth(company, now = new Date()) {
  const healthSignals = [];
  let confidence = 1.0;
  
  // =========================================================================
  // STEP 1: Derive runway (current state, not prediction)
  // =========================================================================
  const runwayResult = deriveRunway(
    company.cash,
    company.burn,
    company.asOf,
    company.asOf,
    now
  );
  
  // =========================================================================
  // STEP 2: Assess runway health (what IS, not what's missing)
  // =========================================================================
  let healthBand = 'GREEN';
  
  if (runwayResult.value === null) {
    // Cannot determine runway - but this is NOT a health penalty
    // It becomes an Issue (DATA_MISSING), not a health downgrade
    // Health reflects what we CAN assess, not what we can't
    healthBand = 'GREEN';  // Default to GREEN when unknown
    confidence = 0.3;      // Low confidence due to incomplete data
    healthSignals.push('runway_unknown');
  } else if (runwayResult.value === Infinity) {
    // Zero or negative burn = infinite runway
    healthBand = 'GREEN';
    healthSignals.push('runway_infinite');
  } else if (runwayResult.value < THRESHOLDS.CRITICAL_RUNWAY) {
    // Current state: critically low runway
    healthBand = 'RED';
    healthSignals.push(`runway_critical_${Math.round(runwayResult.value)}mo`);
  } else if (runwayResult.value < THRESHOLDS.WARNING_RUNWAY) {
    // Current state: warning-level runway
    healthBand = 'YELLOW';
    healthSignals.push(`runway_warning_${Math.round(runwayResult.value)}mo`);
  } else {
    // Current state: healthy runway
    healthBand = 'GREEN';
    healthSignals.push(`runway_healthy_${Math.round(runwayResult.value)}mo`);
  }
  
  // =========================================================================
  // STEP 3: Data coherence signals (optional integrity checks)
  // =========================================================================
  
  // Check if core financial data is present (not a penalty, just a signal)
  if (company.cash !== undefined && company.burn !== undefined) {
    healthSignals.push('financials_present');
  }
  
  // Check if company has asOf timestamp (data integrity)
  if (company.asOf) {
    healthSignals.push('timestamp_present');
  }
  
  // =========================================================================
  // STEP 4: Confidence adjustment based on data quality
  // =========================================================================
  
  // Reduce confidence if runway calculation had issues
  if (runwayResult.value !== null) {
    confidence = Math.min(confidence, runwayResult.confidence);
  }
  
  // =========================================================================
  // STEP 5: Build explanation (descriptive, not prescriptive)
  // =========================================================================
  let explain;
  if (runwayResult.value === null) {
    explain = 'Health unknown: insufficient financial data';
  } else if (runwayResult.value === Infinity) {
    explain = 'Healthy: no burn or positive cash flow';
  } else {
    explain = `${healthBand}: ${Math.round(runwayResult.value)} months runway`;
  }
  
  return {
    value: healthBand,           // Legacy compatibility
    healthBand,                  // D3 spec
    healthSignals,               // D3 spec
    confidence: Math.round(confidence * 100) / 100,
    explain
  };
}

export default deriveHealth;
