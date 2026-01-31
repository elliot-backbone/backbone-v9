import { addEvent } from '../eventStore.js';

export default async function handler(req, res) {
  const { params } = req.query;
  
  // Expect params like ['action-xxx', 'complete'] or ['action-xxx', 'skip']
  if (!params || params.length !== 2) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const [id, operation] = params;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  if (operation === 'complete') {
    const { actionId, completedAt } = req.body;
    
    if (!actionId || actionId !== id) {
      return res.status(400).json({ error: 'Invalid action ID' });
    }
    
    if (!completedAt) {
      return res.status(400).json({ error: 'completedAt timestamp required' });
    }
    
    try {
      const newEvent = await addEvent({
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        actionId,
        type: 'completed',
        timestamp: completedAt,
        payload: {}
      });
      
      console.log('Action completed:', newEvent);
      return res.status(204).end();
    } catch (err) {
      console.error('Error saving event:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  if (operation === 'skip') {
    const { actionId, reason } = req.body;
    
    if (!actionId || actionId !== id) {
      return res.status(400).json({ error: 'Invalid action ID' });
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
  
  return res.status(404).json({ error: 'Unknown operation' });
}
