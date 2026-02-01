/**
 * Entity Route Generator
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Graph-native navigation: every entity links to its profile
 * - Single routing paradigm (no dual patterns)
 * - Pure function: (type, id) -> route string
 */

import { ENTITY_TYPES, isValidEntityType } from './entityTypes';

/**
 * Generate route for an entity profile page
 * @param {string} type - Entity type from ENTITY_TYPES
 * @param {string} id - Entity ID
 * @returns {string} Route path
 */
export function routeForEntity(type, id) {
  if (!type || !id) {
    return null;
  }
  
  if (!isValidEntityType(type)) {
    console.warn(`Unknown entity type: ${type}`);
    return null;
  }
  
  return `/entities/${type}/${encodeURIComponent(id)}`;
}

/**
 * Parse entity route back to type and id
 * @param {string} path - Route path
 * @returns {{ type: string, id: string } | null}
 */
export function parseEntityRoute(path) {
  const match = path.match(/^\/entities\/([^/]+)\/(.+)$/);
  if (!match) return null;
  
  const [, type, encodedId] = match;
  const id = decodeURIComponent(encodedId);
  
  if (!isValidEntityType(type)) return null;
  
  return { type, id };
}

/**
 * Get route for entity from entity reference object
 * @param {{ type: string, id: string }} entityRef
 * @returns {string | null}
 */
export function routeForEntityRef(entityRef) {
  if (!entityRef) return null;
  return routeForEntity(entityRef.type, entityRef.id);
}
