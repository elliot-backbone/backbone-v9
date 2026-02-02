/**
 * Goal Trajectory Section [C2]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include (derived if defined): progress vs expectation, time pressure
 * - If not defined by engine, omit cleanly
 * - No invented heuristics
 * - Read-only display
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

function ProgressIndicator({ label, value, expected, unit }) {
  // Only show if we have actual data
  if (value === undefined && expected === undefined) {
    return null;
  }
  
  // Determine status color (semantic only per contract)
  let statusColor = 'text-bb-text-secondary';
  if (value !== undefined && expected !== undefined) {
    if (value >= expected) {
      statusColor = 'text-bb-green';
    } else if (value >= expected * 0.7) {
      statusColor = 'text-bb-amber';
    } else {
      statusColor = 'text-bb-red';
    }
  }
  
  return (
    <div className="py-2 border-b border-bb-border last:border-0">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-bb-text-secondary">{label}</span>
        <span className={`text-sm font-medium ${statusColor}`}>
          {value !== undefined ? (
            <>
              {value}{unit && ` ${unit}`}
              {expected !== undefined && (
                <span className="text-bb-text-muted font-normal ml-1">
                  / {expected}{unit && ` ${unit}`} expected
                </span>
              )}
            </>
          ) : (
            <span className="text-bb-text-muted">Not available</span>
          )}
        </span>
      </div>
    </div>
  );
}

function TimePressureIndicator({ pressure, daysRemaining, targetDate }) {
  // Semantic color based on pressure level
  const pressureStyles = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-amber-50 border-amber-200 text-amber-800',
    low: 'bg-green-50 border-green-200 text-bb-green',
  };
  
  const style = pressureStyles[pressure] || 'bg-bb-panel border-bb-border text-bb-text-secondary';
  
  return (
    <div className={`mt-3 py-2 px-3 border rounded text-sm ${style}`}>
      <div className="flex justify-between items-center">
        <span>Time Pressure</span>
        <span className="font-medium uppercase text-xs tracking-wide">
          {pressure || 'Unknown'}
        </span>
      </div>
      {(daysRemaining !== undefined || targetDate) && (
        <div className="mt-1 text-xs opacity-75">
          {daysRemaining !== undefined && `${daysRemaining} days remaining`}
          {daysRemaining !== undefined && targetDate && ' · '}
          {targetDate && `Target: ${new Date(targetDate).toLocaleDateString()}`}
        </div>
      )}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.data - Goal data with trajectory information
 */
export default function GoalTrajectory({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Trajectory">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const { 
    trajectory, 
    progress, 
    expected, 
    timePressure, 
    daysRemaining,
    targetDate,
    milestones 
  } = data;
  
  // Check if any trajectory data exists
  const hasTrajectoryData = 
    trajectory !== undefined ||
    progress !== undefined ||
    timePressure !== undefined ||
    (milestones && milestones.length > 0);
  
  if (!hasTrajectoryData) {
    return (
      <SectionWrapper title="Trajectory">
        <EmptyState message="No trajectory data available" />
      </SectionWrapper>
    );
  }
  
  return (
    <SectionWrapper title="Trajectory">
      {/* Progress vs expectation */}
      {(progress !== undefined || expected !== undefined) && (
        <div className="mb-2">
          <ProgressIndicator
            label="Progress"
            value={progress}
            expected={expected}
            unit="%"
          />
        </div>
      )}
      
      {/* Trajectory data if provided as object */}
      {trajectory && typeof trajectory === 'object' && (
        <div className="mb-2">
          <ProgressIndicator
            label={trajectory.label || 'Progress'}
            value={trajectory.current}
            expected={trajectory.expected}
            unit={trajectory.unit}
          />
        </div>
      )}
      
      {/* Milestones if available */}
      {milestones && milestones.length > 0 && (
        <div className="mb-2">
          {milestones.map((m, i) => (
            <ProgressIndicator
              key={m.id || i}
              label={m.name || `Milestone ${i + 1}`}
              value={m.complete ? 100 : m.progress}
              expected={100}
              unit="%"
            />
          ))}
        </div>
      )}
      
      {/* Time pressure indicator */}
      {(timePressure || daysRemaining !== undefined) && (
        <TimePressureIndicator
          pressure={timePressure}
          daysRemaining={daysRemaining}
          targetDate={targetDate}
        />
      )}
    </SectionWrapper>
  );
}
