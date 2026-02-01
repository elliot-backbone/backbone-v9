/**
 * Canonical Entity Types
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Fixed set of entity types
 * - No new entities without doctrine approval
 * - Used for routing, type badges, and section registry
 */

export const ENTITY_TYPES = {
  COMPANY: 'company',
  PERSON: 'person',
  FIRM: 'firm',
  DEAL: 'deal',
  ROUND: 'round',
  GOAL: 'goal',
  ISSUE: 'issue',
  ACTION: 'action',
};

export const ENTITY_TYPE_LABELS = {
  [ENTITY_TYPES.COMPANY]: 'Company',
  [ENTITY_TYPES.PERSON]: 'Person',
  [ENTITY_TYPES.FIRM]: 'Firm',
  [ENTITY_TYPES.DEAL]: 'Deal',
  [ENTITY_TYPES.ROUND]: 'Round',
  [ENTITY_TYPES.GOAL]: 'Goal',
  [ENTITY_TYPES.ISSUE]: 'Issue',
  [ENTITY_TYPES.ACTION]: 'Action',
};

export function isValidEntityType(type) {
  return Object.values(ENTITY_TYPES).includes(type);
}

export function getEntityTypeLabel(type) {
  return ENTITY_TYPE_LABELS[type] || type;
}
