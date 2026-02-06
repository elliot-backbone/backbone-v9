/**
 * CompanyGoalsIssues Section
 * Displays: active goals, resolved goals (collapsed), issues,
 * suggested goals, goal damage
 *
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [C4]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

export default function CompanyGoalsIssues({ data }) {
  const goals = data?.goals || [];
  const issues = data?.issues || [];
  const suggestedGoals = data?.suggestedGoals || [];
  const goalDamage = data?.goalDamage || [];

  const activeGoals = goals.filter(g => g.status === 'active' || !g.status);
  const resolvedGoals = goals.filter(g => g.status === 'resolved' || g.status === 'completed');

  const hasContent = goals.length > 0 || issues.length > 0 || suggestedGoals.length > 0 || goalDamage.length > 0;

  if (!hasContent) {
    return (
      <SectionWrapper label="Goals & Issues">
        <EmptyState message="No goals or issues linked to this company" />
      </SectionWrapper>
    );
  }

  // Calculate progress percentage
  const getProgress = (goal) => {
    if (!goal.current || !goal.target) return null;
    return Math.round((goal.current / goal.target) * 100);
  };

  // Aggregate goalDamage by goal
  const damageByGoal = {};
  for (const d of goalDamage) {
    if (!damageByGoal[d.goalId]) {
      damageByGoal[d.goalId] = { goalId: d.goalId, goalName: d.goalName || d.goalType, total: 0, issues: [] };
    }
    damageByGoal[d.goalId].total += d.damage || 0;
    damageByGoal[d.goalId].issues.push({ issueType: d.issueType, damage: d.damage });
  }

  return (
    <SectionWrapper label="Goals & Issues">
      <div className="space-y-4">
        {activeGoals.length > 0 && (
          <div>
            <div className="text-xs text-bb-text-muted uppercase tracking-wide mb-2">
              Active Goals ({activeGoals.length})
            </div>
            <div className="space-y-2">
              {activeGoals.map((goal) => {
                const progress = getProgress(goal);
                const damage = damageByGoal[goal.id];
                return (
                  <div key={goal.id} className="text-sm p-3 bg-bb-panel rounded border border-bb-border">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <EntityLink type="goal" id={goal.id} className="font-medium text-bb-blue hover:underline">
                          {goal.name}
                        </EntityLink>
                        <div className="text-xs text-bb-text-muted mt-0.5">
                          {goal.type && <span className="capitalize">{goal.type}</span>}
                          {goal.due && <span> · Due {new Date(goal.due).toLocaleDateString()}</span>}
                          {damage && (
                            <span className="ml-1 text-bb-red">
                              · Damage: {damage.total.toFixed(2)} ({damage.issues.length} issue{damage.issues.length > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                      </div>
                      {progress !== null && (
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${progress >= 100 ? 'text-bb-green' : progress >= 70 ? 'text-bb-blue' : 'text-bb-amber'}`}>
                            {progress}%
                          </div>
                        </div>
                      )}
                    </div>
                    {progress !== null && (
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${progress >= 100 ? 'bg-green-500' : progress >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {resolvedGoals.length > 0 && (
          <details className="text-sm">
            <summary className="text-xs text-bb-text-muted uppercase tracking-wide cursor-pointer hover:text-bb-text-secondary">
              Resolved Goals ({resolvedGoals.length})
            </summary>
            <div className="mt-2 space-y-1">
              {resolvedGoals.map((goal) => (
                <div key={goal.id} className="text-bb-text-muted pl-2">
                  <EntityLink type="goal" id={goal.id} className="hover:underline">
                    {goal.name}
                  </EntityLink>
                </div>
              ))}
            </div>
          </details>
        )}

        {suggestedGoals.length > 0 && (
          <div>
            <div className="text-xs text-bb-text-muted uppercase tracking-wide mb-2">
              Suggested Goals ({suggestedGoals.length})
            </div>
            <div className="space-y-2">
              {suggestedGoals.map((sg, i) => (
                <div key={sg.id || i} className="text-sm p-2 bg-blue-50 rounded border border-blue-100">
                  <div className="font-medium text-bb-blue">{sg.name || sg.type}</div>
                  {sg.rationale && (
                    <div className="text-xs text-bb-text-muted mt-0.5">{sg.rationale}</div>
                  )}
                  {sg.confidence !== undefined && (
                    <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                      {Math.round(sg.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {issues.length > 0 && (
          <div>
            <div className="text-xs text-bb-text-muted uppercase tracking-wide mb-2">
              Issues ({issues.length})
            </div>
            <div className="space-y-2">
              {issues.map((issue) => (
                <div key={issue.id} className="text-sm p-2 bg-red-50 rounded border border-red-100">
                  <EntityLink type="issue" id={issue.id} className="text-bb-red hover:underline">
                    {issue.name || issue.title || issue.id}
                  </EntityLink>
                  {issue.severity && (
                    <span className="ml-2 text-xs text-red-500">({issue.severity})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(damageByGoal).length > 0 && (
          <details className="text-sm">
            <summary className="text-xs text-bb-text-muted uppercase tracking-wide cursor-pointer hover:text-bb-text-secondary">
              Goal Damage Detail ({Object.keys(damageByGoal).length} goals affected)
            </summary>
            <div className="mt-2 space-y-2">
              {Object.values(damageByGoal)
                .sort((a, b) => b.total - a.total)
                .map(d => (
                  <div key={d.goalId} className="text-sm p-2 bg-red-50 rounded border border-red-100">
                    <div className="font-medium">{d.goalName} — Total damage: {d.total.toFixed(2)}</div>
                    <div className="text-xs text-bb-text-muted mt-1">
                      {d.issues.map((iss, j) => (
                        <span key={j}>
                          {j > 0 && ' · '}
                          {iss.issueType}: {iss.damage.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </details>
        )}
      </div>
    </SectionWrapper>
  );
}
