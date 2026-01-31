import { addEvent } from '../eventStore.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { actionId, reason } = req.body;

  if (!actionId) {
    return res.status(400).json({ error: 'actionId required' });
  }

  try {
    const newEvent = await addEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actionId,
      type: 'skipped',
      timestamp: new Date().toISOString(),
      payload: { reason: reason || 'User skipped' }
    });
    
    console.log('Action skipped:', newEvent);
    return res.status(204).end();
  } catch (err) {
    console.error('Error saving event:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
