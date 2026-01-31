import { useState } from 'react';
import EntityInspect from './EntityInspect';

export default function Action({ action, onComplete, onSkip, loading }) {
  const [showEntity, setShowEntity] = useState(false);

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
          {/* Primary CTA - Mark Complete */}
          <button
            onClick={onComplete}
            className="px-6 py-3 text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors"
          >
            Mark Complete
          </button>

          {/* Secondary CTA - Skip */}
          <button
            onClick={onSkip}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
