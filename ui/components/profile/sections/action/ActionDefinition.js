/**
 * Action Definition Section [C1]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include: verb-first description, explicit owner (Person link), time sensitivity (if defined), lifecycle state badge
 * - Action is first-class; its profile page is the deepest and most explicit
 * - Read-only display
 * - No invented content
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';
import { ENTITY_TYPES } from '../../../../lib/entities/entityTypes';

/**
 * @param {Object} props
 * @param {Object} props.data - Action data
 */
export default function ActionDefinition({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Action Definition">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const { 
    label,
    name,
    description,
    owner,
    timeSensitivity,
    deadline,
    dueDate,
    lifecycle,
    status,
    priority
  } = data;
  
  // Verb-first description is the primary content
  const actionLabel = label || name || description;
  
  // Lifecycle state
  const lifecycleState = lifecycle || status || 'proposed';
  
  // Lifecycle badge styles (semantic color only per contract)
  const lifecycleStyles = {
    proposed: 'bg-bb-blue/20 text-blue-800 border-blue-200',
    pending: 'bg-bb-amber/20 text-amber-800 border-amber-200',
    executing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    executed: 'bg-bb-green/20 text-green-800 border-green-200',
    observed: 'bg-bb-card text-bb-text-secondary border-bb-border',
    deferred: 'bg-bb-panel text-bb-text-muted border-bb-border',
    blocked: 'bg-bb-red/20 text-red-800 border-red-200',
  };
  
  const lifecycleStyle = lifecycleStyles[lifecycleState] || lifecycleStyles.proposed;
  
  // Time sensitivity styles
  const timeSensitivityStyles = {
    critical: 'bg-red-50 text-bb-red',
    high: 'bg-amber-50 text-bb-amber',
    medium: 'bg-yellow-50 text-yellow-700',
    low: 'bg-bb-panel text-bb-text-secondary',
  };
  
  const timeStyle = timeSensitivityStyles[timeSensitivity] || null;
  
  return (
    <SectionWrapper title="Action Definition">
      {/* Verb-first description (primary) */}
      <div className="mb-4">
        {actionLabel ? (
          <p className="text-base text-bb-text font-medium">{actionLabel}</p>
        ) : (
          <p className="text-sm text-bb-text-muted">No action description</p>
        )}
      </div>
      
      {/* Lifecycle state badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${lifecycleStyle}`}>
          {lifecycleState.charAt(0).toUpperCase() + lifecycleState.slice(1)}
        </span>
        
        {/* Time sensitivity badge if defined */}
        {timeSensitivity && timeStyle && (
          <span className={`inline-block px-2 py-1 text-xs rounded ${timeStyle}`}>
            {timeSensitivity} urgency
          </span>
        )}
      </div>
      
      {/* Metadata */}
      <dl className="text-sm">
        {/* Owner (Person link) */}
        <div className="flex py-1">
          <dt className="w-28 text-bb-text-muted flex-shrink-0">Owner</dt>
          <dd className="text-bb-text">
            {owner ? (
              <EntityLink
                type={ENTITY_TYPES.PERSON}
                id={owner.id}
                name={owner.name}
              />
            ) : (
              <span className="text-bb-text-muted">Not assigned</span>
            )}
          </dd>
        </div>
        
        {/* Deadline / Due date if available */}
        {(deadline || dueDate) && (
          <div className="flex py-1">
            <dt className="w-28 text-bb-text-muted flex-shrink-0">Due</dt>
            <dd className="text-bb-text">
              {new Date(deadline || dueDate).toLocaleDateString()}
            </dd>
          </div>
        )}
        
        {/* Priority if available and different from time sensitivity */}
        {priority && priority !== timeSensitivity && (
          <div className="flex py-1">
            <dt className="w-28 text-bb-text-muted flex-shrink-0">Priority</dt>
            <dd className="text-bb-text">{priority}</dd>
          </div>
        )}
      </dl>
    </SectionWrapper>
  );
}
