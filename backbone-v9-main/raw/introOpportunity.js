/**
 * introOpportunity.js
 * Backbone V9 Phase 4.0 - Introduction Opportunity Generator
 * 
 * Generates IntroductionOpportunity objects by:
 * 1. Finding blocked/at-risk goals
 * 2. Traversing relationship graph for paths to helpful contacts
 * 3. Computing probability, trust risk, ripple map, and optionality
 * 4. PF4: Computing timing recommendation (NOW/SOON/LATER/NEVER)
 * 
 * NO PERSISTENCE - all derived, ephemeral, deterministic.
 */

import { calculateTrustRisk, shouldBlockAmplification } from './trustRisk.js';

/**
 * PF4: Timing states with explicit semantics
 * - NOW: Clear evidence action should be taken immediately (rare)
 * - SOON: Within 2-4 weeks, conditions favorable
 * - LATER: Default when uncertain, wait for better signal
 * - NEVER: Explicit block due to trust risk or poor fit
 */
export const TIMING_STATES = ['NOW', 'SOON', 'LATER', 'NEVER'];

/**
 * Goal types that can benefit from introductions
 */
const INTRO_RELEVANT_GOAL_TYPES = ['fundraise', 'partnership', 'hiring'];

/**
 * Person org types that can help with specific goal types
 */
const GOAL_TO_TARGET_ORG_TYPES = {
  fundraise: ['investor', 'external'],
  partnership: ['company', 'external'],
  hiring: ['company', 'external']
};

/**
 * Build adjacency list from relationships array
 * Returns bidirectional map: personId -> [{ personId, relationship }]
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
      relationship: rel
    });
    
    // Reverse edge (relationships are bidirectional for traversal)
    if (!graph.has(rel.toPersonId)) {
      graph.set(rel.toPersonId, []);
    }
    graph.get(rel.toPersonId).push({
      personId: rel.fromPersonId,
      relationship: { ...rel, _reversed: true }
    });
  }
  
  return graph;
}

/**
 * Find all paths from source to targets up to maxHops
 * Returns array of { path: [personId, ...], relationships: [rel, ...] }
 */
function findPaths(graph, sourceIds, targetIds, maxHops = 2) {
  const paths = [];
  const targetSet = new Set(targetIds);
  
  for (const sourceId of sourceIds) {
    // BFS with path tracking
    const queue = [{ 
      personId: sourceId, 
      path: [sourceId], 
      relationships: [],
      visited: new Set([sourceId])
    }];
    
    while (queue.length > 0) {
      const { personId, path, relationships, visited } = queue.shift();
      
      // Check if we reached a target
      if (targetSet.has(personId) && path.length > 1) {
        paths.push({ path, relationships });
        continue; // Don't explore beyond target
      }
      
      // Stop if we've reached max hops
      if (path.length > maxHops) continue;
      
      // Explore neighbors
      const neighbors = graph.get(personId) || [];
      for (const { personId: nextId, relationship } of neighbors) {
        if (!visited.has(nextId)) {
          const newVisited = new Set(visited);
          newVisited.add(nextId);
          queue.push({
            personId: nextId,
            path: [...path, nextId],
            relationships: [...relationships, relationship],
            visited: newVisited
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
  
  // Geometric mean of relationship strengths, penalized by length
  const strengths = relationships.map(r => r.strength / 100);
  const product = strengths.reduce((a, b) => a * b, 1);
  const geoMean = Math.pow(product, 1 / strengths.length);
  
  // Length penalty: each hop reduces score
  const lengthPenalty = Math.pow(0.7, relationships.length - 1);
  
  return geoMean * lengthPenalty;
}

// =============================================================================
// PF3: SECOND-ORDER INTRO MODELING
// =============================================================================

/**
 * PF3: Baseline conversion probability for direct intros (1-hop)
 */
const BASELINE_CONVERSION = 0.15;

/**
 * PF3: Minimum conversion lift required for second-order paths
 * Second-order paths must exceed this multiple of baseline to be worth the complexity
 */
const SECOND_ORDER_MIN_LIFT = 1.2; // Must be 20% better than baseline

/**
 * PF3: Hard cap on traversal depth - architecturally enforced
 */
const MAX_PATH_DEPTH = 2;

/**
 * PF3: Compute expected conversion lift for a path
 * 
 * Second-order paths are only valuable if:
 * 1. They're tied to a real Action (intro must serve a goal)
 * 2. Expected conversion exceeds baseline by MIN_LIFT
 * 
 * Returns { conversionLift, expectedConversion, isSecondOrder, includeInRanking, explain }
 */
function computeSecondOrderConversionLift(path, relationships, target, goal) {
  const pathLength = relationships.length;
  const isSecondOrder = pathLength > 1;
  
  // Direct paths always included
  if (!isSecondOrder) {
    return {
      conversionLift: 1.0,
      expectedConversion: BASELINE_CONVERSION,
      isSecondOrder: false,
      includeInRanking: true,
      explain: 'Direct intro (1-hop)'
    };
  }
  
  // Second-order path analysis
  // Compute expected conversion based on relationship chain
  const chainStrength = relationships.reduce((prod, r) => prod * (r.strength / 100), 1);
  
  // Factor in relationship quality at each hop
  const avgStrength = relationships.reduce((sum, r) => sum + (r.strength || 50), 0) / pathLength;
  
  // Second-order penalty: each hop reduces conversion by ~40%
  const hopPenalty = Math.pow(0.6, pathLength - 1);
  
  // Expected conversion for second-order
  const expectedConversion = BASELINE_CONVERSION * chainStrength * hopPenalty * (avgStrength / 50);
  
  // Compute lift relative to baseline
  const conversionLift = expectedConversion / BASELINE_CONVERSION;
  
  // PF3 Rule: Only include if lift > minimum threshold
  // This filters out noisy second-order paths
  const includeInRanking = conversionLift >= SECOND_ORDER_MIN_LIFT;
  
  let explain;
  if (includeInRanking) {
    explain = `Second-order path (${pathLength} hops): ${(conversionLift * 100).toFixed(0)}% lift vs baseline`;
  } else {
    explain = `Second-order path filtered: ${(conversionLift * 100).toFixed(0)}% lift < ${SECOND_ORDER_MIN_LIFT * 100}% threshold`;
  }
  
  return {
    conversionLift: Math.round(conversionLift * 100) / 100,
    expectedConversion: Math.round(expectedConversion * 1000) / 1000,
    isSecondOrder,
    includeInRanking,
    explain
  };
}

/**
 * PF3: Filter paths to only include valuable second-order connections
 * 
 * @param {Object[]} paths - All found paths
 * @param {Object} target - Target person
 * @param {Object} goal - Associated goal (required - must be tied to real Action)
 * @returns {Object[]} Filtered paths with conversion data
 */
function filterSecondOrderPaths(paths, target, goal) {
  // PF3 Rule: Second-order paths must be tied to a real Action
  if (!goal) {
    // No goal = no Action = filter out all second-order
    return paths.filter(p => p.relationships.length === 1).map(p => ({
      ...p,
      secondOrder: {
        conversionLift: 1.0,
        expectedConversion: BASELINE_CONVERSION,
        isSecondOrder: false,
        includeInRanking: true,
        explain: 'Direct intro (1-hop)'
      }
    }));
  }
  
  // Compute conversion lift for all paths
  const pathsWithLift = paths.map(p => ({
    ...p,
    secondOrder: computeSecondOrderConversionLift(p.path, p.relationships, target, goal)
  }));
  
  // Filter: only include paths that pass the lift threshold
  const filteredPaths = pathsWithLift.filter(p => p.secondOrder.includeInRanking);
  
  // PF3 Rule: Kill feature if noise > signal
  // If >80% of second-order paths are filtered, the feature is adding noise
  const secondOrderPaths = pathsWithLift.filter(p => p.secondOrder.isSecondOrder);
  const includedSecondOrder = filteredPaths.filter(p => p.secondOrder.isSecondOrder);
  
  if (secondOrderPaths.length > 0) {
    const inclusionRate = includedSecondOrder.length / secondOrderPaths.length;
    // If <20% of second-order paths pass, feature is noise - return only direct
    if (inclusionRate < 0.2) {
      return filteredPaths.filter(p => !p.secondOrder.isSecondOrder);
    }
  }
  
  return filteredPaths;
}

/**
 * Determine if a goal is blocked or at-risk
 */
function isGoalBlocked(goal, company, now = new Date()) {
  if (goal.status !== 'active') return false;
  
  const dueDate = new Date(goal.due);
  const daysRemaining = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
  const progressPct = (goal.current / goal.target) * 100;
  
  // Fundraise-specific: check deal pipeline
  if (goal.type === 'fundraise') {
    const totalCommitted = (company.deals || [])
      .filter(d => ['termsheet', 'dd'].includes(d.status))
      .reduce((sum, d) => sum + (d.amount * d.probability / 100), 0);
    
    const gap = goal.target - goal.current - totalCommitted;
    if (gap > 0 && daysRemaining < 60) return true;
  }
  
  // Partnership-specific: low progress with deadline approaching
  if (goal.type === 'partnership') {
    if (progressPct < 50 && daysRemaining < 45) return true;
  }
  
  // Hiring: slow progress
  if (goal.type === 'hiring') {
    const expectedProgress = Math.max(0, 100 - (daysRemaining / 90) * 100);
    if (progressPct < expectedProgress * 0.7) return true;
  }
  
  // General: behind trajectory
  const daysTotal = 90; // Assume 90-day goal window
  const expectedPct = Math.min(100, ((daysTotal - daysRemaining) / daysTotal) * 100);
  return progressPct < expectedPct * 0.6;
}

/**
 * Find potential targets for a goal
 */
function findPotentialTargets(goal, company, people, investors) {
  const targets = [];
  const targetOrgTypes = GOAL_TO_TARGET_ORG_TYPES[goal.type] || [];
  
  for (const person of people) {
    if (!targetOrgTypes.includes(person.orgType)) continue;
    
    // Skip people already at this company
    if (person.orgId === company.id) continue;
    
    // For fundraise, check if investor matches stage/sector
    if (goal.type === 'fundraise' && person.orgType === 'investor') {
      const investor = investors.find(i => i.personId === person.id || i.id === person.orgId);
      if (investor) {
        const stageMatch = investor.stageFocus?.toLowerCase().includes(company.stage?.toLowerCase());
        const sectorMatch = investor.sectorFocus?.toLowerCase().includes(company.sector?.toLowerCase());
        if (stageMatch || sectorMatch) {
          targets.push({ person, relevanceScore: (stageMatch ? 50 : 0) + (sectorMatch ? 50 : 0) });
        }
      }
    }
    
    // For partnerships, check sector alignment
    if (goal.type === 'partnership') {
      const sectorMatch = person.tags?.some(t => 
        company.sector?.toLowerCase().includes(t.toLowerCase())
      );
      if (sectorMatch || person.orgType === 'external') {
        targets.push({ person, relevanceScore: sectorMatch ? 70 : 30 });
      }
    }
    
    // For hiring, check relevant expertise
    if (goal.type === 'hiring') {
      const relevantTags = ['hiring', 'recruiting', 'talent', 'engineering', 'sales'];
      const tagMatch = person.tags?.some(t => relevantTags.includes(t.toLowerCase()));
      if (tagMatch) {
        targets.push({ person, relevanceScore: 50 });
      }
    }
  }
  
  return targets;
}

/**
 * Calculate intro probability of success
 */
function calculateIntroProbability(path, relationships, target, goal) {
  // Base: path score
  let probability = scorePath(path, relationships);
  
  // Adjust for target relevance
  probability *= (target.relevanceScore / 100);
  
  // Clamp to reasonable range
  return Math.min(0.8, Math.max(0.1, probability));
}

/**
 * Estimate optionality gain from an intro
 */
function estimateOptionalityGain(target, goal, company) {
  let gain = 0;
  
  // Investor intros create fundraising optionality
  if (target.person.orgType === 'investor') {
    gain += 30;
    if (target.person.tags?.includes('founder-friendly')) gain += 10;
  }
  
  // External contacts create partnership optionality
  if (target.person.orgType === 'external') {
    gain += 20;
    if (['CEO', 'CTO', 'Partner'].some(r => target.person.role?.includes(r))) {
      gain += 15;
    }
  }
  
  // Cross-portfolio intros create network effects
  if (target.person.orgType === 'company') {
    gain += 25;
  }
  
  return Math.min(100, gain);
}

/**
 * PF4: Compute intro timing recommendation
 * 
 * Inputs:
 * - Trajectory velocity (are they making progress?)
 * - Goal distance (how far from target?)
 * - Investor cycle timing (for fundraise goals)
 * - Trust risk level
 * 
 * Default: LATER (conservative)
 * 
 * @returns {{ timing: string, timingRationale: string[], confidence: number }}
 */
function computeIntroTiming({
  goal,
  company,
  trustRisk,
  probability,
  trajectory,
  now = new Date()
}) {
  const rationale = [];
  let score = 0; // Higher = more urgent timing
  let confidence = 0.5; // How confident we are in the recommendation
  
  const dueDate = new Date(goal.due);
  const daysRemaining = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
  const progressPct = (goal.current / goal.target) * 100;
  const gap = 100 - progressPct;
  
  // === Factor 1: Goal distance (gap to target) ===
  if (gap > 70) {
    score += 2;
    rationale.push(`Large gap to target (${gap.toFixed(0)}% remaining)`);
    confidence += 0.1;
  } else if (gap > 40) {
    score += 1;
    rationale.push(`Moderate gap to target (${gap.toFixed(0)}% remaining)`);
  } else {
    rationale.push(`Goal on track (${progressPct.toFixed(0)}% complete)`);
    confidence += 0.15;
  }
  
  // === Factor 2: Time pressure ===
  if (daysRemaining < 21) {
    score += 3;
    rationale.push(`Critical: ${daysRemaining} days remaining`);
    confidence += 0.15;
  } else if (daysRemaining < 45) {
    score += 2;
    rationale.push(`Approaching deadline: ${daysRemaining} days`);
    confidence += 0.1;
  } else if (daysRemaining < 90) {
    score += 1;
    rationale.push(`Reasonable runway: ${daysRemaining} days`);
  } else {
    rationale.push(`Ample time: ${daysRemaining} days`);
    confidence -= 0.1; // Less certain, more time to wait
  }
  
  // === Factor 3: Trajectory velocity (if available) ===
  if (trajectory) {
    if (trajectory.velocity < 0) {
      score += 2;
      rationale.push('Negative velocity - losing ground');
      confidence += 0.1;
    } else if (trajectory.probabilityOfHit < 0.3) {
      score += 2;
      rationale.push(`Low probability of hit (${(trajectory.probabilityOfHit * 100).toFixed(0)}%)`);
      confidence += 0.1;
    } else if (trajectory.probabilityOfHit > 0.7) {
      score -= 1;
      rationale.push(`Good probability of hit (${(trajectory.probabilityOfHit * 100).toFixed(0)}%)`);
      confidence += 0.1;
    }
  }
  
  // === Factor 4: Fundraise-specific investor cycle timing ===
  if (goal.type === 'fundraise') {
    const month = now.getMonth();
    // Q1 and Q4 are better for fundraising (budget cycles)
    if (month >= 0 && month <= 2) {
      score += 1;
      rationale.push('Q1 - favorable fundraising season');
      confidence += 0.05;
    } else if (month >= 8 && month <= 10) {
      score += 1;
      rationale.push('Q4 - favorable fundraising season');
      confidence += 0.05;
    } else if (month >= 6 && month <= 7) {
      score -= 1;
      rationale.push('Summer - slower investor activity');
    }
    
    // Check existing deal pipeline
    const activeDeals = (company.deals || []).filter(d => 
      ['meeting', 'dd', 'termsheet'].includes(d.status)
    ).length;
    
    if (activeDeals === 0) {
      score += 2;
      rationale.push('No active deals - pipeline needs intros');
      confidence += 0.1;
    } else if (activeDeals >= 3) {
      score -= 1;
      rationale.push(`${activeDeals} active deals - pipeline healthy`);
    }
  }
  
  // === Factor 5: Trust risk penalty ===
  if (trustRisk.trustRiskScore > 70) {
    score -= 3;
    rationale.push(`High trust risk (${trustRisk.trustRiskScore}) - delay recommended`);
    confidence += 0.15; // More confident about NOT doing it
  } else if (trustRisk.trustRiskScore > 50) {
    score -= 1;
    rationale.push(`Moderate trust risk (${trustRisk.trustRiskScore})`);
  }
  
  // === Factor 6: Intro probability ===
  if (probability < 0.3) {
    score -= 1;
    rationale.push(`Low success probability (${(probability * 100).toFixed(0)}%)`);
  } else if (probability > 0.6) {
    score += 1;
    rationale.push(`Good success probability (${(probability * 100).toFixed(0)}%)`);
    confidence += 0.1;
  }
  
  // === Determine timing state ===
  // Default to LATER on uncertainty (per PF4 spec)
  let timing;
  
  if (trustRisk.trustRiskScore > 80) {
    timing = 'NEVER';
    rationale.unshift('BLOCKED: Trust risk too high');
    confidence = 0.9;
  } else if (score >= 6 && confidence > 0.6) {
    timing = 'NOW';
    rationale.unshift('Immediate action recommended');
  } else if (score >= 3 && confidence > 0.5) {
    timing = 'SOON';
    rationale.unshift('Action recommended within 2-4 weeks');
  } else {
    timing = 'LATER';
    rationale.unshift('Wait for better signal or conditions');
    // If we're defaulting to LATER, note the uncertainty
    if (confidence < 0.5) {
      rationale.push('Insufficient confidence for earlier timing');
    }
  }
  
  return {
    timing,
    timingRationale: rationale,
    timingConfidence: Math.min(1, Math.max(0, confidence)),
    timingScore: score
  };
}

/**
 * Build human-readable rationale for intro (PF4: force explicit rationale)
 */
function buildRationale(goal, target, introducer, trustRisk, timing) {
  const lines = [];
  
  // Required: Why this intro matters
  lines.push(`Goal "${goal.name}" needs acceleration.`);
  
  // Required: Who and why they're relevant
  lines.push(`${target.person.name} (${target.person.role || 'Contact'}) is a fit because: ${
    target.relevanceScore >= 70 ? 'strong sector/stage match' :
    target.relevanceScore >= 40 ? 'moderate relevance' :
    'potential connection'
  }.`);
  
  // Required: Path to intro
  if (introducer) {
    lines.push(`Path: ${introducer.name} can introduce.`);
  }
  
  // Required: Risk acknowledgment
  lines.push(`Trust risk: ${trustRisk.trustRiskBand} (${trustRisk.trustRiskScore}/100).`);
  
  // Required: Timing with reason
  lines.push(`Timing: ${timing.timing} - ${timing.timingRationale[0]}`);
  
  return lines;
}

/**
 * Generate introduction opportunities for a company
 */
export function generateIntroOpportunities({
  company,
  goals,
  people,
  relationships,
  investors,
  team,
  goalTrajectories = [],
  now = new Date()
}) {
  const opportunities = [];
  const graph = buildRelationshipGraph(relationships);
  
  // Get team person IDs (potential introducers)
  const teamPersonIds = team.map(t => t.personId).filter(Boolean);
  
  // Also include founder person IDs as potential introducers
  const founderPersonIds = company.founderPersonIds || [];
  const introducerIds = [...new Set([...teamPersonIds, ...founderPersonIds])];
  
  // Find blocked goals that could benefit from intros
  const relevantGoals = goals.filter(g => 
    INTRO_RELEVANT_GOAL_TYPES.includes(g.type) && 
    isGoalBlocked(g, company, now)
  );
  
  for (const goal of relevantGoals) {
    // Get trajectory for this goal if available
    const trajectory = goalTrajectories.find(t => t.goalId === goal.id);
    
    // Find potential targets
    const targets = findPotentialTargets(goal, company, people, investors);
    
    for (const target of targets) {
      // Find paths from team to target
      const rawPaths = findPaths(graph, introducerIds, [target.person.id], MAX_PATH_DEPTH);
      
      if (rawPaths.length === 0) continue;
      
      // PF3: Filter second-order paths by conversion lift
      const filteredPaths = filterSecondOrderPaths(rawPaths, target, goal);
      
      if (filteredPaths.length === 0) continue;
      
      // Take best path (considering conversion lift for second-order)
      const bestPath = filteredPaths.reduce((best, current) => {
        // Score combines path strength and conversion lift
        const currentScore = scorePath(current.path, current.relationships) * 
          (current.secondOrder?.conversionLift || 1);
        const bestScore = scorePath(best.path, best.relationships) *
          (best.secondOrder?.conversionLift || 1);
        return currentScore > bestScore ? current : best;
      });
      
      // Get introducer (first person in path who is on team)
      const introducerId = bestPath.path[0];
      const introducer = team.find(t => t.personId === introducerId) || 
                         people.find(p => p.id === introducerId);
      
      // Calculate trust risk
      const primaryRelationship = bestPath.relationships[0];
      const introsLast90Days = primaryRelationship?.introCount || 0;
      
      const trustRisk = calculateTrustRisk({
        relationship: primaryRelationship,
        pathLength: bestPath.path.length - 1,
        introsLast90Days,
        targetPerson: target.person,
        goal,
        company,
        introducer,
        now
      });
      
      // Calculate probability
      const probability = calculateIntroProbability(
        bestPath.path, 
        bestPath.relationships, 
        target, 
        goal
      );
      
      // PF4: Compute timing recommendation
      const timing = computeIntroTiming({
        goal,
        company,
        trustRisk,
        probability,
        trajectory,
        now
      });
      
      // Skip if timing is NEVER (explicit block)
      if (timing.timing === 'NEVER') {
        continue;
      }
      
      // Also skip if trust risk too high AND timing didn't already block
      if (shouldBlockAmplification(trustRisk) && timing.timing !== 'NEVER') {
        continue;
      }
      
      // Calculate optionality gain
      const optionalityGain = estimateOptionalityGain(target, goal, company);
      
      // Build opportunity with PF4 timing and PF3 second-order data
      const opportunity = {
        id: `intro-${company.id}-${goal.id}-${target.person.id}`,
        type: 'INTRODUCTION',
        companyId: company.id,
        goalId: goal.id,
        
        // Path details
        introducerId,
        introducerName: introducer?.name,
        targetPersonId: target.person.id,
        targetPersonName: target.person.name,
        targetOrg: target.person.orgId,
        path: bestPath.path,
        pathLength: bestPath.path.length - 1,
        
        // Scores
        probability,
        trustRisk,
        optionalityGain,
        relevanceScore: target.relevanceScore,
        
        // PF3: Second-order conversion data
        secondOrder: bestPath.secondOrder,
        conversionLift: bestPath.secondOrder?.conversionLift || 1.0,
        isSecondOrder: bestPath.secondOrder?.isSecondOrder || false,
        
        // PF4: Timing
        timing: timing.timing,
        timingRationale: timing.timingRationale,
        timingConfidence: timing.timingConfidence,
        
        // Explanation (PF4: force explicit rationale)
        rationale: buildRationale(goal, target, introducer, trustRisk, timing),
        
        // Metadata
        generatedAt: now.toISOString(),
        ephemeral: true
      };
      
      opportunities.push(opportunity);
    }
  }
  
  // Sort by timing priority, then by probability adjusted for risk
  const timingOrder = { 'NOW': 0, 'SOON': 1, 'LATER': 2, 'NEVER': 3 };
  opportunities.sort((a, b) => {
    // Primary: timing
    const timingDiff = timingOrder[a.timing] - timingOrder[b.timing];
    if (timingDiff !== 0) return timingDiff;
    
    // Secondary: probability * (100 - trustRiskScore)
    const aScore = a.probability * (100 - a.trustRisk.trustRiskScore);
    const bScore = b.probability * (100 - b.trustRisk.trustRiskScore);
    return bScore - aScore;
  });
  
  return opportunities;
}

/**
 * Generate intro opportunities for entire portfolio
 */
export function generatePortfolioIntroOpportunities({
  companies,
  people,
  relationships,
  investors,
  team,
  goalTrajectoriesByCompany = {},
  now = new Date()
}) {
  const allOpportunities = [];
  
  for (const company of companies) {
    const companyOpportunities = generateIntroOpportunities({
      company,
      goals: company.goals || [],
      people,
      relationships,
      investors,
      team,
      goalTrajectories: goalTrajectoriesByCompany[company.id] || [],
      now
    });
    
    allOpportunities.push(...companyOpportunities);
  }
  
  // Sort globally by timing then score
  const timingOrder = { 'NOW': 0, 'SOON': 1, 'LATER': 2, 'NEVER': 3 };
  allOpportunities.sort((a, b) => {
    const timingDiff = timingOrder[a.timing] - timingOrder[b.timing];
    if (timingDiff !== 0) return timingDiff;
    
    const aScore = a.probability * (100 - a.trustRisk.trustRiskScore) * (1 + a.optionalityGain / 100);
    const bScore = b.probability * (100 - b.trustRisk.trustRiskScore) * (1 + b.optionalityGain / 100);
    return bScore - aScore;
  });
  
  return allOpportunities;
}

export default {
  generateIntroOpportunities,
  generatePortfolioIntroOpportunities,
  TIMING_STATES,
  // Expose for testing
  buildRelationshipGraph,
  findPaths,
  isGoalBlocked,
  computeIntroTiming
};
