import { useState, useEffect } from 'react';
import EventLog from './EventLog';

/**
 * UI-1 Entity Inspection View
 * 
 * Doctrine compliance:
 * - Inspect only, never suggests decisions
 * - Collapsed by default (progressive disclosure)
 * - Raw data only, no derived fields (scores, ranks, confidence)
 * - Close returns to unchanged UI-0
 */
export default function EntityInspect({ entityRef, onClose }) {
  const [showEvents, setShowEvents] = useState(false);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Fetch events when toggled
  useEffect(() => {
    if (showEvents && events.length === 0) {
      setLoadingEvents(true);
      fetch('/api/events')
        .then(res => res.json())
        .then(data => {
          setEvents(data.events || []);
        })
        .catch(() => {
          setEvents([]);
        })
        .finally(() => {
          setLoadingEvents(false);
        });
    }
  }, [showEvents]);

  if (!entityRef) return null;

  // UI-1: Event log overlay
  if (showEvents) {
    return (
      <EventLog 
        events={events} 
        onClose={() => setShowEvents(false)} 
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="mb-8 text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back
        </button>

        {/* Entity header */}
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-1">{entityRef.type}</div>
          <h1 className="text-2xl font-normal text-gray-900">{entityRef.name}</h1>
        </div>

        {/* Raw entity data */}
        <dl className="space-y-4 mb-8">
          <div>
            <dt className="text-sm text-gray-500">ID</dt>
            <dd className="font-mono text-gray-800">{entityRef.id}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Type</dt>
            <dd className="text-gray-800">{entityRef.type}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Name</dt>
            <dd className="text-gray-800">{entityRef.name}</dd>
          </div>
        </dl>

        {/* Event log link - progressive disclosure */}
        <button
          onClick={() => setShowEvents(true)}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {loadingEvents ? '...' : 'View event log →'}
        </button>
      </div>
    </div>
  );
}
