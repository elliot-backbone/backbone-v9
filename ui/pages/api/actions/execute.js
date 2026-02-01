import { addEvent } from '../eventStore.js';

/**
 * UI-2 Action Lifecycle: Execute endpoint
 * 
 * Records the 'executed' event - action was performed.
 * No backward transitions allowed per contract.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { actionId, entityId, executedAt } = req.body;

  if (!actionId) {
    return res.status(400).json({ error: 'actionId required' });
  }

  if (!executedAt) {
    return res.status(400).json({ error: 'executedAt timestamp required' });
  }

  try {
    const newEvent = await addEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actionId,
      entityId: entityId || null,
      type: 'executed',
      timestamp: executedAt,
      payload: {}
    });
    
    console.log('Action executed:', newEvent);
    return res.status(204).end();
  } catch (err) {
    console.error('Error saving event:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
