/**
 * Identity Header Component [A]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Purpose: Orientation - "What am I looking at?"
 * - Must include: primary name, type badge, one-line descriptor, stable ID
 * - Must NOT include: rankings, lists, charts, multi-metric panels
 * - No edit affordance, no dropdowns
 */

import { getEntityTypeLabel } from '../../lib/entities/entityTypes';

/**
 * @param {Object} props
 * @param {string} props.type - Entity type
 * @param {string} props.name - Primary entity name
 * @param {string} props.id - Stable entity ID
 * @param {string} [props.descriptor] - One-line descriptor (stage, role, status)
 */
export default function IdentityHeader({ type, name, id, descriptor }) {
  const typeLabel = getEntityTypeLabel(type);
  
  return (
    <header className="mb-8">
      {/* Type badge */}
      <div className="mb-2">
        <span className="inline-block px-2 py-0.5 text-xs font-medium text-bb-lime bg-bb-card border border-bb-border rounded font-mono uppercase tracking-wider">
          {typeLabel}
        </span>
      </div>
      
      {/* Primary name - largest text, no interaction */}
      <h1 className="text-2xl font-display text-bb-text mb-1">
        {name || 'Unnamed'}
      </h1>
      
      {/* One-line descriptor */}
      {descriptor ? (
        <p className="text-bb-text-secondary">{descriptor}</p>
      ) : (
        <p className="text-bb-text-muted">Not available</p>
      )}
      
      {/* Stable ID - subtle, for power users */}
      <div className="mt-2 font-mono text-xs text-bb-text-muted">
        {id}
      </div>
    </header>
  );
}
