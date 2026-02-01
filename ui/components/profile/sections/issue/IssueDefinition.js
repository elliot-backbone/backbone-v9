/**
 * Issue Definition Section [C1]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include: problem statement, scope, severity (if modeled)
 * - Read-only display
 * - No invented content
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

/**
 * @param {Object} props
 * @param {Object} props.data - Issue data
 */
export default function IssueDefinition({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Issue Definition">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const { 
    problem, 
    problemStatement, 
    description, 
    scope, 
    severity,
    category,
    status
  } = data;
  
  // Problem statement is the primary content
  const statementText = problem || problemStatement || description;
  
  // Semantic color for severity
  const severityStyles = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-red-50 text-red-700 border-red-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    low: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  
  const severityStyle = severityStyles[severity] || 'bg-gray-50 text-gray-600 border-gray-200';
  
  return (
    <SectionWrapper title="Issue Definition">
      {/* Problem statement */}
      <div className="mb-4">
        {statementText ? (
          <p className="text-sm text-gray-800">{statementText}</p>
        ) : (
          <p className="text-sm text-gray-400">No problem statement</p>
        )}
      </div>
      
      {/* Severity badge if available */}
      {severity && (
        <div className="mb-4">
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${severityStyle}`}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)} Severity
          </span>
        </div>
      )}
      
      {/* Metadata */}
      <dl className="text-sm">
        {scope && (
          <div className="flex py-1">
            <dt className="w-24 text-gray-500 flex-shrink-0">Scope</dt>
            <dd className="text-gray-800">{scope}</dd>
          </div>
        )}
        
        {category && (
          <div className="flex py-1">
            <dt className="w-24 text-gray-500 flex-shrink-0">Category</dt>
            <dd className="text-gray-800">{category}</dd>
          </div>
        )}
        
        {status && (
          <div className="flex py-1">
            <dt className="w-24 text-gray-500 flex-shrink-0">Status</dt>
            <dd className="text-gray-800">{status}</dd>
          </div>
        )}
      </dl>
    </SectionWrapper>
  );
}
