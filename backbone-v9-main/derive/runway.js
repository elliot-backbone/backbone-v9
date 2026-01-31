/**
 * BACKBONE V9 Ã¢â‚¬â€ RUNWAY DERIVATION
 * 
 * Pure function: (cash, burn, now) Ã¢â€ â€™ RunwayResult
 * 
 * INVARIANT: This is a runtime derivation. Never store the result.
 */

/**
 * @typedef {Object} RunwayResult
 * @property {number} value - Runway in months
 * @property {number} confidence - 0-1 confidence score
 * @property {string[]} inputs_used - Fields used in calculation
 * @property {string[]} inputs_missing - Fields that were missing
 * @property {number} staleness_penalty - 0-1 penalty for stale data
 * @property {string} provenance_summary - Source description
 * @property {string} explain - Human-readable explanation
 */

/**
 * Compute runway in months
 * 
 * @param {number} cash - Current cash position
 * @param {number} burn - Monthly burn rate
 * @param {string} cashAsOf - ISO timestamp of cash data
 * @param {string} burnAsOf - ISO timestamp of burn data
 * @param {Date} now - Current time (passed explicitly for determinism)
 * @returns {RunwayResult}
 */
export function deriveRunway(cash, burn, cashAsOf, burnAsOf, now = new Date()) {
  const inputs_used = [];
  const inputs_missing = [];
  let confidence = 1.0;
  let staleness_penalty = 0;
  
  // Check for missing inputs
  if (cash === undefined || cash === null) {
    inputs_missing.push('cash');
  } else {
    inputs_used.push('cash');
  }
  
  if (burn === undefined || burn === null) {
    inputs_missing.push('burn');
  } else {
    inputs_used.push('burn');
  }
  
  // Calculate staleness penalty
  const maxStaleDays = 30;
  if (cashAsOf) {
    const cashAge = (now.getTime() - new Date(cashAsOf).getTime()) / (1000 * 60 * 60 * 24);
    staleness_penalty = Math.max(staleness_penalty, Math.min(cashAge / maxStaleDays, 1));
  }
  if (burnAsOf) {
    const burnAge = (now.getTime() - new Date(burnAsOf).getTime()) / (1000 * 60 * 60 * 24);
    staleness_penalty = Math.max(staleness_penalty, Math.min(burnAge / maxStaleDays, 1));
  }
  
  // Handle edge cases
  if (inputs_missing.length > 0) {
    return {
      value: null,
      confidence: 0,
      inputs_used,
      inputs_missing,
      staleness_penalty,
      provenance_summary: 'insufficient data',
      explain: `Cannot compute runway: missing ${inputs_missing.join(', ')}`
    };
  }
  
  if (burn <= 0) {
    return {
      value: Infinity,
      confidence: 0.5, // Lower confidence for zero burn (unusual)
      inputs_used,
      inputs_missing,
      staleness_penalty,
      provenance_summary: 'zero burn',
      explain: 'Infinite runway (burn is zero or negative)'
    };
  }
  
  if (cash < 0) {
    return {
      value: 0,
      confidence: 0.9,
      inputs_used,
      inputs_missing,
      staleness_penalty,
      provenance_summary: 'negative cash',
      explain: 'Zero runway (cash is negative)'
    };
  }
  
  // Normal calculation
  const runway = cash / burn;
  confidence = Math.max(0, 1 - staleness_penalty * 0.5); // Staleness reduces confidence
  
  return {
    value: Math.round(runway * 10) / 10, // Round to 1 decimal
    confidence,
    inputs_used,
    inputs_missing,
    staleness_penalty,
    provenance_summary: `cash=${cash}, burn=${burn}`,
    explain: `${Math.round(runway)} months runway at current burn rate`
  };
}

export default deriveRunway;
