/**
 * GET /api/entity/[id]
 * 
 * Returns raw entity data. No derived fields, no scores.
 * UI-1 compliant: inspect only.
 * 
 * Supports:
 * - company: /api/entity/velocity
 * - deal: /api/entity/d-vel-1
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Load raw data
function loadRawData() {
  try {
    const dataPath = join(process.cwd(), 'raw', 'sample.json');
    const data = JSON.parse(readFileSync(dataPath, 'utf8'));
    return data;
  } catch (err) {
    console.error('Failed to load raw data:', err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Entity ID required' });
  }

  const data = loadRawData();
  if (!data) {
    return res.status(500).json({ error: 'Failed to load data' });
  }

  // Check if it's a deal ID (starts with d-)
  if (id.startsWith('d-')) {
    // Find deal across all companies
    for (const company of data.companies) {
      const deal = company.deals?.find(d => d.id === id);
      if (deal) {
        return res.status(200).json({
          type: 'deal',
          id: deal.id,
          investor: deal.investor,
          status: deal.status,
          amount: deal.amount,
          asOf: deal.asOf,
          companyId: company.id,
          companyName: company.name
        });
      }
    }
    return res.status(404).json({ error: 'Deal not found' });
  }

  // Otherwise treat as company ID
  const company = data.companies.find(c => c.id === id);
  
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Return raw fields only - no derived data
  return res.status(200).json({
    type: 'company',
    id: company.id,
    name: company.name,
    tagline: company.tagline,
    stage: company.stage,
    hq: company.hq,
    sector: company.sector,
    employees: company.employees,
    raising: company.raising,
    asOf: company.asOf,
    founders: company.founders?.map(f => ({
      name: f.name,
      role: f.role
    }))
  });
}
