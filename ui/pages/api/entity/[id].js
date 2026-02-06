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

import portfolioData from '@backbone/core/raw/sample.json';

// =============================================================================
// FIELD NORMALIZATION (handles both old verbose and new compressed field names)
// =============================================================================

function normalizeDeal(d) {
  return {
    ...d,
    amount: d.amount ?? d.amt,
    probability: d.probability ?? d.prob,
    leadPersonIds: d.leadPersonIds ?? d.lead ?? [],
  };
}

function normalizeGoal(g) {
  return {
    ...g,
    current: g.current ?? g.cur,
    target: g.target ?? g.tgt,
  };
}

function normalizeRound(r) {
  return {
    ...r,
    target: r.target ?? r.tgt,
  };
}

function normalizeRelationship(r) {
  return {
    ...r,
    fromPersonId: r.fromPersonId ?? r.from,
    toPersonId: r.toPersonId ?? r.to,
    relationshipType: r.relationshipType ?? r.type,
    strength: r.strength ?? r.str,
    lastTouchAt: r.lastTouchAt ?? r.touched,
    channel: r.channel ?? r.ch,
    introducedBy: r.introducedBy ?? r.intro ?? null,
    introCount: r.introCount ?? r.introN ?? 0,
    introSuccessCount: r.introSuccessCount ?? r.introOk ?? 0,
  };
}

// =============================================================================
// API HANDLER
// =============================================================================

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
    .map(pid => portfolioData.people?.find(p => p.id === pid))
    .filter(Boolean)
    .map(p => ({ id: p.id, name: p.name, role: p.role }));

  // Get rounds from top-level array
  const rounds = (portfolioData.rounds || [])
    .filter(r => r.companyId === id)
    .map(r => {
      const nr = normalizeRound(r);
      return {
        id: nr.id,
        stage: nr.stage,
        target: nr.target,
        raised: nr.raised,
        status: nr.status,
      };
    });

  // Derive cap table investors from closed deals (aggregated by firm)
  const closedDeals = (portfolioData.deals || [])
    .filter(d => d.companyId === id && d.status === 'closed')
    .map(normalizeDeal);
  
  const investorMap = new Map();
  for (const deal of closedDeals) {
    // Look up firm name from investors array
    const firm = portfolioData.investors?.find(f => f.id === deal.firmId);
    const firmName = firm?.name || deal.firmId;
    
    const key = deal.firmId;
    if (!investorMap.has(key)) {
      investorMap.set(key, {
        id: deal.firmId,
        name: firmName,
        totalInvested: 0,
        rounds: [],
      });
    }
    const inv = investorMap.get(key);
    inv.totalInvested += deal.amount || 0;
    // Extract round stage from deal's roundId
    const round = (portfolioData.rounds || []).find(r => r.id === deal.roundId);
    if (round && !inv.rounds.includes(round.stage)) {
      inv.rounds.push(round.stage);
    }
  }
  const investors = Array.from(investorMap.values())
    .sort((a, b) => b.totalInvested - a.totalInvested);

  // Get goals from top-level array
  const goals = (portfolioData.goals || [])
    .filter(g => g.companyId === id)
    .map(g => {
      const ng = normalizeGoal(g);
      return {
        id: ng.id,
        name: ng.name,
        type: ng.type,
        status: ng.status,
        current: ng.current,
        target: ng.target,
        due: ng.due,
      };
    });

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
    isPortfolio: company.isPortfolio,
    asOf: company.asOf,
    // Linked entities for graph navigation
    founders: founders.length > 0 ? founders : company.founders,
    rounds,
    investors,
    goals,
  };
}

/**
 * Find person by ID
 */
function findPerson(id) {
  const person = portfolioData.people?.find(p => p.id === id);
  if (!person) return null;

  // Find relationships involving this person
  const relationships = (portfolioData.relationships || [])
    .map(normalizeRelationship)
    .filter(r => r.fromPersonId === id || r.toPersonId === id)
    .map(r => {
      const otherId = r.fromPersonId === id ? r.toPersonId : r.fromPersonId;
      const otherPerson = portfolioData.people?.find(p => p.id === otherId);
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
  const rawDeal = portfolioData.deals?.find(d => d.id === id);
  if (!rawDeal) return null;
  
  const deal = normalizeDeal(rawDeal);

  // Get company info
  const company = portfolioData.companies?.find(c => c.id === deal.companyId);
  
  // Get firm info
  const firm = portfolioData.investors?.find(f => f.id === deal.firmId);

  // Get lead person
  const leadPersonId = deal.leadPersonIds?.[0];
  const leadPerson = leadPersonId
    ? portfolioData.people?.find(p => p.id === leadPersonId)
    : null;

  return {
    type: 'deal',
    id: deal.id,
    firmId: deal.firmId,
    firmName: firm?.name || deal.firmId,
    status: deal.status,
    probability: deal.probability,
    amount: deal.amount,
    isLead: deal.isLead,
    firstContact: deal.firstContact,
    lastActivity: deal.lastActivity,
    closedAt: deal.closedAt,
    asOf: deal.asOf,
    // Linked entities
    company: company ? { id: company.id, name: company.name } : { id: deal.companyId },
    firm: firm ? { id: firm.id, name: firm.name } : null,
    round: { id: deal.roundId },
    leadPerson: leadPerson ? { id: leadPerson.id, name: leadPerson.name } : null,
  };
}

/**
 * Find goal by ID
 */
function findGoal(id) {
  const rawGoal = portfolioData.goals?.find(g => g.id === id);
  if (!rawGoal) return null;
  
  const goal = normalizeGoal(rawGoal);
  const company = portfolioData.companies?.find(c => c.id === goal.companyId);

  return {
    type: 'goal',
    id: goal.id,
    name: goal.name,
    goalType: goal.type,
    status: goal.status,
    current: goal.current,
    target: goal.target,
    due: goal.due,
    unlocks: goal.unlocks,
    asOf: goal.asOf,
    // Linked entities
    company: company ? { id: company.id, name: company.name } : { id: goal.companyId },
  };
}

/**
 * Find firm by ID
 * Uses the investors array in sample.json
 */
function findFirm(id) {
  const investor = portfolioData.investors?.find(inv => inv.id === id);
  if (!investor) return null;

  // Find all deals with this firm from top-level deals array
  const deals = (portfolioData.deals || [])
    .filter(d => d.firmId === id)
    .map(d => {
      const nd = normalizeDeal(d);
      const company = portfolioData.companies?.find(c => c.id === nd.companyId);
      return {
        id: nd.id,
        companyId: nd.companyId,
        companyName: company?.name || nd.companyId,
        status: nd.status,
        amount: nd.amount,
      };
    });

  // Find partner person records
  const partners = (portfolioData.people || [])
    .filter(p => p.id === investor.personId || p.orgId === id)
    .map(p => ({ id: p.id, name: p.name, role: p.role }));

  return {
    type: 'firm',
    id: investor.id,
    name: investor.name,
    aum: investor.aum,
    stageFocus: investor.stageFocus,
    sectorFocus: investor.sectorFocus,
    asOf: investor.asOf,
    // Linked entities
    deals,
    partners,
  };
}

/**
 * Find round by ID
 * Rounds are top-level entities linked to companies
 */
function findRound(id) {
  const rawRound = portfolioData.rounds?.find(r => r.id === id);
  if (!rawRound) return null;
  
  const round = normalizeRound(rawRound);

  // Get company
  const company = portfolioData.companies?.find(c => c.id === round.companyId);

  // Get deals for this round
  const deals = (portfolioData.deals || [])
    .filter(d => d.roundId === id)
    .map(d => {
      const nd = normalizeDeal(d);
      const firm = portfolioData.investors?.find(f => f.id === nd.firmId);
      return {
        id: nd.id,
        firmId: nd.firmId,
        firmName: firm?.name || nd.firmId,
        amount: nd.amount,
        status: nd.status,
        probability: nd.probability,
        isLead: nd.isLead,
      };
    });

  // Get lead firm
  const leadFirm = round.leadFirmId
    ? portfolioData.investors?.find(f => f.id === round.leadFirmId)
    : null;

  return {
    type: 'round',
    id: round.id,
    stage: round.stage,
    target: round.target,
    raised: round.raised,
    status: round.status,
    openedAt: round.openedAt,
    closedAt: round.closedAt,
    asOf: round.asOf,
    // Linked entities
    company: company ? { id: company.id, name: company.name } : { id: round.companyId },
    leadFirm: leadFirm ? { id: leadFirm.id, name: leadFirm.name } : null,
    deals,
  };
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
