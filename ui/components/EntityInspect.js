import { useState } from 'react';

/**
 * UI-1 Entity Inspection View
 * 
 * Doctrine compliance:
 * - Inspect only, never suggests decisions
 * - Collapsed by default (progressive disclosure)
 * - Raw data only, no derived fields (scores, ranks, confidence)
 * - Close returns to unchanged UI-0
 */
export default function EntityInspect({ entityRef, onClose }) {
  if (!entityRef) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="mb-8 text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back
        </button>

        {/* Entity header */}
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-1">{entityRef.type}</div>
          <h1 className="text-2xl font-normal text-gray-900">{entityRef.name}</h1>
        </div>

        {/* Raw entity data */}
        <dl className="space-y-4">
          <div>
            <dt className="text-sm text-gray-500">ID</dt>
            <dd className="font-mono text-gray-800">{entityRef.id}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Type</dt>
            <dd className="text-gray-800">{entityRef.type}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Name</dt>
            <dd className="text-gray-800">{entityRef.name}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
