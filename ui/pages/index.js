import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import ActionDetailModal from '../components/ActionDetailModal';
import { AppLayout } from '../components/nav';

/**
 * Homepage - Action Inbox
 * 
 * Two columns: Reactive (issues) and Proactive (preissues)
 * Both ranked by net positive value creation (rankScore)
 */

// Simplified action card - entity, title, preventative label
function ActionCard({ action, onClick }) {
  const { title, entityRef } = action;
  const isPreventative = action.sources?.[0]?.sourceType === 'PREISSUE';

  return (
    <div
      onClick={onClick}
      className="bg-bb-card border border-bb-border hover:border-bb-accent cursor-pointer transition-all group"
    >
      <div className="p-4">
        {/* Entity + label row */}
        <div className="flex items-center gap-2 mb-1">
          {entityRef && (
            <Link
              href={`/entities/${entityRef.type}/${entityRef.id}`}
              onClick={e => e.stopPropagation()}
              className="text-bb-text-secondary hover:text-bb-accent text-xs font-mono transition-colors truncate"
            >
              {entityRef.name || entityRef.id}
            </Link>
          )}
          {isPreventative && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-bb-lime/20 text-bb-lime uppercase tracking-wide flex-shrink-0">
              Preventative
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="text-bb-text text-sm font-medium group-hover:text-bb-accent transition-colors line-clamp-2">
          {title}
        </h4>
      </div>
    </div>
  );
}

// Column component
function Column({ title, subtitle, items, accentColor, emptyText, onCardClick }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-4 pb-3 border-b border-bb-border">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${accentColor}`} />
          <h2 className="text-bb-text font-display text-lg">{title}</h2>
        </div>
        {subtitle && (
          <p className="text-bb-text-muted text-xs font-mono mt-1 ml-4">{subtitle}</p>
        )}
      </div>
      <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-bb-text-muted text-xs font-mono text-center py-12 bg-bb-panel/30 border border-dashed border-bb-border">
            {emptyText}
          </div>
        ) : (
          items.map((action, index) => (
            <div 
              key={action.actionId}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <ActionCard
                action={action}
                onClick={() => onCardClick(action)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [actions, setActions] = useState([]);
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

  // Group by Reactive (ISSUE) vs Proactive (PREISSUE)
  // Both already sorted by rankScore from API
  const reactiveActions = actions.filter(a => a.sources?.[0]?.sourceType === 'ISSUE');
  const proactiveActions = actions.filter(a => a.sources?.[0]?.sourceType === 'PREISSUE');

  return (
    <AppLayout onRefresh={fetchActions}>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-display text-bb-text">Actions</h1>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-bb-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-bb-panel border border-bb-red p-4 text-bb-red font-mono text-sm">
              {error}
            </div>
          )}

          {/* Two Column Layout: Reactive | Proactive */}
          {!loading && !error && (
            <div className="flex gap-6">
              <Column 
                title="Reactive" 
                subtitle="Address existing issues"
                items={reactiveActions} 
                accentColor="bg-bb-red"
                emptyText="No reactive actions"
                onCardClick={setSelectedAction}
              />
              <Column 
                title="Proactive" 
                subtitle="Prevent future issues"
                items={proactiveActions} 
                accentColor="bg-bb-lime"
                emptyText="No proactive actions"
                onCardClick={setSelectedAction}
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
