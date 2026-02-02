/**
 * anomalyDetection.js — Stage-Based Anomaly Detection
 * 
 * Compares real company data against stage-appropriate bounds from stageParams.
 * Outputs deviations that feed into suggested goals and ETL validation.
 * 
 * FEATHERED BOUNDS:
 * Rather than hard cutoffs, we use tolerance zones around boundaries.
 * A value slightly outside bounds has reduced severity compared to
 * one far outside. This prevents false positives at boundary edges.
 * 
 * Tolerance zones (configurable per metric):
 * - Inner tolerance: 10-20% inside bound → early warning (LOW)
 * - Outer tolerance: 10-20% outside bound → reduced severity
 * - Beyond tolerance: full severity applies
 * 
 * Anomaly severity:
 * - CRITICAL: Far outside bounds (>2x deviation), immediate action needed
 * - HIGH: Outside bounds, should address soon
 * - MEDIUM: At boundary or in tolerance zone, worth monitoring
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
// FEATHERED BOUNDS CONFIGURATION
// =============================================================================

/**
 * Tolerance configuration per metric
 * - innerTolerance: % inside bound that triggers early warning
 * - outerTolerance: % outside bound with reduced severity
 * - symmetric: whether to apply same tolerance above and below
 */
export const TOLERANCE_CONFIG = {
  runway: {
    innerTolerance: 0.15,  // Warn when within 15% of min
    outerTolerance: 0.20,  // 20% grace zone outside bounds
    symmetric: false,      // More strict on low runway
    criticalFloor: 3,      // Below 3 months is always critical regardless of stage
  },
  burn: {
    innerTolerance: 0.10,
    outerTolerance: 0.25,  // 25% grace — burn varies a lot
    symmetric: true,
  },
  employees: {
    innerTolerance: 0.20,  // 20% — team size is fuzzy
    outerTolerance: 0.30,  // 30% grace
    symmetric: true,
  },
  revenue: {
    innerTolerance: 0.15,
    outerTolerance: 0.25,
    symmetric: false,      // More strict on low revenue
  },
  roundTarget: {
    innerTolerance: 0.10,
    outerTolerance: 0.30,  // Raise targets vary widely
    symmetric: true,
  },
};

// =============================================================================
// FEATHERED DEVIATION CALCULATION
// =============================================================================

/**
 * Calculate deviation with feathered bounds
 * 
 * Returns:
 * - direction: 'below' | 'above' | 'within' | 'warning' | 'missing'
 * - ratio: how far from bound (1.0 = at bound)
 * - featheredRatio: adjusted ratio accounting for tolerance
 * - inToleranceZone: boolean
 * - tolerancePosition: 0-1 position within tolerance zone
 */
function calculateFeatheredDeviation(value, min, max, toleranceConfig = {}) {
  const {
    innerTolerance = 0.15,
    outerTolerance = 0.20,
    symmetric = true,
  } = toleranceConfig;
  
  if (value === null || value === undefined) {
    return { deviation: null, direction: 'missing', ratio: null, featheredRatio: null };
  }
  
  const range = max - min;
  const innerBuffer = range * innerTolerance;
  const outerBufferLow = min * outerTolerance;
  const outerBufferHigh = max * outerTolerance;
  
  // Calculate effective bounds with tolerance
  const softMin = min - outerBufferLow;
  const softMax = max + outerBufferHigh;
  const warningMin = min + innerBuffer;
  const warningMax = max - innerBuffer;
  
  // Case 1: Well within bounds (no warning)
  if (value >= warningMin && value <= warningMax) {
    const position = range > 0 ? (value - min) / range : 0.5;
    return {
      deviation: 0,
      direction: 'within',
      ratio: 1,
      featheredRatio: 1,
      inToleranceZone: false,
      tolerancePosition: null,
      position,
    };
  }
  
  // Case 2: In inner warning zone (approaching bound from inside)
  if (value >= min && value < warningMin) {
    const tolerancePosition = (warningMin - value) / innerBuffer;
    return {
      deviation: 0,
      direction: 'warning',
      ratio: value / min,
      featheredRatio: 1 - (tolerancePosition * 0.3), // Slight reduction
      inToleranceZone: true,
      tolerancePosition,
      boundApproaching: 'min',
    };
  }
  
  if (value > warningMax && value <= max) {
    const tolerancePosition = (value - warningMax) / innerBuffer;
    return {
      deviation: 0,
      direction: 'warning',
      ratio: value / max,
      featheredRatio: 1 - (tolerancePosition * 0.3),
      inToleranceZone: true,
      tolerancePosition,
      boundApproaching: 'max',
    };
  }
  
  // Case 3: In outer tolerance zone (just outside bound)
  if (value < min && value >= softMin) {
    const tolerancePosition = (min - value) / outerBufferLow;
    const rawRatio = min > 0 ? value / min : 0;
    // Feathered ratio: starts at 1.0 at bound, drops to rawRatio at edge of tolerance
    const featheredRatio = 1 - (tolerancePosition * (1 - rawRatio));
    return {
      deviation: min - value,
      direction: 'below',
      ratio: rawRatio,
      featheredRatio,
      inToleranceZone: true,
      tolerancePosition,
    };
  }
  
  if (value > max && value <= softMax) {
    const tolerancePosition = (value - max) / outerBufferHigh;
    const rawRatio = max > 0 ? value / max : Infinity;
    const featheredRatio = 1 + (tolerancePosition * (rawRatio - 1));
    return {
      deviation: value - max,
      direction: 'above',
      ratio: rawRatio,
      featheredRatio,
      inToleranceZone: true,
      tolerancePosition,
    };
  }
  
  // Case 4: Beyond tolerance zone (full severity)
  if (value < softMin) {
    const rawRatio = min > 0 ? value / min : 0;
    return {
      deviation: min - value,
      direction: 'below',
      ratio: rawRatio,
      featheredRatio: rawRatio,
      inToleranceZone: false,
      tolerancePosition: null,
    };
  }
  
  if (value > softMax) {
    const rawRatio = max > 0 ? value / max : Infinity;
    return {
      deviation: value - max,
      direction: 'above',
      ratio: rawRatio,
      featheredRatio: rawRatio,
      inToleranceZone: false,
      tolerancePosition: null,
    };
  }
  
  // Fallback (shouldn't reach here)
  return { deviation: 0, direction: 'within', ratio: 1, featheredRatio: 1 };
}

/**
 * Legacy function for backward compatibility
 */
function calculateDeviation(value, min, max) {
  const result = calculateFeatheredDeviation(value, min, max, {});
  return {
    deviation: result.deviation,
    direction: result.direction === 'warning' ? 'within' : result.direction,
    ratio: result.ratio,
    position: result.position,
  };
}

/**
 * Determine severity based on feathered deviation
 */
function featheredDeviationToSeverity(result, metricConfig = {}) {
  const { direction, featheredRatio, inToleranceZone, ratio } = result;
  const useRatio = featheredRatio ?? ratio;
  
  if (direction === 'within') return null;
  if (direction === 'warning') return ANOMALY_SEVERITY.LOW;
  if (direction === 'missing') return ANOMALY_SEVERITY.MEDIUM;
  
  // In tolerance zone: cap severity at MEDIUM
  if (inToleranceZone) {
    if (direction === 'below') {
      if (useRatio < 0.5) return ANOMALY_SEVERITY.MEDIUM;
      return ANOMALY_SEVERITY.LOW;
    }
    if (direction === 'above') {
      if (useRatio > 2) return ANOMALY_SEVERITY.MEDIUM;
      return ANOMALY_SEVERITY.LOW;
    }
  }
  
  // Beyond tolerance: full severity calculation
  if (direction === 'below') {
    if (useRatio < 0.25) return ANOMALY_SEVERITY.CRITICAL;
    if (useRatio < 0.5) return ANOMALY_SEVERITY.HIGH;
    if (useRatio < 0.75) return ANOMALY_SEVERITY.MEDIUM;
    return ANOMALY_SEVERITY.LOW;
  }
  
  if (direction === 'above') {
    if (useRatio > 3) return ANOMALY_SEVERITY.CRITICAL;
    if (useRatio > 2) return ANOMALY_SEVERITY.HIGH;
    if (useRatio > 1.5) return ANOMALY_SEVERITY.MEDIUM;
    return ANOMALY_SEVERITY.LOW;
  }
  
  return ANOMALY_SEVERITY.LOW;
}

/**
 * Legacy severity function
 */
function deviationToSeverity(ratio, direction) {
  return featheredDeviationToSeverity({ direction, ratio, featheredRatio: ratio });
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
 * Detect runway anomalies with feathered bounds
 */
function detectRunwayAnomalies(company, params, now) {
  const anomalies = [];
  const toleranceConfig = TOLERANCE_CONFIG.runway;
  
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
  
  // Critical floor override: below 3 months is always critical
  if (runway.value < toleranceConfig.criticalFloor) {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.RUNWAY_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.CRITICAL,
      metric: 'runway',
      evidence: {
        actual: runway.value,
        min: params.runwayMin,
        max: params.runwayMax,
        target: params.runwayTarget,
        criticalFloor: toleranceConfig.criticalFloor,
        ratio: runway.value / params.runwayMin,
        gap: params.runwayMin - runway.value,
        explain: `Runway ${runway.value.toFixed(1)} months is critically low (below ${toleranceConfig.criticalFloor} month floor)`,
        feathered: false,
      },
    }));
    return anomalies;
  }
  
  const result = calculateFeatheredDeviation(
    runway.value,
    params.runwayMin,
    params.runwayMax,
    toleranceConfig
  );
  
  if (result.direction === 'below') {
    const severity = featheredDeviationToSeverity(result, toleranceConfig);
    const inTolerance = result.inToleranceZone;
    
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.RUNWAY_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity,
      metric: 'runway',
      evidence: {
        actual: runway.value,
        min: params.runwayMin,
        max: params.runwayMax,
        target: params.runwayTarget,
        ratio: result.ratio,
        featheredRatio: result.featheredRatio,
        gap: params.runwayMin - runway.value,
        inToleranceZone: inTolerance,
        explain: inTolerance
          ? `Runway ${runway.value.toFixed(1)} months is slightly below stage minimum of ${params.runwayMin} months (within tolerance)`
          : `Runway ${runway.value.toFixed(1)} months is below stage minimum of ${params.runwayMin} months`,
        feathered: true,
      },
    }));
  }
  
  // Early warning: approaching minimum from inside bounds
  if (result.direction === 'warning' && result.boundApproaching === 'min') {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.RUNWAY_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.LOW,
      metric: 'runway',
      evidence: {
        actual: runway.value,
        min: params.runwayMin,
        max: params.runwayMax,
        target: params.runwayTarget,
        ratio: result.ratio,
        explain: `Runway ${runway.value.toFixed(1)} months is approaching stage minimum of ${params.runwayMin} months`,
        feathered: true,
        earlyWarning: true,
      },
    }));
  }
  
  // Runway above max is unusual but not necessarily bad - flag as low severity
  if (result.direction === 'above' && !result.inToleranceZone && result.ratio > 1.5) {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.RUNWAY_ABOVE_MAX,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.LOW,
      metric: 'runway',
      evidence: {
        actual: runway.value,
        min: params.runwayMin,
        max: params.runwayMax,
        ratio: result.ratio,
        explain: `Runway ${runway.value.toFixed(1)} months exceeds stage norm of ${params.runwayMax} months - consider deploying capital`,
        feathered: true,
      },
    }));
  }
  
  return anomalies;
}

/**
 * Detect burn rate anomalies with feathered bounds
 */
function detectBurnAnomalies(company, params) {
  const anomalies = [];
  const toleranceConfig = TOLERANCE_CONFIG.burn;
  
  if (company.burn === null || company.burn === undefined) {
    return anomalies;
  }
  
  const result = calculateFeatheredDeviation(
    company.burn,
    params.burnMin,
    params.burnMax,
    toleranceConfig
  );
  
  // Low burn: only flag if significantly below (and not in tolerance)
  if (result.direction === 'below' && !result.inToleranceZone && result.ratio < 0.5) {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.BURN_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.LOW, // Low burn isn't necessarily bad
      metric: 'burn',
      evidence: {
        actual: company.burn,
        min: params.burnMin,
        max: params.burnMax,
        ratio: result.ratio,
        featheredRatio: result.featheredRatio,
        explain: `Burn $${(company.burn/1000).toFixed(0)}K/mo is below stage typical of $${(params.burnMin/1000).toFixed(0)}K-${(params.burnMax/1000).toFixed(0)}K/mo`,
        feathered: true,
      },
    }));
  }
  
  // High burn: use feathered severity
  if (result.direction === 'above') {
    const severity = featheredDeviationToSeverity(result, toleranceConfig);
    const inTolerance = result.inToleranceZone;
    
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.BURN_ABOVE_MAX,
      entityRef: { type: 'company', id: company.id },
      severity,
      metric: 'burn',
      evidence: {
        actual: company.burn,
        min: params.burnMin,
        max: params.burnMax,
        ratio: result.ratio,
        featheredRatio: result.featheredRatio,
        excess: company.burn - params.burnMax,
        inToleranceZone: inTolerance,
        explain: inTolerance
          ? `Burn $${(company.burn/1000).toFixed(0)}K/mo is slightly above stage typical of $${(params.burnMax/1000).toFixed(0)}K/mo (within tolerance)`
          : `Burn $${(company.burn/1000).toFixed(0)}K/mo exceeds stage maximum of $${(params.burnMax/1000).toFixed(0)}K/mo`,
        feathered: true,
      },
    }));
  }
  
  return anomalies;
}

/**
 * Detect employee count anomalies with feathered bounds
 */
function detectEmployeeAnomalies(company, params) {
  const anomalies = [];
  const toleranceConfig = TOLERANCE_CONFIG.employees;
  
  if (company.employees === null || company.employees === undefined) {
    return anomalies;
  }
  
  const result = calculateFeatheredDeviation(
    company.employees,
    params.employeesMin,
    params.employeesMax,
    toleranceConfig
  );
  
  if (result.direction === 'below') {
    const severity = featheredDeviationToSeverity(result, toleranceConfig);
    const inTolerance = result.inToleranceZone;
    
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.EMPLOYEES_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity,
      metric: 'employees',
      evidence: {
        actual: company.employees,
        min: params.employeesMin,
        max: params.employeesMax,
        ratio: result.ratio,
        featheredRatio: result.featheredRatio,
        gap: params.employeesMin - company.employees,
        inToleranceZone: inTolerance,
        explain: inTolerance
          ? `Team size ${company.employees} is slightly below stage minimum of ${params.employeesMin} (within tolerance)`
          : `Team size ${company.employees} is below stage minimum of ${params.employeesMin}`,
        feathered: true,
      },
    }));
  }
  
  if (result.direction === 'above' && !result.inToleranceZone) {
    const severity = featheredDeviationToSeverity(result, toleranceConfig);
    
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.EMPLOYEES_ABOVE_MAX,
      entityRef: { type: 'company', id: company.id },
      severity,
      metric: 'employees',
      evidence: {
        actual: company.employees,
        min: params.employeesMin,
        max: params.employeesMax,
        ratio: result.ratio,
        featheredRatio: result.featheredRatio,
        excess: company.employees - params.employeesMax,
        explain: `Team size ${company.employees} exceeds stage typical of ${params.employeesMax}`,
        feathered: true,
      },
    }));
  }
  
  return anomalies;
}

/**
 * Detect revenue anomalies with feathered bounds
 */
function detectRevenueAnomalies(company, params) {
  const anomalies = [];
  const toleranceConfig = TOLERANCE_CONFIG.revenue;
  
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
  
  const result = calculateFeatheredDeviation(
    revenue,
    params.revenueMin,
    params.revenueMax,
    toleranceConfig
  );
  
  if (result.direction === 'below' && params.revenueRequired) {
    const severity = featheredDeviationToSeverity(result, toleranceConfig);
    const inTolerance = result.inToleranceZone;
    
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.REVENUE_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity,
      metric: 'revenue',
      evidence: {
        actual: revenue,
        min: params.revenueMin,
        max: params.revenueMax,
        ratio: result.ratio,
        featheredRatio: result.featheredRatio,
        gap: params.revenueMin - revenue,
        inToleranceZone: inTolerance,
        explain: inTolerance
          ? `Revenue $${(revenue/1000000).toFixed(1)}M is slightly below stage minimum of $${(params.revenueMin/1000000).toFixed(1)}M (within tolerance)`
          : `Revenue $${(revenue/1000000).toFixed(1)}M is below stage minimum of $${(params.revenueMin/1000000).toFixed(1)}M`,
        feathered: true,
      },
    }));
  }
  
  // Revenue above max might indicate stage mismatch (only flag if well beyond tolerance)
  if (result.direction === 'above' && !result.inToleranceZone && result.ratio > 2) {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.REVENUE_ABOVE_MAX,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.LOW, // High revenue isn't bad, but may indicate wrong stage
      metric: 'revenue',
      evidence: {
        actual: revenue,
        min: params.revenueMin,
        max: params.revenueMax,
        ratio: result.ratio,
        explain: `Revenue $${(revenue/1000000).toFixed(1)}M exceeds stage typical - may be ready for next round`,
        feathered: true,
      },
    }));
  }
  
  return anomalies;
}

/**
 * Detect fundraise target anomalies with feathered bounds
 */
function detectFundraiseAnomalies(company, params) {
  const anomalies = [];
  const toleranceConfig = TOLERANCE_CONFIG.roundTarget;
  
  if (!company.raising || !company.roundTarget) {
    return anomalies;
  }
  
  const result = calculateFeatheredDeviation(
    company.roundTarget,
    params.raiseMin,
    params.raiseMax,
    toleranceConfig
  );
  
  // Only flag if outside tolerance zone
  if (result.direction === 'below' && !result.inToleranceZone) {
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.RAISE_BELOW_MIN,
      entityRef: { type: 'company', id: company.id },
      severity: ANOMALY_SEVERITY.MEDIUM,
      metric: 'roundTarget',
      evidence: {
        actual: company.roundTarget,
        min: params.raiseMin,
        max: params.raiseMax,
        ratio: result.ratio,
        featheredRatio: result.featheredRatio,
        explain: `Raise target $${(company.roundTarget/1000000).toFixed(1)}M is below stage typical of $${(params.raiseMin/1000000).toFixed(1)}M`,
        feathered: true,
      },
    }));
  }
  
  if (result.direction === 'above' && !result.inToleranceZone) {
    const severity = featheredDeviationToSeverity(result, toleranceConfig);
    
    anomalies.push(createAnomaly({
      type: ANOMALY_TYPES.RAISE_ABOVE_MAX,
      entityRef: { type: 'company', id: company.id },
      severity,
      metric: 'roundTarget',
      evidence: {
        actual: company.roundTarget,
        min: params.raiseMin,
        max: params.raiseMax,
        ratio: result.ratio,
        featheredRatio: result.featheredRatio,
        explain: `Raise target $${(company.roundTarget/1000000).toFixed(1)}M exceeds stage typical of $${(params.raiseMax/1000000).toFixed(1)}M`,
        feathered: true,
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
  TOLERANCE_CONFIG,
  calculateFeatheredDeviation,
};
