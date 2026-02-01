/**
 * Company Adapter
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Inputs: raw entity + any derived runtime fields from engine/API
 * - Outputs: stable view-model consumed by UI components
 * - Must not compute new derived metrics (no invented heuristics)
 * - Must not write to storage
 */

import { ENTITY_TYPES } from '../../entities/entityTypes';

/**
 * Adapt raw company data to view-model
 * 
 * @param {Object} raw - Raw company data
 * @param {Object} derived - Derived data from engine (runtime only)
 * @returns {Object} Adapted view-model
 */
export function adaptCompany(raw, derived = {}) {
  if (!raw) return null;
  
  return {
    // Identity
    id: raw.id,
    name: raw.name,
    type: ENTITY_TYPES.COMPANY,
    
    // Snapshot [C1]
    stage: raw.stage || null,
    ownership: raw.ownership ?? raw.ownershipPercent ?? null,
    lastRound: raw.lastRound ? {
      id: raw.lastRound.id || raw.lastRoundId,
      name: raw.lastRound.name || raw.lastRound.type,
      type: raw.lastRound.type,
    } : null,
    sector: raw.sector || raw.category || null,
    hq: raw.hq || raw.headquarters || raw.geography || null,
    status: raw.status || null,
    ceo: raw.ceo ? {
      id: raw.ceo.id || raw.ceoId,
      name: raw.ceo.name,
    } : null,
    
    // Core Metrics [C2] - raw values only
    burn: raw.burn ?? null,
    cash: raw.cash ?? null,
    runway: derived.runway ?? null, // Derived at runtime, not computed here
    revenue: raw.revenue ?? raw.arr ?? null,
    mrr: raw.mrr ?? null,
    headcount: raw.employees ?? raw.headcount ?? null,
    
    // Relationships [C3]
    founders: normalizePersonList(raw.founders || raw.founderPersonIds),
    executives: normalizePersonList(raw.executives || raw.executiveTeam),
    investors: normalizeFirmList(raw.investors),
    advisors: normalizePersonList(raw.advisors || raw.operators),
    
    // Goals & Issues [C4]
    goals: normalizeGoalList(raw.goals),
    issues: normalizeIssueList(raw.issues || derived.issues),
    
    // Metadata
    asOf: raw.asOf || raw.updatedAt || null,
    tagline: raw.tagline || raw.description || null,
    raising: raw.raising ?? null,
    roundTarget: raw.roundTarget ?? null,
    
    // Pass through any derived data from engine
    ...derived,
  };
}

function normalizePersonList(persons) {
  if (!persons || !Array.isArray(persons)) return [];
  
  return persons.map(p => {
    if (typeof p === 'string') {
      return { id: p, name: p };
    }
    return {
      id: p.id || p.personId,
      name: p.name,
      role: p.role || p.title,
    };
  });
}

function normalizeFirmList(firms) {
  if (!firms || !Array.isArray(firms)) return [];
  
  return firms.map(f => {
    if (typeof f === 'string') {
      return { id: f, name: f };
    }
    return {
      id: f.id || f.firmId,
      name: f.name,
      type: f.type || f.investorType,
    };
  });
}

function normalizeGoalList(goals) {
  if (!goals || !Array.isArray(goals)) return [];
  
  return goals.map(g => ({
    id: g.id,
    name: g.name || g.title,
    type: g.type,
    status: g.status,
    current: g.current,
    target: g.target,
    due: g.due || g.dueDate,
  }));
}

function normalizeIssueList(issues) {
  if (!issues || !Array.isArray(issues)) return [];
  
  return issues.map(i => ({
    id: i.id,
    name: i.name || i.title,
    severity: i.severity,
    status: i.status,
  }));
}
