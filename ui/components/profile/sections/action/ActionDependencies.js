/**
 * Action Dependencies Section [C3]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include: upstream signals (linked to Issues/Goals/Entities),
 *   downstream effects (linked to impacted entities), any blockers (linked)
 * - Read-only display
 * - No invented content
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

function DependencyGroup({ label, items, emptyMessage }) {
  if (!items || items.length === 0) {
    return (
      <div className="mb-4 last:mb-0">
        <div className="text-xs text-gray-500 mb-2">{label}</div>
        <div className="text-sm text-gray-400">{emptyMessage}</div>
      </div>
    );
  }
  
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-xs text-gray-500 mb-2">
        {label} ({items.length})
      </div>
      <div className="space-y-1">
        {items.map((item, index) => (
          <DependencyRow key={item.id || index} item={item} />
        ))}
      </div>
    </div>
  );
}

function DependencyRow({ item }) {
  // Determine if this is a blocker (semantic color)
  const isBlocker = item.isBlocker || item.blocking;
  
  return (
    <div className={`py-1.5 px-2 rounded text-sm ${isBlocker ? 'bg-red-50' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <EntityLink
          type={item.type}
          id={item.id}
          name={item.name || item.label}
          showType={true}
        />
        {isBlocker && (
          <span className="text-xs text-red-600 font-medium">Blocking</span>
        )}
      </div>
      {item.relationship && (
        <div className="text-xs text-gray-500 mt-0.5">{item.relationship}</div>
      )}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.data - Action data with dependencies
 */
export default function ActionDependencies({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Dependencies">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const {
    upstream,
    upstreamSignals,
    sources,
    downstream,
    downstreamEffects,
    impacts,
    impactedEntities,
    blockers,
    blockedBy,
    dependencies
  } = data;
  
  // Normalize from various data shapes
  const upstreamItems = upstream || upstreamSignals || sources || [];
  const downstreamItems = downstream || downstreamEffects || impacts || impactedEntities || [];
  const blockerItems = blockers || blockedBy || [];
  
  // Also check for generic dependencies array
  let additionalUpstream = [];
  let additionalDownstream = [];
  let additionalBlockers = [];
  
  if (Array.isArray(dependencies)) {
    dependencies.forEach(dep => {
      if (dep.direction === 'upstream' || dep.type === 'source') {
        additionalUpstream.push(dep);
      } else if (dep.direction === 'downstream' || dep.type === 'impact') {
        additionalDownstream.push(dep);
      } else if (dep.isBlocker || dep.blocking) {
        additionalBlockers.push(dep);
      }
    });
  }
  
  const allUpstream = [...upstreamItems, ...additionalUpstream];
  const allDownstream = [...downstreamItems, ...additionalDownstream];
  const allBlockers = [...blockerItems, ...additionalBlockers];
  
  // Check if any dependency data exists
  const hasDependencyData = 
    allUpstream.length > 0 ||
    allDownstream.length > 0 ||
    allBlockers.length > 0;
  
  if (!hasDependencyData) {
    return (
      <SectionWrapper title="Dependencies">
        <EmptyState message="No dependencies identified" />
      </SectionWrapper>
    );
  }
  
  return (
    <SectionWrapper title="Dependencies">
      {/* Blockers first (most important) */}
      {allBlockers.length > 0 && (
        <DependencyGroup
          label="Blockers"
          items={allBlockers.map(b => ({ ...b, isBlocker: true }))}
          emptyMessage="None"
        />
      )}
      
      {/* Upstream signals (Issues/Goals/Entities that feed into this Action) */}
      <DependencyGroup
        label="Upstream Signals"
        items={allUpstream}
        emptyMessage="No upstream signals"
      />
      
      {/* Downstream effects (Entities impacted by this Action) */}
      <DependencyGroup
        label="Downstream Effects"
        items={allDownstream}
        emptyMessage="No downstream effects identified"
      />
    </SectionWrapper>
  );
}
