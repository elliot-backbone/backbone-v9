/**
 * Dynamic Entity Profile Page
 * Route: /entities/[type]/[id]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Single dynamic route for all entity types (preferred approach)
 * - Loads entity data then renders ProfileLayout + entity sections
 * - Graph-native navigation via EntityLink
 * - No second navigation paradigm
 */

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import ProfileLayout from '../../../components/profile/ProfileLayout';
import { getSectionsForEntityType } from '../../../components/profile/sections/registry';
import { isValidEntityType, getEntityTypeLabel } from '../../../lib/entities/entityTypes';

/**
 * Fetch entity data from API
 */
async function fetchEntity(type, id) {
  // Try the entity API endpoint
  const res = await fetch(`/api/entity/${encodeURIComponent(id)}?type=${encodeURIComponent(type)}`);
  
  if (!res.ok) {
    // Return minimal structure if not found
    return null;
  }
  
  return res.json();
}

/**
 * Fetch related actions for an entity
 */
async function fetchRelatedActions(type, id) {
  try {
    const res = await fetch(`/api/actions/today`);
    if (!res.ok) return { current: [], executed: [], deferred: [] };
    
    const data = await res.json();
    const actions = data.actions || [];
    
    // Filter actions related to this entity
    const related = actions.filter(a => {
      // Check if action references this entity
      if (a.entityId === id || a.companyId === id) return true;
      if (a.targetId === id || a.subjectId === id) return true;
      // Check linked entities
      if (a.linkedEntities?.some(e => e.id === id)) return true;
      return false;
    });
    
    // Categorize by lifecycle
    const current = related.filter(a => 
      !a.executed && !a.deferred && a.lifecycle !== 'executed' && a.lifecycle !== 'deferred'
    );
    const executed = related.filter(a => 
      a.executed || a.lifecycle === 'executed' || a.lifecycle === 'observed'
    );
    const deferred = related.filter(a => 
      a.deferred || a.lifecycle === 'deferred'
    );
    
    return { current, executed, deferred };
  } catch (e) {
    return { current: [], executed: [], deferred: [] };
  }
}

/**
 * Fetch events for an entity
 */
async function fetchEvents(type, id) {
  try {
    const res = await fetch(`/api/events?entityId=${encodeURIComponent(id)}`);
    if (!res.ok) return [];
    
    const data = await res.json();
    return data.events || [];
  } catch (e) {
    return [];
  }
}

/**
 * Build at-a-glance tiles for an entity
 * Contract: Maximum 5 tiles, derived at runtime, decision-relevant only
 */
function buildTilesForEntity(type, data) {
  if (!data) return [];
  
  const tiles = [];
  
  // Health tile (if entity has internal state per doctrine)
  if (data.health !== undefined) {
    tiles.push({
      label: 'Health',
      value: data.health,
      type: 'health',
    });
  }
  
  // Runway for companies (derived at runtime)
  if (type === 'company' && data.cash && data.burn) {
    const runwayMonths = Math.round(data.cash / data.burn);
    tiles.push({
      label: 'Runway',
      value: `${runwayMonths} mo`,
      type: runwayMonths < 6 ? 'warning' : 'neutral',
    });
  }
  
  // Top issue tile
  if (data.topIssue) {
    tiles.push({
      label: 'Top Issue',
      value: data.topIssue.name || data.topIssue.title,
      link: { type: 'issue', id: data.topIssue.id },
      type: 'issue',
    });
  }
  
  // Time since last meaningful event
  if (data.lastEventAt || data.asOf) {
    const lastDate = new Date(data.lastEventAt || data.asOf);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    tiles.push({
      label: 'Last Activity',
      value: daysSince === 0 ? 'Today' : `${daysSince}d ago`,
      type: daysSince > 30 ? 'warning' : 'neutral',
    });
  }
  
  // Status/stage for deals and rounds
  if ((type === 'deal' || type === 'round') && data.status) {
    tiles.push({
      label: 'Status',
      value: data.status,
      type: 'status',
    });
  }
  
  // Lifecycle for actions
  if (type === 'action' && (data.lifecycle || data.status)) {
    tiles.push({
      label: 'Lifecycle',
      value: data.lifecycle || data.status,
      type: 'lifecycle',
    });
  }
  
  // Limit to 5 tiles per contract
  return tiles.slice(0, 5);
}

/**
 * Get descriptor text for identity header
 */
function getDescriptor(type, data) {
  if (!data) return null;
  
  switch (type) {
    case 'company':
      return [data.stage, data.sector, data.hq].filter(Boolean).join(' · ');
    case 'person':
      return data.role || data.title || data.affiliation;
    case 'firm':
      return data.investorType || data.type || data.thesis;
    case 'deal':
      return [data.status, data.companyName].filter(Boolean).join(' · ');
    case 'round':
      return [data.type || data.roundType, data.status].filter(Boolean).join(' · ');
    case 'goal':
      return data.status || data.type;
    case 'issue':
      return [data.severity, data.scope].filter(Boolean).join(' · ');
    case 'action':
      return data.lifecycle || data.status || 'Proposed';
    default:
      return null;
  }
}

export default function EntityProfilePage() {
  const router = useRouter();
  const { type, id } = router.query;
  
  const [entity, setEntity] = useState(null);
  const [relatedActions, setRelatedActions] = useState({ current: [], executed: [], deferred: [] });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!type || !id) return;
    
    // Validate entity type
    if (!isValidEntityType(type)) {
      setError(`Unknown entity type: ${type}`);
      setLoading(false);
      return;
    }
    
    // Fetch all data in parallel
    setLoading(true);
    setError(null);
    
    Promise.all([
      fetchEntity(type, id),
      fetchRelatedActions(type, id),
      fetchEvents(type, id),
    ])
      .then(([entityData, actionsData, eventsData]) => {
        if (!entityData) {
          setError(`${getEntityTypeLabel(type)} not found: ${id}`);
        } else {
          setEntity(entityData);
        }
        setRelatedActions(actionsData);
        setEvents(eventsData);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [type, id]);
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-bb-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-bb-lime border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-bb-text-muted font-mono text-sm">Loading...</div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-bb-dark">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <a href="/" className="inline-block mb-8 text-bb-text-muted hover:text-bb-lime font-mono text-sm">
            ← Back to Actions
          </a>
          <div className="text-bb-red font-mono">{error}</div>
        </div>
      </div>
    );
  }
  
  // Get sections for this entity type
  const sections = getSectionsForEntityType(type);
  
  // Build tiles
  const tiles = buildTilesForEntity(type, entity);
  
  // Get descriptor
  const descriptor = getDescriptor(type, entity);
  
  return (
    <ProfileLayout
      type={type}
      name={entity?.name || entity?.label || entity?.title || id}
      id={id}
      descriptor={descriptor}
      tiles={tiles}
      relatedActions={relatedActions}
      events={events}
    >
      {/* [C] Entity-Specific Sections - rendered in registry order */}
      {sections.map(({ key, component: SectionComponent, label }) => (
        <SectionComponent key={key} data={entity} />
      ))}
    </ProfileLayout>
  );
}
