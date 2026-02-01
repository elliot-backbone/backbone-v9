/**
 * CompanyGoalsIssues Section
 * Displays: active goals, resolved goals (collapsed), issues
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [C4]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

export default function CompanyGoalsIssues({ data }) {
  const goals = data?.goals || [];
  const issues = data?.issues || [];
  
  const activeGoals = goals.filter(g => g.status === 'active' || !g.status);
  const resolvedGoals = goals.filter(g => g.status === 'resolved' || g.status === 'completed');

  if (goals.length === 0 && issues.length === 0) {
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

  return (
    <SectionWrapper label="Goals & Issues">
      <div className="space-y-4">
        {activeGoals.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Active Goals ({activeGoals.length})
            </div>
            <div className="space-y-2">
              {activeGoals.map((goal) => {
                const progress = getProgress(goal);
                return (
                  <div key={goal.id} className="text-sm p-3 bg-gray-50 rounded border border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <EntityLink type="goal" id={goal.id} className="font-medium text-blue-600 hover:underline">
                          {goal.name}
                        </EntityLink>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {goal.type && <span className="capitalize">{goal.type}</span>}
                          {goal.due && <span> · Due {new Date(goal.due).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      {progress !== null && (
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${progress >= 100 ? 'text-green-600' : progress >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
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
            <summary className="text-xs text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700">
              Resolved Goals ({resolvedGoals.length})
            </summary>
            <div className="mt-2 space-y-1">
              {resolvedGoals.map((goal) => (
                <div key={goal.id} className="text-gray-500 pl-2">
                  <EntityLink type="goal" id={goal.id} className="hover:underline">
                    {goal.name}
                  </EntityLink>
                </div>
              ))}
            </div>
          </details>
        )}
        
        {issues.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Issues ({issues.length})
            </div>
            <div className="space-y-2">
              {issues.map((issue) => (
                <div key={issue.id} className="text-sm p-2 bg-red-50 rounded border border-red-100">
                  <EntityLink type="issue" id={issue.id} className="text-red-700 hover:underline">
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
      </div>
    </SectionWrapper>
  );
}
