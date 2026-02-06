/**
 * metricResolver.js — Resolve metric values from metricFacts or scalar fallback
 *
 * Resolution order:
 * 1. Latest metricFact for the company+metricKey (by asOf date)
 * 2. Scalar field on company object (e.g., company.cash)
 * 3. null
 *
 * @module metricResolver
 */

/**
 * Build a lookup: companyId → metricKey → latest value
 * @param {Array} metricFacts
 * @returns {Map<string, Map<string, {value: number, asOf: string, source: string}>>}
 */
export function buildMetricFactIndex(metricFacts) {
  const index = new Map();
  for (const fact of (metricFacts || [])) {
    if (!index.has(fact.companyId)) {
      index.set(fact.companyId, new Map());
    }
    const companyMap = index.get(fact.companyId);
    const existing = companyMap.get(fact.metricKey);
    if (!existing || fact.asOf > existing.asOf) {
      companyMap.set(fact.metricKey, { value: fact.value, asOf: fact.asOf, source: fact.source });
    }
  }
  return index;
}

/**
 * Resolve a metric value for a company.
 * Prefers metricFact, falls back to scalar field.
 *
 * @param {Object} company - Raw company object
 * @param {string} metricKey - e.g., 'cash', 'burn', 'arr', 'employees'
 * @param {Map} metricFactIndex - From buildMetricFactIndex()
 * @returns {{ value: number|null, source: string, asOf: string|null }}
 */
export function resolveMetric(company, metricKey, metricFactIndex) {
  // Try metricFact first
  const companyFacts = metricFactIndex?.get(company.id);
  if (companyFacts?.has(metricKey)) {
    return companyFacts.get(metricKey);
  }

  // Fallback to scalar
  const scalarValue = company[metricKey];
  if (scalarValue !== undefined && scalarValue !== null) {
    return { value: scalarValue, source: 'scalar_fallback', asOf: company.asOf || null };
  }

  return { value: null, source: 'missing', asOf: null };
}

/**
 * Get time-series of a metric for a company (all metricFacts, sorted by asOf).
 * Used for snapshot and trajectory derivation.
 */
export function getMetricTimeSeries(companyId, metricKey, metricFacts) {
  return (metricFacts || [])
    .filter(f => f.companyId === companyId && f.metricKey === metricKey)
    .sort((a, b) => (a.asOf || '').localeCompare(b.asOf || ''));
}
