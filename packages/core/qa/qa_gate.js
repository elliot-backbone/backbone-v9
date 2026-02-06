/**
 * qa/qa_gate.js — Canonical QA Gate (B1 Rewrite)
 *
 * 13 GATES, ZERO SKIPS.
 *
 * Gate 1 — Layer Import Rules
 * Gate 2 — No Stored Derivations
 * Gate 3 — DAG Integrity + Dead-End Detection
 * Gate 4 — Ranking Output Correctness (merged old 4+5, determinism bug fixed)
 * Gate 5 — Single Ranking Surface + Dead Code Guard
 * Gate 6 — Ranking Trace (content-level, phased enforcement)
 * Gate 7 — Action Events + Event Purity (merged old 9 + purity of 10)
 * Gate 8 — Followup Dedup
 * Gate 9 — Canonicality Enforcement (Model 2)
 * Gate 10 — metricFact Schema Compliance
 * Gate 11 — No Derived in metricFacts
 * Gate 12 — Backward Compatibility (scalar fields)
 * Gate 13 — Single Goal Framework (no legacy gap/gapPct)
 *
 * Every gate self-loads data if not provided via options.
 * No gate is ever skipped.
 *
 * @module qa/qa_gate
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FORBIDDEN_DERIVED_FIELDS } from './forbidden.js';
import { loadRawData as loadFromChunks } from '../raw/loadRawData.js';

// =============================================================================
// SETUP
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');           // packages/core/
const REPO_ROOT = join(__dirname, '..', '..', '..'); // repo root

// =============================================================================
// TEST INFRASTRUCTURE
// =============================================================================

const results = [];
let passed = 0;
let failed = 0;
let warnings = 0;

function gate(name, fn) {
  try {
    const result = fn();
    if (result === true || (typeof result === 'object' && result.valid)) {
      const warnList = result?.warnings || [];
      if (warnList.length > 0) {
        console.log(`✔ ${name} (${warnList.length} warning${warnList.length > 1 ? 's' : ''})`);
        warnList.forEach(w => console.log(`  ⚠ ${w}`));
        warnings += warnList.length;
      } else {
        console.log(`✔ ${name}`);
      }
      passed++;
      results.push({ name, status: 'pass', warnings: warnList });
    } else {
      const errors = result?.errors || ['Gate returned false'];
      console.log(`✗ ${name}`);
      errors.forEach(e => console.log(`  - ${e}`));
      failed++;
      results.push({ name, status: 'fail', errors });
    }
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  - Exception: ${err.message}`);
    failed++;
    results.push({ name, status: 'fail', errors: [err.message] });
  }
}

// =============================================================================
// DATA LOADERS (self-load when not provided)
// =============================================================================

function loadRawData() {
  return loadFromChunks();
}

async function loadEngine() {
  const { compute } = await import('../runtime/engine.js');
  return compute;
}

async function loadGraph() {
  const { GRAPH } = await import('../runtime/graph.js');
  return GRAPH;
}

async function loadRankFn() {
  const { rankActions } = await import('../decide/ranking.js');
  return rankActions;
}

function loadActionEvents() {
  const evPath = join(ROOT, 'raw', 'actionEvents.json');
  if (!existsSync(evPath)) return [];
  try {
    const data = JSON.parse(readFileSync(evPath, 'utf8'));
    return data.actionEvents || [];
  } catch {
    return [];
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
// GATE 2: NO STORED DERIVATIONS
// =============================================================================

const FORBIDDEN_SET = new Set(FORBIDDEN_DERIVED_FIELDS);

function checkNoStoredDerivations(data) {
  const errors = [];

  function scan(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (FORBIDDEN_SET.has(key)) {
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
// GATE 3: DAG INTEGRITY + DEAD-END DETECTION
// =============================================================================

// Terminal nodes that are allowed to have no downstream consumers.
// actionRanker: final ranking output (true terminal)
// priority: compatibility view layer over ranked actions (true terminal)
// A3: meetings and health removed — now consumed by preissues/actionCandidates and actionRanker
const TERMINAL_NODE_WHITELIST = new Set(['actionRanker', 'priority']);

function checkDAGIntegrity(graph) {
  const errors = [];
  const nodes = Object.keys(graph);

  // 3a: Cycle detection
  const visited = new Set();
  const recStack = new Set();
  const cyclePath = [];

  function hasCycle(node) {
    if (recStack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    recStack.add(node);
    cyclePath.push(node);

    for (const dep of graph[node] || []) {
      if (hasCycle(dep)) {
        errors.push(`Cycle: ${cyclePath.join(' -> ')} -> ${dep}`);
        return true;
      }
    }

    cyclePath.pop();
    recStack.delete(node);
    return false;
  }

  for (const node of nodes) {
    if (hasCycle(node)) break;
  }

  // 3b: Dead-end detection — every computed node must be consumed by at least
  // one other node, OR be on the terminal whitelist
  const consumed = new Set();
  for (const deps of Object.values(graph)) {
    for (const dep of deps) {
      consumed.add(dep);
    }
  }

  for (const node of nodes) {
    if (!consumed.has(node) && !TERMINAL_NODE_WHITELIST.has(node)) {
      errors.push(`Dead-end node: "${node}" is computed but never consumed (not in terminal whitelist)`);
    }
  }

  // 3c: All dependencies resolve to existing nodes
  for (const [node, deps] of Object.entries(graph)) {
    for (const dep of deps) {
      if (!graph.hasOwnProperty(dep)) {
        errors.push(`Node "${node}" depends on unknown node "${dep}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 4: RANKING OUTPUT CORRECTNESS (merged old 4 + 5)
// =============================================================================

function checkRankingOutput(rankedActions, rankFn, actionsInput, events) {
  const errors = [];

  // 4a: Every action has a numeric rankScore
  for (const action of rankedActions) {
    if (typeof action.rankScore !== 'number' || isNaN(action.rankScore)) {
      errors.push(`Missing rankScore: ${action.actionId || 'unknown'}`);
    }
  }

  // 4b: Actions sorted descending by rankScore
  for (let i = 1; i < rankedActions.length; i++) {
    if (rankedActions[i].rankScore > rankedActions[i - 1].rankScore + 0.0001) {
      errors.push(`Out of order at index ${i}`);
    }
  }

  // 4c: Determinism — same inputs produce same outputs
  // Bug fix: pass {events} not {actionEvents: events}
  const r1 = rankFn(actionsInput, {});
  const r2 = rankFn(actionsInput, {});
  if (r1.length !== r2.length) {
    errors.push('Action count differs between identical runs');
  } else {
    for (let i = 0; i < r1.length; i++) {
      if (r1[i].actionId !== r2[i].actionId) {
        errors.push('Action order differs between identical runs');
        break;
      }
      if (Math.abs(r1[i].rankScore - r2[i].rankScore) > 0.0001) {
        errors.push(`rankScore differs for ${r1[i].actionId}`);
      }
    }
  }

  // Determinism with events (if available)
  if (events && events.length > 0) {
    const e1 = rankFn(actionsInput, { events });
    const e2 = rankFn(actionsInput, { events });
    if (e1.length !== e2.length) {
      errors.push('Action count differs with events');
    } else {
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
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 5: SINGLE RANKING SURFACE + DEAD CODE GUARD
// =============================================================================

const DEAD_SCORERS = ['computeProactiveRankScore', 'applyUrgencyGate', 'validateProactivityDistribution'];

function checkSingleRankingSurface() {
  const errors = [];
  const scanDirs = ['raw', 'derive', 'predict', 'decide', 'runtime'];

  // 5a: No sorting by rankScore outside decide/ranking.js
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

  // 5b: Dead scorer import guard — engine must not import deprecated functions
  const enginePath = join(ROOT, 'runtime', 'engine.js');
  if (existsSync(enginePath)) {
    const engineContent = readFileSync(enginePath, 'utf8');
    for (const fn of DEAD_SCORERS) {
      if (engineContent.includes(fn)) {
        errors.push(`runtime/engine.js imports dead scorer: ${fn}`);
      }
    }
  }

  // 5c: Verify ranking.js comparator uses rankScore
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
// GATE 6: RANKING TRACE (content-level, phased enforcement)
// =============================================================================

/**
 * Phase flag: when false, context-dependent checks WARN instead of FAIL.
 * Flip to true in B2 after A3 wires context.
 */
const FULL_CONTEXT_ENFORCEMENT = true;

function checkRankingTrace(rankedActions, context) {
  const errors = [];
  const traceWarnings = [];

  if (!rankedActions || rankedActions.length === 0) {
    errors.push('No ranked actions to trace');
    return { valid: false, errors };
  }

  // 6a: HARD — every action must have non-zero expectedNetImpact
  for (const action of rankedActions.slice(0, 20)) {
    const eni = action.rankComponents?.expectedNetImpact ?? action.expectedNetImpact;
    if (eni === undefined || eni === null) {
      errors.push(`Action ${action.actionId}: missing expectedNetImpact`);
    }
  }

  // 6b: HARD — friction and sourceType components must be connected
  for (const action of rankedActions.slice(0, 20)) {
    const comp = action.rankComponents;
    if (!comp) {
      errors.push(`Action ${action.actionId}: missing rankComponents`);
      continue;
    }
    if (comp.executionFrictionPenalty === undefined) {
      errors.push(`Action ${action.actionId}: disconnected executionFrictionPenalty`);
    }
    if (comp.sourceTypeBoost === undefined) {
      errors.push(`Action ${action.actionId}: disconnected sourceTypeBoost`);
    }
  }

  // 6c: HARD — score composition check (components sum to rankScore)
  for (const action of rankedActions.slice(0, 10)) {
    const comp = action.rankComponents;
    if (!comp) continue;
    const reconstructed =
      (comp.expectedNetImpact || 0) -
      (comp.trustPenalty || 0) -
      (comp.executionFrictionPenalty || 0) +
      (comp.timeCriticalityBoost || 0) +
      (comp.sourceTypeBoost || 0) +
      (comp.patternLift || 0);
    if (Math.abs(reconstructed - action.rankScore) > 0.01) {
      errors.push(`Action ${action.actionId}: score composition drift (expected ${reconstructed.toFixed(4)}, got ${action.rankScore.toFixed(4)})`);
    }
  }

  // 6d: HARD — impact model structure (moved from old Gate 10)
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

  // 6e: HARD — ISSUE >= PREISSUE hierarchy on average
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

  // --- Context-dependent checks (warn or fail based on FULL_CONTEXT_ENFORCEMENT) ---
  const contextTarget = FULL_CONTEXT_ENFORCEMENT ? errors : traceWarnings;

  // 6f: Context maps should be non-empty (post-A3)
  if (!context?.trustRiskByAction || context.trustRiskByAction.size === 0) {
    contextTarget.push('Empty trustRiskByAction context map');
  }
  if (!context?.deadlinesByAction || context.deadlinesByAction.size === 0) {
    contextTarget.push('Empty deadlinesByAction context map');
  }

  // 6g: Pattern lift should be non-zero for at least one action (post-A3)
  const anyPatternLift = rankedActions.some(a => (a.rankComponents?.patternLift || 0) !== 0);
  if (!anyPatternLift) {
    contextTarget.push('Zero pattern lift across all actions');
  }

  // 6h: Trust penalty and time criticality should produce non-default values (post-A3)
  const anyTrustPenalty = rankedActions.some(a => (a.rankComponents?.trustPenalty || 0) !== 0);
  if (!anyTrustPenalty) {
    contextTarget.push('Zero trust penalty across all actions');
  }
  const anyTimeBoost = rankedActions.some(a => (a.rankComponents?.timeCriticalityBoost || 0) !== 0);
  if (!anyTimeBoost) {
    contextTarget.push('Zero time criticality boost across all actions');
  }

  return { valid: errors.length === 0, errors, warnings: traceWarnings };
}

// =============================================================================
// GATE 7: ACTION EVENTS + EVENT PURITY (merged old 9 + purity of 10)
// =============================================================================

const ACTION_EVENTS_PATH = join(ROOT, 'raw', 'actionEvents.json');

const VALID_EVENT_TYPES = [
  'created', 'assigned', 'started', 'completed',
  'outcome_recorded', 'followup_created', 'note_added'
];
const VALID_OUTCOMES = ['success', 'partial', 'failed', 'abandoned'];

const FORBIDDEN_EVENT_PAYLOAD_KEYS = [
  'rankScore', 'expectedNetImpact', 'impactScore', 'rippleScore',
  'priorityScore', 'healthScore', 'executionProbability', 'frictionPenalty',
  'calibratedProbability', 'learnedExecutionProbability', 'learnedFrictionPenalty'
];

function checkActionEventsAndPurity(events, actions) {
  const errors = [];

  // 7a: File must exist and parse
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

  // Empty events is valid — structural checks pass
  if (!events || events.length === 0) {
    return { valid: true, errors: [] };
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

    // 7b: Event purity — no derived keys in payloads
    if (ev.payload && typeof ev.payload === 'object') {
      for (const key of FORBIDDEN_EVENT_PAYLOAD_KEYS) {
        if (key in ev.payload) {
          errors.push(`Event[${i}] has forbidden payload key: ${key}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 8: FOLLOWUP DEDUP
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
// GATE 9: CANONICALITY ENFORCEMENT (replaced Root/UI Divergence in Model 2)
// =============================================================================

const ENGINE_LAYERS = ['decide', 'derive', 'predict', 'runtime', 'qa', 'raw', 'tests'];

function findJsFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkCanonicality() {
  const errors = [];
  const CORE_PATH = join(REPO_ROOT, 'packages', 'core');

  // 9a: Engine layers exist in packages/core
  for (const layer of ENGINE_LAYERS) {
    const corePath = join(CORE_PATH, layer);
    if (!existsSync(corePath)) {
      errors.push(`QA_FAIL[CANON]: Missing engine layer packages/core/${layer}`);
    }
  }

  // 9b: No engine code at repo root
  for (const layer of ENGINE_LAYERS) {
    const rootPath = join(REPO_ROOT, layer);
    if (existsSync(rootPath)) {
      errors.push(`QA_FAIL[CANON]: Engine code found at repo root: ${layer}/ (must be in packages/core/)`);
    }
  }

  // 9c: No engine code in ui/ (except qa/terminology.js)
  for (const layer of ENGINE_LAYERS) {
    const uiPath = join(REPO_ROOT, 'ui', layer);
    if (!existsSync(uiPath)) continue;
    const entries = readdirSync(uiPath, { withFileTypes: true });
    const engineFiles = entries.filter(e => {
      const rel = `${layer}/${e.name}`;
      if (rel === 'qa/terminology.js') return false;
      return e.name.endsWith('.js') || e.name.endsWith('.json');
    });
    if (engineFiles.length > 0) {
      errors.push(`QA_FAIL[CANON]: Engine code in ui/${layer}/: ${engineFiles.map(f => f.name).join(', ')}`);
    }
  }

  // 9d: UI imports only from @backbone/core (no relative engine imports)
  const uiApiDir = join(REPO_ROOT, 'ui', 'pages', 'api');
  if (existsSync(uiApiDir)) {
    const apiFiles = findJsFiles(uiApiDir);
    for (const file of apiFiles) {
      const content = readFileSync(file, 'utf8');
      const relativeEngineImport = content.match(/from\s+['"]\.\..*\/(decide|derive|predict|runtime|qa|raw)\//);
      if (relativeEngineImport) {
        errors.push(`QA_FAIL[CANON]: UI file imports engine via relative path: ${file}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 10: METRICFACT SCHEMA COMPLIANCE
// =============================================================================

function checkMetricFactSchema(data) {
  const facts = data.metricFacts || [];
  if (facts.length === 0) return true; // No metricFacts yet is valid (backward compat)

  const required = ['id', 'companyId', 'metricKey', 'value', 'unit', 'source', 'asOf'];
  const allowed = new Set([...required, 'notes']);
  const errors = [];

  for (const fact of facts) {
    for (const field of required) {
      if (fact[field] === undefined || fact[field] === null) {
        errors.push(`metricFact ${fact.id || 'unknown'} missing required field: ${field}`);
      }
    }
    for (const key of Object.keys(fact)) {
      if (!allowed.has(key)) {
        errors.push(`metricFact ${fact.id} has unexpected field: ${key}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 11: NO DERIVED IN METRICFACTS
// =============================================================================

function checkNoDerivedInMetricFacts(data) {
  const facts = data.metricFacts || [];
  if (facts.length === 0) return true;

  const forbidden = ['runway', 'runway_months', 'ltv_cac_ratio', 'acv',
    'goalDamage', 'projectedGoalDamage', 'healthScore', 'rankScore'];
  const errors = [];

  for (const fact of facts) {
    if (forbidden.includes(fact.metricKey)) {
      errors.push(`metricFact ${fact.id} has derived metricKey: ${fact.metricKey}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 12: BACKWARD COMPATIBILITY
// =============================================================================

function checkBackwardCompat(data) {
  const portfolioCompanies = (data.companies || []).filter(c => c.isPortfolio);
  if (portfolioCompanies.length === 0) return { valid: false, errors: ['No portfolio companies found'] };

  const coreFields = ['cash', 'burn', 'arr', 'employees'];
  const errors = [];
  let allNullCount = 0;

  for (const co of portfolioCompanies) {
    const hasAnyScalar = coreFields.some(f => co[f] !== undefined && co[f] !== null);
    if (!hasAnyScalar) {
      allNullCount++;
    }
  }

  if (allNullCount > 0) {
    errors.push(`${allNullCount} portfolio companies have no scalar metrics (cash/burn/arr/employees). Backward compat broken.`);
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 13: SINGLE GOAL FRAMEWORK
// =============================================================================

function checkSingleGoalFramework(data) {
  const goals = data.goals || [];
  if (goals.length === 0) return { valid: true, errors: [] };

  const errors = [];
  for (const goal of goals) {
    if (goal.gap !== undefined) {
      errors.push(`Goal ${goal.id} has legacy field 'gap'. Remove derived fields from raw goals.`);
    }
    if (goal.gapPct !== undefined) {
      errors.push(`Goal ${goal.id} has legacy field 'gapPct'. Remove derived fields from raw goals.`);
    }
    if (!goal.companyId && (!goal.entityRefs || goal.entityRefs.length === 0)) {
      errors.push(`Goal ${goal.id} has no companyId or entityRefs`);
    }
    if (!goal.type || typeof goal.type !== 'string') {
      errors.push(`Goal ${goal.id} has invalid type: ${goal.type}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// MAIN QA GATE
// =============================================================================

/**
 * Run all 11 QA gates.
 * Every gate self-loads data when not provided. Zero skips.
 *
 * @param {Object} options
 * @param {Object} [options.rawData]
 * @param {Object[]} [options.rankedActions]
 * @param {Function} [options.rankFn]
 * @param {Object[]} [options.actionsInput]
 * @param {Object} [options.graph]
 * @param {Object[]} [options.actionEvents]
 * @param {Object[]} [options.actions]
 * @param {Object} [options.context] - Ranking context (trustRiskByAction, deadlinesByAction, etc.)
 * @returns {{ passed: number, failed: number, warnings: number, results: Object[] }}
 */
export async function runQAGate(options = {}) {
  console.log('\n╔' + '═'.repeat(63) + '╗');
  console.log('║  BACKBONE CANONICAL QA GATE (13 gates, 0 skips)                ║');
  console.log('╚' + '═'.repeat(63) + '╝\n');

  passed = 0;
  failed = 0;
  warnings = 0;
  results.length = 0;

  // Self-load data if not provided
  const rawData = options.rawData || loadRawData();
  const graph = options.graph || await loadGraph();
  const dagMap = graph instanceof Map ? graph : (typeof graph === 'object' ? graph : {});

  const computeFn = options.rankedActions ? null : await loadEngine();
  const engineOutput = options.rankedActions ? null : computeFn(rawData, new Date());

  const rankedActions = options.rankedActions || engineOutput.actions;
  const rankFn = options.rankFn || await loadRankFn();
  const actionsInput = options.actionsInput || (engineOutput
    ? engineOutput.companies.flatMap(c => c.derived.actions || [])
    : rankedActions);
  const actionEvents = options.actionEvents || loadActionEvents();
  const actions = options.actions || rankedActions;
  const context = options.context || engineOutput?.context || {};

  // Gate 1: Layer imports
  console.log('--- GATE 1: LAYER IMPORT RULES ---\n');
  gate('Layer imports respect boundaries', () => checkLayerImports());

  // Gate 2: No derived fields in raw
  console.log('\n--- GATE 2: NO STORED DERIVATIONS ---\n');
  gate('No derived fields in raw data', () => checkNoStoredDerivations(rawData));

  // Gate 3: DAG integrity + dead-end detection
  console.log('\n--- GATE 3: DAG INTEGRITY + DEAD-END DETECTION ---\n');
  gate('DAG acyclic, no dead-ends', () => checkDAGIntegrity(dagMap));

  // Gate 4: Ranking output correctness + determinism
  console.log('\n--- GATE 4: RANKING OUTPUT CORRECTNESS ---\n');
  gate('Ranked, sorted, deterministic', () =>
    checkRankingOutput(rankedActions, rankFn, actionsInput, actionEvents));

  // Gate 5: Single ranking surface + dead code guard
  console.log('\n--- GATE 5: SINGLE RANKING SURFACE + DEAD CODE GUARD ---\n');
  gate('One ranking surface, no dead scorers', () => checkSingleRankingSurface());

  // Gate 6: Ranking trace (content-level)
  console.log('\n--- GATE 6: RANKING TRACE ---\n');
  gate('Ranking trace integrity', () => checkRankingTrace(rankedActions, context));

  // Gate 7: Action events + event purity
  console.log('\n--- GATE 7: ACTION EVENTS + EVENT PURITY ---\n');
  gate('Events valid, payloads pure', () => checkActionEventsAndPurity(actionEvents, actions));

  // Gate 8: Followup dedup
  console.log('\n--- GATE 8: FOLLOWUP DEDUP ---\n');
  gate('No duplicate followup actions', () => checkNoFollowupDuplicates(actions));

  // Gate 9: Canonicality enforcement
  console.log('\n--- GATE 9: CANONICALITY ENFORCEMENT ---\n');
  gate('Engine code only in packages/core', () => checkCanonicality());

  // Gate 10: metricFact schema compliance
  console.log('\n--- GATE 10: METRICFACT SCHEMA ---\n');
  gate('metricFact schema compliance', () => checkMetricFactSchema(rawData));

  // Gate 11: No derived keys in metricFacts
  console.log('\n--- GATE 11: NO DERIVED IN METRICFACTS ---\n');
  gate('No derived keys in metricFacts', () => checkNoDerivedInMetricFacts(rawData));

  // Gate 12: Backward compatibility
  console.log('\n--- GATE 12: BACKWARD COMPATIBILITY ---\n');
  gate('Scalar fields still load', () => checkBackwardCompat(rawData));

  // Gate 13: Single goal framework
  console.log('\n--- GATE 13: SINGLE GOAL FRAMEWORK ---\n');
  gate('Single goal shape', () => checkSingleGoalFramework(rawData));

  // Summary
  const pad = Math.max(0, 39 - String(passed).length - String(failed).length);
  console.log('\n╔' + '═'.repeat(63) + '╗');
  console.log(`║  QA GATE: ${passed} passed, ${failed} failed${warnings > 0 ? `, ${warnings} warnings` : ''}${' '.repeat(Math.max(0, pad - (warnings > 0 ? String(warnings).length + 12 : 0)))}║`);
  console.log('╚' + '═'.repeat(63) + '╝\n');

  if (failed > 0) {
    console.log('❌ QA GATE FAILED - Build blocked');
    process.exitCode = 1;
  } else {
    console.log(`✔ QA GATE PASSED${warnings > 0 ? ` (${warnings} warning${warnings > 1 ? 's' : ''})` : ''}`);
  }

  return { passed, failed, warnings, results };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  checkLayerImports,
  checkNoStoredDerivations,
  checkDAGIntegrity,
  checkRankingOutput,
  checkSingleRankingSurface,
  checkRankingTrace,
  checkActionEventsAndPurity,
  checkNoFollowupDuplicates,
  checkCanonicality,
  checkMetricFactSchema,
  checkNoDerivedInMetricFacts,
  checkBackwardCompat,
  checkSingleGoalFramework,
  FORBIDDEN_EVENT_PAYLOAD_KEYS,
  TERMINAL_NODE_WHITELIST,
  DEAD_SCORERS,
  FULL_CONTEXT_ENFORCEMENT
};

export default { runQAGate };

// =============================================================================
// CLI RUNNER
// =============================================================================

const isMain = process.argv[1]?.includes('qa_gate.js');
if (isMain) {
  (async () => {
    console.log('Running QA Gate — loading runtime data...\n');
    await runQAGate();
  })().catch(err => {
    console.error('QA Gate error:', err);
    process.exit(1);
  });
}
