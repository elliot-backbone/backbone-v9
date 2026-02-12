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
import { GOAL_TYPES, normalizeGoal } from '../raw/goalSchema.js';

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
  
  // Operational metric suggestion types
  REDUCE_CAC: 'REDUCE_CAC',
  IMPROVE_NRR: 'IMPROVE_NRR',
  IMPROVE_GRR: 'IMPROVE_GRR',
  IMPROVE_GROSS_MARGIN: 'IMPROVE_GROSS_MARGIN',
  IMPROVE_RETENTION: 'IMPROVE_RETENTION',
  ACCELERATE_HIRING: 'ACCELERATE_HIRING',
  IMPROVE_NPS: 'IMPROVE_NPS',
  RIGHT_SIZE_HIRING_PLAN: 'RIGHT_SIZE_HIRING_PLAN',
  GROW_CUSTOMER_BASE: 'GROW_CUSTOMER_BASE',
  OPTIMIZE_ACV: 'OPTIMIZE_ACV',
  DIVERSIFY_CUSTOMERS: 'DIVERSIFY_CUSTOMERS',
  RAISE_MORE_CAPITAL: 'RAISE_MORE_CAPITAL',
  RIGHT_SIZE_ROUND: 'RIGHT_SIZE_ROUND',
  REVIEW_STAGE_FIT: 'REVIEW_STAGE_FIT',

  // Generic
  FROM_STAGE_TEMPLATE: 'FROM_STAGE_TEMPLATE',
  
  // NEW: Multi-entity suggestion types
  INTRO_TARGET: 'INTRO_TARGET',
  RELATIONSHIP_BUILD: 'RELATIONSHIP_BUILD',
  DEAL_CLOSE: 'DEAL_CLOSE',
  ROUND_COMPLETION: 'ROUND_COMPLETION',
  INVESTOR_ACTIVATION: 'INVESTOR_ACTIVATION',
  CHAMPION_CULTIVATION: 'CHAMPION_CULTIVATION',
  REACTIVATE_DORMANT: 'REACTIVATE_DORMANT',
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

  [ANOMALY_TYPES.CAC_ABOVE_THRESHOLD]: [
    {
      suggestionType: SUGGESTION_TYPES.REDUCE_CAC,
      goalType: 'efficiency',
      nameTemplate: 'Reduce CAC to ${target}',
      targetFromEvidence: (ev) => `$${ev.max}`,
      priority: 1,
      rationale: 'CAC exceeds stage norms, threatening unit economics',
    },
  ],

  [ANOMALY_TYPES.NRR_BELOW_THRESHOLD]: [
    {
      suggestionType: SUGGESTION_TYPES.IMPROVE_NRR,
      goalType: 'retention',
      nameTemplate: 'Improve NRR to {target}%',
      targetFromEvidence: (ev) => ev.min,
      priority: 1,
      rationale: 'Net revenue retention below stage minimum indicates churn risk',
    },
  ],

  [ANOMALY_TYPES.GRR_BELOW_THRESHOLD]: [
    {
      suggestionType: SUGGESTION_TYPES.IMPROVE_GRR,
      goalType: 'retention',
      nameTemplate: 'Improve GRR to {target}%',
      targetFromEvidence: (ev) => ev.min,
      priority: 1,
      rationale: 'Gross revenue retention below stage minimum indicates logo churn',
    },
  ],

  [ANOMALY_TYPES.GROSS_MARGIN_BELOW_THRESHOLD]: [
    {
      suggestionType: SUGGESTION_TYPES.IMPROVE_GROSS_MARGIN,
      goalType: 'efficiency',
      nameTemplate: 'Improve gross margin to {target}%',
      targetFromEvidence: (ev) => ev.min,
      priority: 1,
      rationale: 'Gross margin below stage norms threatens scalability',
    },
  ],

  [ANOMALY_TYPES.LOGO_RETENTION_LOW]: [
    {
      suggestionType: SUGGESTION_TYPES.IMPROVE_RETENTION,
      goalType: 'retention',
      nameTemplate: 'Improve logo retention to {target}%',
      targetFromEvidence: (ev) => ev.min,
      priority: 1,
      rationale: 'Logo retention below stage minimum signals customer satisfaction issues',
    },
  ],

  [ANOMALY_TYPES.HIRING_PLAN_BEHIND]: [
    {
      suggestionType: SUGGESTION_TYPES.ACCELERATE_HIRING,
      goalType: 'hiring',
      nameTemplate: 'Hire to target headcount of {target}',
      targetFromEvidence: (ev) => ev.target,
      priority: 1,
      rationale: 'Headcount significantly behind hiring plan',
    },
  ],

  [ANOMALY_TYPES.NPS_BELOW_THRESHOLD]: [
    {
      suggestionType: SUGGESTION_TYPES.IMPROVE_NPS,
      goalType: 'customer_growth',
      nameTemplate: 'Improve NPS to {target}',
      targetFromEvidence: (ev) => ev.min,
      priority: 2,
      rationale: 'NPS below stage minimum threatens customer advocacy and growth',
    },
  ],

  [ANOMALY_TYPES.OPEN_POSITIONS_ABOVE_MAX]: [
    {
      suggestionType: SUGGESTION_TYPES.RIGHT_SIZE_HIRING_PLAN,
      goalType: 'hiring',
      nameTemplate: 'Right-size hiring plan to {target} open positions',
      targetFromEvidence: (ev) => ev.max,
      priority: 2,
      rationale: 'Open positions exceed stage norms, may indicate hiring bottleneck',
    },
  ],

  [ANOMALY_TYPES.PAYING_CUSTOMERS_BELOW_MIN]: [
    {
      suggestionType: SUGGESTION_TYPES.GROW_CUSTOMER_BASE,
      goalType: 'customer_growth',
      nameTemplate: 'Grow customer base to {target}',
      targetFromEvidence: (ev) => ev.min,
      priority: 1,
      rationale: 'Paying customer count below stage minimum limits revenue growth',
    },
  ],

  [ANOMALY_TYPES.ACV_BELOW_MIN]: [
    {
      suggestionType: SUGGESTION_TYPES.OPTIMIZE_ACV,
      goalType: 'efficiency',
      nameTemplate: 'Optimize ACV to ${target}',
      targetFromEvidence: (ev) => `$${ev.min.toLocaleString()}`,
      priority: 2,
      rationale: 'ACV below stage minimum suggests pricing or market positioning issues',
    },
  ],

  [ANOMALY_TYPES.ACV_ABOVE_MAX]: [
    {
      suggestionType: SUGGESTION_TYPES.DIVERSIFY_CUSTOMERS,
      goalType: 'customer_growth',
      nameTemplate: 'Diversify customer base',
      priority: 2,
      rationale: 'ACV above stage maximum may indicate concentration risk',
    },
  ],

  [ANOMALY_TYPES.RAISED_TO_DATE_LOW]: [
    {
      suggestionType: SUGGESTION_TYPES.RAISE_MORE_CAPITAL,
      goalType: 'fundraise',
      nameTemplate: 'Raise additional capital',
      priority: 2,
      rationale: 'Total raised below stage minimum may constrain growth',
    },
  ],

  [ANOMALY_TYPES.LAST_RAISE_UNDERSIZE]: [
    {
      suggestionType: SUGGESTION_TYPES.RIGHT_SIZE_ROUND,
      goalType: 'fundraise',
      nameTemplate: 'Right-size next funding round',
      priority: 2,
      rationale: 'Last raise was undersized for current stage',
    },
  ],

  [ANOMALY_TYPES.COMPANY_AGE_STAGE_MISMATCH]: [
    {
      suggestionType: SUGGESTION_TYPES.REVIEW_STAGE_FIT,
      goalType: 'operational',
      nameTemplate: 'Review stage fit for company age',
      priority: 3,
      rationale: 'Company age is unusual for current stage classification',
    },
  ],
};

// =============================================================================
// SUGGESTION CREATION
// =============================================================================

/**
 * Create a goal suggestion from an anomaly
 * Now supports multi-entity goals via entityRefs
 */
function createSuggestion({
  anomaly,
  company,
  mapping,
  params,
  // NEW: Optional additional entity context
  firm = null,
  deal = null,
  round = null,
  person = null,
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
    .replace('${target}', target || '?')
    .replace('{companyName}', company.name)
    .replace('{firmName}', firm?.name || '?')
    .replace('{personName}', person?.name || person?.fn ? `${person.fn} ${person.ln}` : '?')
    .replace('{roundStage}', round?.stage || 'round');
  
  // Calculate suggested due date (based on severity)
  const daysToDeadline = anomaly.severity === ANOMALY_SEVERITY.CRITICAL ? 30
    : anomaly.severity === ANOMALY_SEVERITY.HIGH ? 60
    : anomaly.severity === ANOMALY_SEVERITY.MEDIUM ? 90
    : 120;
  
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + daysToDeadline);
  
  // Build entityRefs for multi-entity goals
  const entityRefs = [
    { type: 'company', id: company.id, role: 'primary' }
  ];
  if (firm) {
    entityRefs.push({ type: 'firm', id: firm.id, role: 'target' });
  }
  if (deal) {
    entityRefs.push({ type: 'deal', id: deal.id, role: 'participant' });
  }
  if (round) {
    entityRefs.push({ type: 'round', id: round.id, role: 'participant' });
  }
  if (person) {
    entityRefs.push({ type: 'person', id: person.id, role: 'target' });
  }
  
  return {
    suggestionId: `sug-${anomaly.anomalyId}-${mapping.suggestionType}`,
    suggestionType: mapping.suggestionType,
    sourceAnomalyId: anomaly.anomalyId,
    sourceAnomalyType: anomaly.type,
    
    // Proposed goal with multi-entity support
    proposedGoal: {
      type: mapping.goalType,
      name,
      target,
      due: dueDate.toISOString().split('T')[0],
      status: 'suggested',
      entityRefs: entityRefs.length > 1 ? entityRefs : undefined, // Only include if multi-entity
    },
    
    // Context (legacy + new)
    companyId: company.id,
    companyName: company.name,
    firmId: firm?.id,
    firmName: firm?.name,
    dealId: deal?.id,
    roundId: round?.id,
    personId: person?.id,
    stage: company.stage,
    priority: mapping.priority,
    rationale: mapping.rationale,
    severity: anomaly.severity,
    
    // Entity refs for downstream processing
    entityRefs,
    isMultiEntity: entityRefs.length > 1,
    
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
    snapshot = null,
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
  const goal = {
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
  
  // Include entityRefs if multi-entity
  if (suggestion.entityRefs && suggestion.entityRefs.length > 1) {
    goal.entityRefs = suggestion.entityRefs;
    goal.companyId = suggestion.companyId;
    goal.firmId = suggestion.firmId;
    goal.dealId = suggestion.dealId;
    goal.roundId = suggestion.roundId;
    goal.personId = suggestion.personId;
  }
  
  return goal;
}

// =============================================================================
// MULTI-ENTITY GOAL SUGGESTIONS
// =============================================================================

/**
 * Suggest intro goal when company is raising and has warm investor relationships
 * 
 * @param {Object} company - Company that needs intros
 * @param {Object[]} firms - Available investor firms
 * @param {Object[]} people - People with relationships
 * @param {Object[]} relationships - Relationship data
 * @returns {Object[]} Intro suggestions
 */
export function suggestIntroGoals(company, firms, people, relationships) {
  const suggestions = [];
  
  if (!company.raising) return suggestions;
  
  // Find firms with warm relationships but no active deals
  for (const firm of firms.slice(0, 10)) { // Limit to avoid explosion
    // Check if we have a relationship with this firm
    const firmPartners = people.filter(p => p.firmId === firm.id);
    if (firmPartners.length === 0) continue;
    
    const partner = firmPartners[0];
    
    suggestions.push({
      suggestionId: `sug-intro-${company.id}-${firm.id}`,
      suggestionType: SUGGESTION_TYPES.INTRO_TARGET,
      sourceAnomalyId: null,
      sourceAnomalyType: 'RAISING_NO_DEAL',
      
      proposedGoal: {
        type: 'intro_target',
        name: `Intro ${company.name} to ${firm.name}`,
        target: 100,
        due: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'suggested',
        entityRefs: [
          { type: 'company', id: company.id, role: 'primary' },
          { type: 'firm', id: firm.id, role: 'target' },
          { type: 'person', id: partner.id, role: 'target' },
        ],
      },
      
      companyId: company.id,
      companyName: company.name,
      firmId: firm.id,
      firmName: firm.name,
      personId: partner.id,
      entityRefs: [
        { type: 'company', id: company.id, role: 'primary' },
        { type: 'firm', id: firm.id, role: 'target' },
        { type: 'person', id: partner.id, role: 'target' },
      ],
      isMultiEntity: true,
      priority: 3,
      rationale: `${company.name} is raising - intro to ${firm.name} could accelerate round`,
      severity: ANOMALY_SEVERITY.MEDIUM,
      
      createdAt: new Date().toISOString(),
    });
  }
  
  return suggestions.slice(0, 5); // Max 5 intro suggestions per company
}

/**
 * Suggest deal close goals for stalled deals
 * 
 * @param {Object} company
 * @param {Object[]} deals - Company's deals
 * @param {Object[]} firms
 * @returns {Object[]} Deal close suggestions
 */
export function suggestDealCloseGoals(company, deals, firms) {
  const suggestions = [];
  
  const now = new Date();
  for (const deal of deals) {
    if (!deal.asOf) continue;
    
    const lastUpdate = new Date(deal.asOf);
    const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
    
    // Suggest closing if deal is stalling (14-30 days no update)
    if (daysSinceUpdate > 14 && daysSinceUpdate < 60) {
      const firm = firms.find(f => f.id === deal.firmId);
      if (!firm) continue;
      
      suggestions.push({
        suggestionId: `sug-deal-${deal.id}`,
        suggestionType: SUGGESTION_TYPES.DEAL_CLOSE,
        sourceAnomalyId: null,
        sourceAnomalyType: 'DEAL_STALLING',
        
        proposedGoal: {
          type: 'deal_close',
          name: `Close ${firm.name} deal for ${company.name}`,
          target: deal.softCommit || 500000,
          due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'suggested',
          entityRefs: [
            { type: 'deal', id: deal.id, role: 'primary' },
            { type: 'company', id: company.id, role: 'participant' },
            { type: 'firm', id: firm.id, role: 'target' },
          ],
        },
        
        companyId: company.id,
        companyName: company.name,
        firmId: firm.id,
        firmName: firm.name,
        dealId: deal.id,
        entityRefs: [
          { type: 'deal', id: deal.id, role: 'primary' },
          { type: 'company', id: company.id, role: 'participant' },
          { type: 'firm', id: firm.id, role: 'target' },
        ],
        isMultiEntity: true,
        priority: 2,
        rationale: `Deal with ${firm.name} stalling (${Math.round(daysSinceUpdate)} days since update)`,
        severity: daysSinceUpdate > 21 ? ANOMALY_SEVERITY.HIGH : ANOMALY_SEVERITY.MEDIUM,
        
        evidence: {
          daysSinceUpdate: Math.round(daysSinceUpdate),
          currentStage: deal.stage,
          softCommit: deal.softCommit,
          hardCommit: deal.hardCommit,
        },
        
        createdAt: new Date().toISOString(),
      });
    }
  }
  
  return suggestions;
}

/**
 * Suggest round completion goals for active rounds
 * 
 * @param {Object} company
 * @param {Object[]} rounds
 * @param {Object[]} deals
 * @returns {Object[]} Round completion suggestions
 */
export function suggestRoundCompletionGoals(company, rounds, deals) {
  const suggestions = [];
  
  for (const round of rounds) {
    if (round.status !== 'Active') continue;
    
    const roundDeals = deals.filter(d => d.roundId === round.id);
    const totalCommitted = roundDeals.reduce((sum, d) => sum + (d.hardCommit || 0), 0);
    const coverage = round.targetAmount > 0 ? totalCommitted / round.targetAmount : 0;
    
    // Suggest if round is under 80% covered
    if (coverage < 0.8) {
      suggestions.push({
        suggestionId: `sug-round-${round.id}`,
        suggestionType: SUGGESTION_TYPES.ROUND_COMPLETION,
        sourceAnomalyId: null,
        sourceAnomalyType: 'ROUND_UNDERCOVERED',
        
        proposedGoal: {
          type: 'round_completion',
          name: `Complete ${round.stage || 'Seed'} round for ${company.name}`,
          target: round.targetAmount,
          due: round.targetCloseDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'suggested',
          entityRefs: [
            { type: 'round', id: round.id, role: 'primary' },
            { type: 'company', id: company.id, role: 'participant' },
          ],
        },
        
        companyId: company.id,
        companyName: company.name,
        roundId: round.id,
        entityRefs: [
          { type: 'round', id: round.id, role: 'primary' },
          { type: 'company', id: company.id, role: 'participant' },
        ],
        isMultiEntity: true,
        priority: 1,
        rationale: `Round ${(coverage * 100).toFixed(0)}% covered - needs ${((1 - coverage) * 100).toFixed(0)}% more`,
        severity: coverage < 0.5 ? ANOMALY_SEVERITY.HIGH : ANOMALY_SEVERITY.MEDIUM,
        
        evidence: {
          coverage: coverage,
          totalCommitted,
          targetAmount: round.targetAmount,
          gap: round.targetAmount - totalCommitted,
        },
        
        createdAt: new Date().toISOString(),
      });
    }
  }
  
  return suggestions;
}

/**
 * Suggest relationship building goals for dormant investor relationships
 * 
 * @param {Object[]} firms - All firms
 * @param {Object[]} relationships - Relationship data
 * @param {number} dormantDays - Days threshold for dormancy (default 60)
 * @returns {Object[]} Relationship suggestions
 */
export function suggestRelationshipGoals(firms, people, relationships, dormantDays = 60) {
  const suggestions = [];
  const now = new Date();
  
  for (const firm of firms.slice(0, 20)) { // Limit
    const firmPartners = people.filter(p => p.firmId === firm.id);
    if (firmPartners.length === 0) continue;
    
    const partner = firmPartners[0];
    
    // Check for dormant relationship (simplified - no recent activity)
    const firmRels = relationships.filter(r => 
      r.p1Id === partner.id || r.p2Id === partner.id
    );
    
    if (firmRels.length > 0) {
      const recentRel = firmRels.find(r => {
        if (!r.lastContact) return false;
        const daysSince = (now - new Date(r.lastContact)) / (1000 * 60 * 60 * 24);
        return daysSince < dormantDays;
      });
      
      // If no recent relationship activity, suggest building
      if (!recentRel && Math.random() < 0.3) { // 30% chance to avoid spam
        suggestions.push({
          suggestionId: `sug-rel-${firm.id}`,
          suggestionType: SUGGESTION_TYPES.RELATIONSHIP_BUILD,
          sourceAnomalyId: null,
          sourceAnomalyType: 'DORMANT_RELATIONSHIP',
          
          proposedGoal: {
            type: 'relationship_build',
            name: `Build relationship with ${firm.name}`,
            target: 100,
            due: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'suggested',
            entityRefs: [
              { type: 'firm', id: firm.id, role: 'primary' },
              { type: 'person', id: partner.id, role: 'target' },
            ],
          },
          
          firmId: firm.id,
          firmName: firm.name,
          personId: partner.id,
          entityRefs: [
            { type: 'firm', id: firm.id, role: 'primary' },
            { type: 'person', id: partner.id, role: 'target' },
          ],
          isMultiEntity: true,
          priority: 4,
          rationale: `No recent activity with ${firm.name} - re-engage to maintain deal flow`,
          severity: ANOMALY_SEVERITY.LOW,
          
          createdAt: new Date().toISOString(),
        });
      }
    }
  }
  
  return suggestions.slice(0, 10);
}

/**
 * Comprehensive multi-entity goal suggestions for a portfolio
 * 
 * @param {Object} data - Full data context { companies, firms, people, deals, rounds, relationships }
 * @returns {{ suggestions: Object[], summary: Object }}
 */
export function suggestMultiEntityGoals(data) {
  const { companies, firms, people, deals, rounds, relationships } = data;
  const portfolioCompanies = companies.filter(c => c.isPortfolio);
  
  let allSuggestions = [];
  
  for (const company of portfolioCompanies) {
    const companyDeals = deals.filter(d => d.companyId === company.id);
    const companyRounds = rounds.filter(r => r.companyId === company.id);
    
    // Intro suggestions
    allSuggestions.push(...suggestIntroGoals(company, firms, people, relationships));
    
    // Deal close suggestions
    allSuggestions.push(...suggestDealCloseGoals(company, companyDeals, firms));
    
    // Round completion suggestions
    allSuggestions.push(...suggestRoundCompletionGoals(company, companyRounds, companyDeals));
  }
  
  // Portfolio-wide relationship suggestions (not company-specific)
  allSuggestions.push(...suggestRelationshipGoals(firms, people, relationships));
  
  // Sort by priority
  allSuggestions.sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return a.priority - b.priority;
  });
  
  const summary = {
    total: allSuggestions.length,
    byType: {},
    bySeverity: {
      critical: allSuggestions.filter(s => s.severity === ANOMALY_SEVERITY.CRITICAL).length,
      high: allSuggestions.filter(s => s.severity === ANOMALY_SEVERITY.HIGH).length,
      medium: allSuggestions.filter(s => s.severity === ANOMALY_SEVERITY.MEDIUM).length,
      low: allSuggestions.filter(s => s.severity === ANOMALY_SEVERITY.LOW).length,
    },
  };
  
  for (const s of allSuggestions) {
    const type = s.proposedGoal.type;
    summary.byType[type] = (summary.byType[type] || 0) + 1;
  }
  
  return { suggestions: allSuggestions, summary };
}

export default {
  suggestGoals,
  suggestPortfolioGoals,
  getHighPrioritySuggestions,
  suggestionToGoal,
  SUGGESTION_TYPES,
  // NEW: Multi-entity exports
  suggestIntroGoals,
  suggestDealCloseGoals,
  suggestRoundCompletionGoals,
  suggestRelationshipGoals,
  suggestMultiEntityGoals,
};
