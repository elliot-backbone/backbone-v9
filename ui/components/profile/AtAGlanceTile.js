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
  good: 'text-bb-green bg-bb-card border border-bb-green/30',
  warning: 'text-bb-amber bg-bb-card border border-bb-amber/30',
  critical: 'text-bb-red bg-bb-card border border-bb-red/30',
  neutral: 'text-bb-text bg-bb-card border border-bb-border',
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
      <div className="text-xs text-bb-text-muted mb-0.5 font-mono uppercase tracking-wider">{label}</div>
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
