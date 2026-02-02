/**
 * Runway Derived Metrics
 * 
 * Derives runway-related metrics from raw company data.
 * 
 * ═══════════════════════════════════════════════════════════════
 * RUNTIME ONLY — Never persist these values to storage.
 * ═══════════════════════════════════════════════════════════════
 * 
 * @module runwayDerived
 */

import { ASSUMPTIONS } from '../raw/assumptions_policy.js';

/**
 * Derive runway in months from raw company data.
 * 
 * @param {Object} company - Raw company data with cash and burn fields
 * @returns {number} Runway in months (Infinity if burn <= 0)
 */
export function deriveRunwayMonths(company) {
  const cashBalance = company?.cash ?? 0;
  const monthlyBurn = company?.burn ?? 0;
  
  // Handle edge cases
  if (monthlyBurn <= 0) return Infinity;
  if (cashBalance <= 0) return 0;
  
  return cashBalance / monthlyBurn;
}

/**
 * Derive runway status category.
 * 
 * @param {Object} company - Raw company data
 * @returns {'critical'|'warning'|'healthy'}
 */
export function deriveRunwayStatus(company) {
  const months = deriveRunwayMonths(company);
  const cliffThreshold = ASSUMPTIONS.urgencyGates.runwayCliffMonths;
  
  if (months < cliffThreshold) return 'critical';
  if (months < cliffThreshold * 2) return 'warning';
  return 'healthy';
}

/**
 * Check if company is at runway cliff (CAT1 gate condition).
 * 
 * @param {Object} company - Raw company data
 * @param {Object[]} goals - Company goals
 * @returns {boolean}
 */
export function isAtRunwayCliff(company, goals = []) {
  const months = deriveRunwayMonths(company);
  const cliffThreshold = ASSUMPTIONS.urgencyGates.runwayCliffMonths;
  
  // Not a cliff if above threshold
  if (months >= cliffThreshold) return false;
  
  // Not a cliff if actively fundraising
  const hasActiveRaise = goals.some(g => 
    g.type === 'fundraise' && 
    g.status === 'active'
  );
  
  return !hasActiveRaise;
}

/**
 * Derive estimated months until cash out.
 * Accounts for burn rate trends if available.
 * 
 * @param {Object} company - Raw company data
 * @param {Object} options - Optional parameters
 * @param {number} [options.burnTrend] - Monthly burn change rate (e.g., 0.05 = 5% increase)
 * @returns {number} Estimated months until cash out
 */
export function deriveEstimatedRunway(company, options = {}) {
  const { burnTrend = 0 } = options;
  
  // Simple case: no burn trend
  if (burnTrend === 0) {
    return deriveRunwayMonths(company);
  }
  
  // Complex case: geometric series with burn trend
  const cashBalance = company?.cash ?? 0;
  const monthlyBurn = company?.burn ?? 0;
  
  if (monthlyBurn <= 0) return Infinity;
  if (cashBalance <= 0) return 0;
  
  // Iterate month by month (simple approach)
  let remaining = cashBalance;
  let currentBurn = monthlyBurn;
  let months = 0;
  const maxIterations = 120; // 10 years cap
  
  while (remaining > 0 && months < maxIterations) {
    remaining -= currentBurn;
    currentBurn *= (1 + burnTrend);
    months++;
  }
  
  return months;
}

/**
 * Derive runway health score (0-100).
 * Higher is healthier.
 * 
 * @param {Object} company - Raw company data
 * @returns {number} Health score 0-100
 */
export function deriveRunwayHealthScore(company) {
  const months = deriveRunwayMonths(company);
  
  if (months === Infinity) return 100;
  if (months <= 0) return 0;
  
  // Score based on months of runway
  // 24+ months = 100
  // 12 months = 70
  // 6 months = 40
  // 3 months = 20
  // 0 months = 0
  
  if (months >= 24) return 100;
  if (months >= 18) return 90;
  if (months >= 12) return 70;
  if (months >= 9) return 55;
  if (months >= 6) return 40;
  if (months >= 3) return 20;
  
  // Linear interpolation for < 3 months
  return Math.round((months / 3) * 20);
}

export default {
  deriveRunwayMonths,
  deriveRunwayStatus,
  isAtRunwayCliff,
  deriveEstimatedRunway,
  deriveRunwayHealthScore,
};
