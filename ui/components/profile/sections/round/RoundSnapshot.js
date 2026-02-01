/**
 * Round Snapshot Section [C1]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include: round type, valuation band (if available), close target date (if available)
 * - No invented heuristics
 * - Read-only display
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

function DataRow({ label, value }) {
  return (
    <div className="flex py-1">
      <dt className="w-36 text-sm text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-800">
        {value || <span className="text-gray-400">Not available</span>}
      </dd>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.data - Round data
 */
export default function RoundSnapshot({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Round Snapshot">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  // Format valuation if available
  const valuationDisplay = data.valuationBand || data.valuation 
    ? (data.valuationBand || `$${(data.valuation / 1_000_000).toFixed(0)}M`)
    : null;
  
  // Format close date if available
  const closeDateDisplay = data.closeTargetDate 
    ? new Date(data.closeTargetDate).toLocaleDateString()
    : null;
  
  return (
    <SectionWrapper title="Round Snapshot">
      <dl>
        <DataRow label="Round Type" value={data.type || data.roundType} />
        <DataRow label="Valuation" value={valuationDisplay} />
        <DataRow label="Target Close" value={closeDateDisplay} />
        {data.targetAmount && (
          <DataRow 
            label="Target Amount" 
            value={`$${(data.targetAmount / 1_000_000).toFixed(1)}M`} 
          />
        )}
        {data.status && (
          <DataRow label="Status" value={data.status} />
        )}
      </dl>
    </SectionWrapper>
  );
}
