/**
 * trustRisk.js
 * Backbone V9 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Trust Risk Calculator
 * 
 * Computes trustRisk for introduction opportunities.
 * Trust risk is a social-capital downside model, not a vibe.
 * 
 * Inputs:
 * 1. Relationship strength (0-100)
 * 2. Recency (days since last touch)
 * 3. Capital spent (intros in last 30/90 days)
 * 4. Warmth of path (direct vs 2-hop vs 3-hop)
 * 5. Fit mismatch risk (goal alignment, sector match)
 * 6. Reputational asymmetry (who is introducing)
 * 
 * Output:
 * - trustRiskScore (0-100)
 * - trustRiskBand: 'low' | 'medium' | 'high'
 * - trustRiskReason[] (2-4 explanations)
 */

/**
 * Recency buckets and their penalty multipliers
 */
const RECENCY_BUCKETS = [
  { maxDays: 7, penalty: 0, label: 'very-recent' },
  { maxDays: 30, penalty: 10, label: 'recent' },
  { maxDays: 90, penalty: 25, label: 'moderate' },
  { maxDays: Infinity, penalty: 40, label: 'stale' }
];

/**
 * Path length penalties
 */
const PATH_PENALTIES = {
  1: 0,    // direct
  2: 15,   // 2-hop
  3: 35,   // 3-hop
  default: 50  // 4+ hops
};

/**
 * Intro frequency penalties (asks in last 90 days to same person)
 */
const INTRO_FREQUENCY_PENALTIES = [
  { maxIntros: 0, penalty: 0 },
  { maxIntros: 1, penalty: 5 },
  { maxIntros: 2, penalty: 15 },
  { maxIntros: 3, penalty: 30 },
  { maxIntros: Infinity, penalty: 50 }
];

/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d2 - d1);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get recency penalty based on days since last touch
 */
function getRecencyPenalty(daysSinceTouch) {
  for (const bucket of RECENCY_BUCKETS) {
    if (daysSinceTouch <= bucket.maxDays) {
      return { penalty: bucket.penalty, label: bucket.label };
    }
  }
  return { penalty: 40, label: 'stale' };
}

/**
 * Get path penalty based on hop count
 */
function getPathPenalty(hops) {
  return PATH_PENALTIES[hops] ?? PATH_PENALTIES.default;
}

/**
 * Get intro frequency penalty
 */
function getIntroFrequencyPenalty(introsLast90Days) {
  for (const bucket of INTRO_FREQUENCY_PENALTIES) {
    if (introsLast90Days <= bucket.maxIntros) {
      return bucket.penalty;
    }
  }
  return 50;
}

/**
 * Calculate fit mismatch penalty
 * @param {Object} params
 * @param {string[]} targetTags - tags of the target person
 * @param {string[]} goalTags - tags relevant to the goal
 * @param {string} targetSector - sector of target
 * @param {string} companySector - sector of company needing intro
 */
function getFitMismatchPenalty({ targetTags = [], goalTags = [], targetSector, companySector }) {
  let penalty = 0;
  const reasons = [];

  // Check tag overlap
  const tagOverlap = targetTags.filter(t => goalTags.includes(t)).length;
  if (tagOverlap === 0 && goalTags.length > 0) {
    penalty += 20;
    reasons.push('No expertise overlap with goal requirements');
  } else if (tagOverlap === 1) {
    penalty += 10;
    reasons.push('Weak expertise overlap');
  }

  // Check sector match
  if (targetSector && companySector && targetSector !== companySector) {
    // Some sectors are adjacent
    const adjacentSectors = {
      'Payments': ['Fintech', 'Crypto', 'Financial Infrastructure'],
      'Fintech': ['Payments', 'Enterprise Software', 'Crypto'],
      'Enterprise Software': ['Developer Tools', 'AI', 'Fintech'],
      'Developer Tools': ['Enterprise Software', 'AI'],
      'Crypto': ['Fintech', 'Payments'],
      'AI': ['Enterprise Software', 'Developer Tools']
    };
    
    const isAdjacent = adjacentSectors[companySector]?.includes(targetSector);
    if (!isAdjacent) {
      penalty += 15;
      reasons.push(`Sector mismatch: ${targetSector} vs ${companySector}`);
    }
  }

  return { penalty, reasons };
}

/**
 * Calculate reputational asymmetry penalty
 * Higher penalty if the introducer has more to lose
 * @param {Object} params
 * @param {string} introducerRole - role of person making intro
 * @param {number} relationshipStrength - strength with target
 * @param {number} introSuccessRate - historical success rate
 */
function getReputationalPenalty({ introducerRole, relationshipStrength, introSuccessRate }) {
  let penalty = 0;
  const reasons = [];

  // Senior roles have more reputational risk
  const seniorRoles = ['Managing Partner', 'Partner', 'CEO', 'CTO'];
  const isSenior = seniorRoles.some(r => introducerRole?.includes(r));
  
  if (isSenior && relationshipStrength < 70) {
    penalty += 15;
    reasons.push('Senior introducer with moderate relationship strength');
  }

  // Poor historical success rate increases risk
  if (introSuccessRate !== undefined && introSuccessRate < 0.5) {
    penalty += 10;
    reasons.push(`Below-average intro success rate (${Math.round(introSuccessRate * 100)}%)`);
  }

  return { penalty, reasons };
}

/**
 * Main trust risk calculation
 * @param {Object} params
 * @param {Object} relationship - the relationship edge being used
 * @param {number} pathLength - number of hops (1 = direct)
 * @param {number} introsLast90Days - number of intros to this person in last 90 days
 * @param {Object} targetPerson - the person being introduced to
 * @param {Object} goal - the goal this intro supports
 * @param {Object} company - the company needing the intro
 * @param {Object} introducer - the person making the intro
 * @param {Date|string} now - current date for recency calculation
 */
export function calculateTrustRisk({
  relationship,
  pathLength = 1,
  introsLast90Days = 0,
  targetPerson = {},
  goal = {},
  company = {},
  introducer = {},
  now = new Date()
}) {
  const reasons = [];
  let totalPenalty = 0;

  // 1. Base from relationship strength (invert: higher strength = lower risk)
  const strengthPenalty = Math.max(0, 100 - (relationship?.strength ?? 50));
  const strengthContribution = strengthPenalty * 0.3; // Weight: 30%
  totalPenalty += strengthContribution;
  
  if (relationship?.strength < 50) {
    reasons.push(`Weak relationship (strength: ${relationship?.strength ?? 'unknown'})`);
  }

  // 2. Recency penalty
  const daysSinceTouch = relationship?.lastTouchAt 
    ? daysBetween(relationship.lastTouchAt, now)
    : 180; // Default to stale if unknown
  
  const recency = getRecencyPenalty(daysSinceTouch);
  totalPenalty += recency.penalty;
  
  if (recency.penalty > 10) {
    reasons.push(`${recency.label} contact (${daysSinceTouch} days ago)`);
  }

  // 3. Capital spent / ask frequency
  const frequencyPenalty = getIntroFrequencyPenalty(introsLast90Days);
  totalPenalty += frequencyPenalty;
  
  if (frequencyPenalty > 10) {
    reasons.push(`Recent intro requests (${introsLast90Days} in last 90 days)`);
  }

  // 4. Path warmth
  const pathPenalty = getPathPenalty(pathLength);
  totalPenalty += pathPenalty;
  
  if (pathLength > 1) {
    reasons.push(`${pathLength}-hop path (not direct relationship)`);
  }

  // 5. Fit mismatch
  const goalTags = getGoalTags(goal);
  const fitResult = getFitMismatchPenalty({
    targetTags: targetPerson?.tags ?? [],
    goalTags,
    targetSector: targetPerson?.orgType === 'investor' ? 'Investor' : null,
    companySector: company?.sector
  });
  totalPenalty += fitResult.penalty;
  reasons.push(...fitResult.reasons);

  // 6. Reputational asymmetry
  const introSuccessRate = relationship?.introCount > 0
    ? (relationship.introSuccessCount ?? 0) / relationship.introCount
    : undefined;
  
  const reputationalResult = getReputationalPenalty({
    introducerRole: introducer?.role,
    relationshipStrength: relationship?.strength,
    introSuccessRate
  });
  totalPenalty += reputationalResult.penalty;
  reasons.push(...reputationalResult.reasons);

  // Clamp to 0-100
  const trustRiskScore = Math.min(100, Math.max(0, Math.round(totalPenalty)));

  // Determine band
  let trustRiskBand;
  if (trustRiskScore <= 30) {
    trustRiskBand = 'low';
  } else if (trustRiskScore <= 60) {
    trustRiskBand = 'medium';
  } else {
    trustRiskBand = 'high';
  }

  // Limit reasons to 4 most significant
  const topReasons = reasons.slice(0, 4);

  return {
    trustRiskScore,
    trustRiskBand,
    trustRiskReason: topReasons.length > 0 ? topReasons : ['Baseline risk assessment']
  };
}

/**
 * Extract relevant tags from a goal for matching
 */
function getGoalTags(goal) {
  const tags = [];
  
  if (goal?.type === 'fundraise') {
    tags.push('investor', 'fundraising', 'capital');
    // Stage-specific tags
    if (goal.name?.toLowerCase().includes('seed')) tags.push('seed', 'pre-seed');
    if (goal.name?.toLowerCase().includes('series')) tags.push('series-a', 'growth');
  }
  
  if (goal?.type === 'partnership') {
    tags.push('partnerships', 'business-development');
  }
  
  if (goal?.type === 'hiring') {
    tags.push('hiring', 'recruiting', 'talent');
  }
  
  if (goal?.type === 'revenue') {
    tags.push('sales', 'customers', 'growth');
  }

  return tags;
}

/**
 * Check if trust risk should block amplification
 */
export function shouldBlockAmplification(trustRisk) {
  return trustRisk.trustRiskBand === 'high';
}

/**
 * Get intro capital available for a relationship
 * (how many more intros can be made without excessive risk)
 */
export function getIntroCapitalRemaining(introsLast90Days) {
  if (introsLast90Days >= 3) return 0;
  if (introsLast90Days >= 2) return 1;
  if (introsLast90Days >= 1) return 2;
  return 3;
}

export default {
  calculateTrustRisk,
  shouldBlockAmplification,
  getIntroCapitalRemaining,
  // Expose for testing
  getRecencyPenalty,
  getPathPenalty,
  getIntroFrequencyPenalty
};
