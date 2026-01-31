import { useState, useEffect } from 'react';
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
  const handleComplete = async () => {
    if (!action) return;

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
  };

  // Handle action skip
  const handleSkip = async () => {
    if (!action) return;

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
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
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
