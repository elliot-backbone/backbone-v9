/**
 * PersonIdentityRole Section
 * Displays person's identity and current role
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

export default function PersonIdentityRole({ entity, profileData }) {
  if (!profileData?.identity) {
    return (
      <SectionWrapper label="Identity & Role">
        <EmptyState message="No identity data available" />
      </SectionWrapper>
    );
  }

  const { identity } = profileData;

  return (
    <SectionWrapper label="Identity & Role">
      <div className="space-y-3">
        {identity.title && (
          <div className="text-sm">
            <span className="text-gray-500">Title:</span>{' '}
            <span className="font-medium">{identity.title}</span>
          </div>
        )}
        {identity.company && (
          <div className="text-sm">
            <span className="text-gray-500">Company:</span>{' '}
            <span className="font-medium">{identity.company}</span>
          </div>
        )}
        {identity.bio && (
          <p className="text-sm text-gray-600">{identity.bio}</p>
        )}
      </div>
    </SectionWrapper>
  );
}
