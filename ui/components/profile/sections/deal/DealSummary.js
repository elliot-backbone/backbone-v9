/**
 * DealSummary Section
 * Displays deal overview
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function DealSummary({ entity, profileData }) {
  if (!profileData?.summary) {
    return (
      <SectionWrapper label="Deal Summary">
        <EmptyState message="No deal summary available" />
      </SectionWrapper>
    );
  }

  const { summary } = profileData;

  return (
    <SectionWrapper label="Deal Summary">
      <div className="space-y-3">
        {summary.company && (
          <div className="text-sm">
            <span className="text-gray-500">Company:</span>{' '}
            <span className="font-medium">{summary.company}</span>
          </div>
        )}
        {summary.stage && (
          <div className="text-sm">
            <span className="text-gray-500">Stage:</span>{' '}
            <span className="font-medium">{summary.stage}</span>
          </div>
        )}
        {summary.amount && (
          <div className="text-sm">
            <span className="text-gray-500">Amount:</span>{' '}
            <span className="font-medium">${summary.amount}</span>
          </div>
        )}
        {summary.status && (
          <div className="text-sm">
            <span className="text-gray-500">Status:</span>{' '}
            <span className="font-medium">{summary.status}</span>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
