/**
 * GET /api/entity/[id]
 * 
 * Returns entity data for profile pages.
 * Supports: company, person, deal, goal, firm, round, issue, action
 * 
 * Query params:
 * - type: optional entity type hint (improves lookup speed)
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliant:
 * - Read-only (no mutations)
 * - Returns raw fields + linked entity references for graph navigation
 */

import portfolioData from '../../../raw/sample.json';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, type } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Entity ID required' });
  }

  // If type is provided, use direct lookup
  if (type) {
    const entity = findEntityByType(type, id);
    if (entity) {
      return res.status(200).json(entity);
    }
    return res.status(404).json({ error: `${type} not found: ${id}` });
  }

  // Otherwise, try to infer type from ID prefix or search all
  const entity = findEntityById(id);
  
  if (!entity) {
    return res.status(404).json({ error: 'Entity not found', id });
  }

  return res.status(200).json(entity);
}

/**
 * Find entity by type and ID
 */
function findEntityByType(type, id) {
  switch (type) {
    case 'company':
      return findCompany(id);
    case 'person':
      return findPerson(id);
    case 'deal':
      return findDeal(id);
    case 'goal':
      return findGoal(id);
    case 'firm':
      return findFirm(id);
    case 'round':
      return findRound(id);
    case 'issue':
      return findIssue(id);
    case 'action':
      return findAction(id);
    default:
      return null;
  }
}

/**
 * Find entity by ID, inferring type from prefix or searching all
 */
function findEntityById(id) {
  // Try to infer type from ID prefix
  if (id.startsWith('p-')) {
    return findPerson(id);
  }
  if (id.startsWith('d-')) {
    return findDeal(id);
  }
  if (id.startsWith('g-') || /^[a-z]\d+$/.test(id)) {
    // Goals like "v1", "n1", "a1" etc
    return findGoal(id);
  }
  if (id.startsWith('i-') || id.startsWith('iss-')) {
    return findIssue(id);
  }
  if (id.startsWith('act-') || id.startsWith('action-')) {
    return findAction(id);
  }
  if (id.startsWith('f-') || id.startsWith('firm-')) {
    return findFirm(id);
  }
  if (id.startsWith('r-') || id.startsWith('round-')) {
    return findRound(id);
  }
  
  // Fall back to searching companies by ID/name
  const company = findCompany(id);
  if (company) return company;
  
  // Search all types
  return findPerson(id) || findDeal(id) || findGoal(id) || findFirm(id) || null;
}

/**
 * Find company by ID
 */
function findCompany(id) {
  const company = portfolioData.companies?.find(c => c.id === id);
  if (!company) return null;

  // Get related persons (founders)
  const founders = (company.founderPersonIds || [])
    .map(pid => portfolioData.persons?.find(p => p.id === pid))
    .filter(Boolean)
    .map(p => ({ id: p.id, name: p.name, role: p.role }));

  // Get deals
  const deals = (company.deals || []).map(d => ({
    id: d.id,
    investor: d.investor,
    status: d.status,
    amount: d.amount,
  }));

  // Get goals
  const goals = (company.goals || []).map(g => ({
    id: g.id,
    name: g.name,
    type: g.type,
    status: g.status,
    current: g.current,
    target: g.target,
    due: g.due,
  }));

  return {
    type: 'company',
    id: company.id,
    name: company.name,
    tagline: company.tagline,
    stage: company.stage,
    hq: company.hq,
    sector: company.sector,
    employees: company.employees,
    burn: company.burn,
    cash: company.cash,
    raising: company.raising,
    roundTarget: company.roundTarget,
    asOf: company.asOf,
    // Linked entities for graph navigation
    founders: founders.length > 0 ? founders : company.founders,
    deals,
    goals,
  };
}

/**
 * Find person by ID
 */
function findPerson(id) {
  const person = portfolioData.persons?.find(p => p.id === id);
  if (!person) return null;

  // Find relationships involving this person
  const relationships = (portfolioData.relationships || [])
    .filter(r => r.fromPersonId === id || r.toPersonId === id)
    .map(r => {
      const otherId = r.fromPersonId === id ? r.toPersonId : r.fromPersonId;
      const otherPerson = portfolioData.persons?.find(p => p.id === otherId);
      return {
        id: r.id,
        personId: otherId,
        personName: otherPerson?.name || otherId,
        relationshipType: r.relationshipType,
        strength: r.strength,
        lastTouchAt: r.lastTouchAt,
        channel: r.channel,
      };
    });

  // Find the company/org they belong to
  let org = null;
  if (person.orgId && person.orgType === 'company') {
    const company = portfolioData.companies?.find(c => c.id === person.orgId);
    if (company) {
      org = { id: company.id, name: company.name, type: 'company' };
    }
  }

  return {
    type: 'person',
    id: person.id,
    name: person.name,
    role: person.role,
    orgType: person.orgType,
    tags: person.tags,
    asOf: person.asOf,
    org,
    relationships,
  };
}

/**
 * Find deal by ID
 */
function findDeal(id) {
  for (const company of portfolioData.companies || []) {
    const deal = company.deals?.find(d => d.id === id);
    if (deal) {
      // Find investor person if available
      const investorPerson = portfolioData.persons?.find(
        p => p.orgId === deal.investorId || p.name?.includes(deal.investor)
      );

      return {
        type: 'deal',
        id: deal.id,
        investor: deal.investor,
        investorId: deal.investorId,
        status: deal.status,
        probability: deal.probability,
        amount: deal.amount,
        asOf: deal.asOf,
        // Linked entities
        company: { id: company.id, name: company.name },
        investorPerson: investorPerson ? { id: investorPerson.id, name: investorPerson.name } : null,
      };
    }
  }
  return null;
}

/**
 * Find goal by ID
 */
function findGoal(id) {
  for (const company of portfolioData.companies || []) {
    const goal = company.goals?.find(g => g.id === id);
    if (goal) {
      return {
        type: 'goal',
        id: goal.id,
        name: goal.name,
        goalType: goal.type,
        status: goal.status,
        current: goal.current,
        target: goal.target,
        due: goal.due,
        asOf: goal.asOf,
        // Linked entities
        company: { id: company.id, name: company.name },
      };
    }
  }
  return null;
}

/**
 * Find firm by ID
 * Note: Firms (investors) are referenced in deals but not stored as top-level entities in current sample
 * We synthesize firm data from investor references
 */
function findFirm(id) {
  // Check if ID matches an investor ID pattern
  const investorId = id.startsWith('i') ? id : `i${id}`;
  
  // Find all deals with this investor
  const deals = [];
  let firmName = null;
  
  for (const company of portfolioData.companies || []) {
    for (const deal of company.deals || []) {
      if (deal.investorId === investorId || deal.investorId === id) {
        if (!firmName) firmName = deal.investor;
        deals.push({
          id: deal.id,
          companyId: company.id,
          companyName: company.name,
          status: deal.status,
          amount: deal.amount,
        });
      }
    }
  }

  if (deals.length === 0) return null;

  // Find the investor's person record
  const partners = (portfolioData.persons || [])
    .filter(p => p.orgId === investorId || p.orgId === id)
    .map(p => ({ id: p.id, name: p.name, role: p.role }));

  return {
    type: 'firm',
    id: investorId,
    name: firmName || id,
    // Linked entities
    deals,
    partners,
  };
}

/**
 * Find round by ID
 * Note: Rounds are implicit in current data (company.roundTarget, deals grouped by round)
 * We synthesize round data from company fundraising state
 */
function findRound(id) {
  // Try to find a company that's raising and match the round
  for (const company of portfolioData.companies || []) {
    if (company.raising && company.roundTarget > 0) {
      const roundId = `round-${company.id}`;
      if (id === roundId || id === `r-${company.id}`) {
        // Aggregate deals into this round
        const allocations = (company.deals || []).map(d => ({
          investorId: d.investorId,
          investor: d.investor,
          amount: d.amount,
          status: d.status,
          probability: d.probability,
        }));

        const committed = allocations
          .filter(a => a.status === 'termsheet' || a.status === 'closed')
          .reduce((sum, a) => sum + (a.amount || 0), 0);

        return {
          type: 'round',
          id: roundId,
          name: `${company.stage} Round`,
          stage: company.stage,
          target: company.roundTarget,
          committed,
          status: committed >= company.roundTarget ? 'closed' : 'active',
          // Linked entities
          company: { id: company.id, name: company.name },
          allocations,
        };
      }
    }
  }
  return null;
}

/**
 * Find issue by ID
 * Note: Issues are not explicitly stored in current sample data
 * Return null or synthesize from goals that are off-track
 */
function findIssue(id) {
  // Issues could be synthesized from goals that are behind schedule
  // For now, return null as there's no explicit issue data
  return null;
}

/**
 * Find action by ID
 * Actions are stored in actionEvents.json, not sample.json
 */
function findAction(id) {
  // Actions would come from the runtime action system
  // The profile page will fetch from /api/actions/today separately
  return null;
}
