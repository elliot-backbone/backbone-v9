import { useState, useEffect, useCallback, useRef } from 'react';
import ActionCard from '../components/ActionCard';
import ActionDetailModal from '../components/ActionDetailModal';

/**
 * Homepage - Football Manager Inspired Action Feed
 * 
 * Dense data display with:
 * - Left sidebar showing aggregate stats
 * - Main feed with ranked actions
 * - Filter tabs with counts
 * - Lifecycle: proposed → executed → observed
 */

// Stats summary component
function StatBox({ label, value, subvalue, accent }) {
  const accentColors = {
    lime: 'border-l-bb-lime',
    red: 'border-l-bb-red',
    amber: 'border-l-bb-amber',
    blue: 'border-l-bb-blue',
  };
  
  return (
    <div className={`bg-bb-card border border-bb-border border-l-2 ${accentColors[accent] || accentColors.lime} p-3`}>
      <div className="font-display uppercase text-[10px] tracking-widest text-bb-text-muted mb-1">
        {label}
      </div>
      <div className="font-mono text-2xl text-bb-lime number-display">
        {value}
      </div>
      {subvalue && (
        <div className="font-mono text-xs text-bb-text-muted mt-1">
          {subvalue}
        </div>
      )}
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
      
      if (!response.ok) {
        throw new Error('Failed to fetch actions');
      }
      
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

  const handleSkip = useCallback(async () => {
    if (!selectedAction) return;

    try {
      await fetch('/api/actions/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: selectedAction.actionId,
          entityId: selectedAction.entityRef?.id,
        }),
      });
      
      completedThisSession.current.add(selectedAction.actionId);
      setActions(prev => prev.filter(a => a.actionId !== selectedAction.actionId));
      setSelectedAction(null);
    } catch (err) {
      console.error('Skip error:', err);
    }
  }, [selectedAction]);

  const filteredActions = filter === 'ALL' 
    ? actions 
    : actions.filter(a => a.sources?.[0]?.sourceType === filter);

  const counts = {
    ALL: actions.length,
    ISSUE: actions.filter(a => a.sources?.[0]?.sourceType === 'ISSUE').length,
    PREISSUE: actions.filter(a => a.sources?.[0]?.sourceType === 'PREISSUE').length,
  };

  // Calculate aggregate stats
  const totalUpside = actions.reduce((sum, a) => sum + (a.impact?.upsideMagnitude || 0), 0);
  const avgScore = actions.length > 0 
    ? (actions.reduce((sum, a) => sum + (a.rankScore || 0), 0) / actions.length).toFixed(1)
    : '—';
  const highPriority = actions.filter(a => (a.rankScore || 0) >= 70).length;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedAction) {
        setSelectedAction(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAction]);

  if (error) {
    return (
      <div className="min-h-screen bg-bb-dark flex items-center justify-center">
        <button 
          onClick={fetchActions}
          className="px-4 py-2 text-bb-text-muted hover:text-bb-lime border border-bb-border hover:border-bb-lime transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bb-dark">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-20 bg-bb-darker border-b border-bb-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo / Title */}
            <div className="flex items-center gap-4">
              <div className="font-display font-bold text-xl tracking-tight">
                <span className="text-bb-lime">BACKBONE</span>
              </div>
              <div className="h-4 w-px bg-bb-border" />
              <div className="font-mono text-xs text-bb-text-muted uppercase tracking-wider">
                Action Center
              </div>
            </div>
            
            {/* Right side controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={fetchActions}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-bb-text-muted hover:text-bb-lime border border-bb-border hover:border-bb-lime transition-colors"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-mono text-xs">REFRESH</span>
              </button>
              
              <div className="font-mono text-xs text-bb-text-muted">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                }).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Left Sidebar - Stats Panel */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              {/* Overview Stats */}
              <div className="bb-panel p-4">
                <h2 className="bb-section-header">Today's Overview</h2>
                <div className="space-y-3">
                  <StatBox 
                    label="Total Actions" 
                    value={counts.ALL} 
                    subvalue={`${counts.ISSUE} issues · ${counts.PREISSUE} pre-issues`}
                    accent="lime"
                  />
                  <StatBox 
                    label="Total Upside" 
                    value={totalUpside} 
                    subvalue="cumulative magnitude"
                    accent="blue"
                  />
                  <StatBox 
                    label="Avg Score" 
                    value={avgScore} 
                    subvalue={`${highPriority} high priority`}
                    accent="amber"
                  />
                </div>
              </div>
              
              {/* Distribution */}
              <div className="bb-panel p-4">
                <h2 className="bb-section-header">Source Distribution</h2>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-bb-red font-medium">ISSUE</span>
                      <span className="font-mono text-bb-text-muted">{counts.ISSUE}</span>
                    </div>
                    <div className="bb-progress">
                      <div 
                        className="h-full bg-bb-red transition-all duration-500"
                        style={{ width: `${counts.ALL ? (counts.ISSUE / counts.ALL) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-bb-amber font-medium">PREISSUE</span>
                      <span className="font-mono text-bb-text-muted">{counts.PREISSUE}</span>
                    </div>
                    <div className="bb-progress">
                      <div 
                        className="h-full bg-bb-amber transition-all duration-500"
                        style={{ width: `${counts.ALL ? (counts.PREISSUE / counts.ALL) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              {metadata?.bySource && (
                <div className="bb-panel p-4">
                  <h2 className="bb-section-header">Metadata</h2>
                  <div className="font-mono text-xs space-y-1 text-bb-text-muted">
                    {Object.entries(metadata.bySource).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span>{type}</span>
                        <span className="text-bb-text">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="col-span-12 lg:col-span-9">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-bb-border">
              {[
                { key: 'ALL', label: 'All Actions' },
                { key: 'ISSUE', label: 'Issues' },
                { key: 'PREISSUE', label: 'Pre-Issues' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`
                    relative px-4 py-3 text-sm font-medium transition-colors
                    ${filter === key 
                      ? 'text-bb-lime' 
                      : 'text-bb-text-muted hover:text-bb-text'
                    }
                  `}
                >
                  {label}
                  <span className={`
                    ml-2 font-mono text-xs px-1.5 py-0.5 rounded
                    ${filter === key 
                      ? 'bg-bb-lime/20 text-bb-lime' 
                      : 'bg-bb-border text-bb-text-muted'
                    }
                  `}>
                    {counts[key]}
                  </span>
                  {filter === key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-bb-lime" />
                  )}
                </button>
              ))}
            </div>

            {/* Action Feed */}
            {loading && actions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-bb-border border-t-bb-lime rounded-full animate-spin mb-4" />
                <div className="font-mono text-xs text-bb-text-muted uppercase tracking-wider">
                  Loading Actions...
                </div>
              </div>
            ) : filteredActions.length === 0 ? (
              <div className="bb-panel p-12 text-center">
                <div className="font-mono text-bb-text-muted text-sm">
                  {filter === 'ALL' ? 'NO ACTIONS AVAILABLE' : `NO ${filter} ACTIONS`}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActions.slice(0, 20).map((action, index) => (
                  <div
                    key={action.actionId}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <ActionCard
                      action={action}
                      onClick={() => setSelectedAction(action)}
                      isSelected={selectedAction?.actionId === action.actionId}
                    />
                  </div>
                ))}
                
                {filteredActions.length > 20 && (
                  <div className="bb-panel p-4 text-center">
                    <span className="font-mono text-xs text-bb-text-muted">
                      +{filteredActions.length - 20} MORE ACTIONS
                    </span>
                  </div>
                )}
              </div>
            )}
          </main>
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
    </div>
  );
}
