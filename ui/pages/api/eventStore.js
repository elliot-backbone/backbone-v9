/**
 * eventStore.js - Persistent event store via Upstash Redis
 * 
 * Uses Upstash Redis for persistence across Vercel deployments.
 * Falls back to in-memory store if Redis is not configured.
 * 
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

const EVENTS_KEY = 'backbone:events';

// Check if Redis env vars are configured
const hasRedisConfig = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Lazy-init Redis client with dynamic import
let redis = null;
async function getRedis() {
  if (!hasRedisConfig) return null;
  if (redis) return redis;
  
  try {
    const { Redis } = await import('@upstash/redis');
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (err) {
    console.error('Failed to initialize Redis:', err);
    return null;
  }
  return redis;
}

// In-memory fallback
if (!global.backboneEvents) {
  global.backboneEvents = [];
}

export async function getEvents() {
  const client = await getRedis();
  if (client) {
    try {
      const events = await client.lrange(EVENTS_KEY, 0, -1);
      return events || [];
    } catch (err) {
      console.error('Redis getEvents error:', err);
      return global.backboneEvents;
    }
  }
  return global.backboneEvents;
}

export async function addEvent(event) {
  const client = await getRedis();
  if (client) {
    try {
      await client.rpush(EVENTS_KEY, event);
    } catch (err) {
      console.error('Redis addEvent error:', err);
      global.backboneEvents.push(event);
    }
  } else {
    global.backboneEvents.push(event);
  }
  return event;
}

export async function getCompletedActionIds() {
  const events = await getEvents();
  return events
    .filter(e => e.type === 'completed')
    .map(e => e.actionId);
}

export async function getSkippedActionIds() {
  const events = await getEvents();
  return events
    .filter(e => e.type === 'skipped')
    .map(e => e.actionId);
}

/**
 * UI-2.1 A1: Terminalization-based exclusion
 * 
 * An Action is excluded when:
 * - outcome_recorded (observation submitted) → permanent
 * - skipped → 24-hour cooldown, then eligible again
 * 
 * 'executed' is NOT a terminal state - Action must remain
 * eligible until observed or skipped.
 */
export async function getExcludedActionIds() {
  const events = await getEvents();
  const now = Date.now();
  const SKIP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  const excluded = new Set();
  
  for (const e of events) {
    if (e.type === 'outcome_recorded') {
      // Permanent exclusion
      excluded.add(e.actionId);
    } else if (e.type === 'skipped') {
      // 24-hour cooldown
      const skippedAt = new Date(e.timestamp).getTime();
      if (now - skippedAt < SKIP_COOLDOWN_MS) {
        excluded.add(e.actionId);
      }
    }
  }
  
  return Array.from(excluded);
}

export async function clearEvents() {
  const client = await getRedis();
  if (client) {
    try {
      await client.del(EVENTS_KEY);
    } catch (err) {
      console.error('Redis clearEvents error:', err);
    }
  }
  global.backboneEvents = [];
}

// Debug endpoint helper
export function getDebugInfo() {
  return {
    hasRedisConfig,
    redisUrl: process.env.UPSTASH_REDIS_REST_URL ? '***configured***' : 'missing',
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN ? '***configured***' : 'missing',
    memoryEventsCount: global.backboneEvents?.length || 0
  };
}

export default {
  getEvents,
  addEvent,
  getCompletedActionIds,
  getSkippedActionIds,
  getExcludedActionIds,
  clearEvents,
  getDebugInfo
};
