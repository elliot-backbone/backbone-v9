/**
 * export.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Export Firewall (Patch 1)
 * 
 * Makes it MECHANICALLY IMPOSSIBLE for derived values to be persisted as raw.
 * 
 * INVARIANT: Derived data can NEVER leak back into storage.
 * 
 * @module export
 */

import { FORBIDDEN_DERIVED_FIELDS } from '../qa/forbidden.js';

// =============================================================================
// CONTAINER KEYS THAT MIGHT HOLD DERIVED OUTPUT
// =============================================================================

const DERIVED_CONTAINER_KEYS = [
  'derived',
  'computed',
  'view',
  'output',
  'snapshot',
  'result',
  'priorities',
  'issues',
  'actions',
  'ripple',
  'trajectories',
  'todayActions'
];

// Build Set for O(1) lookup
const FORBIDDEN_SET = new Set(FORBIDDEN_DERIVED_FIELDS);
const CONTAINER_SET = new Set(DERIVED_CONTAINER_KEYS);

// =============================================================================
// EXPORT RAW
// =============================================================================

/**
 * Deep-remove forbidden keys and derived containers from raw data.
 * Returns a dataset suitable for persistence.
 * 
 * Must:
 * - Deep-remove any keys in FORBIDDEN_DERIVED_FIELDS
 * - Remove derived container keys (derived, computed, view, output, etc.)
 * - Preserve original raw fields and structure
 * - Be deterministic
 * 
 * @param {any} raw - Raw dataset to clean
 * @returns {any} - Clean dataset safe for persistence
 */
export function exportRaw(raw) {
  return deepCleanRaw(raw);
}

function deepCleanRaw(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepCleanRaw(item));
  }

  if (typeof obj === 'object') {
    const cleaned = {};
    for (const key of Object.keys(obj)) {
      // Skip forbidden derived fields
      if (FORBIDDEN_SET.has(key)) {
        continue;
      }
      // Skip derived container keys
      if (CONTAINER_SET.has(key)) {
        continue;
      }
      // Recurse into value
      cleaned[key] = deepCleanRaw(obj[key]);
    }
    return cleaned;
  }

  // Primitives pass through
  return obj;
}

// =============================================================================
// EXPORT COMPUTED
// =============================================================================

/**
 * Extract derived-only view from engine output.
 * Explicitly separated from raw.
 * 
 * Must include:
 * - Derived payload (whatever engine produces)
 * - Metadata: computedAt, engineVersion, inputHash (if available)
 * - Must NOT include raw payload unless explicitly required
 * 
 * @param {Object} engineOutput - Full engine output
 * @returns {Object} - Derived-only view
 */
export function exportComputed(engineOutput) {
  if (!engineOutput || typeof engineOutput !== 'object') {
    return {
      derived: null,
      meta: {
        computedAt: new Date().toISOString(),
        engineVersion: 'unknown',
        error: 'Invalid engine output'
      }
    };
  }

  // Extract derived data from each company
  const companiesDerived = (engineOutput.companies || []).map(c => ({
    id: c.id,
    name: c.name,
    derived: c.derived || {}
  }));

  // Build derived-only output
  return {
    derived: {
      companies: companiesDerived,
      priorities: engineOutput.priorities || [],
      todayActions: engineOutput.todayActions || []
    },
    meta: {
      computedAt: engineOutput.meta?.computedAt || new Date().toISOString(),
      engineVersion: engineOutput.meta?.version || 'unknown',
      durationMs: engineOutput.meta?.durationMs || null,
      healthCounts: engineOutput.meta?.healthCounts || null,
      layersExecuted: engineOutput.meta?.layersExecuted || null,
      errors: engineOutput.meta?.errors || [],
      warnings: engineOutput.meta?.warnings || []
    }
  };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Verify that exportRaw output contains no forbidden fields
 * @param {any} exported 
 * @returns {{valid: boolean, violations: string[]}}
 */
export function verifyExportRaw(exported) {
  const violations = [];
  
  function scan(obj, path = '') {
    if (obj === null || obj === undefined) return;
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => scan(item, `${path}[${i}]`));
      return;
    }
    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (FORBIDDEN_SET.has(key)) {
          violations.push(currentPath);
        }
        if (CONTAINER_SET.has(key)) {
          violations.push(`${currentPath} (derived container)`);
        }
        scan(obj[key], currentPath);
      }
    }
  }
  
  scan(exported);
  return { valid: violations.length === 0, violations };
}

/**
 * Hash raw data for round-trip verification
 * Simple deterministic hash for comparison
 * @param {any} obj 
 * @returns {string}
 */
export function hashRaw(obj) {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(16);
}

export default {
  exportRaw,
  exportComputed,
  verifyExportRaw,
  hashRaw
};
