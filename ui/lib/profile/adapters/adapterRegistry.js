/**
 * Adapter Registry
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Normalizes incoming data shape so section components stay dumb and consistent
 * - Adapters must not compute new derived metrics that don't exist elsewhere
 * - Adapters do not write to storage
 * - Missing fields show explicit "Not available" and do not crash
 */

import { ENTITY_TYPES } from '../../entities/entityTypes';
import { adaptCompany } from './companyAdapter';
import { adaptPerson } from './personAdapter';
import { adaptFirm } from './firmAdapter';
import { adaptDeal } from './dealAdapter';
import { adaptRound } from './roundAdapter';
import { adaptGoal } from './goalAdapter';
import { adaptIssue } from './issueAdapter';
import { adaptAction } from './actionAdapter';

const ADAPTER_REGISTRY = {
  [ENTITY_TYPES.COMPANY]: adaptCompany,
  [ENTITY_TYPES.PERSON]: adaptPerson,
  [ENTITY_TYPES.FIRM]: adaptFirm,
  [ENTITY_TYPES.DEAL]: adaptDeal,
  [ENTITY_TYPES.ROUND]: adaptRound,
  [ENTITY_TYPES.GOAL]: adaptGoal,
  [ENTITY_TYPES.ISSUE]: adaptIssue,
  [ENTITY_TYPES.ACTION]: adaptAction,
};

/**
 * Adapt raw entity data to a stable view-model for UI components
 * 
 * @param {string} type - Entity type
 * @param {Object} rawData - Raw entity data from API
 * @param {Object} [derivedData] - Optional derived data from engine (runtime only)
 * @returns {Object} Adapted view-model
 */
export function adaptEntity(type, rawData, derivedData = {}) {
  const adapter = ADAPTER_REGISTRY[type];
  
  if (!adapter) {
    console.warn(`No adapter registered for entity type: ${type}`);
    return rawData || {};
  }
  
  return adapter(rawData, derivedData);
}

/**
 * Check if an adapter exists for an entity type
 */
export function hasAdapter(type) {
  return Boolean(ADAPTER_REGISTRY[type]);
}

export default ADAPTER_REGISTRY;
