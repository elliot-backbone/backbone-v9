/**
 * engine.js – DAG-Driven Computation Engine (Phase 4.5.2)
 * 
 * Phase 4.5.2: Kill list compliance - removed shadow value surfaces
 * Execution order is enforced by explicit dependency graph.
 * 
 * INVARIANT: No circular dependencies. Back-edge access throws.
 * 
 * @module engine
 */

import { validateDataset } from './index.js';
import { GRAPH, topoSort, validateGraph } from './graph.js';
import { deriveHealth } from './health.js';

// DERIVE layer (L1-L2)
import { deriveRunway } from '../derive/runway.js';
import { deriveTrajectory } from '../derive/trajectory.js';
import { deriveCompanyMetrics } from '../derive/metrics.js';
import { deriveCompanyGoalTrajectories } from '../derive/goalTrajectory.js';
import { deriveMeetingIntelligence, matchMeetingsToCompanies } from '../derive/meetings.js';

// PREDICT layer (L3-L4)
import { detectIssues } from '../predict/issues.js';
import { calculateCompanyRipple } from '../predict/ripple.js';
import { deriveCompanyPreIssues, deriveAllEntityPreIssues } from '../predict/preissues.js';
import { generateCompanyActionCandidates } from '../predict/actionCandidates.js';
import { attachCompanyImpactModels } from '../predict/actionImpact.js';
import { generateIntroOpportunities } from '../predict/introOpportunity.js';

// DECIDE layer (L5)
import { rankActions } from '../decide/ranking.js';

// QA layer
import { assertNoForbiddenFields } from '../qa/forbidden.js';

// =============================================================================
// NODE COMPUTE FUNCTIONS (Phase 4.5.2)
// =============================================================================

const NODE_COMPUTE = {
  runway: (ctx, company, now) => {
    return deriveRunway(
      company.cash,
      company.burn,
      company.asOf,
      company.asOf,
      now
    );
  },
  
  meetings: (ctx, company, now, globals) => {
    const transcripts = globals.transcripts || new Map();
    return deriveMeetingIntelligence(company.meetings || [], transcripts, now);
  },

  metrics: (ctx, company, now) => {
    return deriveCompanyMetrics(company);
  },
  
  trajectory: (ctx, company, now) => {
    const trajectories = {};
    for (const goal of company.goals || []) {
      trajectories[goal.id] = deriveTrajectory(goal, now);
    }
    return trajectories;
  },
  
  goalTrajectory: (ctx, company, now) => {
    return deriveCompanyGoalTrajectories(company, now);
  },
  
  health: (ctx, company, now) => {
    return deriveHealth(company, now);
  },
  
  issues: (ctx, company, now) => {
    return detectIssues(company, now);
  },
  
  preissues: (ctx, company, now) => {
    const goalTrajectories = ctx.goalTrajectory || [];
    const runway = ctx.runway || null;
    return deriveCompanyPreIssues(company, goalTrajectories, runway, now);
  },
  
  ripple: (ctx, company, now) => {
    const issues = ctx.issues?.issues || [];
    return calculateCompanyRipple(company, issues);
  },
  
  introOpportunity: (ctx, company, now, globals) => {
    // Intro opportunities need access to people, relationships, investors, team
    // These are passed via globals
    const { people, relationships, investors, team } = globals || {};
    return generateIntroOpportunities({
      company,
      goals: company.goals || [],
      people: people || [],
      relationships: relationships || [],
      investors: investors || [],
      team: team || [],
      now
    });
  },
  
  actionCandidates: (ctx, company, now) => {
    // Combine standard candidates with intro opportunities
    const standardCandidates = generateCompanyActionCandidates({
      issues: ctx.issues?.issues || [],
      preissues: ctx.preissues || [],
      companyId: company.id,
      companyName: company.name,
      createdAt: now.toISOString()
    });
    
    // Convert intro opportunities to action candidates
    const introCandidates = (ctx.introOpportunity || []).map(intro => ({
      actionId: intro.id,
      title: `${company.name}: Intro to ${intro.targetPersonName}`,
      resolutionId: 'NETWORK_INTRO',
      entityRef: { type: 'company', id: company.id, name: company.name },
      sources: [{
        sourceType: 'INTRODUCTION',
        sourceId: intro.id,
        goalId: intro.goalId
      }],
      steps: [
        { step: 1, action: `Reach out to ${intro.introducerName} to request intro` },
        { step: 2, action: `Brief ${intro.introducerName} on ${intro.targetPersonName}'s relevance` },
        { step: 3, action: `Follow up within 48 hours of intro` }
      ],
      type: 'INTRODUCTION',
      ...intro // Include all intro-specific fields
    }));
    
    return [...standardCandidates, ...introCandidates];
  },
  
  actionImpact: (ctx, company, now) => {
    const candidates = ctx.actionCandidates || [];
    return attachCompanyImpactModels(candidates, {
      issues: ctx.issues?.issues || [],
      preissues: ctx.preissues || [],
      goalTrajectories: ctx.goalTrajectory || [],
      rippleByCompany: { [company.id]: ctx.ripple },
      // Pass full company object (includes raw fields like burn, arr, stage)
      company: company,
      // Add entity collections for stake-based impact calculation
      deals: company.deals || [],
      rounds: company.rounds || [],
      goals: company.goals || [],
      relationships: company.relationships || []
    });
  },
  
  // EXECUTION PATH: Canonical scorer is `computeRankScore` via `rankActions`.
  // No other scoring function is engine-reachable.
  actionRanker: (ctx, company, now) => {
    const actionsWithImpact = ctx.actionImpact || [];
    return rankActions(actionsWithImpact);
  },
  
  priority: (ctx, company, now) => {
    // Compatibility view: map ranked actions to priority-like records
    const rankedActions = ctx.actionRanker || [];
    return {
      priorities: rankedActions.map(a => ({
        companyId: company.id,
        companyName: company.name,
        resolutionId: a.resolutionId,
        title: a.title,
        priority: a.rankScore || a.expectedNetImpact,
        rank: a.rank,
        actionId: a.actionId,
        sourceType: a.sources[0]?.sourceType || 'MANUAL'
      })),
      summary: {
        companyId: company.id,
        totalPriorities: rankedActions.length,
        topAction: rankedActions[0]?.title || null
      }
    };
  }
};

// =============================================================================
// DAG ENGINE
// =============================================================================

function computeCompanyDAG(company, now, globals = {}) {
  const order = topoSort(GRAPH);
  const ctx = {};
  
  for (const node of order) {
    const computeFn = NODE_COMPUTE[node];
    if (!computeFn) {
      throw new Error(`No compute function for node: ${node}`);
    }
    ctx[node] = computeFn(ctx, company, now, globals);
  }
  
  return ctx;
}

/**
 * Run the full computation engine.
 * Phase 4.5.2: Returns ranked actions as primary artifact.
 */
export function compute(rawData, now = new Date()) {
  const startTime = Date.now();
  const errors = [];
  const warnings = [];
  
  // Validate DAG
  const graphValidation = validateGraph(GRAPH);
  if (!graphValidation.valid) {
    errors.push(...graphValidation.errors);
  }
  
  // Validate input data
  const dataValidation = validateDataset(rawData);
  if (!dataValidation.valid) {
    errors.push(...dataValidation.errors);
  }
  
  // Forbidden field check
  try {
    assertNoForbiddenFields(rawData);
  } catch (err) {
    errors.push(err.message);
  }
  
  const executionOrder = topoSort(GRAPH);
  
  // Globals for network modules (people, relationships, etc.)
  const globals = {
    people: rawData.people || [],
    relationships: rawData.relationships || [],
    investors: rawData.investors || [],
    team: rawData.team || []
  };
  
  // Build meeting lookup map
  const allMeetings = rawData.meetings || [];
  const meetingsByCompany = allMeetings.length > 0
    ? matchMeetingsToCompanies(allMeetings, rawData.companies || [])
    : new Map();
  globals.transcripts = rawData.transcripts || new Map();

  // Build lookup maps for related data
  const dealsByCompany = new Map();
  for (const deal of (rawData.deals || [])) {
    const list = dealsByCompany.get(deal.companyId) || [];
    list.push(deal);
    dealsByCompany.set(deal.companyId, list);
  }
  
  const goalsByCompany = new Map();
  for (const goal of (rawData.goals || [])) {
    const list = goalsByCompany.get(goal.companyId) || [];
    list.push(goal);
    goalsByCompany.set(goal.companyId, list);
  }
  
  const roundsByCompany = new Map();
  for (const round of (rawData.rounds || [])) {
    const list = roundsByCompany.get(round.companyId) || [];
    list.push(round);
    roundsByCompany.set(round.companyId, list);
  }
  
  // Compute for each PORTFOLIO company only
  // (Market companies are tracked for deal flow but don't generate actions)
  const portfolioCompanies = (rawData.companies || []).filter(c => c.isPortfolio);
  
  const companies = portfolioCompanies.map(rawCompany => {
    // Attach related data to company object
    const company = {
      ...rawCompany,
      deals: dealsByCompany.get(rawCompany.id) || [],
      goals: goalsByCompany.get(rawCompany.id) || [],
      rounds: roundsByCompany.get(rawCompany.id) || [],
      meetings: meetingsByCompany.get(rawCompany.id) || [],
    };
    
    const computed = computeCompanyDAG(company, now, globals);
    
    if (computed.runway?.confidence < 0.5) {
      warnings.push(`[${company.id}] Low confidence runway`);
    }
    
    return {
      id: company.id,
      name: company.name,
      raw: company,
      derived: {
        runway: computed.runway,
        health: computed.health,
        metrics: computed.metrics,
        trajectories: computed.trajectory,
        goalTrajectories: computed.goalTrajectory,
        issues: computed.issues,
        preissues: computed.preissues,
        ripple: computed.ripple,
        introOpportunities: computed.introOpportunity,
        meetings: computed.meetings,
        actions: computed.actionRanker, // Phase 4.5.2: direct from ranker
        priorities: computed.priority?.priorities || []
      }
    };
  });

  // Aggregate all ranked actions across portfolio
  let allActions = [];
  for (const company of companies) {
    allActions = allActions.concat(company.derived.actions || []);
  }
  
  // Portfolio-level preissue detection (firms, rounds, relationships)
  // Only include entities linked to portfolio companies
  const portfolioCompanyIds = new Set(portfolioCompanies.map(c => c.id));
  
  // Filter rounds/deals to only portfolio companies
  const portfolioRounds = (rawData.rounds || []).filter(r => portfolioCompanyIds.has(r.companyId));
  const portfolioDeals = (rawData.deals || []).filter(d => portfolioCompanyIds.has(d.companyId));
  
  // Filter relationships to only those involving portfolio companies (via people)
  const portfolioPeopleIds = new Set(
    (rawData.people || [])
      .filter(p => portfolioCompanyIds.has(p.companyId))
      .map(p => p.id)
  );
  const portfolioRelationships = (rawData.relationships || []).filter(r => 
    portfolioPeopleIds.has(r.p1Id) || portfolioPeopleIds.has(r.p2Id)
  );
  
  const portfolioPreissues = deriveAllEntityPreIssues(
    {
      companies: portfolioCompanies,
      firms: rawData.firms || [],
      people: rawData.people || [],
      deals: portfolioDeals,
      rounds: portfolioRounds,
      relationships: portfolioRelationships
    },
    {}, // derivedData not needed for non-company preissues
    now
  );
  
  // Generate actions from portfolio-level preissues (firm, round, relationship)
  const portfolioPreissueActions = [];
  const nonCompanyPreissues = portfolioPreissues.all.filter(p => 
    p.entityRef?.type !== 'company'
  );
  
  for (const preissue of nonCompanyPreissues) {
    // Generate actions for each preissue using its preventativeActions
    const actions = generateCompanyActionCandidates({
      issues: [],
      preissues: [preissue],
      goalTrajectories: [],
      companyId: preissue.companyId || preissue.entityRef?.id || 'portfolio',
      companyName: preissue.companyName || preissue.entityRef?.name || preissue.firmName || 'Portfolio',
      createdAt: now.toISOString()
    });
    portfolioPreissueActions.push(...actions);
  }
  
  // Attach impact models to portfolio preissue actions
  const portfolioActionsWithImpact = attachCompanyImpactModels(
    portfolioPreissueActions,
    { 
      preissues: nonCompanyPreissues,
      // Include all raw data for stake-based impact calculation
      rounds: rawData.rounds || [],
      deals: rawData.deals || [],
      goals: rawData.goals || [],
      relationships: rawData.relationships || [],
      firms: rawData.firms || []
    }
  );
  
  // Add portfolio preissue actions to all actions
  allActions = allActions.concat(portfolioActionsWithImpact);
  
  // DEDUPLICATION: Remove duplicate actions by actionId
  // Each action should have a unique actionId based on its source (issue/preissue/goal)
  // Duplicates occur when the same source generates the same action multiple times
  const seenActions = new Set();
  allActions = allActions.filter(action => {
    // Use actionId as primary key - it should be unique per source
    const key = action.actionId || 
      `${action.sources?.[0]?.issueId || action.sources?.[0]?.preIssueId || action.sources?.[0]?.goalId || 'unknown'}-${action.resolutionId || 'no-res'}`;
    if (seenActions.has(key)) return false;
    seenActions.add(key);
    return true;
  });
  
  // EXECUTION PATH: Portfolio-level re-rank via `rankActions` → `computeRankScore`.
  // No other scoring function is engine-reachable.
  const portfolioRankedActions = rankActions(allActions);
  
  // Health counts
  const healthCounts = {
    GREEN: companies.filter(c => c.derived.health?.healthBand === 'GREEN').length,
    YELLOW: companies.filter(c => c.derived.health?.healthBand === 'YELLOW').length,
    RED: companies.filter(c => c.derived.health?.healthBand === 'RED').length
  };
  
  // Action source counts
  // Note: GOAL removed as sourceType - goals are evaluation lens, not action sources
  const actionSourceCounts = {
    ISSUE: portfolioRankedActions.filter(a => a.sources[0]?.sourceType === 'ISSUE').length,
    PREISSUE: portfolioRankedActions.filter(a => a.sources[0]?.sourceType === 'PREISSUE').length,
    INTRODUCTION: portfolioRankedActions.filter(a => a.sources[0]?.sourceType === 'INTRODUCTION').length
  };
  
  return {
    companies,
    team: rawData.team || [],
    investors: rawData.investors || [],
    
    // Phase 4.5.2: Actions are primary artifact
    actions: portfolioRankedActions,
    todayActions: portfolioRankedActions.slice(0, 5),
    
    // Compatibility: priorities view
    priorities: portfolioRankedActions.map(a => ({
      companyId: a.entityRef.id,
      companyName: a.title.split(':')[0],
      resolutionId: a.resolutionId,
      title: a.title,
      priority: a.rankScore || a.expectedNetImpact,
      rank: a.rank,
      actionId: a.actionId
    })),
    
    meta: {
      computedAt: now.toISOString(),
      durationMs: Date.now() - startTime,
      version: '9.4.5.2', // Phase 4.5.2: Kill list compliance
      inputVersion: rawData.version,
      errors,
      warnings,
      healthCounts,
      actionSourceCounts,
      executionOrder,
      layersExecuted: ['L0_RAW', ...executionOrder.map(n => n.toUpperCase())]
    }
  };
}

export function computeCompany(company, now = new Date()) {
  const computed = computeCompanyDAG(company, now);
  
  return {
    id: company.id,
    name: company.name,
    raw: company,
    derived: {
      runway: computed.runway,
      health: computed.health,
      metrics: computed.metrics,
      trajectories: computed.trajectory,
      goalTrajectories: computed.goalTrajectory,
      issues: computed.issues,
      preissues: computed.preissues,
      ripple: computed.ripple,
      meetings: computed.meetings,
      actions: computed.actionRanker,
      priorities: computed.priority?.priorities || []
    }
  };
}

export default { compute, computeCompany };
