/**
 * Goal Adapter
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Inputs: raw entity + any derived runtime fields from engine/API
 * - Outputs: stable view-model consumed by UI components
 * - Must not compute new derived metrics (no invented heuristics)
 * - Must not write to storage
 */

import { ENTITY_TYPES } from '../../entities/entityTypes';

/**
 * Adapt raw goal data to view-model
 * 
 * @param {Object} raw - Raw goal data
 * @param {Object} derived - Derived data from engine (runtime only)
 * @returns {Object} Adapted view-model
 */
export function adaptGoal(raw, derived = {}) {
  if (!raw) return null;
  
  return {
    // Identity
    id: raw.id,
    name: raw.name || raw.title || `Goal ${raw.id}`,
    type: ENTITY_TYPES.GOAL,
    
    // Goal Definition [C1]
    objective: raw.objective || raw.description || raw.name || null,
    description: raw.description || null,
    owner: raw.owner ? {
      id: raw.owner.id || raw.ownerId,
      name: raw.owner.name,
      type: ENTITY_TYPES.PERSON,
    } : null,
    company: raw.company ? {
      id: raw.company.id || raw.companyId,
      name: raw.company.name || raw.companyName,
      type: ENTITY_TYPES.COMPANY,
    } : null,
    targetDate: raw.targetDate || raw.due || raw.dueDate || null,
    status: raw.status || null,
    goalType: raw.goalType || raw.type || null,
    
    // Trajectory [C2] - only if engine defines
    progress: raw.current !== undefined && raw.target !== undefined
      ? Math.round((raw.current / raw.target) * 100)
      : (raw.progress ?? null),
    expected: raw.expected ?? null,
    trajectory: derived.trajectory ?? null,
    timePressure: derived.timePressure ?? null,
    daysRemaining: calculateDaysRemaining(raw.targetDate || raw.due),
    milestones: normalizeMilestones(raw.milestones),
    
    // Raw current/target values
    current: raw.current ?? null,
    target: raw.target ?? null,
    
    // Blocking Issues [C3]
    blockingIssues: normalizeIssueList(raw.blockingIssues || raw.issues || derived.blockingIssues),
    dependencyDepth: derived.dependencyDepth ?? null, // Only if engine defines
    
    // Metadata
    asOf: raw.asOf || raw.updatedAt || null,
    provenance: raw.provenance || null,
    
    // Pass through any derived data from engine
    ...derived,
  };
}

function calculateDaysRemaining(targetDate) {
  if (!targetDate) return null;
  
  const target = new Date(targetDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function normalizeMilestones(milestones) {
  if (!milestones || !Array.isArray(milestones)) return [];
  
  return milestones.map(m => ({
    id: m.id,
    name: m.name || m.title,
    complete: m.complete ?? m.completed ?? false,
    progress: m.progress ?? null,
    due: m.due || m.dueDate || null,
  }));
}

function normalizeIssueList(issues) {
  if (!issues || !Array.isArray(issues)) return [];
  
  return issues.map(i => {
    if (typeof i === 'string') {
      return { id: i, name: i, type: ENTITY_TYPES.ISSUE };
    }
    return {
      id: i.id,
      name: i.name || i.title,
      type: ENTITY_TYPES.ISSUE,
      severity: i.severity || null,
      description: i.description || null,
      dependencyDepth: i.dependencyDepth ?? null,
    };
  });
}
