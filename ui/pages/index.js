import { useState, useEffect, useCallback, useRef } from 'react';
import ActionCard from '../components/ActionCard';
import ActionDetailModal from '../components/ActionDetailModal';

/**
 * Homepage - Action Feed with Detail Modal
 * 
 * Shows ranked list of actions with filtering by source type.
 * Click action → modal with full impact breakdown.
 * 
 * Lifecycle: proposed → executed → observed
 */
export default function Home() {
  const [actions, setActions] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL | ISSUE | PREISSUE
  
  // Track completed actions this session
  const completedThisSession = useRef(new Set());

  // Fetch actions
  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/actions/today');
      
      if (!response.ok) {
        throw new Error('Failed to fetch actions');
      }
      
      const data = await response.json();
      
      // Filter out completed actions
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

  // Initial load
  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // Handle action execution
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

  // Handle observation
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
      
      // Mark as completed
      completedThisSession.current.add(selectedAction.actionId);
      
      // Remove from local state
      setActions(prev => prev.filter(a => a.actionId !== selectedAction.actionId));
      setSelectedAction(null);
    } catch (err) {
      console.error('Observe error:', err);
    }
  }, [selectedAction]);

  // Handle skip
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
      
      // Mark as completed
      completedThisSession.current.add(selectedAction.actionId);
      
      // Remove from local state
      setActions(prev => prev.filter(a => a.actionId !== selectedAction.actionId));
      setSelectedAction(null);
    } catch (err) {
      console.error('Skip error:', err);
    }
  }, [selectedAction]);

  // Filter actions by source type
  const filteredActions = filter === 'ALL' 
    ? actions 
    : actions.filter(a => a.sources?.[0]?.sourceType === filter);

  // Count by source type
  const counts = {
    ALL: actions.length,
    ISSUE: actions.filter(a => a.sources?.[0]?.sourceType === 'ISSUE').length,
    PREISSUE: actions.filter(a => a.sources?.[0]?.sourceType === 'PREISSUE').length,
  };

  // Keyboard: Escape closes modal
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
      <div className="min-h-screen flex items-center justify-center">
        <button 
          onClick={fetchActions}
          className="text-gray-500 hover:text-gray-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Today</h1>
            
            {/* Refresh */}
            <button
              onClick={fetchActions}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-4">
            {['ALL', 'ISSUE', 'PREISSUE'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded transition-colors
                  ${filter === f 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                {f === 'ALL' ? 'All' : f === 'ISSUE' ? 'Issues' : 'Pre-issues'}
                <span className="ml-1.5 text-xs opacity-70">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Action feed */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading && actions.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {filter === 'ALL' ? 'No actions available' : `No ${filter.toLowerCase()} actions`}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredActions.slice(0, 20).map((action) => (
              <ActionCard
                key={action.actionId}
                action={action}
                onClick={() => setSelectedAction(action)}
                isSelected={selectedAction?.actionId === action.actionId}
              />
            ))}
            
            {filteredActions.length > 20 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                +{filteredActions.length - 20} more actions
              </div>
            )}
          </div>
        )}

        {/* Summary footer */}
        {metadata && (
          <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
            <div className="flex gap-6">
              <span>Total: {metadata.totalAvailable || actions.length}</span>
              {metadata.bySource && Object.entries(metadata.bySource).map(([type, count]) => (
                <span key={type}>{type}: {count}</span>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Detail modal */}
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
