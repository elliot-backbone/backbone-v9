/**
 * Issue Candidate Actions Section [C3]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include: ranked candidate Action list scoped to this Issue (links)
 * - Hard constraint: this list must never be presented as a global alternative to Next Action
 * - Must be explicitly contextual: "Actions that address this Issue"
 * - Read-only display
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';
import { ENTITY_TYPES } from '../../../../lib/entities/entityTypes';

function ActionRow({ action, rank }) {
  // Lifecycle badge styles (semantic color only)
  const lifecycleStyles = {
    proposed: 'bg-blue-50 text-bb-blue',
    pending: 'bg-amber-50 text-bb-amber',
    executed: 'bg-green-50 text-bb-green',
    observed: 'bg-bb-card text-bb-text-secondary',
    deferred: 'bg-bb-panel text-bb-text-muted',
  };
  
  const lifecycle = action.lifecycle || action.status || 'proposed';
  const badgeStyle = lifecycleStyles[lifecycle] || lifecycleStyles.proposed;
  
  return (
    <div className="py-2 border-b border-bb-border last:border-0">
      <div className="flex items-start gap-3">
        {/* Rank indicator */}
        {rank !== undefined && (
          <span className="text-xs text-bb-text-muted w-4 flex-shrink-0 pt-0.5">
            {rank}.
          </span>
        )}
        
        <div className="flex-1 min-w-0">
          {/* Action label (verb-first) */}
          <div className="flex items-center gap-2">
            <EntityLink
              type={ENTITY_TYPES.ACTION}
              id={action.id}
              name={action.label || action.name || action.description}
              className="text-sm font-medium"
            />
            <span className={`text-xs px-1.5 py-0.5 rounded ${badgeStyle}`}>
              {lifecycle}
            </span>
          </div>
          
          {/* Brief rationale if available */}
          {action.rationale && (
            <p className="text-xs text-bb-text-muted mt-1 line-clamp-2">
              {action.rationale}
            </p>
          )}
          
          {/* Owner if available */}
          {action.owner && (
            <div className="text-xs text-bb-text-muted mt-1">
              Owner:{' '}
              <EntityLink
                type={ENTITY_TYPES.PERSON}
                id={action.owner.id}
                name={action.owner.name}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.data - Issue data with candidate actions
 */
export default function IssueCandidateActions({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Candidate Actions">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const { 
    candidateActions, 
    actions, 
    relatedActions,
    resolutions 
  } = data;
  
  // Normalize actions from various data shapes
  const allActions = candidateActions || actions || relatedActions || resolutions || [];
  
  if (allActions.length === 0) {
    return (
      <SectionWrapper title="Candidate Actions">
        <EmptyState message="No candidate actions for this issue" />
      </SectionWrapper>
    );
  }
  
  return (
    <SectionWrapper title="Candidate Actions">
      {/* Explicit contextual framing (per contract requirement) */}
      <p className="text-xs text-bb-text-muted mb-3">
        Actions that address this Issue
      </p>
      
      {/* Action list */}
      <div>
        {allActions.map((action, index) => (
          <ActionRow 
            key={action.id || index} 
            action={action}
            rank={index + 1}
          />
        ))}
      </div>
      
      {/* Count summary */}
      <div className="mt-3 text-xs text-bb-text-muted">
        {allActions.length} candidate action{allActions.length !== 1 ? 's' : ''}
      </div>
    </SectionWrapper>
  );
}
