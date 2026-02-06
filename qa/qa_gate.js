/**
 * qa/qa_gate.js — Canonical QA Gate (Consolidated)
 *
 * SINGLE QA HARD-FAIL GATE — 10 gates, no redundancy.
 *
 * Hard-fails if:
 * 1. Layer import rules violated
 * 2. Derived fields found in raw storage
 * 3. DAG has cycles
 * 4. Actions lack rankScore or are misordered
 * 5. Ranking is non-deterministic
 * 6. Multiple ranking surfaces detected
 * 7. IntroOutcome schema invalid
 * 8. Duplicate followup actions
 * 9. Action events structurally invalid
 * 10. Derived keys in events or impact model broken
 *
 * @module qa/qa_gate
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// =============================================================================
// SETUP
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// =============================================================================
// TEST INFRASTRUCTURE
// =============================================================================

const results = [];
let passed = 0;
let failed = 0;

function gate(name, fn) {
  try {
    const result = fn();
    if (result === true || (typeof result === 'object' && result.valid)) {
      console.log(`\u2714 ${name}`);
      passed++;
      results.push({ name, status: 'pass' });
    } else {
      const errors = result?.errors || ['Gate returned false'];
      console.log(`\u2717 ${name}`);
      errors.forEach(e => console.log(`  - ${e}`));
      failed++;
      results.push({ name, status: 'fail', errors });
    }
  } catch (err) {
    console.log(`\u2717 ${name}`);
    console.log(`  - Exception: ${err.message}`);
    failed++;
    results.push({ name, status: 'fail', errors: [err.message] });
  }
}

// =============================================================================
// GATE 1: LAYER IMPORT RULES
// =============================================================================

/**
 * Layer order: raw < derive < predict < decide < runtime
 * qa/* may import: raw/*, derive/*, qa/*
 * No upward imports.
 */
function checkLayerImports() {
  const layerOrder = ['raw', 'derive', 'predict', 'decide', 'runtime'];
  const errors = [];

  const allowedImports = {
    'raw': ['raw'],
    'derive': ['raw', 'derive'],
    'predict': ['raw', 'derive', 'predict'],
    'decide': ['raw', 'derive', 'predict', 'decide'],
    'runtime': ['raw', 'derive', 'predict', 'decide', 'runtime', 'qa'],
    'qa': ['raw', 'derive', 'qa']
  };

  const layerDirs = [...layerOrder, 'qa'].filter(l => existsSync(join(ROOT, l)));

  for (const layer of layerDirs) {
    const layerPath = join(ROOT, layer);
    const files = readdirSync(layerPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const content = readFileSync(join(layerPath, file), 'utf8');
      const imports = content.match(/from\s+['"]([^'"]+)['"]/g) || [];

      for (const imp of imports) {
        const match = imp.match(/from\s+['"]([^'"]+)['"]/);
        if (!match) continue;
        const importPath = match[1];

        if (importPath.includes('/runtime/') && layer !== 'runtime') {
          errors.push(`${layer}/${file} imports ${importPath} (runtime)`);
          continue;
        }

        for (const otherLayer of layerOrder) {
          if (importPath.includes(`../${otherLayer}/`) || importPath.includes(`./${otherLayer}/`)) {
            const allowed = allowedImports[layer] || [];
            if (!allowed.includes(otherLayer)) {
              errors.push(`${layer}/${file} imports ${importPath} (${otherLayer})`);
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 2: NO DERIVED FIELDS IN RAW STORAGE
// =============================================================================

const FORBIDDEN_IN_RAW = [
  'runway', 'runwayMonths',
  'health', 'healthScore', 'healthBand', 'healthSignals',
  'priority', 'priorityScore',
  'rankScore', 'expectedNetImpact', 'rank', 'rankComponents',
  'progressPct', 'valueVector', 'weeklyValue',
  'impact', 'urgency', 'risk', 'score', 'tier', 'band', 'label',
  'coverage', 'expectedValue', 'conversionProb', 'onTrack', 'projectedDate',
  'velocity', 'issues', 'priorities', 'actions', 'rippleScore',
  'calibratedProbability', 'escalationWindow', 'costOfDelay',
  'executionProbability', 'timing', 'timingRationale'
];

function checkNoStoredDerivations(data) {
  const errors = [];

  function scan(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (FORBIDDEN_IN_RAW.includes(key)) {
        errors.push(`key="${key}" at "${path || 'root'}"`);
      }
      if (typeof obj[key] === 'object') {
        scan(obj[key], path ? `${path}.${key}` : key);
      }
    }
  }

  scan(data);
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 3: DAG HAS NO CYCLES
// =============================================================================

function checkDAGNoCycles(graph) {
  const errors = [];
  const visited = new Set();
  const recStack = new Set();
  const cyclePath = [];

  function hasCycle(node) {
    if (recStack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    recStack.add(node);
    cyclePath.push(node);

    for (const dep of graph.get(node) || []) {
      if (hasCycle(dep)) {
        errors.push(`Cycle: ${cyclePath.join(' -> ')} -> ${dep}`);
        return true;
      }
    }

    cyclePath.pop();
    recStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (hasCycle(node)) break;
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 4: ACTIONS RANKED CORRECTLY (merged old 4 + 5)
// =============================================================================

function checkActionsRanked(rankedActions) {
  const errors = [];

  // Every action must have a numeric rankScore
  for (const action of rankedActions) {
    if (typeof action.rankScore !== 'number' || isNaN(action.rankScore)) {
      errors.push(`Missing rankScore: ${action.actionId || 'unknown'}`);
    }
  }

  // Actions must be sorted descending by rankScore
  for (let i = 1; i < rankedActions.length; i++) {
    if (rankedActions[i].rankScore > rankedActions[i - 1].rankScore + 0.0001) {
      errors.push(`Out of order at index ${i}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 5: DETERMINISTIC RANKING (merged old 6 + G)
// =============================================================================

function checkDeterminism(rankFn, actions, events) {
  const errors = [];

  // Test without events
  const r1 = rankFn(actions, {});
  const r2 = rankFn(actions, {});
  if (r1.length !== r2.length) {
    errors.push('Action count differs between identical runs');
    return { valid: false, errors };
  }
  for (let i = 0; i < r1.length; i++) {
    if (r1[i].actionId !== r2[i].actionId) {
      errors.push('Action order differs between identical runs');
      break;
    }
    if (Math.abs(r1[i].rankScore - r2[i].rankScore) > 0.0001) {
      errors.push(`rankScore differs for ${r1[i].actionId}`);
    }
  }

  // Test with events (if available)
  if (events && events.length > 0) {
    const e1 = rankFn(actions, { actionEvents: events });
    const e2 = rankFn(actions, { actionEvents: events });
    if (e1.length !== e2.length) {
      errors.push('Action count differs with events');
      return { valid: false, errors };
    }
    for (let i = 0; i < e1.length; i++) {
      if (e1[i].actionId !== e2[i].actionId) {
        errors.push('Action order differs with events');
        break;
      }
      if (Math.abs((e1[i].rankScore || 0) - (e2[i].rankScore || 0)) > 0.0001) {
        errors.push(`rankScore differs with events for ${e1[i].actionId}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 6: SINGLE RANKING SURFACE
// =============================================================================

function checkSingleRankingSurface() {
  const errors = [];
  const scanDirs = ['raw', 'derive', 'predict', 'decide', 'runtime'];

  for (const dir of scanDirs) {
    const dirPath = join(ROOT, dir);
    if (!existsSync(dirPath)) continue;
    const files = readdirSync(dirPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      if (dir === 'decide' && file === 'ranking.js') continue;
      if (file.includes('qa') || file.includes('test')) continue;

      const content = readFileSync(join(dirPath, file), 'utf8');
      const sortMatches = [...content.matchAll(/\.sort\s*\(/g)];

      for (const match of sortMatches) {
        const idx = match.index;
        const context = content.slice(Math.max(0, idx - 300), idx + 300);

        if (context.includes('rankScore')) {
          errors.push(`${dir}/${file} sorts by rankScore outside decide/ranking.js`);
          continue;
        }
        if (/\bactions\s*\.\s*(?:slice\s*\(\s*\)\s*\.)?\s*sort/.test(context)) {
          errors.push(`${dir}/${file} sorts actions array outside decide/ranking.js`);
          continue;
        }
        if (/function\s+(rankBy|sortAction)\w*/.test(context)) {
          errors.push(`${dir}/${file} defines ranking function outside decide/ranking.js`);
          continue;
        }
        if (/export\s+.*\bactions\b.*\.sort/.test(context)) {
          errors.push(`${dir}/${file} exports sorted actions outside decide/ranking.js`);
        }
      }
    }
  }

  // Dead scorer import guard: engine must not import deprecated functions
  const DEAD_SCORERS = ['computeProactiveRankScore', 'applyUrgencyGate', 'validateProactivityDistribution'];
  const enginePath = join(ROOT, 'runtime', 'engine.js');
  if (existsSync(enginePath)) {
    const engineContent = readFileSync(enginePath, 'utf8');
    for (const fn of DEAD_SCORERS) {
      if (engineContent.includes(fn)) {
        errors.push(`runtime/engine.js imports dead scorer: ${fn}`);
      }
    }
  }

  // Verify ranking.js comparator uses rankScore
  const rankingPath = join(ROOT, 'decide', 'ranking.js');
  if (existsSync(rankingPath)) {
    const content = readFileSync(rankingPath, 'utf8');
    const sortMatch = content.match(/\.sort\s*\(\s*\([^)]*\)\s*=>\s*\{([^}]+)\}/);
    if (sortMatch) {
      const comparator = sortMatch[1];
      const forbidden = ['expectedNetImpact', 'impactScore', 'priorityScore', 'valueVector', 'weeklyValue', 'valueDensity'];
      for (const token of forbidden) {
        if ((comparator.includes(`b.${token}`) || comparator.includes(`a.${token}`)) &&
            !comparator.includes('rankScore')) {
          errors.push(`decide/ranking.js comparator uses "${token}" instead of rankScore`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 7: INTROOUTCOME SCHEMA
// =============================================================================

// (validated inline in runQAGate via dynamic import)

// =============================================================================
// GATE 8: NO DUPLICATE FOLLOWUPS
// =============================================================================

function checkNoFollowupDuplicates(actions) {
  const errors = [];
  const followupKeys = new Set();

  for (const action of actions) {
    if (action.sources?.[0]?.sourceType === 'FOLLOWUP') {
      const key = `${action.followupFor?.actionId}|${action.followupFor?.outcomeId}`;
      if (followupKeys.has(key)) {
        errors.push(`Duplicate followup for ${key}`);
      }
      followupKeys.add(key);
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 9: ACTION EVENTS VALID (merged old A+B+C+D+E+H)
// =============================================================================

const ACTION_EVENTS_PATH = join(ROOT, 'raw', 'actionEvents.json');

const VALID_EVENT_TYPES = [
  'created', 'assigned', 'started', 'completed',
  'outcome_recorded', 'followup_created', 'note_added'
];
const VALID_OUTCOMES = ['success', 'partial', 'failed', 'abandoned'];

function loadActionEvents() {
  try {
    if (!existsSync(ACTION_EVENTS_PATH)) return null;
    const data = JSON.parse(readFileSync(ACTION_EVENTS_PATH, 'utf8'));
    return data.actionEvents || [];
  } catch {
    return null;
  }
}

function checkActionEvents(events, actions) {
  const errors = [];

  // File must exist and parse
  if (!existsSync(ACTION_EVENTS_PATH)) {
    errors.push('raw/actionEvents.json does not exist');
    return { valid: false, errors };
  }

  try {
    const content = readFileSync(ACTION_EVENTS_PATH, 'utf8');
    const data = JSON.parse(content);
    if (!Array.isArray(data.actionEvents)) {
      errors.push('actionEvents must be an array');
      return { valid: false, errors };
    }
  } catch (e) {
    errors.push(`Failed to parse: ${e.message}`);
    return { valid: false, errors };
  }

  if (!events || events.length === 0) {
    return { valid: true, errors: [] }; // Empty is valid
  }

  const seenIds = new Set();
  const actionIds = actions ? new Set(actions.map(a => a.id || a.actionId)) : null;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    // Schema: required fields
    if (!ev.id || typeof ev.id !== 'string') {
      errors.push(`Event[${i}] missing id`);
    }
    if (!ev.actionId || typeof ev.actionId !== 'string') {
      errors.push(`Event[${i}] missing actionId`);
    }
    if (!ev.eventType || !VALID_EVENT_TYPES.includes(ev.eventType)) {
      errors.push(`Event[${i}] invalid eventType: ${ev.eventType}`);
    }
    if (!ev.timestamp || typeof ev.timestamp !== 'string') {
      errors.push(`Event[${i}] missing timestamp`);
    }
    if (!ev.actor || typeof ev.actor !== 'string') {
      errors.push(`Event[${i}] missing actor`);
    }
    if (ev.payload === undefined || typeof ev.payload !== 'object') {
      errors.push(`Event[${i}] missing payload object`);
    }

    // Outcome validation
    if (ev.eventType === 'outcome_recorded' && ev.payload) {
      if (!VALID_OUTCOMES.includes(ev.payload.outcome)) {
        errors.push(`Event[${i}] invalid outcome: ${ev.payload.outcome}`);
      }
    }

    // Timestamp parseable
    if (ev.timestamp && isNaN(Date.parse(ev.timestamp))) {
      errors.push(`Event[${i}] unparseable timestamp: ${ev.timestamp}`);
    }

    // Unique IDs
    if (ev.id && seenIds.has(ev.id)) {
      errors.push(`Duplicate event ID: ${ev.id}`);
    }
    if (ev.id) seenIds.add(ev.id);

    // Referential integrity
    if (actionIds && ev.actionId && !actionIds.has(ev.actionId)) {
      errors.push(`Event[${i}] references unknown action: ${ev.actionId}`);
    }
  }

  // Chronological order (warn only)
  for (let i = 1; i < events.length; i++) {
    const prev = Date.parse(events[i - 1].timestamp);
    const curr = Date.parse(events[i].timestamp);
    if (!isNaN(prev) && !isNaN(curr) && curr < prev) {
      console.log(`  Warning: Events out of chronological order at index ${i}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 10: EVENT PAYLOAD PURITY + IMPACT MODEL (merged old F + I)
// =============================================================================

const FORBIDDEN_EVENT_PAYLOAD_KEYS = [
  'rankScore', 'expectedNetImpact', 'impactScore', 'rippleScore',
  'priorityScore', 'healthScore', 'executionProbability', 'frictionPenalty',
  'calibratedProbability', 'learnedExecutionProbability', 'learnedFrictionPenalty'
];

function checkEventPurityAndImpactModel(events, rankedActions) {
  const errors = [];

  // No derived keys in event payloads
  if (events) {
    for (let i = 0; i < events.length; i++) {
      const payload = events[i].payload;
      if (payload && typeof payload === 'object') {
        for (const key of FORBIDDEN_EVENT_PAYLOAD_KEYS) {
          if (key in payload) {
            errors.push(`Event[${i}] has forbidden payload key: ${key}`);
          }
        }
      }
    }
  }

  // Unified impact model validation
  if (rankedActions && rankedActions.length > 0) {
    const withImpact = rankedActions.filter(a => a.impact);
    for (const action of withImpact.slice(0, 10)) {
      const impact = action.impact;
      if (typeof impact.upsideMagnitude !== 'number') {
        errors.push(`Action ${action.actionId} missing upsideMagnitude`);
      }
      if (!Array.isArray(impact.explain)) {
        errors.push(`Action ${action.actionId} missing explain array`);
      }
      if (impact.upsideMagnitude < 10 || impact.upsideMagnitude > 100) {
        errors.push(`Action ${action.actionId} upside ${impact.upsideMagnitude} outside range 10-100`);
      }
      if (impact.goalImpacts && !Array.isArray(impact.goalImpacts)) {
        errors.push(`Action ${action.actionId} invalid goalImpacts type`);
      }
    }

    // Verify hierarchy: ISSUE >= PREISSUE on average
    const bySource = {};
    for (const action of withImpact) {
      const src = action.sources?.[0]?.sourceType;
      if (!src) continue;
      if (!bySource[src]) bySource[src] = [];
      bySource[src].push(action.impact.upsideMagnitude);
    }
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const issueAvg = avg(bySource['ISSUE'] || []);
    const preissueAvg = avg(bySource['PREISSUE'] || []);
    if (issueAvg > 0 && preissueAvg > 0 && issueAvg < preissueAvg * 0.8) {
      errors.push(`ISSUE avg (${issueAvg.toFixed(1)}) < PREISSUE avg (${preissueAvg.toFixed(1)})`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// MAIN QA GATE
// =============================================================================

/**
 * Run all 10 QA gates.
 * @param {Object} options
 * @param {Object} options.rawData
 * @param {Object[]} options.rankedActions
 * @param {Object[]} options.introOutcomes
 * @param {Function} options.rankFn
 * @param {Object[]} options.actionsInput
 * @param {Map} options.dag
 * @param {Object[]} options.actionEvents
 * @param {Object[]} options.actions
 * @returns {{ passed: number, failed: number, results: Object[] }}
 */
export async function runQAGate(options = {}) {
  console.log('\n\u2554' + '\u2550'.repeat(63) + '\u2557');
  console.log('\u2551  BACKBONE CANONICAL QA GATE (10 gates)                        \u2551');
  console.log('\u255A' + '\u2550'.repeat(63) + '\u255D\n');

  passed = 0;
  failed = 0;
  results.length = 0;

  // Gate 1: Layer imports
  console.log('--- GATE 1: LAYER IMPORT RULES ---\n');
  gate('Layer imports respect boundaries', () => checkLayerImports());

  // Gate 2: No derived fields in raw
  console.log('\n--- GATE 2: NO DERIVED FIELDS IN RAW ---\n');
  if (options.rawData) {
    gate('No derived fields in raw data', () => checkNoStoredDerivations(options.rawData));
  } else {
    console.log('  (skipped - no rawData provided)');
  }

  // Gate 3: DAG integrity
  console.log('\n--- GATE 3: DAG INTEGRITY ---\n');
  if (options.dag) {
    gate('DAG has no cycles', () => checkDAGNoCycles(options.dag));
  } else {
    console.log('  (skipped - no dag provided)');
  }

  // Gate 4: Actions ranked correctly
  console.log('\n--- GATE 4: ACTIONS RANKED CORRECTLY ---\n');
  if (options.rankedActions) {
    gate('All actions have rankScore and sorted', () => checkActionsRanked(options.rankedActions));
  } else {
    console.log('  (skipped - no rankedActions provided)');
  }

  // Gate 5: Deterministic ranking
  console.log('\n--- GATE 5: DETERMINISTIC RANKING ---\n');
  if (options.rankFn && options.actionsInput) {
    const events = options.actionEvents || loadActionEvents() || [];
    gate('Ranking is deterministic', () => checkDeterminism(options.rankFn, options.actionsInput, events));
  } else {
    console.log('  (skipped - no rankFn or actionsInput)');
  }

  // Gate 6: Single ranking surface
  console.log('\n--- GATE 6: SINGLE RANKING SURFACE ---\n');
  gate('No multiple ranking surfaces', () => checkSingleRankingSurface());

  // Gate 7: IntroOutcome schema
  console.log('\n--- GATE 7: INTROOUTCOME SCHEMA ---\n');
  if (options.introOutcomes) {
    const { validateIntroOutcomes } = await import('../raw/introOutcome.js');
    gate('IntroOutcome schema valid', () => validateIntroOutcomes(options.introOutcomes));
  } else {
    console.log('  (skipped - no introOutcomes provided)');
  }

  // Gate 8: No duplicate followups
  console.log('\n--- GATE 8: NO DUPLICATE FOLLOWUPS ---\n');
  if (options.rankedActions) {
    gate('No duplicate followup actions', () => checkNoFollowupDuplicates(options.rankedActions));
  } else {
    console.log('  (skipped - no rankedActions provided)');
  }

  // Gate 9: Action events valid
  console.log('\n--- GATE 9: ACTION EVENTS VALID ---\n');
  const events = options.actionEvents || loadActionEvents();
  gate('Action events structurally valid', () => checkActionEvents(events, options.actions));

  // Gate 10: Event payload purity + impact model
  console.log('\n--- GATE 10: EVENT PURITY + IMPACT MODEL ---\n');
  const eventsForPurity = options.actionEvents || loadActionEvents() || [];
  gate('No derived keys in events, impact model valid', () =>
    checkEventPurityAndImpactModel(eventsForPurity, options.rankedActions));

  // Summary
  const pad = Math.max(0, 39 - String(passed).length - String(failed).length);
  console.log('\n\u2554' + '\u2550'.repeat(63) + '\u2557');
  console.log(`\u2551  QA GATE: ${passed} passed, ${failed} failed${' '.repeat(pad)}\u2551`);
  console.log('\u255A' + '\u2550'.repeat(63) + '\u255D\n');

  if (failed > 0) {
    console.log('\u274C QA GATE FAILED - Build blocked');
    process.exitCode = 1;
  } else {
    console.log('\u2714 QA GATE PASSED');
  }

  return { passed, failed, results };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  checkLayerImports,
  checkNoStoredDerivations,
  checkDAGNoCycles,
  checkActionsRanked,
  checkDeterminism,
  checkSingleRankingSurface,
  checkNoFollowupDuplicates,
  checkActionEvents,
  checkEventPurityAndImpactModel,
  FORBIDDEN_IN_RAW,
  FORBIDDEN_EVENT_PAYLOAD_KEYS
};

export default { runQAGate };

// =============================================================================
// CLI RUNNER
// =============================================================================

const isMain = process.argv[1]?.includes('qa_gate.js');
if (isMain) {
  (async () => {
    console.log('Running QA Gate \u2014 loading runtime data...\n');

    const rawData = JSON.parse(readFileSync(join(ROOT, 'raw/sample.json'), 'utf-8'));

    const { compute } = await import('../runtime/engine.js');
    const engineOutput = compute(rawData, new Date());

    const { GRAPH } = await import('../runtime/graph.js');
    const dagMap = new Map(Object.entries(GRAPH));

    const { rankActions } = await import('../decide/ranking.js');

    const actionsInput = engineOutput.companies.flatMap(c => c.derived.actions || []);

    const eventsData = JSON.parse(readFileSync(join(ROOT, 'raw/actionEvents.json'), 'utf-8'));
    const actionEvents = eventsData.actionEvents || [];

    await runQAGate({
      rawData,
      dag: dagMap,
      rankedActions: engineOutput.actions,
      rankFn: rankActions,
      actionsInput,
      introOutcomes: [],
      actionEvents,
      actions: engineOutput.actions,
    });
  })().catch(err => {
    console.error('QA Gate error:', err);
    process.exit(1);
  });
}
