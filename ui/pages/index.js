import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import ActionDetailModal from '../components/ActionDetailModal';
import { AppLayout } from '../components/nav';

/**
 * Homepage - Action Inbox (FM Style)
 * 
 * Football Manager inspired dark interface with:
 * - Kanban-style card grid layout
 * - Priority-based visual hierarchy
 * - Dense, data-rich presentation
 */

// Stat box for sidebar
function StatBox({ label, value, accent = 'lime' }) {
  const accentColors = {
    lime: 'text-bb-lime',
    red: 'text-bb-red',
    amber: 'text-bb-amber',
    blue: 'text-bb-blue',
  };
  
  return (
    <div className="bg-bb-panel border border-bb-border p-4">
      <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1 font-display">{label}</div>
      <div className={`text-xl font-mono ${accentColors[accent]}`}>{value}</div>
    </div>
  );
}

// Compact stat pill for header
function StatPill({ label, value, color = 'lime' }) {
  const colors = {
    lime: 'text-bb-lime',
    red: 'text-bb-red',
    amber: 'text-bb-amber',
    blue: 'text-bb-blue',
  };
  
  return (
    <div className="flex items-center gap-2 bg-bb-panel border border-bb-border px-3 py-2">
      <span className="text-bb-text-muted text-xs uppercase font-mono">{label}</span>
      <span className={`font-mono text-lg ${colors[color]}`}>{value}</span>
    </div>
  );
}

// Action card for kanban grid view
function ActionCard({ action, onClick }) {
  const {
    title,
    entityRef,
    sources,
    impact = {},
    rankScore = 0,
  } = action;

  // Extract from nested structures
  const sourceType = sources?.[0]?.sourceType?.toLowerCase() || 'preissue';
  const probability = impact.probabilityOfSuccess || 0;
  const effort = impact.effortCost || 0;
  
  // Extract dollar value from explain text (e.g., "$17.9M at stake")
  const explainText = impact.explain?.[0] || '';
  const dollarMatch = explainText.match(/\$([0-9.]+)([KMB])/);
  let upside = 0;
  if (dollarMatch) {
    const num = parseFloat(dollarMatch[1]);
    const unit = dollarMatch[2];
    upside = unit === 'B' ? num * 1000000000 : unit === 'M' ? num * 1000000 : num * 1000;
  }

  const borderColor = sourceType === 'issue' 
    ? 'border-l-bb-red' 
    : sourceType === 'preissue' 
      ? 'border-l-bb-amber' 
      : 'border-l-bb-lime';

  // Score color based on actual distribution (18+ urgent, 12+ high)
  const scoreColor = rankScore >= 18 
    ? 'text-bb-lime bg-bb-lime/10 ring-1 ring-bb-lime/30' 
    : rankScore >= 12 
      ? 'text-bb-amber bg-bb-amber/10 ring-1 ring-bb-amber/30' 
      : 'text-bb-text-muted bg-bb-card';

  const sourceBadgeClass = sourceType === 'issue'
    ? 'bg-bb-red/20 text-bb-red'
    : 'bg-bb-amber/20 text-bb-amber';

  return (
    <div
      onClick={onClick}
      className={`bg-bb-card border border-bb-border hover:border-bb-accent cursor-pointer transition-all group border-l-2 ${borderColor} h-full flex flex-col`}
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* Header: Score badge */}
        <div className="flex items-start justify-between mb-3">
          <span className={`px-2 py-0.5 text-xs font-mono rounded ${sourceBadgeClass}`}>
            {sourceType?.toUpperCase()}
          </span>
          <span className={`w-10 h-10 flex items-center justify-center text-sm font-mono rounded-full ${scoreColor}`}>
            {rankScore}
          </span>
        </div>

        {/* Entity */}
        {entityRef && (
          <Link
            href={`/entities/${entityRef.type}/${entityRef.id}`}
            onClick={e => e.stopPropagation()}
            className="text-bb-text-secondary hover:text-bb-accent text-xs font-mono transition-colors truncate mb-1"
          >
            {entityRef.name || entityRef.id}
          </Link>
        )}

        {/* Title */}
        <h4 className="text-bb-text font-medium group-hover:text-bb-accent transition-colors line-clamp-2 mb-3 flex-1">
          {title}
        </h4>

        {/* Footer: Metrics */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-bb-border">
          <div className="flex items-center gap-3">
            <span className="font-mono text-bb-text-muted">
              P:<span className="text-bb-text ml-1">{Math.round(probability * 100)}%</span>
            </span>
            <span className="font-mono text-bb-text-muted">
              E:<span className="text-bb-text ml-1">{effort}</span>
            </span>
          </div>
          <span className="font-mono text-bb-accent font-medium">
            ${(upside / 1000000).toFixed(1)}M
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [actions, setActions] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  
  const completedThisSession = useRef(new Set());

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/actions/today');
      if (!response.ok) throw new Error('Failed to fetch actions');
      
      const data = await response.json();
      const available = (data.actions || []).filter(
        a => !completedThisSession.current.has(a.actionId)
      );
      
      setActions(available);
      setMetadata(data.metadata || null);
    } catch (err) {
      setError(err.message);
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleExecute = useCallback(async (executedAt) => {
    if (!selectedAction) return;
    try {
      await fetch('/api/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: selectedAction.actionId,
          entityId: selectedAction.entityRef?.id,
          executedAt,
        }),
      });
    } catch (err) {
      console.error('Execute error:', err);
    }
  }, [selectedAction]);

  const handleObserve = useCallback(async (notes) => {
    if (!selectedAction) return;
    try {
      await fetch('/api/actions/observe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: selectedAction.actionId,
          entityId: selectedAction.entityRef?.id,
          actionType: selectedAction.resolutionId || null,
          notes,
          observedAt: new Date().toISOString(),
        }),
      });
      
      completedThisSession.current.add(selectedAction.actionId);
      setActions(prev => prev.filter(a => a.actionId !== selectedAction.actionId));
      setSelectedAction(null);
    } catch (err) {
      console.error('Observe error:', err);
    }
  }, [selectedAction]);

  const handleSkip = useCallback(async (reason) => {
    if (!selectedAction) return;
    try {
      await fetch('/api/actions/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: selectedAction.actionId,
          entityId: selectedAction.entityRef?.id,
          reason,
          skippedAt: new Date().toISOString(),
        }),
      });
      
      completedThisSession.current.add(selectedAction.actionId);
      setActions(prev => prev.filter(a => a.actionId !== selectedAction.actionId));
      setSelectedAction(null);
    } catch (err) {
      console.error('Skip error:', err);
    }
  }, [selectedAction]);

  // Bucket actions by priority (thresholds based on actual score distribution)
  // Top 10% = Urgent, Top 33% = High, Rest = Normal
  const urgentActions = actions.filter(a => a.rankScore >= 18);
  const highActions = actions.filter(a => a.rankScore >= 12 && a.rankScore < 18);
  const normalActions = actions.filter(a => a.rankScore < 12);

  // Calculate stats (using correct API paths)
  const issueCount = actions.filter(a => a.sources?.[0]?.sourceType === 'ISSUE').length;
  const preissueCount = actions.filter(a => a.sources?.[0]?.sourceType === 'PREISSUE').length;
  
  // Extract dollar amounts from explain text for total upside
  const totalUpside = actions.reduce((sum, a) => {
    const explainText = a.impact?.explain?.[0] || '';
    const match = explainText.match(/\$([0-9.]+)([KMB])/);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2];
      return sum + (unit === 'B' ? num * 1000000000 : unit === 'M' ? num * 1000000 : num * 1000);
    }
    return sum;
  }, 0);

  // Column component for kanban view
  const Column = ({ title, items, color, emptyText }) => (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-bb-border`}>
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <h3 className="text-bb-text font-mono text-sm uppercase">{title}</h3>
        <span className="text-bb-text-muted text-xs font-mono ml-auto">{items.length}</span>
      </div>
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-bb-text-muted text-xs font-mono text-center py-8 bg-bb-panel/50 border border-dashed border-bb-border">
            {emptyText}
          </div>
        ) : (
          items.map((action, index) => (
            <div 
              key={action.actionId}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <ActionCard
                action={action}
                onClick={() => setSelectedAction(action)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <AppLayout onRefresh={fetchActions}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Stats */}
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-2xl font-display text-bb-text">Actions</h1>
            <div className="flex-1" />
            <StatPill label="Total" value={actions.length} color="lime" />
            <StatPill label="Issue" value={issueCount} color="red" />
            <StatPill label="Preissue" value={preissueCount} color="amber" />
            <StatPill label="Upside" value={`$${(totalUpside / 1000000).toFixed(1)}M`} color="blue" />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-bb-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <div className="text-bb-text-muted font-mono text-sm">Loading Actions...</div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-bb-panel border border-bb-red p-4 text-bb-red font-mono text-sm">
              Error: {error}
            </div>
          )}

          {/* Kanban Columns */}
          {!loading && !error && (
            <div className="flex gap-4">
              <Column 
                title="Urgent" 
                items={urgentActions} 
                color="bg-bb-red"
                emptyText="No urgent actions"
              />
              <Column 
                title="High Priority" 
                items={highActions} 
                color="bg-bb-amber"
                emptyText="No high priority"
              />
              <Column 
                title="Normal" 
                items={normalActions} 
                color="bg-bb-lime"
                emptyText="No pending actions"
              />
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAction && (
        <ActionDetailModal
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
          onExecute={handleExecute}
          onObserve={handleObserve}
          onSkip={handleSkip}
        />
      )}
    </AppLayout>
  );
}
