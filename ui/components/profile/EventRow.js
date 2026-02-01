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
  created: 'bg-blue-100 text-blue-700',
  status_change: 'bg-purple-100 text-purple-700',
  executed: 'bg-green-100 text-green-700',
  observed: 'bg-teal-100 text-teal-700',
  skipped: 'bg-gray-100 text-gray-700',
  default: 'bg-gray-100 text-gray-600',
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
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Timestamp */}
        <div className="text-xs text-gray-400 font-mono w-36 flex-shrink-0">
          {formatTimestamp(timestamp)}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Event type badge */}
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${typeStyle}`}>
            {type || 'Event'}
          </span>
          
          {/* Description */}
          {description && (
            <p className="mt-1 text-sm text-gray-700">{description}</p>
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
