import { loadRawData } from '@backbone/core/raw/loadRawData.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = loadRawData();
    const companies = (data.companies || []).filter(c => c.isPortfolio);

    // Build constraint lookup
    const constraintsByCompany = new Map();
    for (const constraint of (data.constraints || [])) {
      const list = constraintsByCompany.get(constraint.companyId) || [];
      list.push(constraint);
      constraintsByCompany.set(constraint.companyId, list);
    }
    const now = Date.now();
    const MS_PER_DAY = 86400000;

    const snapshots = companies.map(c => {
      const runwayMonths = c.burn > 0 ? Math.round((c.cash || 0) / c.burn) : null;

      // Upcoming constraints (within 60 days, sorted by date)
      const companyConstraints = (constraintsByCompany.get(c.id) || [])
        .map(con => {
          const daysUntil = Math.round((new Date(con.date).getTime() - now) / MS_PER_DAY);
          return { ...con, daysUntil };
        })
        .filter(con => con.daysUntil >= -3 && con.daysUntil <= 60)
        .sort((a, b) => a.daysUntil - b.daysUntil);

      return {
        id: c.id,
        name: c.name,
        stage: c.stage,
        sector: c.sector || c.industry,
        burn: c.burn,
        cash: c.cash,
        runway: runwayMonths,
        arr: c.arr,
        headcount: c.employees,
        raising: c.raising || false,
        roundTarget: c.roundTarget,
        constraints: companyConstraints,
      };
    });

    return res.status(200).json({ companies: snapshots });
  } catch (err) {
    console.error('Companies API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
