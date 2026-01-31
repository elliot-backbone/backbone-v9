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
  const [entityData, setEntityData] = useState(null);
  const [loadingEntity, setLoadingEntity] = useState(true);

  // Fetch full entity data
  useEffect(() => {
    if (entityRef?.id) {
      setLoadingEntity(true);
      fetch(`/api/entity/${entityRef.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          setEntityData(data);
        })
        .catch(() => {
          setEntityData(null);
        })
        .finally(() => {
          setLoadingEntity(false);
        });
    }
  }, [entityRef?.id]);

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

  const entity = entityData || entityRef;

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
          <div className="text-sm text-gray-500 mb-1">{entity.type}</div>
          <h1 className="text-2xl font-normal text-gray-900">{entity.name || entityRef.name}</h1>
          {entity.tagline && (
            <p className="text-gray-600 mt-2">{entity.tagline}</p>
          )}
        </div>

        {/* Loading state */}
        {loadingEntity && (
          <div className="mb-8 text-gray-400">...</div>
        )}

        {/* Raw entity data */}
        {!loadingEntity && entityData && (
          <dl className="space-y-4 mb-8">
            {entity.type === 'company' && (
              <>
                {entity.stage && (
                  <div>
                    <dt className="text-sm text-gray-500">Stage</dt>
                    <dd className="text-gray-800">{entity.stage}</dd>
                  </div>
                )}
                {entity.sector && (
                  <div>
                    <dt className="text-sm text-gray-500">Sector</dt>
                    <dd className="text-gray-800">{entity.sector}</dd>
                  </div>
                )}
                {entity.hq && (
                  <div>
                    <dt className="text-sm text-gray-500">HQ</dt>
                    <dd className="text-gray-800">{entity.hq}</dd>
                  </div>
                )}
                {entity.employees && (
                  <div>
                    <dt className="text-sm text-gray-500">Employees</dt>
                    <dd className="text-gray-800">{entity.employees}</dd>
                  </div>
                )}
                {entity.raising !== undefined && (
                  <div>
                    <dt className="text-sm text-gray-500">Raising</dt>
                    <dd className="text-gray-800">{entity.raising ? 'Yes' : 'No'}</dd>
                  </div>
                )}
                {entity.founders && entity.founders.length > 0 && (
                  <div>
                    <dt className="text-sm text-gray-500 mb-2">Founders</dt>
                    <dd className="space-y-1">
                      {entity.founders.map((f, i) => (
                        <div key={i} className="text-gray-800">
                          {f.name} <span className="text-gray-500">({f.role})</span>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
              </>
            )}
            {entity.type === 'deal' && (
              <>
                {entity.investor && (
                  <div>
                    <dt className="text-sm text-gray-500">Investor</dt>
                    <dd className="text-gray-800">{entity.investor}</dd>
                  </div>
                )}
                {entity.status && (
                  <div>
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd className="text-gray-800">{entity.status}</dd>
                  </div>
                )}
                {entity.amount && (
                  <div>
                    <dt className="text-sm text-gray-500">Amount</dt>
                    <dd className="text-gray-800">${(entity.amount / 1000000).toFixed(1)}M</dd>
                  </div>
                )}
                {entity.companyName && (
                  <div>
                    <dt className="text-sm text-gray-500">Company</dt>
                    <dd className="text-gray-800">{entity.companyName}</dd>
                  </div>
                )}
              </>
            )}
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="font-mono text-gray-600 text-sm">{entity.id}</dd>
            </div>
            {entity.asOf && (
              <div>
                <dt className="text-sm text-gray-500">As of</dt>
                <dd className="text-gray-600 text-sm">{entity.asOf}</dd>
              </div>
            )}
          </dl>
        )}

        {/* Fallback if no entity data loaded */}
        {!loadingEntity && !entityData && (
          <dl className="space-y-4 mb-8">
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="font-mono text-gray-800">{entityRef.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Type</dt>
              <dd className="text-gray-800">{entityRef.type}</dd>
            </div>
          </dl>
        )}

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
