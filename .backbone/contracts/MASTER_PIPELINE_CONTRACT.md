# MASTER_PIPELINE_CONTRACT.md

**Objective**: Rebuild the core pipeline so that goals and metrics are the only inputs, anomalies are the bridge, and rankScore is the only output. Eliminates the issue/preissue layer as an action source. Completes metric coverage. Enforces action diversity via a templatised goal-type-to-category system.

**Target pipeline**:

```
RAW INPUTS (hardcoded, immutable)
├── 18 raw metrics per company (100% fill rate)
└── min 5 goals per company (typed, with cur/tgt/weight)
         │
         ▼
STAGE PARAMS (contextual norms by stage)
         │
         ▼
ANOMALY DETECTION (goal-gap severity)
  "where are we furthest from our goals?"
  anomaly = f(metric_actual, goal_target, stageParams_bounds)
         │
         ▼
ACTION GENERATION (3 per goal, from distinct categories)
  each goal type declares 3 categories
  one action per category — enforced structurally
         │
         ▼
RANK SCORE (single surface)
  rankScore = impact of action on closing the goal gap
  upside = goalWeight × Δprobability(goal | action)
```

**Target numbers**: 20 companies × 5+ goals × 3 actions = 300+ total actions. Every action has a goalId. Every action has a category. No action sourced from issue/preissue.

---

## What Gets Cut

- `issues.js` and `preissues.js` **as action sources** — they may survive for diagnostic display but do NOT feed the ranking pipeline
- The doctrine "Goals never generate actions" — **reversed**: goals are now the ONLY thing that generates actions
- `PREVENTATIVE_RESOLUTIONS` in actionCandidates.js as an action source
- Variable action counts per company — replaced by deterministic 5 goals × 3 actions

## What Gets Repurposed

- `anomalyDetection.js` — extended to cover all 18 metrics, reframed as goal-gap severity
- `stageParams.js` — extended with bounds for currently uncovered fields
- `ranking.js` / `impact.js` — rankScore formula stays, impact model now weights by goal gap severity × goal weight
- `GOAL_TYPES` + `goalSchema.js` — becomes the template registry
- `actionCandidates.js` — rewritten to iterate goals, not issues/preissues
- `GOAL_RESOLUTIONS` — absorbed into the new goal-type × category template system
- `actionCategories.js` — extended with new resolutionIds from the template system

## What Gets Created

- `packages/core/predict/goalFromAnomaly.js` — maps anomalies to goal candidates, selects top 5
- `packages/core/predict/goalActions.js` — generates 3 actions per goal from distinct categories
- New QA gate: goal coverage (5 goals × 3 actions, category diversity)

---

## Phase 1: stageParams bounds for all 18 metrics

**Files**: `packages/core/raw/stageParams.js`

### 1a. Add bounds for uncovered fields

Add to each stage in STAGE_PARAMS:

```
Field               Pre-seed    Seed        Series A    Series B    Series C    Series D
raisedToDateMin     0           500K        2M          10M         30M         80M
raisedToDateMax     2M          10M         30M         80M         200M        500M
lastRaiseAmountMin  0           500K        2M          10M         20M         50M
lastRaiseAmountMax  2M          5M          15M         50M         100M        200M
foundedYearsMin     0           0           1           2           3           4
foundedYearsMax     2           4           6           8           12          15
```

### 1b. Verify existing bounds

Confirm all 18 fields now have min/max in every stage: `arr`, `burn`, `cash`, `employees`, `cac`, `nrr`, `grr`, `logo_retention`, `target_headcount`, `open_positions`, `paying_customers`, `acv`, `gross_margin`, `nps`, `raising`, `roundTarget`, `raised_to_date`, `last_raise_amount`, `founded`.

**Acceptance**: Every stage has bounds for every metric field. Existing bounds unchanged.

---

## Phase 2: Complete anomaly detection for all 18 metrics

**File**: `packages/core/derive/anomalyDetection.js`

### 2a. New ANOMALY_TYPES

Add:
```javascript
GRR_BELOW_THRESHOLD
NPS_BELOW_THRESHOLD
OPEN_POSITIONS_ABOVE_MAX
PAYING_CUSTOMERS_BELOW_MIN
ACV_BELOW_MIN
ACV_ABOVE_MAX
RAISED_TO_DATE_LOW
LAST_RAISE_UNDERSIZE
COMPANY_AGE_STAGE_MISMATCH
```

### 2b. TOLERANCE_CONFIG entries

Add for: `grr`, `nps`, `open_positions`, `paying_customers`, `acv`, `raised_to_date`, `last_raise_amount`, `founded`. Standard: `{ innerTolerance: 0.15, outerTolerance: 0.20, symmetric: false }`.

### 2c. Detector functions

Follow existing `checkBoundFeathered()` pattern:

1. `detectGrrAnomalies(company, params)` — GRR below grrMin. Skip if null.
2. `detectNpsAnomalies(company, params)` — NPS below npsMin. Skip if null.
3. `detectOpenPositionsAnomalies(company, params)` — open_positions > openPositionsMax.
4. `detectPayingCustomersAnomalies(company, params)` — paying_customers < payingCustomersMin. Skip if min is 0.
5. `detectAcvAnomalies(company, params)` — acv < acvMin OR acv > acvMax. Two anomaly types.
6. `detectRaisedToDateAnomalies(company, params)` — raised_to_date < raisedToDateMin.
7. `detectLastRaiseAnomalies(company, params)` — last_raise_amount < lastRaiseAmountMin.
8. `detectAgeAnomalies(company, params, now)` — years since `founded` outside foundedYearsMin/Max.

### 2d. Wire into detectAnomalies()

Add all 8 new detector calls after existing calls.

**Acceptance**: `detectAnomalies()` on a company with out-of-bounds values for any field returns the correct anomaly type. Existing anomaly types unchanged. Every metric field has a detector path.

---

## Phase 3: Goal types + anomaly-to-goal mapping

### 3a. New goal types in goalSchema.js

**File**: `packages/core/raw/goalSchema.js`

Add to GOAL_TYPES:
```javascript
retention: {
  name: 'Retention',
  entities: ['company'],
  metrics: ['nrr', 'grr', 'logo_retention'],
  description: 'Customer retention improvement',
},
efficiency: {
  name: 'Unit Economics',
  entities: ['company'],
  metrics: ['cac', 'gross_margin', 'acv'],
  description: 'Unit economics optimization',
},
customer_growth: {
  name: 'Customer Growth',
  entities: ['company'],
  metrics: ['paying_customers', 'nps'],
  description: 'Customer base expansion and satisfaction',
},
```

### 3b. Complete ANOMALY_TO_GOAL_MAP

**File**: `packages/core/predict/suggestedGoals.js`

Add SUGGESTION_TYPES and ANOMALY_TO_GOAL_MAP entries for every unmapped anomaly type:

```
ANOMALY_TYPE                   → SUGGESTION_TYPE          → GOAL_TYPE
CAC_ABOVE_THRESHOLD            → REDUCE_CAC              → efficiency
NRR_BELOW_THRESHOLD            → IMPROVE_NRR             → retention
GRR_BELOW_THRESHOLD            → IMPROVE_GRR             → retention
GROSS_MARGIN_BELOW_THRESHOLD   → IMPROVE_GROSS_MARGIN    → efficiency
LOGO_RETENTION_LOW             → IMPROVE_RETENTION        → retention
HIRING_PLAN_BEHIND             → ACCELERATE_HIRING        → hiring
NPS_BELOW_THRESHOLD            → IMPROVE_NPS             → customer_growth
OPEN_POSITIONS_ABOVE_MAX       → RIGHT_SIZE_HIRING_PLAN  → hiring
PAYING_CUSTOMERS_BELOW_MIN     → GROW_CUSTOMER_BASE      → customer_growth
ACV_BELOW_MIN                  → OPTIMIZE_ACV            → efficiency
ACV_ABOVE_MAX                  → DIVERSIFY_CUSTOMERS     → customer_growth
RAISED_TO_DATE_LOW             → RAISE_MORE_CAPITAL      → fundraise
LAST_RAISE_UNDERSIZE           → RIGHT_SIZE_ROUND        → fundraise
COMPANY_AGE_STAGE_MISMATCH     → REVIEW_STAGE_FIT        → operational
```

Each entry has: suggestionType, goalType, nameTemplate, targetFromEvidence, priority, rationale. Follow exact pattern of existing entries.

**Acceptance**: Every ANOMALY_TYPE has a corresponding ANOMALY_TO_GOAL_MAP entry. No orphan anomaly types.

---

## Phase 4: Goal-driven action generation (engine core)

This is the central refactor. Goals become the sole source of actions.

### 4a. CREATE `packages/core/predict/goalFromAnomaly.js`

Functions:

```javascript
/**
 * mapAnomaliesToGoals(anomalies, company)
 * Uses ANOMALY_TO_GOAL_MAP to create goal candidates from anomalies.
 * Each anomaly → one goal candidate with: id, name, type, companyId,
 * source ('anomaly'), sourceAnomaly, cur, tgt, status, due, weight.
 */

/**
 * selectTopGoals(existingGoals, anomalyGoals, templateGoals, minCount)
 * Selects at least minCount goals. Priority order:
 *   1. Existing raw goals that are active/at_risk (these are hardcoded inputs)
 *   2. Anomaly-driven goals sorted by severity (desc)
 *   3. Stage template goals as padding
 * Deduplicates by goal type — at most 2 of same type.
 * If fewer than minCount candidates, pad with templates.
 * Returns >= minCount goals.
 */
```

### 4b. CREATE `packages/core/predict/goalActions.js`

This is the templatised category system. Each goal type declares which 3 action categories it draws from:

```javascript
export const GOAL_CATEGORY_MAP = {
  revenue:              ['growth',     'pipeline',   'data'],
  fundraise:            ['fundraise',  'pipeline',   'intros'],
  hiring:               ['goals',      'growth',     'data'],
  product:              ['goals',      'growth',     'data'],
  operational:          ['financial',  'goals',      'data'],
  partnership:          ['intros',     'pipeline',   'goals'],
  retention:            ['goals',      'growth',     'financial'],
  efficiency:           ['financial',  'goals',      'growth'],
  customer_growth:      ['growth',     'goals',      'pipeline'],
  intro_target:         ['intros',     'pipeline',   'goals'],
  deal_close:           ['pipeline',   'fundraise',  'intros'],
  round_completion:     ['fundraise',  'pipeline',   'financial'],
  investor_activation:  ['intros',     'pipeline',   'fundraise'],
  champion_cultivation: ['intros',     'goals',      'pipeline'],
  relationship_build:   ['intros',     'goals',      'pipeline'],
};
```

Core function:
```javascript
export function generateActionsForGoal(goal, company, categoryTriple) {
  // Returns exactly 3 actions, one per category
  // categoryTriple from GOAL_CATEGORY_MAP[goal.type]
  return categoryTriple.map((category, idx) => {
    const template = getActionTemplate(goal.type, category, company);
    return {
      actionId: `${goal.id}-act-${category}`,
      goalId: goal.id,
      goalName: goal.name,
      goalType: goal.type,
      companyId: company.id,
      companyName: company.name,
      category,
      resolutionId: template.resolutionId,
      title: template.title,
      steps: template.steps,
      effort: template.effort,
      isPrimary: idx === 0,
      sources: [{ sourceType: 'GOAL', sourceId: goal.id, goalId: goal.id }],
      entityRef: { type: 'company', id: company.id, name: company.name },
    };
  });
}
```

`getActionTemplate(goalType, category, company)` returns a resolution template for each goal-type × category combination. Total: ~45 combinations (15 goal types × 3 categories). Each needs: resolutionId, title template, 2-4 action steps, effort estimate.

**Resolution ID naming convention**: `{GOAL_TYPE}_{CATEGORY}` — e.g. `REVENUE_GROWTH`, `REVENUE_PIPELINE`, `REVENUE_DATA`, `FUNDRAISE_FUNDRAISE`, `FUNDRAISE_PIPELINE`, `FUNDRAISE_INTROS`, etc.

Reuse existing resolutions where they map cleanly:
- `REVENUE_PUSH` → `REVENUE_GROWTH`
- `ACCELERATE_FUNDRAISE` → `FUNDRAISE_FUNDRAISE`
- `REDUCE_BURN` → `OPERATIONAL_FINANCIAL`
- `ACCELERATE_GOAL` → generic `{TYPE}_GOALS` fallback
- `INTRODUCTION` → `{TYPE}_INTROS` fallback
- `PRODUCT_SPRINT` → `PRODUCT_GROWTH`

### 4c. Rewire engine DAG

**File**: `packages/core/runtime/engine.js`

Replace the `actionCandidates` step to source from goals:

```javascript
actionCandidates: (ctx, company, now) => {
  // 1. Get active goals (from raw data — these are the hardcoded inputs)
  const rawGoals = company.goals || [];

  // 2. Detect anomalies on augmented company
  const snapshot = ctx.snapshot;
  const augmented = snapshot?.metrics ? { ...company, ...snapshot.metrics } : company;
  const anomalies = detectAnomalies(augmented, now);

  // 3. Map anomalies to goal candidates
  const anomalyGoals = mapAnomaliesToGoals(anomalies.anomalies, company);

  // 4. Get stage template goals for padding
  const templateGoals = getStageGoals(company.stage);

  // 5. Select top goals (min 5): raw first, anomaly second, templates third
  const activeGoals = selectTopGoals(rawGoals, anomalyGoals, templateGoals, 5);

  // 6. Generate 3 actions per goal from distinct categories
  const allActions = [];
  for (const goal of activeGoals) {
    const categoryTriple = GOAL_CATEGORY_MAP[goal.type] || ['goals', 'data', 'growth'];
    allActions.push(...generateActionsForGoal(goal, company, categoryTriple));
  }

  return allActions; // min 15 per company (5 goals × 3 actions)
}
```

### 4d. Impact model update

**File**: `packages/core/predict/actionImpact.js`

Update `computeActionImpact()` to use goal gap as the primary driver:

```javascript
// For goal-sourced actions, upside is proportional to:
//   goalWeight × goalGapSeverity × resolutionEffectiveness
//
// goalGapSeverity = (tgt - cur) / tgt  (0 to 1, how far from target)
// goalWeight = goal.weight (0 to 100, normalized)
// resolutionEffectiveness = how well this category of action addresses this goal type (0 to 1)

const goalGapSeverity = goal.tgt > 0 ? Math.max(0, (goal.tgt - goal.cur) / goal.tgt) : 0.5;
const normalizedWeight = (goal.weight || 50) / 100;
const effectiveness = template.effectiveness || 0.5;

impact.upsideMagnitude = goalGapSeverity * normalizedWeight * effectiveness * 100;
impact.probabilityOfSuccess = effectiveness;
```

The rest of the rankScore formula (trustPenalty, executionFrictionPenalty, timeCriticalityBoost, sourceTypeBoost, patternLift) stays as-is. The change is that `expectedNetImpact` now reflects goal-gap-weighted upside rather than generic issue severity.

### 4e. Disconnect issues/preissues from action pipeline

**File**: `packages/core/predict/actionCandidates.js`

`generateCompanyActionCandidates()` no longer called by the engine for ranking purposes. The function can remain for backward compat (diagnostic UI, event log display) but is NOT wired into the engine DAG.

Do NOT delete issues.js, preissues.js, or the issue detection code — they remain as diagnostic signals visible in the UI. They just don't generate ranked actions anymore.

**Acceptance**:
- Every portfolio company has min 5 goals in derived output
- Every goal produces exactly 3 actions from 3 distinct categories
- Every action has a goalId
- No action has sourceType 'ISSUE' or 'PREISSUE'
- rankScore reflects goal-gap-weighted impact
- Min 15 actions per company, 300+ total across portfolio

---

## Phase 5: Update action categories for kanban

**File**: `ui/lib/actionCategories.js`

### 5a. Add all new resolutionIds to CATEGORY_MAP

Every `{GOAL_TYPE}_{CATEGORY}` resolutionId maps to its category. Example additions:

```javascript
REVENUE_GROWTH:           'growth',
REVENUE_PIPELINE:         'pipeline',
REVENUE_DATA:             'data',
FUNDRAISE_FUNDRAISE:      'fundraise',
FUNDRAISE_PIPELINE:       'pipeline',
FUNDRAISE_INTROS:         'intros',
HIRING_GOALS:             'goals',
HIRING_GROWTH:            'growth',
HIRING_DATA:              'data',
RETENTION_GOALS:          'goals',
RETENTION_GROWTH:         'growth',
RETENTION_FINANCIAL:      'financial',
EFFICIENCY_FINANCIAL:     'financial',
EFFICIENCY_GOALS:         'goals',
EFFICIENCY_GROWTH:        'growth',
CUSTOMER_GROWTH_GROWTH:   'growth',
CUSTOMER_GROWTH_GOALS:    'goals',
CUSTOMER_GROWTH_PIPELINE: 'pipeline',
// ... all 45 combinations
```

### 5b. Verify kanban compatibility

CompanyCard and ActionSlot consume actions grouped by category — unchanged. Each company now has more even category distribution (currently dominated by `pipeline` with 74 RESOLVE_DEAL_STALE actions).

**Acceptance**: Every resolutionId in the system maps to a category. No 'other' fallback in production data. Kanban displays actions across multiple categories per company.

---

## Phase 6: Data generator — 100% fill rate + goal enforcement

**File**: `generate-qa-data.js`

### 6a. 100% metric fill rate for portfolio companies

Replace null/zero logic:

**nrr/grr/logo_retention/nps**: Pre-seed companies get early-stage values instead of null:
```javascript
const nrr = isPreSeed
  ? Math.round(randomFloat(70, 100) * 100) / 100
  : Math.round(randomFloat(params.nrrMin || 80, params.nrrMax || 130) * 100) / 100;

const grr = isPreSeed
  ? Math.round(randomFloat(60, 90) * 100) / 100
  : Math.round(randomFloat(params.grrMin || 70, params.grrMax || 100) * 100) / 100;

const logo_retention = isPreSeed
  ? Math.round(randomFloat(50, 85) * 100) / 100
  : Math.round(randomFloat(params.logoRetentionMin || 60, params.logoRetentionMax || 95) * 100) / 100;

const nps = isPreSeed
  ? randomInt(-30, 30)
  : randomInt(params.npsMin ?? -20, params.npsMax ?? 60);
```

**arr**: Portfolio companies always get nonzero revenue:
```javascript
if (isPortfolio) {
  revenue = params.revenueRequired
    ? randomInt(params.revenueMin, params.revenueMax)
    : randomInt(Math.max(1000, Math.floor(params.revenueMax * 0.05)),
                Math.floor(params.revenueMax * 0.5));
}
```

**paying_customers**: Always nonzero for portfolio:
```javascript
const paying_customers_val = isPortfolio
  ? Math.max(1, randomInt(params.payingCustomersMin || 1, params.payingCustomersMax || 10))
  : (revenue === 0 ? 0 : randomInt(params.payingCustomersMin || 0, params.payingCustomersMax || 10));
```

**open_positions**: Always >= 1 for portfolio.

**roundTarget**: Keep null for non-raising companies (semantically correct).

### 6b. Goal generation — min 5 per company, new types included

In `generateGoalsForCompany()`:

1. Target 5-7 goals per company (min 5 enforced).

2. Add `targetsForType` cases for `retention`, `efficiency`, `customer_growth`:
```javascript
case 'retention':
  target = params.nrrMin ? Math.round(params.nrrMin + (params.nrrMax - params.nrrMin) * 0.7) : 100;
  current = Math.round(target * randomFloat(0.7, 0.95));
case 'efficiency':
  target = params.grossMarginMin ? Math.round(params.grossMarginMin + (params.grossMarginMax - params.grossMarginMin) * 0.6) : 60;
  current = Math.round(target * randomFloat(0.6, 0.9));
case 'customer_growth':
  target = params.payingCustomersMax ? Math.round(params.payingCustomersMax * 0.7) : 50;
  current = Math.max(1, Math.round(target * randomFloat(0.3, 0.7)));
```

3. Add to GOAL_TYPE_WEIGHTS: `retention: 75, efficiency: 70, customer_growth: 65`

4. Guarantee phase: Every non-Pre-seed company gets at least 1 retention + 1 efficiency + 1 customer_growth goal.

5. Every company gets exactly 5+ goals (pad with templates, trim by dedup).

### 6c. Stage goal templates expanded

**File**: `packages/core/raw/stageParams.js`

Add new goal templates to STAGE_GOALS per stage (Pre-seed gets none of the new types):

```
Seed:      + retention (Early Retention), customer_growth (Customer Acquisition)
Series A:  + retention (NRR Target), efficiency (Unit Economics), customer_growth (Customer Base Growth)
Series B:  + retention (Retention Excellence), efficiency (Margin Optimization), customer_growth (Customer Expansion)
Series C:  + retention (World-Class Retention), efficiency (Efficiency at Scale)
Series D:  + efficiency (Margin Excellence)
```

**Acceptance**:
- 100% fill rate on all metric fields for portfolio companies (except roundTarget when !raising)
- Every portfolio company has min 5 goals
- Every non-Pre-seed company has retention + efficiency + customer_growth goals
- Min 3 distinct goal types per company

---

## Phase 7: Update QA gates

**File**: `packages/core/qa/qa_gate.js`

### 7a. Modify Gate 4 (Ranking Output Correctness)

Update to verify:
- Every action has a goalId
- Every action has a category
- Min 15 actions per portfolio company (5+ goals × 3)
- No action has sourceType 'ISSUE' or 'PREISSUE'

### 7b. New Gate: Goal Coverage

Add gate verifying:
- Every portfolio company has min 5 goals
- Goals cover at least 3 distinct types per company
- Every goal has exactly 3 actions
- Actions for each goal span 3 distinct categories

### 7c. New Gate: Metric Fill Rate

Add gate verifying:
- Every portfolio company has nonzero/non-null values for all 18 metric fields (except roundTarget when !raising)

### 7d. Simplify Gate 16 (Proactive Action Integrity)

Replace preissue-sourced check with: every action references a valid goalId that exists in the company's active goals.

**Acceptance**: All QA gates pass. New gates enforce goal coverage, metric fill rate, and action-goal linkage.

---

## Phase 8: Regenerate + verify + cleanup

1. Run `node generate-qa-data.js`
2. Sync `actionEvents.json` — new action IDs are `{goalId}-act-{category}` format. Preserve events for any matching IDs, generate new events for new IDs.
3. Run engine: verify compute() succeeds
4. Run QA: all gates pass

**Verification checklist**:

```
Metric fill: 0 null/undefined on portfolio (except roundTarget when !raising)     ☐
Anomalies: >= 3 distinct new anomaly types fire across portfolio                  ☐
Goals per company: min 5                                                          ☐
Non-Pre-seed companies have retention + efficiency + customer_growth goals         ☐
Actions per company: min 15 (5+ goals × 3)                                        ☐
Total actions: 300+ across portfolio                                              ☐
Every action has goalId: true                                                     ☐
Every action has category: true                                                   ☐
No ISSUE/PREISSUE sourceType on ranked actions: true                              ☐
Distinct categories per company: >= 5                                             ☐
rankScore reflects goal-gap-weighted impact: true                                 ☐
Engine runs clean: true                                                           ☐
QA: all gates pass                                                                ☐
```

5. Write SESSION_LEDGER.md entry
6. Regenerate DOCTRINE.md (pipeline has fundamentally changed)
7. Push all files

---

## Files Summary

### Created
- `packages/core/predict/goalFromAnomaly.js` (Phase 4a)
- `packages/core/predict/goalActions.js` (Phase 4b)

### Modified
- `packages/core/raw/stageParams.js` (Phase 1, Phase 6c)
- `packages/core/derive/anomalyDetection.js` (Phase 2)
- `packages/core/raw/goalSchema.js` (Phase 3a)
- `packages/core/predict/suggestedGoals.js` (Phase 3b)
- `packages/core/runtime/engine.js` (Phase 4c)
- `packages/core/predict/actionImpact.js` (Phase 4d)
- `packages/core/predict/actionCandidates.js` (Phase 4e — disconnected, not deleted)
- `ui/lib/actionCategories.js` (Phase 5)
- `generate-qa-data.js` (Phase 6)
- `packages/core/qa/qa_gate.js` (Phase 7)

### Regenerated
- `packages/core/raw/chunks/sample_*.json` (Phase 8)
- `packages/core/raw/actionEvents.json` (Phase 8)

### Meta
- `.backbone/SESSION_LEDGER.md` (Phase 8)
- `DOCTRINE.md` (Phase 8 — regenerated)

---

## Execution Order

```
Phase 1  stageParams bounds              (raw layer, no dependencies)
Phase 2  anomaly detectors               (depends on Phase 1 bounds)
Phase 3  goal types + anomaly-to-goal    (depends on Phase 2 anomaly types)
Phase 4  engine core refactor            (depends on Phase 3 goal types)
Phase 5  UI action categories            (depends on Phase 4 resolutionIds)
Phase 6  data generator                  (depends on Phase 1-3 for schema)
Phase 7  QA gates                        (depends on Phase 4-6 for new invariants)
Phase 8  regenerate + verify + cleanup   (depends on all above)
```

Phases 1-3 are schema/derivation work (safe, additive).
Phase 4 is the core refactor (breaking change to action pipeline).
Phases 5-7 are wiring and validation.
Phase 8 is integration testing.

Each phase is independently verifiable. Code should commit after each phase passes its acceptance criteria.
