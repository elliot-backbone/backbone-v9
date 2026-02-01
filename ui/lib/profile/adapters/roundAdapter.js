/**
 * Round Adapter
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Inputs: raw entity + any derived runtime fields from engine/API
 * - Outputs: stable view-model consumed by UI components
 * - Must not compute new derived metrics (no invented heuristics)
 * - Must not write to storage
 */

import { ENTITY_TYPES } from '../../entities/entityTypes';

/**
 * Adapt raw round data to view-model
 * 
 * @param {Object} raw - Raw round data
 * @param {Object} derived - Derived data from engine (runtime only)
 * @returns {Object} Adapted view-model
 */
export function adaptRound(raw, derived = {}) {
  if (!raw) return null;
  
  return {
    // Identity
    id: raw.id,
    name: raw.name || raw.type || `Round ${raw.id}`,
    type: ENTITY_TYPES.ROUND,
    
    // Round Snapshot [C1]
    roundType: raw.roundType || raw.type || null,
    valuation: raw.valuation || null,
    valuationBand: raw.valuationBand || null,
    closeTargetDate: raw.closeTargetDate || raw.targetClose || raw.closeDate || null,
    targetAmount: raw.targetAmount || raw.target || null,
    status: raw.status || null,
    
    // Allocation Map [C2]
    committed: normalizeAllocation(raw.committed),
    softCircled: normalizeAllocation(raw.softCircled),
    openCapacity: raw.openCapacity ?? null,
    
    // Risk Factors [C3] - only if engine defines
    riskFactors: normalizeRiskFactors(raw.riskFactors || derived.riskFactors),
    concentrationFlags: raw.concentrationFlags || derived.concentrationFlags || null,
    missingAnchorFlags: raw.missingAnchorFlags || derived.missingAnchorFlags || null,
    adverseSignals: raw.adverseSignals || derived.adverseSignals || null,
    
    // Related entities
    company: raw.company ? {
      id: raw.company.id || raw.companyId,
      name: raw.company.name || raw.companyName,
      type: ENTITY_TYPES.COMPANY,
    } : null,
    
    // Metadata
    asOf: raw.asOf || raw.updatedAt || null,
    
    // Pass through any derived data from engine
    ...derived,
  };
}

function normalizeAllocation(allocation) {
  if (allocation === undefined || allocation === null) return null;
  
  // Simple number
  if (typeof allocation === 'number') {
    return { amount: allocation, participants: [] };
  }
  
  // Object with amount and participants
  return {
    amount: allocation.amount ?? allocation.value ?? null,
    participants: normalizeParticipants(allocation.participants || allocation.investors),
  };
}

function normalizeParticipants(participants) {
  if (!participants || !Array.isArray(participants)) return [];
  
  return participants.map(p => {
    if (typeof p === 'string') {
      return { id: p, name: p, type: ENTITY_TYPES.FIRM };
    }
    return {
      id: p.id || p.firmId,
      name: p.name,
      type: p.type || ENTITY_TYPES.FIRM,
      amount: p.amount || null,
    };
  });
}

function normalizeRiskFactors(factors) {
  if (!factors || !Array.isArray(factors)) return [];
  
  return factors.map(f => {
    if (typeof f === 'string') {
      return { type: f, severity: 'medium' };
    }
    return {
      id: f.id,
      type: f.type || f.flag,
      severity: f.severity || 'medium',
      description: f.description || null,
      linkedEntities: normalizeLinkedEntities(f.linkedEntities),
    };
  });
}

function normalizeLinkedEntities(entities) {
  if (!entities || !Array.isArray(entities)) return [];
  
  return entities.map(e => ({
    id: e.id,
    name: e.name,
    type: e.type || ENTITY_TYPES.COMPANY,
  }));
}
