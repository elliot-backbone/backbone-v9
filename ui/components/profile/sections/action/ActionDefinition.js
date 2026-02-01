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
    proposed: 'bg-blue-100 text-blue-800 border-blue-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    executing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    executed: 'bg-green-100 text-green-800 border-green-200',
    observed: 'bg-gray-100 text-gray-700 border-gray-200',
    deferred: 'bg-gray-50 text-gray-500 border-gray-200',
    blocked: 'bg-red-100 text-red-800 border-red-200',
  };
  
  const lifecycleStyle = lifecycleStyles[lifecycleState] || lifecycleStyles.proposed;
  
  // Time sensitivity styles
  const timeSensitivityStyles = {
    critical: 'bg-red-50 text-red-700',
    high: 'bg-amber-50 text-amber-700',
    medium: 'bg-yellow-50 text-yellow-700',
    low: 'bg-gray-50 text-gray-600',
  };
  
  const timeStyle = timeSensitivityStyles[timeSensitivity] || null;
  
  return (
    <SectionWrapper title="Action Definition">
      {/* Verb-first description (primary) */}
      <div className="mb-4">
        {actionLabel ? (
          <p className="text-base text-gray-900 font-medium">{actionLabel}</p>
        ) : (
          <p className="text-sm text-gray-400">No action description</p>
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
          <dt className="w-28 text-gray-500 flex-shrink-0">Owner</dt>
          <dd className="text-gray-800">
            {owner ? (
              <EntityLink
                type={ENTITY_TYPES.PERSON}
                id={owner.id}
                name={owner.name}
              />
            ) : (
              <span className="text-gray-400">Not assigned</span>
            )}
          </dd>
        </div>
        
        {/* Deadline / Due date if available */}
        {(deadline || dueDate) && (
          <div className="flex py-1">
            <dt className="w-28 text-gray-500 flex-shrink-0">Due</dt>
            <dd className="text-gray-800">
              {new Date(deadline || dueDate).toLocaleDateString()}
            </dd>
          </div>
        )}
        
        {/* Priority if available and different from time sensitivity */}
        {priority && priority !== timeSensitivity && (
          <div className="flex py-1">
            <dt className="w-28 text-gray-500 flex-shrink-0">Priority</dt>
            <dd className="text-gray-800">{priority}</dd>
          </div>
        )}
      </dl>
    </SectionWrapper>
  );
}
