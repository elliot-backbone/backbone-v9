/**
 * Event / History Log Component [E]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Purpose: immutable record - "what happened and when"
 * - Append-only (no editing, no deleting, no reordering by user)
 * - Filter toggles allowed, must default to "All"
 * - Empty state: explicit "No events recorded"
 */

import { useState } from 'react';
import EventRow from './EventRow';

/**
 * @param {Object} props
 * @param {Array<{ id: string, timestamp: string, type: string, description?: string, relatedEntities?: Array }>} props.events
 */
export default function EventLog({ events = [] }) {
  const [filter, setFilter] = useState('all');
  
  // Get unique event types for filter
  const eventTypes = [...new Set(events.map(e => e.type).filter(Boolean))];
  
  // Filter events
  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);
  
  return (
    <section className="mt-8 pt-8 border-t border-bb-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display text-bb-text">Event Log</h2>
        
        {/* Filter toggle - defaults to All */}
        {eventTypes.length > 1 && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm text-bb-text-secondary bg-bb-card border border-bb-border rounded px-2 py-1 focus:outline-none focus:border-bb-accent font-mono"
          >
            <option value="all">All</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}
      </div>
      
      {/* Events list or empty state */}
      {filteredEvents.length === 0 ? (
        <div className="py-4 text-sm text-bb-text-muted font-mono">
          No events recorded.
        </div>
      ) : (
        <div>
          {filteredEvents.map((event) => (
            <EventRow
              key={event.id || `${event.timestamp}-${event.type}`}
              timestamp={event.timestamp}
              type={event.type}
              description={event.description}
              relatedEntities={event.relatedEntities}
            />
          ))}
        </div>
      )}
    </section>
  );
}
