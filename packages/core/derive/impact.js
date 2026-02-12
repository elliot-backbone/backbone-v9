/**
 * derive/impact.js — Canonical impact computation functions
 *
 * Single source of truth for timePenalty and computeExpectedNetImpact.
 * Imported by decide/ranking.js, decide/weights.js, predict/actionSchema.js.
 *
 * @module derive/impact
 */

/**
 * Time penalty function (explicit, monotonic)
 * Small penalty per week, capped at 30
 * @param {number} days - timeToImpactDays
 * @returns {number}
 */
export function timePenalty(days) {
  return Math.min(30, days / 7);
}

/**
 * Compute expected net impact from impact model
 *
 * ENI = expectedUpside + leverage + proactivityBonus - expectedDownside - effort - timePenalty
 *
 * proactivityBonus rewards early detection (seeing around corners).
 *
 * @param {Object} impact - ImpactModel
 * @returns {number}
 */
export function computeExpectedNetImpact(impact) {
  const {
    upsideMagnitude = 0,
    probabilityOfSuccess = 0.5,
    executionProbability = 1,
    downsideMagnitude = 0,
    timeToImpactDays = 14,
    effortCost = 0,
    secondOrderLeverage = 0,
    proactivityBonus = 0
  } = impact;

  const combinedProbability = executionProbability * probabilityOfSuccess;
  const expectedUpside = upsideMagnitude * combinedProbability;
  const expectedDownside = downsideMagnitude * (1 - combinedProbability);
  const timePen = timePenalty(timeToImpactDays);

  return expectedUpside + secondOrderLeverage + proactivityBonus - expectedDownside - effortCost - timePen;
}

export default { timePenalty, computeExpectedNetImpact };
