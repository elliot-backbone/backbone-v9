/**
 * GET /api/entities
 * 
 * Returns all entities for search/browse functionality.
 * Supports optional query param for filtering.
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Read-only endpoint
 * - No derived fields computed here
 * - Supports discovery without replacing Next Action as primary surface
 */

import portfolioData from '../../raw/sample.json';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, type, counts } = req.query;
  const query = (q || '').toLowerCase().trim();
  
  // Return just counts if requested
  if (counts === 'true') {
    const countData = {
      company: (portfolioData.companies || []).length,
      person: (portfolioData.people || []).length,
      firm: (portfolioData.firms || []).length,
      round: (portfolioData.rounds || []).length,
      deal: (portfolioData.deals || []).length,
      goal: (portfolioData.goals || []).length,
      issue: 0,
      action: 0,
    };
    return res.status(200).json({ counts: countData });
  }
  
  const results = [];
  
  // Companies
  if (!type || type === 'company') {
    for (const company of portfolioData.companies || []) {
      if (!query || 
          company.name?.toLowerCase().includes(query) ||
          company.sector?.toLowerCase().includes(query) ||
          company.stage?.toLowerCase().includes(query)) {
        results.push({
          id: company.id,
          type: 'company',
          name: company.name || 'Unknown',
          descriptor: [company.stage, company.sector].filter(Boolean).join(' · '),
        });
      }
    }
  }
  
  // People
  if (!type || type === 'person') {
    for (const person of portfolioData.people || []) {
      const personName = person.name || `${person.fn || ''} ${person.ln || ''}`.trim() || 'Unknown';
      if (!query ||
          personName.toLowerCase().includes(query) ||
          person.role?.toLowerCase().includes(query) ||
          person.title?.toLowerCase().includes(query) ||
          person.tags?.some(t => t.toLowerCase().includes(query))) {
        results.push({
          id: person.id,
          type: 'person',
          name: personName,
          descriptor: person.title || person.role || person.orgType,
        });
      }
    }
  }
  
  // Firms (investors)
  if (!type || type === 'firm') {
    for (const firm of portfolioData.firms || []) {
      if (!query ||
          firm.name?.toLowerCase().includes(query) ||
          firm.sectorFocus?.toLowerCase().includes(query)) {
        results.push({
          id: firm.id,
          type: 'firm',
          name: firm.name,
          descriptor: [firm.stageFocus, firm.aum].filter(Boolean).join(' · '),
        });
      }
    }
  }
  
  // Rounds (top-level array)
  if (!type || type === 'round') {
    for (const round of portfolioData.rounds || []) {
      if (!query ||
          round.companyName?.toLowerCase().includes(query) ||
          round.stage?.toLowerCase().includes(query) ||
          'round'.includes(query)) {
        
        const pctFilled = round.target > 0 
          ? Math.round((round.raised / round.target) * 100) 
          : 0;
        
        results.push({
          id: round.id,
          type: 'round',
          name: `${round.companyName} ${round.stage}`,
          descriptor: `$${(round.target / 1000000).toFixed(1)}M · ${round.status} · ${pctFilled}% raised`,
        });
      }
    }
  }
  
  // Deals (top-level array)
  if (!type || type === 'deal') {
    for (const deal of portfolioData.deals || []) {
      if (!query ||
          deal.firmName?.toLowerCase().includes(query) ||
          deal.companyName?.toLowerCase().includes(query) ||
          deal.status?.toLowerCase().includes(query)) {
        results.push({
          id: deal.id,
          type: 'deal',
          name: `${deal.companyName} ↔ ${deal.firmName}`,
          descriptor: deal.status,
        });
      }
    }
  }
  
  // Goals (top-level array)
  if (!type || type === 'goal') {
    for (const goal of portfolioData.goals || []) {
      if (!query ||
          goal.name?.toLowerCase().includes(query) ||
          goal.type?.toLowerCase().includes(query) ||
          goal.companyName?.toLowerCase().includes(query)) {
        results.push({
          id: goal.id,
          type: 'goal',
          name: goal.name,
          descriptor: `${goal.companyName} · ${goal.type}`,
        });
      }
    }
  }
  
  // Sort: by type (companies first), then by name within type
  const typeOrder = { company: 0, firm: 1, person: 2, round: 3, deal: 4, goal: 5, issue: 6, action: 7 };
  results.sort((a, b) => {
    const typeCompare = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
    if (typeCompare !== 0) return typeCompare;
    return a.name.localeCompare(b.name);
  });
  
  return res.status(200).json({
    entities: results,
    total: results.length,
  });
}
