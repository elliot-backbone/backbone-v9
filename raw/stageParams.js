/**
 * stageParams.js — Canonical Stage Parameters
 * 
 * Single source of truth for stage-appropriate bounds.
 * Used by:
 * - Sample data generation (generate-qa-data.js)
 * - ETL validation (derive/anomalyDetection.js)
 * - Goal suggestions (predict/suggestedGoals.js)
 * 
 * Derived from VC ecosystem norms:
 * - Pre-seed/Seed: 12-18 months runway expectation
 * - Series A+: 18-24 months runway expectation
 * 
 * @module stageParams
 */

// =============================================================================
// STAGE SEQUENCE (for ordering/comparison)
// =============================================================================

export const STAGE_SEQUENCE = {
  'Pre-seed': 0,
  'Seed': 1,
  'Series A': 2,
  'Series B': 3,
  'Series C': 4,
  'Series D': 5,
};

export const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D'];

// =============================================================================
// STAGE PARAMETERS — Bounds for "normal" metrics by stage
// =============================================================================

export const STAGE_PARAMS = {
  'Pre-seed': {
    // Funding
    raiseMin: 500_000,
    raiseMax: 5_000_000,
    
    // Burn (derived from raise / 12 months runway)
    burnMin: 500_000 / 12,    // ~$42K/mo
    burnMax: 5_000_000 / 12,  // ~$417K/mo
    
    // Team
    employeesMin: 2,
    employeesMax: 8,
    
    // Runway expectation (months)
    runwayMin: 6,
    runwayMax: 18,
    runwayTarget: 12,
    
    // Revenue (optional at this stage)
    revenueMin: 0,
    revenueMax: 100_000,
    revenueRequired: false,
  },
  
  'Seed': {
    raiseMin: 2_000_000,
    raiseMax: 10_000_000,
    
    burnMin: 2_000_000 / 12,   // ~$167K/mo
    burnMax: 10_000_000 / 12,  // ~$833K/mo
    
    employeesMin: 5,
    employeesMax: 20,
    
    runwayMin: 9,
    runwayMax: 18,
    runwayTarget: 12,
    
    revenueMin: 0,
    revenueMax: 2_000_000,
    revenueRequired: false,
  },
  
  'Series A': {
    raiseMin: 5_000_000,
    raiseMax: 25_000_000,
    
    burnMin: 5_000_000 / 24,   // ~$208K/mo
    burnMax: 25_000_000 / 24,  // ~$1.04M/mo
    
    employeesMin: 15,
    employeesMax: 50,
    
    runwayMin: 12,
    runwayMax: 24,
    runwayTarget: 18,
    
    revenueMin: 500_000,
    revenueMax: 5_000_000,
    revenueRequired: true,
  },
  
  'Series B': {
    raiseMin: 15_000_000,
    raiseMax: 50_000_000,
    
    burnMin: 15_000_000 / 24,  // ~$625K/mo
    burnMax: 50_000_000 / 24,  // ~$2.08M/mo
    
    employeesMin: 40,
    employeesMax: 120,
    
    runwayMin: 18,
    runwayMax: 30,
    runwayTarget: 24,
    
    revenueMin: 3_000_000,
    revenueMax: 20_000_000,
    revenueRequired: true,
  },
  
  'Series C': {
    raiseMin: 50_000_000,
    raiseMax: 150_000_000,
    
    burnMin: 50_000_000 / 24,   // ~$2.08M/mo
    burnMax: 150_000_000 / 24,  // ~$6.25M/mo
    
    employeesMin: 100,
    employeesMax: 350,
    
    runwayMin: 18,
    runwayMax: 36,
    runwayTarget: 24,
    
    revenueMin: 15_000_000,
    revenueMax: 75_000_000,
    revenueRequired: true,
  },
  
  'Series D': {
    raiseMin: 100_000_000,
    raiseMax: 300_000_000,
    
    burnMin: 100_000_000 / 24,  // ~$4.17M/mo
    burnMax: 300_000_000 / 24,  // ~$12.5M/mo
    
    employeesMin: 300,
    employeesMax: 1000,
    
    runwayMin: 24,
    runwayMax: 48,
    runwayTarget: 30,
    
    revenueMin: 50_000_000,
    revenueMax: 250_000_000,
    revenueRequired: true,
  },
};

// =============================================================================
// STAGE GOALS — Expected milestones by stage
// =============================================================================

export const STAGE_GOALS = {
  'Pre-seed': [
    { type: 'product', name: 'MVP Launch', unlocks: 'Seed readiness', priority: 1 },
    { type: 'product', name: 'Beta Users', unlocks: 'Early traction', priority: 2 },
    { type: 'fundraise', name: 'Seed Round', unlocks: 'Growth capital', priority: 3 },
  ],
  
  'Seed': [
    { type: 'revenue', name: 'First Revenue', unlocks: 'PMF signal', priority: 1 },
    { type: 'product', name: 'Product-Market Fit', unlocks: 'Series A readiness', priority: 2 },
    { type: 'hiring', name: 'Engineering Team', unlocks: 'Product velocity', priority: 3 },
    { type: 'revenue', name: 'ARR Target', unlocks: 'Series A metrics', priority: 4 },
    { type: 'fundraise', name: 'Series A Round', unlocks: 'Scale capital', priority: 5 },
  ],
  
  'Series A': [
    { type: 'revenue', name: 'Revenue Growth', unlocks: 'Series B metrics', priority: 1 },
    { type: 'operational', name: 'Unit Economics', unlocks: 'Scalable model', priority: 2 },
    { type: 'hiring', name: 'Go-to-Market Team', unlocks: 'Sales velocity', priority: 3 },
    { type: 'partnership', name: 'Strategic Partners', unlocks: 'Distribution', priority: 4 },
    { type: 'fundraise', name: 'Series B Round', unlocks: 'Expansion capital', priority: 5 },
  ],
  
  'Series B': [
    { type: 'revenue', name: 'ARR Milestone', unlocks: 'Market leadership', priority: 1 },
    { type: 'operational', name: 'Market Expansion', unlocks: 'TAM capture', priority: 2 },
    { type: 'hiring', name: 'Executive Team', unlocks: 'Organizational scale', priority: 3 },
    { type: 'fundraise', name: 'Series C Round', unlocks: 'Dominance capital', priority: 4 },
  ],
  
  'Series C': [
    { type: 'revenue', name: 'Revenue Target', unlocks: 'IPO readiness', priority: 1 },
    { type: 'operational', name: 'International', unlocks: 'Global presence', priority: 2 },
    { type: 'operational', name: 'Profitability Path', unlocks: 'Sustainability', priority: 3 },
  ],
  
  'Series D': [
    { type: 'operational', name: 'Market Leadership', unlocks: 'Category winner', priority: 1 },
    { type: 'operational', name: 'IPO Preparation', unlocks: 'Public markets', priority: 2 },
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get parameters for a stage, with fallback to Seed
 * @param {string} stage
 * @returns {Object}
 */
export function getStageParams(stage) {
  return STAGE_PARAMS[stage] || STAGE_PARAMS['Seed'];
}

/**
 * Get goals for a stage, with fallback to Seed
 * @param {string} stage
 * @returns {Array}
 */
export function getStageGoals(stage) {
  return STAGE_GOALS[stage] || STAGE_GOALS['Seed'];
}

/**
 * Get stage index for comparison
 * @param {string} stage
 * @returns {number}
 */
export function getStageIndex(stage) {
  return STAGE_SEQUENCE[stage] ?? -1;
}

/**
 * Check if stage A is before stage B
 * @param {string} stageA
 * @param {string} stageB
 * @returns {boolean}
 */
export function isStageBefore(stageA, stageB) {
  return getStageIndex(stageA) < getStageIndex(stageB);
}

/**
 * Get next stage (or null if at Series D)
 * @param {string} stage
 * @returns {string|null}
 */
export function getNextStage(stage) {
  const idx = getStageIndex(stage);
  return idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
}

export default {
  STAGE_PARAMS,
  STAGE_GOALS,
  STAGE_SEQUENCE,
  STAGES,
  getStageParams,
  getStageGoals,
  getStageIndex,
  isStageBefore,
  getNextStage,
};
