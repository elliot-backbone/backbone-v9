/**
 * goalFromAnomaly.js — Maps anomalies to goal candidates and selects top goals
 *
 * Part of the goal-driven pipeline:
 *   anomalies → goal candidates → selectTopGoals → actions
 *
 * @module goalFromAnomaly
 */

import { getStageGoals } from '../raw/stageParams.js';
import { ANOMALY_TYPES } from '../derive/anomalyDetection.js';

// =============================================================================
// ANOMALY → GOAL TYPE MAPPING
// =============================================================================

const ANOMALY_TO_GOAL = {
  [ANOMALY_TYPES.RUNWAY_BELOW_MIN]:          { goalType: 'operational',     name: 'Extend Runway' },
  [ANOMALY_TYPES.RUNWAY_ABOVE_MAX]:          { goalType: 'operational',     name: 'Deploy Capital' },
  [ANOMALY_TYPES.BURN_BELOW_MIN]:            { goalType: 'operational',     name: 'Increase Investment' },
  [ANOMALY_TYPES.BURN_ABOVE_MAX]:            { goalType: 'operational',     name: 'Reduce Burn Rate' },
  [ANOMALY_TYPES.EMPLOYEES_BELOW_MIN]:       { goalType: 'hiring',          name: 'Build Team' },
  [ANOMALY_TYPES.EMPLOYEES_ABOVE_MAX]:       { goalType: 'operational',     name: 'Optimize Team Size' },
  [ANOMALY_TYPES.REVENUE_BELOW_MIN]:         { goalType: 'revenue',         name: 'Grow Revenue' },
  [ANOMALY_TYPES.REVENUE_ABOVE_MAX]:         { goalType: 'fundraise',       name: 'Prepare Next Round' },
  [ANOMALY_TYPES.REVENUE_MISSING_REQUIRED]:  { goalType: 'revenue',         name: 'Establish Revenue' },
  [ANOMALY_TYPES.RAISE_BELOW_MIN]:           { goalType: 'fundraise',       name: 'Right-Size Round' },
  [ANOMALY_TYPES.RAISE_ABOVE_MAX]:           { goalType: 'operational',     name: 'Validate Stage' },
  [ANOMALY_TYPES.STAGE_MISMATCH_METRICS]:    { goalType: 'operational',     name: 'Review Stage Fit' },
  [ANOMALY_TYPES.NRR_BELOW_THRESHOLD]:       { goalType: 'retention',       name: 'Improve NRR' },
  [ANOMALY_TYPES.GRR_BELOW_THRESHOLD]:       { goalType: 'retention',       name: 'Improve GRR' },
  [ANOMALY_TYPES.GROSS_MARGIN_BELOW_THRESHOLD]: { goalType: 'efficiency',   name: 'Improve Gross Margin' },
  [ANOMALY_TYPES.CAC_ABOVE_THRESHOLD]:       { goalType: 'efficiency',      name: 'Reduce CAC' },
  [ANOMALY_TYPES.LOGO_RETENTION_LOW]:        { goalType: 'retention',       name: 'Improve Retention' },
  [ANOMALY_TYPES.HIRING_PLAN_BEHIND]:        { goalType: 'hiring',          name: 'Accelerate Hiring' },
  [ANOMALY_TYPES.NPS_BELOW_THRESHOLD]:       { goalType: 'customer_growth', name: 'Improve NPS' },
  [ANOMALY_TYPES.OPEN_POSITIONS_ABOVE_MAX]:  { goalType: 'hiring',          name: 'Right-Size Hiring' },
  [ANOMALY_TYPES.PAYING_CUSTOMERS_BELOW_MIN]:{ goalType: 'customer_growth', name: 'Grow Customer Base' },
  [ANOMALY_TYPES.ACV_BELOW_MIN]:             { goalType: 'efficiency',      name: 'Optimize ACV' },
  [ANOMALY_TYPES.ACV_ABOVE_MAX]:             { goalType: 'customer_growth', name: 'Diversify Customers' },
  [ANOMALY_TYPES.RAISED_TO_DATE_LOW]:        { goalType: 'fundraise',       name: 'Raise Capital' },
  [ANOMALY_TYPES.LAST_RAISE_UNDERSIZE]:      { goalType: 'fundraise',       name: 'Right-Size Next Round' },
  [ANOMALY_TYPES.COMPANY_AGE_STAGE_MISMATCH]:{ goalType: 'operational',     name: 'Review Stage Fit' },
};

// =============================================================================
// MAP ANOMALIES TO GOALS
// =============================================================================

/**
 * Maps anomalies to goal candidates.
 * Each anomaly produces one goal candidate with severity-based weight.
 *
 * @param {Array} anomalies - From detectAnomalies()
 * @param {Object} company - Company object
 * @returns {Array} Goal candidates
 */
export function mapAnomaliesToGoals(anomalies, company) {
  const goals = [];
  const seenTypes = new Set();

  for (const anomaly of anomalies) {
    const mapping = ANOMALY_TO_GOAL[anomaly.type];
    if (!mapping) continue;

    // Deduplicate: at most one goal per goalType from anomalies
    const key = `${mapping.goalType}-${mapping.name}`;
    if (seenTypes.has(key)) continue;
    seenTypes.add(key);

    // Derive cur/tgt from anomaly evidence
    const ev = anomaly.evidence || {};
    const cur = ev.actual ?? 0;
    const tgt = ev.min ?? ev.target ?? ev.max ?? 0;

    // Severity → weight (higher severity = higher priority goal)
    const severityWeight = [40, 55, 70, 90][anomaly.severity] || 50;

    // Due date based on severity
    const daysToDeadline = anomaly.severity >= 3 ? 30
      : anomaly.severity >= 2 ? 60
      : anomaly.severity >= 1 ? 90
      : 120;
    const due = new Date();
    due.setDate(due.getDate() + daysToDeadline);

    goals.push({
      id: `goal-anom-${company.id}-${mapping.goalType}-${goals.length}`,
      name: mapping.name,
      type: mapping.goalType,
      companyId: company.id,
      source: 'anomaly',
      sourceAnomaly: anomaly.type,
      cur,
      tgt,
      status: 'active',
      due: due.toISOString().split('T')[0],
      weight: severityWeight,
      severity: anomaly.severity,
      provenance: 'anomaly',
    });
  }

  return goals;
}

// =============================================================================
// SELECT TOP GOALS
// =============================================================================

/**
 * Selects at least minCount goals for a company.
 * Priority order:
 *   1. Existing raw goals that are active/at_risk
 *   2. Anomaly-driven goals sorted by severity (desc)
 *   3. Stage template goals as padding
 *
 * Deduplicates by goal type — at most 2 of same type.
 *
 * @param {Array} existingGoals - Raw goals from company data
 * @param {Array} anomalyGoals - From mapAnomaliesToGoals()
 * @param {Array} templateGoals - From getStageGoals()
 * @param {number} minCount - Minimum goals to return (default 5)
 * @returns {Array} Selected goals (>= minCount)
 */
export function selectTopGoals(existingGoals, anomalyGoals, templateGoals, minCount = 5) {
  const selected = [];
  const typeCount = {};

  function canAdd(goalType) {
    return (typeCount[goalType] || 0) < 2;
  }

  function add(goal) {
    if (!canAdd(goal.type)) return false;
    selected.push(goal);
    typeCount[goal.type] = (typeCount[goal.type] || 0) + 1;
    return true;
  }

  // 1. Existing raw goals (active or at_risk)
  const activeExisting = (existingGoals || []).filter(g =>
    g.status === 'active' || g.status === 'at_risk'
  );
  for (const goal of activeExisting) {
    add(goal);
  }

  // 2. Anomaly-driven goals (sorted by severity desc)
  const sortedAnomalyGoals = [...(anomalyGoals || [])].sort((a, b) =>
    (b.severity || 0) - (a.severity || 0)
  );
  for (const goal of sortedAnomalyGoals) {
    if (selected.length >= minCount * 2) break; // Don't over-add
    add(goal);
  }

  // 3. Stage templates as padding
  if (selected.length < minCount && templateGoals) {
    for (const template of templateGoals) {
      if (selected.length >= minCount) break;
      // Convert stage template to goal shape
      const templateGoal = {
        id: `goal-tmpl-${template.type}-${selected.length}`,
        name: template.name,
        type: template.type,
        source: 'template',
        cur: 0,
        tgt: 100,
        status: 'active',
        weight: 40,
        provenance: 'template',
      };
      add(templateGoal);
    }
  }

  // If still under min, add generic goals
  const fallbackTypes = ['revenue', 'operational', 'hiring', 'product', 'fundraise'];
  let fallbackIdx = 0;
  while (selected.length < minCount && fallbackIdx < fallbackTypes.length) {
    const type = fallbackTypes[fallbackIdx++];
    if (!canAdd(type)) continue;
    add({
      id: `goal-fallback-${type}-${selected.length}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Growth`,
      type,
      source: 'fallback',
      cur: 0,
      tgt: 100,
      status: 'active',
      weight: 30,
      provenance: 'template',
    });
  }

  return selected;
}

export default { mapAnomaliesToGoals, selectTopGoals };
