// NOTE: Vercel serverless functions have read-only filesystems
// This implementation stores events in memory (resets on each deployment)
// For production, integrate Vercel KV, PostgreSQL, or another database

let inMemoryEvents = [];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { actionId, reason } = req.body;

  if (!actionId || actionId !== id) {
    return res.status(400).json({ error: 'Invalid action ID' });
  }

  try {
    const newEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actionId,
      type: 'skipped',
      timestamp: new Date().toISOString(),
      payload: { reason: reason || 'User skipped' }
    };
    
    inMemoryEvents.push(newEvent);
    console.log('Action skipped:', newEvent);
    
    return res.status(204).end();
  } catch (err) {
    console.error('Error saving event:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
