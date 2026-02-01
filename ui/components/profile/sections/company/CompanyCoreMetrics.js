/**
 * CompanyCoreMetrics Section
 * Displays key company metrics: ARR, runway, team size
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function CompanyCoreMetrics({ entity, profileData }) {
  if (!profileData?.metrics) {
    return (
      <SectionWrapper label="Core Metrics">
        <EmptyState message="No metrics data available" />
      </SectionWrapper>
    );
  }

  const { metrics } = profileData;

  return (
    <SectionWrapper label="Core Metrics">
      <div className="grid grid-cols-2 gap-4">
        {metrics.arr && (
          <div>
            <div className="text-xs text-gray-500 uppercase">ARR</div>
            <div className="text-lg font-semibold">${(metrics.arr / 1000000).toFixed(1)}M</div>
          </div>
        )}
        {metrics.runway && (
          <div>
            <div className="text-xs text-gray-500 uppercase">Runway</div>
            <div className="text-lg font-semibold">{metrics.runway} months</div>
          </div>
        )}
        {metrics.teamSize && (
          <div>
            <div className="text-xs text-gray-500 uppercase">Team Size</div>
            <div className="text-lg font-semibold">{metrics.teamSize}</div>
          </div>
        )}
        {metrics.growth && (
          <div>
            <div className="text-xs text-gray-500 uppercase">Growth</div>
            <div className="text-lg font-semibold">{metrics.growth}%</div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
