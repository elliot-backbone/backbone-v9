import { useState } from 'react';
import Link from 'next/link';
import { routeForEntity } from '../lib/entities/routeForEntity';

/**
 * ActionDetailModal - Full action breakdown with impact model visibility
 * 
 * Shows:
 * - Action title and entity context
 * - Impact breakdown (upside, probability, effort)
 * - Goal impacts with lift percentages
 * - Step checklist
 * - Execute/Skip lifecycle controls
 */
export default function ActionDetailModal({ 
  action, 
  onClose, 
  onExecute, 
  onSkip,
  onObserve 
}) {
  const [lifecycle, setLifecycle] = useState('proposed'); // proposed | executed | observed
  const [executedAt, setExecutedAt] = useState(null);
  const [observation, setObservation] = useState('');
  const [checkedSteps, setCheckedSteps] = useState(new Set());

  if (!action) return null;

  const impact = action.impact || {};
  const goalImpacts = impact.goalImpacts || [];
  const source = action.sources?.[0] || {};

  // Toggle step completion
  const toggleStep = (index) => {
    const newChecked = new Set(checkedSteps);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedSteps(newChecked);
  };

  // Handle execution
  const handleExecute = async () => {
    const timestamp = new Date().toISOString();
    setExecutedAt(timestamp);
    setLifecycle('executed');
    if (onExecute) await onExecute(timestamp);
  };

  // Handle observation
  const handleObserve = async () => {
    setLifecycle('observed');
    if (onObserve) await onObserve(observation.trim() || null);
    // Close modal after observation
    setTimeout(() => onClose(), 500);
  };

  // Source type badge color
  const sourceColor = {
    'ISSUE': 'bg-red-100 text-red-700',
    'PREISSUE': 'bg-amber-100 text-amber-700',
    'INTRODUCTION': 'bg-blue-100 text-blue-700'
  }[source.sourceType] || 'bg-gray-100 text-gray-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl m-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Entity + Source badge */}
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href={routeForEntity(action.entityRef?.type, action.entityRef?.id)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {action.entityRef?.name || 'Unknown'}
                </Link>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${sourceColor}`}>
                  {source.sourceType || 'ACTION'}
                </span>
              </div>
              
              {/* Title */}
              <h2 className="text-xl font-medium text-gray-900">
                {action.title}
              </h2>
            </div>
            
            {/* Close button */}
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 -mr-2 -mt-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          
          {/* Impact metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-2xl font-semibold text-gray-900">
                {impact.upsideMagnitude || '—'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Upside</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-2xl font-semibold text-gray-900">
                {impact.probabilityOfSuccess ? `${Math.round(impact.probabilityOfSuccess * 100)}%` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Success Prob</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-2xl font-semibold text-gray-900">
                {action.rankScore?.toFixed(1) || '—'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Rank Score</div>
            </div>
          </div>

          {/* Impact explanation */}
          {impact.upsideExplain && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              {impact.upsideExplain}
            </div>
          )}

          {/* Goal impacts */}
          {goalImpacts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Goal Impacts</h3>
              <div className="space-y-2">
                {goalImpacts.map((gi, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{gi.goal}</span>
                    <span className="text-sm font-medium text-green-600">+{gi.lift}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issue/Preissue context */}
          {(source.issueType || source.preIssueType) && (
            <div className="text-sm">
              <span className="text-gray-500">Source: </span>
              <span className="text-gray-700">{source.issueType || source.preIssueType}</span>
            </div>
          )}

          {/* Steps */}
          {action.steps && action.steps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Steps</h3>
              <div className="space-y-2">
                {action.steps.map((step, index) => (
                  <label 
                    key={index} 
                    className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checkedSteps.has(index)}
                      onChange={() => toggleStep(index)}
                      className="mt-1 w-4 h-4 rounded border-gray-300"
                    />
                    <span className={`text-sm ${checkedSteps.has(index) ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {typeof step === 'string' ? step : step.action}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Observation input (after execution) */}
          {lifecycle === 'executed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What happened?
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Optional observation..."
                className="w-full p-3 border border-gray-300 rounded resize-none focus:outline-none focus:border-gray-500"
                rows={3}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          {lifecycle === 'proposed' && (
            <div className="flex items-center gap-4">
              <button
                onClick={handleExecute}
                className="flex-1 px-4 py-2.5 text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors"
              >
                Mark Executed
              </button>
              <button
                onClick={() => { onSkip?.(); onClose(); }}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Skip
              </button>
            </div>
          )}
          
          {lifecycle === 'executed' && (
            <div className="flex items-center gap-4">
              <button
                onClick={handleObserve}
                className="flex-1 px-4 py-2.5 text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors"
              >
                {observation.trim() ? 'Save & Continue' : 'Continue'}
              </button>
            </div>
          )}
          
          {lifecycle === 'observed' && (
            <div className="text-center text-gray-500 py-2">
              ✓ Recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
