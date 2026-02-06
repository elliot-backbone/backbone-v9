/**
 * goalDamage.js — Quantified issue-to-goal damage
 *
 * For each (issue, goal) pair, computes how much the issue damages
 * the goal's probability of completion.
 *
 * goalDamage = issueSeverity × goalWeight × proximityFactor
 *
 * INVARIANT: goalDamage is DERIVED. Never stored in raw/.
 *
 * @module goalDamage
 */

const ISSUE_GOAL_MAPPING = {
  'RUNWAY_CRITICAL':   ['fundraise', 'operational'],
  'RUNWAY_WARNING':    ['fundraise', 'operational'],
  'GOAL_BEHIND':       null, // Direct: affects the specific goal
  'GOAL_STALLED':      null,
  'GOAL_MISSED':       null,
  'NO_GOALS':          ['operational'],
  'DATA_MISSING':      ['operational', 'revenue'],
  'DATA_STALE':        ['operational'],
  'NO_PIPELINE':       ['fundraise'],
  'PIPELINE_GAP':      ['fundraise'],
  'DEAL_STALE':        ['fundraise'],
  'DEAL_AT_RISK':      ['fundraise'],
};

const SEVERITY_DAMAGE = {
  3: 1.0,   // CRITICAL
  2: 0.7,   // HIGH
  1: 0.4,   // MEDIUM
  0: 0.15,  // LOW
};

/**
 * Compute goalDamage for all (issue, goal) pairs for a company.
 *
 * @param {Object[]} issues - Detected issues for this company
 * @param {Object[]} goals - Goals for this company
 * @param {Date} now - Reference time
 * @returns {Object[]} Array of { issueId, goalId, damage, components }
 */
export function computeGoalDamage(issues, goals, now = new Date()) {
  const damages = [];

  for (const issue of (issues || [])) {
    const severityMultiplier = SEVERITY_DAMAGE[issue.severity] || 0.2;

    let affectedGoals;

    if (issue.goalId) {
      affectedGoals = (goals || []).filter(g => g.id === issue.goalId);
    } else {
      const affectedTypes = ISSUE_GOAL_MAPPING[issue.issueType];
      if (!affectedTypes) continue;
      affectedGoals = (goals || []).filter(g => affectedTypes.includes(g.type));
    }

    for (const goal of affectedGoals) {
      const dueDate = goal.due ? new Date(goal.due) : null;
      let proximityFactor = 0.5;
      if (dueDate) {
        const daysLeft = Math.max(0, (dueDate - now) / (1000 * 60 * 60 * 24));
        proximityFactor = daysLeft < 30 ? 1.0 : daysLeft < 90 ? 0.8 : daysLeft < 180 ? 0.5 : 0.3;
      }

      const goalWeight = (goal.weight || 50) / 100;
      const damage = severityMultiplier * goalWeight * proximityFactor;

      damages.push({
        issueId: issue.issueId,
        goalId: goal.id,
        damage: Math.round(damage * 1000) / 1000,
        components: {
          severityMultiplier,
          goalWeight: Math.round(goalWeight * 100) / 100,
          proximityFactor,
        },
      });
    }
  }

  damages.sort((a, b) => b.damage - a.damage);
  return damages;
}

/**
 * Aggregate goalDamage per goal (sum of all issue damages).
 * Returns a map: goalId → totalDamage
 */
export function aggregateGoalDamage(damages) {
  const byGoal = new Map();
  for (const d of damages) {
    const current = byGoal.get(d.goalId) || 0;
    byGoal.set(d.goalId, current + d.damage);
  }
  return byGoal;
}
