/**
 * Related Actions Panel Component [D]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Purpose: tie profile pages back to the driving product surface
 * - Three subsections: Current, Executed, Deferred
 * - Each Action row: verb-first label, lifecycle badge, timestamp, link to Action profile
 * - Must NOT be a second global ranking surface
 * - Must NOT include alternative priority scoring panels
 */

import EntityLink from '../links/EntityLink';
import { ENTITY_TYPES } from '../../lib/entities/entityTypes';

const LIFECYCLE_BADGE_STYLES = {
  proposed: 'bg-blue-100 text-blue-700',
  executed: 'bg-green-100 text-green-700',
  observed: 'bg-teal-100 text-teal-700',
  deferred: 'bg-gray-100 text-gray-600',
  skipped: 'bg-gray-100 text-gray-500',
};

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ActionRow({ action }) {
  const lifecycleStyle = LIFECYCLE_BADGE_STYLES[action.lifecycle] || LIFECYCLE_BADGE_STYLES.proposed;
  
  return (
    <div className="py-2 flex items-center gap-3">
      {/* Lifecycle badge */}
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${lifecycleStyle}`}>
        {action.lifecycle || 'proposed'}
      </span>
      
      {/* Verb-first label as link to Action profile */}
      <EntityLink
        type={ENTITY_TYPES.ACTION}
        id={action.id}
        name={action.title || action.label || action.id}
        className="flex-1 text-sm"
      />
      
      {/* Timestamp */}
      {action.timestamp && (
        <span className="text-xs text-gray-400">
          {formatTimestamp(action.timestamp)}
        </span>
      )}
    </div>
  );
}

function ActionSubsection({ title, actions }) {
  if (!actions || actions.length === 0) {
    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
        <div className="text-sm text-gray-400 py-2">None</div>
      </div>
    );
  }
  
  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div>
        {actions.map((action) => (
          <ActionRow key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Array} [props.current] - Current/active actions
 * @param {Array} [props.executed] - Executed actions
 * @param {Array} [props.deferred] - Deferred actions
 */
export default function RelatedActionsPanel({ current = [], executed = [], deferred = [] }) {
  // Ordering: Current by most relevant/recent, Executed/Deferred by most recent first
  const sortedCurrent = [...current].sort((a, b) => {
    // If rankScore exists, use it; otherwise by timestamp desc
    if (a.rankScore !== undefined && b.rankScore !== undefined) {
      return b.rankScore - a.rankScore;
    }
    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
  });
  
  const sortedExecuted = [...executed].sort((a, b) => 
    new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );
  
  const sortedDeferred = [...deferred].sort((a, b) => 
    new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );
  
  const hasAny = current.length > 0 || executed.length > 0 || deferred.length > 0;
  
  return (
    <section className="mt-8 pt-8 border-t border-gray-200">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Related Actions</h2>
      
      {!hasAny ? (
        <div className="text-sm text-gray-400 py-2">
          No current Action linked to this entity.
        </div>
      ) : (
        <>
          <ActionSubsection title="Current" actions={sortedCurrent} />
          <ActionSubsection title="Executed" actions={sortedExecuted} />
          <ActionSubsection title="Deferred" actions={sortedDeferred} />
        </>
      )}
    </section>
  );
}
