import { loadRawData } from '@backbone/core/raw/loadRawData.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = loadRawData();
    const companies = (data.companies || []).filter(c => c.isPortfolio);

    const snapshots = companies.map(c => {
      const runwayMonths = c.burn > 0 ? Math.round((c.cash || 0) / c.burn) : null;

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
      };
    });

    return res.status(200).json({ companies: snapshots });
  } catch (err) {
    console.error('Companies API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
