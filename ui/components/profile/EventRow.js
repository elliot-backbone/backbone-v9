/**
 * Event Row Component
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Each event row: timestamp, event type badge, short description, related entity links
 * - Read-only, no editing, no deleting
 * - Append-only semantics
 */

import { EntityLinkFromRef } from '../links/EntityLink';

const EVENT_TYPE_STYLES = {
  created: 'bg-bb-blue/20 text-bb-blue border border-bb-blue/30',
  status_change: 'bg-bb-purple/20 text-bb-purple border border-bb-purple/30',
  executed: 'bg-bb-green/20 text-bb-green border border-bb-green/30',
  observed: 'bg-bb-accent/20 text-bb-accent border border-bb-accent/30',
  skipped: 'bg-bb-card text-bb-text-muted border border-bb-border',
  default: 'bg-bb-card text-bb-text-secondary border border-bb-border',
};

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEventTypeStyle(type) {
  const normalized = type?.toLowerCase().replace(/[^a-z_]/g, '_');
  return EVENT_TYPE_STYLES[normalized] || EVENT_TYPE_STYLES.default;
}

/**
 * @param {Object} props
 * @param {string} props.timestamp
 * @param {string} props.type - Event type
 * @param {string} [props.description] - Short description
 * @param {Array<{ type: string, id: string, name: string }>} [props.relatedEntities]
 */
export default function EventRow({ timestamp, type, description, relatedEntities = [] }) {
  const typeStyle = getEventTypeStyle(type);
  
  return (
    <div className="py-3 border-b border-bb-border last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Timestamp */}
        <div className="text-xs text-bb-text-muted font-mono w-36 flex-shrink-0">
          {formatTimestamp(timestamp)}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Event type badge */}
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${typeStyle}`}>
            {type || 'Event'}
          </span>
          
          {/* Description */}
          {description && (
            <p className="mt-1 text-sm text-bb-text-secondary">{description}</p>
          )}
          
          {/* Related entity links */}
          {relatedEntities.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {relatedEntities.map((entity, index) => (
                <EntityLinkFromRef
                  key={entity.id || index}
                  entityRef={entity}
                  showType
                  className="text-xs"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
