import { getDebugInfo, getEvents } from './eventStore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const debug = getDebugInfo();
    const events = await getEvents();
    
    return res.status(200).json({
      ...debug,
      eventsCount: events.length,
      recentEvents: events.slice(-5)
    });
  } catch (err) {
    return res.status(500).json({ 
      error: err.message,
      stack: err.stack
    });
  }
}
