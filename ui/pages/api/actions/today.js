import { compute } from '../../../runtime/engine.js';
import portfolioData from '../../../raw/sample.json';
import { getExcludedActionIds } from '../eventStore.js';

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
    const now = new Date();
    const result = compute(rawData, now);
    
    // Filter out completed/skipped/executed actions
    const excludedIds = new Set(await getExcludedActionIds());
    const allActions = result.actions || [];
    const availableActions = allActions.filter(a => !excludedIds.has(a.actionId));
    
    // Return top 5 available actions
    const today = availableActions.slice(0, 5);
    
    return res.status(200).json({
      actions: today,
      metadata: {
        total: today.length,
        totalAvailable: availableActions.length,
        totalExcluded: excludedIds.size,
        timestamp: now.toISOString()
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
