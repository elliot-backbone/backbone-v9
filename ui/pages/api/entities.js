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

  const { q, type } = req.query;
  const query = (q || '').toLowerCase().trim();
  
  const results = [];
  
  // Companies
  if (!type || type === 'company') {
    for (const company of portfolioData.companies) {
      if (!query || 
          company.name.toLowerCase().includes(query) ||
          company.sector?.toLowerCase().includes(query) ||
          company.stage?.toLowerCase().includes(query)) {
        results.push({
          id: company.id,
          type: 'company',
          name: company.name,
          descriptor: [company.stage, company.sector].filter(Boolean).join(' · '),
        });
      }
    }
  }
  
  // People
  if (!type || type === 'person') {
    for (const person of portfolioData.people || []) {
      if (!query ||
          person.name.toLowerCase().includes(query) ||
          person.role?.toLowerCase().includes(query) ||
          person.tags?.some(t => t.toLowerCase().includes(query))) {
        results.push({
          id: person.id,
          type: 'person',
          name: person.name,
          descriptor: person.role || person.orgType,
        });
      }
    }
  }
  
  // Firms (investors)
  if (!type || type === 'firm') {
    for (const investor of portfolioData.investors || []) {
      if (!query ||
          investor.name.toLowerCase().includes(query) ||
          investor.sectorFocus?.toLowerCase().includes(query)) {
        results.push({
          id: investor.id,
          type: 'firm',
          name: investor.name,
          descriptor: [investor.stageFocus, investor.aum].filter(Boolean).join(' · '),
        });
      }
    }
  }
  
  // Deals
  if (!type || type === 'deal') {
    for (const company of portfolioData.companies) {
      for (const deal of company.deals || []) {
        if (!query ||
            deal.investor?.toLowerCase().includes(query) ||
            company.name.toLowerCase().includes(query) ||
            deal.status?.toLowerCase().includes(query)) {
          results.push({
            id: deal.id,
            type: 'deal',
            name: `${company.name} ↔ ${deal.investor}`,
            descriptor: deal.status,
          });
        }
      }
    }
  }
  
  // Goals
  if (!type || type === 'goal') {
    for (const company of portfolioData.companies) {
      for (const goal of company.goals || []) {
        if (!query ||
            goal.name?.toLowerCase().includes(query) ||
            goal.type?.toLowerCase().includes(query) ||
            company.name.toLowerCase().includes(query)) {
          results.push({
            id: goal.id,
            type: 'goal',
            name: goal.name,
            descriptor: `${company.name} · ${goal.type}`,
          });
        }
      }
    }
  }
  
  // Rounds (derived from companies that are raising)
  if (!type || type === 'round') {
    for (const company of portfolioData.companies) {
      if (company.raising && company.roundTarget > 0) {
        const roundName = `${company.name} ${company.stage}`;
        if (!query ||
            company.name.toLowerCase().includes(query) ||
            company.stage?.toLowerCase().includes(query) ||
            'round'.includes(query)) {
          
          // Calculate committed amount from deals
          const committed = (company.deals || [])
            .filter(d => d.status === 'termsheet' || d.status === 'closed')
            .reduce((sum, d) => sum + (d.amount || 0), 0);
          
          const pctFilled = company.roundTarget > 0 
            ? Math.round((committed / company.roundTarget) * 100) 
            : 0;
          
          results.push({
            id: `round-${company.id}`,
            type: 'round',
            name: roundName,
            descriptor: `$${(company.roundTarget / 1000000).toFixed(1)}M target · ${pctFilled}% filled`,
          });
        }
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
