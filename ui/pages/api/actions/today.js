import { compute } from '../../../runtime/engine.js';
import portfolioData from '../../../raw/sample.json';
import actionEventsData from '../../../raw/actionEvents.json';

// Parse date strings recursively throughout the entire object tree
function parseDates(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(parseDates);
  if (typeof obj !== 'object') {
    // Check if this string looks like an ISO date
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(obj)) {
      return new Date(obj);
    }
    return obj;
  }
  
  const parsed = {};
  for (const [key, value] of Object.entries(obj)) {
    parsed[key] = parseDates(value);
  }
  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawData = parseDates(portfolioData);
    const events = parseDates(actionEventsData) || [];
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
