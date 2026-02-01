import { clearEvents } from './eventStore.js';

/**
 * Clear all events - development utility
 * POST /api/clear-events
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await clearEvents();
    return res.status(200).json({ success: true, message: 'Events cleared' });
  } catch (err) {
    console.error('Error clearing events:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
