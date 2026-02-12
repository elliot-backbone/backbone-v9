/**
 * derive/constraintPressure.js — Constraint Pressure Computation
 *
 * Computes urgency multiplier for actions based on upcoming company constraints.
 * Constraints are hard temporal boundaries (board meetings, fundraise closes,
 * reporting deadlines) that make certain actions dramatically more valuable
 * before the constraint date and nearly worthless after.
 *
 * Pressure formula:
 *   pressure = baseWeight × urgencyCurve(daysUntil) × relevanceMatch
 *
 * Where:
 *   urgencyCurve = maxPressure × e^(-daysUntil / decayRate)  (exponential urgency)
 *   relevanceMatch = 1.0 if action category matches constraint relevance, else 0.3
 *
 * Multiple constraints stack additively (capped at MAX_PRESSURE).
 *
 * Pure derivation — never persisted.
 *
 * @module derive/constraintPressure
 */

import {
  CONSTRAINT_RELEVANCE,
  CONSTRAINT_BASE_WEIGHT,
} from '../raw/constraintSchema.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// =============================================================================
// CONFIGURATION (importable by weights.js)
// =============================================================================

export const CONSTRAINT_PRESSURE_CONFIG = {
  // Maximum total pressure boost any single action can receive
  maxPressure: 25,

  // Decay rate: how fast pressure builds as constraint approaches (days)
  // Lower = sharper curve. 14 means pressure doubles roughly every 10 days closer.
  decayRate: 14,

  // Peak pressure at the constraint date
  peakPressure: 20,

  // Days beyond which constraint has negligible effect
  horizonDays: 60,

  // Relevance match for non-matching categories (partial ambient pressure)
  ambientRelevance: 0.3,

  // Constraints in the past (already happened) still exert brief residual pressure
  // for actions that should have been done before. Decays over residualDays.
  residualDays: 3,
};

// =============================================================================
// URGENCY CURVE
// =============================================================================

/**
 * Compute urgency from days until constraint.
 * Exponential ramp-up as date approaches. Small residual if just passed.
 *
 * @param {number} daysUntil - Days until constraint (negative = past)
 * @returns {number} 0 to peakPressure
 */
export function urgencyCurve(daysUntil) {
  const { peakPressure, decayRate, horizonDays, residualDays } = CONSTRAINT_PRESSURE_CONFIG;

  // Too far in the future — no pressure
  if (daysUntil > horizonDays) return 0;

  // Recently passed — residual pressure (declining)
  if (daysUntil < 0) {
    if (Math.abs(daysUntil) > residualDays) return 0;
    // Linear decay over residual window
    return peakPressure * (1 - Math.abs(daysUntil) / residualDays) * 0.5;
  }

  // Approaching — exponential urgency curve
  return peakPressure * Math.exp(-daysUntil / decayRate);
}

// =============================================================================
// RELEVANCE MATCHING
// =============================================================================

/**
 * Determine relevance multiplier for an action given a constraint.
 *
 * @param {Object} constraint - Constraint with type field
 * @param {Object} action - Action with sources, entityRef, goal type, etc.
 * @returns {number} 0.3 (ambient) to 1.0 (direct match)
 */
export function computeRelevanceMatch(constraint, action) {
  const relevantCategories = CONSTRAINT_RELEVANCE[constraint.type] || [];

  // 'all' means everything is relevant
  if (relevantCategories.includes('all')) return 1.0;

  // Check action's goal type, source type, resolution category
  const actionCategories = extractActionCategories(action);

  for (const cat of actionCategories) {
    if (relevantCategories.includes(cat)) return 1.0;
  }

  return CONSTRAINT_PRESSURE_CONFIG.ambientRelevance;
}

/**
 * Extract category tags from an action for relevance matching.
 * @param {Object} action
 * @returns {string[]}
 */
function extractActionCategories(action) {
  const categories = [];

  // From goal source
  const source = action.sources?.[0];
  if (source?.goalType) categories.push(source.goalType);

  // From resolution ID mapping
  const resId = (action.resolutionId || '').toUpperCase();
  if (resId.includes('FUNDRAISE') || resId.includes('BRIDGE') || resId.includes('INVESTOR')) {
    categories.push('fundraise');
  }
  if (resId.includes('REVENUE') || resId.includes('PRICING') || resId.includes('SALES')) {
    categories.push('revenue');
  }
  if (resId.includes('HIRE') || resId.includes('RECRUIT') || resId.includes('TEAM')) {
    categories.push('hiring');
  }
  if (resId.includes('RETAIN') || resId.includes('CHURN') || resId.includes('NRR')) {
    categories.push('retention');
  }
  if (resId.includes('CUSTOMER') || resId.includes('GROWTH') || resId.includes('PIPELINE')) {
    categories.push('customer_growth');
  }
  if (resId.includes('COST') || resId.includes('BURN') || resId.includes('EFFICIENCY') || resId.includes('MARGIN')) {
    categories.push('efficiency');
  }
  if (resId.includes('PRODUCT') || resId.includes('LAUNCH') || resId.includes('MVP')) {
    categories.push('product');
  }
  if (resId.includes('PARTNER') || resId.includes('INTRO')) {
    categories.push('partnerships');
  }

  // From action title as fallback
  const title = (action.title || '').toLowerCase();
  if (title.includes('fundrais') || title.includes('raise') || title.includes('investor')) {
    categories.push('fundraise');
  }

  return [...new Set(categories)];
}

// =============================================================================
// PRESSURE COMPUTATION
// =============================================================================

/**
 * Compute constraint pressure boost for a single action.
 *
 * @param {Object} action - Action with entityRef, sources, resolutionId
 * @param {Object[]} constraints - Company constraints with type, date
 * @param {Date} now - Current time
 * @returns {number} Constraint pressure boost (0 to maxPressure)
 */
export function computeActionConstraintPressure(action, constraints, now) {
  if (!constraints || constraints.length === 0) return 0;

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  let totalPressure = 0;

  for (const constraint of constraints) {
    const constraintMs = new Date(constraint.date).getTime();
    const daysUntil = (constraintMs - nowMs) / MS_PER_DAY;

    const urgency = urgencyCurve(daysUntil);
    if (urgency === 0) continue;

    const baseWeight = CONSTRAINT_BASE_WEIGHT[constraint.type] || 1.0;
    const relevance = computeRelevanceMatch(constraint, action);

    totalPressure += baseWeight * urgency * relevance;
  }

  return Math.min(totalPressure, CONSTRAINT_PRESSURE_CONFIG.maxPressure);
}

/**
 * Build a Map<actionId, constraintPressure> for all actions at a company.
 *
 * @param {Object[]} actions - Actions with actionId, entityRef
 * @param {Object[]} constraints - Constraints for this company
 * @param {Date} now - Current time
 * @returns {Map<string, number>} Map<actionId, pressure>
 */
export function buildConstraintPressureMap(actions, constraints, now) {
  const pressureMap = new Map();
  if (!actions || !constraints || constraints.length === 0) return pressureMap;

  for (const action of actions) {
    const pressure = computeActionConstraintPressure(action, constraints, now);
    if (pressure > 0) {
      pressureMap.set(action.actionId, pressure);
    }
  }

  return pressureMap;
}

/**
 * Summarize constraint pressure for a company (for UI display).
 *
 * @param {Object[]} constraints - Company constraints
 * @param {Date} now - Current time
 * @returns {Object} { upcoming: [...], maxUrgency: number, totalActive: number }
 */
export function summarizeConstraints(constraints, now) {
  if (!constraints || constraints.length === 0) {
    return { upcoming: [], maxUrgency: 0, totalActive: 0 };
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const { horizonDays, residualDays } = CONSTRAINT_PRESSURE_CONFIG;

  const upcoming = constraints
    .map(c => {
      const daysUntil = (new Date(c.date).getTime() - nowMs) / MS_PER_DAY;
      return { ...c, daysUntil: Math.round(daysUntil * 10) / 10, urgency: urgencyCurve(daysUntil) };
    })
    .filter(c => c.daysUntil > -residualDays && c.daysUntil <= horizonDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    upcoming,
    maxUrgency: upcoming.length > 0 ? Math.max(...upcoming.map(c => c.urgency)) : 0,
    totalActive: upcoming.length,
  };
}

export default {
  CONSTRAINT_PRESSURE_CONFIG,
  urgencyCurve,
  computeRelevanceMatch,
  computeActionConstraintPressure,
  buildConstraintPressureMap,
  summarizeConstraints,
};

// =============================================================================
// CONSTRAINT DRIVERS — context for UI
// =============================================================================

/**
 * For a single action, return which constraints are driving its pressure boost.
 * Used by UI to show "Board meeting in 4d" next to an action.
 *
 * @param {Object} action - Action with entityRef, sources, resolutionId
 * @param {Object[]} constraints - Company constraints
 * @param {Date} now - Current time
 * @returns {Object[]} Array of { type, title, daysUntil, pressure, relevance }
 */
export function getConstraintDrivers(action, constraints, now) {
  if (!constraints || constraints.length === 0) return [];

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const { horizonDays, residualDays } = CONSTRAINT_PRESSURE_CONFIG;
  const drivers = [];

  for (const constraint of constraints) {
    const constraintMs = new Date(constraint.date).getTime();
    const daysUntil = (constraintMs - nowMs) / MS_PER_DAY;

    // Skip constraints outside active window
    if (daysUntil > horizonDays || daysUntil < -residualDays) continue;

    const urgency = urgencyCurve(daysUntil);
    if (urgency === 0) continue;

    const baseWeight = CONSTRAINT_BASE_WEIGHT[constraint.type] || 1.0;
    const relevance = computeRelevanceMatch(constraint, action);
    const pressure = baseWeight * urgency * relevance;

    if (pressure > 0.5) { // Only include meaningful drivers
      drivers.push({
        type: constraint.type,
        title: constraint.title,
        daysUntil: Math.round(daysUntil),
        pressure: Math.round(pressure * 10) / 10,
        relevance,
        constraintId: constraint.id,
      });
    }
  }

  return drivers.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Build Map<actionId, constraintDrivers[]> for all actions at a company.
 *
 * @param {Object[]} actions
 * @param {Object[]} constraints
 * @param {Date} now
 * @returns {Map<string, Object[]>}
 */
export function buildConstraintDriversMap(actions, constraints, now) {
  const driversMap = new Map();
  if (!actions || !constraints || constraints.length === 0) return driversMap;

  for (const action of actions) {
    const drivers = getConstraintDrivers(action, constraints, now);
    if (drivers.length > 0) {
      driversMap.set(action.actionId, drivers);
    }
  }

  return driversMap;
}
