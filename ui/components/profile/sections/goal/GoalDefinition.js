/**
 * Goal Definition Section [C1]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include: explicit objective statement, owner (Company and/or Person link)
 * - Read-only display
 * - No invented content
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

/**
 * @param {Object} props
 * @param {Object} props.data - Goal data from API
 */
export default function GoalDefinition({ data }) {
  if (!data) {
    return (
      <SectionWrapper label="Goal Definition">
        <EmptyState message="No goal data available" />
      </SectionWrapper>
    );
  }
  
  const { name, goalType, status, due, company, current, target } = data;
  
  return (
    <SectionWrapper label="Goal Definition">
      {/* Goal name/objective */}
      <div className="mb-4">
        <p className="text-sm text-bb-text font-medium">{name || 'Unnamed goal'}</p>
      </div>
      
      {/* Metadata */}
      <dl className="text-sm space-y-1">
        {/* Goal type */}
        {goalType && (
          <div className="flex py-1">
            <dt className="w-28 text-bb-text-muted flex-shrink-0">Type</dt>
            <dd className="text-bb-text capitalize">{goalType}</dd>
          </div>
        )}
        
        {/* Company */}
        {company && (
          <div className="flex py-1">
            <dt className="w-28 text-bb-text-muted flex-shrink-0">Company</dt>
            <dd className="text-bb-text">
              <EntityLink type="company" id={company.id} className="text-bb-blue hover:underline">
                {company.name}
              </EntityLink>
            </dd>
          </div>
        )}
        
        {/* Progress */}
        {current !== undefined && target !== undefined && (
          <div className="flex py-1">
            <dt className="w-28 text-bb-text-muted flex-shrink-0">Progress</dt>
            <dd className="text-bb-text">
              {typeof current === 'number' && current > 1000 
                ? `$${(current/1000000).toFixed(2)}M` 
                : current} / {typeof target === 'number' && target > 1000 
                ? `$${(target/1000000).toFixed(2)}M` 
                : target}
              <span className="ml-2 text-bb-text-muted">
                ({Math.round((current / target) * 100)}%)
              </span>
            </dd>
          </div>
        )}
        
        {/* Due date */}
        {due && (
          <div className="flex py-1">
            <dt className="w-28 text-bb-text-muted flex-shrink-0">Due</dt>
            <dd className="text-bb-text">
              {new Date(due).toLocaleDateString()}
            </dd>
          </div>
        )}
        
        {/* Status */}
        {status && (
          <div className="flex py-1">
            <dt className="w-28 text-bb-text-muted flex-shrink-0">Status</dt>
            <dd>
              <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                status === 'active' ? 'bg-bb-blue/20 text-bb-blue' :
                status === 'completed' ? 'bg-bb-green/20 text-bb-green' :
                'bg-bb-card text-bb-text-secondary'
              }`}>
                {status}
              </span>
            </dd>
          </div>
        )}
      </dl>
    </SectionWrapper>
  );
}
