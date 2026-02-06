/**
 * actionSchema.js - Canonical Action Schema (Phase 4.0)
 * 
 * LOCKED SCHEMA: No changes without version bump.
 * 
 * Actions are the primary decisioning artifact.
 * Every Action must carry a complete, explainable impact model.
 * 
 * Phase 4.0 (PF1): Added executionProbability to impact model
 * Combined probability = executionProbability * probabilityOfSuccess
 * 
 * @module actionSchema
 */

import { createHash } from 'crypto';
import { timePenalty, computeExpectedNetImpact } from '../derive/impact.js';

// =============================================================================
// ENTITY TYPES
// =============================================================================

export const ENTITY_TYPES = ['company', 'deal', 'person', 'portfolio', 'other'];

export const SOURCE_TYPES = ['ISSUE', 'PREISSUE', 'MANUAL', 'INTRODUCTION'];

// =============================================================================
// IMPACT DIMENSION BOUNDS
// =============================================================================

export const IMPACT_BOUNDS = {
  upsideMagnitude: { min: 0, max: 100 },
  probabilityOfSuccess: { min: 0, max: 1 },
  executionProbability: { min: 0, max: 1 },  // PF1: Will founder actually do it?
  downsideMagnitude: { min: 0, max: 100 },
  timeToImpactDays: { min: 0, max: Infinity },
  effortCost: { min: 0, max: 100 },
  secondOrderLeverage: { min: 0, max: 100 }
};

// =============================================================================
// SCHEMA VALIDATION
// =============================================================================

/**
 * Validate EntityRef
 * @param {any} ref 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEntityRef(ref) {
  const errors = [];
  
  if (!ref || typeof ref !== 'object') {
    return { valid: false, errors: ['entityRef must be an object'] };
  }
  
  if (!ENTITY_TYPES.includes(ref.type)) {
    errors.push(`entityRef.type must be one of: ${ENTITY_TYPES.join(', ')}`);
  }
  
  if (typeof ref.id !== 'string' || !ref.id) {
    errors.push('entityRef.id must be a non-empty string');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate ActionSource
 * @param {any} source 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateActionSource(source) {
  const errors = [];
  
  if (!source || typeof source !== 'object') {
    return { valid: false, errors: ['source must be an object'] };
  }
  
  if (!SOURCE_TYPES.includes(source.sourceType)) {
    errors.push(`sourceType must be one of: ${SOURCE_TYPES.join(', ')}`);
  }
  
  switch (source.sourceType) {
    case 'ISSUE':
      if (!source.issueId) errors.push('ISSUE source requires issueId');
      if (!source.issueType) errors.push('ISSUE source requires issueType');
      break;
    case 'PREISSUE':
      if (!source.preIssueId) errors.push('PREISSUE source requires preIssueId');
      if (!source.preIssueType) errors.push('PREISSUE source requires preIssueType');
      break;
    case 'MANUAL':
      if (typeof source.note !== 'string') errors.push('MANUAL source requires note');
      break;
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate ImpactModel
 * @param {any} impact 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateImpactModel(impact) {
  const errors = [];
  
  if (!impact || typeof impact !== 'object') {
    return { valid: false, errors: ['impact must be an object'] };
  }
  
  // Check all required dimensions
  for (const [dim, bounds] of Object.entries(IMPACT_BOUNDS)) {
    const val = impact[dim];
    if (typeof val !== 'number' || isNaN(val)) {
      errors.push(`impact.${dim} must be a number`);
    } else if (val < bounds.min || val > bounds.max) {
      errors.push(`impact.${dim} must be in [${bounds.min}, ${bounds.max}], got ${val}`);
    }
  }
  
  // Explain array required (PF1: FAIL if empty)
  if (!Array.isArray(impact.explain) || impact.explain.length === 0) {
    errors.push('impact.explain must be a non-empty array (PF1: zero explanation fails build)');
  } else if (impact.explain.length > 6) {
    errors.push('impact.explain must have at most 6 items');
  } else if (impact.explain.some(e => typeof e !== 'string')) {
    errors.push('impact.explain items must be strings');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate complete Action object
 * @param {any} action 
 * @returns {{ valid: boolean, errors: string[], missing: string[] }}
 */
export function validateAction(action) {
  const errors = [];
  const missing = [];
  
  if (!action || typeof action !== 'object') {
    return { valid: false, errors: ['action must be an object'], missing: ['action'] };
  }
  
  // Required fields
  if (typeof action.actionId !== 'string' || !action.actionId) {
    missing.push('actionId');
  }
  
  if (typeof action.title !== 'string' || !action.title) {
    missing.push('title');
  }
  
  // EntityRef
  const entityResult = validateEntityRef(action.entityRef);
  if (!entityResult.valid) {
    missing.push('entityRef');
    errors.push(...entityResult.errors);
  }
  
  // Sources
  if (!Array.isArray(action.sources) || action.sources.length === 0) {
    missing.push('sources');
    errors.push('sources must be a non-empty array');
  } else {
    action.sources.forEach((src, i) => {
      const srcResult = validateActionSource(src);
      if (!srcResult.valid) {
        errors.push(...srcResult.errors.map(e => `sources[${i}]: ${e}`));
      }
    });
  }
  
  // Steps
  if (!Array.isArray(action.steps)) {
    missing.push('steps');
    errors.push('steps must be an array');
  }
  
  // Impact model
  const impactResult = validateImpactModel(action.impact);
  if (!impactResult.valid) {
    missing.push('impact');
    errors.push(...impactResult.errors);
  }
  
  // createdAt
  if (typeof action.createdAt !== 'string' || !action.createdAt) {
    missing.push('createdAt');
  }
  
  return { valid: errors.length === 0 && missing.length === 0, errors, missing };
}

// =============================================================================
// DETERMINISTIC ACTION ID
// =============================================================================

/**
 * Generate deterministic actionId from stable inputs
 * @param {Object} params
 * @param {Object} params.entityRef 
 * @param {string} [params.resolutionId]
 * @param {Object[]} params.sources
 * @returns {string}
 */
export function generateActionId({ entityRef, resolutionId, sources }) {
  const parts = [
    entityRef.type,
    entityRef.id,
    resolutionId || 'no-resolution',
    ...sources.map(s => {
      switch (s.sourceType) {
        case 'ISSUE': return `issue:${s.issueId}`;
        case 'PREISSUE': return `preissue:${s.preIssueId}`;
        case 'MANUAL': return `manual:${s.note.slice(0, 20)}`;
        case 'INTRODUCTION': return `intro:${s.introId || 'unknown'}`;
        default: return 'unknown';
      }
    }).sort()
  ];
  
  const hash = createHash('sha256')
    .update(parts.join('|'))
    .digest('hex')
    .slice(0, 12);
  
  return `action-${hash}`;
}

// =============================================================================
// EXPECTED NET IMPACT COMPUTATION — canonical source: derive/impact.js
// =============================================================================

export { timePenalty, computeExpectedNetImpact };

// =============================================================================
// ACTION FACTORY
// =============================================================================

/**
 * Create a valid Action object
 * @param {Object} params
 * @returns {Object}
 */
export function createAction({
  entityRef,
  title,
  sources,
  resolutionId = null,
  steps = [],
  impact,
  createdAt
}) {
  const actionId = generateActionId({ entityRef, resolutionId, sources });
  
  return {
    actionId,
    title,
    entityRef,
    sources,
    resolutionId,
    steps,
    impact,
    createdAt
  };
}

export default {
  ENTITY_TYPES,
  SOURCE_TYPES,
  IMPACT_BOUNDS,
  validateEntityRef,
  validateActionSource,
  validateImpactModel,
  validateAction,
  generateActionId,
  timePenalty,
  computeExpectedNetImpact,
  createAction
};
