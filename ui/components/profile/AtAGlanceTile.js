/**
 * At-a-Glance Tile Component
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Compact, single purpose
 * - Derived at runtime (never stored)
 * - No pseudo-precision (no 73.42/100 style)
 * - Semantic color only (state/risk/urgency)
 */

import EntityLink from '../links/EntityLink';

/**
 * Allowed tile types per contract:
 * 1. Health (ONLY if entity has internal state per doctrine)
 * 2. Top Issue (if any)
 * 3. Time Since Last Meaningful Event
 * 4. Exposure / Importance Indicator
 * 5. Blocking / Blocked Status
 */

const STATE_COLORS = {
  good: 'text-green-700 bg-green-50',
  warning: 'text-amber-700 bg-amber-50',
  critical: 'text-red-700 bg-red-50',
  neutral: 'text-gray-700 bg-gray-50',
};

/**
 * @param {Object} props
 * @param {string} props.label - Tile label
 * @param {string} props.value - Display value (human readable)
 * @param {'good'|'warning'|'critical'|'neutral'} [props.state] - Semantic state
 * @param {{ type: string, id: string, name: string }} [props.linkedEntity] - Optional linked entity
 */
export default function AtAGlanceTile({ label, value, state = 'neutral', linkedEntity }) {
  const colorClass = STATE_COLORS[state] || STATE_COLORS.neutral;
  
  return (
    <div className={`px-3 py-2 rounded ${colorClass}`}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      {linkedEntity ? (
        <EntityLink
          type={linkedEntity.type}
          id={linkedEntity.id}
          name={value}
          className="text-sm font-medium"
        />
      ) : (
        <div className="text-sm font-medium">{value}</div>
      )}
    </div>
  );
}
