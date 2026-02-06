/**
 * contextMaps.js — Build context maps for ranking (A3)
 *
 * Pure functions. No imports. Derives trust risk and deadline maps
 * from events, health, preissues, and goals.
 *
 * @module derive/contextMaps
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MIN_OBSERVATIONS = 2;

/**
 * Build trust risk map for actions based on historical outcomes and company health.
 *
 * Trust risk sources:
 * 1. Event-based: actions of the same type (resolutionId) that previously
 *    failed or were abandoned get elevated risk.
 * 2. Health-based: actions at companies in RED health band get +0.2 risk.
 *
 * @param {Object[]} actions - Current actions with actionId, resolutionId, entityRef
 * @param {Object[]} events - Event stream (eventType, payload.actionType, payload.outcome)
 * @param {Map<string, Object>} healthByCompany - Map<companyId, { healthBand }>
 * @returns {Map<string, number>} Map<actionId, trustRisk 0-1>
 */
export function buildTrustRiskMap(actions, events, healthByCompany = new Map()) {
  const trustRiskByAction = new Map();
  if (!actions || actions.length === 0) return trustRiskByAction;

  // 1. Build outcome stats by action type from events
  const outcomeStats = new Map(); // actionType → { bad, total }
  for (const event of (events || [])) {
    if (event.eventType !== 'outcome_recorded') continue;
    const outcome = event.payload?.outcome;
    if (!outcome) continue;

    const actionType = event.payload?.actionType || event.actionType || 'UNKNOWN';
    if (!outcomeStats.has(actionType)) {
      outcomeStats.set(actionType, { bad: 0, total: 0 });
    }
    const stats = outcomeStats.get(actionType);
    stats.total += 1;
    if (outcome === 'failed' || outcome === 'abandoned') {
      stats.bad += 1;
    }
  }

  // 2. For each action, compute trust risk
  for (const action of actions) {
    let risk = 0;

    // Event-based risk: bad outcome ratio for this action type
    const actionType = action.resolutionId || 'UNKNOWN';
    const stats = outcomeStats.get(actionType);
    if (stats && stats.total >= MIN_OBSERVATIONS) {
      const badRatio = stats.bad / stats.total;
      risk += badRatio * 0.6;
    }

    // Health-based risk: RED band companies get elevated risk
    const companyId = action.entityRef?.id;
    const health = companyId ? healthByCompany.get(companyId) : null;
    if (health?.healthBand === 'RED') {
      risk += 0.2;
    }

    // Clamp to [0, 1]
    risk = Math.min(1, Math.max(0, risk));

    if (risk > 0) {
      trustRiskByAction.set(action.actionId, risk);
    }
  }

  return trustRiskByAction;
}

/**
 * Build deadline map for actions based on preissue escalation and goal due dates.
 *
 * Deadline sources (priority: earliest wins):
 * 1. PREISSUE-sourced: escalation.daysUntilEscalation
 * 2. Goal-linked: (goal.due - now) in days
 *
 * @param {Object[]} actions - Current actions with sources[0].sourceType, preIssueId, goalId
 * @param {Object[]} preissues - All preissues with preIssueId, escalation.daysUntilEscalation
 * @param {Object[]} goals - All goals with id, due (ISO date string)
 * @param {Date} now - Current time
 * @returns {Map<string, number>} Map<actionId, daysUntilDeadline>
 */
export function buildDeadlineMap(actions, preissues, goals, now) {
  const deadlinesByAction = new Map();
  if (!actions || actions.length === 0) return deadlinesByAction;

  // Build lookups
  const preissueById = new Map();
  for (const pi of (preissues || [])) {
    if (pi.preIssueId) preissueById.set(pi.preIssueId, pi);
  }

  const goalById = new Map();
  for (const g of (goals || [])) {
    if (g.id) goalById.set(g.id, g);
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  for (const action of actions) {
    const source = action.sources?.[0];
    if (!source) continue;

    let deadline = null;

    // Preissue escalation deadline
    if (source.preIssueId) {
      const pi = preissueById.get(source.preIssueId);
      const days = pi?.escalation?.daysUntilEscalation;
      if (typeof days === 'number' && days > 0) {
        deadline = days;
      }
    }

    // Goal due date deadline
    if (source.goalId) {
      const goal = goalById.get(source.goalId);
      if (goal?.due) {
        const dueMs = new Date(goal.due).getTime();
        const days = (dueMs - nowMs) / MS_PER_DAY;
        if (days > 0) {
          deadline = deadline !== null ? Math.min(deadline, days) : days;
        }
      }
    }

    if (deadline !== null) {
      deadlinesByAction.set(action.actionId, deadline);
    }
  }

  return deadlinesByAction;
}

export default { buildTrustRiskMap, buildDeadlineMap };
