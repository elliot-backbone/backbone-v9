/**
 * anomalyDetection.js — Stage-Based Anomaly Detection
 * 
 * Compares real company data against stage-appropriate bounds from stageParams.
 * Outputs deviations that feed into suggested goals and ETL validation.
 * 
 * Anomaly severity:
 * - CRITICAL: Far outside bounds (>2x deviation), immediate action needed
 * - HIGH: Outside bounds, should address soon
 * - MEDIUM: At boundary, worth monitoring
 * - LOW: Slightly unusual, informational
 * 
 * Pure derivation: no storage of computed values.
 * 
 * @module anomalyDetection
 */

import { getStageParams, getStageIndex, STAGES } from '../raw/stageParams.js';
import { deriveRunway } from './runway.js';

// =============================================================================
// SEVERITY LEVELS
// =============================================================================

export const ANOMALY_SEVERITY = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
  LOW: 0,
};

// =============================================================================
// ANOMALY TYPES
// =============================================================================

export const ANOMALY_TYPES = {
  // Runway anomalies
  RUNWAY_BELOW_MIN: 'RUNWAY_BELOW_MIN',
  RUNWAY_ABOVE_MAX: 'RUNWAY_ABOVE_MAX',
  
  // Burn anomalies
  BURN_BELOW_MIN: 'BURN_BELOW_MIN',
  BURN_ABOVE_MAX: 'BURN_ABOVE_MAX',
  
  // Team anomalies
  EMPLOYEES_BELOW_MIN: 'EMPLOYEES_BELOW_MIN',
  EMPLOYEES_ABOVE_MAX: 'EMPLOYEES_ABOVE_MAX',
  
  // Revenue anomalies
  REVENUE_BELOW_MIN: 'REVENUE_BELOW_MIN',
  REVENUE_ABOVE_MAX: 'REVENUE_ABOVE_MAX',
  REVENUE_MISSING_REQUIRED: 'REVENUE_MISSING_REQUIRED',
  
  // Fundraise anomalies
  RAISE_BELOW_MIN: 'RAISE_BELOW_MIN',
  RAISE_ABOVE_MAX: 'RAISE_ABOVE_MAX',
  
  // Stage mismatch
  STAGE_MISMATCH_METRICS: 'STAGE_MISMATCH_METRICS',
};

// =============================================================================
// DEVIATION CALCULATION
// =============================================================================

/**
 * Calculate how far a value deviates from expected bounds
 * Returns: { deviation: number, direction: 'below'|'above'|'within', ratio: number }
 */
function calculateDeviation(value, min, max) {
  if (value === null || value === undefined) {
    return { deviation: null, direction: 'missing', ratio: null };
  }
  
  if (value < min) {
    const deviation = min - value;
    const ratio = min > 0 ? value / min : 0;
    return { deviation, direction: 'below', ratio };
  }
  
  if (value > max) {
    const deviation = value - max;
    const ratio = max > 0 ? value / max : Infinity;
    return { deviation, direction: 'above', ratio };
  }
  
  // Within bounds - calculate position in range
  const range = max - min;
  const position = range > 0 ? (value - min) / range : 0.5;
  return { deviation: 0, direction: 'within', ratio: 1, position };
}

/**
 * Determine severity based on deviation ratio
 */
function deviationToSeverity(ratio, direction) {
  if (direction === 'within') return null;
  if (direction === 'missing') return ANOMALY_SEVERITY.MEDIUM;
  
  if (direction === 'below') {
    if (ratio < 0.25) return ANOMALY_SEVERITY.CRITICAL;
    if (ratio < 0.5) return ANOMALY_SEVERITY.HIGH;
    if (ratio < 0.75) return ANOMALY_SEVERITY.MEDIUM;
    return ANOMALY_SEVERITY.LOW;
  }
  
  if (direction === 'above') {
    if (ratio > 3) return ANOMALY_SEVERITY.CRITICAL;
    if (ratio > 2) return ANOMALY_SEVERITY.HIGH;
    if (ratio > 1.5) return ANOMALY_SEVERITY.MEDIUM;
    return ANOMALY_SEVERITY.LOW;
  }
  
  return ANOMALY_SEVERITY.LOW;
}

// =============================================================================
// ANOMALY CREATION
// =============================================================================

function createAnomaly({ type, entityRef, severity, metric, evidence }) {
  return {
    anomalyId: `${type}-${entityRef.id}`,
    type,
    entityRef,
    severity,
    metric,
    evidence,
    detectedAt: new Date().toISOString(),
  };
}

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect runway anomalies
 */
function detectRunwayAnomalies(company, params, now) {
  const anomalies = [];
  
  const runway = deriveRunway(
    company.cash,
    company.burn,
    company.asOf,
    company.asOf,
    now
  );
  
  if (runway.value === null) {
    return anomalies; // Missing data handled elsewhere
  }
  
  if (runway.value === Infinity) {
    return anomalies; // Profitable/no burn - not an anomaly
  }
  
  const { direction, ratio } = calculateDeviation(
    runway.value,
    params.runwayMin,
    params.runwayMax
  );
  
  if (direction === 'below') {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.RUNWAY_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity: deviationToSeverity(ratio, direction),
      metric: 'runway',
      evidence: {
        actual: runway.value,
        min: params.runwayMin,
        max: params.runwayMax,
        target: params.runwayTarget,
        ratio,
        gap: params.runwayMin - runway.value,
        explain: `Runway ${runway.value.toFixed(1)} months is below stage minimum of ${params.runwayMin} months`,
      },
    }));
  }
  
  // Runway above max is unusual but not necessarily bad - flag as low severity
  if (direction === 'above' && ratio > 1.5) {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.RUNWAY_ABOVE_MAX,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.LOW,
      metric: 'runway',
      evidence: {
        actual: runway.value,
        min: params.runwayMin,
        max: params.runwayMax,
        ratio,
        explain: `Runway ${runway.value.toFixed(1)} months exceeds stage norm of ${params.runwayMax} months - consider deploying capital`,
      },
    }));
  }
  
  return anomalies;
}

/**
 * Detect burn rate anomalies
 */
function detectBurnAnomalies(company, params) {
  const anomalies = [];
  
  if (company.burn === null || company.burn === undefined) {
    return anomalies;
  }
  
  const { direction, ratio } = calculateDeviation(
    company.burn,
    params.burnMin,
    params.burnMax
  );
  
  if (direction === 'below' && ratio < 0.5) {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.BURN_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.LOW, // Low burn isn't necessarily bad
      metric: 'burn',
      evidence: {
        actual: company.burn,
        min: params.burnMin,
        max: params.burnMax,
        ratio,
        explain: `Burn $${(company.burn/1000).toFixed(0)}K/mo is below stage typical of $${(params.burnMin/1000).toFixed(0)}K-${(params.burnMax/1000).toFixed(0)}K/mo`,
      },
    }));
  }
  
  if (direction === 'above') {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.BURN_ABOVE_MAX,
      entityRef: { type: 'company', id: company.id },
      severity: deviationToSeverity(ratio, direction),
      metric: 'burn',
      evidence: {
        actual: company.burn,
        min: params.burnMin,
        max: params.burnMax,
        ratio,
        excess: company.burn - params.burnMax,
        explain: `Burn $${(company.burn/1000).toFixed(0)}K/mo exceeds stage maximum of $${(params.burnMax/1000).toFixed(0)}K/mo`,
      },
    }));
  }
  
  return anomalies;
}

/**
 * Detect employee count anomalies
 */
function detectEmployeeAnomalies(company, params) {
  const anomalies = [];
  
  if (company.employees === null || company.employees === undefined) {
    return anomalies;
  }
  
  const { direction, ratio } = calculateDeviation(
    company.employees,
    params.employeesMin,
    params.employeesMax
  );
  
  if (direction === 'below') {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.EMPLOYEES_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity: deviationToSeverity(ratio, direction),
      metric: 'employees',
      evidence: {
        actual: company.employees,
        min: params.employeesMin,
        max: params.employeesMax,
        ratio,
        gap: params.employeesMin - company.employees,
        explain: `Team size ${company.employees} is below stage minimum of ${params.employeesMin}`,
      },
    }));
  }
  
  if (direction === 'above') {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.EMPLOYEES_ABOVE_MAX,
      entityRef: { type: 'company', id: company.id },
      severity: deviationToSeverity(ratio, direction),
      metric: 'employees',
      evidence: {
        actual: company.employees,
        min: params.employeesMin,
        max: params.employeesMax,
        ratio,
        excess: company.employees - params.employeesMax,
        explain: `Team size ${company.employees} exceeds stage typical of ${params.employeesMax}`,
      },
    }));
  }
  
  return anomalies;
}

/**
 * Detect revenue anomalies
 */
function detectRevenueAnomalies(company, params) {
  const anomalies = [];
  
  const revenue = company.revenue || company.arr || 0;
  
  // Check if revenue is required but missing
  if (params.revenueRequired && revenue === 0) {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.REVENUE_MISSING_REQUIRED,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.HIGH,
      metric: 'revenue',
      evidence: {
        actual: 0,
        min: params.revenueMin,
        required: true,
        explain: `No revenue reported but revenue is expected at ${company.stage} stage`,
      },
    }));
    return anomalies;
  }
  
  if (revenue === 0) return anomalies; // Early stage, no revenue expected
  
  const { direction, ratio } = calculateDeviation(
    revenue,
    params.revenueMin,
    params.revenueMax
  );
  
  if (direction === 'below' && params.revenueRequired) {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.REVENUE_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity: deviationToSeverity(ratio, direction),
      metric: 'revenue',
      evidence: {
        actual: revenue,
        min: params.revenueMin,
        max: params.revenueMax,
        ratio,
        gap: params.revenueMin - revenue,
        explain: `Revenue $${(revenue/1000000).toFixed(1)}M is below stage minimum of $${(params.revenueMin/1000000).toFixed(1)}M`,
      },
    }));
  }
  
  // Revenue above max might indicate stage mismatch
  if (direction === 'above' && ratio > 2) {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.REVENUE_ABOVE_MAX,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.LOW, // High revenue isn't bad, but may indicate wrong stage
      metric: 'revenue',
      evidence: {
        actual: revenue,
        min: params.revenueMin,
        max: params.revenueMax,
        ratio,
        explain: `Revenue $${(revenue/1000000).toFixed(1)}M exceeds stage typical - may be ready for next round`,
      },
    }));
  }
  
  return anomalies;
}

/**
 * Detect fundraise target anomalies
 */
function detectFundraiseAnomalies(company, params) {
  const anomalies = [];
  
  if (!company.raising || !company.roundTarget) {
    return anomalies;
  }
  
  const { direction, ratio } = calculateDeviation(
    company.roundTarget,
    params.raiseMin,
    params.raiseMax
  );
  
  if (direction === 'below') {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.RAISE_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.MEDIUM,
      metric: 'roundTarget',
      evidence: {
        actual: company.roundTarget,
        min: params.raiseMin,
        max: params.raiseMax,
        ratio,
        explain: `Raise target $${(company.roundTarget/1000000).toFixed(1)}M is below stage typical of $${(params.raiseMin/1000000).toFixed(1)}M`,
      },
    }));
  }
  
  if (direction === 'above') {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.RAISE_ABOVE_MAX,
      entityRef: { type: 'company', id: company.id },
      severity: deviationToSeverity(ratio, direction),
      metric: 'roundTarget',
      evidence: {
        actual: company.roundTarget,
        min: params.raiseMin,
        max: params.raiseMax,
        ratio,
        explain: `Raise target $${(company.roundTarget/1000000).toFixed(1)}M exceeds stage typical of $${(params.raiseMax/1000000).toFixed(1)}M`,
      },
    }));
  }
  
  return anomalies;
}

/**
 * Detect stage mismatch (metrics suggest different stage than reported)
 */
function detectStageMismatch(company, anomalies) {
  const stageAnomalies = [];
  
  // Count how many metrics suggest a different stage
  const aboveMaxCount = anomalies.filter(a => 
    a.type.includes('ABOVE_MAX') && a.severity >= ANOMALY_SEVERITY.MEDIUM
  ).length;
  
  const belowMinCount = anomalies.filter(a => 
    a.type.includes('BELOW_MIN') && a.severity >= ANOMALY_SEVERITY.MEDIUM
  ).length;
  
  // If multiple metrics are above max, might be ready for next stage
  if (aboveMaxCount >= 2) {
    const currentIndex = getStageIndex(company.stage);
    const suggestedStage = currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1] : null;
    
    stageAnomalies.push(createAnomaly({
      type: ANOMALY_TYPES.STAGE_MISMATCH_METRICS,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.LOW,
      metric: 'stage',
      evidence: {
        currentStage: company.stage,
        suggestedStage,
        metricsAboveMax: aboveMaxCount,
        explain: `${aboveMaxCount} metrics exceed ${company.stage} bounds - may be ready for ${suggestedStage || 'growth stage'}`,
      },
    }));
  }
  
  // If multiple metrics are below min, might be miscategorized
  if (belowMinCount >= 2) {
    const currentIndex = getStageIndex(company.stage);
    const suggestedStage = currentIndex > 0 ? STAGES[currentIndex - 1] : null;
    
    stageAnomalies.push(createAnomaly({
      type: ANOMALY_TYPES.STAGE_MISMATCH_METRICS,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.MEDIUM,
      metric: 'stage',
      evidence: {
        currentStage: company.stage,
        suggestedStage,
        metricsBelowMin: belowMinCount,
        explain: `${belowMinCount} metrics below ${company.stage} bounds - verify stage classification`,
      },
    }));
  }
  
  return stageAnomalies;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Detect all anomalies for a company
 * 
 * @param {Object} company - Company with facts
 * @param {Date} [now] - Reference date
 * @returns {{ anomalies: Array, summary: Object }}
 */
export function detectAnomalies(company, now = new Date()) {
  const refDate = typeof now === 'string' ? new Date(now) : now;
  const params = getStageParams(company.stage);
  
  const anomalies = [
    ...detectRunwayAnomalies(company, params, refDate),
    ...detectBurnAnomalies(company, params),
    ...detectEmployeeAnomalies(company, params),
    ...detectRevenueAnomalies(company, params),
    ...detectFundraiseAnomalies(company, params),
  ];
  
  // Add stage mismatch detection based on other anomalies
  anomalies.push(...detectStageMismatch(company, anomalies));
  
  // Sort by severity
  anomalies.sort((a, b) => b.severity - a.severity);
  
  const summary = {
    total: anomalies.length,
    critical: anomalies.filter(a => a.severity === ANOMALY_SEVERITY.CRITICAL).length,
    high: anomalies.filter(a => a.severity === ANOMALY_SEVERITY.HIGH).length,
    medium: anomalies.filter(a => a.severity === ANOMALY_SEVERITY.MEDIUM).length,
    low: anomalies.filter(a => a.severity === ANOMALY_SEVERITY.LOW).length,
    metrics: [...new Set(anomalies.map(a => a.metric))],
    stage: company.stage,
    params,
  };
  
  return { anomalies, summary };
}

/**
 * Detect anomalies across entire portfolio
 * 
 * @param {Array<Object>} companies
 * @param {Date} [now]
 * @returns {{ byCompany: Object, portfolio: Object }}
 */
export function detectPortfolioAnomalies(companies, now = new Date()) {
  const refDate = typeof now === 'string' ? new Date(now) : now;
  
  const byCompany = {};
  let allAnomalies = [];
  
  for (const company of companies) {
    const result = detectAnomalies(company, refDate);
    byCompany[company.id] = result;
    allAnomalies = allAnomalies.concat(result.anomalies);
  }
  
  allAnomalies.sort((a, b) => b.severity - a.severity);
  
  const portfolio = {
    total: allAnomalies.length,
    critical: allAnomalies.filter(a => a.severity === ANOMALY_SEVERITY.CRITICAL).length,
    high: allAnomalies.filter(a => a.severity === ANOMALY_SEVERITY.HIGH).length,
    medium: allAnomalies.filter(a => a.severity === ANOMALY_SEVERITY.MEDIUM).length,
    low: allAnomalies.filter(a => a.severity === ANOMALY_SEVERITY.LOW).length,
    topAnomalies: allAnomalies.slice(0, 10),
    byMetric: {},
  };
  
  // Count by metric
  for (const anomaly of allAnomalies) {
    portfolio.byMetric[anomaly.metric] = (portfolio.byMetric[anomaly.metric] || 0) + 1;
  }
  
  return { byCompany, portfolio };
}

/**
 * Get anomalies above a severity threshold
 * 
 * @param {Array} anomalies
 * @param {number} threshold - Minimum severity (default: MEDIUM)
 * @returns {Array}
 */
export function getSignificantAnomalies(anomalies, threshold = ANOMALY_SEVERITY.MEDIUM) {
  return anomalies.filter(a => a.severity >= threshold);
}

export default {
  detectAnomalies,
  detectPortfolioAnomalies,
  getSignificantAnomalies,
  ANOMALY_SEVERITY,
  ANOMALY_TYPES,
};
