/**
 * snapshot.js — Point-in-time company snapshot
 *
 * Derives current metric values by resolving metricFacts (latest by asOf)
 * with scalar fallbacks. Output is a flat object of metric → value pairs
 * plus metadata (staleness, confidence).
 *
 * INVARIANT: snapshot is DERIVED. Never stored in raw/.
 *
 * @module snapshot
 */

import { resolveMetric } from './metricResolver.js';

const SNAPSHOT_METRICS = [
  'cash', 'burn', 'arr', 'mrr', 'revenue',
  'employees', 'customers', 'churn_rate',
  'gross_margin', 'nps', 'dau', 'mau',
  'pipeline_value', 'deals_active',
  'raised_to_date', 'last_raise_amount'
];

/**
 * Derive a snapshot for a single company.
 *
 * @param {Object} company - Raw company object (with scalar fields)
 * @param {Map} metricFactIndex - From buildMetricFactIndex()
 * @param {Date} now - Reference time for staleness calculation
 * @returns {Object} Snapshot with values, sources, staleness
 */
export function deriveSnapshot(company, metricFactIndex, now = new Date()) {
  const snapshot = {
    companyId: company.id,
    derivedAt: now.toISOString(),
    metrics: {},
    staleness: {},
    sources: {},
    confidence: 1.0,
  };

  let staleCount = 0;
  let resolvedCount = 0;

  for (const metricKey of SNAPSHOT_METRICS) {
    const resolved = resolveMetric(company, metricKey, metricFactIndex);

    if (resolved.value !== null) {
      snapshot.metrics[metricKey] = resolved.value;
      snapshot.sources[metricKey] = resolved.source;
      resolvedCount++;

      if (resolved.asOf) {
        const asOfDate = new Date(resolved.asOf);
        const daysSince = Math.floor((now - asOfDate) / (1000 * 60 * 60 * 24));
        snapshot.staleness[metricKey] = daysSince;
        if (daysSince > 30) staleCount++;
      }
    }
  }

  if (resolvedCount > 0) {
    snapshot.confidence = Math.max(0.1, 1 - (staleCount / resolvedCount) * 0.3);
  } else {
    snapshot.confidence = 0.1;
  }

  return snapshot;
}

/**
 * Derive snapshots for all portfolio companies.
 */
export function derivePortfolioSnapshots(companies, metricFactIndex, now = new Date()) {
  return companies
    .filter(c => c.isPortfolio)
    .map(c => deriveSnapshot(c, metricFactIndex, now));
}
