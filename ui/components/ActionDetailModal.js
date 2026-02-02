import { useState } from 'react';
import Link from 'next/link';
import { routeForEntity } from '../lib/entities/routeForEntity';

/**
 * ActionDetailModal - Football Manager Style
 * 
 * Full-screen detail view with:
 * - Dense metric panels
 * - Goal impact breakdown
 * - Step checklist
 * - Lifecycle controls
 */
export default function ActionDetailModal({ 
  action, 
  onClose, 
  onExecute, 
  onSkip,
  onObserve 
}) {
  const [lifecycle, setLifecycle] = useState('proposed');
  const [executedAt, setExecutedAt] = useState(null);
  const [observation, setObservation] = useState('');
  const [checkedSteps, setCheckedSteps] = useState(new Set());

  if (!action) return null;

  const impact = action.impact || {};
  const goalImpacts = impact.goalImpacts || [];
  const source = action.sources?.[0] || {};

  const toggleStep = (index) => {
    const newChecked = new Set(checkedSteps);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedSteps(newChecked);
  };

  const handleExecute = async () => {
    const timestamp = new Date().toISOString();
    setExecutedAt(timestamp);
    setLifecycle('executed');
    if (onExecute) await onExecute(timestamp);
  };

  const handleObserve = async () => {
    setLifecycle('observed');
    if (onObserve) await onObserve(observation.trim() || null);
    setTimeout(() => onClose(), 500);
  };

  // Source styling
  const sourceConfig = {
    'ISSUE': { bg: 'bg-bb-red/10', text: 'text-bb-red', border: 'border-bb-red' },
    'PREISSUE': { bg: 'bg-bb-amber/10', text: 'text-bb-amber', border: 'border-bb-amber' },
    'INTRODUCTION': { bg: 'bg-bb-blue/10', text: 'text-bb-blue', border: 'border-bb-blue' }
  };
  const sourceStyle = sourceConfig[source.sourceType] || { bg: 'bg-bb-border', text: 'text-bb-text-muted', border: 'border-bb-border' };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-bb-darker border border-bb-border rounded shadow-fm m-4 flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-bb-panel border-b border-bb-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Entity + Source */}
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href={routeForEntity(action.entityRef?.type, action.entityRef?.id)}
                  className="font-mono text-sm text-bb-text-secondary hover:text-bb-lime transition-colors"
                >
                  {action.entityRef?.name || 'Unknown'}
                </Link>
                <span className={`bb-badge ${sourceStyle.bg} ${sourceStyle.text} border ${sourceStyle.border}`}>
                  {source.sourceType || 'ACTION'}
                </span>
                {lifecycle !== 'proposed' && (
                  <span className={`bb-badge ${
                    lifecycle === 'executed' ? 'bg-bb-amber/10 text-bb-amber border-bb-amber' :
                    'bg-bb-green/10 text-bb-green border-bb-green'
                  } border`}>
                    {lifecycle.toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Title */}
              <h2 className="font-display text-xl text-bb-text leading-tight">
                {action.title}
              </h2>
            </div>
            
            {/* Close button */}
            <button 
              onClick={onClose}
              className="p-2 text-bb-text-muted hover:text-bb-lime transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {/* Impact Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bb-card border border-bb-border border-l-2 border-l-bb-lime p-4">
              <div className="font-mono text-3xl font-bold text-bb-lime mb-1">
                {impact.upsideMagnitude || '—'}
              </div>
              <div className="font-display uppercase text-[10px] tracking-widest text-bb-text-muted">
                Upside Magnitude
              </div>
            </div>
            
            <div className="bg-bb-card border border-bb-border border-l-2 border-l-bb-blue p-4">
              <div className="font-mono text-3xl font-bold text-bb-blue mb-1">
                {impact.probabilityOfSuccess ? `${Math.round(impact.probabilityOfSuccess * 100)}%` : '—'}
              </div>
              <div className="font-display uppercase text-[10px] tracking-widest text-bb-text-muted">
                Success Probability
              </div>
            </div>
            
            <div className="bg-bb-card border border-bb-border border-l-2 border-l-bb-amber p-4">
              <div className="font-mono text-3xl font-bold text-bb-amber mb-1">
                {action.rankScore?.toFixed(1) || '—'}
              </div>
              <div className="font-display uppercase text-[10px] tracking-widest text-bb-text-muted">
                Rank Score
              </div>
            </div>
          </div>

          {/* Impact Explanation */}
          {impact.upsideExplain && (
            <div className="bg-bb-card border border-bb-border border-l-2 border-l-bb-blue p-4">
              <div className="font-display uppercase text-[10px] tracking-widest text-bb-text-muted mb-2">
                Impact Rationale
              </div>
              <p className="text-sm text-bb-text-secondary leading-relaxed">
                {impact.upsideExplain}
              </p>
            </div>
          )}

          {/* Goal Impacts */}
          {goalImpacts.length > 0 && (
            <div>
              <h3 className="bb-section-header">Goal Impacts</h3>
              <div className="space-y-2">
                {goalImpacts.map((gi, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between bg-bb-card border border-bb-border p-3 rounded"
                  >
                    <span className="text-sm text-bb-text">{gi.goal}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1 bg-bb-border rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-bb-green rounded-full"
                          style={{ width: `${Math.min(100, gi.lift)}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm text-bb-green">+{gi.lift}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Context */}
          {(source.issueType || source.preIssueType) && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-display uppercase text-[10px] tracking-widest text-bb-text-muted">
                Source:
              </span>
              <span className="font-mono text-bb-text-secondary">
                {source.issueType || source.preIssueType}
              </span>
            </div>
          )}

          {/* Steps Checklist */}
          {action.steps && action.steps.length > 0 && (
            <div>
              <h3 className="bb-section-header">Action Steps</h3>
              <div className="space-y-2">
                {action.steps.map((step, index) => (
                  <label 
                    key={index} 
                    className="flex items-start gap-3 p-3 bg-bb-card border border-bb-border rounded cursor-pointer hover:border-bb-border-light transition-colors"
                  >
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={checkedSteps.has(index)}
                        onChange={() => toggleStep(index)}
                        className="sr-only"
                      />
                      <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                        ${checkedSteps.has(index) 
                          ? 'bg-bb-lime border-bb-lime' 
                          : 'border-bb-border hover:border-bb-lime'
                        }
                      `}>
                        {checkedSteps.has(index) && (
                          <svg className="w-3 h-3 text-bb-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm flex-1 ${
                      checkedSteps.has(index) ? 'text-bb-text-muted line-through' : 'text-bb-text'
                    }`}>
                      {typeof step === 'string' ? step : step.action}
                    </span>
                  </label>
                ))}
              </div>
              
              {/* Progress indicator */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1 bg-bb-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-bb-lime transition-all duration-300"
                    style={{ width: `${(checkedSteps.size / action.steps.length) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-bb-text-muted">
                  {checkedSteps.size}/{action.steps.length}
                </span>
              </div>
            </div>
          )}

          {/* Observation Input (after execution) */}
          {lifecycle === 'executed' && (
            <div>
              <h3 className="bb-section-header">Observation Notes</h3>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="What happened? (optional)"
                className="w-full p-4 bg-bb-card border border-bb-border rounded resize-none focus:border-bb-lime focus:outline-none text-sm text-bb-text placeholder-bb-text-muted"
                rows={4}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 bg-bb-panel border-t border-bb-border px-6 py-4">
          {lifecycle === 'proposed' && (
            <div className="flex items-center gap-4">
              <button
                onClick={handleExecute}
                className="flex-1 px-6 py-3 bg-bb-lime text-bb-dark font-display font-semibold uppercase text-sm tracking-wider rounded hover:bg-bb-lime-dim transition-colors"
              >
                Mark Executed
              </button>
              <button
                onClick={() => { onSkip?.(); onClose(); }}
                className="px-6 py-3 border border-bb-border text-bb-text-muted hover:text-bb-text hover:border-bb-border-light transition-colors rounded"
              >
                Skip
              </button>
            </div>
          )}
          
          {lifecycle === 'executed' && (
            <button
              onClick={handleObserve}
              className="w-full px-6 py-3 bg-bb-lime text-bb-dark font-display font-semibold uppercase text-sm tracking-wider rounded hover:bg-bb-lime-dim transition-colors"
            >
              {observation.trim() ? 'Save & Continue' : 'Continue'}
            </button>
          )}
          
          {lifecycle === 'observed' && (
            <div className="text-center py-2">
              <span className="font-mono text-sm text-bb-green flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                RECORDED
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
