/**
 * FirmPortfolioExposure Section
 * Displays firm's portfolio companies
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function FirmPortfolioExposure({ entity, profileData }) {
  if (!profileData?.portfolio || profileData.portfolio.length === 0) {
    return (
      <SectionWrapper label="Portfolio Exposure">
        <EmptyState message="No portfolio data available" />
      </SectionWrapper>
    );
  }

  const { portfolio } = profileData;

  return (
    <SectionWrapper label="Portfolio Exposure">
      <div className="space-y-2">
        {portfolio.map((company, i) => (
          <div key={i} className="text-sm p-2 bg-gray-50 rounded">
            <div className="font-medium">{company.name}</div>
            {company.stage && (
              <div className="text-xs text-gray-500">{company.stage}</div>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
