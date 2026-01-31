/**
 * GET /api/events
 * GET /api/events?entityId=velocity
 * 
 * Returns raw event log. Optional entityId filter.
 * UI-1 compliant: inspect only.
 */

import { getEvents } from './eventStore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { entityId } = req.query;
    let events = await getEvents();
    
    // Filter by entityId if provided
    if (entityId) {
      events = events.filter(e => e.entityId === entityId);
    }
    
    // Return raw events, newest first
    const sortedEvents = [...events].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    return res.status(200).json({ events: sortedEvents });
  } catch (err) {
    console.error('Events API error:', err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
