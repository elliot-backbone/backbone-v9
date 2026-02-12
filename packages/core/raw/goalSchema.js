/**
 * goalSchema.js — Multi-Entity Goal Schema
 * 
 * Goals can now attach to multiple entity types:
 * - company (primary, backward-compatible)
 * - firm (investor relationship goals)
 * - deal (deal progression goals)
 * - round (round completion goals)
 * - person (relationship goals)
 * 
 * Supports activity tracking via milestones and activityLog.
 * 
 * @module goalSchema
 */

// =============================================================================
// GOAL TYPES BY ENTITY COMBINATION
// =============================================================================

/**
 * Goal type taxonomy with supported entity combinations
 */
export const GOAL_TYPES = {
  // Company-only goals (existing)
  revenue: {
    name: 'Revenue Target',
    entities: ['company'],
    metrics: ['arr', 'mrr', 'revenue'],
    description: 'Revenue milestone tracking',
  },
  fundraise: {
    name: 'Fundraise',
    entities: ['company'],
    metrics: ['raised', 'committed'],
    description: 'Fundraising round completion',
  },
  hiring: {
    name: 'Hiring',
    entities: ['company'],
    metrics: ['headcount', 'hires'],
    description: 'Team building milestone',
  },
  product: {
    name: 'Product',
    entities: ['company'],
    metrics: ['features', 'users', 'completion'],
    description: 'Product development milestone',
  },
  operational: {
    name: 'Operational',
    entities: ['company'],
    metrics: ['burn', 'runway', 'efficiency'],
    description: 'Operational efficiency goal',
  },
  partnership: {
    name: 'Partnership',
    entities: ['company'],
    metrics: ['partners', 'integrations'],
    description: 'Strategic partnership goal',
  },
  retention: {
    name: 'Retention',
    entities: ['company'],
    metrics: ['nrr', 'grr', 'logo_retention'],
    description: 'Customer retention improvement',
  },
  efficiency: {
    name: 'Unit Economics',
    entities: ['company'],
    metrics: ['cac', 'gross_margin', 'acv'],
    description: 'Unit economics optimization',
  },
  customer_growth: {
    name: 'Customer Growth',
    entities: ['company'],
    metrics: ['paying_customers', 'nps'],
    description: 'Customer base expansion and satisfaction',
  },

  // NEW: Multi-entity goals
  intro_target: {
    name: 'Introduction Target',
    entities: ['company', 'firm', 'person'],
    metrics: ['intro_made', 'meeting_held', 'relationship_established'],
    description: 'Goal to make a specific introduction',
    example: 'Intro EdgeAI to Sequoia GP by Q2',
  },
  relationship_build: {
    name: 'Relationship Building',
    entities: ['firm', 'person'],
    metrics: ['touchpoints', 'warmth_level', 'engagement'],
    description: 'Build or strengthen relationship with investor/person',
    example: 'Build relationship with Benchmark partner',
  },
  deal_close: {
    name: 'Deal Close',
    entities: ['deal', 'company', 'firm'],
    metrics: ['commitment', 'terms', 'closed'],
    description: 'Close a specific deal',
    example: 'Close Sequoia term sheet for seed round',
  },
  round_completion: {
    name: 'Round Completion',
    entities: ['round', 'company'],
    metrics: ['coverage', 'lead_secured', 'closed'],
    description: 'Complete a funding round',
    example: 'Close Series A by March',
  },
  investor_activation: {
    name: 'Investor Activation',
    entities: ['firm', 'company'],
    metrics: ['deals_created', 'engagement', 'active'],
    description: 'Re-engage or activate dormant investor relationship',
    example: 'Re-engage Andreessen for portfolio deal flow',
  },
  champion_cultivation: {
    name: 'Champion Cultivation',
    entities: ['person', 'firm', 'deal'],
    metrics: ['champion_score', 'advocacy', 'internal_support'],
    description: 'Cultivate internal champion at target firm',
    example: 'Build champion relationship with partner at Tiger Global',
  },
};

// =============================================================================
// GOAL SCHEMA
// =============================================================================

/**
 * Full goal schema with multi-entity support
 * 
 * Backward compatible: companyId still works for company-only goals
 */
export const GOAL_SCHEMA = {
  // Identity
  id: { type: 'string', required: true },
  
  // Multi-entity attachment (NEW)
  entityRefs: {
    type: 'array',
    items: {
      type: { type: 'string', enum: ['company', 'firm', 'deal', 'round', 'person'] },
      id: { type: 'string' },
      role: { type: 'string', enum: ['primary', 'target', 'participant'] },
    },
    description: 'Entities attached to this goal. At least one required.',
  },
  
  // Legacy support (backward compat)
  companyId: { type: 'string', description: 'Backward compat: primary company' },
  firmId: { type: 'string', description: 'Optional: target firm' },
  dealId: { type: 'string', description: 'Optional: associated deal' },
  roundId: { type: 'string', description: 'Optional: associated round' },
  personId: { type: 'string', description: 'Optional: target person' },
  
  // Goal definition
  name: { type: 'string', required: true },
  type: { type: 'string', enum: Object.keys(GOAL_TYPES), required: true },
  cur: { type: 'number', description: 'Current progress value' },
  tgt: { type: 'number', description: 'Target value' },
  status: { 
    type: 'string', 
    enum: ['suggested', 'active', 'blocked', 'completed', 'abandoned'],
    default: 'active',
  },
  due: { type: 'string', format: 'date' },
  unlocks: { type: 'string', description: 'What achieving this goal unlocks' },
  provenance: { 
    type: 'string', 
    enum: ['template', 'anomaly', 'suggested', 'manual'],
  },
  sourceAnomaly: { type: 'string', description: 'If provenance=anomaly' },
  
  // NEW: Activity tracking
  milestones: {
    type: 'array',
    items: {
      date: { type: 'string', format: 'date-time' },
      value: { type: 'number' },
      note: { type: 'string' },
    },
    description: 'Progress milestones for this goal',
  },
  activityLog: {
    type: 'array',
    items: {
      date: { type: 'string', format: 'date-time' },
      entityRef: { type: 'object' }, // { type, id }
      action: { type: 'string' },
      outcome: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
      note: { type: 'string' },
    },
    description: 'Activity log tracking progress towards goal',
  },
  
  // Metadata
  asOf: { type: 'string', format: 'date-time' },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Validate goal against schema
 */
export function validateGoal(goal) {
  const errors = [];
  
  if (!goal.id) errors.push('Missing id');
  if (!goal.name) errors.push('Missing name');
  if (!goal.type) errors.push('Missing type');
  if (goal.type && !GOAL_TYPES[goal.type]) {
    errors.push(`Unknown goal type: ${goal.type}`);
  }
  
  // Must have at least one entity reference
  const hasEntityRef = goal.entityRefs?.length > 0 || 
    goal.companyId || goal.firmId || goal.dealId || goal.roundId || goal.personId;
  if (!hasEntityRef) {
    errors.push('Goal must be attached to at least one entity');
  }
  
  // Validate entity refs match goal type
  const goalType = GOAL_TYPES[goal.type];
  if (goalType && goal.entityRefs) {
    for (const ref of goal.entityRefs) {
      if (!goalType.entities.includes(ref.type)) {
        errors.push(`Goal type ${goal.type} does not support entity type ${ref.type}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate goal has the post-migration shape (no legacy fields)
 */
export function validateGoalShape(goal) {
  const errors = [];
  const required = ['id', 'name', 'type', 'status', 'due', 'provenance'];

  for (const field of required) {
    if (goal[field] === undefined || goal[field] === null) {
      errors.push(`Goal ${goal.id || 'unknown'} missing: ${field}`);
    }
  }

  if (!goal.companyId && (!goal.entityRefs || goal.entityRefs.length === 0)) {
    errors.push(`Goal ${goal.id} has no companyId or entityRefs`);
  }

  if (goal.gap !== undefined) errors.push(`Goal ${goal.id} has legacy field: gap`);
  if (goal.gapPct !== undefined) errors.push(`Goal ${goal.id} has legacy field: gapPct`);

  return { valid: errors.length === 0, errors };
}

/**
 * Normalize goal to use entityRefs (convert legacy format)
 */
export function normalizeGoal(goal) {
  if (goal.entityRefs && goal.entityRefs.length > 0) {
    return goal; // Already normalized
  }
  
  const entityRefs = [];
  
  if (goal.companyId) {
    entityRefs.push({ type: 'company', id: goal.companyId, role: 'primary' });
  }
  if (goal.firmId) {
    entityRefs.push({ type: 'firm', id: goal.firmId, role: 'target' });
  }
  if (goal.dealId) {
    entityRefs.push({ type: 'deal', id: goal.dealId, role: 'participant' });
  }
  if (goal.roundId) {
    entityRefs.push({ type: 'round', id: goal.roundId, role: 'participant' });
  }
  if (goal.personId) {
    entityRefs.push({ type: 'person', id: goal.personId, role: 'target' });
  }
  
  return {
    ...goal,
    entityRefs,
  };
}

/**
 * Get all entity IDs from a goal
 */
export function getGoalEntityIds(goal) {
  const normalized = normalizeGoal(goal);
  return normalized.entityRefs.map(ref => ({ type: ref.type, id: ref.id }));
}

/**
 * Check if goal involves multiple entity types
 */
export function isMultiEntityGoal(goal) {
  const normalized = normalizeGoal(goal);
  const types = new Set(normalized.entityRefs.map(ref => ref.type));
  return types.size > 1;
}

/**
 * Get the goal type definition
 */
export function getGoalType(typeKey) {
  return GOAL_TYPES[typeKey] || null;
}

/**
 * Get goal types that support a specific entity combination
 */
export function getGoalTypesForEntities(entityTypes) {
  const result = [];
  for (const [key, type] of Object.entries(GOAL_TYPES)) {
    // Check if all requested entity types are supported
    const supported = entityTypes.every(et => type.entities.includes(et));
    if (supported) {
      result.push({ key, ...type });
    }
  }
  return result;
}

export default {
  GOAL_TYPES,
  GOAL_SCHEMA,
  validateGoal,
  normalizeGoal,
  getGoalEntityIds,
  isMultiEntityGoal,
  getGoalType,
  getGoalTypesForEntities,
};
