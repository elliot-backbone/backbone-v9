/**
 * CompanyGoalsIssues Section
 * Displays company goals and issues
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function CompanyGoalsIssues({ entity, profileData }) {
  const goals = profileData?.goals || [];
  const issues = profileData?.issues || [];

  if (goals.length === 0 && issues.length === 0) {
    return (
      <SectionWrapper label="Goals & Issues">
        <EmptyState message="No goals or issues linked to this company" />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper label="Goals & Issues">
      <div className="space-y-4">
        {goals.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Goals ({goals.length})</div>
            <div className="space-y-2">
              {goals.map((goal, i) => (
                <div key={i} className="text-sm p-2 bg-green-50 rounded">
                  {goal.label || goal.id}
                </div>
              ))}
            </div>
          </div>
        )}
        {issues.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Issues ({issues.length})</div>
            <div className="space-y-2">
              {issues.map((issue, i) => (
                <div key={i} className="text-sm p-2 bg-red-50 rounded">
                  {issue.label || issue.id}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
