import { useState, useEffect, useCallback, useRef } from 'react';
import ActionCard from '../components/ActionCard';
import ActionDetailModal from '../components/ActionDetailModal';
import { AppLayout } from '../components/nav';

/**
 * Homepage - Action Feed (FM Style)
 * 
 * Football Manager inspired dark interface with:
 * - Left sidebar: stats overview
 * - Main feed: ranked action cards
 * - Dense, data-rich presentation
 */

// Stat box component
function StatBox({ label, value, accent = 'lime' }) {
  const accentColors = {
    lime: 'border-l-bb-lime',
    red: 'border-l-bb-red',
    amber: 'border-l-bb-amber',
    blue: 'border-l-bb-blue',
  };
  
  return (
    <div className={`bg-bb-panel border border-bb-border p-4 border-l-2 ${accentColors[accent]}`}>
      <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1 font-display">
        {label}
      </div>
      <div className="text-2xl font-mono text-bb-accent tracking-tight">
        {value}
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
  const [filter, setFilter] = useState('ALL');
  
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

  // Filter actions
  const filteredActions = actions.filter(action => {
    if (filter === 'ALL') return true;
    if (filter === 'ISSUE') return action.sourceType === 'issue';
    if (filter === 'PREISSUE') return action.sourceType === 'preissue';
    return true;
  });

  // Calculate stats
  const issueCount = actions.filter(a => a.sourceType === 'issue').length;
  const preissueCount = actions.filter(a => a.sourceType === 'preissue').length;
  const totalUpside = actions.reduce((sum, a) => sum + (a.upside || 0), 0);
  const avgScore = actions.length > 0 
    ? Math.round(actions.reduce((sum, a) => sum + (a.rankScore || 0), 0) / actions.length)
    : 0;

  return (
    <AppLayout onRefresh={fetchActions}>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <aside className="col-span-3 space-y-4">
              {/* Stats */}
              <StatBox label="Total Actions" value={actions.length} accent="lime" />
              <StatBox label="Total Upside" value={`$${(totalUpside / 1000000).toFixed(1)}M`} accent="amber" />
              <StatBox label="Avg Score" value={avgScore} accent="blue" />
              
              {/* Distribution */}
              <div className="bg-bb-panel border border-bb-border p-4">
                <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-3 font-display">
                  Distribution
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-bb-red font-mono">ISSUE</span>
                      <span className="text-bb-text-muted">{issueCount}</span>
                    </div>
                    <div className="h-1.5 bg-bb-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-bb-red transition-all"
                        style={{ width: `${actions.length ? (issueCount / actions.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-bb-amber font-mono">PREISSUE</span>
                      <span className="text-bb-text-muted">{preissueCount}</span>
                    </div>
                    <div className="h-1.5 bg-bb-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-bb-amber transition-all"
                        style={{ width: `${actions.length ? (preissueCount / actions.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              {metadata && (
                <div className="bg-bb-panel border border-bb-border p-4">
                  <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-3 font-display">
                    Sources
                  </div>
                  <div className="space-y-2 text-sm font-mono">
                    {Object.entries(metadata.sourceBreakdown || {}).map(([source, count]) => (
                      <div key={source} className="flex justify-between">
                        <span className="text-bb-text-secondary">{source}</span>
                        <span className="text-bb-text">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Main Feed */}
            <main className="col-span-9">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 mb-4 border-b border-bb-border">
                {['ALL', 'ISSUE', 'PREISSUE'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-4 py-2 text-sm font-mono transition-colors ${
                      filter === tab 
                        ? 'text-bb-accent border-b-2 border-bb-accent bg-bb-card' 
                        : 'text-bb-text-muted hover:text-bb-text'
                    }`}
                  >
                    {tab}
                    <span className="ml-2 text-xs opacity-60">
                      {tab === 'ALL' ? actions.length : 
                       tab === 'ISSUE' ? issueCount : preissueCount}
                    </span>
                  </button>
                ))}
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

              {/* Empty State */}
              {!loading && !error && filteredActions.length === 0 && (
                <div className="text-center py-20">
                  <div className="text-bb-text-muted font-mono">NO ACTIONS AVAILABLE</div>
                </div>
              )}

              {/* Action Cards */}
              {!loading && !error && filteredActions.length > 0 && (
                <div className="space-y-2">
                  {filteredActions.map((action, index) => (
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
                  ))}
                </div>
              )}
            </main>
          </div>
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
