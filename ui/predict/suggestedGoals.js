/**
 * suggestedGoals.js — Goal Suggestion Engine
 * 
 * Maps anomalies to recommended goals.
 * Considers:
 * - Anomaly type and severity
 * - Stage-appropriate goal templates
 * - Existing goals (avoid duplicates)
 * - Goal interdependencies
 * 
 * Pure derivation: no storage of computed values.
 * 
 * @module suggestedGoals
 */

import { getStageParams, getStageGoals, getNextStage } from '../raw/stageParams.js';
import { ANOMALY_TYPES, ANOMALY_SEVERITY } from '../derive/anomalyDetection.js';

// =============================================================================
// GOAL SUGGESTION TYPES
// =============================================================================

export const SUGGESTION_TYPES = {
  // Financial
  EXTEND_RUNWAY: 'EXTEND_RUNWAY',
  INITIATE_FUNDRAISE: 'INITIATE_FUNDRAISE',
  REDUCE_BURN: 'REDUCE_BURN',
  
  // Team
  HIRE_TO_MIN: 'HIRE_TO_MIN',
  OPTIMIZE_TEAM_SIZE: 'OPTIMIZE_TEAM_SIZE',
  
  // Revenue
  ESTABLISH_REVENUE: 'ESTABLISH_REVENUE',
  GROW_REVENUE: 'GROW_REVENUE',
  
  // Stage progression
  PREPARE_NEXT_ROUND: 'PREPARE_NEXT_ROUND',
  VALIDATE_STAGE: 'VALIDATE_STAGE',
  
  // Generic
  FROM_STAGE_TEMPLATE: 'FROM_STAGE_TEMPLATE',
};

// =============================================================================
// ANOMALY TO GOAL MAPPING
// =============================================================================

const ANOMALY_GOAL_MAP = {
  [ANOMALY_TYPES.RUNWAY_BELOW_MIN]: [
    {
      suggestionType: SUGGESTION_TYPES.EXTEND_RUNWAY,
      goalType: 'operational',
      nameTemplate: 'Extend runway to {target} months',
      targetFromEvidence: (ev) => ev.target,
      priority: 1,
      rationale: 'Runway below stage minimum creates existential risk',
    },
    {
      suggestionType: SUGGESTION_TYPES.INITIATE_FUNDRAISE,
      goalType: 'fundraise',
      nameTemplate: 'Initiate {nextStage} fundraise',
      priority: 2,
      rationale: 'Low runway indicates need for capital infusion',
      condition: (company) => !company.raising,
    },
    {
      suggestionType: SUGGESTION_TYPES.REDUCE_BURN,
      goalType: 'operational',
      nameTemplate: 'Reduce burn to ${target}K/mo',
      priority: 3,
      rationale: 'Burn reduction can extend runway without fundraise',
    },
  ],
  
  [ANOMALY_TYPES.BURN_ABOVE_MAX]: [
    {
      suggestionType: SUGGESTION_TYPES.REDUCE_BURN,
      goalType: 'operational',
      nameTemplate: 'Reduce burn to ${target}K/mo',
      targetFromEvidence: (ev) => Math.round(ev.max / 1000),
      priority: 1,
      rationale: 'Burn exceeds stage norms, increasing capital inefficiency',
    },
  ],
  
  [ANOMALY_TYPES.EMPLOYEES_BELOW_MIN]: [
    {
      suggestionType: SUGGESTION_TYPES.HIRE_TO_MIN,
      goalType: 'hiring',
      nameTemplate: 'Build team to {target} FTE',
      targetFromEvidence: (ev) => ev.min,
      priority: 1,
      rationale: 'Team size below stage minimum may limit execution capacity',
    },
  ],
  
  [ANOMALY_TYPES.EMPLOYEES_ABOVE_MAX]: [
    {
      suggestionType: SUGGESTION_TYPES.OPTIMIZE_TEAM_SIZE,
      goalType: 'operational',
      nameTemplate: 'Optimize team efficiency',
      priority: 2,
      rationale: 'Team size exceeds stage norms, may indicate inefficiency',
    },
  ],
  
  [ANOMALY_TYPES.REVENUE_MISSING_REQUIRED]: [
    {
      suggestionType: SUGGESTION_TYPES.ESTABLISH_REVENUE,
      goalType: 'revenue',
      nameTemplate: 'Establish revenue stream',
      targetFromEvidence: (ev) => ev.min,
      priority: 1,
      rationale: 'Revenue expected at this stage but not reported',
    },
  ],
  
  [ANOMALY_TYPES.REVENUE_BELOW_MIN]: [
    {
      suggestionType: SUGGESTION_TYPES.GROW_REVENUE,
      goalType: 'revenue',
      nameTemplate: 'Grow revenue to ${target}M ARR',
      targetFromEvidence: (ev) => (ev.min / 1000000).toFixed(1),
      priority: 1,
      rationale: 'Revenue below stage minimum may affect fundraising',
    },
  ],
  
  [ANOMALY_TYPES.REVENUE_ABOVE_MAX]: [
    {
      suggestionType: SUGGESTION_TYPES.PREPARE_NEXT_ROUND,
      goalType: 'fundraise',
      nameTemplate: 'Prepare {nextStage} fundraise',
      priority: 2,
      rationale: 'Revenue metrics suggest readiness for next stage',
    },
  ],
  
  [ANOMALY_TYPES.RAISE_ABOVE_MAX]: [
    {
      suggestionType: SUGGESTION_TYPES.VALIDATE_STAGE,
      goalType: 'operational',
      nameTemplate: 'Validate stage classification',
      priority: 3,
      rationale: 'Raise target exceeds stage norms - verify positioning',
    },
  ],
  
  [ANOMALY_TYPES.STAGE_MISMATCH_METRICS]: [
    {
      suggestionType: SUGGESTION_TYPES.VALIDATE_STAGE,
      goalType: 'operational',
      nameTemplate: 'Review stage classification',
      priority: 2,
      rationale: 'Multiple metrics suggest different stage than reported',
    },
  ],
};

// =============================================================================
// SUGGESTION CREATION
// =============================================================================

/**
 * Create a goal suggestion from an anomaly
 */
function createSuggestion({
  anomaly,
  company,
  mapping,
  params,
}) {
  const nextStage = getNextStage(company.stage);
  
  // Resolve target from evidence if available
  let target = null;
  if (mapping.targetFromEvidence && anomaly.evidence) {
    target = mapping.targetFromEvidence(anomaly.evidence);
  }
  
  // Resolve name template
  let name = mapping.nameTemplate
    .replace('{target}', target || '?')
    .replace('{nextStage}', nextStage || 'next round')
    .replace('${target}', target || '?');
  
  // Calculate suggested due date (based on severity)
  const daysToDeadline = anomaly.severity === ANOMALY_SEVERITY.CRITICAL ? 30
    : anomaly.severity === ANOMALY_SEVERITY.HIGH ? 60
    : anomaly.severity === ANOMALY_SEVERITY.MEDIUM ? 90
    : 120;
  
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + daysToDeadline);
  
  return {
    suggestionId: `sug-${anomaly.anomalyId}-${mapping.suggestionType}`,
    suggestionType: mapping.suggestionType,
    sourceAnomalyId: anomaly.anomalyId,
    sourceAnomalyType: anomaly.type,
    
    // Proposed goal
    proposedGoal: {
      type: mapping.goalType,
      name,
      target,
      due: dueDate.toISOString().split('T')[0],
      status: 'suggested',
    },
    
    // Context
    companyId: company.id,
    companyName: company.name,
    stage: company.stage,
    priority: mapping.priority,
    rationale: mapping.rationale,
    severity: anomaly.severity,
    
    // Evidence passthrough
    evidence: anomaly.evidence,
    
    createdAt: new Date().toISOString(),
  };
}

/**
 * Check if a suggested goal already exists (avoid duplicates)
 */
function goalAlreadyExists(suggestion, existingGoals) {
  if (!existingGoals || existingGoals.length === 0) return false;
  
  return existingGoals.some(goal => {
    // Match on type and similar name
    if (goal.type !== suggestion.proposedGoal.type) return false;
    
    // Fuzzy name match
    const suggestedName = suggestion.proposedGoal.name.toLowerCase();
    const existingName = (goal.name || '').toLowerCase();
    
    // Check for key terms overlap
    const keyTerms = ['runway', 'fundraise', 'burn', 'hire', 'revenue', 'team'];
    for (const term of keyTerms) {
      if (suggestedName.includes(term) && existingName.includes(term)) {
        return true;
      }
    }
    
    return false;
  });
}

// =============================================================================
// STAGE TEMPLATE SUGGESTIONS
// =============================================================================

/**
 * Suggest goals from stage templates that aren't covered by anomalies
 */
function suggestFromStageTemplates(company, anomalySuggestions, existingGoals) {
  const suggestions = [];
  const stageGoals = getStageGoals(company.stage);
  
  // Get goal types already suggested from anomalies
  const suggestedTypes = new Set(anomalySuggestions.map(s => s.proposedGoal.type));
  
  // Get existing goal types
  const existingTypes = new Set((existingGoals || [])
    .filter(g => g.status === 'active')
    .map(g => g.type)
  );
  
  for (const template of stageGoals) {
    // Skip if already suggested or exists
    if (suggestedTypes.has(template.type) || existingTypes.has(template.type)) {
      continue;
    }
    
    // Skip fundraise if already raising
    if (template.type === 'fundraise' && company.raising) {
      continue;
    }
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 90); // Default 90 days
    
    suggestions.push({
      suggestionId: `sug-template-${company.id}-${template.type}`,
      suggestionType: SUGGESTION_TYPES.FROM_STAGE_TEMPLATE,
      sourceAnomalyId: null,
      sourceAnomalyType: null,
      
      proposedGoal: {
        type: template.type,
        name: template.name,
        target: null, // Will need user input
        due: dueDate.toISOString().split('T')[0],
        status: 'suggested',
      },
      
      companyId: company.id,
      companyName: company.name,
      stage: company.stage,
      priority: template.priority + 10, // Lower priority than anomaly-driven
      rationale: `Stage-appropriate milestone: ${template.unlocks}`,
      severity: ANOMALY_SEVERITY.LOW,
      
      evidence: {
        stageTemplate: template,
        unlocks: template.unlocks,
      },
      
      createdAt: new Date().toISOString(),
    });
  }
  
  return suggestions;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Generate goal suggestions from anomalies
 * 
 * @param {Object} company - Company with facts
 * @param {Array} anomalies - Detected anomalies
 * @param {Object} options
 * @returns {{ suggestions: Array, summary: Object }}
 */
export function suggestGoals(company, anomalies, options = {}) {
  const {
    includeStageTemplates = true,
    existingGoals = company.goals || [],
    minSeverity = ANOMALY_SEVERITY.LOW,
  } = options;
  
  const params = getStageParams(company.stage);
  const suggestions = [];
  
  // Process each anomaly
  for (const anomaly of anomalies) {
    // Skip below minimum severity
    if (anomaly.severity < minSeverity) continue;
    
    // Get mappings for this anomaly type
    const mappings = ANOMALY_GOAL_MAP[anomaly.type] || [];
    
    for (const mapping of mappings) {
      // Check condition if present
      if (mapping.condition && !mapping.condition(company)) {
        continue;
      }
      
      const suggestion = createSuggestion({
        anomaly,
        company,
        mapping,
        params,
      });
      
      // Skip if goal already exists
      if (goalAlreadyExists(suggestion, existingGoals)) {
        continue;
      }
      
      suggestions.push(suggestion);
    }
  }
  
  // Add stage template suggestions if enabled
  if (includeStageTemplates) {
    const templateSuggestions = suggestFromStageTemplates(
      company,
      suggestions,
      existingGoals
    );
    suggestions.push(...templateSuggestions);
  }
  
  // Sort by priority (lower = higher priority)
  suggestions.sort((a, b) => a.priority - b.priority);
  
  const summary = {
    total: suggestions.length,
    fromAnomalies: suggestions.filter(s => s.sourceAnomalyId).length,
    fromTemplates: suggestions.filter(s => !s.sourceAnomalyId).length,
    byType: {},
    bySeverity: {
      critical: suggestions.filter(s => s.severity === ANOMALY_SEVERITY.CRITICAL).length,
      high: suggestions.filter(s => s.severity === ANOMALY_SEVERITY.HIGH).length,
      medium: suggestions.filter(s => s.severity === ANOMALY_SEVERITY.MEDIUM).length,
      low: suggestions.filter(s => s.severity === ANOMALY_SEVERITY.LOW).length,
    },
  };
  
  // Count by goal type
  for (const suggestion of suggestions) {
    const type = suggestion.proposedGoal.type;
    summary.byType[type] = (summary.byType[type] || 0) + 1;
  }
  
  return { suggestions, summary };
}

/**
 * Generate goal suggestions for portfolio
 * 
 * @param {Array} companies
 * @param {Object} anomaliesByCompany - Map of companyId to { anomalies }
 * @param {Object} options
 * @returns {{ byCompany: Object, portfolio: Object }}
 */
export function suggestPortfolioGoals(companies, anomaliesByCompany, options = {}) {
  const byCompany = {};
  let allSuggestions = [];
  
  for (const company of companies) {
    const companyAnomalies = anomaliesByCompany[company.id]?.anomalies || [];
    const result = suggestGoals(company, companyAnomalies, options);
    byCompany[company.id] = result;
    allSuggestions = allSuggestions.concat(result.suggestions);
  }
  
  // Sort all by priority
  allSuggestions.sort((a, b) => {
    // First by severity (higher = more urgent)
    if (b.severity !== a.severity) return b.severity - a.severity;
    // Then by priority (lower = higher priority)
    return a.priority - b.priority;
  });
  
  const portfolio = {
    total: allSuggestions.length,
    topSuggestions: allSuggestions.slice(0, 10),
    byGoalType: {},
    companiesWithSuggestions: Object.keys(byCompany).filter(
      id => byCompany[id].suggestions.length > 0
    ).length,
  };
  
  // Aggregate by goal type
  for (const suggestion of allSuggestions) {
    const type = suggestion.proposedGoal.type;
    portfolio.byGoalType[type] = (portfolio.byGoalType[type] || 0) + 1;
  }
  
  return { byCompany, portfolio };
}

/**
 * Get high-priority suggestions (critical/high severity or priority <= 2)
 * 
 * @param {Array} suggestions
 * @returns {Array}
 */
export function getHighPrioritySuggestions(suggestions) {
  return suggestions.filter(s => 
    s.severity >= ANOMALY_SEVERITY.HIGH || s.priority <= 2
  );
}

/**
 * Convert suggestion to goal format (for persistence)
 * 
 * @param {Object} suggestion
 * @param {Object} overrides - User overrides for target, due, etc.
 * @returns {Object} Goal object
 */
export function suggestionToGoal(suggestion, overrides = {}) {
  return {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...suggestion.proposedGoal,
    ...overrides,
    status: overrides.status || 'active',
    current: overrides.current || 0,
    provenance: 'suggested',
    sourceAnomalyId: suggestion.sourceAnomalyId,
    suggestionType: suggestion.suggestionType,
    asOf: new Date().toISOString(),
  };
}

export default {
  suggestGoals,
  suggestPortfolioGoals,
  getHighPrioritySuggestions,
  suggestionToGoal,
  SUGGESTION_TYPES,
};
