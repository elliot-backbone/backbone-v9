/**
 * Person Adapter
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Inputs: raw entity + any derived runtime fields from engine/API
 * - Outputs: stable view-model consumed by UI components
 * - Must not compute new derived metrics (no invented heuristics)
 * - Must not write to storage
 */

import { ENTITY_TYPES } from '../../entities/entityTypes';

/**
 * Adapt raw person data to view-model
 * 
 * @param {Object} raw - Raw person data
 * @param {Object} derived - Derived data from engine (runtime only)
 * @returns {Object} Adapted view-model
 */
export function adaptPerson(raw, derived = {}) {
  if (!raw) return null;
  
  return {
    // Identity
    id: raw.id,
    name: raw.name,
    type: ENTITY_TYPES.PERSON,
    
    // Identity & Role [C1]
    role: raw.role || raw.title || null,
    roles: normalizeRoles(raw.roles),
    affiliations: normalizeAffiliations(raw.affiliations || raw.companies),
    seniority: raw.seniority || raw.leverage || null,
    
    // Relationship Map [C2]
    companies: normalizeCompanyList(raw.companies || raw.affiliations?.filter(a => a.type === 'company')),
    firms: normalizeFirmList(raw.firms || raw.affiliations?.filter(a => a.type === 'firm')),
    relationships: normalizeRelationships(raw.relationships || raw.formalRelationships),
    lastInteraction: raw.lastInteraction || raw.lastContactDate || null,
    
    // Activity Signals [C3]
    lastActivity: raw.lastActivity || raw.lastInteraction || null,
    activeActions: normalizeActionList(raw.activeActions || derived.activeActions),
    bottleneckRisk: derived.bottleneckRisk ?? null, // Only if defined by engine
    
    // Metadata
    bio: raw.bio || null,
    email: raw.email || null,
    linkedin: raw.linkedin || null,
    asOf: raw.asOf || raw.updatedAt || null,
    
    // Pass through any derived data from engine
    ...derived,
  };
}

function normalizeRoles(roles) {
  if (!roles || !Array.isArray(roles)) return [];
  
  return roles.map(r => {
    if (typeof r === 'string') {
      return { title: r };
    }
    return {
      title: r.title || r.role,
      company: r.company ? {
        id: r.company.id || r.companyId,
        name: r.company.name || r.company,
        type: ENTITY_TYPES.COMPANY,
      } : null,
      firm: r.firm ? {
        id: r.firm.id || r.firmId,
        name: r.firm.name || r.firm,
        type: ENTITY_TYPES.FIRM,
      } : null,
      current: r.current ?? true,
    };
  });
}

function normalizeAffiliations(affiliations) {
  if (!affiliations || !Array.isArray(affiliations)) return [];
  
  return affiliations.map(a => {
    if (typeof a === 'string') {
      return { id: a, name: a, type: ENTITY_TYPES.COMPANY };
    }
    return {
      id: a.id,
      name: a.name,
      type: a.type || ENTITY_TYPES.COMPANY,
      role: a.role || null,
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
      role: c.role || null,
    };
  });
}

function normalizeFirmList(firms) {
  if (!firms || !Array.isArray(firms)) return [];
  
  return firms.map(f => {
    if (typeof f === 'string') {
      return { id: f, name: f, type: ENTITY_TYPES.FIRM };
    }
    return {
      id: f.id || f.firmId,
      name: f.name,
      type: ENTITY_TYPES.FIRM,
      role: f.role || null,
    };
  });
}

function normalizeRelationships(relationships) {
  if (!relationships || !Array.isArray(relationships)) return [];
  
  return relationships.map(r => ({
    type: r.type || r.relationship,
    entity: {
      id: r.entityId || r.id,
      name: r.entityName || r.name,
      type: r.entityType || ENTITY_TYPES.PERSON,
    },
    lastInteraction: r.lastInteraction || null,
  }));
}

function normalizeActionList(actions) {
  if (!actions || !Array.isArray(actions)) return [];
  
  return actions.map(a => ({
    id: a.id,
    label: a.label || a.name || a.description,
    lifecycle: a.lifecycle || a.status,
    type: ENTITY_TYPES.ACTION,
  }));
}
