/**
 * BACKBONE V9 - SCHEMA DEFINITION
 * 
 * INVARIANT: Schema stores FACTS only, never derivations.
 * 
 * Forbidden to store: See forbidden.js for canonical list.
 * Every raw datum must have: value + asOf + provenance
 * 
 * Phase C Contract:
 * - Raw input is the sole source of truth
 * - Derived output is ephemeral  
 * - Freshness/provenance missing -> Issue, not Health penalty
 */

import { validateNoForbiddenFields, FORBIDDEN_DERIVED_FIELDS } from '../qa/forbidden.js';

// =============================================================================
// ENUMS (Factual classifications only)
// =============================================================================

export const Stage = {
  PRE_SEED: 'Pre-Seed',
  SEED: 'Seed',
  SERIES_A: 'Series A',
  SERIES_B: 'Series B',
  SERIES_C: 'Series C'
};

export const GoalType = {
  REVENUE: 'revenue',
  PRODUCT: 'product',
  FUNDRAISE: 'fundraise',
  HIRING: 'hiring',
  PARTNERSHIP: 'partnership',
  OPERATIONAL: 'operational'
};

export const GoalStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  PAUSED: 'paused'
};

export const DealStatus = {
  OUTREACH: 'outreach',
  MEETING: 'meeting',
  DD: 'dd',
  TERMSHEET: 'termsheet',
  CLOSED: 'closed',
  PASSED: 'passed'
};

export const Provenance = {
  MANUAL: 'manual',
  AGENT: 'agent',
  INTEGRATION: 'integration',
  SYSTEM: 'system'
};

// =============================================================================
// RAW INPUT SHAPES (What gets stored)
// =============================================================================

/**
 * @typedef {Object} RawValue
 * @property {*} value - The actual value
 * @property {string} asOf - ISO timestamp when value was recorded
 * @property {string} provenance - Source: manual|agent|integration|system
 */

/**
 * @typedef {Object} Founder
 * @property {string} name
 * @property {string} role
 * @property {string} bio
 */

/**
 * @typedef {Object} Goal
 * @property {string} id - Unique goal identifier
 * @property {string} type - GoalType enum
 * @property {string} name - Human-readable name
 * @property {number} current - Current value
 * @property {number} target - Target value
 * @property {string} due - ISO date string
 * @property {string} status - GoalStatus enum
 * @property {string} asOf - When this goal was last updated
 * @property {string} provenance - Source of this data
 */

/**
 * @typedef {Object} Deal
 * @property {string} id - Unique deal identifier
 * @property {string} investorId - FK to investor
 * @property {string} investor - Investor name (denormalized for display)
 * @property {string} status - DealStatus enum
 * @property {number} probability - 0-100 (factual estimate, not derived)
 * @property {number} amount - Deal amount in USD
 * @property {string} asOf - When this deal was last updated
 * @property {string} provenance - Source of this data
 */

/**
 * @typedef {Object} Company
 * @property {string} id - Unique identifier
 * @property {string} name - Company name
 * @property {string} tagline - One-line description
 * @property {string} stage - Stage enum
 * @property {number} burn - Monthly burn rate in USD
 * @property {number} cash - Current cash position in USD
 * @property {number} employees - Headcount
 * @property {string} hq - Headquarters location
 * @property {string} sector - Industry sector
 * @property {string} color - UI color gradient
 * @property {boolean} raising - Currently fundraising?
 * @property {number} roundTarget - Target raise amount (0 if not raising)
 * @property {Founder[]} founders - Founding team
 * @property {Goal[]} goals - Company goals
 * @property {Deal[]} deals - Active deals
 * @property {string} asOf - When company data was last updated
 * @property {string} provenance - Source of this data
 * 
 * NOTE: NO health field. Health is DERIVED from cash/burn/goals.
 * NOTE: NO runway field. Runway is DERIVED as cash/burn.
 */

/**
 * @typedef {Object} TeamMember
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {string} bio
 * @property {string} avatar - Initials
 * @property {string} color - UI color gradient
 * @property {string} asOf
 * @property {string} provenance
 */

/**
 * @typedef {Object} Investor
 * @property {string} id
 * @property {string} name
 * @property {string} aum - Assets under management
 * @property {string} stageFocus
 * @property {string} sectorFocus
 * @property {string[]} deals - Company IDs with active deals
 * @property {string} asOf
 * @property {string} provenance
 */

// =============================================================================
// SCHEMA VALIDATOR
// =============================================================================

/**
 * Validates a company object against schema rules
 * @param {Company} company 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCompany(company) {
  const errors = [];
  
  // Required fields
  const required = ['id', 'name', 'stage', 'burn', 'cash', 'asOf', 'provenance'];
  for (const field of required) {
    if (company[field] === undefined || company[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // CRITICAL: Deep scan for forbidden derived fields (uses canonical list)
  const forbiddenResult = validateNoForbiddenFields(company);
  if (!forbiddenResult.valid) {
    for (const violation of forbiddenResult.violations) {
      errors.push(`FORBIDDEN: Cannot store derived field at '${violation}'. Remove it.`);
    }
  }
  
  // Enum validation
  if (company.stage && !Object.values(Stage).includes(company.stage)) {
    errors.push(`Invalid stage: ${company.stage}`);
  }
  
  // Type validation
  if (typeof company.burn !== 'number' || company.burn < 0) {
    errors.push(`Invalid burn: must be non-negative number`);
  }
  if (typeof company.cash !== 'number' || company.cash < 0) {
    errors.push(`Invalid cash: must be non-negative number`);
  }
  
  // Goals validation
  if (company.goals) {
    for (const goal of company.goals) {
      if (!goal.id || !goal.type || !goal.target) {
        errors.push(`Invalid goal: missing id, type, or target`);
      }
      if (!Object.values(GoalType).includes(goal.type)) {
        errors.push(`Invalid goal type: ${goal.type}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validates entire dataset with deep forbidden field scan
 * @param {{ companies: Company[], team: TeamMember[], investors: Investor[] }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDataset(data) {
  const errors = [];
  
  // Phase B3: Deep scan entire dataset for forbidden fields FIRST
  const forbiddenResult = validateNoForbiddenFields(data);
  if (!forbiddenResult.valid) {
    errors.push(...forbiddenResult.violations.map(v => 
      `FORBIDDEN DERIVED FIELD: ${v}`
    ));
  }
  
  // Validate companies
  for (const company of data.companies || []) {
    const result = validateCompany(company);
    if (!result.valid) {
      // Filter out duplicate forbidden errors (already caught above)
      const nonForbiddenErrors = result.errors.filter(e => !e.startsWith('FORBIDDEN'));
      errors.push(...nonForbiddenErrors.map(e => `[${company.id || 'unknown'}] ${e}`));
    }
  }
  
  // Validate referential integrity: deals reference valid investors
  const investorIds = new Set((data.investors || []).map(i => i.id));
  for (const company of data.companies || []) {
    for (const deal of company.deals || []) {
      if (deal.investorId && !investorIds.has(deal.investorId)) {
        errors.push(`[${company.id}] Deal references unknown investor: ${deal.investorId}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { FORBIDDEN_DERIVED_FIELDS } from '../qa/forbidden.js';

// =============================================================================
// SCHEMA VERSION
// =============================================================================

export const SCHEMA_VERSION = '9.1.0';
export const SCHEMA_DATE = '2026-01-24';
