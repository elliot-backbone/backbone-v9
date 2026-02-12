/**
 * actionCategories.js — Maps resolutionId to user-facing category
 *
 * Categories group actions by intent on company cards.
 * Impact bucketing is derived at render time (never stored).
 */

const CATEGORY_MAP = {
  ACCELERATE_FUNDRAISE:     'fundraise',
  EXPAND_INVESTOR_LIST:     'fundraise',
  FOLLOW_UP_INVESTOR:       'fundraise',
  RESOLVE_PIPELINE_GAP:     'pipeline',
  RESOLVE_DEAL_STALE:       'pipeline',
  PRIORITIZE_LEAD_CANDIDATES: 'pipeline',
  RESOLVE_GOAL_STALLED:     'goals',
  RESOLVE_GOAL_NO_HISTORY:  'goals',
  ACCELERATE_GOAL:          'goals',
  REDUCE_BURN:              'financial',
  RESOLVE_RUNWAY_WARNING:   'financial',
  REVENUE_PUSH:             'growth',
  PRODUCT_SPRINT:           'growth',
  RESOLVE_DATA_MISSING:     'data',
  RESOLVE_DATA_STALE:       'data',
  INTRODUCTION:             'intros',
  FOLLOWUP:                 'intros',
};

const CATEGORY_META = {
  fundraise:  { label: 'Fundraise', icon: '💰', order: 0 },
  pipeline:   { label: 'Pipeline',  icon: '🔗', order: 1 },
  goals:      { label: 'Goals',     icon: '🎯', order: 2 },
  financial:  { label: 'Financial', icon: '📊', order: 3 },
  growth:     { label: 'Growth',    icon: '📈', order: 4 },
  data:       { label: 'Data',      icon: '🗂️', order: 5 },
  intros:     { label: 'Intros',    icon: '🤝', order: 6 },
};

export function getCategory(resolutionId) {
  return CATEGORY_MAP[resolutionId] || 'other';
}

export function getCategoryMeta(category) {
  return CATEGORY_META[category] || { label: category, icon: '•', order: 99 };
}

export function getImpactBucket(rankScore) {
  if (rankScore >= 60) return 'high';
  if (rankScore >= 30) return 'medium';
  return 'low';
}

/**
 * Group actions by company, then by category.
 * Returns Map<companyId, Map<category, action[]>>
 */
export function groupActionsByCompanyCategory(actions) {
  const grouped = {};

  for (const action of actions) {
    const companyId = action.companyId || action.entityRef?.id || 'unknown';
    const category = getCategory(action.resolutionId);

    if (!grouped[companyId]) grouped[companyId] = {};
    if (!grouped[companyId][category]) grouped[companyId][category] = [];
    grouped[companyId][category].push(action);
  }

  return grouped;
}

/**
 * Get sorted category list with top action for each.
 */
export function getCompanyActionSlots(categoryActions) {
  const slots = [];

  for (const [category, actions] of Object.entries(categoryActions)) {
    const meta = getCategoryMeta(category);
    if (actions.length > 0) {
      slots.push({
        category,
        ...meta,
        topAction: actions[0],
        remaining: actions.length - 1,
      });
    }
  }

  slots.sort((a, b) => a.order - b.order);
  return slots;
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_META);
