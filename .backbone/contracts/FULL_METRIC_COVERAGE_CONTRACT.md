# FULL_METRIC_COVERAGE_CONTRACT.md

**Objective**: Every company metric field flows through the complete pipeline: raw attribute → stageParams bounds → anomaly detection → goal mapping in suggestedGoals → sample goals in generate-qa-data. Additionally, the data generator must produce 100% fill rate on all metrics for portfolio companies and always generate goals driven by the new metric types (retention, efficiency, customer_growth).

---

## Current State

**Pipeline coverage audit** (18 metric fields, excluding identity fields id/name/domain/isPortfolio/asOf/loc):

| Field | stageParams | Anomaly detector | Goal mapping | Sample goals | Fill rate |
|---|---|---|---|---|---|
| `arr` | ✅ | ✅ | ✅ | ✅ | 50% (10 zero) |
| `burn` | ✅ | ✅ | ✅ | ✅ | 100% |
| `cash` | ✅ | ✅ | ✅ | ✅ | 100% |
| `employees` | ✅ | ✅ | ✅ | ✅ | 100% |
| `raising` | ✅ | ✅ | ✅ | ✅ | 100% |
| `roundTarget` | ✅ | ✅ | ✅ | ✅ | 30% (null when !raising) |
| `stage` | ✅ | ✅ | ✅ | ✅ | 100% |
| `sector` | N/A | N/A | N/A | N/A | 100% |
| `target_headcount` | ✅ | ✅ HIRING_PLAN_BEHIND | ❌ no goal map | ❌ | 100% |
| `cac` | ✅ | ✅ CAC_ABOVE_THRESHOLD | ❌ no goal map | ❌ | 100% |
| `nrr` | ✅ | ✅ NRR_BELOW_THRESHOLD | ❌ no goal map | ❌ | 80% (4 null Pre-seed) |
| `gross_margin` | ✅ | ✅ GROSS_MARGIN_BELOW | ❌ no goal map | ❌ | 100% |
| `logo_retention` | ✅ | ✅ LOGO_RETENTION_LOW | ❌ no goal map | ❌ | 80% (4 null Pre-seed) |
| `grr` | ✅ | ❌ no detector | ❌ | ❌ | 80% (4 null Pre-seed) |
| `nps` | ✅ | ❌ no detector | ❌ | ❌ | 80% (4 null Pre-seed) |
| `open_positions` | ✅ | ❌ no detector | ❌ | ❌ | 95% (1 zero) |
| `paying_customers` | ✅ | ❌ no detector | ❌ | ❌ | 50% (10 zero) |
| `acv` | ✅ | ❌ no detector | ❌ | ❌ | 100% |
| `raised_to_date` | ❌ no bounds | ❌ | ❌ | ❌ | 100% |
| `last_raise_amount` | ❌ no bounds | ❌ | ❌ | ❌ | 100% |
| `founded` | ❌ no bounds | ❌ | ❌ | N/A | 100% |

**Goal type coverage**: Only `revenue`, `hiring`, `fundraise`, `product`, `operational`, `partnership`, `intro_target`, `deal_close`, `investor_activation` generated. Zero goals of type `retention`, `efficiency`, or `customer_growth`.

**Fill rate issues**: `arr` 50%, `paying_customers` 50%, `roundTarget` 30%, `nrr/grr/nps/logo_retention` 80% (null for Pre-seed). These should be 100% for portfolio companies — Pre-seed companies still have early-stage values for these metrics (even if low), and pre-revenue companies should have small but nonzero ARR/customer counts.

---

## Phase 0: stageParams bounds for missing fields

**File**: `packages/core/raw/stageParams.js`

Add bounds to each stage in STAGE_PARAMS for `raised_to_date`, `last_raise_amount`, and `founded`:

```
Stage           raisedToDateMin  raisedToDateMax  lastRaiseAmountMin  lastRaiseAmountMax  foundedYearsMin  foundedYearsMax
Pre-seed        0                2000000          0                   2000000             0                2
Seed            500000           10000000         500000              5000000             0                4
Series A        2000000          30000000         2000000             15000000            1                6
Series B        10000000         80000000         10000000            50000000            2                8
Series C        30000000         200000000        20000000            100000000           3                12
Series D        80000000         500000000        50000000            200000000           4                15
```

Add to each STAGE_PARAMS[stage] object:
- `raisedToDateMin`, `raisedToDateMax`
- `lastRaiseAmountMin`, `lastRaiseAmountMax`
- `foundedYearsMin`, `foundedYearsMax`

**Acceptance**: Every stage has `raisedToDateMin`, `raisedToDateMax`, `lastRaiseAmountMin`, `lastRaiseAmountMax`, `foundedYearsMin`, `foundedYearsMax`. Existing bounds unchanged.

---

## Phase 1: Add missing anomaly detectors

**File**: `packages/core/derive/anomalyDetection.js`

### 1a. New ANOMALY_TYPES

Add to ANOMALY_TYPES:
```javascript
GRR_BELOW_THRESHOLD: 'GRR_BELOW_THRESHOLD',
NPS_BELOW_THRESHOLD: 'NPS_BELOW_THRESHOLD',
OPEN_POSITIONS_ABOVE_MAX: 'OPEN_POSITIONS_ABOVE_MAX',
PAYING_CUSTOMERS_BELOW_MIN: 'PAYING_CUSTOMERS_BELOW_MIN',
ACV_BELOW_MIN: 'ACV_BELOW_MIN',
ACV_ABOVE_MAX: 'ACV_ABOVE_MAX',
RAISED_TO_DATE_LOW: 'RAISED_TO_DATE_LOW',
LAST_RAISE_UNDERSIZE: 'LAST_RAISE_UNDERSIZE',
COMPANY_AGE_STAGE_MISMATCH: 'COMPANY_AGE_STAGE_MISMATCH',
```

### 1b. TOLERANCE_CONFIG entries

Add for: `grr`, `nps`, `open_positions`, `paying_customers`, `acv`, `raised_to_date`, `last_raise_amount`, `founded`.
Use standard: `{ innerTolerance: 0.15, outerTolerance: 0.20, symmetric: false }`.

### 1c. Detector functions

Follow exact pattern of existing detectors (use `checkBoundFeathered()`):

1. **detectGrrAnomalies(company, params)** — GRR below grrMin. Skip if `company.grr == null` or `params.grrMin == null`.
2. **detectNpsAnomalies(company, params)** — NPS below npsMin. Skip if `company.nps == null` or `params.npsMin == null`.
3. **detectOpenPositionsAnomalies(company, params)** — open_positions > openPositionsMax. Indicates over-hiring intent.
4. **detectPayingCustomersAnomalies(company, params)** — paying_customers < payingCustomersMin. Skip if min is 0.
5. **detectAcvAnomalies(company, params)** — Two checks: acv < acvMin OR acv > acvMax. Two anomaly types.
6. **detectRaisedToDateAnomalies(company, params)** — raised_to_date < raisedToDateMin. Under-capitalized.
7. **detectLastRaiseAnomalies(company, params)** — last_raise_amount < lastRaiseAmountMin. Undersized round.
8. **detectAgeAnomalies(company, params, now)** — Compute years since `founded`. If outside foundedYearsMin/Max, fire COMPANY_AGE_STAGE_MISMATCH.

### 1d. Wire into detectAnomalies()

Add all new detector calls to main `detectAnomalies()` after existing calls:
```javascript
anomalies.push(...detectGrrAnomalies(company, params));
anomalies.push(...detectNpsAnomalies(company, params));
anomalies.push(...detectOpenPositionsAnomalies(company, params));
anomalies.push(...detectPayingCustomersAnomalies(company, params));
anomalies.push(...detectAcvAnomalies(company, params));
anomalies.push(...detectRaisedToDateAnomalies(company, params));
anomalies.push(...detectLastRaiseAnomalies(company, params));
anomalies.push(...detectAgeAnomalies(company, params, now));
```

**Acceptance**: `detectAnomalies()` on a company with out-of-bounds values for any new field returns the correct anomaly type. Existing anomaly types unchanged.

---

## Phase 2: Goal mappings for all anomaly types

### 2a. New goal types in goalSchema.js

**File**: `packages/core/raw/goalSchema.js`

Add to GOAL_TYPES:
```javascript
retention: {
  name: 'Retention',
  entities: ['company'],
  metrics: ['nrr', 'grr', 'logo_retention', 'churn_rate'],
  description: 'Customer retention improvement',
},
efficiency: {
  name: 'Unit Economics',
  entities: ['company'],
  metrics: ['cac', 'gross_margin', 'ltv', 'acv'],
  description: 'Unit economics optimization',
},
customer_growth: {
  name: 'Customer Growth',
  entities: ['company'],
  metrics: ['paying_customers', 'nps', 'acv'],
  description: 'Customer base expansion and satisfaction',
},
```

### 2b. New SUGGESTION_TYPES

**File**: `packages/core/predict/suggestedGoals.js`

Add to SUGGESTION_TYPES:
```javascript
REDUCE_CAC: 'REDUCE_CAC',
IMPROVE_NRR: 'IMPROVE_NRR',
IMPROVE_GRR: 'IMPROVE_GRR',
IMPROVE_GROSS_MARGIN: 'IMPROVE_GROSS_MARGIN',
IMPROVE_RETENTION: 'IMPROVE_RETENTION',
ACCELERATE_HIRING: 'ACCELERATE_HIRING',
IMPROVE_NPS: 'IMPROVE_NPS',
RIGHT_SIZE_HIRING_PLAN: 'RIGHT_SIZE_HIRING_PLAN',
GROW_CUSTOMER_BASE: 'GROW_CUSTOMER_BASE',
OPTIMIZE_ACV: 'OPTIMIZE_ACV',
RAISE_MORE_CAPITAL: 'RAISE_MORE_CAPITAL',
RIGHT_SIZE_ROUND: 'RIGHT_SIZE_ROUND',
REVIEW_STAGE_FIT: 'REVIEW_STAGE_FIT',
```

### 2c. ANOMALY_TO_GOAL_MAP entries

Add mappings for every unmapped anomaly type:

```javascript
[ANOMALY_TYPES.CAC_ABOVE_THRESHOLD]: [{
  suggestionType: SUGGESTION_TYPES.REDUCE_CAC,
  goalType: 'efficiency',
  nameTemplate: 'Reduce CAC to ${target}',
  targetFromEvidence: (ev) => ev.max,
  priority: 1,
  rationale: 'Customer acquisition cost exceeds stage norms — optimize channels or increase conversion',
}],

[ANOMALY_TYPES.NRR_BELOW_THRESHOLD]: [{
  suggestionType: SUGGESTION_TYPES.IMPROVE_NRR,
  goalType: 'retention',
  nameTemplate: 'Improve NRR to {target}%',
  targetFromEvidence: (ev) => ev.min,
  priority: 1,
  rationale: 'Net revenue retention below stage minimum — focus on expansion and churn reduction',
}],

[ANOMALY_TYPES.GRR_BELOW_THRESHOLD]: [{
  suggestionType: SUGGESTION_TYPES.IMPROVE_GRR,
  goalType: 'retention',
  nameTemplate: 'Improve GRR to {target}%',
  targetFromEvidence: (ev) => ev.min,
  priority: 1,
  rationale: 'Gross revenue retention below threshold — address churn drivers',
}],

[ANOMALY_TYPES.GROSS_MARGIN_BELOW_THRESHOLD]: [{
  suggestionType: SUGGESTION_TYPES.IMPROVE_GROSS_MARGIN,
  goalType: 'efficiency',
  nameTemplate: 'Improve gross margin to {target}%',
  targetFromEvidence: (ev) => ev.min,
  priority: 1,
  rationale: 'Gross margin below stage norms — review COGS structure and pricing',
}],

[ANOMALY_TYPES.LOGO_RETENTION_LOW]: [{
  suggestionType: SUGGESTION_TYPES.IMPROVE_RETENTION,
  goalType: 'retention',
  nameTemplate: 'Improve logo retention to {target}%',
  targetFromEvidence: (ev) => ev.min,
  priority: 1,
  rationale: 'Customer logo retention is low — investigate churn causes and improve onboarding',
}],

[ANOMALY_TYPES.HIRING_PLAN_BEHIND]: [{
  suggestionType: SUGGESTION_TYPES.ACCELERATE_HIRING,
  goalType: 'hiring',
  nameTemplate: 'Hire to {target} FTE',
  targetFromEvidence: (ev) => ev.target_headcount || ev.target,
  priority: 1,
  rationale: 'Current headcount behind hiring plan — accelerate recruiting pipeline',
}],

[ANOMALY_TYPES.NPS_BELOW_THRESHOLD]: [{
  suggestionType: SUGGESTION_TYPES.IMPROVE_NPS,
  goalType: 'customer_growth',
  nameTemplate: 'Improve NPS to {target}',
  targetFromEvidence: (ev) => ev.min,
  priority: 2,
  rationale: 'Net Promoter Score below stage norms — customer satisfaction needs attention',
}],

[ANOMALY_TYPES.OPEN_POSITIONS_ABOVE_MAX]: [{
  suggestionType: SUGGESTION_TYPES.RIGHT_SIZE_HIRING_PLAN,
  goalType: 'hiring',
  nameTemplate: 'Fill or close open positions (target: {target})',
  targetFromEvidence: (ev) => ev.max,
  priority: 2,
  rationale: 'Too many open positions for stage — either accelerate hiring or right-size plan',
}],

[ANOMALY_TYPES.PAYING_CUSTOMERS_BELOW_MIN]: [{
  suggestionType: SUGGESTION_TYPES.GROW_CUSTOMER_BASE,
  goalType: 'customer_growth',
  nameTemplate: 'Grow to {target} paying customers',
  targetFromEvidence: (ev) => ev.min,
  priority: 1,
  rationale: 'Customer base below stage expectations — focus on sales pipeline and conversion',
}],

[ANOMALY_TYPES.ACV_BELOW_MIN]: [{
  suggestionType: SUGGESTION_TYPES.OPTIMIZE_ACV,
  goalType: 'efficiency',
  nameTemplate: 'Increase ACV to ${target}',
  targetFromEvidence: (ev) => ev.min,
  priority: 2,
  rationale: 'Average contract value below stage norms — review pricing and packaging',
}],

[ANOMALY_TYPES.ACV_ABOVE_MAX]: [{
  suggestionType: SUGGESTION_TYPES.OPTIMIZE_ACV,
  goalType: 'customer_growth',
  nameTemplate: 'Diversify customer base (ACV currently ${target})',
  targetFromEvidence: (ev) => ev.actual,
  priority: 2,
  rationale: 'ACV above stage norms — may indicate concentration risk, consider mid-market expansion',
}],

[ANOMALY_TYPES.RAISED_TO_DATE_LOW]: [{
  suggestionType: SUGGESTION_TYPES.RAISE_MORE_CAPITAL,
  goalType: 'fundraise',
  nameTemplate: 'Raise additional capital (gap: ${target})',
  targetFromEvidence: (ev) => ev.min ? ev.min - (ev.actual || 0) : null,
  priority: 1,
  rationale: 'Total capital raised below stage norms — may be under-resourced for growth plans',
}],

[ANOMALY_TYPES.LAST_RAISE_UNDERSIZE]: [{
  suggestionType: SUGGESTION_TYPES.RIGHT_SIZE_ROUND,
  goalType: 'fundraise',
  nameTemplate: 'Plan larger next round (last: ${target})',
  targetFromEvidence: (ev) => ev.actual,
  priority: 2,
  rationale: 'Last raise was undersized for stage — next round should right-size capitalization',
}],

[ANOMALY_TYPES.COMPANY_AGE_STAGE_MISMATCH]: [{
  suggestionType: SUGGESTION_TYPES.REVIEW_STAGE_FIT,
  goalType: 'operational',
  nameTemplate: 'Review stage progression plan',
  priority: 2,
  rationale: 'Company age unusual for current stage — review if pace is appropriate or acceleration needed',
}],
```

**Acceptance**: Every ANOMALY_TYPE in anomalyDetection.js has a corresponding entry in ANOMALY_TO_GOAL_MAP. No orphan anomaly types.

---

## Phase 3: Data generator — 100% fill rate + new goal types

**File**: `generate-qa-data.js`

### 3a. 100% metric fill rate for portfolio companies

Replace null/zero logic for Pre-seed and pre-revenue companies:

**nrr/grr/logo_retention/nps**: Pre-seed companies get early-stage values instead of null:
```javascript
// BEFORE: const nrr = isPreSeed ? null : ...
// AFTER:
const nrr = isPreSeed
  ? Math.round(randomFloat(70, 100) * 100) / 100    // early-stage, less stable
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
// BEFORE: revenue = 0 when !revenueRequired && !probability(0.3)
// AFTER: portfolio companies always get at least minimal revenue
if (isPortfolio) {
  revenue = params.revenueRequired
    ? randomInt(params.revenueMin, params.revenueMax)
    : randomInt(Math.max(1000, Math.floor(params.revenueMax * 0.05)), Math.floor(params.revenueMax * 0.5));
}
```

**paying_customers**: Nonzero when revenue > 0 (which is now always for portfolio):
```javascript
// BEFORE: paying_customers_val = revenue === 0 ? 0 : ...
// AFTER: always nonzero for portfolio
const paying_customers_val = isPortfolio
  ? Math.max(1, randomInt(params.payingCustomersMin || 1, params.payingCustomersMax || 10))
  : (revenue === 0 ? 0 : randomInt(params.payingCustomersMin || 0, params.payingCustomersMax || 10));
```

**open_positions**: Ensure always >= 1 for portfolio:
```javascript
const open_positions = isPortfolio
  ? Math.max(1, randomInt(params.openPositionsMin || 1, params.openPositionsMax || 3))
  : randomInt(params.openPositionsMin || 0, params.openPositionsMax || 3);
```

**roundTarget**: Keep null for non-raising companies (semantically correct — no round target when not raising). Do NOT force fill.

### 3b. New goal types in STAGE_GOALS

**File**: `packages/core/raw/stageParams.js`

Add new goal templates to STAGE_GOALS for each stage. Pre-seed gets NO retention/efficiency/customer_growth templates (too early).

```javascript
'Seed': [
  ...existing 5 templates...,
  { type: 'retention', name: 'Early Retention', unlocks: 'PMF validation', priority: 6 },
  { type: 'customer_growth', name: 'Customer Acquisition', unlocks: 'Revenue growth', priority: 7 },
],

'Series A': [
  ...existing 5 templates...,
  { type: 'retention', name: 'Net Revenue Retention', unlocks: 'Expansion revenue', priority: 6 },
  { type: 'efficiency', name: 'Unit Economics', unlocks: 'Scalable model proof', priority: 7 },
  { type: 'customer_growth', name: 'Customer Base Growth', unlocks: 'Market penetration', priority: 8 },
],

'Series B': [
  ...existing 4 templates...,
  { type: 'retention', name: 'Retention Excellence', unlocks: 'Net negative churn', priority: 5 },
  { type: 'efficiency', name: 'Margin Optimization', unlocks: 'Profitability path', priority: 6 },
  { type: 'customer_growth', name: 'Customer Expansion', unlocks: 'Market leadership', priority: 7 },
],

'Series C': [
  ...existing 3 templates...,
  { type: 'retention', name: 'World-Class Retention', unlocks: 'IPO-grade metrics', priority: 4 },
  { type: 'efficiency', name: 'Efficiency at Scale', unlocks: 'Public market readiness', priority: 5 },
],

'Series D': [
  ...existing 2 templates...,
  { type: 'efficiency', name: 'Margin Excellence', unlocks: 'Sustained profitability', priority: 3 },
],
```

### 3c. Goal generation with new types

**File**: `generate-qa-data.js`

In `generateGoalsForCompany()`:

1. Add `targetsForType` cases:
```javascript
case 'retention': {
  const target = params.nrrMin ? Math.round(params.nrrMin + (params.nrrMax - params.nrrMin) * 0.7) : 100;
  return { target, current: Math.round(target * randomFloat(0.7, 0.95)) };
}
case 'efficiency': {
  const target = params.grossMarginMin ? Math.round(params.grossMarginMin + (params.grossMarginMax - params.grossMarginMin) * 0.6) : 60;
  return { target, current: Math.round(target * randomFloat(0.6, 0.9)) };
}
case 'customer_growth': {
  const target = params.payingCustomersMax ? Math.round(params.payingCustomersMax * 0.7) : 50;
  return { target, current: Math.max(1, Math.round(target * randomFloat(0.3, 0.7))) };
}
```

2. Add to `FILL_PRIORITY` and `FILL_NAMES`:
```javascript
const FILL_PRIORITY = ['revenue', 'fundraise', 'hiring', 'retention', 'efficiency', 'customer_growth', 'product', 'operational', 'partnership'];

const FILL_NAMES = {
  ...existing...,
  retention: 'Retention Target',
  efficiency: 'Unit Economics',
  customer_growth: 'Customer Growth',
};
```

3. Add to `GOAL_TYPE_WEIGHTS`:
```javascript
retention: 75, efficiency: 70, customer_growth: 65,
```

4. Increase target goals per company from 5 to 7 to accommodate the 3 new types without crowding out existing types.

### 3d. Guaranteed new-type goal coverage

After the template + fill phases in `generateGoalsForCompany()`, add a guarantee phase:

```javascript
// Phase 3: Ensure at least 1 retention, 1 efficiency, 1 customer_growth goal per non-Pre-seed company
const guaranteeTypes = (company.stage === 'Pre-seed') ? [] : ['retention', 'efficiency', 'customer_growth'];
for (const gType of guaranteeTypes) {
  if (!goals.some(g => g.type === gType)) {
    const { target, current } = targetsForType(gType);
    pushGoal(FILL_NAMES[gType] || gType, gType, current, target);
  }
}
```

**Acceptance**:
- 100% fill rate on all metric fields for portfolio companies (nrr, grr, nps, logo_retention, arr, paying_customers, open_positions all nonzero/non-null)
- roundTarget stays null for non-raising companies (semantically correct)
- Every non-Pre-seed portfolio company has >= 1 goal of type `retention`, `efficiency`, and `customer_growth`
- Goal count per company: 7-10 (up from 5-7)

---

## Phase 4: Regenerate data + verify full pipeline

1. Run `node generate-qa-data.js`
2. Sync `actionEvents.json` if action IDs changed (preserve events for existing IDs, add new events for new IDs)
3. Run engine: verify compute() succeeds
4. Run QA: `node packages/core/qa/qa_gate.js`

**Verification checks** (run after regen):

1. Fill rate: all metric fields nonzero/non-null for portfolio (except roundTarget when !raising)
2. Anomaly detection fires new types across portfolio (>= 3 distinct new anomaly types)
3. Goal type coverage: goals of type `retention`, `efficiency`, `customer_growth` exist in raw data
4. Every non-Pre-seed portfolio company has retention + efficiency + customer_growth goals
5. suggestedGoals count > 15 (up from current 15, since more anomaly types now map to goals)
6. Engine runs clean, no errors
7. QA 18/18

**Acceptance**:
- QA 18/18
- 0 null/undefined metric fields on portfolio companies (except roundTarget when !raising)
- >= 3 distinct new anomaly types fire across portfolio
- Every non-Pre-seed portfolio company has retention + efficiency + customer_growth goals
- suggestedGoals count > 15
- Engine runs clean

---

## Phase 5: Cleanup + ledger

1. Write SESSION_LEDGER.md entry
2. Regenerate DOCTRINE.md if needed
3. Push all files

**Files modified across all phases**:
- `packages/core/raw/stageParams.js` (Phase 0, Phase 3b)
- `packages/core/derive/anomalyDetection.js` (Phase 1)
- `packages/core/raw/goalSchema.js` (Phase 2a)
- `packages/core/predict/suggestedGoals.js` (Phase 2b, 2c)
- `generate-qa-data.js` (Phase 3a, 3c, 3d)
- `packages/core/raw/chunks/sample_*.json` (Phase 4, regenerated)
- `packages/core/raw/actionEvents.json` (Phase 4, synced)
- `.backbone/SESSION_LEDGER.md` (Phase 5)

**Execution order**: 0 → 1 → 2 → 3 → 4 → 5. Each phase independently verifiable. Phases 0-2 are engine, Phase 3 is generator, Phase 4 is regen+verify, Phase 5 is cleanup.
