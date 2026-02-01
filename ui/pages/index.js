import { useState, useEffect, useCallback, useRef } from 'react';
import Action from '../components/Action';

/**
 * UI-2 Action Lifecycle: proposed → executed → observed
 * 
 * Flow:
 * 1. Fetch action (proposed)
 * 2. User executes → record 'executed' event
 * 3. User observes → record 'outcome_recorded' event (optional notes)
 * 4. Fetch next action
 */
export default function Home() {
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track skipped actions client-side to prevent duplicates during rapid clicking
  const skippedThisSession = useRef(new Set());

  // Fetch current action
  const fetchAction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/actions/today');
      
      if (!response.ok) {
        throw new Error('Failed to fetch action');
      }
      
      const data = await response.json();
      const actions = data.actions || [];
      
      // Filter out any actions skipped this session (client-side dedup)
      const available = actions.filter(a => !skippedThisSession.current.has(a.actionId));
      
      setAction(available.length > 0 ? available[0] : null);
    } catch (err) {
      setError(err.message);
      setAction(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAction();
  }, []);

  // Handle action execution (step 1 of lifecycle)
  const handleExecute = useCallback(async (executedAt) => {
    if (!action) return;

    try {
      const response = await fetch('/api/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionId: action.actionId,
          entityId: action.entityRef?.id,
          executedAt,
        }),
      });

      if (response.status !== 204) {
        throw new Error('Failed to record execution');
      }
      // Success - Action component handles UI transition to observation
    } catch (err) {
      setError(err.message);
    }
  }, [action]);

  // Handle observation (step 2 of lifecycle)
  const handleObserve = useCallback(async (notes) => {
    if (!action) return;

    try {
      const response = await fetch('/api/actions/observe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionId: action.actionId,
          entityId: action.entityRef?.id,
          actionType: action.resolutionId || action.type || null, // UI-3: for pattern detection
          notes,
          observedAt: new Date().toISOString(),
        }),
      });

      if (response.status === 204) {
        // Fetch next action
        fetchAction();
      } else {
        throw new Error('Failed to record observation');
      }
    } catch (err) {
      setError(err.message);
    }
  }, [action]);

  // Handle action skip
  const handleSkip = useCallback(async () => {
    if (!action || loading) return;
    
    // Track locally first to prevent duplicates during rapid clicking
    skippedThisSession.current.add(action.actionId);

    try {
      const response = await fetch('/api/actions/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionId: action.actionId,
          entityId: action.entityRef?.id,
        }),
      });

      if (response.status === 204) {
        await fetchAction();
      } else {
        throw new Error('Failed to skip action');
      }
    } catch (err) {
      setError(err.message);
    }
  }, [action, loading]);

  // UI-2.1 A3: Keyboard shortcuts must match displayed hints
  // Enter = primary action (execute in proposed, submit in executed)
  // Escape = skip/dismiss
  const [lifecycleRef, setLifecycleRef] = useState('proposed');
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        // Trigger click on primary button
        const primaryBtn = document.querySelector('[data-primary-action]');
        if (primaryBtn) primaryBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Trigger click on skip button
        const skipBtn = document.querySelector('[data-skip-action]');
        if (skipBtn) skipBtn.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button 
          onClick={fetchAction}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <Action 
      action={action} 
      onExecute={handleExecute}
      onObserve={handleObserve}
      onSkip={handleSkip}
      loading={loading}
    />
  );
}
