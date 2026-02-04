/**
 * qa/qa_gate.js â€” Canonical QA Gate (Phase 4.6)
 * 
 * SINGLE QA HARD-FAIL GATE
 * 
 * This is the ONLY QA gate. All others are deprecated.
 * 
 * Hard-fails if:
 * - Layer import rules violated
 * - Derived fields in raw storage
 * - DAG has cycles
 * - Actions lack rankScore
 * - Sorting uses anything other than rankScore
 * - Identical inputs yield different rankings
 * - IntroOutcome schema invalid
 * - Multiple ranking surfaces detected
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
      console.log(`âœ“ ${name}`);
      passed++;
      results.push({ name, status: 'pass' });
    } else {
      const errors = result?.errors || ['Gate returned false'];
      console.log(`âœ— ${name}`);
      errors.forEach(e => console.log(`  - ${e}`));
      failed++;
      results.push({ name, status: 'fail', errors });
    }
  } catch (err) {
    console.log(`âœ— ${name}`);
    console.log(`  - Exception: ${err.message}`);
    failed++;
    results.push({ name, status: 'fail', errors: [err.message] });
  }
}

// =============================================================================
// GATE 1: LAYER IMPORT RULES
// =============================================================================

/**
 * Check that imports respect layer boundaries
 * 
 * Layer order: raw < derive < predict < decide < runtime
 * qa/* may import: raw/*, derive/*, qa/*
 * No upward imports. Nothing imports from runtime.
 */
function checkLayerImports() {
  const layerOrder = ['raw', 'derive', 'predict', 'decide', 'runtime'];
  const errors = [];
  
  // Allowed imports per layer
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
        
        // Check for runtime import violation (Assert A1)
        if (importPath.includes('/runtime/') && layer !== 'runtime') {
          errors.push(`QA_FAIL_IMPORT_FROM_RUNTIME: ${layer}/${file} imports ${importPath}`);
          continue;
        }
        
        // Check for layer violations (Assert A2)
        for (const otherLayer of layerOrder) {
          if (importPath.includes(`../${otherLayer}/`) || importPath.includes(`./${otherLayer}/`)) {
            const allowed = allowedImports[layer] || [];
            if (!allowed.includes(otherLayer)) {
              errors.push(`QA_FAIL_LAYER_IMPORT: ${layer}/${file} in ${layer} imports ${importPath} in ${otherLayer}`);
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

/**
 * Forbidden fields that must never appear in raw data
 */
const FORBIDDEN_IN_RAW = [
  // Core derivations per Phase 4.6 spec
  'runway', 'runwayMonths',
  'health', 'healthScore', 'healthBand', 'healthSignals',
  'priority', 'priorityScore',
  'rankScore', 'expectedNetImpact', 'rank', 'rankComponents',
  'progressPct',
  'valueVector', 'weeklyValue',
  // Extended forbidden list
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
        errors.push(`QA_FAIL_FORBIDDEN_KEY_IN_RAW: key="${key}" path="${path || 'root'}"`);
      }
      
      if (typeof obj[key] === 'object') {
        scan(obj[key], path ? `${path}.${key}` : key);
      }
    }
  }
  
  scan(data);
  return { valid: errors.length === 0, errors };
}

/**
 * Assert B2: If mrr exists, raw must not contain arr
 */
function checkMRRARRRule(data) {
  const errors = [];
  
  function scan(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if both mrr and arr exist at same level
    if (obj.mrr !== undefined && obj.arr !== undefined) {
      errors.push(`QA_FAIL_RAW_ARR_PRESENT_WITH_MRR: entity="${obj.id || 'unknown'}" path="${path}"`);
    }
    
    for (const key of Object.keys(obj)) {
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
        errors.push(`QA_FAIL_GRAPH_CYCLE: cycle="${cyclePath.join(' -> ')} -> ${dep}"`);
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
// GATE 4: ACTIONS HAVE RANKSCORE
// =============================================================================

function checkActionsHaveRankScore(actions) {
  const errors = [];
  
  for (const action of actions) {
    if (typeof action.rankScore !== 'number' || isNaN(action.rankScore)) {
      errors.push(`QA_FAIL_MISSING_RANKSCORE: actionId="${action.actionId || 'unknown'}"`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 5: SORTING USES ONLY RANKSCORE
// =============================================================================

function checkSortingByRankScore(rankedActions) {
  const errors = [];
  
  for (let i = 1; i < rankedActions.length; i++) {
    const prev = rankedActions[i - 1];
    const curr = rankedActions[i];
    
    // rankScore should be descending
    if (curr.rankScore > prev.rankScore + 0.0001) {
      errors.push(`QA_FAIL_NONDETERMINISTIC_TIEBREAK: actions out of order at index=${i}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 6: DETERMINISTIC RANKING
// =============================================================================

function checkDeterminism(rankFn, actions, context) {
  const errors = [];
  
  const result1 = rankFn(actions, context);
  const result2 = rankFn(actions, context);
  
  if (result1.length !== result2.length) {
    errors.push('QA_FAIL_NONDETERMINISTIC_OUTPUT: action count differs between identical runs');
    return { valid: false, errors };
  }
  
  for (let i = 0; i < result1.length; i++) {
    if (result1[i].actionId !== result2[i].actionId) {
      errors.push(`QA_FAIL_NONDETERMINISTIC_OUTPUT: action order differs between identical runs`);
    }
    if (Math.abs(result1[i].rankScore - result2[i].rankScore) > 0.0001) {
      errors.push(`QA_FAIL_NONDETERMINISTIC_OUTPUT: rankScore differs for ${result1[i].actionId}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 7: INTROOUTCOME SCHEMA VALID
// =============================================================================

function checkIntroOutcomeSchema(outcomes) {
  const { validateIntroOutcomes } = require('../raw/introOutcome.js');
  return validateIntroOutcomes(outcomes);
}

// =============================================================================
// GATE 8: SINGLE RANKING SURFACE
// =============================================================================

/**
 * Assert A1: Non-Canonical Action Sorting Is Forbidden
 * Assert C1: Only decide/ranking.js may sort actions
 * Assert C2: Sorting uses rankScore only
 */
function checkSingleRankingSurface() {
  const errors = [];
  
  // Scan ALL directories for action sorting violations
  const scanDirs = ['raw', 'derive', 'predict', 'decide', 'runtime'];
  
  for (const dir of scanDirs) {
    const dirPath = join(ROOT, dir);
    if (!existsSync(dirPath)) continue;
    
    const files = readdirSync(dirPath).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      // ONLY decide/ranking.js is allowed to sort actions
      if (dir === 'decide' && file === 'ranking.js') continue;
      
      // Skip QA files
      if (file.includes('qa') || file.includes('test')) continue;
      
      const content = readFileSync(join(dirPath, file), 'utf8');
      
      // Look for .sort( calls
      const sortMatches = [...content.matchAll(/\.sort\s*\(/g)];
      
      for (const match of sortMatches) {
        const idx = match.index;
        const context = content.slice(Math.max(0, idx - 300), idx + 300);
        
        // Refined detection: only flag actual action ranking violations
        // 1. Sorting by rankScore outside ranking.js = VIOLATION
        if (context.includes('rankScore')) {
          errors.push(`QA_FAIL_NONCANONICAL_ACTION_SORT: ${dir}/${file} sorts by rankScore outside decide/ranking.js`);
          continue;
        }
        
        // 2. Variable named exactly "actions" being sorted = VIOLATION
        // Match patterns like: actions.sort, actions.slice().sort
        if (/\bactions\s*\.\s*(?:slice\s*\(\s*\)\s*\.)?\s*sort/.test(context)) {
          errors.push(`QA_FAIL_NONCANONICAL_ACTION_SORT: ${dir}/${file} sorts actions array outside decide/ranking.js`);
          continue;
        }
        
        // 3. Function named rankBy* or sortAction* = VIOLATION
        if (/function\s+(rankBy|sortAction)\w*/.test(context)) {
          errors.push(`QA_FAIL_NONCANONICAL_ACTION_SORT: ${dir}/${file} defines action ranking function outside decide/ranking.js`);
          continue;
        }
        
        // 4. Export that returns sorted actions = VIOLATION
        if (/export\s+.*\bactions\b.*\.sort/.test(context)) {
          errors.push(`QA_FAIL_NONCANONICAL_ACTION_SORT: ${dir}/${file} exports sorted actions outside decide/ranking.js`);
          continue;
        }
        
        // Allowed: pre-issue sorting, display text sorting, hash generation, report formatting
      }
    }
  }
  
  // Assert C2: Check ranking.js uses only rankScore
  const rankingPath = join(ROOT, 'decide', 'ranking.js');
  if (existsSync(rankingPath)) {
    const rankingContent = readFileSync(rankingPath, 'utf8');
    
    // Find the sort comparator
    const sortMatch = rankingContent.match(/\.sort\s*\(\s*\([^)]*\)\s*=>\s*\{([^}]+)\}/);
    if (sortMatch) {
      const comparator = sortMatch[1];
      
      // Check for forbidden tokens in comparator
      const forbiddenInComparator = ['expectedNetImpact', 'impactScore', 'priorityScore', 'valueVector', 'weeklyValue', 'valueDensity'];
      for (const token of forbiddenInComparator) {
        if (comparator.includes(`${token}`) && 
            (comparator.includes(`b.${token}`) || comparator.includes(`a.${token}`)) &&
            !comparator.includes('rankScore')) {
          errors.push(`QA_FAIL_RANKING_COMPARATOR_NOT_RANKSCORE_ONLY: decide/ranking.js comparator references "${token}"`);
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GATE 9: NO DUPLICATE FOLLOWUPS
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
// PHASE 4.6 GATES: ACTION OUTCOME MEMORY
// =============================================================================

const ACTION_EVENTS_PATH = join(ROOT, 'raw', 'actionEvents.json');

// Forbidden derived keys in event payloads
const FORBIDDEN_EVENT_PAYLOAD_KEYS = [
  'rankScore', 'expectedNetImpact', 'impactScore', 'rippleScore',
  'priorityScore', 'healthScore', 'executionProbability', 'frictionPenalty',
  'calibratedProbability', 'learnedExecutionProbability', 'learnedFrictionPenalty'
];

const VALID_EVENT_TYPES = [
  'created', 'assigned', 'started', 'completed',
  'outcome_recorded', 'followup_created', 'note_added'
];

const VALID_OUTCOMES = ['success', 'partial', 'failed', 'abandoned'];

/**
 * Load action events from file
 */
function loadActionEvents() {
  try {
    if (!existsSync(ACTION_EVENTS_PATH)) return null;
    const data = JSON.parse(readFileSync(ACTION_EVENTS_PATH, 'utf8'));
    return data.actionEvents || [];
  } catch {
    return null;
  }
}

/**
 * Gate A: Action events file loads
 */
function checkActionEventsLoad() {
  const errors = [];
  
  if (!existsSync(ACTION_EVENTS_PATH)) {
    errors.push('QA_FAIL_ACTION_EVENTS_LOAD: raw/actionEvents.json does not exist');
    return { valid: false, errors };
  }
  
  try {
    const content = readFileSync(ACTION_EVENTS_PATH, 'utf8');
    const data = JSON.parse(content);
    
    if (!Array.isArray(data.actionEvents)) {
      errors.push('QA_FAIL_ACTION_EVENTS_LOAD: actionEvents must be an array');
    }
  } catch (e) {
    errors.push(`QA_FAIL_ACTION_EVENTS_LOAD: Failed to parse - ${e.message}`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Gate B: Action event schema validity
 */
function checkActionEventSchema(events) {
  const errors = [];
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    // Required fields
    if (!event.id || typeof event.id !== 'string') {
      errors.push(`QA_FAIL_ACTION_EVENT_SCHEMA: Event[${i}] missing id`);
    }
    if (!event.actionId || typeof event.actionId !== 'string') {
      errors.push(`QA_FAIL_ACTION_EVENT_SCHEMA: Event[${i}] missing actionId`);
    }
    if (!event.eventType || !VALID_EVENT_TYPES.includes(event.eventType)) {
      errors.push(`QA_FAIL_ACTION_EVENT_SCHEMA: Event[${i}] invalid eventType: ${event.eventType}`);
    }
    if (!event.timestamp || typeof event.timestamp !== 'string') {
      errors.push(`QA_FAIL_ACTION_EVENT_SCHEMA: Event[${i}] missing timestamp`);
    }
    if (!event.actor || typeof event.actor !== 'string') {
      errors.push(`QA_FAIL_ACTION_EVENT_SCHEMA: Event[${i}] missing actor`);
    }
    if (event.payload === undefined || typeof event.payload !== 'object') {
      errors.push(`QA_FAIL_ACTION_EVENT_SCHEMA: Event[${i}] missing payload object`);
    }
    
    // Outcome validation for outcome_recorded
    if (event.eventType === 'outcome_recorded' && event.payload) {
      if (!VALID_OUTCOMES.includes(event.payload.outcome)) {
        errors.push(`QA_FAIL_ACTION_EVENT_SCHEMA: Event[${i}] invalid outcome: ${event.payload.outcome}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Gate C: Timestamp parsing
 */
function checkActionEventTimestamps(events) {
  const errors = [];
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.timestamp) {
      const parsed = Date.parse(event.timestamp);
      if (isNaN(parsed)) {
        errors.push(`QA_FAIL_ACTION_EVENT_TIMESTAMP: Event[${i}] invalid timestamp: ${event.timestamp}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Gate D: Unique event IDs
 */
function checkUniqueEventIds(events) {
  const errors = [];
  const seenIds = new Set();
  
  for (let i = 0; i < events.length; i++) {
    const id = events[i].id;
    if (id && seenIds.has(id)) {
      errors.push(`QA_FAIL_ACTION_EVENT_DUPLICATE_ID: Duplicate event ID: ${id}`);
    }
    if (id) seenIds.add(id);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Gate E: Referential integrity
 */
function checkEventReferentialIntegrity(events, actions) {
  const errors = [];
  const actionIds = new Set(actions.map(a => a.id || a.actionId));
  
  for (let i = 0; i < events.length; i++) {
    const actionId = events[i].actionId;
    if (actionId && !actionIds.has(actionId)) {
      errors.push(`QA_FAIL_ACTION_EVENT_BAD_REF: Event[${i}] references unknown action: ${actionId}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Gate F: No derived keys in event payload
 */
function checkNoDerivedKeysInEvents(events) {
  const errors = [];
  
  for (let i = 0; i < events.length; i++) {
    const payload = events[i].payload;
    if (payload && typeof payload === 'object') {
      for (const key of FORBIDDEN_EVENT_PAYLOAD_KEYS) {
        if (key in payload) {
          errors.push(`QA_FAIL_DERIVED_KEY_IN_EVENT_PAYLOAD: Event[${i}] has forbidden key: ${key}`);
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Gate G: Determinism with events
 */
function checkDeterminismWithEvents(rankFn, actions, events) {
  const errors = [];
  
  try {
    // Run twice with same inputs
    const result1 = rankFn(actions, { actionEvents: events });
    const result2 = rankFn(actions, { actionEvents: events });
    
    if (result1.length !== result2.length) {
      errors.push('QA_FAIL_NONDETERMINISTIC_OUTPUT_WITH_EVENTS: Different result lengths');
      return { valid: false, errors };
    }
    
    for (let i = 0; i < result1.length; i++) {
      const id1 = result1[i].actionId || result1[i].id;
      const id2 = result2[i].actionId || result2[i].id;
      
      if (id1 !== id2) {
        errors.push(`QA_FAIL_NONDETERMINISTIC_OUTPUT_WITH_EVENTS: Order differs at position ${i}`);
      }
      
      if (Math.abs((result1[i].rankScore || 0) - (result2[i].rankScore || 0)) > 0.0001) {
        errors.push(`QA_FAIL_NONDETERMINISTIC_OUTPUT_WITH_EVENTS: rankScore differs at position ${i}`);
      }
    }
  } catch (e) {
    errors.push(`QA_FAIL_NONDETERMINISTIC_OUTPUT_WITH_EVENTS: Error during test - ${e.message}`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Gate I: Unified Impact Model check
 * Verifies upside calculation uses goal-centric formula
 */
function checkUnifiedImpactModel(rankedActions) {
  const errors = [];
  
  // Check that actions with linked goals have goalImpacts
  const actionsWithImpact = rankedActions.filter(a => a.impact);
  
  if (actionsWithImpact.length === 0) {
    return { valid: true, errors: [] }; // No actions to check
  }
  
  // Sample check: verify structure
  for (const action of actionsWithImpact.slice(0, 10)) {
    const impact = action.impact;
    
    // Must have upsideMagnitude
    if (typeof impact.upsideMagnitude !== 'number') {
      errors.push(`Action ${action.id} missing upsideMagnitude`);
    }
    
    // Must have explain array
    if (!Array.isArray(impact.explain)) {
      errors.push(`Action ${action.id} missing explain array`);
    }
    
    // Upside should be in valid range (10-100)
    if (impact.upsideMagnitude < 10 || impact.upsideMagnitude > 100) {
      errors.push(`Action ${action.id} upside ${impact.upsideMagnitude} outside valid range 10-100`);
    }
    
    // goalImpacts should be present (may be empty for unlinked actions)
    if (impact.goalImpacts && !Array.isArray(impact.goalImpacts)) {
      errors.push(`Action ${action.id} has invalid goalImpacts type`);
    }
  }
  
  // Verify hierarchy: ISSUE > PREISSUE > GOAL (on average)
  const bySource = {};
  for (const action of actionsWithImpact) {
    const src = action.sources?.[0]?.sourceType;
    if (!src) continue;
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(action.impact.upsideMagnitude);
  }
  
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const issueAvg = avg(bySource['ISSUE'] || []);
  const preissueAvg = avg(bySource['PREISSUE'] || []);
  const goalAvg = avg(bySource['GOAL'] || []);
  
  // Issues should generally score higher than preissues
  if (issueAvg > 0 && preissueAvg > 0 && issueAvg < preissueAvg * 0.8) {
    errors.push(`ISSUE avg (${issueAvg.toFixed(1)}) should be >= PREISSUE avg (${preissueAvg.toFixed(1)})`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Gate H: Append-only structure check
 * Verifies the file structure supports append-only semantics
 */
function checkAppendOnlyStructure() {
  const errors = [];
  
  if (!existsSync(ACTION_EVENTS_PATH)) {
    // File doesn't exist yet - that's OK, structure is valid
    return { valid: true, errors: [] };
  }
  
  try {
    const content = readFileSync(ACTION_EVENTS_PATH, 'utf8');
    const data = JSON.parse(content);
    
    // Must have actionEvents array
    if (!Array.isArray(data.actionEvents)) {
      errors.push('QA_FAIL_EVENT_LOG_MUTATION_DETECTED: actionEvents must be array');
    }
    
    // Check events are chronologically ordered (soft check)
    const events = data.actionEvents || [];
    for (let i = 1; i < events.length; i++) {
      const prev = Date.parse(events[i-1].timestamp);
      const curr = Date.parse(events[i].timestamp);
      if (!isNaN(prev) && !isNaN(curr) && curr < prev) {
        // Warning: out of order, but not hard fail
        console.log(`  Warning: Events out of chronological order at index ${i}`);
      }
    }
  } catch (e) {
    errors.push(`QA_FAIL_EVENT_LOG_MUTATION_DETECTED: Parse error - ${e.message}`);
  }
  
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// MAIN QA GATE
// =============================================================================

/**
 * Run all QA gates
 * @param {Object} options
 * @param {Object} options.rawData - Raw dataset to validate
 * @param {Object[]} options.rankedActions - Ranked actions to validate
 * @param {Object[]} options.introOutcomes - IntroOutcome ledger
 * @param {Function} options.rankFn - Ranking function
 * @param {Object[]} options.actionsInput - Input actions (for determinism test)
 * @param {Map} options.dag - DAG graph
 * @returns {{ passed: number, failed: number, results: Object[] }}
 */
export async function runQAGate(options = {}) {
  console.log('\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
  console.log('â•‘  BACKBONE PHASE 4.6 CANONICAL QA GATE                         â•‘');
  console.log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
  
  passed = 0;
  failed = 0;
  results.length = 0;
  
  // Gate 1: Layer imports (structural)
  console.log('--- GATE 1: LAYER IMPORT RULES ---\n');
  gate('Layer imports respect boundaries', () => checkLayerImports());
  
  // Gate 2: No stored derivations
  console.log('\n--- GATE 2: NO STORED DERIVATIONS ---\n');
  if (options.rawData) {
    gate('B1: No derived fields in raw data', () => checkNoStoredDerivations(options.rawData));
    gate('B2: MRR→ARR rule (no arr if mrr exists)', () => checkMRRARRRule(options.rawData));
  } else {
    console.log('  (skipped - no rawData provided)');
  }
  
  // Gate 3: DAG no cycles
  console.log('\n--- GATE 3: DAG INTEGRITY ---\n');
  if (options.dag) {
    gate('DAG has no cycles', () => checkDAGNoCycles(options.dag));
  } else {
    console.log('  (skipped - no dag provided)');
  }
  
  // Gate 4: Actions have rankScore
  console.log('\n--- GATE 4: ACTIONS HAVE RANKSCORE ---\n');
  if (options.rankedActions) {
    gate('All actions have rankScore', () => checkActionsHaveRankScore(options.rankedActions));
  } else {
    console.log('  (skipped - no rankedActions provided)');
  }
  
  // Gate 5: Sorting by rankScore
  console.log('\n--- GATE 5: SORTING BY RANKSCORE ---\n');
  if (options.rankedActions) {
    gate('Actions sorted by rankScore only', () => checkSortingByRankScore(options.rankedActions));
  } else {
    console.log('  (skipped - no rankedActions provided)');
  }
  
  // Gate 6: Determinism
  console.log('\n--- GATE 6: DETERMINISTIC RANKING ---\n');
  if (options.rankFn && options.actionsInput) {
    gate('Ranking is deterministic', () => checkDeterminism(options.rankFn, options.actionsInput, {}));
  } else {
    console.log('  (skipped - no rankFn or actionsInput provided)');
  }
  
  // Gate 7: IntroOutcome schema
  console.log('\n--- GATE 7: INTROOUTCOME SCHEMA ---\n');
  if (options.introOutcomes) {
    // Import at top level, validate inline
    const { validateIntroOutcomes } = await import('../raw/introOutcome.js');
    gate('IntroOutcome schema valid', () => {
      return validateIntroOutcomes(options.introOutcomes);
    });
  } else {
    console.log('  (skipped - no introOutcomes provided)');
  }
  
  // Gate 8: Single ranking surface
  console.log('\n--- GATE 8: SINGLE RANKING SURFACE ---\n');
  gate('No multiple ranking surfaces', () => checkSingleRankingSurface());
  
  // Gate 9: No duplicate followups
  console.log('\n--- GATE 9: FOLLOWUP DEDUPLICATION ---\n');
  if (options.rankedActions) {
    gate('No duplicate followup actions', () => checkNoFollowupDuplicates(options.rankedActions));
  } else {
    console.log('  (skipped - no rankedActions provided)');
  }
  
  // ==========================================================================
  // PHASE 4.6 GATES: Action Outcome Memory
  // ==========================================================================
  
  // Gate A: Action events file loads
  console.log('\n--- GATE A: ACTION EVENTS LOAD ---\n');
  gate('Action events file loads', () => checkActionEventsLoad());
  
  // Gate B: Action event schema validity
  console.log('\n--- GATE B: ACTION EVENT SCHEMA ---\n');
  if (options.actionEvents) {
    gate('Action event schema valid', () => checkActionEventSchema(options.actionEvents));
  } else {
    // Try loading from file
    const events = loadActionEvents();
    if (events) {
      gate('Action event schema valid', () => checkActionEventSchema(events));
    } else {
      console.log('  (skipped - no actionEvents)');
    }
  }
  
  // Gate C: Timestamp parsing
  console.log('\n--- GATE C: ACTION EVENT TIMESTAMPS ---\n');
  const eventsForTimestamp = options.actionEvents || loadActionEvents();
  if (eventsForTimestamp && eventsForTimestamp.length > 0) {
    gate('Action event timestamps valid', () => checkActionEventTimestamps(eventsForTimestamp));
  } else {
    console.log('  (skipped - no events to check)');
  }
  
  // Gate D: Unique event IDs
  console.log('\n--- GATE D: UNIQUE EVENT IDS ---\n');
  const eventsForIds = options.actionEvents || loadActionEvents();
  if (eventsForIds && eventsForIds.length > 0) {
    gate('No duplicate event IDs', () => checkUniqueEventIds(eventsForIds));
  } else {
    console.log('  (skipped - no events to check)');
  }
  
  // Gate E: Referential integrity (optional - needs actions)
  console.log('\n--- GATE E: REFERENTIAL INTEGRITY ---\n');
  const eventsForRef = options.actionEvents || loadActionEvents();
  if (eventsForRef && eventsForRef.length > 0 && options.actions) {
    gate('Event actionIds reference valid actions', () => checkEventReferentialIntegrity(eventsForRef, options.actions));
  } else {
    console.log('  (skipped - needs both events and actions)');
  }
  
  // Gate F: No derived keys in event payload
  console.log('\n--- GATE F: NO DERIVED KEYS IN EVENTS ---\n');
  const eventsForDerived = options.actionEvents || loadActionEvents();
  if (eventsForDerived) {
    gate('No derived keys in event payloads', () => checkNoDerivedKeysInEvents(eventsForDerived));
  } else {
    console.log('  (skipped - no events)');
  }
  
  // Gate G: Determinism with events
  console.log('\n--- GATE G: DETERMINISM WITH EVENTS ---\n');
  if (options.rankFn && options.actionsInput && eventsForDerived) {
    gate('Ranking deterministic with events', () => checkDeterminismWithEvents(options.rankFn, options.actionsInput, eventsForDerived));
  } else {
    console.log('  (skipped - needs rankFn, actionsInput, and events)');
  }
  
  // Gate H: Append-only behavior (structural check)
  console.log('\n--- GATE H: APPEND-ONLY STRUCTURE ---\n');
  gate('Action events append-only structure', () => checkAppendOnlyStructure());
  
  // GATE I: Unified Impact Model
  console.log('\n--- GATE I: UNIFIED IMPACT MODEL ---\n');
  if (options.rankedActions && options.rankedActions.length > 0) {
    gate('Impact model uses goal-centric upside', () => checkUnifiedImpactModel(options.rankedActions));
  } else {
    console.log('  (skipped - no rankedActions provided)');
  }
  
  // Summary
  console.log('\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
  console.log(`â•‘  QA GATE: ${passed} passed, ${failed} failed${' '.repeat(Math.max(0, 35 - String(passed).length - String(failed).length))}â•‘`);
  console.log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
  
  if (failed > 0) {
    console.log('âŒ QA GATE FAILED - Build blocked');
    process.exitCode = 1;
  } else {
    console.log('âœ“ QA GATE PASSED');
  }
  
  return { passed, failed, results };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  checkLayerImports,
  checkNoStoredDerivations,
  checkMRRARRRule,
  checkDAGNoCycles,
  checkActionsHaveRankScore,
  checkSortingByRankScore,
  checkDeterminism,
  checkSingleRankingSurface,
  checkNoFollowupDuplicates,
  // Phase 4.6 exports
  checkActionEventsLoad,
  checkActionEventSchema,
  checkActionEventTimestamps,
  checkUniqueEventIds,
  checkEventReferentialIntegrity,
  checkNoDerivedKeysInEvents,
  checkDeterminismWithEvents,
  checkAppendOnlyStructure,
  checkUnifiedImpactModel,
  FORBIDDEN_IN_RAW,
  FORBIDDEN_EVENT_PAYLOAD_KEYS
};

export default { runQAGate };

// =============================================================================
// CLI RUNNER
// =============================================================================

// Run if executed directly
const isMain = process.argv[1]?.includes('qa_gate.js');
if (isMain) {
  (async () => {
    console.log('Running QA Gate — loading runtime data...\n');

    // Load raw data
    const rawData = JSON.parse(readFileSync(join(ROOT, 'raw/sample.json'), 'utf-8'));

    // Run compute engine
    const { compute } = await import('../runtime/engine.js');
    const engineOutput = compute(rawData, new Date());

    // Build DAG as Map (Gate 3 uses .get()/.keys())
    const { GRAPH } = await import('../runtime/graph.js');
    const dagMap = new Map(Object.entries(GRAPH));

    // Import rank function for determinism tests
    const { rankActions } = await import('../decide/ranking.js');

    // Collect pre-ranking action candidates (all company actions before portfolio re-rank)
    const actionsInput = engineOutput.companies.flatMap(c => c.derived.actions || []);

    // Load action events
    const eventsData = JSON.parse(readFileSync(join(ROOT, 'raw/actionEvents.json'), 'utf-8'));
    const actionEvents = eventsData.actionEvents || [];

    // Run full QA gate
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
