/**
 * EntityLink Component
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Graph-native navigation: every related entity name is a link
 * - Single component for all entity references
 * - No ad-hoc <Link> scattered across files
 * - Consistent styling across all profile pages
 */

import Link from 'next/link';
import { routeForEntity } from '../../lib/entities/routeForEntity';
import { getEntityTypeLabel } from '../../lib/entities/entityTypes';

/**
 * Renders a clickable link to an entity profile
 * 
 * @param {Object} props
 * @param {string} props.type - Entity type
 * @param {string} props.id - Entity ID
 * @param {string} [props.name] - Display name (defaults to id)
 * @param {React.ReactNode} [props.children] - Alternative to name prop
 * @param {boolean} [props.showType] - Show entity type badge
 * @param {string} [props.className] - Additional CSS classes
 */
export default function EntityLink({ type, id, name, children, showType = false, className = '' }) {
  const route = routeForEntity(type, id);
  const displayName = children || name || id;
  
  // If we can't generate a route, render as plain text
  if (!route) {
    return (
      <span className={`text-bb-text-secondary ${className}`}>
        {displayName}
        {showType && (
          <span className="ml-1 text-xs text-bb-text-muted">
            ({getEntityTypeLabel(type)})
          </span>
        )}
      </span>
    );
  }
  
  return (
    <Link 
      href={route}
      className={`text-bb-lime hover:text-bb-text transition-colors ${className}`}
    >
      {displayName}
      {showType && (
        <span className="ml-1 text-xs text-bb-text-muted">
          ({getEntityTypeLabel(type)})
        </span>
      )}
    </Link>
  );
}

/**
 * Renders entity link from an entity reference object
 */
export function EntityLinkFromRef({ entityRef, showType = false, className = '' }) {
  if (!entityRef) return null;
  
  return (
    <EntityLink
      type={entityRef.type}
      id={entityRef.id}
      name={entityRef.name}
      showType={showType}
      className={className}
    />
  );
}
