/**
 * eventStore.js - In-memory event store
 * 
 * Simple in-memory store for action events.
 * Note: Resets on cold starts. For persistence, add database later.
 */

const EVENTS_KEY = 'backbone:events';

// Global in-memory store (persists across requests in same instance)
if (!global.backboneEvents) {
  global.backboneEvents = [];
}

export async function getEvents() {
  return global.backboneEvents;
}

export async function addEvent(event) {
  global.backboneEvents.push(event);
  return event;
}

export async function getCompletedActionIds() {
  return global.backboneEvents
    .filter(e => e.type === 'completed')
    .map(e => e.actionId);
}

export async function getSkippedActionIds() {
  return global.backboneEvents
    .filter(e => e.type === 'skipped')
    .map(e => e.actionId);
}

export async function getExcludedActionIds() {
  return global.backboneEvents
    .filter(e => e.type === 'completed' || e.type === 'skipped')
    .map(e => e.actionId);
}

export async function clearEvents() {
  global.backboneEvents = [];
}

export default {
  getEvents,
  addEvent,
  getCompletedActionIds,
  getSkippedActionIds,
  getExcludedActionIds,
  clearEvents
};
