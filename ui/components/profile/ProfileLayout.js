/**
 * Profile Layout Component - Universal Skeleton
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Fixed order: [A] Identity Header → [B] At-a-Glance Strip → [C] Entity Sections → [D] Related Actions → [E] Event Log
 * - One-scroll layout (no multi-pane dashboards, no sidebars as primary spine)
 * - Scrolling down reveals deeper detail
 * - Empty sections render in collapsed/empty-state form (not removed)
 * - Read-only surfaces
 */

import Link from 'next/link';
import IdentityHeader from './IdentityHeader';
import AtAGlanceStrip from './AtAGlanceStrip';
import RelatedActionsPanel from './RelatedActionsPanel';
import EventLog from './EventLog';

/**
 * @param {Object} props
 * @param {string} props.type - Entity type
 * @param {string} props.name - Entity name
 * @param {string} props.id - Entity ID
 * @param {string} [props.descriptor] - One-line descriptor for header
 * @param {Array} [props.tiles] - At-a-glance tiles
 * @param {React.ReactNode} props.children - Entity-specific sections [C]
 * @param {{ current: Array, executed: Array, deferred: Array }} [props.relatedActions]
 * @param {Array} [props.events] - Event log entries
 */
export default function ProfileLayout({
  type,
  name,
  id,
  descriptor,
  tiles = [],
  children,
  relatedActions = { current: [], executed: [], deferred: [] },
  events = [],
}) {
  return (
    <div className="min-h-screen bg-bb-dark">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back navigation - minimal breadcrumb */}
        <Link
          href="/"
          className="inline-block mb-8 text-bb-text-muted hover:text-bb-accent transition-colors font-mono text-sm"
        >
          ← Back to Actions
        </Link>
        
        {/* [A] Identity Header */}
        <IdentityHeader
          type={type}
          name={name}
          id={id}
          descriptor={descriptor}
        />
        
        {/* [B] At-a-Glance Strip */}
        <AtAGlanceStrip tiles={tiles} />
        
        {/* [C] Entity-Specific Sections */}
        <div className="space-y-6">
          {children}
        </div>
        
        {/* [D] Related Actions */}
        <RelatedActionsPanel
          current={relatedActions.current}
          executed={relatedActions.executed}
          deferred={relatedActions.deferred}
        />
        
        {/* [E] Event / History Log */}
        <EventLog events={events} />
      </div>
    </div>
  );
}
