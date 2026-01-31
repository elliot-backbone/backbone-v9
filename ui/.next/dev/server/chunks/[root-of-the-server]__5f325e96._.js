module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/backbone-v9/ui/qa/forbidden.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * forbidden.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Forbidden Derived Field Enforcement
 * 
 * INVARIANT: Derived values must NEVER be stored in raw data.
 * This module enforces that invariant through:
 * - Deep scanning for forbidden keys
 * - Validation gates that hard-fail on violations
 * - Export firewalls to prevent re-contamination
 * 
 * @module forbidden
 */ /**
 * B1: CANONICAL FORBIDDEN DERIVED FIELDS
 * 
 * If a value can be calculated, it must NEVER be persisted.
 * This list is exhaustive and authoritative.
 */ __turbopack_context__.s([
    "FORBIDDEN_DERIVED_FIELDS",
    ()=>FORBIDDEN_DERIVED_FIELDS,
    "FORBIDDEN_FIELDS",
    ()=>FORBIDDEN_FIELDS,
    "assertNoForbiddenFields",
    ()=>assertNoForbiddenFields,
    "deepScanForbidden",
    ()=>deepScanForbidden,
    "default",
    ()=>__TURBOPACK__default__export__,
    "exportComputed",
    ()=>exportComputed,
    "exportRaw",
    ()=>exportRaw,
    "getForbiddenList",
    ()=>getForbiddenList,
    "isForbidden",
    ()=>isForbidden,
    "validateNoForbiddenFields",
    ()=>validateNoForbiddenFields
]);
const FORBIDDEN_DERIVED_FIELDS = [
    // Core derivations
    'runway',
    'health',
    'priority',
    // Scoring/ranking
    'impact',
    'urgency',
    'risk',
    'score',
    // Classification bands
    'tier',
    'band',
    'label',
    // Progress metrics
    'progressPct',
    'coverage',
    // Probabilistic computations
    'expectedValue',
    'conversionProb',
    // Trajectory outputs (Phase 3.1 addition)
    'onTrack',
    'projectedDate',
    'velocity',
    // Issue/priority outputs
    'issues',
    'priorities',
    'actions',
    // Health components
    'healthBand',
    'healthSignals',
    'runwayMonths',
    // Ripple effect outputs
    'rippleScore',
    'rippleEffect',
    // Phase 3.2: Action impact model fields
    'actionId',
    'expectedNetImpact',
    'upsideMagnitude',
    'probabilityOfSuccess',
    'executionProbability',
    'downsideMagnitude',
    'timeToImpactDays',
    'effortCost',
    'secondOrderLeverage',
    'impactModel',
    'explain',
    // Phase 3.2: Predictive outputs
    'goalTrajectory',
    'probabilityOfHit',
    'preissues',
    'preIssues',
    'likelihood',
    'timeToBreachDays',
    // Phase 3.2: Action artifacts
    'actionCandidates',
    'rankedActions',
    'rank',
    'timing',
    'timingRationale',
    'timingConfidence',
    'timingScore',
    'escalation',
    'escalationDate',
    'daysUntilEscalation',
    'isImminent',
    'costOfDelay',
    'costMultiplier',
    'costCurve',
    'conversionLift',
    'isSecondOrder',
    'secondOrder',
    // Phase 4.5: Ranking surface (single scalar)
    'rankScore',
    'rankComponents',
    'trustPenalty',
    'executionFrictionPenalty',
    'timeCriticalityBoost',
    // Phase 4.5: Calibration outputs
    'calibratedProbability',
    'introducerPrior',
    'pathTypePrior',
    'targetTypePrior',
    'successRate',
    // Phase 4.5: Followup tracking
    'followupFor',
    'daysSinceSent'
];
const FORBIDDEN_FIELDS = FORBIDDEN_DERIVED_FIELDS;
/**
 * Create a Set for O(1) lookup
 */ const FORBIDDEN_SET = new Set(FORBIDDEN_DERIVED_FIELDS);
function deepScanForbidden(obj, path = '') {
    const violations = [];
    if (obj === null || obj === undefined) {
        return violations;
    }
    if (Array.isArray(obj)) {
        obj.forEach((item, index)=>{
            violations.push(...deepScanForbidden(item, `${path}[${index}]`));
        });
        return violations;
    }
    if (typeof obj === 'object') {
        for (const key of Object.keys(obj)){
            const currentPath = path ? `${path}.${key}` : key;
            // Check if this key is forbidden
            if (FORBIDDEN_SET.has(key)) {
                violations.push(currentPath);
            }
            // Recurse into value
            violations.push(...deepScanForbidden(obj[key], currentPath));
        }
    }
    return violations;
}
function validateNoForbiddenFields(raw) {
    const violations = deepScanForbidden(raw);
    if (violations.length === 0) {
        return {
            valid: true,
            violations: [],
            message: 'No forbidden derived fields found'
        };
    }
    return {
        valid: false,
        violations,
        message: `FORBIDDEN DERIVED FIELDS DETECTED:\n${violations.map((v)=>`  - ${v}`).join('\n')}\n\nDerived values must NEVER be stored. Remove these fields.`
    };
}
function assertNoForbiddenFields(raw) {
    const result = validateNoForbiddenFields(raw);
    if (!result.valid) {
        throw new Error(result.message);
    }
}
function exportRaw(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item)=>exportRaw(item));
    }
    if (typeof obj === 'object') {
        const cleaned = {};
        for (const key of Object.keys(obj)){
            // Skip forbidden keys
            if (FORBIDDEN_SET.has(key)) {
                continue;
            }
            // Recurse into value
            cleaned[key] = exportRaw(obj[key]);
        }
        return cleaned;
    }
    // Primitives pass through
    return obj;
}
function exportComputed(computed, fields = null) {
    const extractFields = fields || FORBIDDEN_DERIVED_FIELDS;
    const result = {};
    if (!computed || typeof computed !== 'object') {
        return result;
    }
    // Extract top-level derived fields
    for (const field of extractFields){
        if (computed[field] !== undefined) {
            result[field] = computed[field];
        }
    }
    // Also check for 'derived' namespace (engine output pattern)
    if (computed.derived && typeof computed.derived === 'object') {
        result.derived = {};
        for (const field of extractFields){
            if (computed.derived[field] !== undefined) {
                result.derived[field] = computed.derived[field];
            }
        }
    }
    return result;
}
function isForbidden(key) {
    return FORBIDDEN_SET.has(key);
}
function getForbiddenList() {
    return [
        ...FORBIDDEN_DERIVED_FIELDS
    ];
}
const __TURBOPACK__default__export__ = {
    FORBIDDEN_DERIVED_FIELDS,
    deepScanForbidden,
    validateNoForbiddenFields,
    assertNoForbiddenFields,
    exportRaw,
    exportComputed,
    isForbidden,
    getForbiddenList
};
}),
"[project]/backbone-v9/ui/runtime/index.js [api] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DealStatus",
    ()=>DealStatus,
    "GoalStatus",
    ()=>GoalStatus,
    "GoalType",
    ()=>GoalType,
    "Provenance",
    ()=>Provenance,
    "SCHEMA_DATE",
    ()=>SCHEMA_DATE,
    "SCHEMA_VERSION",
    ()=>SCHEMA_VERSION,
    "Stage",
    ()=>Stage,
    "validateCompany",
    ()=>validateCompany,
    "validateDataset",
    ()=>validateDataset
]);
/**
 * BACKBONE V9 - SCHEMA DEFINITION
 * 
 * INVARIANT: Schema stores FACTS only, never derivations.
 * 
 * Forbidden to store: See forbidden.js for canonical list.
 * Every raw datum must have: value + asOf + provenance
 * 
 * Phase C Contract:
 * - Raw input is the sole source of truth
 * - Derived output is ephemeral  
 * - Freshness/provenance missing -> Issue, not Health penalty
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$qa$2f$forbidden$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/qa/forbidden.js [api] (ecmascript)");
;
const Stage = {
    PRE_SEED: 'Pre-Seed',
    SEED: 'Seed',
    SERIES_A: 'Series A',
    SERIES_B: 'Series B',
    SERIES_C: 'Series C'
};
const GoalType = {
    REVENUE: 'revenue',
    PRODUCT: 'product',
    FUNDRAISE: 'fundraise',
    HIRING: 'hiring',
    PARTNERSHIP: 'partnership',
    OPERATIONAL: 'operational'
};
const GoalStatus = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    ABANDONED: 'abandoned',
    PAUSED: 'paused'
};
const DealStatus = {
    OUTREACH: 'outreach',
    MEETING: 'meeting',
    DD: 'dd',
    TERMSHEET: 'termsheet',
    CLOSED: 'closed',
    PASSED: 'passed'
};
const Provenance = {
    MANUAL: 'manual',
    AGENT: 'agent',
    INTEGRATION: 'integration',
    SYSTEM: 'system'
};
function validateCompany(company) {
    const errors = [];
    // Required fields
    const required = [
        'id',
        'name',
        'stage',
        'burn',
        'cash',
        'asOf',
        'provenance'
    ];
    for (const field of required){
        if (company[field] === undefined || company[field] === null) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    // CRITICAL: Deep scan for forbidden derived fields (uses canonical list)
    const forbiddenResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$qa$2f$forbidden$2e$js__$5b$api$5d$__$28$ecmascript$29$__["validateNoForbiddenFields"])(company);
    if (!forbiddenResult.valid) {
        for (const violation of forbiddenResult.violations){
            errors.push(`FORBIDDEN: Cannot store derived field at '${violation}'. Remove it.`);
        }
    }
    // Enum validation
    if (company.stage && !Object.values(Stage).includes(company.stage)) {
        errors.push(`Invalid stage: ${company.stage}`);
    }
    // Type validation
    if (typeof company.burn !== 'number' || company.burn < 0) {
        errors.push(`Invalid burn: must be non-negative number`);
    }
    if (typeof company.cash !== 'number' || company.cash < 0) {
        errors.push(`Invalid cash: must be non-negative number`);
    }
    // Goals validation
    if (company.goals) {
        for (const goal of company.goals){
            if (!goal.id || !goal.type || !goal.target) {
                errors.push(`Invalid goal: missing id, type, or target`);
            }
            if (!Object.values(GoalType).includes(goal.type)) {
                errors.push(`Invalid goal type: ${goal.type}`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
function validateDataset(data) {
    const errors = [];
    // Phase B3: Deep scan entire dataset for forbidden fields FIRST
    const forbiddenResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$qa$2f$forbidden$2e$js__$5b$api$5d$__$28$ecmascript$29$__["validateNoForbiddenFields"])(data);
    if (!forbiddenResult.valid) {
        errors.push(...forbiddenResult.violations.map((v)=>`FORBIDDEN DERIVED FIELD: ${v}`));
    }
    // Validate companies
    for (const company of data.companies || []){
        const result = validateCompany(company);
        if (!result.valid) {
            // Filter out duplicate forbidden errors (already caught above)
            const nonForbiddenErrors = result.errors.filter((e)=>!e.startsWith('FORBIDDEN'));
            errors.push(...nonForbiddenErrors.map((e)=>`[${company.id || 'unknown'}] ${e}`));
        }
    }
    // Validate referential integrity: deals reference valid investors
    const investorIds = new Set((data.investors || []).map((i)=>i.id));
    for (const company of data.companies || []){
        for (const deal of company.deals || []){
            if (deal.investorId && !investorIds.has(deal.investorId)) {
                errors.push(`[${company.id}] Deal references unknown investor: ${deal.investorId}`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
;
const SCHEMA_VERSION = '9.1.0';
const SCHEMA_DATE = '2026-01-24';
}),
"[project]/backbone-v9/ui/runtime/graph.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * graph.js – Explicit DAG Definition (Phase 4.5.2)
 * 
 * Execution order is enforced by explicit dependency graph, not convention.
 * 
 * INVARIANT: No circular dependencies. Architecture enforces doctrine.
 * 
 * @module graph
 */ // =============================================================================
// COMPUTATION GRAPH (Phase 4.5.2)
// =============================================================================
/**
 * Dependency graph for Phase 4.5.2 pipeline.
 * Each node lists its dependencies.
 * 
 * Phase 4.5.2: Kill list compliance
 * - REMOVED: valueVector (shadow value surface)
 * - REMOVED: weeklyValue (shadow value surface)
 * - SINGLE RANKING SURFACE: actionRanker (via rankScore only)
 * 
 * DAG Order:
 * runway → metrics → trajectory → goalTrajectory → health → issues → 
 * preissues → ripple → actionCandidates → actionImpact → actionRanker
 */ __turbopack_context__.s([
    "GRAPH",
    ()=>GRAPH,
    "default",
    ()=>__TURBOPACK__default__export__,
    "dependsOn",
    ()=>dependsOn,
    "getDependencies",
    ()=>getDependencies,
    "getExecutionOrder",
    ()=>getExecutionOrder,
    "topoSort",
    ()=>topoSort,
    "validateGraph",
    ()=>validateGraph
]);
const GRAPH = {
    // L1: Base derivations (no deps)
    runway: [],
    metrics: [],
    // L2: Trajectory (can use metrics)
    trajectory: [
        'metrics'
    ],
    // L3: Goal trajectory (goals + metrics + trajectory)
    goalTrajectory: [
        'metrics',
        'trajectory'
    ],
    // L4: Health (internal state only, depends on runway)
    health: [
        'runway'
    ],
    // L5: Issues (gaps - depends on runway, trajectory, goalTrajectory)
    issues: [
        'runway',
        'trajectory',
        'goalTrajectory'
    ],
    // L6: Pre-issues (forecasted - depends on runway, goalTrajectory, trajectory)
    preissues: [
        'runway',
        'goalTrajectory',
        'trajectory',
        'metrics'
    ],
    // L7: Ripple (downstream effects - depends on issues)
    ripple: [
        'issues'
    ],
    // L8: Intro opportunities (network actions - depends on goalTrajectory for blocked goals)
    introOpportunity: [
        'goalTrajectory',
        'issues'
    ],
    // L9: Action candidates (from issues, preissues, goals, AND intros)
    actionCandidates: [
        'issues',
        'preissues',
        'goalTrajectory',
        'introOpportunity'
    ],
    // L10: Action impact (attach impact model, use ripple for leverage)
    actionImpact: [
        'actionCandidates',
        'ripple'
    ],
    // L11: Action ranker (rank by rankScore - single surface)
    actionRanker: [
        'actionImpact'
    ],
    // L12: Priority view (compatibility layer over ranked actions)
    priority: [
        'actionRanker'
    ]
};
function topoSort(graph) {
    const nodes = Object.keys(graph);
    const visited = new Set();
    const visiting = new Set();
    const order = [];
    function visit(node) {
        if (visited.has(node)) {
            return;
        }
        if (visiting.has(node)) {
            throw new Error(`DAG CYCLE DETECTED: ${node} is part of a circular dependency`);
        }
        visiting.add(node);
        const deps = graph[node] || [];
        for (const dep of deps){
            if (!graph.hasOwnProperty(dep)) {
                throw new Error(`DAG ERROR: Unknown dependency '${dep}' in node '${node}'`);
            }
            visit(dep);
        }
        visiting.delete(node);
        visited.add(node);
        order.push(node);
    }
    // Visit all nodes (sorted for determinism)
    for (const node of nodes.sort()){
        visit(node);
    }
    return order;
}
function validateGraph(graph) {
    const errors = [];
    const nodes = new Set(Object.keys(graph));
    // Check all dependencies exist
    for (const [node, deps] of Object.entries(graph)){
        for (const dep of deps){
            if (!nodes.has(dep)) {
                errors.push(`Node '${node}' depends on unknown node '${dep}'`);
            }
        }
    }
    // Check for cycles
    try {
        topoSort(graph);
    } catch (e) {
        errors.push(e.message);
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
function getExecutionOrder() {
    return topoSort(GRAPH);
}
function getDependencies(node) {
    return GRAPH[node] || [];
}
function dependsOn(nodeA, nodeB) {
    const visited = new Set();
    function check(current) {
        if (current === nodeB) return true;
        if (visited.has(current)) return false;
        visited.add(current);
        const deps = GRAPH[current] || [];
        for (const dep of deps){
            if (check(dep)) return true;
        }
        return false;
    }
    return check(nodeA);
}
const __TURBOPACK__default__export__ = {
    GRAPH,
    topoSort,
    validateGraph,
    getExecutionOrder,
    getDependencies,
    dependsOn
};
}),
"[project]/backbone-v9/ui/derive/runway.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * BACKBONE V9 Ã¢â‚¬â€ RUNWAY DERIVATION
 * 
 * Pure function: (cash, burn, now) Ã¢â€ â€™ RunwayResult
 * 
 * INVARIANT: This is a runtime derivation. Never store the result.
 */ /**
 * @typedef {Object} RunwayResult
 * @property {number} value - Runway in months
 * @property {number} confidence - 0-1 confidence score
 * @property {string[]} inputs_used - Fields used in calculation
 * @property {string[]} inputs_missing - Fields that were missing
 * @property {number} staleness_penalty - 0-1 penalty for stale data
 * @property {string} provenance_summary - Source description
 * @property {string} explain - Human-readable explanation
 */ /**
 * Compute runway in months
 * 
 * @param {number} cash - Current cash position
 * @param {number} burn - Monthly burn rate
 * @param {string} cashAsOf - ISO timestamp of cash data
 * @param {string} burnAsOf - ISO timestamp of burn data
 * @param {Date} now - Current time (passed explicitly for determinism)
 * @returns {RunwayResult}
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "deriveRunway",
    ()=>deriveRunway
]);
function deriveRunway(cash, burn, cashAsOf, burnAsOf, now = new Date()) {
    const inputs_used = [];
    const inputs_missing = [];
    let confidence = 1.0;
    let staleness_penalty = 0;
    // Check for missing inputs
    if (cash === undefined || cash === null) {
        inputs_missing.push('cash');
    } else {
        inputs_used.push('cash');
    }
    if (burn === undefined || burn === null) {
        inputs_missing.push('burn');
    } else {
        inputs_used.push('burn');
    }
    // Calculate staleness penalty
    const maxStaleDays = 30;
    if (cashAsOf) {
        const cashDate = cashAsOf instanceof Date ? cashAsOf : new Date(cashAsOf);
        const cashAge = (now.getTime() - cashDate.getTime()) / (1000 * 60 * 60 * 24);
        staleness_penalty = Math.max(staleness_penalty, Math.min(cashAge / maxStaleDays, 1));
    }
    if (burnAsOf) {
        const burnDate = burnAsOf instanceof Date ? burnAsOf : new Date(burnAsOf);
        const burnAge = (now.getTime() - burnDate.getTime()) / (1000 * 60 * 60 * 24);
        staleness_penalty = Math.max(staleness_penalty, Math.min(burnAge / maxStaleDays, 1));
    }
    // Handle edge cases
    if (inputs_missing.length > 0) {
        return {
            value: null,
            confidence: 0,
            inputs_used,
            inputs_missing,
            staleness_penalty,
            provenance_summary: 'insufficient data',
            explain: `Cannot compute runway: missing ${inputs_missing.join(', ')}`
        };
    }
    if (burn <= 0) {
        return {
            value: Infinity,
            confidence: 0.5,
            inputs_used,
            inputs_missing,
            staleness_penalty,
            provenance_summary: 'zero burn',
            explain: 'Infinite runway (burn is zero or negative)'
        };
    }
    if (cash < 0) {
        return {
            value: 0,
            confidence: 0.9,
            inputs_used,
            inputs_missing,
            staleness_penalty,
            provenance_summary: 'negative cash',
            explain: 'Zero runway (cash is negative)'
        };
    }
    // Normal calculation
    const runway = cash / burn;
    confidence = Math.max(0, 1 - staleness_penalty * 0.5); // Staleness reduces confidence
    return {
        value: Math.round(runway * 10) / 10,
        confidence,
        inputs_used,
        inputs_missing,
        staleness_penalty,
        provenance_summary: `cash=${cash}, burn=${burn}`,
        explain: `${Math.round(runway)} months runway at current burn rate`
    };
}
const __TURBOPACK__default__export__ = deriveRunway;
}),
"[project]/backbone-v9/ui/runtime/health.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "deriveHealth",
    ()=>deriveHealth
]);
/**
 * health.js - HEALTH DERIVATION (Phase D Rewrite)
 * 
 * CRITICAL DOCTRINE:
 * - Health = Internal State ONLY
 * - Health reflects what EXISTS and is COHERENT
 * - Health does NOT reflect what is MISSING or LATE (that's Issues)
 * - Health does NOT predict outcomes (that's Trajectory)
 * 
 * D1: Health must NOT:
 * - Penalize missing data
 * - Penalize missing goals  
 * - Predict outcomes
 * 
 * D2: Health MAY reflect:
 * - Presence of internal state
 * - Internal coherence
 * - Optional data-integrity signals
 * 
 * D3: Health Output Shape:
 * {
 *   healthBand: "GREEN" | "YELLOW" | "RED",
 *   healthSignals: string[],
 *   confidence: number
 * }
 * 
 * INVARIANT: This is a runtime derivation. Never store the result.
 * 
 * @module health
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$runway$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/derive/runway.js [api] (ecmascript)");
;
/**
 * @typedef {'GREEN' | 'YELLOW' | 'RED'} HealthBand
 */ /**
 * @typedef {Object} HealthResult
 * @property {HealthBand} value - Health band (alias: healthBand)
 * @property {HealthBand} healthBand - Health band
 * @property {string[]} healthSignals - Signals that contributed to health
 * @property {number} confidence - 0-1 confidence score
 * @property {string} explain - Human-readable explanation
 */ /**
 * Health thresholds (in months of runway)
 * 
 * NOTE: These reflect CURRENT STATE, not predictions.
 * A company with 3 months runway IS in a critical state.
 * This is a fact about now, not a prediction about failure.
 */ const THRESHOLDS = {
    CRITICAL_RUNWAY: 6,
    WARNING_RUNWAY: 12 // YELLOW: Company currently has < 12 months runway
};
function deriveHealth(company, now = new Date()) {
    const healthSignals = [];
    let confidence = 1.0;
    // =========================================================================
    // STEP 1: Derive runway (current state, not prediction)
    // =========================================================================
    const runwayResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$runway$2e$js__$5b$api$5d$__$28$ecmascript$29$__["deriveRunway"])(company.cash, company.burn, company.asOf, company.asOf, now);
    // =========================================================================
    // STEP 2: Assess runway health (what IS, not what's missing)
    // =========================================================================
    let healthBand = 'GREEN';
    if (runwayResult.value === null) {
        // Cannot determine runway - but this is NOT a health penalty
        // It becomes an Issue (DATA_MISSING), not a health downgrade
        // Health reflects what we CAN assess, not what we can't
        healthBand = 'GREEN'; // Default to GREEN when unknown
        confidence = 0.3; // Low confidence due to incomplete data
        healthSignals.push('runway_unknown');
    } else if (runwayResult.value === Infinity) {
        // Zero or negative burn = infinite runway
        healthBand = 'GREEN';
        healthSignals.push('runway_infinite');
    } else if (runwayResult.value < THRESHOLDS.CRITICAL_RUNWAY) {
        // Current state: critically low runway
        healthBand = 'RED';
        healthSignals.push(`runway_critical_${Math.round(runwayResult.value)}mo`);
    } else if (runwayResult.value < THRESHOLDS.WARNING_RUNWAY) {
        // Current state: warning-level runway
        healthBand = 'YELLOW';
        healthSignals.push(`runway_warning_${Math.round(runwayResult.value)}mo`);
    } else {
        // Current state: healthy runway
        healthBand = 'GREEN';
        healthSignals.push(`runway_healthy_${Math.round(runwayResult.value)}mo`);
    }
    // =========================================================================
    // STEP 3: Data coherence signals (optional integrity checks)
    // =========================================================================
    // Check if core financial data is present (not a penalty, just a signal)
    if (company.cash !== undefined && company.burn !== undefined) {
        healthSignals.push('financials_present');
    }
    // Check if company has asOf timestamp (data integrity)
    if (company.asOf) {
        healthSignals.push('timestamp_present');
    }
    // =========================================================================
    // STEP 4: Confidence adjustment based on data quality
    // =========================================================================
    // Reduce confidence if runway calculation had issues
    if (runwayResult.value !== null) {
        confidence = Math.min(confidence, runwayResult.confidence);
    }
    // =========================================================================
    // STEP 5: Build explanation (descriptive, not prescriptive)
    // =========================================================================
    let explain;
    if (runwayResult.value === null) {
        explain = 'Health unknown: insufficient financial data';
    } else if (runwayResult.value === Infinity) {
        explain = 'Healthy: no burn or positive cash flow';
    } else {
        explain = `${healthBand}: ${Math.round(runwayResult.value)} months runway`;
    }
    return {
        value: healthBand,
        healthBand,
        healthSignals,
        confidence: Math.round(confidence * 100) / 100,
        explain
    };
}
const __TURBOPACK__default__export__ = deriveHealth;
}),
"[project]/backbone-v9/ui/derive/trajectory.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * trajectory.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Goal Progress & Completion Projection
 * 
 * Computes goal trajectory from historical snapshots.
 * Pure derivation: no storage of computed values.
 * 
 * @module trajectory
 */ /**
 * Calculate velocity (rate of change) from historical data points
 * @param {Array<{value: number, asOf: string}>} history - Chronological snapshots
 * @returns {{velocity: number, dataPoints: number, spanDays: number}}
 */ __turbopack_context__.s([
    "calculateConfidence",
    ()=>calculateConfidence,
    "calculateVelocity",
    ()=>calculateVelocity,
    "default",
    ()=>__TURBOPACK__default__export__,
    "deriveTrajectory",
    ()=>deriveTrajectory,
    "projectCompletionDate",
    ()=>projectCompletionDate
]);
function calculateVelocity(history) {
    if (!history || history.length < 2) {
        return {
            velocity: 0,
            dataPoints: history?.length || 0,
            spanDays: 0
        };
    }
    // Sort by date ascending - handle both Date objects and strings
    const sorted = [
        ...history
    ].sort((a, b)=>{
        const dateA = a.asOf instanceof Date ? a.asOf : new Date(a.asOf);
        const dateB = b.asOf instanceof Date ? b.asOf : new Date(b.asOf);
        return dateA.getTime() - dateB.getTime();
    });
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const startDate = first.asOf instanceof Date ? first.asOf : new Date(first.asOf);
    const endDate = last.asOf instanceof Date ? last.asOf : new Date(last.asOf);
    const spanDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (spanDays === 0) {
        return {
            velocity: 0,
            dataPoints: sorted.length,
            spanDays: 0
        };
    }
    const delta = last.value - first.value;
    const velocity = delta / spanDays; // units per day
    return {
        velocity,
        dataPoints: sorted.length,
        spanDays
    };
}
function projectCompletionDate(current, target, velocity, now) {
    const gap = target - current;
    // Already achieved
    if (gap <= 0) {
        return now;
    }
    // Moving away or stagnant - unreachable
    if (velocity <= 0) {
        return null;
    }
    const daysToCompletion = gap / velocity;
    const completionDate = new Date(now);
    completionDate.setDate(completionDate.getDate() + daysToCompletion);
    return completionDate;
}
function calculateConfidence({ dataPoints, spanDays, daysToDeadline, velocityVariance = 0 }) {
    let confidence = 0.5; // Base confidence
    // More data points = higher confidence (up to +0.2)
    const dataBonus = Math.min(dataPoints / 10, 1) * 0.2;
    confidence += dataBonus;
    // Longer historical span relative to projection = higher confidence (up to +0.2)
    if (daysToDeadline > 0 && spanDays > 0) {
        const coverageRatio = Math.min(spanDays / daysToDeadline, 1);
        confidence += coverageRatio * 0.2;
    }
    // Consistent velocity = higher confidence (up to +0.1)
    confidence += (1 - velocityVariance) * 0.1;
    return Math.min(Math.max(confidence, 0), 1);
}
function deriveTrajectory(goal, now = new Date()) {
    const refDate = typeof now === 'string' ? new Date(now) : now;
    // Validate required fields
    if (goal.target === undefined || goal.target === null) {
        return {
            onTrack: false,
            projectedDate: null,
            confidence: 0,
            explain: 'Missing target value'
        };
    }
    if (!goal.due) {
        return {
            onTrack: false,
            projectedDate: null,
            confidence: 0,
            explain: 'Missing due date'
        };
    }
    if (goal.current === undefined || goal.current === null) {
        return {
            onTrack: false,
            projectedDate: null,
            confidence: 0,
            explain: 'Missing current value'
        };
    }
    const dueDate = new Date(goal.due);
    const daysToDeadline = (dueDate - refDate) / (1000 * 60 * 60 * 24);
    // Already achieved?
    if (goal.current >= goal.target) {
        return {
            onTrack: true,
            projectedDate: refDate.toISOString().split('T')[0],
            confidence: 1,
            explain: `Goal achieved: ${goal.current} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€šÃ‚Â¥ ${goal.target}`
        };
    }
    // Past deadline and not achieved
    if (daysToDeadline < 0) {
        return {
            onTrack: false,
            projectedDate: null,
            confidence: 1,
            explain: `Missed: ${goal.current}/${goal.target} by ${goal.due}`
        };
    }
    // Calculate velocity from history
    const history = goal.history || [];
    const { velocity, dataPoints, spanDays } = calculateVelocity(history);
    // No velocity data - use required rate
    if (dataPoints < 2) {
        const gap = goal.target - goal.current;
        const requiredVelocity = gap / daysToDeadline;
        return {
            onTrack: null,
            projectedDate: null,
            confidence: 0.2,
            explain: `Insufficient history. Need ${requiredVelocity.toFixed(2)}/day to hit ${goal.target} by ${goal.due}`
        };
    }
    // Project completion
    const projectedDate = projectCompletionDate(goal.current, goal.target, velocity, refDate);
    // Calculate confidence
    const confidence = calculateConfidence({
        dataPoints,
        spanDays,
        daysToDeadline,
        velocityVariance: 0 // TODO: implement variance calculation
    });
    // Determine if on track
    if (projectedDate === null) {
        return {
            onTrack: false,
            projectedDate: null,
            confidence,
            explain: `Stalled or regressing at ${velocity.toFixed(2)}/day. Current: ${goal.current}, Target: ${goal.target}`
        };
    }
    const projectedDateStr = projectedDate.toISOString().split('T')[0];
    const onTrack = projectedDate <= dueDate;
    if (onTrack) {
        const daysEarly = Math.floor((dueDate - projectedDate) / (1000 * 60 * 60 * 24));
        return {
            onTrack: true,
            projectedDate: projectedDateStr,
            confidence,
            explain: `On track at ${velocity.toFixed(2)}/day. Projected ${daysEarly > 0 ? daysEarly + ' days early' : 'on deadline'}`
        };
    } else {
        const daysLate = Math.floor((projectedDate - dueDate) / (1000 * 60 * 60 * 24));
        return {
            onTrack: false,
            projectedDate: projectedDateStr,
            confidence,
            explain: `Behind at ${velocity.toFixed(2)}/day. Projected ${daysLate} days late`
        };
    }
}
const __TURBOPACK__default__export__ = {
    deriveTrajectory,
    calculateVelocity,
    projectCompletionDate,
    calculateConfidence
};
}),
"[project]/backbone-v9/ui/derive/metrics.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateProgress",
    ()=>calculateProgress,
    "daysRemaining",
    ()=>daysRemaining,
    "default",
    ()=>__TURBOPACK__default__export__,
    "deriveCompanyMetrics",
    ()=>deriveCompanyMetrics,
    "derivePortfolioMetrics",
    ()=>derivePortfolioMetrics,
    "filterByMetricKey",
    ()=>filterByMetricKey
]);
/**
 * metrics.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Metric Time Series View (Phase 3.2)
 * 
 * Builds normalized metric views from raw goal/deal data.
 * Derived output - never persisted.
 * 
 * @module metrics
 */ // =============================================================================
// METRIC EXTRACTION
// =============================================================================
/**
 * Extract metric time series from a goal
 * @param {Object} goal 
 * @param {string} companyId 
 * @returns {Object} Metric record
 */ function extractGoalMetric(goal, companyId) {
    return {
        metricId: `${companyId}:goal:${goal.id}`,
        entityRef: {
            type: 'company',
            id: companyId
        },
        metricKey: goal.type || 'custom',
        goalId: goal.id,
        name: goal.name,
        current: goal.current,
        target: goal.target,
        due: goal.due,
        status: goal.status,
        asOf: goal.asOf,
        provenance: goal.provenance || 'manual',
        history: goal.history || [] // If present, array of { date, value }
    };
}
/**
 * Extract fundraise metrics from deals
 * @param {Object[]} deals 
 * @param {string} companyId 
 * @param {Object} company 
 * @returns {Object[]} Metric records
 */ function extractDealMetrics(deals, companyId, company) {
    if (!deals || deals.length === 0) return [];
    // Aggregate deal pipeline
    const totalPipeline = deals.reduce((sum, d)=>sum + (d.amount || 0), 0);
    const weightedPipeline = deals.reduce((sum, d)=>sum + (d.amount || 0) * (d.probability || 0) / 100, 0);
    const metrics = [];
    // If company has a round target, create a fundraise metric
    if (company.roundTarget > 0) {
        // Find committed/closed deals
        const committed = deals.filter((d)=>d.status === 'termsheet' || d.status === 'closed').reduce((sum, d)=>sum + (d.amount || 0), 0);
        metrics.push({
            metricId: `${companyId}:deals:pipeline`,
            entityRef: {
                type: 'company',
                id: companyId
            },
            metricKey: 'fundraise_pipeline',
            name: 'Fundraise Pipeline',
            current: committed,
            target: company.roundTarget,
            due: null,
            status: 'active',
            asOf: company.asOf,
            provenance: 'computed',
            totalPipeline,
            weightedPipeline,
            dealCount: deals.length
        });
    }
    return metrics;
}
function deriveCompanyMetrics(company) {
    const metrics = [];
    // Extract goal metrics
    for (const goal of company.goals || []){
        metrics.push(extractGoalMetric(goal, company.id));
    }
    // Extract deal metrics
    const dealMetrics = extractDealMetrics(company.deals, company.id, company);
    metrics.push(...dealMetrics);
    return metrics;
}
function derivePortfolioMetrics(companies) {
    const byCompany = {};
    const all = [];
    for (const company of companies){
        const companyMetrics = deriveCompanyMetrics(company);
        byCompany[company.id] = companyMetrics;
        all.push(...companyMetrics);
    }
    return {
        byCompany,
        all
    };
}
function filterByMetricKey(metrics, metricKey) {
    return metrics.filter((m)=>m.metricKey === metricKey);
}
function calculateProgress(metric) {
    if (!metric.target || metric.target === 0) return 0;
    return Math.min(1, Math.max(0, metric.current / metric.target));
}
function daysRemaining(metric, now) {
    if (!metric.due) return null;
    const due = new Date(metric.due);
    const diffMs = due - now;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
const __TURBOPACK__default__export__ = {
    deriveCompanyMetrics,
    derivePortfolioMetrics,
    filterByMetricKey,
    calculateProgress,
    daysRemaining
};
}),
"[project]/backbone-v9/ui/derive/goalTrajectory.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateProbabilityOfHit",
    ()=>calculateProbabilityOfHit,
    "default",
    ()=>__TURBOPACK__default__export__,
    "deriveCompanyGoalTrajectories",
    ()=>deriveCompanyGoalTrajectories,
    "deriveGoalTrajectory",
    ()=>deriveGoalTrajectory,
    "derivePortfolioGoalTrajectories",
    ()=>derivePortfolioGoalTrajectories,
    "getAtRiskGoals",
    ()=>getAtRiskGoals
]);
/**
 * goalTrajectory.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Goal Forecast & Probability-of-Hit (Phase 3.2)
 * 
 * Extends trajectory.js with probability-based forecasting.
 * Outputs feed into pre-issues and action generation.
 * Derived output - never persisted.
 * 
 * @module goalTrajectory
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$trajectory$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/derive/trajectory.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$metrics$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/derive/metrics.js [api] (ecmascript)");
;
;
function calculateProbabilityOfHit({ progress, daysLeft, onTrack, confidence, velocity, requiredVelocity }) {
    // Already achieved
    if (progress >= 1) return 1;
    // Past due and not achieved
    if (daysLeft !== null && daysLeft < 0) return 0;
    // Base probability from progress
    let prob = progress * 0.3;
    // Trajectory component
    if (onTrack === true) {
        prob += 0.4 * confidence;
    } else if (onTrack === false) {
        // Scale down based on how far behind
        if (velocity > 0 && requiredVelocity > 0) {
            const velocityRatio = Math.min(1, velocity / requiredVelocity);
            prob += 0.2 * velocityRatio * confidence;
        }
    } else {
        // Unknown trajectory - use time-based heuristic
        if (daysLeft !== null && daysLeft > 0) {
            const timeBuffer = Math.min(1, daysLeft / 30); // More time = higher prob
            prob += 0.2 * timeBuffer;
        }
    }
    // Time pressure adjustment
    if (daysLeft !== null) {
        if (daysLeft > 60) {
            prob += 0.2; // Plenty of time
        } else if (daysLeft > 30) {
            prob += 0.15;
        } else if (daysLeft > 14) {
            prob += 0.1;
        } else if (daysLeft > 7) {
            prob += 0.05;
        }
    // Very little time - no bonus
    }
    return Math.min(1, Math.max(0, prob));
}
function deriveGoalTrajectory(goal, now) {
    // Get base trajectory
    const trajectory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$trajectory$2e$js__$5b$api$5d$__$28$ecmascript$29$__["deriveTrajectory"])(goal, now);
    // Calculate progress
    const progress = goal.target > 0 ? Math.min(1, goal.current / goal.target) : 0;
    // Days remaining
    const daysLeft = goal.due ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$metrics$2e$js__$5b$api$5d$__$28$ecmascript$29$__["daysRemaining"])({
        due: goal.due
    }, now) : null;
    // Required velocity
    const gap = goal.target - goal.current;
    const requiredVelocity = daysLeft && daysLeft > 0 ? gap / daysLeft : Infinity;
    // Current velocity
    const { velocity } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$trajectory$2e$js__$5b$api$5d$__$28$ecmascript$29$__["calculateVelocity"])(goal.history || []);
    // Probability of hit
    const probabilityOfHit = calculateProbabilityOfHit({
        progress,
        daysLeft,
        onTrack: trajectory.onTrack,
        confidence: trajectory.confidence,
        velocity,
        requiredVelocity
    });
    // Build explanation
    const explain = [
        trajectory.explain
    ];
    if (probabilityOfHit >= 0.8) {
        explain.push(`High confidence (${(probabilityOfHit * 100).toFixed(0)}%) of hitting target`);
    } else if (probabilityOfHit >= 0.5) {
        explain.push(`Moderate confidence (${(probabilityOfHit * 100).toFixed(0)}%) - may need acceleration`);
    } else if (probabilityOfHit >= 0.2) {
        explain.push(`At risk (${(probabilityOfHit * 100).toFixed(0)}%) - intervention needed`);
    } else {
        explain.push(`Unlikely to hit (${(probabilityOfHit * 100).toFixed(0)}%) without major change`);
    }
    return {
        goalId: goal.id,
        goalName: goal.name,
        goalType: goal.type,
        metricKey: goal.type || 'custom',
        // Progress
        current: goal.current,
        target: goal.target,
        progress,
        // Timing
        due: goal.due,
        daysLeft,
        // Trajectory
        onTrack: trajectory.onTrack,
        projectedDate: trajectory.projectedDate,
        velocity,
        requiredVelocity: isFinite(requiredVelocity) ? requiredVelocity : null,
        // Probability
        probabilityOfHit,
        confidence: trajectory.confidence,
        // Explanation
        explain
    };
}
function deriveCompanyGoalTrajectories(company, now) {
    const trajectories = [];
    for (const goal of company.goals || []){
        if (goal.status === 'active') {
            const traj = deriveGoalTrajectory(goal, now);
            traj.companyId = company.id;
            traj.companyName = company.name;
            trajectories.push(traj);
        }
    }
    return trajectories;
}
function derivePortfolioGoalTrajectories(companies, now) {
    const byCompany = {};
    const all = [];
    for (const company of companies){
        const trajectories = deriveCompanyGoalTrajectories(company, now);
        byCompany[company.id] = trajectories;
        all.push(...trajectories);
    }
    return {
        byCompany,
        all
    };
}
function getAtRiskGoals(trajectories, threshold = 0.5) {
    return trajectories.filter((t)=>t.probabilityOfHit < threshold).sort((a, b)=>a.probabilityOfHit - b.probabilityOfHit);
}
const __TURBOPACK__default__export__ = {
    calculateProbabilityOfHit,
    deriveGoalTrajectory,
    deriveCompanyGoalTrajectories,
    derivePortfolioGoalTrajectories,
    getAtRiskGoals
};
}),
"[project]/backbone-v9/ui/predict/issues.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ISSUE_TYPES",
    ()=>ISSUE_TYPES,
    "SEVERITY",
    ()=>SEVERITY,
    "default",
    ()=>__TURBOPACK__default__export__,
    "detectIssues",
    ()=>detectIssues,
    "detectPortfolioIssues",
    ()=>detectPortfolioIssues
]);
/**
 * issues.js - Issue Detection Engine (Phase E Compliance)
 * 
 * DOCTRINE: Issues = Gaps
 * All absence, staleness, and deviation belong to Issues, not Health.
 * 
 * E1: CANONICAL ISSUE OBJECT
 * Each Issue must include:
 * - issueId
 * - issueType  
 * - entityRef
 * - severity
 * - evidence
 * - detectedAt
 * 
 * E2: ALL ABSENCE LIVES HERE
 * Examples:
 * - NO_GOALS
 * - DATA_MISSING
 * - DATA_STALE
 * - GOAL_BEHIND
 * 
 * Pure derivation: no storage of computed values.
 * 
 * @module issues
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$runway$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/derive/runway.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$trajectory$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/derive/trajectory.js [api] (ecmascript)");
;
;
const SEVERITY = {
    CRITICAL: 3,
    HIGH: 2,
    MEDIUM: 1,
    LOW: 0 // Nice to address
};
const ISSUE_TYPES = {
    // Runway issues
    RUNWAY_CRITICAL: 'RUNWAY_CRITICAL',
    RUNWAY_WARNING: 'RUNWAY_WARNING',
    // Data issues (absence/staleness)
    DATA_MISSING: 'DATA_MISSING',
    DATA_STALE: 'DATA_STALE',
    DATA_NO_TIMESTAMP: 'DATA_NO_TIMESTAMP',
    // Goal issues (absence/deviation)
    NO_GOALS: 'NO_GOALS',
    GOAL_BEHIND: 'GOAL_BEHIND',
    GOAL_STALLED: 'GOAL_STALLED',
    GOAL_MISSED: 'GOAL_MISSED',
    GOAL_NO_HISTORY: 'GOAL_NO_HISTORY',
    // Deal/Pipeline issues
    NO_PIPELINE: 'NO_PIPELINE',
    PIPELINE_GAP: 'PIPELINE_GAP',
    DEAL_STALE: 'DEAL_STALE',
    DEAL_AT_RISK: 'DEAL_AT_RISK'
};
// =============================================================================
// THRESHOLDS
// =============================================================================
const THRESHOLDS = {
    RUNWAY_CRITICAL_MONTHS: 6,
    RUNWAY_WARNING_MONTHS: 12,
    DATA_STALE_DAYS: 14,
    DEAL_STALE_DAYS: 7,
    GOAL_DEADLINE_BUFFER_DAYS: 7
};
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}
let issueCounter = 0;
function generateIssueId(type, entityId) {
    issueCounter++;
    return `${type}-${entityId}-${issueCounter}`;
}
/**
 * E1: Create canonical issue object
 */ function createIssue({ issueType, entityRef, severity, evidence, detectedAt }) {
    return {
        issueId: generateIssueId(issueType, entityRef.id),
        issueType,
        entityRef,
        severity,
        evidence,
        detectedAt,
        // Legacy compatibility fields
        type: issueType,
        entity: entityRef,
        explain: evidence.explain
    };
}
// =============================================================================
// ISSUE DETECTION FUNCTIONS
// =============================================================================
/**
 * Detect runway issues
 */ function detectRunwayIssues(company, now) {
    const issues = [];
    const runway = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$runway$2e$js__$5b$api$5d$__$28$ecmascript$29$__["deriveRunway"])(company.cash, company.burn, company.asOf, company.asOf, now);
    if (runway.value === null) {
        issues.push(createIssue({
            issueType: ISSUE_TYPES.DATA_MISSING,
            entityRef: {
                type: 'company',
                id: company.id
            },
            severity: SEVERITY.HIGH,
            evidence: {
                field: 'runway',
                reason: 'missing_inputs',
                inputs_missing: runway.inputs_missing,
                explain: 'Cannot calculate runway: missing cash or burn data'
            },
            detectedAt: now.toISOString()
        }));
        return issues;
    }
    if (runway.value !== Infinity) {
        if (runway.value < THRESHOLDS.RUNWAY_CRITICAL_MONTHS) {
            issues.push(createIssue({
                issueType: ISSUE_TYPES.RUNWAY_CRITICAL,
                entityRef: {
                    type: 'company',
                    id: company.id
                },
                severity: SEVERITY.CRITICAL,
                evidence: {
                    value: runway.value,
                    threshold: THRESHOLDS.RUNWAY_CRITICAL_MONTHS,
                    explain: `Runway ${runway.value.toFixed(1)} months < ${THRESHOLDS.RUNWAY_CRITICAL_MONTHS} month critical threshold`
                },
                detectedAt: now.toISOString()
            }));
        } else if (runway.value < THRESHOLDS.RUNWAY_WARNING_MONTHS) {
            issues.push(createIssue({
                issueType: ISSUE_TYPES.RUNWAY_WARNING,
                entityRef: {
                    type: 'company',
                    id: company.id
                },
                severity: SEVERITY.HIGH,
                evidence: {
                    value: runway.value,
                    threshold: THRESHOLDS.RUNWAY_WARNING_MONTHS,
                    explain: `Runway ${runway.value.toFixed(1)} months < ${THRESHOLDS.RUNWAY_WARNING_MONTHS} month warning threshold`
                },
                detectedAt: now.toISOString()
            }));
        }
    }
    return issues;
}
/**
 * Detect goal issues using trajectory
 */ function detectGoalIssues(company, now) {
    const issues = [];
    const goals = company.goals || [];
    // E2: NO_GOALS is an absence issue
    if (goals.length === 0) {
        issues.push(createIssue({
            issueType: ISSUE_TYPES.NO_GOALS,
            entityRef: {
                type: 'company',
                id: company.id
            },
            severity: SEVERITY.MEDIUM,
            evidence: {
                reason: 'no_goals_defined',
                explain: 'No goals defined - cannot track progress'
            },
            detectedAt: now.toISOString()
        }));
        return issues;
    }
    for (const goal of goals){
        if (goal.status !== 'active') continue;
        const trajectory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$trajectory$2e$js__$5b$api$5d$__$28$ecmascript$29$__["deriveTrajectory"])(goal, now);
        const dueDate = new Date(goal.due);
        const daysToDeadline = daysBetween(now, dueDate);
        // Goal already missed
        if (daysToDeadline < 0 && goal.current < goal.target) {
            issues.push(createIssue({
                issueType: ISSUE_TYPES.GOAL_MISSED,
                entityRef: {
                    type: 'goal',
                    id: goal.id,
                    companyId: company.id
                },
                severity: SEVERITY.HIGH,
                evidence: {
                    goalName: goal.name || goal.type,
                    current: goal.current,
                    target: goal.target,
                    due: goal.due,
                    daysOverdue: Math.abs(daysToDeadline),
                    explain: trajectory.explain
                },
                detectedAt: now.toISOString()
            }));
            continue;
        }
        // Check trajectory status
        if (trajectory.onTrack === false) {
            if (trajectory.projectedDate === null) {
                // Stalled (zero/negative velocity)
                issues.push(createIssue({
                    issueType: ISSUE_TYPES.GOAL_STALLED,
                    entityRef: {
                        type: 'goal',
                        id: goal.id,
                        companyId: company.id
                    },
                    severity: SEVERITY.HIGH,
                    evidence: {
                        goalName: goal.name || goal.type,
                        current: goal.current,
                        target: goal.target,
                        due: goal.due,
                        explain: trajectory.explain
                    },
                    detectedAt: now.toISOString()
                }));
            } else {
                // Behind schedule
                const severity = daysToDeadline < THRESHOLDS.GOAL_DEADLINE_BUFFER_DAYS ? SEVERITY.CRITICAL : SEVERITY.HIGH;
                issues.push(createIssue({
                    issueType: ISSUE_TYPES.GOAL_BEHIND,
                    entityRef: {
                        type: 'goal',
                        id: goal.id,
                        companyId: company.id
                    },
                    severity,
                    evidence: {
                        goalName: goal.name || goal.type,
                        current: goal.current,
                        target: goal.target,
                        due: goal.due,
                        projectedDate: trajectory.projectedDate,
                        confidence: trajectory.confidence,
                        explain: trajectory.explain
                    },
                    detectedAt: now.toISOString()
                }));
            }
        }
        // Unknown trajectory (insufficient data)
        if (trajectory.onTrack === null) {
            issues.push(createIssue({
                issueType: ISSUE_TYPES.GOAL_NO_HISTORY,
                entityRef: {
                    type: 'goal',
                    id: goal.id,
                    companyId: company.id
                },
                severity: SEVERITY.LOW,
                evidence: {
                    goalName: goal.name || goal.type,
                    reason: 'insufficient_history',
                    explain: trajectory.explain
                },
                detectedAt: now.toISOString()
            }));
        }
    }
    return issues;
}
/**
 * Detect deal pipeline issues
 */ function detectDealIssues(company, now) {
    const issues = [];
    const deals = company.deals || [];
    // Check if raising but no/insufficient pipeline
    if (company.raising && company.roundTarget > 0) {
        const totalPipeline = deals.reduce((sum, d)=>sum + (d.amount || 0), 0);
        const weightedPipeline = deals.reduce((sum, d)=>sum + (d.amount || 0) * (d.probability || 0) / 100, 0);
        if (deals.length === 0) {
            issues.push(createIssue({
                issueType: ISSUE_TYPES.NO_PIPELINE,
                entityRef: {
                    type: 'company',
                    id: company.id
                },
                severity: SEVERITY.CRITICAL,
                evidence: {
                    roundTarget: company.roundTarget,
                    reason: 'no_deals',
                    explain: `Raising $${(company.roundTarget / 1000000).toFixed(1)}M but no deals in pipeline`
                },
                detectedAt: now.toISOString()
            }));
        } else if (weightedPipeline < company.roundTarget * 0.5) {
            issues.push(createIssue({
                issueType: ISSUE_TYPES.PIPELINE_GAP,
                entityRef: {
                    type: 'company',
                    id: company.id
                },
                severity: SEVERITY.HIGH,
                evidence: {
                    roundTarget: company.roundTarget,
                    weightedPipeline,
                    coverage: weightedPipeline / company.roundTarget,
                    explain: `Weighted pipeline $${(weightedPipeline / 1000000).toFixed(1)}M < 50% of $${(company.roundTarget / 1000000).toFixed(1)}M target`
                },
                detectedAt: now.toISOString()
            }));
        }
    }
    // Check individual deal health
    for (const deal of deals){
        const daysSinceUpdate = daysBetween(deal.asOf, now);
        // Stale deal
        if (daysSinceUpdate > THRESHOLDS.DEAL_STALE_DAYS) {
            issues.push(createIssue({
                issueType: ISSUE_TYPES.DEAL_STALE,
                entityRef: {
                    type: 'deal',
                    id: deal.id,
                    companyId: company.id
                },
                severity: SEVERITY.MEDIUM,
                evidence: {
                    investor: deal.investor,
                    daysSinceUpdate,
                    threshold: THRESHOLDS.DEAL_STALE_DAYS,
                    explain: `Deal with ${deal.investor} not updated in ${daysSinceUpdate} days`
                },
                detectedAt: now.toISOString()
            }));
        }
        // Low probability deals in late stages
        if (deal.status === 'dd' && deal.probability < 50) {
            issues.push(createIssue({
                issueType: ISSUE_TYPES.DEAL_AT_RISK,
                entityRef: {
                    type: 'deal',
                    id: deal.id,
                    companyId: company.id
                },
                severity: SEVERITY.MEDIUM,
                evidence: {
                    investor: deal.investor,
                    status: deal.status,
                    probability: deal.probability,
                    explain: `Deal with ${deal.investor} in DD but only ${deal.probability}% probability`
                },
                detectedAt: now.toISOString()
            }));
        }
    }
    return issues;
}
/**
 * Detect data staleness issues
 */ function detectDataIssues(company, now) {
    const issues = [];
    if (!company.asOf) {
        issues.push(createIssue({
            issueType: ISSUE_TYPES.DATA_NO_TIMESTAMP,
            entityRef: {
                type: 'company',
                id: company.id
            },
            severity: SEVERITY.HIGH,
            evidence: {
                reason: 'no_timestamp',
                explain: 'Company data has no timestamp - freshness unknown'
            },
            detectedAt: now.toISOString()
        }));
        return issues;
    }
    const daysSinceUpdate = daysBetween(company.asOf, now);
    if (daysSinceUpdate > THRESHOLDS.DATA_STALE_DAYS) {
        issues.push(createIssue({
            issueType: ISSUE_TYPES.DATA_STALE,
            entityRef: {
                type: 'company',
                id: company.id
            },
            severity: SEVERITY.MEDIUM,
            evidence: {
                daysSinceUpdate,
                threshold: THRESHOLDS.DATA_STALE_DAYS,
                explain: `Company data ${daysSinceUpdate} days old (threshold: ${THRESHOLDS.DATA_STALE_DAYS})`
            },
            detectedAt: now.toISOString()
        }));
    }
    return issues;
}
function detectIssues(company, now = new Date()) {
    const refDate = typeof now === 'string' ? new Date(now) : now;
    // Reset issue counter for deterministic IDs within a run
    issueCounter = 0;
    const allIssues = [
        ...detectRunwayIssues(company, refDate),
        ...detectGoalIssues(company, refDate),
        ...detectDealIssues(company, refDate),
        ...detectDataIssues(company, refDate)
    ];
    // Sort by severity (highest first)
    allIssues.sort((a, b)=>b.severity - a.severity);
    // Generate summary
    const summary = {
        total: allIssues.length,
        critical: allIssues.filter((i)=>i.severity === SEVERITY.CRITICAL).length,
        high: allIssues.filter((i)=>i.severity === SEVERITY.HIGH).length,
        medium: allIssues.filter((i)=>i.severity === SEVERITY.MEDIUM).length,
        low: allIssues.filter((i)=>i.severity === SEVERITY.LOW).length,
        types: [
            ...new Set(allIssues.map((i)=>i.issueType))
        ]
    };
    return {
        issues: allIssues,
        summary
    };
}
function detectPortfolioIssues(companies, now = new Date()) {
    const refDate = typeof now === 'string' ? new Date(now) : now;
    const byCompany = {};
    let allIssues = [];
    for (const company of companies){
        const result = detectIssues(company, refDate);
        byCompany[company.id] = result;
        allIssues = allIssues.concat(result.issues);
    }
    // Sort all issues by severity
    allIssues.sort((a, b)=>b.severity - a.severity);
    const portfolio = {
        total: allIssues.length,
        critical: allIssues.filter((i)=>i.severity === SEVERITY.CRITICAL).length,
        high: allIssues.filter((i)=>i.severity === SEVERITY.HIGH).length,
        medium: allIssues.filter((i)=>i.severity === SEVERITY.MEDIUM).length,
        low: allIssues.filter((i)=>i.severity === SEVERITY.LOW).length,
        topIssues: allIssues.slice(0, 10)
    };
    return {
        byCompany,
        portfolio
    };
}
const __TURBOPACK__default__export__ = {
    detectIssues,
    detectPortfolioIssues,
    SEVERITY,
    ISSUE_TYPES
};
}),
"[project]/backbone-v9/ui/predict/ripple.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "adjustPriorityForRipple",
    ()=>adjustPriorityForRipple,
    "calculateAggregateRipple",
    ()=>calculateAggregateRipple,
    "calculateCompanyRipple",
    ()=>calculateCompanyRipple,
    "calculateIssueRipple",
    ()=>calculateIssueRipple,
    "default",
    ()=>__TURBOPACK__default__export__
]);
/**
 * ripple.js - Ripple Effect Engine (Phase H)
 * 
 * DOCTRINE: Predictive > Reactive (Scaffolded)
 * Ripple and likelihood may be primitive, but the architecture must allow them.
 * 
 * H1: v0 Rule-Based Ripple
 * - Runway issues -> insolvency risk
 * - Pipeline issues -> fundraise risk  
 * - Data staleness -> confidence penalty
 * 
 * Output:
 * - rippleScore (0-1)
 * - rippleExplain[]
 * 
 * H2: Priority Incorporates Ripple
 * - Ripple affects rank explicitly
 * 
 * @module ripple
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/issues.js [api] (ecmascript)");
;
// =============================================================================
// RIPPLE RULES (v0)
// =============================================================================
/**
 * Rule-based ripple effects
 * Each rule: condition -> downstream consequence
 */ const RIPPLE_RULES = {
    // Runway issues cascade to insolvency
    RUNWAY_CRITICAL: {
        rippleScore: 0.9,
        consequences: [
            'High probability of insolvency within 6 months',
            'Unable to make new hires or investments',
            'Fundraise becomes distressed/down round',
            'Team morale and retention at risk'
        ]
    },
    RUNWAY_WARNING: {
        rippleScore: 0.5,
        consequences: [
            'Fundraise pressure increases',
            'Strategic optionality reduced',
            'May need to cut non-critical expenses'
        ]
    },
    // Pipeline issues cascade to fundraise failure
    NO_PIPELINE: {
        rippleScore: 0.8,
        consequences: [
            'Fundraise timeline at severe risk',
            'May need to extend runway via cuts',
            'Negotiating leverage diminished'
        ]
    },
    PIPELINE_GAP: {
        rippleScore: 0.5,
        consequences: [
            'Fundraise may miss target or timeline',
            'May need to accept less favorable terms'
        ]
    },
    // Goal issues cascade to metrics/narrative
    GOAL_MISSED: {
        rippleScore: 0.4,
        consequences: [
            'Investor confidence may decrease',
            'Narrative for fundraise weakened'
        ]
    },
    GOAL_BEHIND: {
        rippleScore: 0.3,
        consequences: [
            'May miss key milestones',
            'Investor updates less compelling'
        ]
    },
    GOAL_STALLED: {
        rippleScore: 0.5,
        consequences: [
            'Underlying blocker may be systemic',
            'Team execution capability questioned'
        ]
    },
    // Deal issues cascade to specific opportunities
    DEAL_STALE: {
        rippleScore: 0.3,
        consequences: [
            'Investor interest may have cooled',
            'Momentum lost in process'
        ]
    },
    DEAL_AT_RISK: {
        rippleScore: 0.4,
        consequences: [
            'May lose this investor entirely',
            'Need to rebuild pipeline'
        ]
    },
    // Data issues cascade to decision quality
    DATA_STALE: {
        rippleScore: 0.2,
        consequences: [
            'Decisions based on outdated information',
            'May miss emerging problems'
        ]
    },
    DATA_MISSING: {
        rippleScore: 0.3,
        consequences: [
            'Cannot assess true state',
            'Blind spots in portfolio view'
        ]
    },
    // Default for unmapped issues
    DEFAULT: {
        rippleScore: 0.1,
        consequences: [
            'Minor downstream effects possible'
        ]
    }
};
function calculateIssueRipple(issue) {
    const rule = RIPPLE_RULES[issue.issueType] || RIPPLE_RULES.DEFAULT;
    return {
        rippleScore: rule.rippleScore,
        rippleExplain: rule.consequences
    };
}
function calculateAggregateRipple(issues) {
    if (!issues || issues.length === 0) {
        return {
            rippleScore: 0,
            rippleExplain: [
                'No issues detected'
            ],
            byIssue: []
        };
    }
    const byIssue = issues.map((issue)=>({
            issueId: issue.issueId,
            issueType: issue.issueType,
            ...calculateIssueRipple(issue)
        }));
    // Sort by ripple score descending
    byIssue.sort((a, b)=>b.rippleScore - a.rippleScore);
    // Aggregate: max + diminishing contribution from others
    let aggregateScore = 0;
    const allExplanations = [];
    for(let i = 0; i < byIssue.length; i++){
        const issue = byIssue[i];
        // First issue contributes full score, subsequent issues contribute less
        const contribution = issue.rippleScore * Math.pow(0.5, i);
        aggregateScore += contribution;
        // Only include explanations from significant ripples
        if (issue.rippleScore >= 0.3) {
            allExplanations.push(...issue.rippleExplain);
        }
    }
    // Cap at 1.0
    aggregateScore = Math.min(aggregateScore, 1.0);
    aggregateScore = Math.round(aggregateScore * 100) / 100;
    return {
        rippleScore: aggregateScore,
        rippleExplain: [
            ...new Set(allExplanations)
        ],
        byIssue
    };
}
function calculateCompanyRipple(company, issues) {
    const ripple = calculateAggregateRipple(issues);
    // Determine risk level
    let riskLevel;
    if (ripple.rippleScore >= 0.7) {
        riskLevel = 'HIGH';
    } else if (ripple.rippleScore >= 0.4) {
        riskLevel = 'MEDIUM';
    } else {
        riskLevel = 'LOW';
    }
    return {
        companyId: company.id,
        companyName: company.name,
        rippleScore: ripple.rippleScore,
        rippleExplain: ripple.rippleExplain,
        riskLevel,
        byIssue: ripple.byIssue
    };
}
function adjustPriorityForRipple(basePriority, rippleScore, weight = 0.2) {
    // Ripple boosts priority of high-ripple issues
    const adjustment = rippleScore * weight;
    const adjusted = basePriority * (1 + adjustment);
    return Math.round(adjusted * 100) / 100;
}
const __TURBOPACK__default__export__ = {
    calculateIssueRipple,
    calculateAggregateRipple,
    calculateCompanyRipple,
    adjustPriorityForRipple,
    RIPPLE_RULES
};
}),
"[project]/backbone-v9/ui/predict/preissues.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PREISSUE_TYPES",
    ()=>PREISSUE_TYPES,
    "default",
    ()=>__TURBOPACK__default__export__,
    "deriveCompanyPreIssues",
    ()=>deriveCompanyPreIssues,
    "derivePortfolioPreIssues",
    ()=>derivePortfolioPreIssues,
    "getImminentPreIssues",
    ()=>getImminentPreIssues,
    "rankPreIssuesByCostOfDelay",
    ()=>rankPreIssuesByCostOfDelay,
    "validatePreIssue",
    ()=>validatePreIssue
]);
/**
 * preissues.js - Forecasted Issues (Phase 4.0 PF2)
 * 
 * Pre-issues are issues that will likely emerge if no action is taken.
 * They generate preventative actions.
 * 
 * PF2 Additions:
 * - Escalation window (T + delta): when pre-issue becomes real issue
 * - Cost-of-delay curve: how cost increases over time
 * - Imminent pre-issues convert to Actions
 * 
 * NO ALERTS, NO SEVERITY COLORS - just data for ranking.
 * Derived output - never persisted.
 * 
 * @module preissues
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$runway$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/derive/runway.js [api] (ecmascript)");
;
const PREISSUE_TYPES = {
    RUNWAY_BREACH: 'RUNWAY_BREACH',
    GOAL_MISS: 'GOAL_MISS',
    DEAL_STALL: 'DEAL_STALL',
    BURN_ACCELERATION: 'BURN_ACCELERATION',
    TEAM_CAPACITY: 'TEAM_CAPACITY'
};
// =============================================================================
// PF2: ESCALATION WINDOW COMPUTATION
// =============================================================================
/**
 * Compute escalation window: when pre-issue becomes real issue
 * Returns { escalationDate, daysUntilEscalation, isImminent }
 * 
 * @param {Object} preissue
 * @param {Date} now
 * @returns {Object}
 */ function computeEscalationWindow(preissue, now) {
    const timeToBreachDays = preissue.timeToBreachDays || 30;
    // Escalation happens when:
    // - For runway: when we hit critical threshold (not just breach)
    // - For goals: when we can no longer catch up mathematically
    // - For deals: when momentum is lost
    // Delta = buffer before breach where intervention is still effective
    let deltaDays;
    switch(preissue.preIssueType){
        case PREISSUE_TYPES.RUNWAY_BREACH:
            // Need 3-6 months to raise, so escalate early
            deltaDays = Math.max(0, timeToBreachDays - 90);
            break;
        case PREISSUE_TYPES.GOAL_MISS:
            // Need time to course correct
            deltaDays = Math.max(0, timeToBreachDays - 14);
            break;
        case PREISSUE_TYPES.DEAL_STALL:
            // Deals go cold fast
            deltaDays = Math.max(0, timeToBreachDays - 7);
            break;
        default:
            deltaDays = Math.max(0, timeToBreachDays - 14);
    }
    const escalationDate = new Date(now.getTime() + deltaDays * 24 * 60 * 60 * 1000);
    const daysUntilEscalation = deltaDays;
    // Imminent = escalation within 7 days
    const isImminent = daysUntilEscalation <= 7;
    return {
        escalationDate: escalationDate.toISOString(),
        daysUntilEscalation,
        isImminent,
        breachDate: new Date(now.getTime() + timeToBreachDays * 24 * 60 * 60 * 1000).toISOString()
    };
}
// =============================================================================
// PF2: COST-OF-DELAY CURVE
// =============================================================================
/**
 * Compute cost-of-delay curve
 * Returns multiplier showing how cost increases if action is delayed
 * 
 * Formula: cost increases non-linearly as we approach escalation
 * - At T-30 days: 1.0x (baseline)
 * - At T-14 days: 1.5x
 * - At T-7 days: 2.5x
 * - At T-0 (escalation): 5.0x
 * - Post-escalation: 10x+ (damage done)
 * 
 * @param {number} daysUntilEscalation
 * @param {string} preIssueType
 * @returns {{ costMultiplier: number, costCurve: Object, explain: string }}
 */ function computeCostOfDelay(daysUntilEscalation, preIssueType) {
    // Cost curve: exponential as we approach escalation
    let costMultiplier;
    let explain;
    if (daysUntilEscalation > 30) {
        costMultiplier = 1.0;
        explain = 'Baseline cost - ample time to act';
    } else if (daysUntilEscalation > 14) {
        costMultiplier = 1.0 + (30 - daysUntilEscalation) / 32; // 1.0 to 1.5
        explain = 'Cost rising - action window narrowing';
    } else if (daysUntilEscalation > 7) {
        costMultiplier = 1.5 + (14 - daysUntilEscalation) / 7; // 1.5 to 2.5
        explain = 'Elevated cost - limited options remaining';
    } else if (daysUntilEscalation > 0) {
        costMultiplier = 2.5 + (7 - daysUntilEscalation) / 2.8; // 2.5 to 5.0
        explain = 'High cost - urgent action required';
    } else {
        costMultiplier = 5.0 + Math.abs(daysUntilEscalation) / 2; // 5.0+
        explain = 'Critical cost - damage accumulating';
    }
    // Adjust by type - some pre-issues have steeper cost curves
    const typeMultiplier = {
        [PREISSUE_TYPES.RUNWAY_BREACH]: 1.5,
        [PREISSUE_TYPES.GOAL_MISS]: 1.0,
        [PREISSUE_TYPES.DEAL_STALL]: 1.2,
        [PREISSUE_TYPES.BURN_ACCELERATION]: 1.3,
        [PREISSUE_TYPES.TEAM_CAPACITY]: 0.9
    };
    costMultiplier *= typeMultiplier[preIssueType] || 1.0;
    // Build curve data points for visualization (not for alerts!)
    const costCurve = {
        today: costMultiplier,
        in7Days: computeCostAtDays(daysUntilEscalation - 7, preIssueType),
        in14Days: computeCostAtDays(daysUntilEscalation - 14, preIssueType),
        atEscalation: computeCostAtDays(0, preIssueType)
    };
    return {
        costMultiplier: Math.round(costMultiplier * 100) / 100,
        costCurve,
        explain
    };
}
/**
 * Helper to compute cost at specific days-until-escalation
 */ function computeCostAtDays(days, preIssueType) {
    let cost;
    if (days > 30) cost = 1.0;
    else if (days > 14) cost = 1.0 + (30 - days) / 32;
    else if (days > 7) cost = 1.5 + (14 - days) / 7;
    else if (days > 0) cost = 2.5 + (7 - days) / 2.8;
    else cost = 5.0 + Math.abs(days) / 2;
    const typeMultiplier = {
        [PREISSUE_TYPES.RUNWAY_BREACH]: 1.5,
        [PREISSUE_TYPES.GOAL_MISS]: 1.0,
        [PREISSUE_TYPES.DEAL_STALL]: 1.2,
        [PREISSUE_TYPES.BURN_ACCELERATION]: 1.3,
        [PREISSUE_TYPES.TEAM_CAPACITY]: 0.9
    };
    return Math.round(cost * (typeMultiplier[preIssueType] || 1.0) * 100) / 100;
}
// =============================================================================
// PRE-ISSUE DETECTION
// =============================================================================
/**
 * Detect runway breach pre-issue
 */ function detectRunwayBreachPreIssue(company, runwayData, now) {
    if (!runwayData || runwayData.months === null || runwayData.months === undefined) return null;
    const criticalThreshold = 6;
    const warningThreshold = 9;
    if (runwayData.months >= warningThreshold) return null;
    const daysToBreachEstimate = runwayData.months * 30;
    const likelihood = runwayData.months < criticalThreshold ? 0.8 : 0.5;
    const runwayMonthsStr = typeof runwayData.months === 'number' ? runwayData.months.toFixed(1) : 'unknown';
    const preissue = {
        preIssueId: `preissue-runway-${company.id}`,
        preIssueType: PREISSUE_TYPES.RUNWAY_BREACH,
        entityRef: {
            type: 'company',
            id: company.id
        },
        companyId: company.id,
        companyName: company.name,
        title: `Runway will breach ${criticalThreshold}mo threshold`,
        description: `Current runway: ${runwayMonthsStr} months. Without fundraise or burn reduction, will hit critical level.`,
        likelihood,
        timeToBreachDays: daysToBreachEstimate,
        severity: runwayData.months < criticalThreshold ? 'high' : 'medium',
        explain: [
            `Runway: ${runwayMonthsStr} months`,
            `Burn: $${(company.burn / 1000).toFixed(0)}K/mo`,
            likelihood > 0.7 ? 'High likelihood without intervention' : 'Moderate likelihood'
        ],
        preventativeActions: [
            'REDUCE_BURN',
            'ACCELERATE_FUNDRAISE',
            'BRIDGE_ROUND'
        ]
    };
    // PF2: Add escalation window and cost-of-delay
    const escalation = computeEscalationWindow(preissue, now);
    const costOfDelay = computeCostOfDelay(escalation.daysUntilEscalation, preissue.preIssueType);
    return {
        ...preissue,
        escalation,
        costOfDelay
    };
}
/**
 * Detect goal miss pre-issue from trajectory
 */ function detectGoalMissPreIssue(trajectory, company, now) {
    if (trajectory.probabilityOfHit >= 0.6 || trajectory.probabilityOfHit === 0) return null;
    if (trajectory.onTrack === true) return null;
    if (trajectory.daysLeft === null || trajectory.daysLeft < 0) return null;
    const preissue = {
        preIssueId: `preissue-goal-${company.id}-${trajectory.goalId}`,
        preIssueType: PREISSUE_TYPES.GOAL_MISS,
        entityRef: {
            type: 'company',
            id: company.id
        },
        companyId: company.id,
        companyName: company.name,
        goalId: trajectory.goalId,
        goalName: trajectory.goalName,
        goalType: trajectory.goalType,
        title: `Goal "${trajectory.goalName}" likely to miss target`,
        description: `${(trajectory.probabilityOfHit * 100).toFixed(0)}% probability of hitting ${trajectory.target} by ${trajectory.due}. Currently at ${trajectory.current}.`,
        likelihood: 1 - trajectory.probabilityOfHit,
        timeToBreachDays: trajectory.daysLeft,
        severity: trajectory.probabilityOfHit < 0.3 ? 'high' : 'medium',
        explain: trajectory.explain,
        preventativeActions: [
            'ACCELERATE_GOAL',
            'REVISE_TARGET',
            'ADD_RESOURCES'
        ]
    };
    // PF2: Add escalation window and cost-of-delay
    const escalation = computeEscalationWindow(preissue, now);
    const costOfDelay = computeCostOfDelay(escalation.daysUntilEscalation, preissue.preIssueType);
    return {
        ...preissue,
        escalation,
        costOfDelay
    };
}
/**
 * Detect deal stall pre-issue
 */ function detectDealStallPreIssues(company, now) {
    const preissues = [];
    for (const deal of company.deals || []){
        if (!deal.asOf) continue;
        const lastUpdate = new Date(deal.asOf);
        const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 14 && deal.status !== 'closed') {
            const likelihood = Math.min(0.9, 0.3 + (daysSinceUpdate - 14) / 30);
            const preissue = {
                preIssueId: `preissue-deal-${company.id}-${deal.id}`,
                preIssueType: PREISSUE_TYPES.DEAL_STALL,
                entityRef: {
                    type: 'deal',
                    id: deal.id
                },
                companyId: company.id,
                companyName: company.name,
                dealId: deal.id,
                investor: deal.investor,
                title: `Deal with ${deal.investor} may be stalling`,
                description: `No update in ${Math.floor(daysSinceUpdate)} days. Status: ${deal.status}. Amount: $${(deal.amount / 1000000).toFixed(1)}M`,
                likelihood,
                timeToBreachDays: 14,
                severity: deal.amount > 2000000 ? 'high' : 'medium',
                explain: [
                    `${Math.floor(daysSinceUpdate)} days since last update`,
                    `Current status: ${deal.status}`,
                    `Deal value: $${(deal.amount / 1000000).toFixed(1)}M`
                ],
                preventativeActions: [
                    'FOLLOW_UP_INVESTOR',
                    'SCHEDULE_CHECK_IN',
                    'PREPARE_ALTERNATIVES'
                ]
            };
            // PF2: Add escalation window and cost-of-delay
            const escalation = computeEscalationWindow(preissue, now);
            const costOfDelay = computeCostOfDelay(escalation.daysUntilEscalation, preissue.preIssueType);
            preissues.push({
                ...preissue,
                escalation,
                costOfDelay
            });
        }
    }
    return preissues;
}
function deriveCompanyPreIssues(company, goalTrajectories, runwayData, now) {
    const preissues = [];
    const runwayPreIssue = detectRunwayBreachPreIssue(company, runwayData, now);
    if (runwayPreIssue) preissues.push(runwayPreIssue);
    for (const traj of goalTrajectories){
        const goalPreIssue = detectGoalMissPreIssue(traj, company, now);
        if (goalPreIssue) preissues.push(goalPreIssue);
    }
    const dealPreIssues = detectDealStallPreIssues(company, now);
    preissues.push(...dealPreIssues);
    return preissues;
}
function derivePortfolioPreIssues(companies, goalTrajectoriesByCompany, runwayByCompany, now) {
    const byCompany = {};
    const all = [];
    for (const company of companies){
        const trajectories = goalTrajectoriesByCompany[company.id] || [];
        const runway = runwayByCompany[company.id] || null;
        const companyPreIssues = deriveCompanyPreIssues(company, trajectories, runway, now);
        byCompany[company.id] = companyPreIssues;
        all.push(...companyPreIssues);
    }
    return {
        byCompany,
        all
    };
}
function getImminentPreIssues(preissues) {
    return preissues.filter((p)=>p.escalation?.isImminent === true);
}
function rankPreIssuesByCostOfDelay(preissues) {
    return [
        ...preissues
    ].sort((a, b)=>{
        const costA = a.costOfDelay?.costMultiplier || 1;
        const costB = b.costOfDelay?.costMultiplier || 1;
        return costB - costA;
    });
}
function validatePreIssue(preissue) {
    const errors = [];
    if (!preissue.preIssueId) errors.push('Missing preIssueId');
    if (!preissue.preIssueType) errors.push('Missing preIssueType');
    if (!preissue.entityRef) errors.push('Missing entityRef');
    if (typeof preissue.likelihood !== 'number') errors.push('likelihood must be number');
    if (preissue.likelihood < 0 || preissue.likelihood > 1) errors.push('likelihood must be 0-1');
    if (typeof preissue.timeToBreachDays !== 'number') errors.push('timeToBreachDays must be number');
    if (!Array.isArray(preissue.explain)) errors.push('explain must be array');
    // PF2 validations
    if (!preissue.escalation) errors.push('Missing escalation window');
    if (!preissue.costOfDelay) errors.push('Missing costOfDelay');
    return {
        valid: errors.length === 0,
        errors
    };
}
const __TURBOPACK__default__export__ = {
    PREISSUE_TYPES,
    deriveCompanyPreIssues,
    derivePortfolioPreIssues,
    validatePreIssue,
    getImminentPreIssues,
    rankPreIssuesByCostOfDelay,
    computeEscalationWindow,
    computeCostOfDelay
};
}),
"[project]/backbone-v9/ui/predict/resolutions.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RESOLUTIONS",
    ()=>RESOLUTIONS,
    "default",
    ()=>__TURBOPACK__default__export__,
    "getAllResolutions",
    ()=>getAllResolutions,
    "getResolution",
    ()=>getResolution,
    "getResolutionById",
    ()=>getResolutionById,
    "hasResolution",
    ()=>hasResolution
]);
/**
 * resolutions.js - Resolution Library (Phase F)
 * 
 * F1: Map issue types to resolution templates.
 * F2: No free text - Priorities must reference resolutionId.
 * 
 * Each resolution defines:
 * - resolutionId
 * - title
 * - defaultEffort (days)
 * - defaultImpact (0-1)
 * - actionSteps[]
 * 
 * @module resolutions
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/issues.js [api] (ecmascript)");
;
const RESOLUTIONS = {
    // =========================================================================
    // RUNWAY RESOLUTIONS
    // =========================================================================
    RESOLVE_RUNWAY_CRITICAL: {
        resolutionId: 'RESOLVE_RUNWAY_CRITICAL',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].RUNWAY_CRITICAL,
        title: 'Emergency runway extension',
        defaultEffort: 30,
        defaultImpact: 1.0,
        actionSteps: [
            'Assess immediate cost reduction options',
            'Identify bridge funding sources',
            'Initiate emergency fundraise conversations',
            'Prepare 30-60-90 day cash plan'
        ]
    },
    RESOLVE_RUNWAY_WARNING: {
        resolutionId: 'RESOLVE_RUNWAY_WARNING',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].RUNWAY_WARNING,
        title: 'Plan runway extension',
        defaultEffort: 14,
        defaultImpact: 0.7,
        actionSteps: [
            'Review burn rate optimization opportunities',
            'Start fundraise planning if not already',
            'Evaluate revenue acceleration options',
            'Build 6-month financial projection'
        ]
    },
    // =========================================================================
    // DATA RESOLUTIONS
    // =========================================================================
    RESOLVE_DATA_MISSING: {
        resolutionId: 'RESOLVE_DATA_MISSING',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].DATA_MISSING,
        title: 'Gather missing data',
        defaultEffort: 1,
        defaultImpact: 0.4,
        actionSteps: [
            'Identify missing data fields',
            'Request data from company',
            'Update system with new data',
            'Verify data completeness'
        ]
    },
    RESOLVE_DATA_STALE: {
        resolutionId: 'RESOLVE_DATA_STALE',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].DATA_STALE,
        title: 'Request data update',
        defaultEffort: 0.5,
        defaultImpact: 0.3,
        actionSteps: [
            'Request updated metrics from company',
            'Update system timestamps',
            'Flag any significant changes'
        ]
    },
    RESOLVE_DATA_NO_TIMESTAMP: {
        resolutionId: 'RESOLVE_DATA_NO_TIMESTAMP',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].DATA_NO_TIMESTAMP,
        title: 'Add data timestamps',
        defaultEffort: 0.25,
        defaultImpact: 0.3,
        actionSteps: [
            'Add asOf timestamp to data',
            'Record provenance information'
        ]
    },
    // =========================================================================
    // GOAL RESOLUTIONS
    // =========================================================================
    RESOLVE_NO_GOALS: {
        resolutionId: 'RESOLVE_NO_GOALS',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].NO_GOALS,
        title: 'Define measurable goals',
        defaultEffort: 2,
        defaultImpact: 0.5,
        actionSteps: [
            'Schedule goal-setting session with founders',
            'Define 2-3 key metrics with targets',
            'Set deadlines for each goal',
            'Enter goals into system'
        ]
    },
    RESOLVE_GOAL_BEHIND: {
        resolutionId: 'RESOLVE_GOAL_BEHIND',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].GOAL_BEHIND,
        title: 'Course correct goal trajectory',
        defaultEffort: 3,
        defaultImpact: 0.6,
        actionSteps: [
            'Analyze root cause of delay',
            'Identify acceleration opportunities',
            'Consider target or deadline adjustment',
            'Implement corrective actions'
        ]
    },
    RESOLVE_GOAL_STALLED: {
        resolutionId: 'RESOLVE_GOAL_STALLED',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].GOAL_STALLED,
        title: 'Diagnose and restart stalled goal',
        defaultEffort: 2,
        defaultImpact: 0.7,
        actionSteps: [
            'Identify blockers causing stall',
            'Reallocate resources if needed',
            'Consider goal relevance',
            'Establish new momentum'
        ]
    },
    RESOLVE_GOAL_MISSED: {
        resolutionId: 'RESOLVE_GOAL_MISSED',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].GOAL_MISSED,
        title: 'Post-mortem and reset goal',
        defaultEffort: 1,
        defaultImpact: 0.5,
        actionSteps: [
            'Conduct goal post-mortem',
            'Document lessons learned',
            'Decide: abandon, extend, or redefine',
            'Update goal status in system'
        ]
    },
    RESOLVE_GOAL_NO_HISTORY: {
        resolutionId: 'RESOLVE_GOAL_NO_HISTORY',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].GOAL_NO_HISTORY,
        title: 'Add historical data points',
        defaultEffort: 0.5,
        defaultImpact: 0.2,
        actionSteps: [
            'Request historical progress data',
            'Add past data points to goal history',
            'Verify trajectory calculation works'
        ]
    },
    // =========================================================================
    // PIPELINE RESOLUTIONS
    // =========================================================================
    RESOLVE_NO_PIPELINE: {
        resolutionId: 'RESOLVE_NO_PIPELINE',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].NO_PIPELINE,
        title: 'Begin investor outreach',
        defaultEffort: 7,
        defaultImpact: 0.9,
        actionSteps: [
            'Build target investor list',
            'Prepare outreach materials',
            'Start initial outreach',
            'Track responses and schedule meetings'
        ]
    },
    RESOLVE_PIPELINE_GAP: {
        resolutionId: 'RESOLVE_PIPELINE_GAP',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].PIPELINE_GAP,
        title: 'Expand investor pipeline',
        defaultEffort: 5,
        defaultImpact: 0.7,
        actionSteps: [
            'Identify additional target investors',
            'Request warm introductions',
            'Increase outreach velocity',
            'Review and optimize materials'
        ]
    },
    RESOLVE_DEAL_STALE: {
        resolutionId: 'RESOLVE_DEAL_STALE',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].DEAL_STALE,
        title: 'Follow up with investor',
        defaultEffort: 0.5,
        defaultImpact: 0.5,
        actionSteps: [
            'Send follow-up email or message',
            'Provide any requested updates',
            'Confirm next steps',
            'Update deal status'
        ]
    },
    RESOLVE_DEAL_AT_RISK: {
        resolutionId: 'RESOLVE_DEAL_AT_RISK',
        issueType: __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["ISSUE_TYPES"].DEAL_AT_RISK,
        title: 'Address investor concerns',
        defaultEffort: 2,
        defaultImpact: 0.6,
        actionSteps: [
            'Schedule call with investor',
            'Identify specific concerns',
            'Prepare responses to objections',
            'Provide additional materials if needed'
        ]
    }
};
function getResolution(issueType) {
    for (const resolution of Object.values(RESOLUTIONS)){
        if (resolution.issueType === issueType) {
            return resolution;
        }
    }
    return null;
}
function getResolutionById(resolutionId) {
    return RESOLUTIONS[resolutionId] || null;
}
function getAllResolutions() {
    return Object.values(RESOLUTIONS);
}
function hasResolution(issueType) {
    return getResolution(issueType) !== null;
}
const __TURBOPACK__default__export__ = {
    RESOLUTIONS,
    getResolution,
    getResolutionById,
    getAllResolutions,
    hasResolution
};
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/backbone-v9/ui/predict/actionSchema.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ENTITY_TYPES",
    ()=>ENTITY_TYPES,
    "IMPACT_BOUNDS",
    ()=>IMPACT_BOUNDS,
    "SOURCE_TYPES",
    ()=>SOURCE_TYPES,
    "computeExpectedNetImpact",
    ()=>computeExpectedNetImpact,
    "createAction",
    ()=>createAction,
    "default",
    ()=>__TURBOPACK__default__export__,
    "generateActionId",
    ()=>generateActionId,
    "timePenalty",
    ()=>timePenalty,
    "validateAction",
    ()=>validateAction,
    "validateActionSource",
    ()=>validateActionSource,
    "validateEntityRef",
    ()=>validateEntityRef,
    "validateImpactModel",
    ()=>validateImpactModel
]);
/**
 * actionSchema.js - Canonical Action Schema (Phase 4.0)
 * 
 * LOCKED SCHEMA: No changes without version bump.
 * 
 * Actions are the primary decisioning artifact.
 * Every Action must carry a complete, explainable impact model.
 * 
 * Phase 4.0 (PF1): Added executionProbability to impact model
 * Combined probability = executionProbability * probabilityOfSuccess
 * 
 * @module actionSchema
 */ var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
const ENTITY_TYPES = [
    'company',
    'deal',
    'person',
    'portfolio',
    'other'
];
const SOURCE_TYPES = [
    'ISSUE',
    'PREISSUE',
    'GOAL',
    'MANUAL',
    'INTRODUCTION'
];
const IMPACT_BOUNDS = {
    upsideMagnitude: {
        min: 0,
        max: 100
    },
    probabilityOfSuccess: {
        min: 0,
        max: 1
    },
    executionProbability: {
        min: 0,
        max: 1
    },
    downsideMagnitude: {
        min: 0,
        max: 100
    },
    timeToImpactDays: {
        min: 0,
        max: Infinity
    },
    effortCost: {
        min: 0,
        max: 100
    },
    secondOrderLeverage: {
        min: 0,
        max: 100
    }
};
function validateEntityRef(ref) {
    const errors = [];
    if (!ref || typeof ref !== 'object') {
        return {
            valid: false,
            errors: [
                'entityRef must be an object'
            ]
        };
    }
    if (!ENTITY_TYPES.includes(ref.type)) {
        errors.push(`entityRef.type must be one of: ${ENTITY_TYPES.join(', ')}`);
    }
    if (typeof ref.id !== 'string' || !ref.id) {
        errors.push('entityRef.id must be a non-empty string');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
function validateActionSource(source) {
    const errors = [];
    if (!source || typeof source !== 'object') {
        return {
            valid: false,
            errors: [
                'source must be an object'
            ]
        };
    }
    if (!SOURCE_TYPES.includes(source.sourceType)) {
        errors.push(`sourceType must be one of: ${SOURCE_TYPES.join(', ')}`);
    }
    switch(source.sourceType){
        case 'ISSUE':
            if (!source.issueId) errors.push('ISSUE source requires issueId');
            if (!source.issueType) errors.push('ISSUE source requires issueType');
            break;
        case 'PREISSUE':
            if (!source.preIssueId) errors.push('PREISSUE source requires preIssueId');
            if (!source.preIssueType) errors.push('PREISSUE source requires preIssueType');
            break;
        case 'GOAL':
            if (!source.goalId) errors.push('GOAL source requires goalId');
            if (!source.metricKey) errors.push('GOAL source requires metricKey');
            break;
        case 'MANUAL':
            if (typeof source.note !== 'string') errors.push('MANUAL source requires note');
            break;
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
function validateImpactModel(impact) {
    const errors = [];
    if (!impact || typeof impact !== 'object') {
        return {
            valid: false,
            errors: [
                'impact must be an object'
            ]
        };
    }
    // Check all required dimensions
    for (const [dim, bounds] of Object.entries(IMPACT_BOUNDS)){
        const val = impact[dim];
        if (typeof val !== 'number' || isNaN(val)) {
            errors.push(`impact.${dim} must be a number`);
        } else if (val < bounds.min || val > bounds.max) {
            errors.push(`impact.${dim} must be in [${bounds.min}, ${bounds.max}], got ${val}`);
        }
    }
    // Explain array required (PF1: FAIL if empty)
    if (!Array.isArray(impact.explain) || impact.explain.length === 0) {
        errors.push('impact.explain must be a non-empty array (PF1: zero explanation fails build)');
    } else if (impact.explain.length > 6) {
        errors.push('impact.explain must have at most 6 items');
    } else if (impact.explain.some((e)=>typeof e !== 'string')) {
        errors.push('impact.explain items must be strings');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
function validateAction(action) {
    const errors = [];
    const missing = [];
    if (!action || typeof action !== 'object') {
        return {
            valid: false,
            errors: [
                'action must be an object'
            ],
            missing: [
                'action'
            ]
        };
    }
    // Required fields
    if (typeof action.actionId !== 'string' || !action.actionId) {
        missing.push('actionId');
    }
    if (typeof action.title !== 'string' || !action.title) {
        missing.push('title');
    }
    // EntityRef
    const entityResult = validateEntityRef(action.entityRef);
    if (!entityResult.valid) {
        missing.push('entityRef');
        errors.push(...entityResult.errors);
    }
    // Sources
    if (!Array.isArray(action.sources) || action.sources.length === 0) {
        missing.push('sources');
        errors.push('sources must be a non-empty array');
    } else {
        action.sources.forEach((src, i)=>{
            const srcResult = validateActionSource(src);
            if (!srcResult.valid) {
                errors.push(...srcResult.errors.map((e)=>`sources[${i}]: ${e}`));
            }
        });
    }
    // Steps
    if (!Array.isArray(action.steps)) {
        missing.push('steps');
        errors.push('steps must be an array');
    }
    // Impact model
    const impactResult = validateImpactModel(action.impact);
    if (!impactResult.valid) {
        missing.push('impact');
        errors.push(...impactResult.errors);
    }
    // createdAt
    if (typeof action.createdAt !== 'string' || !action.createdAt) {
        missing.push('createdAt');
    }
    return {
        valid: errors.length === 0 && missing.length === 0,
        errors,
        missing
    };
}
function generateActionId({ entityRef, resolutionId, sources }) {
    const parts = [
        entityRef.type,
        entityRef.id,
        resolutionId || 'no-resolution',
        ...sources.map((s)=>{
            switch(s.sourceType){
                case 'ISSUE':
                    return `issue:${s.issueId}`;
                case 'PREISSUE':
                    return `preissue:${s.preIssueId}`;
                case 'GOAL':
                    return `goal:${s.goalId}:${s.metricKey}`;
                case 'MANUAL':
                    return `manual:${s.note.slice(0, 20)}`;
                default:
                    return 'unknown';
            }
        }).sort()
    ];
    const hash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])('sha256').update(parts.join('|')).digest('hex').slice(0, 12);
    return `action-${hash}`;
}
function timePenalty(days) {
    return Math.min(30, days / 7);
}
function computeExpectedNetImpact(impact) {
    const { upsideMagnitude, probabilityOfSuccess, executionProbability = 1, downsideMagnitude, timeToImpactDays, effortCost, secondOrderLeverage } = impact;
    // PF1: Combined probability = will they do it? * will it work?
    const combinedProbability = executionProbability * probabilityOfSuccess;
    const expectedUpside = upsideMagnitude * combinedProbability;
    const expectedDownside = downsideMagnitude * (1 - combinedProbability);
    const timePen = timePenalty(timeToImpactDays);
    return expectedUpside + secondOrderLeverage - expectedDownside - effortCost - timePen;
}
function createAction({ entityRef, title, sources, resolutionId = null, steps = [], impact, createdAt }) {
    const actionId = generateActionId({
        entityRef,
        resolutionId,
        sources
    });
    return {
        actionId,
        title,
        entityRef,
        sources,
        resolutionId,
        steps,
        impact,
        createdAt
    };
}
const __TURBOPACK__default__export__ = {
    ENTITY_TYPES,
    SOURCE_TYPES,
    IMPACT_BOUNDS,
    validateEntityRef,
    validateActionSource,
    validateImpactModel,
    validateAction,
    generateActionId,
    timePenalty,
    computeExpectedNetImpact,
    createAction
};
}),
"[project]/backbone-v9/ui/predict/actionCandidates.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GOAL_RESOLUTIONS",
    ()=>GOAL_RESOLUTIONS,
    "PREVENTATIVE_RESOLUTIONS",
    ()=>PREVENTATIVE_RESOLUTIONS,
    "default",
    ()=>__TURBOPACK__default__export__,
    "generateCompanyActionCandidates",
    ()=>generateCompanyActionCandidates,
    "generatePortfolioActionCandidates",
    ()=>generatePortfolioActionCandidates,
    "getAnyResolution",
    ()=>getAnyResolution
]);
/**
 * actionCandidates.js ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Action Generation (Phase 3.2)
 * 
 * Generates candidate actions from:
 * - Issues (reactive)
 * - Pre-Issues (preventative)
 * - Goals (offensive/value-creating)
 * 
 * Actions are the primary decisioning object.
 * Derived output - never persisted.
 * 
 * @module actionCandidates
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$resolutions$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/resolutions.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionSchema$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/actionSchema.js [api] (ecmascript)");
;
;
const PREVENTATIVE_RESOLUTIONS = {
    REDUCE_BURN: {
        resolutionId: 'REDUCE_BURN',
        title: 'Reduce burn rate',
        defaultEffort: 7,
        defaultImpact: 0.7,
        actionSteps: [
            'Review all expense categories',
            'Identify non-essential costs',
            'Negotiate with vendors',
            'Implement cost reductions'
        ]
    },
    ACCELERATE_FUNDRAISE: {
        resolutionId: 'ACCELERATE_FUNDRAISE',
        title: 'Accelerate fundraising',
        defaultEffort: 14,
        defaultImpact: 0.8,
        actionSteps: [
            'Expand investor pipeline',
            'Increase outreach velocity',
            'Fast-track promising leads',
            'Consider bridge financing'
        ]
    },
    BRIDGE_ROUND: {
        resolutionId: 'BRIDGE_ROUND',
        title: 'Secure bridge round',
        defaultEffort: 21,
        defaultImpact: 0.9,
        actionSteps: [
            'Reach out to existing investors',
            'Prepare bridge terms',
            'Negotiate and close quickly',
            'Update cap table'
        ]
    },
    ACCELERATE_GOAL: {
        resolutionId: 'ACCELERATE_GOAL',
        title: 'Accelerate goal progress',
        defaultEffort: 7,
        defaultImpact: 0.6,
        actionSteps: [
            'Identify acceleration levers',
            'Reallocate resources',
            'Remove blockers',
            'Track daily progress'
        ]
    },
    REVISE_TARGET: {
        resolutionId: 'REVISE_TARGET',
        title: 'Revise goal target',
        defaultEffort: 1,
        defaultImpact: 0.4,
        actionSteps: [
            'Assess realistic attainment',
            'Propose revised target',
            'Document rationale',
            'Update goal in system'
        ]
    },
    ADD_RESOURCES: {
        resolutionId: 'ADD_RESOURCES',
        title: 'Add resources to goal',
        defaultEffort: 14,
        defaultImpact: 0.7,
        actionSteps: [
            'Identify resource gaps',
            'Hire or reassign team members',
            'Provide necessary tools/budget',
            'Monitor progress lift'
        ]
    },
    FOLLOW_UP_INVESTOR: {
        resolutionId: 'FOLLOW_UP_INVESTOR',
        title: 'Follow up with investor',
        defaultEffort: 0.5,
        defaultImpact: 0.5,
        actionSteps: [
            'Send check-in email',
            'Provide recent updates',
            'Ask about timeline',
            'Confirm next steps'
        ]
    },
    SCHEDULE_CHECK_IN: {
        resolutionId: 'SCHEDULE_CHECK_IN',
        title: 'Schedule investor check-in',
        defaultEffort: 0.25,
        defaultImpact: 0.4,
        actionSteps: [
            'Propose call time',
            'Prepare talking points',
            'Conduct call',
            'Document outcomes'
        ]
    },
    PREPARE_ALTERNATIVES: {
        resolutionId: 'PREPARE_ALTERNATIVES',
        title: 'Prepare alternative investors',
        defaultEffort: 3,
        defaultImpact: 0.6,
        actionSteps: [
            'Identify backup investors',
            'Warm them up',
            'Prepare to pivot if needed'
        ]
    }
};
const GOAL_RESOLUTIONS = {
    REVENUE_PUSH: {
        resolutionId: 'REVENUE_PUSH',
        title: 'Push revenue acceleration',
        defaultEffort: 14,
        defaultImpact: 0.7,
        actionSteps: [
            'Review sales pipeline',
            'Identify quick wins',
            'Accelerate deal closing',
            'Increase outreach'
        ]
    },
    PRODUCT_SPRINT: {
        resolutionId: 'PRODUCT_SPRINT',
        title: 'Sprint to product milestone',
        defaultEffort: 14,
        defaultImpact: 0.6,
        actionSteps: [
            'Define sprint scope',
            'Allocate engineering',
            'Clear blockers daily',
            'Track to milestone'
        ]
    },
    HIRING_PUSH: {
        resolutionId: 'HIRING_PUSH',
        title: 'Accelerate hiring',
        defaultEffort: 21,
        defaultImpact: 0.5,
        actionSteps: [
            'Expand sourcing channels',
            'Speed up interview process',
            'Make competitive offers',
            'Onboard quickly'
        ]
    },
    PARTNERSHIP_OUTREACH: {
        resolutionId: 'PARTNERSHIP_OUTREACH',
        title: 'Expand partnership outreach',
        defaultEffort: 14,
        defaultImpact: 0.6,
        actionSteps: [
            'Identify target partners',
            'Prepare partnership materials',
            'Initiate conversations',
            'Drive to commitment'
        ]
    },
    FUNDRAISE_CLOSE: {
        resolutionId: 'FUNDRAISE_CLOSE',
        title: 'Drive to fundraise close',
        defaultEffort: 30,
        defaultImpact: 0.9,
        actionSteps: [
            'Finalize lead investor',
            'Complete due diligence',
            'Negotiate terms',
            'Execute closing'
        ]
    }
};
// =============================================================================
// ACTION GENERATION FROM ISSUES
// =============================================================================
/**
 * Generate action from an issue
 * @param {Object} issue 
 * @param {string} companyId 
 * @param {string} companyName 
 * @param {string} createdAt 
 * @returns {Object|null} Action candidate (without impact model)
 */ function generateActionFromIssue(issue, companyId, companyName, createdAt) {
    const resolution = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$resolutions$2e$js__$5b$api$5d$__$28$ecmascript$29$__["getResolution"])(issue.issueType);
    if (!resolution) return null;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionSchema$2e$js__$5b$api$5d$__$28$ecmascript$29$__["createAction"])({
        entityRef: {
            type: 'company',
            id: companyId
        },
        title: `${companyName}: ${resolution.title}`,
        sources: [
            {
                sourceType: 'ISSUE',
                issueId: issue.issueId,
                issueType: issue.issueType
            }
        ],
        resolutionId: resolution.resolutionId,
        steps: resolution.actionSteps,
        impact: null,
        createdAt
    });
}
// =============================================================================
// ACTION GENERATION FROM PRE-ISSUES
// =============================================================================
/**
 * Generate actions from a pre-issue
 * @param {Object} preissue 
 * @param {string} createdAt 
 * @returns {Object[]} Action candidates
 */ function generateActionsFromPreIssue(preissue, createdAt) {
    const actions = [];
    for (const resolutionKey of preissue.preventativeActions || []){
        const resolution = PREVENTATIVE_RESOLUTIONS[resolutionKey];
        if (!resolution) continue;
        actions.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionSchema$2e$js__$5b$api$5d$__$28$ecmascript$29$__["createAction"])({
            entityRef: preissue.entityRef,
            title: `${preissue.companyName}: ${resolution.title} (preventative)`,
            sources: [
                {
                    sourceType: 'PREISSUE',
                    preIssueId: preissue.preIssueId,
                    preIssueType: preissue.preIssueType
                }
            ],
            resolutionId: resolution.resolutionId,
            steps: resolution.actionSteps,
            impact: null,
            createdAt
        }));
    }
    return actions;
}
// =============================================================================
// ACTION GENERATION FROM GOALS
// =============================================================================
/**
 * Map goal type to resolution
 * @param {string} goalType 
 * @returns {Object|null}
 */ function getGoalResolution(goalType) {
    const mapping = {
        revenue: GOAL_RESOLUTIONS.REVENUE_PUSH,
        product: GOAL_RESOLUTIONS.PRODUCT_SPRINT,
        hiring: GOAL_RESOLUTIONS.HIRING_PUSH,
        partnership: GOAL_RESOLUTIONS.PARTNERSHIP_OUTREACH,
        fundraise: GOAL_RESOLUTIONS.FUNDRAISE_CLOSE
    };
    return mapping[goalType] || GOAL_RESOLUTIONS.REVENUE_PUSH;
}
/**
 * Generate action from goal trajectory
 * Only generates if goal is achievable but needs push
 * @param {Object} trajectory - GoalTrajectory
 * @param {string} createdAt 
 * @returns {Object|null} Action candidate
 */ function generateActionFromGoal(trajectory, createdAt) {
    // Don't generate action if already on track or already achieved
    if (trajectory.onTrack === true && trajectory.probabilityOfHit > 0.8) return null;
    // Don't generate if goal is missed (would be an issue)
    if (trajectory.daysLeft !== null && trajectory.daysLeft < 0) return null;
    const resolution = getGoalResolution(trajectory.goalType);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionSchema$2e$js__$5b$api$5d$__$28$ecmascript$29$__["createAction"])({
        entityRef: {
            type: 'company',
            id: trajectory.companyId
        },
        title: `${trajectory.companyName}: ${resolution.title} for ${trajectory.goalName}`,
        sources: [
            {
                sourceType: 'GOAL',
                goalId: trajectory.goalId,
                metricKey: trajectory.metricKey
            }
        ],
        resolutionId: resolution.resolutionId,
        steps: resolution.actionSteps,
        impact: null,
        createdAt
    });
}
function generateCompanyActionCandidates({ issues, preissues, goalTrajectories, companyId, companyName, createdAt }) {
    const candidates = [];
    // From issues
    for (const issue of issues){
        const action = generateActionFromIssue(issue, companyId, companyName, createdAt);
        if (action) candidates.push(action);
    }
    // From pre-issues
    for (const preissue of preissues){
        const actions = generateActionsFromPreIssue(preissue, createdAt);
        candidates.push(...actions);
    }
    // From goals
    for (const trajectory of goalTrajectories){
        const action = generateActionFromGoal(trajectory, createdAt);
        if (action) candidates.push(action);
    }
    return candidates;
}
function generatePortfolioActionCandidates({ companies, issuesByCompany, preissuesByCompany, goalTrajectoriesByCompany, createdAt }) {
    const byCompany = {};
    const all = [];
    for (const company of companies){
        const candidates = generateCompanyActionCandidates({
            issues: issuesByCompany[company.id] || [],
            preissues: preissuesByCompany[company.id] || [],
            goalTrajectories: goalTrajectoriesByCompany[company.id] || [],
            companyId: company.id,
            companyName: company.name,
            createdAt
        });
        byCompany[company.id] = candidates;
        all.push(...candidates);
    }
    return {
        byCompany,
        all
    };
}
function getAnyResolution(resolutionId) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$resolutions$2e$js__$5b$api$5d$__$28$ecmascript$29$__["RESOLUTIONS"][resolutionId] || PREVENTATIVE_RESOLUTIONS[resolutionId] || GOAL_RESOLUTIONS[resolutionId] || null;
}
const __TURBOPACK__default__export__ = {
    PREVENTATIVE_RESOLUTIONS,
    GOAL_RESOLUTIONS,
    generateCompanyActionCandidates,
    generatePortfolioActionCandidates,
    getAnyResolution
};
}),
"[project]/backbone-v9/ui/predict/actionImpact.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "attachCompanyImpactModels",
    ()=>attachCompanyImpactModels,
    "attachImpactModel",
    ()=>attachImpactModel,
    "attachPortfolioImpactModels",
    ()=>attachPortfolioImpactModels,
    "default",
    ()=>__TURBOPACK__default__export__
]);
/**
 * actionImpact.js - Impact Model Attachment (Phase 4.0)
 * 
 * Attaches explainable impact model to each action.
 * 
 * Impact dimensions (canonical):
 * - upsideMagnitude (0-100)
 * - probabilityOfSuccess (0-1) - Will it work if executed?
 * - executionProbability (0-1) - Will founder actually do it? (PF1)
 * - downsideMagnitude (0-100)
 * - timeToImpactDays (>=0)
 * - effortCost (0-100)
 * - secondOrderLeverage (0-100)
 * 
 * PF4: INTRODUCTION actions use timing to adjust impact model
 * 
 * @module actionImpact
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionCandidates$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/actionCandidates.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$ripple$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/ripple.js [api] (ecmascript)");
;
;
// PF4: Timing multipliers (conservative by design)
const TIMING_UPSIDE_MULTIPLIER = {
    'NOW': 1.2,
    'SOON': 1.0,
    'LATER': 0.7,
    'NEVER': 0.0 // Should not reach here
};
const TIMING_EXEC_PROBABILITY_ADJUST = {
    'NOW': 0.1,
    'SOON': 0.0,
    'LATER': -0.15,
    'NEVER': -1.0
};
// =============================================================================
// IMPACT DERIVATION RULES
// =============================================================================
/**
 * Derive upside magnitude from action source
 */ function deriveUpsideMagnitude(action, context) {
    const source = action.sources[0];
    const resolution = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionCandidates$2e$js__$5b$api$5d$__$28$ecmascript$29$__["getAnyResolution"])(action.resolutionId);
    const baseImpact = resolution?.defaultImpact || 0.5;
    let value = baseImpact * 50;
    let explain = '';
    switch(source.sourceType){
        case 'ISSUE':
            {
                const issue = context.issues?.find((i)=>i.issueId === source.issueId);
                if (issue?.severity === 'critical') {
                    value = Math.min(100, baseImpact * 80);
                    explain = `Critical issue resolution (${issue.issueType})`;
                } else if (issue?.severity === 'high') {
                    value = Math.min(100, baseImpact * 65);
                    explain = `High-severity issue resolution`;
                } else {
                    explain = `Issue resolution (${source.issueType})`;
                }
                break;
            }
        case 'PREISSUE':
            {
                const preissue = context.preissues?.find((p)=>p.preIssueId === source.preIssueId);
                if (preissue) {
                    // PF2: Base value adjusted by likelihood
                    value = preissue.severity === 'high' ? 70 : 50;
                    value *= preissue.likelihood;
                    // PF2: Cost-of-delay multiplier increases upside for imminent escalations
                    const costMultiplier = preissue.costOfDelay?.costMultiplier || 1;
                    if (costMultiplier > 1.5) {
                        value = Math.min(100, value * Math.min(1.5, costMultiplier / 2));
                    }
                    const imminentTag = preissue.escalation?.isImminent ? ' [IMMINENT]' : '';
                    explain = `Prevention of ${preissue.preIssueType}${imminentTag} (${(preissue.likelihood * 100).toFixed(0)}% likely, cost: ${costMultiplier.toFixed(1)}x)`;
                } else {
                    value = 40;
                    explain = 'Preventative action';
                }
                break;
            }
        case 'GOAL':
            {
                const traj = context.goalTrajectories?.find((t)=>t.goalId === source.goalId);
                if (traj) {
                    const achievability = traj.probabilityOfHit;
                    const gap = 1 - achievability;
                    value = 50 + gap * 40;
                    explain = `Goal advancement: ${traj.goalName} (${(achievability * 100).toFixed(0)}% current prob)`;
                } else {
                    value = 50;
                    explain = 'Goal advancement';
                }
                break;
            }
        case 'INTRODUCTION':
            {
                // PF4: Intro actions use timing-adjusted upside
                const timing = action.timing || 'LATER';
                const multiplier = TIMING_UPSIDE_MULTIPLIER[timing] || 0.7;
                const optionality = action.optionalityGain || 30;
                const relevance = action.relevanceScore || 50;
                // Base upside from optionality and relevance
                value = (optionality * 0.6 + relevance * 0.4) * multiplier;
                // Timing affects explanation
                if (timing === 'NOW') {
                    explain = `High-value intro (timing: NOW)`;
                } else if (timing === 'SOON') {
                    explain = `Network opportunity (timing: SOON)`;
                } else {
                    explain = `Potential intro (timing: ${timing} - wait for better signal)`;
                }
                break;
            }
        default:
            value = 30;
            explain = 'Manual action';
    }
    return {
        value: Math.round(value),
        explain
    };
}
/**
 * Derive probability of success (will action work IF executed?)
 */ function deriveProbabilityOfSuccess(action, context) {
    const resolution = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionCandidates$2e$js__$5b$api$5d$__$28$ecmascript$29$__["getAnyResolution"])(action.resolutionId);
    const source = action.sources[0];
    const effort = resolution?.defaultEffort || 7;
    let baseProb = effort <= 1 ? 0.9 : effort <= 7 ? 0.7 : effort <= 14 ? 0.5 : 0.4;
    let explain = '';
    switch(source.sourceType){
        case 'ISSUE':
            {
                const issue = context.issues?.find((i)=>i.issueId === source.issueId);
                if (issue?.issueType?.startsWith('DATA_')) {
                    baseProb = Math.min(1, baseProb + 0.2);
                    explain = 'Data fix - high success probability';
                } else if (issue?.issueType?.includes('CRITICAL')) {
                    baseProb = Math.max(0.3, baseProb - 0.1);
                    explain = 'Critical issue - complex resolution';
                } else {
                    explain = `Standard resolution (${effort}d effort)`;
                }
                break;
            }
        case 'PREISSUE':
            {
                const preissue = context.preissues?.find((p)=>p.preIssueId === source.preIssueId);
                if (preissue && preissue.timeToBreachDays > 30) {
                    baseProb = Math.min(1, baseProb + 0.15);
                    explain = 'Early intervention - good odds';
                } else {
                    explain = 'Preventative action';
                }
                break;
            }
        case 'GOAL':
            {
                const traj = context.goalTrajectories?.find((t)=>t.goalId === source.goalId);
                if (traj) {
                    baseProb = 0.5 + traj.confidence * 0.3;
                    explain = `Goal confidence: ${(traj.confidence * 100).toFixed(0)}%`;
                } else {
                    explain = 'Goal action';
                }
                break;
            }
        case 'INTRODUCTION':
            {
                // PF4: Use intro's computed probability
                baseProb = action.probability || 0.4;
                const confidence = action.timingConfidence || 0.5;
                explain = `Intro success: ${(baseProb * 100).toFixed(0)}% (confidence: ${(confidence * 100).toFixed(0)}%)`;
                break;
            }
        default:
            explain = 'Standard probability';
    }
    return {
        value: Math.round(baseProb * 100) / 100,
        explain
    };
}
/**
 * Derive execution probability (will founder actually do it?) - PF1
 */ function deriveExecutionProbability(action, context) {
    const company = context.company;
    const resolution = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionCandidates$2e$js__$5b$api$5d$__$28$ecmascript$29$__["getAnyResolution"])(action.resolutionId);
    const source = action.sources[0];
    let baseExec = 0.7;
    let explain = '';
    const factors = [];
    // Factor 1: Goal velocity
    const trajectories = context.goalTrajectories || [];
    if (trajectories.length > 0) {
        const avgProb = trajectories.reduce((sum, t)=>sum + (t.probabilityOfHit || 0.5), 0) / trajectories.length;
        if (avgProb >= 0.7) {
            baseExec = Math.min(1, baseExec + 0.15);
            factors.push('Strong execution history');
        } else if (avgProb < 0.4) {
            baseExec = Math.max(0.3, baseExec - 0.2);
            factors.push('Weak execution history');
        }
    }
    // Factor 2: Action complexity
    const steps = action.steps?.length || 0;
    const effort = resolution?.defaultEffort || 7;
    if (steps > 5 || effort > 14) {
        baseExec = Math.max(0.3, baseExec - 0.15);
        factors.push('High complexity');
    } else if (steps <= 2 && effort <= 3) {
        baseExec = Math.min(1, baseExec + 0.1);
        factors.push('Low complexity');
    }
    // Factor 3: Runway pressure
    if (company) {
        const runway = company.cash && company.burn ? company.cash / company.burn : null;
        if (runway !== null && runway < 6) {
            if (source.sourceType !== 'ISSUE' || !context.issues?.find((i)=>i.issueId === source.issueId)?.severity === 'critical') {
                baseExec = Math.max(0.3, baseExec - 0.1);
                factors.push('Bandwidth constrained (low runway)');
            }
        }
    }
    // Factor 4: Source type affects execution
    switch(source.sourceType){
        case 'ISSUE':
            {
                const issue = context.issues?.find((i)=>i.issueId === source.issueId);
                if (issue?.severity === 'critical') {
                    baseExec = Math.min(1, baseExec + 0.1);
                    factors.push('Critical - high urgency');
                }
                break;
            }
        case 'PREISSUE':
            {
                // PF2: Imminent pre-issues have higher execution probability
                const preissue = context.preissues?.find((p)=>p.preIssueId === source.preIssueId);
                if (preissue?.escalation?.isImminent) {
                    baseExec = Math.min(1, baseExec + 0.1);
                    factors.push('Imminent escalation - urgent');
                } else {
                    baseExec = Math.max(0.3, baseExec - 0.1);
                    factors.push('Preventative (low urgency)');
                }
                break;
            }
        case 'GOAL':
            {
                const traj = context.goalTrajectories?.find((t)=>t.goalId === source.goalId);
                if (traj?.goalType === 'fundraise' && company?.raising) {
                    baseExec = Math.min(1, baseExec + 0.1);
                    factors.push('Active fundraise focus');
                }
                break;
            }
        case 'INTRODUCTION':
            {
                // PF4: Timing directly affects execution probability
                const timing = action.timing || 'LATER';
                const adjust = TIMING_EXEC_PROBABILITY_ADJUST[timing] || -0.15;
                baseExec = Math.max(0.2, Math.min(1, baseExec + adjust));
                if (timing === 'NOW') {
                    factors.push('Timing: NOW - high urgency');
                } else if (timing === 'SOON') {
                    factors.push('Timing: SOON');
                } else {
                    factors.push(`Timing: ${timing} - lower urgency`);
                }
                break;
            }
    }
    if (factors.length > 0) {
        explain = factors.slice(0, 2).join('; ');
    } else {
        explain = 'Standard execution probability';
    }
    return {
        value: Math.round(baseExec * 100) / 100,
        explain
    };
}
/**
 * Derive downside magnitude (failure cost)
 */ function deriveDownsideMagnitude(action, context) {
    const source = action.sources[0];
    let value = 10;
    let explain = '';
    switch(source.sourceType){
        case 'ISSUE':
            {
                const resolution = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionCandidates$2e$js__$5b$api$5d$__$28$ecmascript$29$__["getAnyResolution"])(action.resolutionId);
                const effort = resolution?.defaultEffort || 7;
                value = Math.min(50, effort * 2);
                explain = `Effort wasted if unsuccessful (${effort}d)`;
                break;
            }
        case 'PREISSUE':
            {
                value = 15;
                explain = 'Low downside - preventative action';
                break;
            }
        case 'GOAL':
            {
                value = 20;
                explain = 'Opportunity cost if goal push fails';
                break;
            }
        case 'INTRODUCTION':
            {
                // PF4: Trust risk IS the downside for intros
                const trustRiskScore = action.trustRisk?.trustRiskScore || 30;
                value = Math.round(trustRiskScore * 0.5); // Convert to 0-50 scale
                explain = `Trust risk: ${action.trustRisk?.trustRiskBand || 'moderate'}`;
                break;
            }
        default:
            value = 10;
            explain = 'Minimal downside';
    }
    return {
        value: Math.round(value),
        explain
    };
}
/**
 * Derive time to impact
 */ function deriveTimeToImpactDays(action, context) {
    const source = action.sources[0];
    if (source.sourceType === 'INTRODUCTION') {
        // PF4: Timing affects expected time to impact
        const timing = action.timing || 'LATER';
        const timingDays = {
            'NOW': 14,
            'SOON': 30,
            'LATER': 60,
            'NEVER': 180
        };
        const value = timingDays[timing] || 60;
        return {
            value,
            explain: `Intro timing: ${timing}`
        };
    }
    const resolution = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionCandidates$2e$js__$5b$api$5d$__$28$ecmascript$29$__["getAnyResolution"])(action.resolutionId);
    const effort = resolution?.defaultEffort || 7;
    const value = Math.ceil(effort * 1.2);
    return {
        value,
        explain: `Based on ${effort}d effort estimate`
    };
}
/**
 * Derive effort cost
 */ function deriveEffortCost(action, context) {
    const source = action.sources[0];
    if (source.sourceType === 'INTRODUCTION') {
        // Intros are low effort (2-3 days typically)
        return {
            value: 10,
            explain: '2-3 days effort for intro'
        };
    }
    const resolution = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionCandidates$2e$js__$5b$api$5d$__$28$ecmascript$29$__["getAnyResolution"])(action.resolutionId);
    const effort = resolution?.defaultEffort || 7;
    const value = Math.min(100, Math.round(effort / 30 * 100));
    return {
        value,
        explain: `${effort} days of effort`
    };
}
/**
 * Derive second order leverage (ripple upside)
 */ function deriveSecondOrderLeverage(action, context) {
    const source = action.sources[0];
    let value = 10;
    let explain = '';
    const companyId = action.entityRef.id;
    switch(source.sourceType){
        case 'ISSUE':
            {
                const issue = context.issues?.find((i)=>i.issueId === source.issueId);
                if (issue) {
                    const issueRipple = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$ripple$2e$js__$5b$api$5d$__$28$ecmascript$29$__["calculateIssueRipple"])(issue);
                    value = Math.round(issueRipple.rippleScore * 80);
                    explain = issueRipple.rippleExplain[0] || 'Removes downstream risk';
                }
                break;
            }
        case 'PREISSUE':
            {
                const preissue = context.preissues?.find((p)=>p.preIssueId === source.preIssueId);
                if (preissue) {
                    value = Math.round(preissue.likelihood * 60);
                    explain = `Prevents ${preissue.preIssueType} cascade`;
                }
                break;
            }
        case 'GOAL':
            {
                const traj = context.goalTrajectories?.find((t)=>t.goalId === source.goalId);
                if (traj?.goalType === 'fundraise') {
                    value = 70;
                    explain = 'Fundraise success enables growth';
                } else if (traj?.goalType === 'revenue') {
                    value = 50;
                    explain = 'Revenue growth compounds';
                } else {
                    value = 30;
                    explain = 'Goal achievement builds momentum';
                }
                break;
            }
        case 'INTRODUCTION':
            {
                // PF4: Optionality IS leverage for intros
                const optionality = action.optionalityGain || 20;
                value = Math.round(optionality);
                explain = `Network optionality: ${optionality}`;
                break;
            }
        default:
            explain = 'Limited second-order effects';
    }
    return {
        value: Math.round(value),
        explain
    };
}
function attachImpactModel(action, context) {
    const upside = deriveUpsideMagnitude(action, context);
    const prob = deriveProbabilityOfSuccess(action, context);
    const execProb = deriveExecutionProbability(action, context);
    const downside = deriveDownsideMagnitude(action, context);
    const time = deriveTimeToImpactDays(action, context);
    const effort = deriveEffortCost(action, context);
    const leverage = deriveSecondOrderLeverage(action, context);
    // Build explanation (2-6 items)
    const explain = [
        upside.explain,
        prob.explain,
        execProb.explain !== 'Standard execution probability' ? execProb.explain : null,
        leverage.value > 30 ? leverage.explain : null,
        downside.value > 30 ? downside.explain : null
    ].filter(Boolean).slice(0, 6);
    if (explain.length < 2) {
        explain.push(effort.explain);
    }
    // PF4: For INTRODUCTION actions, include timing rationale in explain
    if (action.type === 'INTRODUCTION' && action.timingRationale) {
        // Insert timing rationale as first explanation
        explain.unshift(`Timing: ${action.timing} - ${action.timingRationale[0]}`);
    }
    const impact = {
        upsideMagnitude: upside.value,
        probabilityOfSuccess: prob.value,
        executionProbability: execProb.value,
        downsideMagnitude: downside.value,
        timeToImpactDays: time.value,
        effortCost: effort.value,
        secondOrderLeverage: leverage.value,
        explain: explain.slice(0, 6) // Max 6
    };
    return {
        ...action,
        impact
    };
}
function attachCompanyImpactModels(actions, context) {
    return actions.map((action)=>attachImpactModel(action, context));
}
function attachPortfolioImpactModels({ actionsByCompany, issuesByCompany, preissuesByCompany, goalTrajectoriesByCompany, rippleByCompany, companies }) {
    const byCompany = {};
    const all = [];
    for (const company of companies){
        const context = {
            issues: issuesByCompany[company.id] || [],
            preissues: preissuesByCompany[company.id] || [],
            goalTrajectories: goalTrajectoriesByCompany[company.id] || [],
            rippleByCompany,
            company
        };
        const actions = actionsByCompany[company.id] || [];
        const withImpact = attachCompanyImpactModels(actions, context);
        byCompany[company.id] = withImpact;
        all.push(...withImpact);
    }
    return {
        byCompany,
        all
    };
}
const __TURBOPACK__default__export__ = {
    attachImpactModel,
    attachCompanyImpactModels,
    attachPortfolioImpactModels
};
}),
"[project]/backbone-v9/ui/predict/trustRisk.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateTrustRisk",
    ()=>calculateTrustRisk,
    "default",
    ()=>__TURBOPACK__default__export__,
    "getIntroCapitalRemaining",
    ()=>getIntroCapitalRemaining,
    "shouldBlockAmplification",
    ()=>shouldBlockAmplification
]);
/**
 * trustRisk.js
 * Backbone V9 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Trust Risk Calculator
 * 
 * Computes trustRisk for introduction opportunities.
 * Trust risk is a social-capital downside model, not a vibe.
 * 
 * Inputs:
 * 1. Relationship strength (0-100)
 * 2. Recency (days since last touch)
 * 3. Capital spent (intros in last 30/90 days)
 * 4. Warmth of path (direct vs 2-hop vs 3-hop)
 * 5. Fit mismatch risk (goal alignment, sector match)
 * 6. Reputational asymmetry (who is introducing)
 * 
 * Output:
 * - trustRiskScore (0-100)
 * - trustRiskBand: 'low' | 'medium' | 'high'
 * - trustRiskReason[] (2-4 explanations)
 */ /**
 * Recency buckets and their penalty multipliers
 */ const RECENCY_BUCKETS = [
    {
        maxDays: 7,
        penalty: 0,
        label: 'very-recent'
    },
    {
        maxDays: 30,
        penalty: 10,
        label: 'recent'
    },
    {
        maxDays: 90,
        penalty: 25,
        label: 'moderate'
    },
    {
        maxDays: Infinity,
        penalty: 40,
        label: 'stale'
    }
];
/**
 * Path length penalties
 */ const PATH_PENALTIES = {
    1: 0,
    2: 15,
    3: 35,
    default: 50 // 4+ hops
};
/**
 * Intro frequency penalties (asks in last 90 days to same person)
 */ const INTRO_FREQUENCY_PENALTIES = [
    {
        maxIntros: 0,
        penalty: 0
    },
    {
        maxIntros: 1,
        penalty: 5
    },
    {
        maxIntros: 2,
        penalty: 15
    },
    {
        maxIntros: 3,
        penalty: 30
    },
    {
        maxIntros: Infinity,
        penalty: 50
    }
];
/**
 * Calculate days between two dates
 */ function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffMs = Math.abs(d2 - d1);
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
/**
 * Get recency penalty based on days since last touch
 */ function getRecencyPenalty(daysSinceTouch) {
    for (const bucket of RECENCY_BUCKETS){
        if (daysSinceTouch <= bucket.maxDays) {
            return {
                penalty: bucket.penalty,
                label: bucket.label
            };
        }
    }
    return {
        penalty: 40,
        label: 'stale'
    };
}
/**
 * Get path penalty based on hop count
 */ function getPathPenalty(hops) {
    return PATH_PENALTIES[hops] ?? PATH_PENALTIES.default;
}
/**
 * Get intro frequency penalty
 */ function getIntroFrequencyPenalty(introsLast90Days) {
    for (const bucket of INTRO_FREQUENCY_PENALTIES){
        if (introsLast90Days <= bucket.maxIntros) {
            return bucket.penalty;
        }
    }
    return 50;
}
/**
 * Calculate fit mismatch penalty
 * @param {Object} params
 * @param {string[]} targetTags - tags of the target person
 * @param {string[]} goalTags - tags relevant to the goal
 * @param {string} targetSector - sector of target
 * @param {string} companySector - sector of company needing intro
 */ function getFitMismatchPenalty({ targetTags = [], goalTags = [], targetSector, companySector }) {
    let penalty = 0;
    const reasons = [];
    // Check tag overlap
    const tagOverlap = targetTags.filter((t)=>goalTags.includes(t)).length;
    if (tagOverlap === 0 && goalTags.length > 0) {
        penalty += 20;
        reasons.push('No expertise overlap with goal requirements');
    } else if (tagOverlap === 1) {
        penalty += 10;
        reasons.push('Weak expertise overlap');
    }
    // Check sector match
    if (targetSector && companySector && targetSector !== companySector) {
        // Some sectors are adjacent
        const adjacentSectors = {
            'Payments': [
                'Fintech',
                'Crypto',
                'Financial Infrastructure'
            ],
            'Fintech': [
                'Payments',
                'Enterprise Software',
                'Crypto'
            ],
            'Enterprise Software': [
                'Developer Tools',
                'AI',
                'Fintech'
            ],
            'Developer Tools': [
                'Enterprise Software',
                'AI'
            ],
            'Crypto': [
                'Fintech',
                'Payments'
            ],
            'AI': [
                'Enterprise Software',
                'Developer Tools'
            ]
        };
        const isAdjacent = adjacentSectors[companySector]?.includes(targetSector);
        if (!isAdjacent) {
            penalty += 15;
            reasons.push(`Sector mismatch: ${targetSector} vs ${companySector}`);
        }
    }
    return {
        penalty,
        reasons
    };
}
/**
 * Calculate reputational asymmetry penalty
 * Higher penalty if the introducer has more to lose
 * @param {Object} params
 * @param {string} introducerRole - role of person making intro
 * @param {number} relationshipStrength - strength with target
 * @param {number} introSuccessRate - historical success rate
 */ function getReputationalPenalty({ introducerRole, relationshipStrength, introSuccessRate }) {
    let penalty = 0;
    const reasons = [];
    // Senior roles have more reputational risk
    const seniorRoles = [
        'Managing Partner',
        'Partner',
        'CEO',
        'CTO'
    ];
    const isSenior = seniorRoles.some((r)=>introducerRole?.includes(r));
    if (isSenior && relationshipStrength < 70) {
        penalty += 15;
        reasons.push('Senior introducer with moderate relationship strength');
    }
    // Poor historical success rate increases risk
    if (introSuccessRate !== undefined && introSuccessRate < 0.5) {
        penalty += 10;
        reasons.push(`Below-average intro success rate (${Math.round(introSuccessRate * 100)}%)`);
    }
    return {
        penalty,
        reasons
    };
}
function calculateTrustRisk({ relationship, pathLength = 1, introsLast90Days = 0, targetPerson = {}, goal = {}, company = {}, introducer = {}, now = new Date() }) {
    const reasons = [];
    let totalPenalty = 0;
    // 1. Base from relationship strength (invert: higher strength = lower risk)
    const strengthPenalty = Math.max(0, 100 - (relationship?.strength ?? 50));
    const strengthContribution = strengthPenalty * 0.3; // Weight: 30%
    totalPenalty += strengthContribution;
    if (relationship?.strength < 50) {
        reasons.push(`Weak relationship (strength: ${relationship?.strength ?? 'unknown'})`);
    }
    // 2. Recency penalty
    const daysSinceTouch = relationship?.lastTouchAt ? daysBetween(relationship.lastTouchAt, now) : 180; // Default to stale if unknown
    const recency = getRecencyPenalty(daysSinceTouch);
    totalPenalty += recency.penalty;
    if (recency.penalty > 10) {
        reasons.push(`${recency.label} contact (${daysSinceTouch} days ago)`);
    }
    // 3. Capital spent / ask frequency
    const frequencyPenalty = getIntroFrequencyPenalty(introsLast90Days);
    totalPenalty += frequencyPenalty;
    if (frequencyPenalty > 10) {
        reasons.push(`Recent intro requests (${introsLast90Days} in last 90 days)`);
    }
    // 4. Path warmth
    const pathPenalty = getPathPenalty(pathLength);
    totalPenalty += pathPenalty;
    if (pathLength > 1) {
        reasons.push(`${pathLength}-hop path (not direct relationship)`);
    }
    // 5. Fit mismatch
    const goalTags = getGoalTags(goal);
    const fitResult = getFitMismatchPenalty({
        targetTags: targetPerson?.tags ?? [],
        goalTags,
        targetSector: targetPerson?.orgType === 'investor' ? 'Investor' : null,
        companySector: company?.sector
    });
    totalPenalty += fitResult.penalty;
    reasons.push(...fitResult.reasons);
    // 6. Reputational asymmetry
    const introSuccessRate = relationship?.introCount > 0 ? (relationship.introSuccessCount ?? 0) / relationship.introCount : undefined;
    const reputationalResult = getReputationalPenalty({
        introducerRole: introducer?.role,
        relationshipStrength: relationship?.strength,
        introSuccessRate
    });
    totalPenalty += reputationalResult.penalty;
    reasons.push(...reputationalResult.reasons);
    // Clamp to 0-100
    const trustRiskScore = Math.min(100, Math.max(0, Math.round(totalPenalty)));
    // Determine band
    let trustRiskBand;
    if (trustRiskScore <= 30) {
        trustRiskBand = 'low';
    } else if (trustRiskScore <= 60) {
        trustRiskBand = 'medium';
    } else {
        trustRiskBand = 'high';
    }
    // Limit reasons to 4 most significant
    const topReasons = reasons.slice(0, 4);
    return {
        trustRiskScore,
        trustRiskBand,
        trustRiskReason: topReasons.length > 0 ? topReasons : [
            'Baseline risk assessment'
        ]
    };
}
/**
 * Extract relevant tags from a goal for matching
 */ function getGoalTags(goal) {
    const tags = [];
    if (goal?.type === 'fundraise') {
        tags.push('investor', 'fundraising', 'capital');
        // Stage-specific tags
        if (goal.name?.toLowerCase().includes('seed')) tags.push('seed', 'pre-seed');
        if (goal.name?.toLowerCase().includes('series')) tags.push('series-a', 'growth');
    }
    if (goal?.type === 'partnership') {
        tags.push('partnerships', 'business-development');
    }
    if (goal?.type === 'hiring') {
        tags.push('hiring', 'recruiting', 'talent');
    }
    if (goal?.type === 'revenue') {
        tags.push('sales', 'customers', 'growth');
    }
    return tags;
}
function shouldBlockAmplification(trustRisk) {
    return trustRisk.trustRiskBand === 'high';
}
function getIntroCapitalRemaining(introsLast90Days) {
    if (introsLast90Days >= 3) return 0;
    if (introsLast90Days >= 2) return 1;
    if (introsLast90Days >= 1) return 2;
    return 3;
}
const __TURBOPACK__default__export__ = {
    calculateTrustRisk,
    shouldBlockAmplification,
    getIntroCapitalRemaining,
    // Expose for testing
    getRecencyPenalty,
    getPathPenalty,
    getIntroFrequencyPenalty
};
}),
"[project]/backbone-v9/ui/predict/introOpportunity.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TIMING_STATES",
    ()=>TIMING_STATES,
    "default",
    ()=>__TURBOPACK__default__export__,
    "generateIntroOpportunities",
    ()=>generateIntroOpportunities,
    "generatePortfolioIntroOpportunities",
    ()=>generatePortfolioIntroOpportunities
]);
/**
 * introOpportunity.js
 * Backbone V9 Phase 4.0 - Introduction Opportunity Generator
 * 
 * Generates IntroductionOpportunity objects by:
 * 1. Finding blocked/at-risk goals
 * 2. Traversing relationship graph for paths to helpful contacts
 * 3. Computing probability, trust risk, ripple map, and optionality
 * 4. PF4: Computing timing recommendation (NOW/SOON/LATER/NEVER)
 * 
 * NO PERSISTENCE - all derived, ephemeral, deterministic.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$trustRisk$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/trustRisk.js [api] (ecmascript)");
;
const TIMING_STATES = [
    'NOW',
    'SOON',
    'LATER',
    'NEVER'
];
/**
 * Goal types that can benefit from introductions
 */ const INTRO_RELEVANT_GOAL_TYPES = [
    'fundraise',
    'partnership',
    'hiring'
];
/**
 * Person org types that can help with specific goal types
 */ const GOAL_TO_TARGET_ORG_TYPES = {
    fundraise: [
        'investor',
        'external'
    ],
    partnership: [
        'company',
        'external'
    ],
    hiring: [
        'company',
        'external'
    ]
};
/**
 * Build adjacency list from relationships array
 * Returns bidirectional map: personId -> [{ personId, relationship }]
 */ function buildRelationshipGraph(relationships) {
    const graph = new Map();
    for (const rel of relationships){
        // Forward edge
        if (!graph.has(rel.fromPersonId)) {
            graph.set(rel.fromPersonId, []);
        }
        graph.get(rel.fromPersonId).push({
            personId: rel.toPersonId,
            relationship: rel
        });
        // Reverse edge (relationships are bidirectional for traversal)
        if (!graph.has(rel.toPersonId)) {
            graph.set(rel.toPersonId, []);
        }
        graph.get(rel.toPersonId).push({
            personId: rel.fromPersonId,
            relationship: {
                ...rel,
                _reversed: true
            }
        });
    }
    return graph;
}
/**
 * Find all paths from source to targets up to maxHops
 * Returns array of { path: [personId, ...], relationships: [rel, ...] }
 */ function findPaths(graph, sourceIds, targetIds, maxHops = 2) {
    const paths = [];
    const targetSet = new Set(targetIds);
    for (const sourceId of sourceIds){
        // BFS with path tracking
        const queue = [
            {
                personId: sourceId,
                path: [
                    sourceId
                ],
                relationships: [],
                visited: new Set([
                    sourceId
                ])
            }
        ];
        while(queue.length > 0){
            const { personId, path, relationships, visited } = queue.shift();
            // Check if we reached a target
            if (targetSet.has(personId) && path.length > 1) {
                paths.push({
                    path,
                    relationships
                });
                continue; // Don't explore beyond target
            }
            // Stop if we've reached max hops
            if (path.length > maxHops) continue;
            // Explore neighbors
            const neighbors = graph.get(personId) || [];
            for (const { personId: nextId, relationship } of neighbors){
                if (!visited.has(nextId)) {
                    const newVisited = new Set(visited);
                    newVisited.add(nextId);
                    queue.push({
                        personId: nextId,
                        path: [
                            ...path,
                            nextId
                        ],
                        relationships: [
                            ...relationships,
                            relationship
                        ],
                        visited: newVisited
                    });
                }
            }
        }
    }
    return paths;
}
/**
 * Score a path based on relationship strengths
 */ function scorePath(path, relationships) {
    if (relationships.length === 0) return 0;
    // Geometric mean of relationship strengths, penalized by length
    const strengths = relationships.map((r)=>r.strength / 100);
    const product = strengths.reduce((a, b)=>a * b, 1);
    const geoMean = Math.pow(product, 1 / strengths.length);
    // Length penalty: each hop reduces score
    const lengthPenalty = Math.pow(0.7, relationships.length - 1);
    return geoMean * lengthPenalty;
}
// =============================================================================
// PF3: SECOND-ORDER INTRO MODELING
// =============================================================================
/**
 * PF3: Baseline conversion probability for direct intros (1-hop)
 */ const BASELINE_CONVERSION = 0.15;
/**
 * PF3: Minimum conversion lift required for second-order paths
 * Second-order paths must exceed this multiple of baseline to be worth the complexity
 */ const SECOND_ORDER_MIN_LIFT = 1.2; // Must be 20% better than baseline
/**
 * PF3: Hard cap on traversal depth - architecturally enforced
 */ const MAX_PATH_DEPTH = 2;
/**
 * PF3: Compute expected conversion lift for a path
 * 
 * Second-order paths are only valuable if:
 * 1. They're tied to a real Action (intro must serve a goal)
 * 2. Expected conversion exceeds baseline by MIN_LIFT
 * 
 * Returns { conversionLift, expectedConversion, isSecondOrder, includeInRanking, explain }
 */ function computeSecondOrderConversionLift(path, relationships, target, goal) {
    const pathLength = relationships.length;
    const isSecondOrder = pathLength > 1;
    // Direct paths always included
    if (!isSecondOrder) {
        return {
            conversionLift: 1.0,
            expectedConversion: BASELINE_CONVERSION,
            isSecondOrder: false,
            includeInRanking: true,
            explain: 'Direct intro (1-hop)'
        };
    }
    // Second-order path analysis
    // Compute expected conversion based on relationship chain
    const chainStrength = relationships.reduce((prod, r)=>prod * (r.strength / 100), 1);
    // Factor in relationship quality at each hop
    const avgStrength = relationships.reduce((sum, r)=>sum + (r.strength || 50), 0) / pathLength;
    // Second-order penalty: each hop reduces conversion by ~40%
    const hopPenalty = Math.pow(0.6, pathLength - 1);
    // Expected conversion for second-order
    const expectedConversion = BASELINE_CONVERSION * chainStrength * hopPenalty * (avgStrength / 50);
    // Compute lift relative to baseline
    const conversionLift = expectedConversion / BASELINE_CONVERSION;
    // PF3 Rule: Only include if lift > minimum threshold
    // This filters out noisy second-order paths
    const includeInRanking = conversionLift >= SECOND_ORDER_MIN_LIFT;
    let explain;
    if (includeInRanking) {
        explain = `Second-order path (${pathLength} hops): ${(conversionLift * 100).toFixed(0)}% lift vs baseline`;
    } else {
        explain = `Second-order path filtered: ${(conversionLift * 100).toFixed(0)}% lift < ${SECOND_ORDER_MIN_LIFT * 100}% threshold`;
    }
    return {
        conversionLift: Math.round(conversionLift * 100) / 100,
        expectedConversion: Math.round(expectedConversion * 1000) / 1000,
        isSecondOrder,
        includeInRanking,
        explain
    };
}
/**
 * PF3: Filter paths to only include valuable second-order connections
 * 
 * @param {Object[]} paths - All found paths
 * @param {Object} target - Target person
 * @param {Object} goal - Associated goal (required - must be tied to real Action)
 * @returns {Object[]} Filtered paths with conversion data
 */ function filterSecondOrderPaths(paths, target, goal) {
    // PF3 Rule: Second-order paths must be tied to a real Action
    if (!goal) {
        // No goal = no Action = filter out all second-order
        return paths.filter((p)=>p.relationships.length === 1).map((p)=>({
                ...p,
                secondOrder: {
                    conversionLift: 1.0,
                    expectedConversion: BASELINE_CONVERSION,
                    isSecondOrder: false,
                    includeInRanking: true,
                    explain: 'Direct intro (1-hop)'
                }
            }));
    }
    // Compute conversion lift for all paths
    const pathsWithLift = paths.map((p)=>({
            ...p,
            secondOrder: computeSecondOrderConversionLift(p.path, p.relationships, target, goal)
        }));
    // Filter: only include paths that pass the lift threshold
    const filteredPaths = pathsWithLift.filter((p)=>p.secondOrder.includeInRanking);
    // PF3 Rule: Kill feature if noise > signal
    // If >80% of second-order paths are filtered, the feature is adding noise
    const secondOrderPaths = pathsWithLift.filter((p)=>p.secondOrder.isSecondOrder);
    const includedSecondOrder = filteredPaths.filter((p)=>p.secondOrder.isSecondOrder);
    if (secondOrderPaths.length > 0) {
        const inclusionRate = includedSecondOrder.length / secondOrderPaths.length;
        // If <20% of second-order paths pass, feature is noise - return only direct
        if (inclusionRate < 0.2) {
            return filteredPaths.filter((p)=>!p.secondOrder.isSecondOrder);
        }
    }
    return filteredPaths;
}
/**
 * Determine if a goal is blocked or at-risk
 */ function isGoalBlocked(goal, company, now = new Date()) {
    if (goal.status !== 'active') return false;
    const dueDate = new Date(goal.due);
    const daysRemaining = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
    const progressPct = goal.current / goal.target * 100;
    // Fundraise-specific: check deal pipeline
    if (goal.type === 'fundraise') {
        const totalCommitted = (company.deals || []).filter((d)=>[
                'termsheet',
                'dd'
            ].includes(d.status)).reduce((sum, d)=>sum + d.amount * d.probability / 100, 0);
        const gap = goal.target - goal.current - totalCommitted;
        if (gap > 0 && daysRemaining < 60) return true;
    }
    // Partnership-specific: low progress with deadline approaching
    if (goal.type === 'partnership') {
        if (progressPct < 50 && daysRemaining < 45) return true;
    }
    // Hiring: slow progress
    if (goal.type === 'hiring') {
        const expectedProgress = Math.max(0, 100 - daysRemaining / 90 * 100);
        if (progressPct < expectedProgress * 0.7) return true;
    }
    // General: behind trajectory
    const daysTotal = 90; // Assume 90-day goal window
    const expectedPct = Math.min(100, (daysTotal - daysRemaining) / daysTotal * 100);
    return progressPct < expectedPct * 0.6;
}
/**
 * Find potential targets for a goal
 */ function findPotentialTargets(goal, company, people, investors) {
    const targets = [];
    const targetOrgTypes = GOAL_TO_TARGET_ORG_TYPES[goal.type] || [];
    for (const person of people){
        if (!targetOrgTypes.includes(person.orgType)) continue;
        // Skip people already at this company
        if (person.orgId === company.id) continue;
        // For fundraise, check if investor matches stage/sector
        if (goal.type === 'fundraise' && person.orgType === 'investor') {
            const investor = investors.find((i)=>i.personId === person.id || i.id === person.orgId);
            if (investor) {
                const stageMatch = investor.stageFocus?.toLowerCase().includes(company.stage?.toLowerCase());
                const sectorMatch = investor.sectorFocus?.toLowerCase().includes(company.sector?.toLowerCase());
                if (stageMatch || sectorMatch) {
                    targets.push({
                        person,
                        relevanceScore: (stageMatch ? 50 : 0) + (sectorMatch ? 50 : 0)
                    });
                }
            }
        }
        // For partnerships, check sector alignment
        if (goal.type === 'partnership') {
            const sectorMatch = person.tags?.some((t)=>company.sector?.toLowerCase().includes(t.toLowerCase()));
            if (sectorMatch || person.orgType === 'external') {
                targets.push({
                    person,
                    relevanceScore: sectorMatch ? 70 : 30
                });
            }
        }
        // For hiring, check relevant expertise
        if (goal.type === 'hiring') {
            const relevantTags = [
                'hiring',
                'recruiting',
                'talent',
                'engineering',
                'sales'
            ];
            const tagMatch = person.tags?.some((t)=>relevantTags.includes(t.toLowerCase()));
            if (tagMatch) {
                targets.push({
                    person,
                    relevanceScore: 50
                });
            }
        }
    }
    return targets;
}
/**
 * Calculate intro probability of success
 */ function calculateIntroProbability(path, relationships, target, goal) {
    // Base: path score
    let probability = scorePath(path, relationships);
    // Adjust for target relevance
    probability *= target.relevanceScore / 100;
    // Clamp to reasonable range
    return Math.min(0.8, Math.max(0.1, probability));
}
/**
 * Estimate optionality gain from an intro
 */ function estimateOptionalityGain(target, goal, company) {
    let gain = 0;
    // Investor intros create fundraising optionality
    if (target.person.orgType === 'investor') {
        gain += 30;
        if (target.person.tags?.includes('founder-friendly')) gain += 10;
    }
    // External contacts create partnership optionality
    if (target.person.orgType === 'external') {
        gain += 20;
        if ([
            'CEO',
            'CTO',
            'Partner'
        ].some((r)=>target.person.role?.includes(r))) {
            gain += 15;
        }
    }
    // Cross-portfolio intros create network effects
    if (target.person.orgType === 'company') {
        gain += 25;
    }
    return Math.min(100, gain);
}
/**
 * PF4: Compute intro timing recommendation
 * 
 * Inputs:
 * - Trajectory velocity (are they making progress?)
 * - Goal distance (how far from target?)
 * - Investor cycle timing (for fundraise goals)
 * - Trust risk level
 * 
 * Default: LATER (conservative)
 * 
 * @returns {{ timing: string, timingRationale: string[], confidence: number }}
 */ function computeIntroTiming({ goal, company, trustRisk, probability, trajectory, now = new Date() }) {
    const rationale = [];
    let score = 0; // Higher = more urgent timing
    let confidence = 0.5; // How confident we are in the recommendation
    const dueDate = new Date(goal.due);
    const daysRemaining = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
    const progressPct = goal.current / goal.target * 100;
    const gap = 100 - progressPct;
    // === Factor 1: Goal distance (gap to target) ===
    if (gap > 70) {
        score += 2;
        rationale.push(`Large gap to target (${gap.toFixed(0)}% remaining)`);
        confidence += 0.1;
    } else if (gap > 40) {
        score += 1;
        rationale.push(`Moderate gap to target (${gap.toFixed(0)}% remaining)`);
    } else {
        rationale.push(`Goal on track (${progressPct.toFixed(0)}% complete)`);
        confidence += 0.15;
    }
    // === Factor 2: Time pressure ===
    if (daysRemaining < 21) {
        score += 3;
        rationale.push(`Critical: ${daysRemaining} days remaining`);
        confidence += 0.15;
    } else if (daysRemaining < 45) {
        score += 2;
        rationale.push(`Approaching deadline: ${daysRemaining} days`);
        confidence += 0.1;
    } else if (daysRemaining < 90) {
        score += 1;
        rationale.push(`Reasonable runway: ${daysRemaining} days`);
    } else {
        rationale.push(`Ample time: ${daysRemaining} days`);
        confidence -= 0.1; // Less certain, more time to wait
    }
    // === Factor 3: Trajectory velocity (if available) ===
    if (trajectory) {
        if (trajectory.velocity < 0) {
            score += 2;
            rationale.push('Negative velocity - losing ground');
            confidence += 0.1;
        } else if (trajectory.probabilityOfHit < 0.3) {
            score += 2;
            rationale.push(`Low probability of hit (${(trajectory.probabilityOfHit * 100).toFixed(0)}%)`);
            confidence += 0.1;
        } else if (trajectory.probabilityOfHit > 0.7) {
            score -= 1;
            rationale.push(`Good probability of hit (${(trajectory.probabilityOfHit * 100).toFixed(0)}%)`);
            confidence += 0.1;
        }
    }
    // === Factor 4: Fundraise-specific investor cycle timing ===
    if (goal.type === 'fundraise') {
        const month = now.getMonth();
        // Q1 and Q4 are better for fundraising (budget cycles)
        if (month >= 0 && month <= 2) {
            score += 1;
            rationale.push('Q1 - favorable fundraising season');
            confidence += 0.05;
        } else if (month >= 8 && month <= 10) {
            score += 1;
            rationale.push('Q4 - favorable fundraising season');
            confidence += 0.05;
        } else if (month >= 6 && month <= 7) {
            score -= 1;
            rationale.push('Summer - slower investor activity');
        }
        // Check existing deal pipeline
        const activeDeals = (company.deals || []).filter((d)=>[
                'meeting',
                'dd',
                'termsheet'
            ].includes(d.status)).length;
        if (activeDeals === 0) {
            score += 2;
            rationale.push('No active deals - pipeline needs intros');
            confidence += 0.1;
        } else if (activeDeals >= 3) {
            score -= 1;
            rationale.push(`${activeDeals} active deals - pipeline healthy`);
        }
    }
    // === Factor 5: Trust risk penalty ===
    if (trustRisk.trustRiskScore > 70) {
        score -= 3;
        rationale.push(`High trust risk (${trustRisk.trustRiskScore}) - delay recommended`);
        confidence += 0.15; // More confident about NOT doing it
    } else if (trustRisk.trustRiskScore > 50) {
        score -= 1;
        rationale.push(`Moderate trust risk (${trustRisk.trustRiskScore})`);
    }
    // === Factor 6: Intro probability ===
    if (probability < 0.3) {
        score -= 1;
        rationale.push(`Low success probability (${(probability * 100).toFixed(0)}%)`);
    } else if (probability > 0.6) {
        score += 1;
        rationale.push(`Good success probability (${(probability * 100).toFixed(0)}%)`);
        confidence += 0.1;
    }
    // === Determine timing state ===
    // Default to LATER on uncertainty (per PF4 spec)
    let timing;
    if (trustRisk.trustRiskScore > 80) {
        timing = 'NEVER';
        rationale.unshift('BLOCKED: Trust risk too high');
        confidence = 0.9;
    } else if (score >= 6 && confidence > 0.6) {
        timing = 'NOW';
        rationale.unshift('Immediate action recommended');
    } else if (score >= 3 && confidence > 0.5) {
        timing = 'SOON';
        rationale.unshift('Action recommended within 2-4 weeks');
    } else {
        timing = 'LATER';
        rationale.unshift('Wait for better signal or conditions');
        // If we're defaulting to LATER, note the uncertainty
        if (confidence < 0.5) {
            rationale.push('Insufficient confidence for earlier timing');
        }
    }
    return {
        timing,
        timingRationale: rationale,
        timingConfidence: Math.min(1, Math.max(0, confidence)),
        timingScore: score
    };
}
/**
 * Build human-readable rationale for intro (PF4: force explicit rationale)
 */ function buildRationale(goal, target, introducer, trustRisk, timing) {
    const lines = [];
    // Required: Why this intro matters
    lines.push(`Goal "${goal.name}" needs acceleration.`);
    // Required: Who and why they're relevant
    lines.push(`${target.person.name} (${target.person.role || 'Contact'}) is a fit because: ${target.relevanceScore >= 70 ? 'strong sector/stage match' : target.relevanceScore >= 40 ? 'moderate relevance' : 'potential connection'}.`);
    // Required: Path to intro
    if (introducer) {
        lines.push(`Path: ${introducer.name} can introduce.`);
    }
    // Required: Risk acknowledgment
    lines.push(`Trust risk: ${trustRisk.trustRiskBand} (${trustRisk.trustRiskScore}/100).`);
    // Required: Timing with reason
    lines.push(`Timing: ${timing.timing} - ${timing.timingRationale[0]}`);
    return lines;
}
function generateIntroOpportunities({ company, goals, people, relationships, investors, team, goalTrajectories = [], now = new Date() }) {
    const opportunities = [];
    const graph = buildRelationshipGraph(relationships);
    // Get team person IDs (potential introducers)
    const teamPersonIds = team.map((t)=>t.personId).filter(Boolean);
    // Also include founder person IDs as potential introducers
    const founderPersonIds = company.founderPersonIds || [];
    const introducerIds = [
        ...new Set([
            ...teamPersonIds,
            ...founderPersonIds
        ])
    ];
    // Find blocked goals that could benefit from intros
    const relevantGoals = goals.filter((g)=>INTRO_RELEVANT_GOAL_TYPES.includes(g.type) && isGoalBlocked(g, company, now));
    for (const goal of relevantGoals){
        // Get trajectory for this goal if available
        const trajectory = goalTrajectories.find((t)=>t.goalId === goal.id);
        // Find potential targets
        const targets = findPotentialTargets(goal, company, people, investors);
        for (const target of targets){
            // Find paths from team to target
            const rawPaths = findPaths(graph, introducerIds, [
                target.person.id
            ], MAX_PATH_DEPTH);
            if (rawPaths.length === 0) continue;
            // PF3: Filter second-order paths by conversion lift
            const filteredPaths = filterSecondOrderPaths(rawPaths, target, goal);
            if (filteredPaths.length === 0) continue;
            // Take best path (considering conversion lift for second-order)
            const bestPath = filteredPaths.reduce((best, current)=>{
                // Score combines path strength and conversion lift
                const currentScore = scorePath(current.path, current.relationships) * (current.secondOrder?.conversionLift || 1);
                const bestScore = scorePath(best.path, best.relationships) * (best.secondOrder?.conversionLift || 1);
                return currentScore > bestScore ? current : best;
            });
            // Get introducer (first person in path who is on team)
            const introducerId = bestPath.path[0];
            const introducer = team.find((t)=>t.personId === introducerId) || people.find((p)=>p.id === introducerId);
            // Calculate trust risk
            const primaryRelationship = bestPath.relationships[0];
            const introsLast90Days = primaryRelationship?.introCount || 0;
            const trustRisk = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$trustRisk$2e$js__$5b$api$5d$__$28$ecmascript$29$__["calculateTrustRisk"])({
                relationship: primaryRelationship,
                pathLength: bestPath.path.length - 1,
                introsLast90Days,
                targetPerson: target.person,
                goal,
                company,
                introducer,
                now
            });
            // Calculate probability
            const probability = calculateIntroProbability(bestPath.path, bestPath.relationships, target, goal);
            // PF4: Compute timing recommendation
            const timing = computeIntroTiming({
                goal,
                company,
                trustRisk,
                probability,
                trajectory,
                now
            });
            // Skip if timing is NEVER (explicit block)
            if (timing.timing === 'NEVER') {
                continue;
            }
            // Also skip if trust risk too high AND timing didn't already block
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$trustRisk$2e$js__$5b$api$5d$__$28$ecmascript$29$__["shouldBlockAmplification"])(trustRisk) && timing.timing !== 'NEVER') {
                continue;
            }
            // Calculate optionality gain
            const optionalityGain = estimateOptionalityGain(target, goal, company);
            // Build opportunity with PF4 timing and PF3 second-order data
            const opportunity = {
                id: `intro-${company.id}-${goal.id}-${target.person.id}`,
                type: 'INTRODUCTION',
                companyId: company.id,
                goalId: goal.id,
                // Path details
                introducerId,
                introducerName: introducer?.name,
                targetPersonId: target.person.id,
                targetPersonName: target.person.name,
                targetOrg: target.person.orgId,
                path: bestPath.path,
                pathLength: bestPath.path.length - 1,
                // Scores
                probability,
                trustRisk,
                optionalityGain,
                relevanceScore: target.relevanceScore,
                // PF3: Second-order conversion data
                secondOrder: bestPath.secondOrder,
                conversionLift: bestPath.secondOrder?.conversionLift || 1.0,
                isSecondOrder: bestPath.secondOrder?.isSecondOrder || false,
                // PF4: Timing
                timing: timing.timing,
                timingRationale: timing.timingRationale,
                timingConfidence: timing.timingConfidence,
                // Explanation (PF4: force explicit rationale)
                rationale: buildRationale(goal, target, introducer, trustRisk, timing),
                // Metadata
                generatedAt: now.toISOString(),
                ephemeral: true
            };
            opportunities.push(opportunity);
        }
    }
    // Sort by timing priority, then by probability adjusted for risk
    const timingOrder = {
        'NOW': 0,
        'SOON': 1,
        'LATER': 2,
        'NEVER': 3
    };
    opportunities.sort((a, b)=>{
        // Primary: timing
        const timingDiff = timingOrder[a.timing] - timingOrder[b.timing];
        if (timingDiff !== 0) return timingDiff;
        // Secondary: probability * (100 - trustRiskScore)
        const aScore = a.probability * (100 - a.trustRisk.trustRiskScore);
        const bScore = b.probability * (100 - b.trustRisk.trustRiskScore);
        return bScore - aScore;
    });
    return opportunities;
}
function generatePortfolioIntroOpportunities({ companies, people, relationships, investors, team, goalTrajectoriesByCompany = {}, now = new Date() }) {
    const allOpportunities = [];
    for (const company of companies){
        const companyOpportunities = generateIntroOpportunities({
            company,
            goals: company.goals || [],
            people,
            relationships,
            investors,
            team,
            goalTrajectories: goalTrajectoriesByCompany[company.id] || [],
            now
        });
        allOpportunities.push(...companyOpportunities);
    }
    // Sort globally by timing then score
    const timingOrder = {
        'NOW': 0,
        'SOON': 1,
        'LATER': 2,
        'NEVER': 3
    };
    allOpportunities.sort((a, b)=>{
        const timingDiff = timingOrder[a.timing] - timingOrder[b.timing];
        if (timingDiff !== 0) return timingDiff;
        const aScore = a.probability * (100 - a.trustRisk.trustRiskScore) * (1 + a.optionalityGain / 100);
        const bScore = b.probability * (100 - b.trustRisk.trustRiskScore) * (1 + b.optionalityGain / 100);
        return bScore - aScore;
    });
    return allOpportunities;
}
const __TURBOPACK__default__export__ = {
    generateIntroOpportunities,
    generatePortfolioIntroOpportunities,
    TIMING_STATES,
    // Expose for testing
    buildRelationshipGraph,
    findPaths,
    isGoalBlocked,
    computeIntroTiming
};
}),
"[project]/backbone-v9/ui/decide/weights.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * decide/weights.js Ã¢â‚¬â€ Centralized Ranking Weights (Phase 4.5)
 * 
 * ALL ranking weights live here. No magic numbers elsewhere.
 * Changes require QA validation.
 * 
 * @module decide/weights
 */ // =============================================================================
// RANKING FORMULA WEIGHTS
// =============================================================================
/**
 * rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost
 * 
 * Where:
 *   expectedNetImpact = impact * ripple * executionProbability * successProbability
 */ __turbopack_context__.s([
    "BASELINE_CONVERSION",
    ()=>BASELINE_CONVERSION,
    "IMMINENT_DAYS",
    ()=>IMMINENT_DAYS,
    "MAX_PATH_DEPTH",
    ()=>MAX_PATH_DEPTH,
    "SECOND_ORDER_MIN_LIFT",
    ()=>SECOND_ORDER_MIN_LIFT,
    "WEIGHTS",
    ()=>WEIGHTS,
    "computeExecutionFrictionPenalty",
    ()=>computeExecutionFrictionPenalty,
    "computeTimeCriticalityBoost",
    ()=>computeTimeCriticalityBoost,
    "computeTrustPenalty",
    ()=>computeTrustPenalty,
    "default",
    ()=>__TURBOPACK__default__export__,
    "timePenalty",
    ()=>timePenalty
]);
const WEIGHTS = {
    // Trust penalty: penalize high-risk intros
    trustPenalty: {
        // trustRisk is 0-1, multiply by this to get penalty
        multiplier: 20,
        // threshold above which penalty applies
        threshold: 0.3
    },
    // Execution friction: penalize complex actions
    executionFriction: {
        // base penalty per step
        perStep: 0.5,
        // max steps before cap
        maxSteps: 10,
        // complexity multiplier (if action has complexity field)
        complexityMultiplier: 5
    },
    // Time criticality: boost actions with approaching deadlines
    timeCriticality: {
        // days until deadline to start boosting
        urgentThreshold: 7,
        // maximum boost
        maxBoost: 15,
        // decay rate (boost = maxBoost * e^(-days/decayRate))
        decayRate: 7
    },
    // Impact model weights (from actionSchema)
    impact: {
        // Time penalty: days / weeksPerPenaltyPoint
        timePenaltyWeeks: 7,
        // Max time penalty cap
        timePenaltyMax: 30
    },
    // Ripple effect weights
    ripple: {
        // Base multiplier for ripple score
        baseMultiplier: 1.0,
        // Decay per hop
        hopDecay: 0.5
    },
    // Introduction-specific weights
    intro: {
        // Baseline conversion rate
        baselineConversion: 0.15,
        // Minimum lift for second-order to count
        secondOrderMinLift: 1.2,
        // Max path depth for intro chains
        maxPathDepth: 2
    },
    // Pre-issue escalation
    preissue: {
        // Days until escalation to consider "imminent"
        imminentDays: 7,
        // Cost of delay exponential base
        costOfDelayBase: 1.1,
        // Max cost multiplier
        maxCostMultiplier: 3.0
    }
};
const BASELINE_CONVERSION = WEIGHTS.intro.baselineConversion;
const SECOND_ORDER_MIN_LIFT = WEIGHTS.intro.secondOrderMinLift;
const MAX_PATH_DEPTH = WEIGHTS.intro.maxPathDepth;
const IMMINENT_DAYS = WEIGHTS.preissue.imminentDays;
function computeTrustPenalty(trustRisk) {
    if (trustRisk <= WEIGHTS.trustPenalty.threshold) return 0;
    return (trustRisk - WEIGHTS.trustPenalty.threshold) * WEIGHTS.trustPenalty.multiplier;
}
function computeExecutionFrictionPenalty(action) {
    const stepCount = Math.min(action.steps?.length || 0, WEIGHTS.executionFriction.maxSteps);
    let penalty = stepCount * WEIGHTS.executionFriction.perStep;
    if (action.complexity) {
        penalty += action.complexity * WEIGHTS.executionFriction.complexityMultiplier;
    }
    return penalty;
}
function computeTimeCriticalityBoost(daysUntilDeadline) {
    if (daysUntilDeadline == null || daysUntilDeadline <= 0) return 0;
    if (daysUntilDeadline > WEIGHTS.timeCriticality.urgentThreshold * 4) return 0;
    const { maxBoost, decayRate } = WEIGHTS.timeCriticality;
    return maxBoost * Math.exp(-daysUntilDeadline / decayRate);
}
function timePenalty(days) {
    return Math.min(WEIGHTS.impact.timePenaltyMax, days / WEIGHTS.impact.timePenaltyWeeks);
}
const __TURBOPACK__default__export__ = {
    WEIGHTS,
    BASELINE_CONVERSION,
    SECOND_ORDER_MIN_LIFT,
    MAX_PATH_DEPTH,
    IMMINENT_DAYS,
    computeTrustPenalty,
    computeExecutionFrictionPenalty,
    computeTimeCriticalityBoost,
    timePenalty
};
}),
"[project]/backbone-v9/ui/decide/ranking.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "computeExpectedNetImpact",
    ()=>computeExpectedNetImpact,
    "computeRankScore",
    ()=>computeRankScore,
    "default",
    ()=>__TURBOPACK__default__export__,
    "getTopActions",
    ()=>getTopActions,
    "rankActions",
    ()=>rankActions,
    "validateRanking",
    ()=>validateRanking,
    "verifyDeterminism",
    ()=>verifyDeterminism
]);
/**
 * decide/ranking.js Ã¢â‚¬â€ Unified Action Ranking (Phase 4.5)
 * 
 * SINGLE CANONICAL RANKING SURFACE
 * 
 * All actions are ordered by exactly ONE scalar: rankScore
 * 
 * Formula:
 *   rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost
 * 
 * Where:
 *   expectedNetImpact = (upside * combinedProb) + leverage - (downside * failProb) - effort - timePenalty
 *   combinedProb = executionProbability * probabilityOfSuccess
 * 
 * No other number may reorder Actions.
 * 
 * @module decide/ranking
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$decide$2f$weights$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/decide/weights.js [api] (ecmascript)");
;
function computeExpectedNetImpact(impact) {
    const { upsideMagnitude = 0, probabilityOfSuccess = 0.5, executionProbability = 1, downsideMagnitude = 0, timeToImpactDays = 14, effortCost = 0, secondOrderLeverage = 0 } = impact;
    const combinedProbability = executionProbability * probabilityOfSuccess;
    const expectedUpside = upsideMagnitude * combinedProbability;
    const expectedDownside = downsideMagnitude * (1 - combinedProbability);
    const timePen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$decide$2f$weights$2e$js__$5b$api$5d$__$28$ecmascript$29$__["timePenalty"])(timeToImpactDays);
    return expectedUpside + secondOrderLeverage - expectedDownside - effortCost - timePen;
}
function computeRankScore(action, options = {}) {
    const { trustRisk = 0, daysUntilDeadline = null } = options;
    // Base expected net impact
    const expectedNetImpact = computeExpectedNetImpact(action.impact);
    // Penalties
    const trustPenalty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$decide$2f$weights$2e$js__$5b$api$5d$__$28$ecmascript$29$__["computeTrustPenalty"])(trustRisk);
    const executionFrictionPenalty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$decide$2f$weights$2e$js__$5b$api$5d$__$28$ecmascript$29$__["computeExecutionFrictionPenalty"])(action);
    // Boost
    const timeCriticalityBoost = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$decide$2f$weights$2e$js__$5b$api$5d$__$28$ecmascript$29$__["computeTimeCriticalityBoost"])(daysUntilDeadline);
    // Final score
    const rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost;
    return {
        rankScore,
        components: {
            expectedNetImpact,
            trustPenalty,
            executionFrictionPenalty,
            timeCriticalityBoost
        }
    };
}
function rankActions(actions, context = {}) {
    if (!actions || actions.length === 0) return [];
    const { trustRiskByAction = new Map(), deadlinesByAction = new Map() } = context;
    // Compute rankScore for each action
    const scored = actions.map((action)=>{
        const options = {
            trustRisk: trustRiskByAction.get(action.actionId) || action.trustRisk || 0,
            daysUntilDeadline: deadlinesByAction.get(action.actionId) || action.daysUntilDeadline
        };
        const { rankScore, components } = computeRankScore(action, options);
        return {
            ...action,
            rankScore,
            rankComponents: components,
            // Keep expectedNetImpact for backward compatibility
            expectedNetImpact: components.expectedNetImpact
        };
    });
    // Sort by rankScore (descending)
    // Break ties by actionId for determinism
    scored.sort((a, b)=>{
        const diff = b.rankScore - a.rankScore;
        if (Math.abs(diff) > 0.0001) return diff;
        return a.actionId.localeCompare(b.actionId);
    });
    // Assign ranks (1-indexed)
    return scored.map((action, index)=>({
            ...action,
            rank: index + 1
        }));
}
function getTopActions(rankedActions, n = 5) {
    return rankedActions.slice(0, n);
}
function validateRanking(rankedActions) {
    const errors = [];
    if (rankedActions.length === 0) return {
        valid: true,
        errors: []
    };
    // Check all actions have rankScore
    for (const action of rankedActions){
        if (typeof action.rankScore !== 'number' || isNaN(action.rankScore)) {
            errors.push(`Action ${action.actionId}: missing or invalid rankScore`);
        }
        if (typeof action.rank !== 'number' || action.rank < 1) {
            errors.push(`Action ${action.actionId}: missing or invalid rank`);
        }
    }
    // Verify sorting is correct
    for(let i = 1; i < rankedActions.length; i++){
        const prev = rankedActions[i - 1];
        const curr = rankedActions[i];
        if (curr.rankScore > prev.rankScore + 0.0001) {
            errors.push(`Actions not sorted by rankScore at position ${i}`);
        }
    }
    // Verify rank sequence
    for(let i = 0; i < rankedActions.length; i++){
        if (rankedActions[i].rank !== i + 1) {
            errors.push(`Rank sequence broken at position ${i}`);
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
function verifyDeterminism(actions, context = {}) {
    const ranked1 = rankActions(actions, context);
    const ranked2 = rankActions(actions, context);
    if (ranked1.length !== ranked2.length) return false;
    for(let i = 0; i < ranked1.length; i++){
        if (ranked1[i].actionId !== ranked2[i].actionId) return false;
        if (Math.abs(ranked1[i].rankScore - ranked2[i].rankScore) > 0.0001) return false;
    }
    return true;
}
const __TURBOPACK__default__export__ = {
    computeExpectedNetImpact,
    computeRankScore,
    rankActions,
    getTopActions,
    validateRanking,
    verifyDeterminism
};
}),
"[project]/backbone-v9/ui/runtime/engine.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "compute",
    ()=>compute,
    "computeCompany",
    ()=>computeCompany,
    "default",
    ()=>__TURBOPACK__default__export__
]);
/**
 * engine.js – DAG-Driven Computation Engine (Phase 4.5.2)
 * 
 * Phase 4.5.2: Kill list compliance - removed shadow value surfaces
 * Execution order is enforced by explicit dependency graph.
 * 
 * INVARIANT: No circular dependencies. Back-edge access throws.
 * 
 * @module engine
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$index$2e$js__$5b$api$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/backbone-v9/ui/runtime/index.js [api] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$graph$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/runtime/graph.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$health$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/runtime/health.js [api] (ecmascript)");
// DERIVE layer (L1-L2)
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$runway$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/derive/runway.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$trajectory$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/derive/trajectory.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$metrics$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/derive/metrics.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$goalTrajectory$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/derive/goalTrajectory.js [api] (ecmascript)");
// PREDICT layer (L3-L4)
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/issues.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$ripple$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/ripple.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$preissues$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/preissues.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionCandidates$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/actionCandidates.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionImpact$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/actionImpact.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$introOpportunity$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/predict/introOpportunity.js [api] (ecmascript)");
// DECIDE layer (L5)
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$decide$2f$ranking$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/decide/ranking.js [api] (ecmascript)");
// QA layer
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$qa$2f$forbidden$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/qa/forbidden.js [api] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
// =============================================================================
// NODE COMPUTE FUNCTIONS (Phase 4.5.2)
// =============================================================================
const NODE_COMPUTE = {
    runway: (ctx, company, now)=>{
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$runway$2e$js__$5b$api$5d$__$28$ecmascript$29$__["deriveRunway"])(company.cash, company.burn, company.asOf, company.asOf, now);
    },
    metrics: (ctx, company, now)=>{
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$metrics$2e$js__$5b$api$5d$__$28$ecmascript$29$__["deriveCompanyMetrics"])(company);
    },
    trajectory: (ctx, company, now)=>{
        const trajectories = {};
        for (const goal of company.goals || []){
            trajectories[goal.id] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$trajectory$2e$js__$5b$api$5d$__$28$ecmascript$29$__["deriveTrajectory"])(goal, now);
        }
        return trajectories;
    },
    goalTrajectory: (ctx, company, now)=>{
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$derive$2f$goalTrajectory$2e$js__$5b$api$5d$__$28$ecmascript$29$__["deriveCompanyGoalTrajectories"])(company, now);
    },
    health: (ctx, company, now)=>{
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$health$2e$js__$5b$api$5d$__$28$ecmascript$29$__["deriveHealth"])(company, now);
    },
    issues: (ctx, company, now)=>{
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$issues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["detectIssues"])(company, now);
    },
    preissues: (ctx, company, now)=>{
        const goalTrajectories = ctx.goalTrajectory || [];
        const runway = ctx.runway || null;
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$preissues$2e$js__$5b$api$5d$__$28$ecmascript$29$__["deriveCompanyPreIssues"])(company, goalTrajectories, runway, now);
    },
    ripple: (ctx, company, now)=>{
        const issues = ctx.issues?.issues || [];
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$ripple$2e$js__$5b$api$5d$__$28$ecmascript$29$__["calculateCompanyRipple"])(company, issues);
    },
    introOpportunity: (ctx, company, now, globals)=>{
        // Intro opportunities need access to people, relationships, investors, team
        // These are passed via globals
        const { people, relationships, investors, team } = globals || {};
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$introOpportunity$2e$js__$5b$api$5d$__$28$ecmascript$29$__["generateIntroOpportunities"])({
            company,
            goals: company.goals || [],
            people: people || [],
            relationships: relationships || [],
            investors: investors || [],
            team: team || [],
            now
        });
    },
    actionCandidates: (ctx, company, now)=>{
        // Combine standard candidates with intro opportunities
        const standardCandidates = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionCandidates$2e$js__$5b$api$5d$__$28$ecmascript$29$__["generateCompanyActionCandidates"])({
            issues: ctx.issues?.issues || [],
            preissues: ctx.preissues || [],
            goalTrajectories: ctx.goalTrajectory || [],
            companyId: company.id,
            companyName: company.name,
            createdAt: now.toISOString()
        });
        // Convert intro opportunities to action candidates
        const introCandidates = (ctx.introOpportunity || []).map((intro)=>({
                actionId: intro.id,
                title: `${company.name}: Intro to ${intro.targetPersonName}`,
                resolutionId: 'NETWORK_INTRO',
                entityRef: {
                    type: 'company',
                    id: company.id,
                    name: company.name
                },
                sources: [
                    {
                        sourceType: 'INTRODUCTION',
                        sourceId: intro.id,
                        goalId: intro.goalId
                    }
                ],
                steps: [
                    {
                        step: 1,
                        action: `Reach out to ${intro.introducerName} to request intro`
                    },
                    {
                        step: 2,
                        action: `Brief ${intro.introducerName} on ${intro.targetPersonName}'s relevance`
                    },
                    {
                        step: 3,
                        action: `Follow up within 48 hours of intro`
                    }
                ],
                type: 'INTRODUCTION',
                ...intro // Include all intro-specific fields
            }));
        return [
            ...standardCandidates,
            ...introCandidates
        ];
    },
    actionImpact: (ctx, company, now)=>{
        const candidates = ctx.actionCandidates || [];
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$predict$2f$actionImpact$2e$js__$5b$api$5d$__$28$ecmascript$29$__["attachCompanyImpactModels"])(candidates, {
            issues: ctx.issues?.issues || [],
            preissues: ctx.preissues || [],
            goalTrajectories: ctx.goalTrajectory || [],
            rippleByCompany: {
                [company.id]: ctx.ripple
            },
            company
        });
    },
    actionRanker: (ctx, company, now)=>{
        // PHASE 4.5.2: Direct ranking from actionImpact (no intermediate value surfaces)
        const actionsWithImpact = ctx.actionImpact || [];
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$decide$2f$ranking$2e$js__$5b$api$5d$__$28$ecmascript$29$__["rankActions"])(actionsWithImpact);
    },
    priority: (ctx, company, now)=>{
        // Compatibility view: map ranked actions to priority-like records
        const rankedActions = ctx.actionRanker || [];
        return {
            priorities: rankedActions.map((a)=>({
                    companyId: company.id,
                    companyName: company.name,
                    resolutionId: a.resolutionId,
                    title: a.title,
                    priority: a.rankScore || a.expectedNetImpact,
                    rank: a.rank,
                    actionId: a.actionId,
                    sourceType: a.sources[0]?.sourceType || 'MANUAL'
                })),
            summary: {
                companyId: company.id,
                totalPriorities: rankedActions.length,
                topAction: rankedActions[0]?.title || null
            }
        };
    }
};
// =============================================================================
// DAG ENGINE
// =============================================================================
function computeCompanyDAG(company, now, globals = {}) {
    const order = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$graph$2e$js__$5b$api$5d$__$28$ecmascript$29$__["topoSort"])(__TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$graph$2e$js__$5b$api$5d$__$28$ecmascript$29$__["GRAPH"]);
    const ctx = {};
    for (const node of order){
        const computeFn = NODE_COMPUTE[node];
        if (!computeFn) {
            throw new Error(`No compute function for node: ${node}`);
        }
        ctx[node] = computeFn(ctx, company, now, globals);
    }
    return ctx;
}
function compute(rawData, now = new Date()) {
    const startTime = Date.now();
    const errors = [];
    const warnings = [];
    // Validate DAG
    const graphValidation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$graph$2e$js__$5b$api$5d$__$28$ecmascript$29$__["validateGraph"])(__TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$graph$2e$js__$5b$api$5d$__$28$ecmascript$29$__["GRAPH"]);
    if (!graphValidation.valid) {
        errors.push(...graphValidation.errors);
    }
    // Validate input data
    const dataValidation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$index$2e$js__$5b$api$5d$__$28$ecmascript$29$__$3c$locals$3e$__["validateDataset"])(rawData);
    if (!dataValidation.valid) {
        errors.push(...dataValidation.errors);
    }
    // Forbidden field check
    try {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$qa$2f$forbidden$2e$js__$5b$api$5d$__$28$ecmascript$29$__["assertNoForbiddenFields"])(rawData);
    } catch (err) {
        errors.push(err.message);
    }
    const executionOrder = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$graph$2e$js__$5b$api$5d$__$28$ecmascript$29$__["topoSort"])(__TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$graph$2e$js__$5b$api$5d$__$28$ecmascript$29$__["GRAPH"]);
    // Globals for network modules (people, relationships, etc.)
    const globals = {
        people: rawData.people || [],
        relationships: rawData.relationships || [],
        investors: rawData.investors || [],
        team: rawData.team || []
    };
    // Compute for each company
    const companies = (rawData.companies || []).map((company)=>{
        const computed = computeCompanyDAG(company, now, globals);
        if (computed.runway?.confidence < 0.5) {
            warnings.push(`[${company.id}] Low confidence runway`);
        }
        return {
            id: company.id,
            name: company.name,
            raw: company,
            derived: {
                runway: computed.runway,
                health: computed.health,
                metrics: computed.metrics,
                trajectories: computed.trajectory,
                goalTrajectories: computed.goalTrajectory,
                issues: computed.issues,
                preissues: computed.preissues,
                ripple: computed.ripple,
                introOpportunities: computed.introOpportunity,
                actions: computed.actionRanker,
                priorities: computed.priority?.priorities || []
            }
        };
    });
    // Aggregate all ranked actions across portfolio
    let allActions = [];
    for (const company of companies){
        allActions = allActions.concat(company.derived.actions || []);
    }
    // Re-rank at portfolio level using single ranking surface
    const portfolioRankedActions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$decide$2f$ranking$2e$js__$5b$api$5d$__$28$ecmascript$29$__["rankActions"])(allActions);
    // Health counts
    const healthCounts = {
        GREEN: companies.filter((c)=>c.derived.health?.healthBand === 'GREEN').length,
        YELLOW: companies.filter((c)=>c.derived.health?.healthBand === 'YELLOW').length,
        RED: companies.filter((c)=>c.derived.health?.healthBand === 'RED').length
    };
    // Action source counts
    const actionSourceCounts = {
        ISSUE: portfolioRankedActions.filter((a)=>a.sources[0]?.sourceType === 'ISSUE').length,
        PREISSUE: portfolioRankedActions.filter((a)=>a.sources[0]?.sourceType === 'PREISSUE').length,
        GOAL: portfolioRankedActions.filter((a)=>a.sources[0]?.sourceType === 'GOAL').length,
        INTRODUCTION: portfolioRankedActions.filter((a)=>a.sources[0]?.sourceType === 'INTRODUCTION').length
    };
    return {
        companies,
        team: rawData.team || [],
        investors: rawData.investors || [],
        // Phase 4.5.2: Actions are primary artifact
        actions: portfolioRankedActions,
        todayActions: portfolioRankedActions.slice(0, 5),
        // Compatibility: priorities view
        priorities: portfolioRankedActions.map((a)=>({
                companyId: a.entityRef.id,
                companyName: a.title.split(':')[0],
                resolutionId: a.resolutionId,
                title: a.title,
                priority: a.rankScore || a.expectedNetImpact,
                rank: a.rank,
                actionId: a.actionId
            })),
        meta: {
            computedAt: now.toISOString(),
            durationMs: Date.now() - startTime,
            version: '9.4.5.2',
            inputVersion: rawData.version,
            errors,
            warnings,
            healthCounts,
            actionSourceCounts,
            executionOrder,
            layersExecuted: [
                'L0_RAW',
                ...executionOrder.map((n)=>n.toUpperCase())
            ]
        }
    };
}
function computeCompany(company, now = new Date()) {
    const computed = computeCompanyDAG(company, now);
    return {
        id: company.id,
        name: company.name,
        raw: company,
        derived: {
            runway: computed.runway,
            health: computed.health,
            metrics: computed.metrics,
            trajectories: computed.trajectory,
            goalTrajectories: computed.goalTrajectory,
            issues: computed.issues,
            preissues: computed.preissues,
            ripple: computed.ripple,
            actions: computed.actionRanker,
            priorities: computed.priority?.priorities || []
        }
    };
}
const __TURBOPACK__default__export__ = {
    compute,
    computeCompany
};
}),
"[project]/backbone-v9/ui/raw/sample.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v(JSON.parse("{\"version\":\"9.1.0\",\"exportedAt\":\"2026-01-24T23:30:00Z\",\"companies\":[{\"id\":\"velocity\",\"name\":\"Velocity\",\"tagline\":\"Cross-border payments infrastructure\",\"stage\":\"Series A\",\"burn\":180000,\"cash\":2520000,\"employees\":28,\"hq\":\"New York\",\"sector\":\"Payments\",\"color\":\"from-blue-500 to-indigo-600\",\"raising\":true,\"roundTarget\":15000000,\"founderPersonIds\":[\"p-marcus-chen\",\"p-sarah-okonkwo\"],\"founders\":[{\"name\":\"Marcus Chen\",\"role\":\"CEO\",\"bio\":\"Previously led payments at Stripe. Stanford MBA.\"},{\"name\":\"Sarah Okonkwo\",\"role\":\"CTO\",\"bio\":\"Former engineering lead at TransferWise. MIT CS.\"}],\"goals\":[{\"id\":\"v1\",\"type\":\"revenue\",\"name\":\"Q1 Revenue Target\",\"current\":850000,\"target\":1000000,\"due\":\"2026-03-31\",\"status\":\"active\",\"asOf\":\"2026-01-15T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"v2\",\"type\":\"product\",\"name\":\"API V2 Launch\",\"current\":80,\"target\":100,\"due\":\"2026-02-15\",\"status\":\"active\",\"asOf\":\"2026-01-18T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"v3\",\"type\":\"fundraise\",\"name\":\"Series A Close\",\"current\":8000000,\"target\":15000000,\"due\":\"2026-04-30\",\"status\":\"active\",\"asOf\":\"2026-01-20T00:00:00Z\",\"provenance\":\"manual\"}],\"deals\":[{\"id\":\"d-vel-1\",\"investorId\":\"i1\",\"investor\":\"Horizon Ventures\",\"status\":\"dd\",\"probability\":70,\"amount\":5000000,\"asOf\":\"2026-01-18T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"d-vel-2\",\"investorId\":\"i2\",\"investor\":\"Atlas Capital\",\"status\":\"meeting\",\"probability\":40,\"amount\":3000000,\"asOf\":\"2026-01-15T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"d-vel-3\",\"investorId\":\"i3\",\"investor\":\"Pinnacle Partners\",\"status\":\"termsheet\",\"probability\":85,\"amount\":7000000,\"asOf\":\"2026-01-19T00:00:00Z\",\"provenance\":\"manual\"}],\"asOf\":\"2026-01-20T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"nexgen\",\"name\":\"NexGen\",\"tagline\":\"AI-powered ERP for modern enterprises\",\"stage\":\"Series A\",\"burn\":150000,\"cash\":3300000,\"employees\":35,\"hq\":\"San Francisco\",\"sector\":\"Enterprise Software\",\"color\":\"from-emerald-500 to-teal-600\",\"raising\":false,\"roundTarget\":0,\"founderPersonIds\":[\"p-james-rodriguez\",\"p-priya-sharma\"],\"founders\":[{\"name\":\"James Rodriguez\",\"role\":\"CEO\",\"bio\":\"Ex-SAP product lead. Harvard Business School.\"},{\"name\":\"Priya Sharma\",\"role\":\"CTO\",\"bio\":\"Founded 2 AI startups (1 exit). Berkeley PhD.\"}],\"goals\":[{\"id\":\"n1\",\"type\":\"revenue\",\"name\":\"ARR Target\",\"current\":2200000,\"target\":3000000,\"due\":\"2026-06-30\",\"status\":\"active\",\"asOf\":\"2026-01-15T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"n2\",\"type\":\"hiring\",\"name\":\"Engineering Team\",\"current\":18,\"target\":25,\"due\":\"2026-03-31\",\"status\":\"active\",\"asOf\":\"2026-01-10T00:00:00Z\",\"provenance\":\"manual\"}],\"deals\":[],\"asOf\":\"2026-01-15T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"aurelius\",\"name\":\"Aurelius\",\"tagline\":\"Automated asset valuation platform\",\"stage\":\"Seed\",\"burn\":95000,\"cash\":760000,\"employees\":12,\"hq\":\"London\",\"sector\":\"Fintech\",\"color\":\"from-amber-500 to-orange-600\",\"raising\":true,\"roundTarget\":2000000,\"founderPersonIds\":[\"p-elena-vasquez\",\"p-david-kim\"],\"founders\":[{\"name\":\"Elena Vasquez\",\"role\":\"CEO\",\"bio\":\"Former Goldman Sachs VP. Oxford economics.\"},{\"name\":\"David Kim\",\"role\":\"CTO\",\"bio\":\"Ex-Google ML engineer. Carnegie Mellon.\"}],\"goals\":[{\"id\":\"a1\",\"type\":\"fundraise\",\"name\":\"Seed Extension\",\"current\":800000,\"target\":2000000,\"due\":\"2026-02-28\",\"status\":\"active\",\"asOf\":\"2026-01-18T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"a2\",\"type\":\"partnership\",\"name\":\"Bank Partnerships\",\"current\":2,\"target\":5,\"due\":\"2026-03-31\",\"status\":\"active\",\"asOf\":\"2026-01-12T00:00:00Z\",\"provenance\":\"manual\"}],\"deals\":[{\"id\":\"d-aur-1\",\"investorId\":\"i4\",\"investor\":\"Sterling Ventures\",\"status\":\"dd\",\"probability\":60,\"amount\":1000000,\"asOf\":\"2026-01-17T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"d-aur-2\",\"investorId\":\"i5\",\"investor\":\"Evergreen Capital\",\"status\":\"meeting\",\"probability\":35,\"amount\":500000,\"asOf\":\"2026-01-14T00:00:00Z\",\"provenance\":\"manual\"}],\"asOf\":\"2026-01-18T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"stratum\",\"name\":\"Stratum\",\"tagline\":\"NAV financing for fund managers\",\"stage\":\"Seed\",\"burn\":85000,\"cash\":1530000,\"employees\":15,\"hq\":\"Boston\",\"sector\":\"Fintech\",\"color\":\"from-purple-500 to-pink-600\",\"raising\":false,\"roundTarget\":0,\"founderPersonIds\":[\"p-michael-foster\",\"p-jennifer-wu\"],\"founders\":[{\"name\":\"Michael Foster\",\"role\":\"CEO\",\"bio\":\"Former PE partner at Blackstone. Wharton MBA.\"},{\"name\":\"Jennifer Wu\",\"role\":\"COO\",\"bio\":\"Ex-McKinsey principal. Yale Law.\"}],\"goals\":[{\"id\":\"s1\",\"type\":\"revenue\",\"name\":\"AUM Under Management\",\"current\":85000000,\"target\":150000000,\"due\":\"2026-06-30\",\"status\":\"active\",\"asOf\":\"2026-01-14T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"s2\",\"type\":\"product\",\"name\":\"Platform 2.0\",\"current\":65,\"target\":100,\"due\":\"2026-04-15\",\"status\":\"active\",\"asOf\":\"2026-01-16T00:00:00Z\",\"provenance\":\"manual\"}],\"deals\":[],\"asOf\":\"2026-01-16T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"prism\",\"name\":\"Prism\",\"tagline\":\"Agentic OS for engineering teams\",\"stage\":\"Pre-Seed\",\"burn\":70000,\"cash\":420000,\"employees\":8,\"hq\":\"Austin\",\"sector\":\"Developer Tools\",\"color\":\"from-red-500 to-rose-600\",\"raising\":true,\"roundTarget\":3000000,\"founderPersonIds\":[\"p-alex-turner\",\"p-nina-patel\"],\"founders\":[{\"name\":\"Alex Turner\",\"role\":\"CEO\",\"bio\":\"Former Uber engineering manager. Stanford CS.\"},{\"name\":\"Nina Patel\",\"role\":\"CTO\",\"bio\":\"Ex-GitHub staff engineer. Open source contributor.\"}],\"goals\":[{\"id\":\"p1\",\"type\":\"fundraise\",\"name\":\"Seed Round\",\"current\":500000,\"target\":3000000,\"due\":\"2026-02-15\",\"status\":\"active\",\"asOf\":\"2026-01-19T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p2\",\"type\":\"product\",\"name\":\"Beta Launch\",\"current\":90,\"target\":100,\"due\":\"2026-01-31\",\"status\":\"active\",\"asOf\":\"2026-01-20T00:00:00Z\",\"provenance\":\"manual\"}],\"deals\":[{\"id\":\"d-pri-1\",\"investorId\":\"i6\",\"investor\":\"Catalyst Ventures\",\"status\":\"termsheet\",\"probability\":75,\"amount\":2000000,\"asOf\":\"2026-01-18T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"d-pri-2\",\"investorId\":\"i7\",\"investor\":\"Founder Collective\",\"status\":\"dd\",\"probability\":50,\"amount\":500000,\"asOf\":\"2026-01-15T00:00:00Z\",\"provenance\":\"manual\"}],\"asOf\":\"2026-01-20T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"cascade\",\"name\":\"Cascade\",\"tagline\":\"Institutional stablecoin infrastructure\",\"stage\":\"Seed\",\"burn\":110000,\"cash\":1760000,\"employees\":18,\"hq\":\"Singapore\",\"sector\":\"Crypto\",\"color\":\"from-cyan-500 to-blue-600\",\"raising\":false,\"roundTarget\":0,\"founderPersonIds\":[\"p-ryan-lee\",\"p-yuki-tanaka\"],\"founders\":[{\"name\":\"Ryan Lee\",\"role\":\"CEO\",\"bio\":\"Co-founded Circle Asia. Previously at JPMorgan.\"},{\"name\":\"Yuki Tanaka\",\"role\":\"CTO\",\"bio\":\"Former Coinbase security lead. Blockchain expert.\"}],\"goals\":[{\"id\":\"c1\",\"type\":\"revenue\",\"name\":\"Monthly Volume\",\"current\":45000000,\"target\":100000000,\"due\":\"2026-06-30\",\"status\":\"active\",\"asOf\":\"2026-01-15T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"c2\",\"type\":\"partnership\",\"name\":\"Exchange Integrations\",\"current\":8,\"target\":15,\"due\":\"2026-04-30\",\"status\":\"active\",\"asOf\":\"2026-01-18T00:00:00Z\",\"provenance\":\"manual\"}],\"deals\":[],\"asOf\":\"2026-01-18T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"meridian\",\"name\":\"Meridian\",\"tagline\":\"Merchant stablecoin payment rails\",\"stage\":\"Seed\",\"burn\":90000,\"cash\":990000,\"employees\":14,\"hq\":\"Miami\",\"sector\":\"Payments\",\"color\":\"from-violet-500 to-purple-600\",\"raising\":false,\"roundTarget\":0,\"founderPersonIds\":[\"p-carlos-mendez\",\"p-lisa-chang\"],\"founders\":[{\"name\":\"Carlos Mendez\",\"role\":\"CEO\",\"bio\":\"Founded PayLatam (acquired). Stanford GSB.\"},{\"name\":\"Lisa Chang\",\"role\":\"CTO\",\"bio\":\"Former Square engineering director. UCLA.\"}],\"goals\":[{\"id\":\"m1\",\"type\":\"revenue\",\"name\":\"Merchant GMV\",\"current\":12000000,\"target\":25000000,\"due\":\"2026-03-31\",\"status\":\"active\",\"asOf\":\"2026-01-14T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"m2\",\"type\":\"operational\",\"name\":\"LATAM Expansion\",\"current\":40,\"target\":100,\"due\":\"2026-04-30\",\"status\":\"active\",\"asOf\":\"2026-01-16T00:00:00Z\",\"provenance\":\"manual\"}],\"deals\":[],\"asOf\":\"2026-01-16T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"sentinel\",\"name\":\"Sentinel\",\"tagline\":\"Autonomous software maintenance\",\"stage\":\"Pre-Seed\",\"burn\":60000,\"cash\":600000,\"employees\":6,\"hq\":\"Seattle\",\"sector\":\"Developer Tools\",\"color\":\"from-slate-500 to-gray-600\",\"raising\":true,\"roundTarget\":2500000,\"founderPersonIds\":[\"p-jordan-hayes\",\"p-sam-wilson\"],\"founders\":[{\"name\":\"Jordan Hayes\",\"role\":\"CEO\",\"bio\":\"Ex-Microsoft Azure PM. Carnegie Mellon MBA.\"},{\"name\":\"Sam Wilson\",\"role\":\"CTO\",\"bio\":\"Former AWS engineer. MIT AI Lab researcher.\"}],\"goals\":[{\"id\":\"se1\",\"type\":\"fundraise\",\"name\":\"Seed Round\",\"current\":750000,\"target\":2500000,\"due\":\"2026-03-15\",\"status\":\"active\",\"asOf\":\"2026-01-17T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"se2\",\"type\":\"product\",\"name\":\"Enterprise Pilot\",\"current\":2,\"target\":5,\"due\":\"2026-02-28\",\"status\":\"active\",\"asOf\":\"2026-01-19T00:00:00Z\",\"provenance\":\"manual\"}],\"deals\":[{\"id\":\"d-sen-1\",\"investorId\":\"i8\",\"investor\":\"Techstars Ventures\",\"status\":\"dd\",\"probability\":55,\"amount\":1000000,\"asOf\":\"2026-01-16T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"d-sen-2\",\"investorId\":\"i9\",\"investor\":\"Amplify Partners\",\"status\":\"meeting\",\"probability\":30,\"amount\":750000,\"asOf\":\"2026-01-14T00:00:00Z\",\"provenance\":\"manual\"}],\"asOf\":\"2026-01-19T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"harmonic\",\"name\":\"Harmonic\",\"tagline\":\"Payment infrastructure orchestration\",\"stage\":\"Seed\",\"burn\":100000,\"cash\":1500000,\"employees\":16,\"hq\":\"Chicago\",\"sector\":\"Payments\",\"color\":\"from-indigo-500 to-blue-600\",\"raising\":false,\"roundTarget\":0,\"founderPersonIds\":[\"p-rachel-kim\",\"p-tom-anderson\"],\"founders\":[{\"name\":\"Rachel Kim\",\"role\":\"CEO\",\"bio\":\"Ex-Plaid product director. Northwestern MBA.\"},{\"name\":\"Tom Anderson\",\"role\":\"CTO\",\"bio\":\"Former Stripe infrastructure engineer. Berkeley.\"}],\"goals\":[{\"id\":\"h1\",\"type\":\"revenue\",\"name\":\"MRR Target\",\"current\":180000,\"target\":250000,\"due\":\"2026-03-31\",\"status\":\"active\",\"asOf\":\"2026-01-15T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"h2\",\"type\":\"hiring\",\"name\":\"Go-to-Market Team\",\"current\":4,\"target\":8,\"due\":\"2026-04-30\",\"status\":\"active\",\"asOf\":\"2026-01-18T00:00:00Z\",\"provenance\":\"manual\"}],\"deals\":[],\"asOf\":\"2026-01-18T00:00:00Z\",\"provenance\":\"manual\"}],\"team\":[{\"id\":\"t1\",\"personId\":\"p-alex-thompson\",\"name\":\"Alex Thompson\",\"role\":\"Managing Partner\",\"bio\":\"Former Goldman Sachs MD and fintech investor at Andreessen Horowitz.\",\"avatar\":\"AT\",\"color\":\"from-indigo-500 to-purple-600\",\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"t2\",\"personId\":\"p-jessica-liu\",\"name\":\"Jessica Liu\",\"role\":\"Partner\",\"bio\":\"Previously founder of PayPath (acquired by Visa). 15 years in payments.\",\"avatar\":\"JL\",\"color\":\"from-emerald-500 to-teal-600\",\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"t3\",\"personId\":\"p-daniel-okafor\",\"name\":\"Daniel Okafor\",\"role\":\"Principal\",\"bio\":\"Former McKinsey engagement manager. Harvard MBA.\",\"avatar\":\"DO\",\"color\":\"from-amber-500 to-orange-600\",\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"t4\",\"personId\":\"p-maria-santos\",\"name\":\"Maria Santos\",\"role\":\"VP Operations\",\"bio\":\"Previously COO at Series B fintech startup.\",\"avatar\":\"MS\",\"color\":\"from-pink-500 to-rose-600\",\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"t5\",\"personId\":\"p-kevin-park\",\"name\":\"Kevin Park\",\"role\":\"Associate\",\"bio\":\"Former product manager at Stripe. Stanford CS and MBA.\",\"avatar\":\"KP\",\"color\":\"from-cyan-500 to-blue-600\",\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"}],\"investors\":[{\"id\":\"i1\",\"personId\":\"p-inv-horizon\",\"name\":\"Horizon Ventures\",\"aum\":\"2.5B\",\"stageFocus\":\"Series A-B\",\"sectorFocus\":\"Fintech, Enterprise\",\"deals\":[\"velocity\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"i2\",\"personId\":\"p-inv-atlas\",\"name\":\"Atlas Capital\",\"aum\":\"800M\",\"stageFocus\":\"Seed-Series A\",\"sectorFocus\":\"B2B SaaS, Fintech\",\"deals\":[\"velocity\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"i3\",\"personId\":\"p-inv-pinnacle\",\"name\":\"Pinnacle Partners\",\"aum\":\"1.8B\",\"stageFocus\":\"Series A-C\",\"sectorFocus\":\"Financial Infrastructure\",\"deals\":[\"velocity\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"i4\",\"personId\":\"p-inv-sterling\",\"name\":\"Sterling Ventures\",\"aum\":\"500M\",\"stageFocus\":\"Seed\",\"sectorFocus\":\"Fintech, Insurtech\",\"deals\":[\"aurelius\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"i5\",\"personId\":\"p-inv-evergreen\",\"name\":\"Evergreen Capital\",\"aum\":\"350M\",\"stageFocus\":\"Pre-Seed-Seed\",\"sectorFocus\":\"Enterprise, Fintech\",\"deals\":[\"aurelius\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"i6\",\"personId\":\"p-inv-catalyst\",\"name\":\"Catalyst Ventures\",\"aum\":\"600M\",\"stageFocus\":\"Pre-Seed-Series A\",\"sectorFocus\":\"Developer Tools, AI\",\"deals\":[\"prism\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"i7\",\"personId\":\"p-inv-founder\",\"name\":\"Founder Collective\",\"aum\":\"400M\",\"stageFocus\":\"Pre-Seed-Seed\",\"sectorFocus\":\"Generalist\",\"deals\":[\"prism\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"i8\",\"personId\":\"p-inv-techstars\",\"name\":\"Techstars Ventures\",\"aum\":\"300M\",\"stageFocus\":\"Pre-Seed-Seed\",\"sectorFocus\":\"Developer Tools, B2B\",\"deals\":[\"sentinel\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"i9\",\"personId\":\"p-inv-amplify\",\"name\":\"Amplify Partners\",\"aum\":\"450M\",\"stageFocus\":\"Seed-Series A\",\"sectorFocus\":\"Enterprise Infrastructure\",\"deals\":[\"sentinel\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"}],\"people\":[{\"id\":\"p-alex-thompson\",\"name\":\"Alex Thompson\",\"orgId\":\"backbone\",\"orgType\":\"fund\",\"role\":\"Managing Partner\",\"tags\":[\"fintech\",\"payments\",\"enterprise\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-jessica-liu\",\"name\":\"Jessica Liu\",\"orgId\":\"backbone\",\"orgType\":\"fund\",\"role\":\"Partner\",\"tags\":[\"payments\",\"infrastructure\",\"founder\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-daniel-okafor\",\"name\":\"Daniel Okafor\",\"orgId\":\"backbone\",\"orgType\":\"fund\",\"role\":\"Principal\",\"tags\":[\"fintech\",\"consulting\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-maria-santos\",\"name\":\"Maria Santos\",\"orgId\":\"backbone\",\"orgType\":\"fund\",\"role\":\"VP Operations\",\"tags\":[\"operations\",\"portfolio-support\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-kevin-park\",\"name\":\"Kevin Park\",\"orgId\":\"backbone\",\"orgType\":\"fund\",\"role\":\"Associate\",\"tags\":[\"developer-tools\",\"infrastructure\",\"product\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-marcus-chen\",\"name\":\"Marcus Chen\",\"orgId\":\"velocity\",\"orgType\":\"company\",\"role\":\"CEO\",\"tags\":[\"payments\",\"stripe\",\"stanford\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-sarah-okonkwo\",\"name\":\"Sarah Okonkwo\",\"orgId\":\"velocity\",\"orgType\":\"company\",\"role\":\"CTO\",\"tags\":[\"engineering\",\"transferwise\",\"mit\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-james-rodriguez\",\"name\":\"James Rodriguez\",\"orgId\":\"nexgen\",\"orgType\":\"company\",\"role\":\"CEO\",\"tags\":[\"enterprise\",\"sap\",\"harvard\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-priya-sharma\",\"name\":\"Priya Sharma\",\"orgId\":\"nexgen\",\"orgType\":\"company\",\"role\":\"CTO\",\"tags\":[\"ai\",\"founder\",\"berkeley\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-elena-vasquez\",\"name\":\"Elena Vasquez\",\"orgId\":\"aurelius\",\"orgType\":\"company\",\"role\":\"CEO\",\"tags\":[\"fintech\",\"goldman\",\"oxford\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-david-kim\",\"name\":\"David Kim\",\"orgId\":\"aurelius\",\"orgType\":\"company\",\"role\":\"CTO\",\"tags\":[\"ml\",\"google\",\"cmu\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-michael-foster\",\"name\":\"Michael Foster\",\"orgId\":\"stratum\",\"orgType\":\"company\",\"role\":\"CEO\",\"tags\":[\"pe\",\"blackstone\",\"wharton\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-jennifer-wu\",\"name\":\"Jennifer Wu\",\"orgId\":\"stratum\",\"orgType\":\"company\",\"role\":\"COO\",\"tags\":[\"consulting\",\"mckinsey\",\"yale\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-alex-turner\",\"name\":\"Alex Turner\",\"orgId\":\"prism\",\"orgType\":\"company\",\"role\":\"CEO\",\"tags\":[\"developer-tools\",\"uber\",\"stanford\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-nina-patel\",\"name\":\"Nina Patel\",\"orgId\":\"prism\",\"orgType\":\"company\",\"role\":\"CTO\",\"tags\":[\"github\",\"open-source\",\"engineering\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-ryan-lee\",\"name\":\"Ryan Lee\",\"orgId\":\"cascade\",\"orgType\":\"company\",\"role\":\"CEO\",\"tags\":[\"crypto\",\"circle\",\"jpmorgan\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-yuki-tanaka\",\"name\":\"Yuki Tanaka\",\"orgId\":\"cascade\",\"orgType\":\"company\",\"role\":\"CTO\",\"tags\":[\"security\",\"coinbase\",\"blockchain\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-carlos-mendez\",\"name\":\"Carlos Mendez\",\"orgId\":\"meridian\",\"orgType\":\"company\",\"role\":\"CEO\",\"tags\":[\"payments\",\"latam\",\"founder\",\"stanford\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-lisa-chang\",\"name\":\"Lisa Chang\",\"orgId\":\"meridian\",\"orgType\":\"company\",\"role\":\"CTO\",\"tags\":[\"square\",\"engineering\",\"ucla\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-jordan-hayes\",\"name\":\"Jordan Hayes\",\"orgId\":\"sentinel\",\"orgType\":\"company\",\"role\":\"CEO\",\"tags\":[\"microsoft\",\"azure\",\"cmu\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-sam-wilson\",\"name\":\"Sam Wilson\",\"orgId\":\"sentinel\",\"orgType\":\"company\",\"role\":\"CTO\",\"tags\":[\"aws\",\"ai\",\"mit\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-rachel-kim\",\"name\":\"Rachel Kim\",\"orgId\":\"harmonic\",\"orgType\":\"company\",\"role\":\"CEO\",\"tags\":[\"plaid\",\"product\",\"northwestern\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-tom-anderson\",\"name\":\"Tom Anderson\",\"orgId\":\"harmonic\",\"orgType\":\"company\",\"role\":\"CTO\",\"tags\":[\"stripe\",\"infrastructure\",\"berkeley\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-inv-horizon\",\"name\":\"David Park (Horizon)\",\"orgId\":\"i1\",\"orgType\":\"investor\",\"role\":\"Partner\",\"tags\":[\"fintech\",\"series-a\",\"enterprise\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-inv-atlas\",\"name\":\"Michelle Wong (Atlas)\",\"orgId\":\"i2\",\"orgType\":\"investor\",\"role\":\"Partner\",\"tags\":[\"saas\",\"fintech\",\"seed\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-inv-pinnacle\",\"name\":\"Robert Chen (Pinnacle)\",\"orgId\":\"i3\",\"orgType\":\"investor\",\"role\":\"Managing Partner\",\"tags\":[\"infrastructure\",\"growth\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-inv-sterling\",\"name\":\"Amanda Foster (Sterling)\",\"orgId\":\"i4\",\"orgType\":\"investor\",\"role\":\"Partner\",\"tags\":[\"fintech\",\"insurtech\",\"seed\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-inv-evergreen\",\"name\":\"James Liu (Evergreen)\",\"orgId\":\"i5\",\"orgType\":\"investor\",\"role\":\"Partner\",\"tags\":[\"enterprise\",\"fintech\",\"pre-seed\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-inv-catalyst\",\"name\":\"Sarah Martinez (Catalyst)\",\"orgId\":\"i6\",\"orgType\":\"investor\",\"role\":\"Partner\",\"tags\":[\"developer-tools\",\"ai\",\"seed\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-inv-founder\",\"name\":\"Eric Kim (Founder Collective)\",\"orgId\":\"i7\",\"orgType\":\"investor\",\"role\":\"Partner\",\"tags\":[\"generalist\",\"pre-seed\",\"founder-friendly\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-inv-techstars\",\"name\":\"Lisa Park (Techstars)\",\"orgId\":\"i8\",\"orgType\":\"investor\",\"role\":\"Partner\",\"tags\":[\"developer-tools\",\"b2b\",\"accelerator\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-inv-amplify\",\"name\":\"Michael Chang (Amplify)\",\"orgId\":\"i9\",\"orgType\":\"investor\",\"role\":\"Partner\",\"tags\":[\"infrastructure\",\"enterprise\",\"seed\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-ext-stripe-cto\",\"name\":\"David Singleton\",\"orgId\":\"stripe\",\"orgType\":\"external\",\"role\":\"CTO\",\"tags\":[\"payments\",\"infrastructure\",\"engineering\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-ext-plaid-ceo\",\"name\":\"Zach Perret\",\"orgId\":\"plaid\",\"orgType\":\"external\",\"role\":\"CEO\",\"tags\":[\"fintech\",\"infrastructure\",\"founder\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"},{\"id\":\"p-ext-sequoia\",\"name\":\"Alfred Lin (Sequoia)\",\"orgId\":\"sequoia\",\"orgType\":\"external\",\"role\":\"Partner\",\"tags\":[\"growth\",\"enterprise\",\"series-b\"],\"asOf\":\"2026-01-01T00:00:00Z\",\"provenance\":\"manual\"}],\"relationships\":[{\"id\":\"r1\",\"fromPersonId\":\"p-alex-thompson\",\"toPersonId\":\"p-marcus-chen\",\"relationshipType\":\"board\",\"strength\":90,\"lastTouchAt\":\"2026-01-18T00:00:00Z\",\"channel\":\"in-person\",\"provenance\":\"manual\",\"introCount\":3,\"introSuccessCount\":2},{\"id\":\"r2\",\"fromPersonId\":\"p-alex-thompson\",\"toPersonId\":\"p-inv-horizon\",\"relationshipType\":\"professional\",\"strength\":85,\"lastTouchAt\":\"2026-01-10T00:00:00Z\",\"channel\":\"email\",\"provenance\":\"manual\",\"introCount\":5,\"introSuccessCount\":4},{\"id\":\"r3\",\"fromPersonId\":\"p-alex-thompson\",\"toPersonId\":\"p-inv-pinnacle\",\"relationshipType\":\"professional\",\"strength\":75,\"lastTouchAt\":\"2025-12-15T00:00:00Z\",\"channel\":\"phone\",\"provenance\":\"manual\",\"introCount\":2,\"introSuccessCount\":2},{\"id\":\"r4\",\"fromPersonId\":\"p-alex-thompson\",\"toPersonId\":\"p-ext-sequoia\",\"relationshipType\":\"professional\",\"strength\":70,\"lastTouchAt\":\"2025-11-20T00:00:00Z\",\"channel\":\"conference\",\"provenance\":\"manual\",\"introCount\":1,\"introSuccessCount\":1},{\"id\":\"r5\",\"fromPersonId\":\"p-jessica-liu\",\"toPersonId\":\"p-rachel-kim\",\"relationshipType\":\"board\",\"strength\":88,\"lastTouchAt\":\"2026-01-15T00:00:00Z\",\"channel\":\"in-person\",\"provenance\":\"manual\",\"introCount\":2,\"introSuccessCount\":2},{\"id\":\"r6\",\"fromPersonId\":\"p-jessica-liu\",\"toPersonId\":\"p-carlos-mendez\",\"relationshipType\":\"board\",\"strength\":85,\"lastTouchAt\":\"2026-01-12T00:00:00Z\",\"channel\":\"video\",\"provenance\":\"manual\",\"introCount\":1,\"introSuccessCount\":1},{\"id\":\"r7\",\"fromPersonId\":\"p-jessica-liu\",\"toPersonId\":\"p-ext-stripe-cto\",\"relationshipType\":\"professional\",\"strength\":80,\"lastTouchAt\":\"2025-12-20T00:00:00Z\",\"channel\":\"email\",\"provenance\":\"manual\",\"introCount\":4,\"introSuccessCount\":3},{\"id\":\"r8\",\"fromPersonId\":\"p-jessica-liu\",\"toPersonId\":\"p-ext-plaid-ceo\",\"relationshipType\":\"professional\",\"strength\":75,\"lastTouchAt\":\"2025-11-30T00:00:00Z\",\"channel\":\"conference\",\"provenance\":\"manual\",\"introCount\":2,\"introSuccessCount\":2},{\"id\":\"r9\",\"fromPersonId\":\"p-daniel-okafor\",\"toPersonId\":\"p-elena-vasquez\",\"relationshipType\":\"board\",\"strength\":82,\"lastTouchAt\":\"2026-01-17T00:00:00Z\",\"channel\":\"in-person\",\"provenance\":\"manual\",\"introCount\":1,\"introSuccessCount\":1},{\"id\":\"r10\",\"fromPersonId\":\"p-daniel-okafor\",\"toPersonId\":\"p-inv-sterling\",\"relationshipType\":\"professional\",\"strength\":65,\"lastTouchAt\":\"2026-01-05T00:00:00Z\",\"channel\":\"email\",\"provenance\":\"manual\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r11\",\"fromPersonId\":\"p-daniel-okafor\",\"toPersonId\":\"p-jennifer-wu\",\"relationshipType\":\"alumni\",\"strength\":70,\"lastTouchAt\":\"2025-10-15T00:00:00Z\",\"channel\":\"linkedin\",\"provenance\":\"manual\",\"notes\":\"McKinsey overlap\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r12\",\"fromPersonId\":\"p-kevin-park\",\"toPersonId\":\"p-alex-turner\",\"relationshipType\":\"board\",\"strength\":78,\"lastTouchAt\":\"2026-01-19T00:00:00Z\",\"channel\":\"video\",\"provenance\":\"manual\",\"introCount\":2,\"introSuccessCount\":1},{\"id\":\"r13\",\"fromPersonId\":\"p-kevin-park\",\"toPersonId\":\"p-jordan-hayes\",\"relationshipType\":\"board\",\"strength\":75,\"lastTouchAt\":\"2026-01-16T00:00:00Z\",\"channel\":\"video\",\"provenance\":\"manual\",\"introCount\":1,\"introSuccessCount\":0},{\"id\":\"r14\",\"fromPersonId\":\"p-kevin-park\",\"toPersonId\":\"p-inv-catalyst\",\"relationshipType\":\"professional\",\"strength\":72,\"lastTouchAt\":\"2026-01-08T00:00:00Z\",\"channel\":\"email\",\"provenance\":\"manual\",\"introCount\":1,\"introSuccessCount\":1},{\"id\":\"r15\",\"fromPersonId\":\"p-kevin-park\",\"toPersonId\":\"p-tom-anderson\",\"relationshipType\":\"alumni\",\"strength\":68,\"lastTouchAt\":\"2025-09-20T00:00:00Z\",\"channel\":\"linkedin\",\"provenance\":\"manual\",\"notes\":\"Stripe overlap\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r16\",\"fromPersonId\":\"p-marcus-chen\",\"toPersonId\":\"p-ext-stripe-cto\",\"relationshipType\":\"former-colleague\",\"strength\":85,\"lastTouchAt\":\"2026-01-05T00:00:00Z\",\"channel\":\"email\",\"provenance\":\"manual\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r17\",\"fromPersonId\":\"p-marcus-chen\",\"toPersonId\":\"p-tom-anderson\",\"relationshipType\":\"professional\",\"strength\":60,\"lastTouchAt\":\"2025-08-10T00:00:00Z\",\"channel\":\"conference\",\"provenance\":\"manual\",\"notes\":\"Met at Fintech Summit\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r18\",\"fromPersonId\":\"p-sarah-okonkwo\",\"toPersonId\":\"p-lisa-chang\",\"relationshipType\":\"professional\",\"strength\":55,\"lastTouchAt\":\"2025-07-15T00:00:00Z\",\"channel\":\"conference\",\"provenance\":\"manual\",\"notes\":\"Engineering meetup\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r19\",\"fromPersonId\":\"p-elena-vasquez\",\"toPersonId\":\"p-michael-foster\",\"relationshipType\":\"professional\",\"strength\":50,\"lastTouchAt\":\"2025-06-20T00:00:00Z\",\"channel\":\"linkedin\",\"provenance\":\"manual\",\"notes\":\"Both ex-finance\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r20\",\"fromPersonId\":\"p-priya-sharma\",\"toPersonId\":\"p-david-kim\",\"relationshipType\":\"alumni\",\"strength\":45,\"lastTouchAt\":\"2025-05-10T00:00:00Z\",\"channel\":\"email\",\"provenance\":\"manual\",\"notes\":\"AI conference connection\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r21\",\"fromPersonId\":\"p-ryan-lee\",\"toPersonId\":\"p-carlos-mendez\",\"relationshipType\":\"professional\",\"strength\":65,\"lastTouchAt\":\"2025-12-01T00:00:00Z\",\"channel\":\"video\",\"provenance\":\"manual\",\"notes\":\"Exploring partnership\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r22\",\"fromPersonId\":\"p-alex-thompson\",\"toPersonId\":\"p-ext-plaid-ceo\",\"relationshipType\":\"professional\",\"strength\":60,\"lastTouchAt\":\"2025-09-15T00:00:00Z\",\"channel\":\"email\",\"provenance\":\"manual\",\"introCount\":1,\"introSuccessCount\":0},{\"id\":\"r23\",\"fromPersonId\":\"p-inv-catalyst\",\"toPersonId\":\"p-inv-techstars\",\"relationshipType\":\"co-investor\",\"strength\":70,\"lastTouchAt\":\"2025-11-10T00:00:00Z\",\"channel\":\"email\",\"provenance\":\"manual\",\"notes\":\"Co-invested in 2 deals\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r24\",\"fromPersonId\":\"p-nina-patel\",\"toPersonId\":\"p-sam-wilson\",\"relationshipType\":\"professional\",\"strength\":55,\"lastTouchAt\":\"2025-10-05T00:00:00Z\",\"channel\":\"github\",\"provenance\":\"manual\",\"notes\":\"Open source collab\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r25\",\"fromPersonId\":\"p-maria-santos\",\"toPersonId\":\"p-james-rodriguez\",\"relationshipType\":\"board\",\"strength\":80,\"lastTouchAt\":\"2026-01-10T00:00:00Z\",\"channel\":\"in-person\",\"provenance\":\"manual\",\"introCount\":0,\"introSuccessCount\":0},{\"id\":\"r26\",\"fromPersonId\":\"p-maria-santos\",\"toPersonId\":\"p-ryan-lee\",\"relationshipType\":\"board\",\"strength\":78,\"lastTouchAt\":\"2026-01-14T00:00:00Z\",\"channel\":\"video\",\"provenance\":\"manual\",\"introCount\":1,\"introSuccessCount\":1},{\"id\":\"r27\",\"fromPersonId\":\"p-maria-santos\",\"toPersonId\":\"p-michael-foster\",\"relationshipType\":\"board\",\"strength\":76,\"lastTouchAt\":\"2026-01-08T00:00:00Z\",\"channel\":\"video\",\"provenance\":\"manual\",\"introCount\":0,\"introSuccessCount\":0}]}"));}),
"[project]/backbone-v9/ui/pages/api/actions/today.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>handler
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$engine$2e$js__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/runtime/engine.js [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$raw$2f$sample$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/backbone-v9/ui/raw/sample.json (json)");
;
;
;
// Parse date strings recursively throughout the entire object tree
function parseDates(obj) {
    if (!obj) return obj;
    if (Array.isArray(obj)) return obj.map(parseDates);
    if (typeof obj !== 'object') {
        // Check if this string looks like an ISO date
        if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(obj)) {
            return new Date(obj);
        }
        return obj;
    }
    const parsed = {};
    for (const [key, value] of Object.entries(obj)){
        parsed[key] = parseDates(value);
    }
    return parsed;
}
async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }
    try {
        const rawData = parseDates(__TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$raw$2f$sample$2e$json__$28$json$29$__["default"]);
        const now = new Date(); // Ensure now is always a Date object
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$backbone$2d$v9$2f$ui$2f$runtime$2f$engine$2e$js__$5b$api$5d$__$28$ecmascript$29$__["compute"])(rawData, now);
        const today = result.todayActions || [];
        return res.status(200).json({
            actions: today,
            metadata: {
                total: today.length,
                timestamp: now.toISOString()
            }
        });
    } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
            stack: ("TURBOPACK compile-time truthy", 1) ? err.stack : "TURBOPACK unreachable"
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__5f325e96._.js.map