/**
 * metrics.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Metric Time Series View (Phase 3.2)
 * 
 * Builds normalized metric views from raw goal/deal data.
 * Derived output - never persisted.
 * 
 * @module metrics
 */

// =============================================================================
// METRIC EXTRACTION
// =============================================================================

/**
 * Extract metric time series from a goal
 * @param {Object} goal 
 * @param {string} companyId 
 * @returns {Object} Metric record
 */
function extractGoalMetric(goal, companyId) {
  return {
    metricId: `${companyId}:goal:${goal.id}`,
    entityRef: { type: 'company', id: companyId },
    metricKey: goal.type || 'custom',
    goalId: goal.id,
    name: goal.name,
    current: goal.current,
    target: goal.target,
    due: goal.due,
    status: goal.status,
    asOf: goal.asOf,
    provenance: goal.provenance || 'manual',
    history: goal.history || [] // If present, array of { date, value }
  };
}

/**
 * Extract fundraise metrics from deals
 * @param {Object[]} deals 
 * @param {string} companyId 
 * @param {Object} company 
 * @returns {Object[]} Metric records
 */
function extractDealMetrics(deals, companyId, company) {
  if (!deals || deals.length === 0) return [];
  
  // Aggregate deal pipeline
  const totalPipeline = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const weightedPipeline = deals.reduce((sum, d) => 
    sum + ((d.amount || 0) * (d.probability || 0) / 100), 0);
  
  const metrics = [];
  
  // If company has a round target, create a fundraise metric
  if (company.roundTarget > 0) {
    // Find committed/closed deals
    const committed = deals
      .filter(d => d.status === 'termsheet' || d.status === 'closed')
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    
    metrics.push({
      metricId: `${companyId}:deals:pipeline`,
      entityRef: { type: 'company', id: companyId },
      metricKey: 'fundraise_pipeline',
      name: 'Fundraise Pipeline',
      current: committed,
      target: company.roundTarget,
      due: null, // No fixed due date for pipeline
      status: 'active',
      asOf: company.asOf,
      provenance: 'computed',
      totalPipeline,
      weightedPipeline,
      dealCount: deals.length
    });
  }
  
  return metrics;
}

// =============================================================================
// MAIN DERIVATION
// =============================================================================

/**
 * Derive all metrics for a company
 * @param {Object} company 
 * @returns {Object[]} Array of metric records
 */
export function deriveCompanyMetrics(company) {
  const metrics = [];
  
  // Extract goal metrics
  for (const goal of company.goals || []) {
    metrics.push(extractGoalMetric(goal, company.id));
  }
  
  // Extract deal metrics
  const dealMetrics = extractDealMetrics(company.deals, company.id, company);
  metrics.push(...dealMetrics);
  
  return metrics;
}

/**
 * Derive all metrics for portfolio
 * @param {Object[]} companies 
 * @returns {{ byCompany: Object, all: Object[] }}
 */
export function derivePortfolioMetrics(companies) {
  const byCompany = {};
  const all = [];
  
  for (const company of companies) {
    const companyMetrics = deriveCompanyMetrics(company);
    byCompany[company.id] = companyMetrics;
    all.push(...companyMetrics);
  }
  
  return { byCompany, all };
}

/**
 * Get metrics by metricKey
 * @param {Object[]} metrics 
 * @param {string} metricKey 
 * @returns {Object[]}
 */
export function filterByMetricKey(metrics, metricKey) {
  return metrics.filter(m => m.metricKey === metricKey);
}

/**
 * Calculate progress for a metric
 * @param {Object} metric 
 * @returns {number} Progress 0-1
 */
export function calculateProgress(metric) {
  if (!metric.target || metric.target === 0) return 0;
  return Math.min(1, Math.max(0, metric.current / metric.target));
}

/**
 * Calculate days remaining to due date
 * @param {Object} metric 
 * @param {Date} now 
 * @returns {number|null}
 */
export function daysRemaining(metric, now) {
  if (!metric.due) return null;
  const due = new Date(metric.due);
  const diffMs = due - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default {
  deriveCompanyMetrics,
  derivePortfolioMetrics,
  filterByMetricKey,
  calculateProgress,
  daysRemaining
};
