import { useState, useEffect, useCallback } from 'react';
import Action from '../components/Action';

export default function Home() {
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      // Extract first action from the actions array
      setAction(data.actions && data.actions.length > 0 ? data.actions[0] : null);
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

  // Handle action completion
  const handleComplete = useCallback(async () => {
    if (!action || loading) return;

    try {
      const response = await fetch('/api/actions/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionId: action.actionId,
          completedAt: new Date().toISOString(),
        }),
      });

      if (response.status === 204) {
        // Success - fetch next action
        await fetchAction();
      } else {
        throw new Error('Failed to complete action');
      }
    } catch (err) {
      setError(err.message);
    }
  }, [action, loading]);

  // Handle action skip
  const handleSkip = useCallback(async () => {
    if (!action || loading) return;

    try {
      const response = await fetch('/api/actions/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionId: action.actionId,
        }),
      });

      if (response.status === 204) {
        // Success - fetch next action
        await fetchAction();
      } else {
        throw new Error('Failed to skip action');
      }
    } catch (err) {
      setError(err.message);
    }
  }, [action, loading]);

  // Keyboard shortcuts: Enter = complete, Escape = skip
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if in UI-1 overlay or input focused
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        handleComplete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleComplete, handleSkip]);

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
      onComplete={handleComplete} 
      onSkip={handleSkip}
      loading={loading}
    />
  );
}
