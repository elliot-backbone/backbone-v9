/**
 * Entity Section Registry
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Fixed section order per entity type (cannot drift via ad-hoc composition)
 * - Registry-driven rendering ensures structural consistency
 * - Missing data never removes sections; sections render explicit empty states
 * 
 * Section order (from contract):
 * - Company: Snapshot → Core Metrics → Relationships → Goals & Issues
 * - Person: Identity & Role → Relationship Map → Activity Signals
 * - Firm: Firm Snapshot → Internal Structure → Portfolio Exposure → Relationship State
 * - Deal: Deal Summary → Participants → Process State
 * - Round: Round Snapshot → Allocation Map → Risk Factors
 * - Goal: Goal Definition → Trajectory → Blocking Issues
 * - Issue: Issue Definition → Impact Surface → Candidate Actions
 * - Action: Action Definition → Impact Rationale → Dependencies
 */

import { ENTITY_TYPES } from '../../../lib/entities/entityTypes';

// Company sections
import CompanySnapshot from './company/CompanySnapshot';
import CompanyFunding from './company/CompanyFunding';
import CompanyCoreMetrics from './company/CompanyCoreMetrics';
import CompanyRelationships from './company/CompanyRelationships';
import CompanyGoalsIssues from './company/CompanyGoalsIssues';

// Person sections
import PersonIdentityRole from './person/PersonIdentityRole';
import PersonRelationshipMap from './person/PersonRelationshipMap';
import PersonActivitySignals from './person/PersonActivitySignals';

// Firm sections
import FirmSnapshot from './firm/FirmSnapshot';
import FirmInternalStructure from './firm/FirmInternalStructure';
import FirmPortfolioExposure from './firm/FirmPortfolioExposure';
import FirmRelationshipState from './firm/FirmRelationshipState';

// Deal sections
import DealSummary from './deal/DealSummary';
import DealParticipants from './deal/DealParticipants';
import DealProcessState from './deal/DealProcessState';

// Round sections
import RoundSnapshot from './round/RoundSnapshot';
import RoundAllocationMap from './round/RoundAllocationMap';
import RoundRiskFactors from './round/RoundRiskFactors';

// Goal sections
import GoalDefinition from './goal/GoalDefinition';
import GoalTrajectory from './goal/GoalTrajectory';
import GoalBlockingIssues from './goal/GoalBlockingIssues';

// Issue sections
import IssueDefinition from './issue/IssueDefinition';
import IssueImpactSurface from './issue/IssueImpactSurface';
import IssueCandidateActions from './issue/IssueCandidateActions';

// Action sections
import ActionDefinition from './action/ActionDefinition';
import ActionImpactRationale from './action/ActionImpactRationale';
import ActionDependencies from './action/ActionDependencies';

/**
 * Section registry - maps entity type to ordered array of section descriptors
 * 
 * Each descriptor contains:
 * - key: unique identifier for React key
 * - component: React component to render
 * - label: section header label
 */
const SECTION_REGISTRY = {
  [ENTITY_TYPES.COMPANY]: [
    { key: 'snapshot', component: CompanySnapshot, label: 'Snapshot' },
    { key: 'funding', component: CompanyFunding, label: 'Funding History' },
    { key: 'core-metrics', component: CompanyCoreMetrics, label: 'Core Metrics' },
    { key: 'relationships', component: CompanyRelationships, label: 'Relationships' },
    { key: 'goals-issues', component: CompanyGoalsIssues, label: 'Goals & Issues' },
  ],
  
  [ENTITY_TYPES.PERSON]: [
    { key: 'identity-role', component: PersonIdentityRole, label: 'Identity & Role' },
    { key: 'relationship-map', component: PersonRelationshipMap, label: 'Relationship Map' },
    { key: 'activity-signals', component: PersonActivitySignals, label: 'Activity Signals' },
  ],
  
  [ENTITY_TYPES.FIRM]: [
    { key: 'snapshot', component: FirmSnapshot, label: 'Firm Snapshot' },
    { key: 'internal-structure', component: FirmInternalStructure, label: 'Internal Structure' },
    { key: 'portfolio-exposure', component: FirmPortfolioExposure, label: 'Portfolio Exposure' },
    { key: 'relationship-state', component: FirmRelationshipState, label: 'Relationship State' },
  ],
  
  [ENTITY_TYPES.DEAL]: [
    { key: 'summary', component: DealSummary, label: 'Deal Summary' },
    { key: 'participants', component: DealParticipants, label: 'Participants' },
    { key: 'process-state', component: DealProcessState, label: 'Process State' },
  ],
  
  [ENTITY_TYPES.ROUND]: [
    { key: 'snapshot', component: RoundSnapshot, label: 'Round Snapshot' },
    { key: 'allocation-map', component: RoundAllocationMap, label: 'Allocation Map' },
    { key: 'risk-factors', component: RoundRiskFactors, label: 'Risk Factors' },
  ],
  
  [ENTITY_TYPES.GOAL]: [
    { key: 'definition', component: GoalDefinition, label: 'Goal Definition' },
    { key: 'trajectory', component: GoalTrajectory, label: 'Trajectory' },
    { key: 'blocking-issues', component: GoalBlockingIssues, label: 'Blocking Issues' },
  ],
  
  [ENTITY_TYPES.ISSUE]: [
    { key: 'definition', component: IssueDefinition, label: 'Issue Definition' },
    { key: 'impact-surface', component: IssueImpactSurface, label: 'Impact Surface' },
    { key: 'candidate-actions', component: IssueCandidateActions, label: 'Candidate Actions' },
  ],
  
  [ENTITY_TYPES.ACTION]: [
    { key: 'definition', component: ActionDefinition, label: 'Action Definition' },
    { key: 'impact-rationale', component: ActionImpactRationale, label: 'Impact Rationale' },
    { key: 'dependencies', component: ActionDependencies, label: 'Dependencies' },
  ],
};

/**
 * Get ordered section descriptors for an entity type
 * 
 * @param {string} type - Entity type from ENTITY_TYPES
 * @returns {Array<{ key: string, component: React.Component, label: string }>}
 */
export function getSectionsForEntityType(type) {
  const sections = SECTION_REGISTRY[type];
  
  if (!sections) {
    console.warn(`No sections registered for entity type: ${type}`);
    return [];
  }
  
  return sections;
}

/**
 * Check if an entity type has registered sections
 * 
 * @param {string} type - Entity type
 * @returns {boolean}
 */
export function hasRegisteredSections(type) {
  return Boolean(SECTION_REGISTRY[type]?.length);
}

/**
 * Get all registered entity types
 * 
 * @returns {string[]}
 */
export function getRegisteredEntityTypes() {
  return Object.keys(SECTION_REGISTRY);
}

export default SECTION_REGISTRY;
