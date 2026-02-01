/**
 * Goal Definition Section [C1]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Must include: explicit objective statement, owner (Company and/or Person link)
 * - Read-only display
 * - No invented content
 */

import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';
import { ENTITY_TYPES } from '../../../../lib/entities/entityTypes';

/**
 * @param {Object} props
 * @param {Object} props.data - Goal data
 */
export default function GoalDefinition({ data }) {
  if (!data) {
    return (
      <SectionWrapper title="Goal Definition">
        <EmptyState />
      </SectionWrapper>
    );
  }
  
  const { objective, description, owner, company, targetDate, status } = data;
  
  // Objective statement is the primary content
  const objectiveText = objective || description;
  
  return (
    <SectionWrapper title="Goal Definition">
      {/* Objective statement */}
      <div className="mb-4">
        {objectiveText ? (
          <p className="text-sm text-gray-800">{objectiveText}</p>
        ) : (
          <p className="text-sm text-gray-400">No objective statement</p>
        )}
      </div>
      
      {/* Metadata */}
      <dl className="text-sm">
        {/* Owner (Person) */}
        {owner && (
          <div className="flex py-1">
            <dt className="w-28 text-gray-500 flex-shrink-0">Owner</dt>
            <dd className="text-gray-800">
              <EntityLink
                type={ENTITY_TYPES.PERSON}
                id={owner.id}
                name={owner.name}
              />
            </dd>
          </div>
        )}
        
        {/* Company */}
        {company && (
          <div className="flex py-1">
            <dt className="w-28 text-gray-500 flex-shrink-0">Company</dt>
            <dd className="text-gray-800">
              <EntityLink
                type={ENTITY_TYPES.COMPANY}
                id={company.id}
                name={company.name}
              />
            </dd>
          </div>
        )}
        
        {/* Target date if available */}
        {targetDate && (
          <div className="flex py-1">
            <dt className="w-28 text-gray-500 flex-shrink-0">Target Date</dt>
            <dd className="text-gray-800">
              {new Date(targetDate).toLocaleDateString()}
            </dd>
          </div>
        )}
        
        {/* Status if available */}
        {status && (
          <div className="flex py-1">
            <dt className="w-28 text-gray-500 flex-shrink-0">Status</dt>
            <dd className="text-gray-800">{status}</dd>
          </div>
        )}
      </dl>
    </SectionWrapper>
  );
}
