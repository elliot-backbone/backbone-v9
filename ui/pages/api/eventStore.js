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

// Initialize Redis client if env vars are set
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// In-memory fallback for local dev
const memoryEvents = [];

export async function getEvents() {
  if (redis) {
    const events = await redis.lrange(EVENTS_KEY, 0, -1);
    return events || [];
  }
  return memoryEvents;
}

export async function addEvent(event) {
  if (redis) {
    await redis.rpush(EVENTS_KEY, event);
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
  if (redis) {
    await redis.del(EVENTS_KEY);
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
