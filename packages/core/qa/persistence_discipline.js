/**
 * Persistence Discipline QA
 * 
 * Ensures runtime-only values are never written to storage.
 * This is a critical architectural constraint.
 * 
 * ═══════════════════════════════════════════════════════════════
 * FORBIDDEN FIELDS: These must NEVER appear in persisted data.
 * ═══════════════════════════════════════════════════════════════
 * 
 * @module persistence_discipline
 */

/**
 * Fields that are derived at runtime and must never be persisted.
 */
export const FORBIDDEN_PERSIST_FIELDS = [
  // Ranking outputs
  'rankScore',
  'rank',
  'expectedNetImpact',
  'rankComponents',
  
  // Obviousness derivation
  'obviousnessPenalty',
  
  // Gate classification
  'gateClass',
  'gateReason',
  
  // Derived runway metrics
  'runwayMonthsDerived',
  'runwayStatusDerived',
  'runwayHealthScore',
  
  // Normalized values
  'normalizedImpact',
  'normalizedFeasibility',
  'normalizedTiming',
  'clampedImpact',
  
  // Pattern lifts (from UI-3)
  'patternLift',
];

/**
 * Nested paths that are also forbidden.
 * Format: 'parent.child'
 */
export const FORBIDDEN_NESTED_PATHS = [
  'impact.normalizedUpside',
  'impact.clampedUpside',
  'trustRisk.derived',
  'components.normalized',
];

/**
 * Validate an object before persistence.
 * Checks for forbidden fields at top level and nested.
 * 
 * @param {Object} obj - Object to validate
 * @param {string} context - Context for error messages (e.g., filename)
 * @returns {{ valid: boolean, violations: string[] }}
 */
export function validateBeforePersist(obj, context = 'unknown') {
  const violations = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: true, violations: [] };
  }
  
  // Check top-level forbidden fields
  for (const field of FORBIDDEN_PERSIST_FIELDS) {
    if (obj.hasOwnProperty(field) && obj[field] !== undefined) {
      violations.push(`${context}: Forbidden field '${field}' found`);
    }
  }
  
  // Recursive check for nested objects
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Check nested forbidden paths
      for (const nestedPath of FORBIDDEN_NESTED_PATHS) {
        const [parent, child] = nestedPath.split('.');
        if (key === parent && value.hasOwnProperty(child)) {
          violations.push(`${context}: Forbidden nested path '${nestedPath}' found`);
        }
      }
      
      // Recurse into nested object
      const nested = validateBeforePersist(value, `${context}.${key}`);
      violations.push(...nested.violations);
    }
    
    // Check arrays
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === 'object') {
          const nested = validateBeforePersist(item, `${context}.${key}[${index}]`);
          violations.push(...nested.violations);
        }
      });
    }
  }
  
  return { valid: violations.length === 0, violations };
}

/**
 * Scan raw data directory structure for forbidden fields.
 * 
 * @param {Object} rawData - Object mapping filenames to their data
 * @returns {{ valid: boolean, violations: string[], summary: Object }}
 */
export function auditRawDirectory(rawData) {
  const violations = [];
  const summary = {
    filesChecked: 0,
    objectsChecked: 0,
    violationsFound: 0,
  };
  
  for (const [filename, data] of Object.entries(rawData)) {
    summary.filesChecked++;
    
    if (Array.isArray(data)) {
      // Array of objects (e.g., companies, people)
      data.forEach((item, index) => {
        summary.objectsChecked++;
        const result = validateBeforePersist(item, `${filename}[${index}]`);
        violations.push(...result.violations);
      });
    } else if (data && typeof data === 'object') {
      // Single object
      summary.objectsChecked++;
      const result = validateBeforePersist(data, filename);
      violations.push(...result.violations);
    }
  }
  
  summary.violationsFound = violations.length;
  
  return { 
    valid: violations.length === 0, 
    violations,
    summary,
  };
}

/**
 * Strip forbidden fields from an object before persistence.
 * Returns a new object without the forbidden fields.
 * 
 * @param {Object} obj - Object to clean
 * @returns {Object} New object without forbidden fields
 */
export function stripForbiddenFields(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => stripForbiddenFields(item));
  }
  
  const cleaned = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip forbidden fields
    if (FORBIDDEN_PERSIST_FIELDS.includes(key)) {
      continue;
    }
    
    // Recurse into nested objects
    if (value && typeof value === 'object') {
      cleaned[key] = stripForbiddenFields(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Create a persistence-safe copy of an action.
 * Strips all runtime-derived fields.
 * 
 * @param {Object} action - Action object
 * @returns {Object} Persistence-safe action
 */
export function createPersistableAction(action) {
  return stripForbiddenFields(action);
}

/**
 * Validate that ASSUMPTIONS values don't appear directly in ranking code.
 * This is a static analysis check.
 * 
 * @param {string} code - Source code to check
 * @returns {{ valid: boolean, violations: string[] }}
 */
export function auditAssumptionsUsage(code) {
  const violations = [];
  
  // Patterns that indicate direct ASSUMPTIONS → rankScore flow
  const forbiddenPatterns = [
    /ASSUMPTIONS\.[^}]+\s*\*\s*rankScore/,
    /rankScore\s*=\s*ASSUMPTIONS\./,
    /rankScore\s*\+=\s*ASSUMPTIONS\./,
    /return\s+ASSUMPTIONS\.[^;]+;\s*\/\/.*rank/i,
  ];
  
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(code)) {
      violations.push(`Direct ASSUMPTIONS → rankScore flow detected: ${pattern.source}`);
    }
  }
  
  return { valid: violations.length === 0, violations };
}

export default {
  FORBIDDEN_PERSIST_FIELDS,
  FORBIDDEN_NESTED_PATHS,
  validateBeforePersist,
  auditRawDirectory,
  stripForbiddenFields,
  createPersistableAction,
  auditAssumptionsUsage,
};
