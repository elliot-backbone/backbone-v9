import { addEvent } from '../eventStore.js';

/**
 * UI-2 Action Lifecycle: Observe endpoint
 * 
 * Records the 'outcome_recorded' event with optional observation notes.
 * This completes the action lifecycle: proposed → executed → observed
 * 
 * Contract constraints:
 * - Notes are raw text only, no scores or structured outcomes
 * - No backward transitions
 * - Observations do not alter ranking UI
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { actionId, entityId, notes, observedAt } = req.body;

  if (!actionId) {
    return res.status(400).json({ error: 'actionId required' });
  }

  if (!observedAt) {
    return res.status(400).json({ error: 'observedAt timestamp required' });
  }

  try {
    const newEvent = await addEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actionId,
      entityId: entityId || null,
      type: 'outcome_recorded',
      timestamp: observedAt,
      payload: {
        notes: notes || null
      }
    });
    
    console.log('Observation recorded:', newEvent);
    return res.status(204).end();
  } catch (err) {
    console.error('Error saving event:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
