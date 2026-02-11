import { compute } from '@backbone/core/runtime/engine';
import { loadRawData } from '@backbone/core/raw/loadRawData.js';
import { getExcludedActionIds, getEvents } from '../eventStore.js';

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
    const rawData = parseDates(loadRawData());
    const now = new Date();
    
    // UI-3: Get events for pattern detection
    const events = await getEvents();
    
    // Pass events to compute for pattern lift integration
    const result = compute(rawData, now, { events });
    
    // Filter out terminalized actions (UI-2.1: not executed, only observed/skipped)
    const excludedIds = new Set(await getExcludedActionIds());
    const allActions = result.actions || [];
    const availableActions = allActions.filter(a => !excludedIds.has(a.actionId));
    
    // Count by source type
    const bySource = {};
    availableActions.forEach(a => {
      const src = a.sources?.[0]?.sourceType || 'OTHER';
      bySource[src] = (bySource[src] || 0) + 1;
    });
    
    // Collect all preissues from engine output for UI surfaces
    const allPreissues = (result.companies || []).flatMap(c =>
      (c.derived?.preissues || []).map(p => ({
        ...p,
        companyId: p.companyId || c.id,
        companyName: p.companyName || c.name,
      }))
    );

    // Return all available actions + preissues (UI will paginate)
    return res.status(200).json({
      actions: availableActions,
      preissues: allPreissues,
      metadata: {
        total: availableActions.length,
        totalAvailable: availableActions.length,
        totalExcluded: excludedIds.size,
        totalPreissues: allPreissues.length,
        bySource,
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
