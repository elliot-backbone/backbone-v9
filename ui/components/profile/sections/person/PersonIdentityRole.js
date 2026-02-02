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
            <span className="text-bb-text-muted">Role:</span>{' '}
            <span className="font-medium">{role}</span>
          </div>
        )}
        {org && (
          <div className="text-sm">
            <span className="text-bb-text-muted">Organization:</span>{' '}
            <EntityLink type="company" id={org.id} className="font-medium text-bb-blue hover:underline">
              {org.name}
            </EntityLink>
            {orgType && <span className="text-bb-text-muted ml-1">({orgType})</span>}
          </div>
        )}
        {tags && tags.length > 0 && (
          <div className="text-sm">
            <span className="text-bb-text-muted">Tags:</span>{' '}
            <span className="text-bb-text-secondary">
              {tags.map((tag, i) => (
                <span key={tag} className="inline-block bg-bb-card px-2 py-0.5 rounded text-xs mr-1 mb-1">
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
