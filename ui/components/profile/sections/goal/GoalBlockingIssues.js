/**
 * Goal Blocking Issues Section [C3]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include: linked Issues (links), dependency depth indicator (derived if defined)
 * - Read-only display
 * - No invented heuristics
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';
import { ENTITY_TYPES } from '../../../../lib/entities/entityTypes';

function IssueRow({ issue }) {
  // Semantic color for severity
  const severityStyles = {
    high: 'border-l-red-400',
    critical: 'border-l-red-600',
    medium: 'border-l-amber-400',
    low: 'border-l-gray-300',
  };
  
  const borderStyle = severityStyles[issue.severity] || 'border-l-gray-200';
  
  return (
    <div className={`py-2 pl-3 border-l-2 ${borderStyle} mb-2 last:mb-0`}>
      <div className="flex items-start justify-between">
        <EntityLink
          type={ENTITY_TYPES.ISSUE}
          id={issue.id}
          name={issue.name || issue.title || issue.id}
          className="text-sm font-medium"
        />
        {issue.severity && (
          <span className="text-xs text-bb-text-muted uppercase tracking-wide ml-2">
            {issue.severity}
          </span>
        )}
      </div>
      {issue.description && (
        <p className="text-xs text-bb-text-muted mt-1 line-clamp-2">
          {issue.description}
        </p>
      )}
      {issue.dependencyDepth !== undefined && (
        <p className="text-xs text-bb-text-muted mt-1">
          Dependency depth: {issue.dependencyDepth}
        </p>
      )}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.data - Goal data with blocking issues
 */
export default function GoalBlockingIssues({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Blocking Issues">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const { 
    blockingIssues, 
    issues, 
    linkedIssues,
    dependencyDepth 
  } = data;
  
  // Normalize issues from various possible data shapes
  const allIssues = blockingIssues || issues || linkedIssues || [];
  
  if (allIssues.length === 0) {
    return (
      <SectionWrapper title="Blocking Issues">
        <EmptyState message="No blocking issues" />
      </SectionWrapper>
    );
  }
  
  return (
    <SectionWrapper title="Blocking Issues">
      {/* Dependency depth indicator if available at goal level */}
      {dependencyDepth !== undefined && (
        <div className="mb-3 py-1 px-2 bg-bb-panel rounded text-xs text-bb-text-secondary">
          Total dependency depth: {dependencyDepth}
        </div>
      )}
      
      {/* Issue list */}
      <div>
        {allIssues.map((issue, index) => (
          <IssueRow 
            key={issue.id || index} 
            issue={issue} 
          />
        ))}
      </div>
      
      {/* Count summary */}
      <div className="mt-3 text-xs text-bb-text-muted">
        {allIssues.length} blocking issue{allIssues.length !== 1 ? 's' : ''}
      </div>
    </SectionWrapper>
  );
}
