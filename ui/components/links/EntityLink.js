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
 * @param {boolean} [props.showType] - Show entity type badge
 * @param {string} [props.className] - Additional CSS classes
 */
export default function EntityLink({ type, id, name, showType = false, className = '' }) {
  const route = routeForEntity(type, id);
  const displayName = name || id;
  
  // If we can't generate a route, render as plain text
  if (!route) {
    return (
      <span className={`text-gray-600 ${className}`}>
        {displayName}
        {showType && (
          <span className="ml-1 text-xs text-gray-400">
            ({getEntityTypeLabel(type)})
          </span>
        )}
      </span>
    );
  }
  
  return (
    <Link 
      href={route}
      className={`text-gray-900 hover:text-gray-600 transition-colors underline-offset-2 hover:underline ${className}`}
    >
      {displayName}
      {showType && (
        <span className="ml-1 text-xs text-gray-400 no-underline">
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
