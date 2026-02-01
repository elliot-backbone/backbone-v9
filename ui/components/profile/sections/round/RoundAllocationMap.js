/**
 * Round Allocation Map Section [C2]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include (if available): committed, soft-circled, open capacity
 * - Presentation rule: simple table or list, no charts
 * - Read-only display
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';
import { ENTITY_TYPES } from '../../../../lib/entities/entityTypes';

function AllocationRow({ label, amount, percentage, participants }) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-900">
          {amount !== undefined && amount !== null
            ? `$${(amount / 1_000_000).toFixed(1)}M`
            : <span className="text-gray-400">—</span>
          }
          {percentage !== undefined && (
            <span className="text-gray-400 ml-2 text-xs">({percentage}%)</span>
          )}
        </span>
      </div>
      {participants && participants.length > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          {participants.map((p, i) => (
            <span key={p.id || i}>
              {i > 0 && ', '}
              <EntityLink
                type={p.type || ENTITY_TYPES.FIRM}
                id={p.id}
                name={p.name}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.data - Round data with allocation information
 */
export default function RoundAllocationMap({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Allocation Map">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const { committed, softCircled, openCapacity, targetAmount } = data;
  
  // Check if any allocation data exists
  const hasAllocationData = 
    committed !== undefined || 
    softCircled !== undefined || 
    openCapacity !== undefined;
  
  if (!hasAllocationData) {
    return (
      <SectionWrapper title="Allocation Map">
        <EmptyState message="No allocation data available" />
      </SectionWrapper>
    );
  }
  
  // Calculate percentages if target exists
  const calcPercentage = (value) => {
    if (value === undefined || !targetAmount) return undefined;
    return Math.round((value / targetAmount) * 100);
  };
  
  return (
    <SectionWrapper title="Allocation Map">
      <div className="divide-y divide-gray-100">
        <AllocationRow 
          label="Committed" 
          amount={committed?.amount ?? committed}
          percentage={calcPercentage(committed?.amount ?? committed)}
          participants={committed?.participants}
        />
        <AllocationRow 
          label="Soft-circled" 
          amount={softCircled?.amount ?? softCircled}
          percentage={calcPercentage(softCircled?.amount ?? softCircled)}
          participants={softCircled?.participants}
        />
        <AllocationRow 
          label="Open Capacity" 
          amount={openCapacity}
          percentage={calcPercentage(openCapacity)}
        />
      </div>
    </SectionWrapper>
  );
}
