/**
 * goalActions.js — Goal-Driven Action Generation
 *
 * Each goal type declares 3 action categories.
 * One action per category — enforced structurally.
 *
 * Part of the goal-driven pipeline:
 *   goals → GOAL_CATEGORY_MAP → 3 actions per goal
 *
 * @module goalActions
 */

import { createAction } from './actionSchema.js';

// =============================================================================
// GOAL TYPE → 3 CATEGORIES
// =============================================================================

export const GOAL_CATEGORY_MAP = {
  revenue:              ['growth',     'pipeline',   'data'],
  fundraise:            ['fundraise',  'pipeline',   'intros'],
  hiring:               ['goals',      'growth',     'data'],
  product:              ['goals',      'growth',     'data'],
  operational:          ['financial',  'goals',      'data'],
  partnership:          ['intros',     'pipeline',   'goals'],
  retention:            ['goals',      'growth',     'financial'],
  efficiency:           ['financial',  'goals',      'growth'],
  customer_growth:      ['growth',     'goals',      'pipeline'],
  intro_target:         ['intros',     'pipeline',   'goals'],
  deal_close:           ['pipeline',   'fundraise',  'intros'],
  round_completion:     ['fundraise',  'pipeline',   'financial'],
  investor_activation:  ['intros',     'pipeline',   'fundraise'],
  champion_cultivation: ['intros',     'goals',      'pipeline'],
  relationship_build:   ['intros',     'goals',      'pipeline'],
};

// =============================================================================
// ACTION TEMPLATES: {goalType}_{category}
// =============================================================================

const ACTION_TEMPLATES = {
  // --- revenue ---
  REVENUE_GROWTH:    { title: 'Accelerate revenue growth',          effort: 14, effectiveness: 0.7, steps: ['Review sales pipeline', 'Identify quick wins', 'Accelerate deal closing', 'Increase outreach'] },
  REVENUE_PIPELINE:  { title: 'Expand revenue pipeline',            effort: 10, effectiveness: 0.6, steps: ['Map target accounts', 'Build outbound sequences', 'Qualify inbound leads', 'Track conversion'] },
  REVENUE_DATA:      { title: 'Instrument revenue metrics',         effort: 5,  effectiveness: 0.5, steps: ['Define key revenue KPIs', 'Set up dashboards', 'Automate reporting', 'Review weekly'] },

  // --- fundraise ---
  FUNDRAISE_FUNDRAISE: { title: 'Drive fundraise to close',         effort: 30, effectiveness: 0.9, steps: ['Finalize lead investor', 'Complete due diligence', 'Negotiate terms', 'Execute closing'] },
  FUNDRAISE_PIPELINE:  { title: 'Expand investor pipeline',         effort: 7,  effectiveness: 0.65, steps: ['Identify 10 new prospects', 'Send warm intros', 'Schedule meetings', 'Follow up aggressively'] },
  FUNDRAISE_INTROS:    { title: 'Request investor introductions',   effort: 3,  effectiveness: 0.6, steps: ['Identify warm connections', 'Draft intro requests', 'Brief introducers', 'Follow up within 48h'] },

  // --- hiring ---
  HIRING_GOALS:      { title: 'Set hiring milestones',              effort: 3,  effectiveness: 0.5, steps: ['Define headcount targets by role', 'Set timeline for each hire', 'Assign recruiting owners', 'Track weekly progress'] },
  HIRING_GROWTH:     { title: 'Accelerate hiring pipeline',         effort: 14, effectiveness: 0.6, steps: ['Expand sourcing channels', 'Speed up interview process', 'Make competitive offers', 'Onboard quickly'] },
  HIRING_DATA:       { title: 'Track hiring funnel metrics',        effort: 3,  effectiveness: 0.4, steps: ['Instrument recruiting pipeline', 'Track time-to-fill', 'Measure offer acceptance rate', 'Review weekly'] },

  // --- product ---
  PRODUCT_GOALS:     { title: 'Define product milestones',          effort: 5,  effectiveness: 0.55, steps: ['Map feature requirements', 'Set sprint targets', 'Define acceptance criteria', 'Schedule reviews'] },
  PRODUCT_GROWTH:    { title: 'Sprint to product milestone',        effort: 14, effectiveness: 0.6, steps: ['Define sprint scope', 'Allocate engineering', 'Clear blockers daily', 'Track to milestone'] },
  PRODUCT_DATA:      { title: 'Instrument product analytics',       effort: 5,  effectiveness: 0.45, steps: ['Define key product metrics', 'Set up event tracking', 'Build usage dashboards', 'Review weekly'] },

  // --- operational ---
  OPERATIONAL_FINANCIAL: { title: 'Optimize financial operations',  effort: 7,  effectiveness: 0.65, steps: ['Review expense categories', 'Identify cost savings', 'Implement controls', 'Monitor monthly'] },
  OPERATIONAL_GOALS:     { title: 'Set operational targets',        effort: 3,  effectiveness: 0.5, steps: ['Define operational KPIs', 'Set quarterly targets', 'Assign owners', 'Track progress'] },
  OPERATIONAL_DATA:      { title: 'Improve operational reporting',  effort: 5,  effectiveness: 0.45, steps: ['Audit current reporting', 'Fill data gaps', 'Automate collection', 'Build dashboards'] },

  // --- partnership ---
  PARTNERSHIP_INTROS:    { title: 'Request partner introductions',  effort: 3,  effectiveness: 0.5, steps: ['Identify target partners', 'Find warm connections', 'Request intros', 'Follow up promptly'] },
  PARTNERSHIP_PIPELINE:  { title: 'Build partnership pipeline',     effort: 7,  effectiveness: 0.55, steps: ['Map partner ecosystem', 'Prioritize targets', 'Initiate conversations', 'Track progress'] },
  PARTNERSHIP_GOALS:     { title: 'Define partnership milestones',  effort: 3,  effectiveness: 0.45, steps: ['Set partnership KPIs', 'Define integration timeline', 'Assign champions', 'Review monthly'] },

  // --- retention ---
  RETENTION_GOALS:     { title: 'Set retention targets',            effort: 3,  effectiveness: 0.5, steps: ['Define retention KPIs', 'Set cohort targets', 'Identify at-risk segments', 'Build intervention playbook'] },
  RETENTION_GROWTH:    { title: 'Launch retention program',         effort: 10, effectiveness: 0.65, steps: ['Analyze churn drivers', 'Design retention offers', 'Implement health scoring', 'Execute outreach'] },
  RETENTION_FINANCIAL: { title: 'Quantify retention economics',     effort: 5,  effectiveness: 0.5, steps: ['Calculate LTV by cohort', 'Model retention impact on ARR', 'Build business case', 'Present to team'] },

  // --- efficiency ---
  EFFICIENCY_FINANCIAL: { title: 'Optimize unit economics',         effort: 7,  effectiveness: 0.6, steps: ['Audit cost structure', 'Identify margin levers', 'Implement pricing changes', 'Monitor impact'] },
  EFFICIENCY_GOALS:     { title: 'Set unit economics targets',      effort: 3,  effectiveness: 0.5, steps: ['Define efficiency metrics', 'Set stage-appropriate targets', 'Assign owners', 'Track monthly'] },
  EFFICIENCY_GROWTH:    { title: 'Scale efficient growth',          effort: 10, effectiveness: 0.55, steps: ['Identify scalable channels', 'Reduce CAC', 'Improve conversion rates', 'Increase payback speed'] },

  // --- customer_growth ---
  CUSTOMER_GROWTH_GROWTH:    { title: 'Accelerate customer acquisition',  effort: 10, effectiveness: 0.6, steps: ['Expand lead generation', 'Optimize conversion funnel', 'Launch referral program', 'Track CAC by channel'] },
  CUSTOMER_GROWTH_GOALS:     { title: 'Set customer growth targets',      effort: 3,  effectiveness: 0.5, steps: ['Define customer count goals', 'Set segment targets', 'Map growth channels', 'Track weekly'] },
  CUSTOMER_GROWTH_PIPELINE:  { title: 'Build customer pipeline',          effort: 7,  effectiveness: 0.55, steps: ['Map target segments', 'Build outreach sequences', 'Qualify pipeline', 'Forecast conversion'] },

  // --- intro_target ---
  INTRO_TARGET_INTROS:    { title: 'Execute introduction',             effort: 1,  effectiveness: 0.6, steps: ['Brief introducer on context', 'Make formal introduction', 'Follow up within 24h', 'Schedule meeting'] },
  INTRO_TARGET_PIPELINE:  { title: 'Prepare intro pipeline',           effort: 3,  effectiveness: 0.5, steps: ['Research target background', 'Identify mutual connections', 'Prepare materials', 'Sequence touchpoints'] },
  INTRO_TARGET_GOALS:     { title: 'Define intro success criteria',    effort: 1,  effectiveness: 0.4, steps: ['Define desired outcome', 'Set timeline', 'Plan follow-up cadence', 'Track progress'] },

  // --- deal_close ---
  DEAL_CLOSE_PIPELINE:   { title: 'Advance deal through pipeline',     effort: 7,  effectiveness: 0.7, steps: ['Review deal stage', 'Address objections', 'Send updated materials', 'Push for commitment'] },
  DEAL_CLOSE_FUNDRAISE:  { title: 'Drive deal to term sheet',          effort: 14, effectiveness: 0.8, steps: ['Align on valuation range', 'Draft term sheet', 'Address legal concerns', 'Close negotiation'] },
  DEAL_CLOSE_INTROS:     { title: 'Engage deal champions',             effort: 3,  effectiveness: 0.55, steps: ['Identify internal champions', 'Brief on deal status', 'Request their advocacy', 'Follow up'] },

  // --- round_completion ---
  ROUND_COMPLETION_FUNDRAISE:  { title: 'Close funding round',          effort: 21, effectiveness: 0.85, steps: ['Confirm lead allocation', 'Complete legal review', 'Coordinate wire instructions', 'Announce close'] },
  ROUND_COMPLETION_PIPELINE:   { title: 'Fill remaining round capacity', effort: 10, effectiveness: 0.65, steps: ['Identify allocation gaps', 'Reach out to interested parties', 'Negotiate participation', 'Secure commitments'] },
  ROUND_COMPLETION_FINANCIAL:  { title: 'Finalize round economics',     effort: 5,  effectiveness: 0.6, steps: ['Model dilution impact', 'Validate post-money valuation', 'Update cap table', 'Prepare closing docs'] },

  // --- investor_activation ---
  INVESTOR_ACTIVATION_INTROS:     { title: 'Re-engage dormant investors',  effort: 3,  effectiveness: 0.5, steps: ['Review relationship history', 'Identify relevant deal flow', 'Send personalized update', 'Propose meeting'] },
  INVESTOR_ACTIVATION_PIPELINE:   { title: 'Build investor engagement plan', effort: 5,  effectiveness: 0.5, steps: ['Map firm investment thesis', 'Identify portfolio synergies', 'Create touchpoint calendar', 'Execute outreach'] },
  INVESTOR_ACTIVATION_FUNDRAISE:  { title: 'Convert investor interest',    effort: 7,  effectiveness: 0.6, steps: ['Share deal materials', 'Arrange management meeting', 'Address diligence questions', 'Push for allocation'] },

  // --- champion_cultivation ---
  CHAMPION_CULTIVATION_INTROS:    { title: 'Build champion relationship',  effort: 3,  effectiveness: 0.5, steps: ['Schedule personal meeting', 'Share exclusive insights', 'Identify mutual value', 'Plan next touchpoint'] },
  CHAMPION_CULTIVATION_GOALS:     { title: 'Define champion milestones',   effort: 2,  effectiveness: 0.4, steps: ['Set advocacy targets', 'Define success metrics', 'Plan engagement cadence', 'Track advocacy actions'] },
  CHAMPION_CULTIVATION_PIPELINE:  { title: 'Leverage champion network',    effort: 5,  effectiveness: 0.55, steps: ['Map champion connections', 'Identify intro opportunities', 'Request warm intros', 'Track conversions'] },

  // --- relationship_build ---
  RELATIONSHIP_BUILD_INTROS:    { title: 'Initiate relationship',       effort: 1,  effectiveness: 0.5, steps: ['Find connection point', 'Send personalized outreach', 'Schedule first meeting', 'Follow up'] },
  RELATIONSHIP_BUILD_GOALS:     { title: 'Set relationship milestones', effort: 2,  effectiveness: 0.4, steps: ['Define relationship goals', 'Plan touchpoint cadence', 'Set warmth targets', 'Track engagement'] },
  RELATIONSHIP_BUILD_PIPELINE:  { title: 'Build relationship pipeline', effort: 5,  effectiveness: 0.5, steps: ['Map key stakeholders', 'Prioritize by value', 'Create outreach sequences', 'Track progress'] },
};

// =============================================================================
// TEMPLATE LOOKUP
// =============================================================================

/**
 * Get action template for a goal-type × category combination.
 * Returns resolution-like object with resolutionId, title, steps, effort, effectiveness.
 *
 * @param {string} goalType
 * @param {string} category
 * @param {Object} company
 * @returns {Object} Template
 */
export function getActionTemplate(goalType, category, company) {
  const key = `${goalType.toUpperCase()}_${category.toUpperCase()}`;
  const template = ACTION_TEMPLATES[key];

  if (template) {
    return {
      resolutionId: key,
      title: template.title,
      steps: template.steps.map((s, i) => ({ step: i + 1, action: s })),
      effort: template.effort,
      effectiveness: template.effectiveness,
    };
  }

  // Fallback: generic template for unmapped combinations
  return {
    resolutionId: `${goalType.toUpperCase()}_${category.toUpperCase()}`,
    title: `${category} action for ${goalType}`,
    steps: [
      { step: 1, action: `Assess current ${goalType} status` },
      { step: 2, action: `Identify ${category} opportunities` },
      { step: 3, action: `Execute ${category} plan` },
    ],
    effort: 7,
    effectiveness: 0.5,
  };
}

// =============================================================================
// ACTION GENERATION
// =============================================================================

/**
 * Generate exactly 3 actions for a goal, one per category.
 *
 * @param {Object} goal - Goal object with id, name, type, companyId, cur, tgt, weight
 * @param {Object} company - Company object
 * @param {string[]} categoryTriple - 3 categories from GOAL_CATEGORY_MAP
 * @returns {Object[]} Exactly 3 action candidates
 */
export function generateActionsForGoal(goal, company, categoryTriple) {
  return categoryTriple.map((category, idx) => {
    const template = getActionTemplate(goal.type, category, company);

    return createAction({
      actionId: `${goal.id}-act-${category}`,
      entityRef: { type: 'company', id: company.id, name: company.name },
      title: `${company.name}: ${template.title}`,
      sources: [{ sourceType: 'GOAL', sourceId: goal.id, goalId: goal.id }],
      resolutionId: template.resolutionId,
      steps: template.steps,
      impact: null, // Attached by actionImpact.js
      goalId: goal.id,
      goalName: goal.name,
      goalType: goal.type,
      category,
      isPrimary: idx === 0,
    });
  });
}

// =============================================================================
// RESOLUTION REGISTRY (for getAnyResolution compatibility)
// =============================================================================

/**
 * Get a goal-action template as a resolution-like object.
 * Used by actionImpact.js via getAnyResolution() fallback.
 */
export function getGoalActionResolution(resolutionId) {
  const template = ACTION_TEMPLATES[resolutionId];
  if (!template) return null;
  return {
    resolutionId,
    title: template.title,
    defaultEffort: template.effort,
    defaultImpact: template.effectiveness,
    effectiveness: template.effectiveness,
    actionSteps: template.steps,
  };
}

export { ACTION_TEMPLATES };

export default {
  GOAL_CATEGORY_MAP,
  ACTION_TEMPLATES,
  getActionTemplate,
  generateActionsForGoal,
  getGoalActionResolution,
};
