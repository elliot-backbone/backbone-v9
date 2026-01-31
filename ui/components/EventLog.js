/**
 * UI-1 Event Log View
 * 
 * Doctrine compliance:
 * - Inspect only, never suggests decisions
 * - Raw timestamps and event types only
 * - No analysis, no patterns, no recommendations
 * - Close returns to unchanged UI-0
 */
export default function EventLog({ events, onClose }) {
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

        {/* Header */}
        <h1 className="text-2xl font-normal text-gray-900 mb-8">Event Log</h1>

        {/* Events list - raw data only */}
        {(!events || events.length === 0) ? (
          <div className="text-gray-400">—</div>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="border-b border-gray-100 pb-4">
                <div className="font-mono text-sm text-gray-500">
                  {event.timestamp}
                </div>
                <div className="text-gray-800">
                  {event.type}
                </div>
                {event.actionId && (
                  <div className="font-mono text-xs text-gray-400 mt-1">
                    {event.actionId}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
