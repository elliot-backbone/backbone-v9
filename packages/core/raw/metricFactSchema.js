/**
 * metricFactSchema.js — metricFact validation and constants
 *
 * A metricFact is a single observed measurement at a point in time.
 * Raw data only — no derivations, no computed values.
 *
 * Required fields: id, companyId, metricKey, value, unit, source, asOf
 *
 * @module metricFactSchema
 */

// Allowed raw metricKeys (never derived values)
export const RAW_METRIC_KEYS = [
  'cash', 'burn', 'arr', 'mrr', 'revenue',
  'employees', 'customers', 'churn_rate',
  'gross_margin', 'nps', 'dau', 'mau',
  'pipeline_value', 'deals_active',
  'raised_to_date', 'last_raise_amount'
];

// Forbidden metricKeys (these are derived, never stored as raw)
export const FORBIDDEN_METRIC_KEYS = [
  'runway', 'runway_months', 'ltv_cac_ratio', 'acv',
  'goalDamage', 'projectedGoalDamage',
  'healthScore', 'rankScore', 'trajectory',
  'snapshot', 'velocity', 'probability'
];

// Valid units
export const VALID_UNITS = [
  'usd', 'usd_monthly', 'usd_annual',
  'count', 'percentage', 'ratio',
  'months', 'days', 'score'
];

// Valid sources
export const VALID_SOURCES = [
  'manual', 'spreadsheet', 'api', 'meeting_transcript',
  'email', 'crm_sync', 'bank_sync', 'founder_update'
];

/**
 * Validate a single metricFact object.
 * @param {Object} fact
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMetricFact(fact) {
  const errors = [];
  const required = ['id', 'companyId', 'metricKey', 'value', 'unit', 'source', 'asOf'];

  for (const field of required) {
    if (fact[field] === undefined || fact[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (fact.metricKey && FORBIDDEN_METRIC_KEYS.includes(fact.metricKey)) {
    errors.push(`Forbidden derived metricKey: ${fact.metricKey}`);
  }

  if (fact.unit && !VALID_UNITS.includes(fact.unit)) {
    errors.push(`Invalid unit: ${fact.unit}. Must be one of: ${VALID_UNITS.join(', ')}`);
  }

  if (fact.value !== undefined && typeof fact.value !== 'number') {
    errors.push(`value must be a number, got ${typeof fact.value}`);
  }

  // Check for unexpected fields
  const allowed = new Set([...required, 'notes']);
  for (const key of Object.keys(fact)) {
    if (!allowed.has(key)) {
      errors.push(`Unexpected field: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
