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

import { Redis } from '@upstash/redis';

const EVENTS_KEY = 'backbone:events';

// Lazy-init Redis client
let redis = null;
function getRedis() {
  if (redis) return redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

// In-memory fallback for local dev
const memoryEvents = [];

export async function getEvents() {
  const client = getRedis();
  if (client) {
    try {
      const events = await client.lrange(EVENTS_KEY, 0, -1);
      return events || [];
    } catch (err) {
      console.error('Redis getEvents error:', err);
      return memoryEvents;
    }
  }
  return memoryEvents;
}

export async function addEvent(event) {
  const client = getRedis();
  if (client) {
    try {
      await client.rpush(EVENTS_KEY, event);
    } catch (err) {
      console.error('Redis addEvent error:', err);
      memoryEvents.push(event);
    }
  } else {
    memoryEvents.push(event);
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

export async function getExcludedActionIds() {
  const events = await getEvents();
  return events
    .filter(e => e.type === 'completed' || e.type === 'skipped')
    .map(e => e.actionId);
}

export async function clearEvents() {
  const client = getRedis();
  if (client) {
    try {
      await client.del(EVENTS_KEY);
    } catch (err) {
      console.error('Redis clearEvents error:', err);
      memoryEvents.length = 0;
    }
  } else {
    memoryEvents.length = 0;
  }
}

export default {
  getEvents,
  addEvent,
  getCompletedActionIds,
  getSkippedActionIds,
  getExcludedActionIds,
  clearEvents
};
