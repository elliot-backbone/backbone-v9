/**
 * CompanyCard — Portfolio company trading card for the Command Board
 *
 * Anatomy: identity strip, snapshot metrics, action slots by category.
 */

import Link from 'next/link';
import ActionSlot from './ActionSlot';
import { getCompanyActionSlots } from '../lib/actionCategories';

function formatCompact(n) {
  if (n == null) return '—';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

function RunwayBadge({ months }) {
  if (months == null) return null;
  const color = months <= 6 ? 'text-bb-red' : months <= 12 ? 'text-bb-amber' : 'text-bb-lime';
  return <span className={`font-mono ${color}`}>{months}mo</span>;
}

const STAGE_COLORS = {
  'Pre-seed': 'bg-bb-blue/20 text-bb-blue',
  'Seed':     'bg-bb-lime/20 text-bb-lime',
  'Series A': 'bg-bb-amber/20 text-bb-amber',
  'Series B': 'bg-bb-accent/20 text-bb-accent',
  'Series C': 'bg-bb-red/20 text-bb-red',
};

export default function CompanyCard({ company, categoryActions, onActionClick, onDone, onSkip }) {
  const slots = getCompanyActionSlots(categoryActions || {});
  const stageClass = STAGE_COLORS[company.stage] || 'bg-bb-text-muted/20 text-bb-text-muted';

  // Aggregate urgency for card border treatment
  const topScore = slots.length > 0 ? (slots[0].topAction?.rankScore || 0) : 0;
  const borderClass = topScore >= 70 ? 'border-l-bb-red' :
                      topScore >= 40 ? 'border-l-bb-amber' : 'border-l-bb-border';

  return (
    <div className={`bg-bb-panel border border-bb-border border-l-2 ${borderClass} transition-all`}>
      {/* Identity strip */}
      <div className="px-3 pt-3 pb-2 border-b border-bb-border/50">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/entities/company/${company.id}`}
            className="text-sm font-medium text-bb-text hover:text-bb-accent transition-colors truncate"
          >
            {company.name}
          </Link>
          <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded flex-shrink-0 ${stageClass}`}>
            {company.stage}
          </span>
        </div>
        {company.sector && (
          <span className="text-[10px] text-bb-text-muted font-mono">{company.sector}</span>
        )}
      </div>

      {/* Snapshot metrics */}
      <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] font-mono text-bb-text-secondary border-b border-bb-border/30">
        {company.runway != null && (
          <div className="flex items-center gap-1">
            <span className="text-bb-text-muted">RW</span>
            <RunwayBadge months={company.runway} />
          </div>
        )}
        {company.arr != null && (
          <div className="flex items-center gap-1">
            <span className="text-bb-text-muted">ARR</span>
            <span>{formatCompact(company.arr)}</span>
          </div>
        )}
        {company.burn != null && (
          <div className="flex items-center gap-1">
            <span className="text-bb-text-muted">Burn</span>
            <span>{formatCompact(company.burn)}</span>
          </div>
        )}
        {company.headcount != null && (
          <div className="flex items-center gap-1">
            <span className="text-bb-text-muted">HC</span>
            <span>{company.headcount}</span>
          </div>
        )}
      </div>

      {/* Action slots */}
      <div className="py-1">
        {slots.length === 0 ? (
          <div className="px-3 py-3 text-xs text-bb-text-muted font-mono text-center">
            No actions
          </div>
        ) : (
          slots.map(slot => (
            <ActionSlot
              key={slot.category}
              slot={slot}
              onActionClick={onActionClick}
              onDone={onDone}
              onSkip={onSkip}
            />
          ))
        )}
      </div>
    </div>
  );
}
