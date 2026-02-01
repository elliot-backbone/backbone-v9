/**
 * Action Adapter
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Inputs: raw entity + any derived runtime fields from engine/API
 * - Outputs: stable view-model consumed by UI components
 * - Must not compute new derived metrics (no invented heuristics)
 * - Must not write to storage
 * 
 * Action is first-class; its profile page is the deepest and most explicit.
 */

import { ENTITY_TYPES } from '../../entities/entityTypes';

/**
 * Adapt raw action data to view-model
 * 
 * @param {Object} raw - Raw action data
 * @param {Object} derived - Derived data from engine (runtime only)
 * @returns {Object} Adapted view-model
 */
export function adaptAction(raw, derived = {}) {
  if (!raw) return null;
  
  return {
    // Identity
    id: raw.id,
    name: raw.label || raw.name || raw.description || `Action ${raw.id}`,
    type: ENTITY_TYPES.ACTION,
    
    // Action Definition [C1]
    label: raw.label || raw.name || raw.description || null,
    description: raw.description || null,
    owner: raw.owner ? {
      id: raw.owner.id || raw.ownerId,
      name: raw.owner.name,
      type: ENTITY_TYPES.PERSON,
    } : null,
    timeSensitivity: raw.timeSensitivity || raw.urgency || null,
    deadline: raw.deadline || raw.dueDate || raw.due || null,
    dueDate: raw.dueDate || raw.deadline || raw.due || null,
    lifecycle: raw.lifecycle || raw.status || 'proposed',
    status: raw.status || raw.lifecycle || 'proposed',
    priority: raw.priority || null,
    
    // Impact Rationale [C2] - only if engine defines
    expectedNetValue: derived.expectedNetValue ?? raw.expectedNetValue ?? null,
    netValue: derived.netValue ?? raw.netValue ?? null,
    expectedImpact: derived.expectedImpact ?? raw.expectedImpact ?? null,
    impact: derived.impact ?? raw.impact ?? null,
    ifExecuted: raw.ifExecuted || raw.changesIfExecuted || null,
    changesIfExecuted: raw.changesIfExecuted || raw.ifExecuted || null,
    ifDelayed: raw.ifDelayed || raw.breaksIfDelayed || null,
    breaksIfDelayed: raw.breaksIfDelayed || raw.ifDelayed || null,
    rationale: raw.rationale || raw.reasoning || null,
    reasoning: raw.reasoning || raw.rationale || null,
    
    // Dependencies [C3]
    upstream: normalizeEntityLinks(raw.upstream || raw.upstreamSignals || raw.sources),
    upstreamSignals: normalizeEntityLinks(raw.upstreamSignals || raw.upstream || raw.sources),
    downstream: normalizeEntityLinks(raw.downstream || raw.downstreamEffects || raw.impacts),
    downstreamEffects: normalizeEntityLinks(raw.downstreamEffects || raw.downstream || raw.impacts),
    impactedEntities: normalizeEntityLinks(raw.impactedEntities || raw.impacts),
    blockers: normalizeBlockers(raw.blockers || raw.blockedBy),
    blockedBy: normalizeBlockers(raw.blockedBy || raw.blockers),
    dependencies: normalizeDependencies(raw.dependencies),
    
    // Related entities
    company: raw.company ? {
      id: raw.company.id || raw.companyId,
      name: raw.company.name || raw.companyName,
      type: ENTITY_TYPES.COMPANY,
    } : (raw.companyId ? {
      id: raw.companyId,
      name: raw.companyName,
      type: ENTITY_TYPES.COMPANY,
    } : null),
    issue: raw.issue ? {
      id: raw.issue.id || raw.issueId,
      name: raw.issue.name,
      type: ENTITY_TYPES.ISSUE,
    } : null,
    goal: raw.goal ? {
      id: raw.goal.id || raw.goalId,
      name: raw.goal.name,
      type: ENTITY_TYPES.GOAL,
    } : null,
    
    // Execution data
    executed: raw.executed ?? false,
    executedAt: raw.executedAt || null,
    observed: raw.observed ?? false,
    observedAt: raw.observedAt || null,
    observation: raw.observation || null,
    
    // Metadata
    asOf: raw.asOf || raw.updatedAt || null,
    createdAt: raw.createdAt || null,
    
    // Pass through any derived data from engine
    ...derived,
  };
}

function normalizeEntityLinks(entities) {
  if (!entities || !Array.isArray(entities)) return [];
  
  return entities.map(e => {
    if (typeof e === 'string') {
      return { id: e, name: e, type: ENTITY_TYPES.COMPANY };
    }
    return {
      id: e.id,
      name: e.name || e.label,
      type: e.type || ENTITY_TYPES.COMPANY,
      relationship: e.relationship || null,
    };
  });
}

function normalizeBlockers(blockers) {
  if (!blockers || !Array.isArray(blockers)) return [];
  
  return blockers.map(b => {
    if (typeof b === 'string') {
      return { id: b, name: b, type: ENTITY_TYPES.ISSUE, isBlocker: true };
    }
    return {
      id: b.id,
      name: b.name || b.label,
      type: b.type || ENTITY_TYPES.ISSUE,
      isBlocker: true,
      relationship: b.relationship || 'blocks',
    };
  });
}

function normalizeDependencies(deps) {
  if (!deps || !Array.isArray(deps)) return [];
  
  return deps.map(d => {
    if (typeof d === 'string') {
      return { id: d, name: d, type: ENTITY_TYPES.ACTION };
    }
    return {
      id: d.id,
      name: d.name || d.label,
      type: d.type || ENTITY_TYPES.ACTION,
      direction: d.direction || null, // upstream, downstream
      isBlocker: d.isBlocker || d.blocking || false,
      relationship: d.relationship || null,
    };
  });
}
