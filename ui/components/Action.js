export default function Action({ action, onComplete, onSkip, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!action) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">No actions available</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-2xl">
        {/* Company name - secondary weight */}
        <div className="mb-4 text-sm text-gray-600">
          {action.entityRef.name}
        </div>

        {/* Action title - large, plain text */}
        <h1 className="mb-8 text-3xl font-normal text-gray-900">
          {action.title}
        </h1>

        {/* Steps - numbered list, monospace-friendly */}
        <ol className="mb-12 space-y-3">
          {action.steps.map((step) => (
            <li key={step.step} className="flex gap-3">
              <span className="font-mono text-gray-500">{step.step}.</span>
              <span className="text-gray-800">{step.action}</span>
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
