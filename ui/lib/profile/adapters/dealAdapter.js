/**
 * Deal Adapter
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Inputs: raw entity + any derived runtime fields from engine/API
 * - Outputs: stable view-model consumed by UI components
 * - Must not compute new derived metrics (no invented heuristics)
 * - Must not write to storage
 */

import { ENTITY_TYPES } from '../../entities/entityTypes';

/**
 * Adapt raw deal data to view-model
 * 
 * @param {Object} raw - Raw deal data
 * @param {Object} derived - Derived data from engine (runtime only)
 * @returns {Object} Adapted view-model
 */
export function adaptDeal(raw, derived = {}) {
  if (!raw) return null;
  
  return {
    // Identity
    id: raw.id,
    name: raw.name || raw.investor || `Deal ${raw.id}`,
    type: ENTITY_TYPES.DEAL,
    
    // Deal Summary [C1]
    company: raw.company ? {
      id: raw.company.id || raw.companyId,
      name: raw.company.name || raw.companyName,
      type: ENTITY_TYPES.COMPANY,
    } : (raw.companyId ? {
      id: raw.companyId,
      name: raw.companyName,
      type: ENTITY_TYPES.COMPANY,
    } : null),
    roundType: raw.roundType || raw.round || null,
    targetAmount: raw.targetAmount || raw.amount || null,
    raisedAmount: raw.raisedAmount || raw.raised || null,
    status: raw.status || null,
    
    // Participants [C2]
    firms: normalizeParticipantFirms(raw.firms || raw.investors),
    partners: normalizeParticipantPersons(raw.partners || raw.contacts),
    leadInvestor: raw.leadInvestor ? {
      id: raw.leadInvestor.id || raw.leadInvestorId,
      name: raw.leadInvestor.name || raw.investor,
      type: ENTITY_TYPES.FIRM,
      role: 'lead',
    } : (raw.investor ? {
      id: raw.investorId,
      name: raw.investor,
      type: ENTITY_TYPES.FIRM,
      role: raw.role || null,
    } : null),
    
    // Process State [C3]
    phase: raw.phase || raw.status || null,
    blockers: normalizeBlockers(raw.blockers || derived.blockers),
    timingPressure: derived.timingPressure ?? null, // Only if engine defines
    probability: raw.probability ?? null,
    nextStep: raw.nextStep || null,
    
    // Metadata
    asOf: raw.asOf || raw.updatedAt || null,
    createdAt: raw.createdAt || null,
    
    // Pass through any derived data from engine
    ...derived,
  };
}

function normalizeParticipantFirms(firms) {
  if (!firms || !Array.isArray(firms)) return [];
  
  return firms.map(f => {
    if (typeof f === 'string') {
      return { id: f, name: f, type: ENTITY_TYPES.FIRM, role: null };
    }
    return {
      id: f.id || f.firmId,
      name: f.name,
      type: ENTITY_TYPES.FIRM,
      role: f.role || null, // lead, follow, observer
      amount: f.amount || null,
    };
  });
}

function normalizeParticipantPersons(persons) {
  if (!persons || !Array.isArray(persons)) return [];
  
  return persons.map(p => {
    if (typeof p === 'string') {
      return { id: p, name: p, type: ENTITY_TYPES.PERSON, role: null };
    }
    return {
      id: p.id || p.personId,
      name: p.name,
      type: ENTITY_TYPES.PERSON,
      role: p.role || null,
      firm: p.firm ? {
        id: p.firm.id || p.firmId,
        name: p.firm.name || p.firm,
        type: ENTITY_TYPES.FIRM,
      } : null,
    };
  });
}

function normalizeBlockers(blockers) {
  if (!blockers || !Array.isArray(blockers)) return [];
  
  return blockers.map(b => {
    if (typeof b === 'string') {
      return { description: b };
    }
    return {
      id: b.id,
      type: b.type || ENTITY_TYPES.ISSUE,
      name: b.name || b.description,
      severity: b.severity || null,
    };
  });
}
