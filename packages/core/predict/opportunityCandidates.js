/**
 * OPPORTUNITY Candidates Generator
 * 
 * Generates proactive, opportunity-sourced actions.
 * These are positive-sum actions independent of whether anything is "wrong".
 * 
 * ═══════════════════════════════════════════════════════════════
 * OPPORTUNITY CLASSES (v1 - exhaustive):
 * 1. Relationship Leverage
 * 2. Timing Windows
 * 3. Cross-Entity Synergy
 * 4. Goal Acceleration
 * 5. Optionality Builders
 * ═══════════════════════════════════════════════════════════════
 * 
 * @module opportunityCandidates
 */

import { ASSUMPTIONS, getTimingUrgency, computeOptionalityDiscount, getRelationshipBand } from '../raw/assumptions_policy.js';
import { createAction } from './actionSchema.js';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const OPPORTUNITY_CLASSES = {
  RELATIONSHIP_LEVERAGE: 'relationship_leverage',
  TIMING_WINDOW: 'timing_window',
  CROSS_ENTITY_SYNERGY: 'cross_entity_synergy',
  GOAL_ACCELERATION: 'goal_acceleration',
  OPTIONALITY_BUILDER: 'optionality_builder',
};

export const TIMING_WINDOW_TYPES = {
  CONFERENCE: 'conference',
  DEMO_DAY: 'demo_day',
  FUND_CYCLE: 'fund_cycle',
  ROLE_CHANGE: 'role_change',
  APPLICATION_DEADLINE: 'application_deadline',
};

export const SYNERGY_TYPES = {
  CUSTOMER_INTRO: 'customer_intro',
  TECH_PARTNERSHIP: 'tech_partnership',
  INVESTOR_FACILITATED: 'investor_facilitated',
  TALENT_SHARING: 'talent_sharing',
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  const diff = Math.abs(d2 - d1);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if date is within N months from now
 */
function isWithinMonths(dateStr, months, now = new Date()) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const futureDate = new Date(now);
  futureDate.setMonth(futureDate.getMonth() + months);
  return date <= futureDate;
}

/**
 * Calculate months until a date
 */
function monthsUntil(dateStr, now = new Date()) {
  if (!dateStr) return Infinity;
  const date = new Date(dateStr);
  const diffMs = date - now;
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30));
}

/**
 * Build relationship graph from relationships array
 */
function buildRelationshipGraph(relationships) {
  const graph = new Map();
  
  for (const rel of relationships) {
    // Forward edge
    if (!graph.has(rel.fromPersonId)) {
      graph.set(rel.fromPersonId, []);
    }
    graph.get(rel.fromPersonId).push({
      personId: rel.toPersonId,
      relationship: rel,
    });
    
    // Reverse edge (bidirectional)
    if (!graph.has(rel.toPersonId)) {
      graph.set(rel.toPersonId, []);
    }
    graph.get(rel.toPersonId).push({
      personId: rel.fromPersonId,
      relationship: { ...rel, _reversed: true },
    });
  }
  
  return graph;
}

/**
 * Find paths from sources to targets up to maxHops
 */
function findPaths(graph, sourceIds, targetIds, maxHops = 2) {
  const paths = [];
  const targetSet = new Set(targetIds);
  
  for (const sourceId of sourceIds) {
    const queue = [{
      personId: sourceId,
      path: [sourceId],
      relationships: [],
      visited: new Set([sourceId]),
    }];
    
    while (queue.length > 0) {
      const { personId, path, relationships, visited } = queue.shift();
      
      if (targetSet.has(personId) && path.length > 1) {
        paths.push({ path, relationships, sourceId, targetId: personId });
        continue;
      }
      
      if (path.length > maxHops) continue;
      
      const neighbors = graph.get(personId) || [];
      for (const { personId: nextId, relationship } of neighbors) {
        if (!visited.has(nextId)) {
          const newVisited = new Set(visited);
          newVisited.add(nextId);
          queue.push({
            personId: nextId,
            path: [...path, nextId],
            relationships: [...relationships, relationship],
            visited: newVisited,
          });
        }
      }
    }
  }
  
  return paths;
}

/**
 * Score a path based on relationship strengths
 */
function scorePath(path, relationships) {
  if (relationships.length === 0) return 0;
  
  const strengths = relationships.map(r => (r.strength || 50) / 100);
  const product = strengths.reduce((a, b) => a * b, 1);
  const geoMean = Math.pow(product, 1 / strengths.length);
  
  // Length penalty
  const lengthPenalty = Math.pow(0.7, relationships.length - 1);
  
  return geoMean * lengthPenalty;
}

/**
 * Check if a path is "obvious" (1-hop to frequent contact)
 */
function isObviousPath(pathData, relationships) {
  if (pathData.relationships.length > 1) return false; // Multi-hop is not obvious
  
  const rel = pathData.relationships[0];
  if (!rel) return false;
  
  // Check last touch - if within 30 days, it's obvious
  if (rel.lastTouchAt) {
    const daysSinceTouch = daysBetween(new Date(rel.lastTouchAt), new Date());
    if (daysSinceTouch < 30) return true;
  }
  
  // Very strong relationship is obvious
  if ((rel.strength || 0) >= 80) return true;
  
  return false;
}

// ═══════════════════════════════════════════════════════════════
// 1. RELATIONSHIP LEVERAGE OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Find targets for a goal based on goal type
 */
function findTargetsForGoal(goal, people, company, investors = []) {
  const targets = [];
  
  switch (goal.type) {
    case 'fundraise':
      // Find investors who match stage/sector
      for (const investor of investors) {
        if (matchesInvestorCriteria(investor, company)) {
          const person = people.find(p => p.id === investor.personId);
          if (person) {
            targets.push({
              person,
              investor,
              relevance: 'stage/sector match',
            });
          }
        }
      }
      break;
      
    case 'partnership':
      // Find people at relevant companies
      for (const person of people) {
        if (person.orgType === 'company' && person.orgId !== company.id) {
          if (couldBePartner(person, company)) {
            targets.push({
              person,
              relevance: 'potential partner',
            });
          }
        }
      }
      break;
      
    case 'hiring':
      // Find people who could be candidates or referrers
      for (const person of people) {
        if (couldHelpWithHiring(person, company)) {
          targets.push({
            person,
            relevance: 'hiring network',
          });
        }
      }
      break;
  }
  
  return targets;
}

function matchesInvestorCriteria(investor, company) {
  // Stage match
  const stageFocus = investor.stageFocus || '';
  if (stageFocus && !stageFocus.toLowerCase().includes(company.stage?.toLowerCase() || '')) {
    return false;
  }
  
  // Sector match
  const sectorFocus = investor.sectorFocus || '';
  if (sectorFocus && company.sector) {
    const sectors = sectorFocus.toLowerCase().split(/[,;]/);
    if (!sectors.some(s => company.sector.toLowerCase().includes(s.trim()))) {
      return false;
    }
  }
  
  return true;
}

function couldBePartner(person, company) {
  // Simple heuristic: different company, similar sector or complementary
  return person.orgId !== company.id;
}

function couldHelpWithHiring(person, company) {
  // People with relevant tags or in relevant orgs
  const tags = person.tags || [];
  return tags.some(t => 
    t.includes('hiring') || 
    t.includes('recruiting') || 
    t.includes('talent')
  );
}

/**
 * Generate Relationship Leverage opportunities
 */
export function generateRelationshipLeverageOpportunities({
  company,
  goals,
  people,
  relationships,
  team,
  investors = [],
  now = new Date(),
}) {
  const opportunities = [];
  const graph = buildRelationshipGraph(relationships);
  
  // Get team person IDs (potential introducers)
  const teamPersonIds = team.map(t => t.personId).filter(Boolean);
  const founderPersonIds = company.founderPersonIds || [];
  const introducerIds = [...new Set([...teamPersonIds, ...founderPersonIds])];
  
  if (introducerIds.length === 0) return opportunities;
  
  // Find goals that could benefit from intros
  const introRelevantGoals = goals.filter(g =>
    ['fundraise', 'partnership', 'hiring'].includes(g.type) &&
    g.status === 'active'
  );
  
  for (const goal of introRelevantGoals) {
    const targets = findTargetsForGoal(goal, people, company, investors);
    
    for (const target of targets) {
      const paths = findPaths(graph, introducerIds, [target.person.id], 2);
      
      if (paths.length === 0) continue;
      
      // Find best path
      const bestPath = paths.reduce((best, current) => {
        const currentScore = scorePath(current.path, current.relationships);
        const bestScore = scorePath(best.path, best.relationships);
        return currentScore > bestScore ? current : best;
      });
      
      // Skip if path is too obvious
      if (isObviousPath(bestPath, relationships)) continue;
      
      // Get introducer info
      const introducerId = bestPath.sourceId;
      const introducer = team.find(t => t.personId === introducerId) ||
                        people.find(p => p.id === introducerId);
      
      const pathDescription = bestPath.path
        .map(id => people.find(p => p.id === id)?.name || id)
        .join(' → ');
      
      opportunities.push(createAction({
        entityRef: { type: 'company', id: company.id, name: company.name },
        title: `Intro ${target.person.name} to ${company.name} via ${introducer?.name || 'connection'}`,
        sources: [{
          sourceType: 'OPPORTUNITY',
          opportunityClass: OPPORTUNITY_CLASSES.RELATIONSHIP_LEVERAGE,
          opportunityRationale: `${target.person.name} (${target.person.role || 'Contact'}) ` +
            `could help with ${goal.name}. Path: ${pathDescription}. ` +
            `Relevance: ${target.relevance}.`,
          pathLength: bestPath.path.length - 1,
          introducerId,
          targetPersonId: target.person.id,
        }],
        goalId: goal.id,
        impact: null, // Computed by actionImpact.js
        createdAt: now.toISOString(),
      }));
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════
// 2. TIMING WINDOW OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════

function eventMatchesGoal(event, goal) {
  const eventType = event.type?.toLowerCase() || '';
  const goalType = goal.type?.toLowerCase() || '';
  
  // Demo days and conferences match fundraise goals
  if (['demo_day', 'conference', 'pitch_event'].includes(eventType)) {
    return goalType === 'fundraise';
  }
  
  // Industry events match partnership goals
  if (eventType === 'industry_event') {
    return ['partnership', 'revenue'].includes(goalType);
  }
  
  // Hiring events match hiring goals
  if (['job_fair', 'recruiting_event'].includes(eventType)) {
    return goalType === 'hiring';
  }
  
  return false;
}

function roleChangeMatchesGoal(change, goal, company) {
  const newOrg = change.newOrg?.toLowerCase() || '';
  const newRole = change.newRole?.toLowerCase() || '';
  
  // Person moved to investor firm → fundraise relevance
  if (goal.type === 'fundraise') {
    if (newRole.includes('partner') || newRole.includes('investor') || newRole.includes('principal')) {
      return true;
    }
  }
  
  // Person moved to potential customer/partner
  if (goal.type === 'partnership' || goal.type === 'revenue') {
    // Would need more context about target companies
    return true;
  }
  
  return false;
}

/**
 * Generate Timing Window opportunities
 */
export function generateTimingWindowOpportunities({
  company,
  goals,
  externalEvents = [],
  investorFundCycles = [],
  roleChanges = [],
  now = new Date(),
}) {
  const opportunities = [];
  
  // Conference/event opportunities
  for (const event of externalEvents) {
    const eventDate = new Date(event.date);
    const daysUntil = daysBetween(now, eventDate);
    
    // Skip past events or too far future
    if (eventDate < now || daysUntil > 60) continue;
    
    const relevantGoals = goals.filter(g => 
      g.status === 'active' && eventMatchesGoal(event, g)
    );
    
    if (relevantGoals.length === 0) continue;
    
    const urgency = getTimingUrgency(daysUntil);
    
    opportunities.push(createAction({
      entityRef: { type: 'company', id: company.id, name: company.name },
      title: `${company.name}: Apply to ${event.name}`,
      sources: [{
        sourceType: 'OPPORTUNITY',
        opportunityClass: OPPORTUNITY_CLASSES.TIMING_WINDOW,
        opportunityRationale: `${event.name} on ${event.date} aligns with ${relevantGoals[0].name}. ` +
          `Deadline in ${daysUntil} days.`,
        timingWindowType: event.type || TIMING_WINDOW_TYPES.CONFERENCE,
        daysUntilWindow: daysUntil,
        urgency,
      }],
      goalId: relevantGoals[0].id,
      impact: null,
      createdAt: now.toISOString(),
    }));
  }
  
  // Fund cycle opportunities
  for (const cycle of investorFundCycles) {
    if (cycle.status !== 'deploying') continue;
    
    const fundraiseGoals = goals.filter(g => 
      g.type === 'fundraise' && g.status === 'active'
    );
    
    if (fundraiseGoals.length === 0) continue;
    
    opportunities.push(createAction({
      entityRef: { type: 'company', id: company.id, name: company.name },
      title: `${company.name}: Reach out to ${cycle.firmName} (deploying Fund ${cycle.fundNumber || ''})`,
      sources: [{
        sourceType: 'OPPORTUNITY',
        opportunityClass: OPPORTUNITY_CLASSES.TIMING_WINDOW,
        opportunityRationale: `${cycle.firmName} is actively deploying. ` +
          `Window closes ~${cycle.estimatedCloseDate || 'soon'}.`,
        timingWindowType: TIMING_WINDOW_TYPES.FUND_CYCLE,
        firmId: cycle.firmId,
      }],
      goalId: fundraiseGoals[0].id,
      impact: null,
      createdAt: now.toISOString(),
    }));
  }
  
  // Role change opportunities
  for (const change of roleChanges) {
    const daysSinceChange = daysBetween(new Date(change.changedAt), now);
    if (daysSinceChange > 90) continue; // Stale
    
    const relevantGoals = goals.filter(g =>
      g.status === 'active' && roleChangeMatchesGoal(change, g, company)
    );
    
    if (relevantGoals.length === 0) continue;
    
    opportunities.push(createAction({
      entityRef: { type: 'company', id: company.id, name: company.name },
      title: `${company.name}: Reconnect with ${change.personName} (now at ${change.newOrg})`,
      sources: [{
        sourceType: 'OPPORTUNITY',
        opportunityClass: OPPORTUNITY_CLASSES.TIMING_WINDOW,
        opportunityRationale: `${change.personName} moved to ${change.newOrg} ${daysSinceChange} days ago. ` +
          `New role: ${change.newRole}. Relevant to ${relevantGoals[0].name}.`,
        timingWindowType: TIMING_WINDOW_TYPES.ROLE_CHANGE,
        personId: change.personId,
        daysSinceChange,
      }],
      goalId: relevantGoals[0].id,
      impact: null,
      createdAt: now.toISOString(),
    }));
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════
// 3. CROSS-ENTITY SYNERGY OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════

function detectSynergy(companyA, companyB) {
  // Customer fit
  if (isCustomerFit(companyA, companyB)) {
    return {
      type: SYNERGY_TYPES.CUSTOMER_INTRO,
      direction: 'A→B',
      description: `${companyA.name} customer intro`,
      rationale: `${companyA.name} has customers in ${companyB.name}'s target segment`,
      goalTypes: ['revenue', 'partnership'],
    };
  }
  
  // Tech fit
  if (isTechFit(companyA, companyB)) {
    return {
      type: SYNERGY_TYPES.TECH_PARTNERSHIP,
      direction: 'bidirectional',
      description: 'Tech partnership potential',
      rationale: `Complementary capabilities: ${companyA.sector} + ${companyB.sector}`,
      goalTypes: ['partnership', 'product'],
    };
  }
  
  return null;
}

function isCustomerFit(companyA, companyB) {
  // Simple heuristic: B2B company A could sell to company B's segment
  // Would need richer data in production
  return false; // Conservative default
}

function isTechFit(companyA, companyB) {
  // Check for complementary sectors
  const sectorA = companyA.sector?.toLowerCase() || '';
  const sectorB = companyB.sector?.toLowerCase() || '';
  
  // Some known complementary pairs
  const complementary = [
    ['fintech', 'security'],
    ['healthtech', 'ai'],
    ['ecommerce', 'logistics'],
    ['saas', 'analytics'],
  ];
  
  for (const [s1, s2] of complementary) {
    if ((sectorA.includes(s1) && sectorB.includes(s2)) ||
        (sectorA.includes(s2) && sectorB.includes(s1))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate Cross-Entity Synergy opportunities
 */
export function generateCrossEntitySynergyOpportunities({
  companies,
  goalsByCompany = {},
  now = new Date(),
}) {
  const opportunities = [];
  const portfolioCompanies = companies.filter(c => c.isPortfolio);
  
  for (let i = 0; i < portfolioCompanies.length; i++) {
    for (let j = i + 1; j < portfolioCompanies.length; j++) {
      const companyA = portfolioCompanies[i];
      const companyB = portfolioCompanies[j];
      
      const synergy = detectSynergy(companyA, companyB);
      if (!synergy) continue;
      
      const beneficiary = synergy.direction === 'A→B' ? companyB :
                         synergy.direction === 'B→A' ? companyA :
                         companyA;
      
      const otherCompany = beneficiary.id === companyA.id ? companyB : companyA;
      
      const goals = goalsByCompany[beneficiary.id] || [];
      const relevantGoals = goals.filter(g =>
        g.status === 'active' && synergy.goalTypes.includes(g.type)
      );
      
      if (relevantGoals.length === 0) continue;
      
      opportunities.push(createAction({
        entityRef: { type: 'company', id: beneficiary.id, name: beneficiary.name },
        title: `Connect ${companyA.name} ↔ ${companyB.name}: ${synergy.description}`,
        sources: [{
          sourceType: 'OPPORTUNITY',
          opportunityClass: OPPORTUNITY_CLASSES.CROSS_ENTITY_SYNERGY,
          opportunityRationale: synergy.rationale,
          synergyType: synergy.type,
          otherCompanyId: otherCompany.id,
          direction: synergy.direction,
        }],
        goalId: relevantGoals[0].id,
        impact: null,
        createdAt: now.toISOString(),
      }));
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════
// 4. GOAL ACCELERATION OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════

function findAccelerators(goal, company, marketData = {}) {
  const accelerators = [];
  
  switch (goal.type) {
    case 'fundraise':
      // Narrative shift
      if (company.recentMilestones?.length > 0) {
        accelerators.push({
          type: 'narrative_shift',
          title: 'Update fundraise narrative with recent milestones',
          rationale: `Recent milestones (${company.recentMilestones.slice(0, 3).join(', ')}) ` +
            `could strengthen fundraise positioning`,
          isObvious: false,
        });
      }
      
      // Anchor strategy
      accelerators.push({
        type: 'anchor_strategy',
        title: 'Identify and prioritize anchor investor candidates',
        rationale: 'A credible anchor investor often accelerates round momentum',
        isObvious: false,
      });
      
      // Compressed timeline
      accelerators.push({
        type: 'compressed_timeline',
        title: 'Consider compressed fundraise timeline',
        rationale: 'Creating urgency can accelerate investor decisions',
        isObvious: false,
      });
      break;
      
    case 'revenue':
      // Channel strategy
      accelerators.push({
        type: 'channel_strategy',
        title: 'Explore channel partnership for faster distribution',
        rationale: 'Channel partners can accelerate revenue faster than direct sales alone',
        isObvious: false,
      });
      
      // Pricing experiment
      accelerators.push({
        type: 'pricing_experiment',
        title: 'Test pricing optimization',
        rationale: 'Pricing changes can accelerate revenue without additional sales effort',
        isObvious: false,
      });
      break;
      
    case 'hiring':
      // Acqui-hire
      if (marketData?.recentShutdowns?.length > 0) {
        accelerators.push({
          type: 'acqui_hire',
          title: 'Explore acqui-hire from recent shutdowns',
          rationale: `Recent shutdowns in sector: ${marketData.recentShutdowns.slice(0, 3).join(', ')}`,
          isObvious: false,
        });
      }
      
      // Referral bonus
      accelerators.push({
        type: 'referral_amplification',
        title: 'Amplify employee referral program',
        rationale: 'Referrals typically close faster and perform better',
        isObvious: false,
      });
      break;
      
    case 'product':
      // Scope cut
      accelerators.push({
        type: 'scope_optimization',
        title: 'Review scope for MVP acceleration',
        rationale: 'Cutting scope can dramatically accelerate time-to-ship',
        isObvious: false,
      });
      break;
  }
  
  return accelerators;
}

/**
 * Generate Goal Acceleration opportunities
 */
export function generateGoalAccelerationOpportunities({
  company,
  goals,
  goalTrajectories = [],
  marketData = {},
  now = new Date(),
}) {
  const opportunities = [];
  
  for (const goal of goals.filter(g => g.status === 'active')) {
    const trajectory = goalTrajectories.find(t => t.goalId === goal.id);
    
    // Skip if on track (no acceleration needed)
    if (trajectory?.status === 'on_track') continue;
    
    const accelerators = findAccelerators(goal, company, marketData);
    
    for (const accelerator of accelerators) {
      if (accelerator.isObvious) continue;
      
      opportunities.push(createAction({
        entityRef: { type: 'company', id: company.id, name: company.name },
        title: `${company.name}: ${accelerator.title}`,
        sources: [{
          sourceType: 'OPPORTUNITY',
          opportunityClass: OPPORTUNITY_CLASSES.GOAL_ACCELERATION,
          opportunityRationale: accelerator.rationale,
          acceleratorType: accelerator.type,
          trajectoryStatus: trajectory?.status || 'unknown',
        }],
        goalId: goal.id,
        impact: null,
        createdAt: now.toISOString(),
      }));
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════
// 5. OPTIONALITY BUILDER OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════

function findDormantValuableRelationships(company, relationships, goals, people = []) {
  const dormant = [];
  const now = new Date();
  const coldThreshold = ASSUMPTIONS.relationshipColdThreshold;
  
  // Get person IDs associated with company
  const companyPersonIds = new Set([
    ...(company.founderPersonIds || []),
  ]);
  
  for (const rel of relationships) {
    // Check if relationship involves company
    if (!companyPersonIds.has(rel.fromPersonId) && !companyPersonIds.has(rel.toPersonId)) {
      continue;
    }
    
    // Check dormancy
    const lastTouch = rel.lastTouchAt ? new Date(rel.lastTouchAt) : null;
    const daysDormant = lastTouch ? daysBetween(lastTouch, now) : 999;
    
    if (daysDormant < coldThreshold / 2) continue; // Not dormant enough
    
    // Check if valuable
    const band = getRelationshipBand(rel.strength || 0);
    if (band === 'weak') continue; // Not valuable enough to maintain
    
    // Find the external person
    const externalPersonId = companyPersonIds.has(rel.fromPersonId) 
      ? rel.toPersonId 
      : rel.fromPersonId;
    
    const person = people.find(p => p.id === externalPersonId);
    if (!person) continue;
    
    // Determine relevance to goals
    let relevantGoalType = null;
    if (person.orgType === 'investor' || person.orgType === 'fund') {
      relevantGoalType = 'fundraise';
    } else if (person.orgType === 'company') {
      relevantGoalType = 'partnership';
    }
    
    if (!relevantGoalType) continue;
    
    dormant.push({
      relationship: rel,
      personId: externalPersonId,
      personName: person.name,
      daysDormant,
      relevantGoalType,
      strength: rel.strength || 50,
    });
  }
  
  return dormant;
}

/**
 * Generate Optionality Builder opportunities
 * 
 * SPECIAL HANDLING:
 * - Must explicitly state what they unlock
 * - Must be time-discounted
 * - Must justify acting now vs waiting
 */
export function generateOptionalityBuilderOpportunities({
  company,
  goals,
  relationships,
  people = [],
  now = new Date(),
}) {
  const opportunities = [];
  
  // Relationship warming
  const dormantRelationships = findDormantValuableRelationships(
    company, relationships, goals, people
  );
  
  for (const rel of dormantRelationships) {
    const monthsToLikelyNeed = estimateMonthsToNeed(rel, goals);
    const timeDiscount = computeOptionalityDiscount(monthsToLikelyNeed);
    
    // Skip if time discount makes this negligible
    if (timeDiscount < 0.3) continue;
    
    const actNowRationale = rel.daysDormant > 180
      ? 'Relationship at risk of going cold; reconnecting now preserves the option'
      : 'Building rapport now means relationship is warm when needed';
    
    opportunities.push(createAction({
      entityRef: { type: 'company', id: company.id, name: company.name },
      title: `${company.name}: Warm relationship with ${rel.personName}`,
      sources: [{
        sourceType: 'OPPORTUNITY',
        opportunityClass: OPPORTUNITY_CLASSES.OPTIONALITY_BUILDER,
        opportunityRationale: `${rel.personName} could help with future ${rel.relevantGoalType} goals. ` +
          `Relationship dormant for ${rel.daysDormant} days.`,
        timeDiscount,
      }],
      // REQUIRED for optionality: explicit future-unlock declaration
      futureUnlocks: [{
        actionType: `intro_via_${rel.personId}`,
        goalDomain: rel.relevantGoalType,
        frictionReduction: 'Warm relationship reduces intro friction from cold to warm',
      }],
      actNowRationale,
      impact: null,
      createdAt: now.toISOString(),
    }));
  }
  
  // Fundraise preparation
  const upcomingFundraise = goals.find(g =>
    g.type === 'fundraise' &&
    g.status === 'active' &&
    isWithinMonths(g.due, 6, now)
  );
  
  if (upcomingFundraise && !company.hasFundraiseDeck) {
    const monthsUntilDue = monthsUntil(upcomingFundraise.due, now);
    
    opportunities.push(createAction({
      entityRef: { type: 'company', id: company.id, name: company.name },
      title: `${company.name}: Prepare fundraise materials early`,
      sources: [{
        sourceType: 'OPPORTUNITY',
        opportunityClass: OPPORTUNITY_CLASSES.OPTIONALITY_BUILDER,
        opportunityRationale: `Fundraise goal due in ${Math.round(monthsUntilDue)} months. ` +
          `Having materials ready enables opportunistic conversations.`,
      }],
      futureUnlocks: [{
        actionType: 'opportunistic_investor_meeting',
        goalDomain: 'fundraise',
        frictionReduction: 'Ready materials enable same-week follow-up on warm intros',
      }],
      actNowRationale: 'Materials take 2-4 weeks to prepare; starting now ensures readiness',
      goalId: upcomingFundraise.id,
      impact: null,
      createdAt: now.toISOString(),
    }));
  }
  
  return opportunities;
}

function estimateMonthsToNeed(relationship, goals) {
  // Simple heuristic: if there's an active goal of relevant type, need is soon
  const relevantGoal = goals.find(g =>
    g.type === relationship.relevantGoalType && g.status === 'active'
  );
  
  if (relevantGoal) {
    if (relevantGoal.due) {
      return Math.max(0, monthsUntil(relevantGoal.due, new Date()) - 1);
    }
    return 3; // Active goal, assume 3 months
  }
  
  return 6; // No active goal, assume 6 months
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate all OPPORTUNITY-sourced actions for a company
 */
export function generateOpportunityCandidates({
  company,
  goals = [],
  people = [],
  relationships = [],
  team = [],
  investors = [],
  externalEvents = [],
  investorFundCycles = [],
  roleChanges = [],
  companies = [],
  goalTrajectories = [],
  goalsByCompany = {},
  marketData = {},
  now = new Date(),
}) {
  const candidates = [];
  
  // 1. Relationship Leverage
  candidates.push(...generateRelationshipLeverageOpportunities({
    company, goals, people, relationships, team, investors, now,
  }));
  
  // 2. Timing Windows
  candidates.push(...generateTimingWindowOpportunities({
    company, goals, externalEvents, investorFundCycles, roleChanges, now,
  }));
  
  // 3. Cross-Entity Synergy (needs all companies)
  if (companies.length > 0) {
    candidates.push(...generateCrossEntitySynergyOpportunities({
      companies, goalsByCompany, now,
    }));
  }
  
  // 4. Goal Acceleration
  candidates.push(...generateGoalAccelerationOpportunities({
    company, goals, goalTrajectories, marketData, now,
  }));
  
  // 5. Optionality Builders
  candidates.push(...generateOptionalityBuilderOpportunities({
    company, goals, relationships, people, now,
  }));
  
  return candidates;
}

/**
 * Generate OPPORTUNITY actions for entire portfolio
 */
export function generatePortfolioOpportunityCandidates({
  companies,
  people = [],
  relationships = [],
  team = [],
  investors = [],
  externalEvents = [],
  investorFundCycles = [],
  roleChanges = [],
  goalsByCompany = {},
  goalTrajectoriesByCompany = {},
  marketData = {},
  now = new Date(),
}) {
  const allCandidates = [];
  const portfolioCompanies = companies.filter(c => c.isPortfolio);
  
  for (const company of portfolioCompanies) {
    const goals = goalsByCompany[company.id] || company.goals || [];
    const goalTrajectories = goalTrajectoriesByCompany[company.id] || [];
    
    const companyCandidates = generateOpportunityCandidates({
      company,
      goals,
      people,
      relationships,
      team,
      investors,
      externalEvents,
      investorFundCycles,
      roleChanges,
      companies,
      goalTrajectories,
      goalsByCompany,
      marketData,
      now,
    });
    
    allCandidates.push(...companyCandidates);
  }
  
  // Deduplicate cross-entity synergies (they appear for both companies)
  const seen = new Set();
  const deduped = allCandidates.filter(action => {
    const source = action.sources?.[0];
    if (source?.opportunityClass === OPPORTUNITY_CLASSES.CROSS_ENTITY_SYNERGY) {
      const key = [action.entityRef?.id, source.otherCompanyId].sort().join('::');
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  });
  
  return deduped;
}

export default {
  OPPORTUNITY_CLASSES,
  TIMING_WINDOW_TYPES,
  SYNERGY_TYPES,
  generateOpportunityCandidates,
  generatePortfolioOpportunityCandidates,
  generateRelationshipLeverageOpportunities,
  generateTimingWindowOpportunities,
  generateCrossEntitySynergyOpportunities,
  generateGoalAccelerationOpportunities,
  generateOptionalityBuilderOpportunities,
};
