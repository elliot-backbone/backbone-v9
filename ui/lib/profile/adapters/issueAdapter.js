/**
 * Issue Adapter
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Inputs: raw entity + any derived runtime fields from engine/API
 * - Outputs: stable view-model consumed by UI components
 * - Must not compute new derived metrics (no invented heuristics)
 * - Must not write to storage
 */

import { ENTITY_TYPES } from '../../entities/entityTypes';

/**
 * Adapt raw issue data to view-model
 * 
 * @param {Object} raw - Raw issue data
 * @param {Object} derived - Derived data from engine (runtime only)
 * @returns {Object} Adapted view-model
 */
export function adaptIssue(raw, derived = {}) {
  if (!raw) return null;
  
  return {
    // Identity
    id: raw.id,
    name: raw.name || raw.title || `Issue ${raw.id}`,
    type: ENTITY_TYPES.ISSUE,
    
    // Issue Definition [C1]
    problem: raw.problem || raw.problemStatement || raw.description || null,
    problemStatement: raw.problemStatement || raw.problem || null,
    description: raw.description || null,
    scope: raw.scope || null,
    severity: raw.severity || null,
    category: raw.category || raw.issueType || null,
    status: raw.status || null,
    
    // Impact Surface [C2]
    affectedEntities: normalizeAffectedEntities(raw.affectedEntities || raw.impactedEntities || raw.entities),
    downstreamRisk: derived.downstreamRisk ?? raw.downstreamRisk ?? null, // Only if defined
    rippleEffect: derived.rippleEffect ?? null, // Only if engine defines
    
    // Candidate Actions [C3]
    candidateActions: normalizeActionList(raw.candidateActions || raw.actions || derived.candidateActions),
    
    // Related entities
    company: raw.company ? {
      id: raw.company.id || raw.companyId,
      name: raw.company.name || raw.companyName,
      type: ENTITY_TYPES.COMPANY,
    } : null,
    goal: raw.goal ? {
      id: raw.goal.id || raw.goalId,
      name: raw.goal.name,
      type: ENTITY_TYPES.GOAL,
    } : null,
    
    // Metadata
    asOf: raw.asOf || raw.updatedAt || null,
    createdAt: raw.createdAt || null,
    resolvedAt: raw.resolvedAt || null,
    
    // Pass through any derived data from engine
    ...derived,
  };
}

function normalizeAffectedEntities(entities) {
  if (!entities || !Array.isArray(entities)) return [];
  
  return entities.map(e => {
    if (typeof e === 'string') {
      return { id: e, name: e, type: ENTITY_TYPES.COMPANY };
    }
    return {
      id: e.id,
      name: e.name,
      type: e.type || ENTITY_TYPES.COMPANY,
      impactLevel: e.impactLevel || e.impact || null,
      description: e.description || null,
    };
  });
}

function normalizeActionList(actions) {
  if (!actions || !Array.isArray(actions)) return [];
  
  return actions.map(a => {
    if (typeof a === 'string') {
      return { id: a, label: a, type: ENTITY_TYPES.ACTION };
    }
    return {
      id: a.id,
      label: a.label || a.name || a.description,
      type: ENTITY_TYPES.ACTION,
      lifecycle: a.lifecycle || a.status || 'proposed',
      rationale: a.rationale || null,
      owner: a.owner ? {
        id: a.owner.id || a.ownerId,
        name: a.owner.name,
        type: ENTITY_TYPES.PERSON,
      } : null,
    };
  });
}
