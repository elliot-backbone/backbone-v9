/**
 * PersonIdentityRole Section
 * Displays person's identity and current role
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [P1]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

export default function PersonIdentityRole({ data }) {
  if (!data) {
    return (
      <SectionWrapper label="Identity & Role">
        <EmptyState message="No identity data available" />
      </SectionWrapper>
    );
  }

  const { name, role, orgType, org, tags } = data;

  return (
    <SectionWrapper label="Identity & Role">
      <div className="space-y-3">
        {role && (
          <div className="text-sm">
            <span className="text-gray-500">Role:</span>{' '}
            <span className="font-medium">{role}</span>
          </div>
        )}
        {org && (
          <div className="text-sm">
            <span className="text-gray-500">Organization:</span>{' '}
            <EntityLink type="company" id={org.id} className="font-medium text-blue-600 hover:underline">
              {org.name}
            </EntityLink>
            {orgType && <span className="text-gray-400 ml-1">({orgType})</span>}
          </div>
        )}
        {tags && tags.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-500">Tags:</span>{' '}
            <span className="text-gray-700">
              {tags.map((tag, i) => (
                <span key={tag} className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs mr-1 mb-1">
                  {tag}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
