/**
 * Firm Adapter
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Inputs: raw entity + any derived runtime fields from engine/API
 * - Outputs: stable view-model consumed by UI components
 * - Must not compute new derived metrics (no invented heuristics)
 * - Must not write to storage
 */

import { ENTITY_TYPES } from '../../entities/entityTypes';

/**
 * Adapt raw firm data to view-model
 * 
 * @param {Object} raw - Raw firm data
 * @param {Object} derived - Derived data from engine (runtime only)
 * @returns {Object} Adapted view-model
 */
export function adaptFirm(raw, derived = {}) {
  if (!raw) return null;
  
  return {
    // Identity
    id: raw.id,
    name: raw.name,
    type: ENTITY_TYPES.FIRM,
    
    // Firm Snapshot [C1]
    investorType: raw.investorType || raw.type || null,
    aumBand: raw.aumBand || raw.aum || null,
    thesis: normalizeThesis(raw.thesis || raw.thesisAreas),
    stage: raw.stage || raw.stagePreference || null,
    
    // Internal Structure [C2]
    partners: normalizePartnerList(raw.partners),
    decisionMakers: normalizePartnerList(raw.decisionMakers || raw.keyPeople),
    funds: normalizeFundList(raw.funds),
    
    // Portfolio Exposure [C3]
    portfolioCompanies: normalizeCompanyList(raw.portfolioCompanies || raw.portfolio),
    conflicts: derived.conflicts ?? null, // Only if engine defines
    overlaps: derived.overlaps ?? null, // Only if engine defines
    
    // Relationship State [C4]
    warmth: raw.warmth || raw.relationshipStatus || null,
    lastTouch: raw.lastTouch || raw.lastContact || null,
    champion: raw.champion ? {
      id: raw.champion.id,
      name: raw.champion.name,
      type: ENTITY_TYPES.PERSON,
    } : null,
    riskFlags: normalizeRiskFlags(raw.riskFlags || derived.riskFlags),
    
    // Metadata
    website: raw.website || null,
    location: raw.location || raw.hq || null,
    asOf: raw.asOf || raw.updatedAt || null,
    
    // Pass through any derived data from engine
    ...derived,
  };
}

function normalizeThesis(thesis) {
  if (!thesis) return [];
  if (typeof thesis === 'string') return [thesis];
  if (Array.isArray(thesis)) return thesis;
  return [];
}

function normalizePartnerList(partners) {
  if (!partners || !Array.isArray(partners)) return [];
  
  return partners.map(p => {
    if (typeof p === 'string') {
      return { id: p, name: p, type: ENTITY_TYPES.PERSON };
    }
    return {
      id: p.id || p.personId,
      name: p.name,
      type: ENTITY_TYPES.PERSON,
      role: p.role || p.title || null,
      isDecisionMaker: p.isDecisionMaker ?? null,
    };
  });
}

function normalizeFundList(funds) {
  if (!funds || !Array.isArray(funds)) return [];
  
  return funds.map(f => {
    if (typeof f === 'string') {
      return { id: f, name: f };
    }
    return {
      id: f.id,
      name: f.name,
      vintage: f.vintage || null,
      size: f.size || null,
    };
  });
}

function normalizeCompanyList(companies) {
  if (!companies || !Array.isArray(companies)) return [];
  
  return companies.map(c => {
    if (typeof c === 'string') {
      return { id: c, name: c, type: ENTITY_TYPES.COMPANY };
    }
    return {
      id: c.id || c.companyId,
      name: c.name,
      type: ENTITY_TYPES.COMPANY,
      stage: c.stage || null,
      sector: c.sector || null,
    };
  });
}

function normalizeRiskFlags(flags) {
  if (!flags || !Array.isArray(flags)) return [];
  
  return flags.map(f => {
    if (typeof f === 'string') {
      return { type: f };
    }
    return {
      type: f.type || f.flag,
      severity: f.severity || null,
      description: f.description || null,
    };
  });
}
