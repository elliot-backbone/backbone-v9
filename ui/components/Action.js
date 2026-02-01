import { useState, useEffect } from 'react';
import EntityInspect from './EntityInspect';

/**
 * UI-2.1 Action Lifecycle: proposed → executed → observed
 * 
 * States (monotonic, no backward transitions):
 * - proposed: Initial view, user can execute or skip
 * - executed: Action marked done, prompts for observation
 * - observed: Observation recorded, brief confirmation before next action
 */
export default function Action({ action, onExecute, onObserve, onSkip, loading }) {
  const [showEntity, setShowEntity] = useState(false);
  const [lifecycle, setLifecycle] = useState('proposed'); // proposed | executed | observed
  const [executedAt, setExecutedAt] = useState(null);
  const [observation, setObservation] = useState('');

  // Reset lifecycle when action changes
  const actionId = action?.actionId;
  useEffect(() => {
    setLifecycle('proposed');
    setExecutedAt(null);
    setObservation('');
    setShowEntity(false);
  }, [actionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!action) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">—</div>
      </div>
    );
  }

  // UI-1: Entity inspection overlay
  if (showEntity) {
    return (
      <EntityInspect 
        entityRef={action.entityRef} 
        onClose={() => setShowEntity(false)} 
      />
    );
  }

  // Handle execution
  const handleExecute = async () => {
    const timestamp = new Date().toISOString();
    setExecutedAt(timestamp);
    setLifecycle('executed');
    await onExecute(timestamp);
  };

  // Handle observation submission - enters 'observed' state
  const handleObserve = async () => {
    setLifecycle('observed');
    await onObserve(observation.trim() || null);
    // Parent will fetch next action, resetting this component
  };

  // Handle skip observation (still records executed, no observation)
  const handleSkipObservation = async () => {
    setLifecycle('observed');
    await onObserve(null);
  };

  // UI-2: Observation prompt after execution
  if (lifecycle === 'executed') {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-2xl">
          {/* Context */}
          <div className="mb-4 text-sm text-gray-500">
            {action.entityRef.name}
          </div>

          <div className="mb-2 text-gray-600">
            {action.title}
          </div>

          <div className="mb-8 text-sm text-gray-400">
            Executed {executedAt ? new Date(executedAt).toLocaleTimeString() : ''}
          </div>

          {/* Observation prompt */}
          <label className="block mb-2 text-gray-700">
            What happened?
          </label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Optional observation..."
            className="w-full p-3 mb-6 border border-gray-300 rounded resize-none focus:outline-none focus:border-gray-500"
            rows={3}
            autoFocus
          />

          {/* Controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              onClick={handleObserve}
              data-primary-action
              className="px-6 py-3 text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors"
            >
              {observation.trim() ? 'Save' : 'Continue'}
              <span className="ml-2 text-gray-500 text-sm hidden sm:inline">↵</span>
            </button>

            {observation.trim() && (
              <button
                onClick={handleSkipObservation}
                data-skip-action
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Skip
                <span className="ml-2 text-gray-400 text-sm hidden sm:inline">esc</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // UI-0: Proposed action view
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-2xl">
        {/* Company name - clickable for UI-1 inspection */}
        <button
          onClick={() => setShowEntity(true)}
          className="mb-4 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {action.entityRef.name}
        </button>

        {/* Action title - large, plain text */}
        <h1 className="mb-8 text-3xl font-normal text-gray-900">
          {action.title}
        </h1>

        {/* Steps - numbered list */}
        <ol className="mb-12 space-y-3">
          {action.steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="font-mono text-gray-500">{index + 1}.</span>
              <span className="text-gray-800">{typeof step === 'string' ? step : step.action}</span>
            </li>
          ))}
        </ol>

        {/* Action controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Primary CTA - Mark Executed */}
          <button
            onClick={handleExecute}
            data-primary-action
            className="px-6 py-3 text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors"
          >
            Mark Executed
            <span className="ml-2 text-gray-500 text-sm hidden sm:inline">↵</span>
          </button>

          {/* Secondary CTA - Skip */}
          <button
            onClick={onSkip}
            data-skip-action
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Skip
            <span className="ml-2 text-gray-400 text-sm hidden sm:inline">esc</span>
          </button>
        </div>
      </div>
    </div>
  );
}
