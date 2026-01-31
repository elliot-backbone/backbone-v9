import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Import the compute engine from within ui directory
import { compute } from '../../../runtime/engine.js';

// Import data directly as modules to ensure they're bundled
import portfolioData from '../../../raw/sample.json';
import actionEventsData from '../../../raw/actionEvents.json';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawData = portfolioData;
    const events = actionEventsData || [];
    const result = compute(rawData, events);
    const today = result.rankedActions || [];
    
    return res.status(200).json({
      actions: today,
      metadata: {
        total: today.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
