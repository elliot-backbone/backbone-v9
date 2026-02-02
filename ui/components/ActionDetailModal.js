import { useState } from 'react';
import Link from 'next/link';

/**
 * ActionDetailModal - Full action detail view
 * 
 * FM-style modal with:
 * - Metric cards
 * - Goal impacts
 * - Step checklist
 * - Execute/Skip actions
 */
export default function ActionDetailModal({ action, onClose, onExecute, onObserve, onSkip }) {
  const [observation, setObservation] = useState('');
  const [checkedSteps, setCheckedSteps] = useState(new Set());

  const {
    title,
    entityRef,
    sourceType,
    upside = 0,
    probability = 0,
    rankScore = 0,
    effort = 0,
    lifecycle = 'proposed',
    impactRationale,
    goalImpacts = [],
    steps = [],
  } = action;

  const handleStepToggle = (index) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleExecuteClick = () => {
    onExecute(new Date().toISOString());
  };

  const handleObserveClick = () => {
    onObserve(observation);
  };

  const handleSkipClick = () => {
    onSkip('Skipped via modal');
  };

  // Source badge color
  const sourceBadgeClass = sourceType === 'issue'
    ? 'bg-bb-red/20 text-bb-red'
    : 'bg-bb-amber/20 text-bb-amber';

  // Lifecycle badge
  const lifecycleBadgeClass = lifecycle === 'proposed' 
    ? 'bg-bb-text-muted/20 text-bb-text-muted'
    : lifecycle === 'executed'
      ? 'bg-bb-blue/20 text-bb-blue'
      : 'bg-bb-green/20 text-bb-green';

  const stepsCompleted = checkedSteps.size;
  const stepsTotal = steps.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-bb-panel border border-bb-border animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-bb-panel border-b border-bb-border p-4 flex items-start justify-between">
          <div>
            {entityRef && (
              <Link
                href={`/entities/${entityRef.type}/${entityRef.id}`}
                className="text-bb-text-secondary hover:text-bb-lime text-sm font-mono transition-colors"
              >
                {entityRef.name || entityRef.id}
              </Link>
            )}
            <h2 className="text-lg font-medium text-bb-text mt-1">{title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 text-xs font-mono rounded ${sourceBadgeClass}`}>
                {sourceType?.toUpperCase()}
              </span>
              <span className={`px-2 py-0.5 text-xs font-mono rounded ${lifecycleBadgeClass}`}>
                {lifecycle?.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-bb-text-muted hover:text-bb-text text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bb-card border border-bb-border p-3 border-l-2 border-l-bb-lime">
              <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Upside</div>
              <div className="text-xl font-mono text-bb-lime">${(upside / 1000000).toFixed(2)}M</div>
            </div>
            <div className="bg-bb-card border border-bb-border p-3 border-l-2 border-l-bb-blue">
              <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Probability</div>
              <div className="text-xl font-mono text-bb-blue">{Math.round(probability * 100)}%</div>
            </div>
            <div className="bg-bb-card border border-bb-border p-3 border-l-2 border-l-bb-amber">
              <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-1">Rank Score</div>
              <div className="text-xl font-mono text-bb-amber">{rankScore}</div>
            </div>
          </div>

          {/* Impact Rationale */}
          {impactRationale && (
            <div className="bg-bb-card border border-bb-border p-4 border-l-2 border-l-bb-blue">
              <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-2 font-display">
                Impact Rationale
              </div>
              <p className="text-bb-text-secondary text-sm leading-relaxed">
                {impactRationale}
              </p>
            </div>
          )}

          {/* Goal Impacts */}
          {goalImpacts.length > 0 && (
            <div>
              <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-3 font-display">
                Goal Impacts
              </div>
              <div className="space-y-2">
                {goalImpacts.map((impact, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm text-bb-text-secondary mb-1">{impact.goal}</div>
                      <div className="h-2 bg-bb-border rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-bb-lime"
                          style={{ width: `${Math.min(Math.abs(impact.lift || 0) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-mono text-bb-lime w-16 text-right">
                      +{((impact.lift || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-bb-text-muted text-xs uppercase tracking-wider font-display">
                  Steps
                </div>
                <div className="text-xs font-mono text-bb-text-muted">
                  {stepsCompleted}/{stepsTotal}
                </div>
              </div>
              <div className="h-1 bg-bb-border rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-bb-lime transition-all"
                  style={{ width: stepsTotal ? `${(stepsCompleted / stepsTotal) * 100}%` : '0%' }}
                />
              </div>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <label 
                    key={i}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      checkedSteps.has(i) 
                        ? 'bg-bb-lime border-bb-lime' 
                        : 'border-bb-border group-hover:border-bb-lime'
                    }`}>
                      {checkedSteps.has(i) && (
                        <span className="text-bb-dark text-xs">✓</span>
                      )}
                    </div>
                    <span className={`text-sm transition-colors ${
                      checkedSteps.has(i) ? 'text-bb-text-muted line-through' : 'text-bb-text-secondary'
                    }`}>
                      {step}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Observation (after execution) */}
          {lifecycle === 'executed' && (
            <div>
              <div className="text-bb-text-muted text-xs uppercase tracking-wider mb-2 font-display">
                Observation
              </div>
              <textarea
                value={observation}
                onChange={e => setObservation(e.target.value)}
                placeholder="What happened? Any learnings?"
                className="w-full h-24 p-3 bg-bb-card border border-bb-border text-bb-text placeholder-bb-text-muted text-sm resize-none focus:border-bb-lime focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-bb-panel border-t border-bb-border p-4 flex items-center justify-end gap-3">
          {lifecycle === 'proposed' && (
            <>
              <button
                onClick={handleSkipClick}
                className="px-4 py-2 text-sm font-mono text-bb-text-muted hover:text-bb-text border border-bb-border hover:border-bb-text-muted transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleExecuteClick}
                className="px-4 py-2 text-sm font-mono bg-bb-lime text-bb-dark hover:bg-bb-lime/90 transition-colors"
              >
                Mark Executed
              </button>
            </>
          )}
          {lifecycle === 'executed' && (
            <button
              onClick={handleObserveClick}
              className="px-4 py-2 text-sm font-mono bg-bb-lime text-bb-dark hover:bg-bb-lime/90 transition-colors"
            >
              Save Observation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
