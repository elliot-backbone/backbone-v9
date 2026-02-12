# DATA_RICHNESS_CONTRACT — Chain Audit Fix

**Date:** 2026-02-12
**Origin:** Chain audit identifying 3 systemic uniformity problems cascading from goals → trajectories → preissues → actions
**Status:** Ready for Code execution

---

## Problem Summary

Three bugs create cascading uniformity across the entire derive/predict chain:

1. **Company schema too thin** — Only 4 operational metrics on company + 8 in metricFacts. 8 of 16 SNAPSHOT_METRICS never populated (gross_margin, nps, dau, mau, pipeline_value, deals_active, raised_to_date, last_raise_amount). Anomaly detection and snapshot have nothing to work with for half their fields.

2. **Trajectory always returns "Missing target value"** — `deriveTrajectory()` in trajectory.js checks `goal.target` but goals use `tgt` (short name). `goalTrajectory.js` normalizes `cur`/`tgt` → `current`/`target` for its own output but passes the raw goal object to `deriveTrajectory()`, which sees `goal.target === undefined` and returns `{onTrack: false, confidence: 0, explain: "Missing target value"}` for every single goal. This cascades: every goal triggers GOAL_STALLED, inflating identical actions.

3. **No goal history for velocity** — Even after fixing the field name, goals have no `history` array. `calculateVelocity()` requires `history.length >= 2` to produce velocity data. Without it, trajectory returns `onTrack: null, confidence: 0.2` for everything. Goals need synthetic history generated from metricFacts or cur/tgt progression.

---

## Phase 1: Fix trajectory field mismatch (BLOCKING — fixes the worst uniformity)

**Files:** `packages/core/derive/trajectory.js`

**Change:** Make `deriveTrajectory()` normalize short field names before validation.

```
// At top of deriveTrajectory(), before validation:
const current = goal.current ?? goal.cur ?? null;
const target = goal.target ?? goal.tgt ?? null;
const due = goal.due ?? null;

// Then use `current`, `target`, `due` throughout instead of goal.current, goal.target, goal.due
```

Specifically:
1. Line ~85: Add normalization of `cur`→`current`, `tgt`→`target` at function entry
2. Replace all `goal.target` → `target`, `goal.current` → `current`, `goal.due` → `due` in validation and computation
3. The rest of the function already uses local vars after the checks — just need the checks themselves to use normalized values

**Validation:** Run engine, confirm trajectories no longer all say "Missing target value". At least some should show `onTrack: null` with "Insufficient history" explain (which is correct — Phase 3 fixes that).

**QA gates affected:** None (no new architectural rule).

---

## Phase 2: Expand company schema + metricFacts in generator

**Files:** `generate-qa-data.js`, `packages/core/raw/stageParams.js` (add stage bounds for new metrics)

### 2a. Add new raw fields to company object in `generateCompany()`

New fields with stage-appropriate bounds:

| Field | Type | Pre-seed | Seed | Series A | Series B | Series C |
|---|---|---|---|---|---|---|
| cac | USD | 50-500 | 200-2000 | 500-5000 | 1000-8000 | 2000-15000 |
| nrr | % | null | 80-130 | 90-140 | 95-150 | 100-160 |
| grr | % | null | 70-100 | 75-100 | 80-100 | 85-100 |
| logo_retention | % | null | 60-95 | 70-98 | 75-99 | 80-99 |
| target_headcount | count | 5-10 | 10-25 | 25-60 | 60-150 | 150-400 |
| open_positions | count | 0-3 | 1-8 | 3-15 | 5-30 | 10-50 |
| paying_customers | count | 0-10 | 5-100 | 20-500 | 100-2000 | 500-10000 |
| acv | USD | 0-5000 | 1000-50000 | 5000-100000 | 10000-200000 | 20000-500000 |
| gross_margin | % | -50-70 | 10-80 | 30-85 | 40-90 | 50-92 |
| nps | score | null | -20-60 | 0-70 | 10-80 | 20-85 |
| raised_to_date | USD | 0-raiseMax | raiseMin-raiseMax*2 | sum of prior | sum of prior | sum of prior |
| last_raise_amount | USD | 0-raiseMax | raiseMin-raiseMax | raiseMin-raiseMax | raiseMin-raiseMax | raiseMin-raiseMax |

Rules:
- Pre-seed companies get `null` for nrr, grr, logo_retention, nps (too early)
- `paying_customers` = 0 when `arr` = 0
- `acv` derived as `arr / paying_customers` when both > 0, otherwise random within bounds
- `raised_to_date` is cumulative: for Series A, it's seed raise + series A raise
- `last_raise_amount` comes from most recent round (link to rounds data)
- Anomaly companies (35%) get one metric deliberately out of bounds (same pattern as existing anomaly generation but expanded to new metrics: nrr < 80, gross_margin < 20, cac > 2x stage max, etc.)

### 2b. Add stage bounds to `stageParams.js`

Add to each stage in `STAGE_PARAMS`:

```js
// Example for Series A:
cacMin: 500, cacMax: 5000,
nrrMin: 90, nrrMax: 140,
grrMin: 75, grrMax: 100,
logoRetentionMin: 70, logoRetentionMax: 98,
targetHeadcountMin: 25, targetHeadcountMax: 60,
openPositionsMin: 3, openPositionsMax: 15,
payingCustomersMin: 20, payingCustomersMax: 500,
acvMin: 5000, acvMax: 100000,
grossMarginMin: 30, grossMarginMax: 85,
npsMin: 0, npsMax: 70,
```

### 2c. Expand metricFact generation in `generateMetricFacts()`

Add these to the `metricPool` array:

```js
{ key: 'cac', unit: 'usd', valueFn: () => company.cac || randomInt(200, 5000) },
{ key: 'nrr', unit: 'percentage', valueFn: () => company.nrr || randomFloat(85, 140) },
{ key: 'grr', unit: 'percentage', valueFn: () => company.grr || randomFloat(75, 100) },
{ key: 'logo_retention', unit: 'percentage', valueFn: () => company.logo_retention || randomFloat(70, 98) },
{ key: 'open_positions', unit: 'count', valueFn: () => company.open_positions || randomInt(1, 15) },
{ key: 'paying_customers', unit: 'count', valueFn: () => company.paying_customers || randomInt(5, 500) },
{ key: 'acv', unit: 'usd', valueFn: () => company.acv || randomInt(5000, 100000) },
{ key: 'gross_margin', unit: 'percentage', valueFn: () => company.gross_margin || randomFloat(30, 85) },
{ key: 'nps', unit: 'score', valueFn: () => company.nps || randomInt(-10, 70) },
```

Increase portfolio company factCount from `randomInt(5, 8)` to `randomInt(8, 14)` to ensure coverage of new metrics.

### 2d. Update SNAPSHOT_METRICS in `snapshot.js`

Add to the array:

```js
'cac', 'nrr', 'grr', 'logo_retention',
'target_headcount', 'open_positions', 'paying_customers', 'acv'
```

Remove `dau`, `mau` (not relevant for B2B portfolio companies; they were placeholders).

### 2e. Add anomaly types in `anomalyDetection.js`

New types:
- `NRR_BELOW_THRESHOLD` — nrr < stage nrrMin
- `GROSS_MARGIN_BELOW_THRESHOLD` — gross_margin < stage grossMarginMin
- `CAC_ABOVE_THRESHOLD` — cac > stage cacMax
- `HIRING_PLAN_BEHIND` — employees < target_headcount * 0.7
- `LOGO_RETENTION_LOW` — logo_retention < stage logoRetentionMin

Each uses the existing feathered bounds pattern. Wire them into the `detectAnomalies()` function alongside existing checks.

**Validation:** Regenerate data (`node generate-qa-data.js`), run engine, confirm:
- Snapshot resolves 14+ of 16 metrics (vs current 4-8)
- New anomaly types appear in detectAnomalies output
- No QA gate failures

---

## Phase 3: Generate goal history for trajectory velocity

**Files:** `generate-qa-data.js`

**Change:** After generating goals in `generateGoalsForCompany()`, synthesize a `history` array on each goal. This gives `calculateVelocity()` the 2+ data points it needs.

Algorithm:
1. For each goal, generate 3-6 historical observations spanning `daysAgo(90)` to `daysAgo(1)`
2. First observation: value between 0 and `cur * 0.3` (early progress)
3. Each subsequent observation: monotonically increasing toward `cur`
4. Last observation: `cur` (current value, most recent date)
5. For at_risk goals: introduce a plateau or dip in the middle (velocity stall)
6. For healthy goals: steady upward trajectory

```js
function generateGoalHistory(goal) {
  const observations = randomInt(3, 6);
  const history = [];
  const cur = goal.cur || 0;
  const tgt = goal.tgt || 100;
  
  for (let i = 0; i < observations; i++) {
    const t = i / (observations - 1); // 0 → 1
    const daysBack = Math.floor((1 - t) * 90); // 90 days ago → 0
    
    let value;
    if (goal.status === 'at_risk') {
      // Plateau pattern: fast start, then stall
      value = cur * Math.min(1, t * 1.5) * randomFloat(0.85, 1.0);
      if (t > 0.5) value = cur * randomFloat(0.7, 0.9); // stall
    } else {
      // Steady growth
      value = cur * t * randomFloat(0.9, 1.1);
    }
    
    // Last observation = current value
    if (i === observations - 1) value = cur;
    
    history.push({
      value: Math.round(Math.max(0, value) * 100) / 100,
      asOf: daysAgo(daysBack)
    });
  }
  
  return history;
}
```

Add `goal.history = generateGoalHistory(goal)` after each `pushGoal()` call.

**Validation:** Run engine, confirm:
- Trajectories show varied `onTrack` values (not all false)
- `velocity` is non-zero for goals with history
- `confidence` > 0.2 for goals with 3+ data points
- GOAL_STALLED count drops from ~18 to a realistic 3-6

---

## Phase 4: Regenerate data + validate full chain

**Commands:**
```bash
node generate-qa-data.js
node packages/core/runtime/main.js 2>&1 | head -50  # verify engine runs clean
node .backbone/cli.js push generate-qa-data.js packages/core/raw/stageParams.js packages/core/derive/trajectory.js packages/core/derive/snapshot.js packages/core/derive/anomalyDetection.js packages/core/raw/chunks/ -m "Data richness: expand company schema, fix trajectory field mismatch, add goal history"
```

**Expected outcome after all phases:**
- Company objects: 4 → 16 operational metrics
- MetricFacts: 8 → 17 metric keys
- Snapshot resolves: ~6 → ~14 of 16 metrics
- Trajectories: 100% "Missing target value" → varied (some on track, some behind, some insufficient history)
- GOAL_STALLED actions: ~18 → 3-6
- New anomaly types: 5 additional (NRR, gross margin, CAC, hiring plan, logo retention)
- Total action diversity: significantly improved (fewer duplicate titles)

---

## Files touched (complete list)

| File | Phase | Change |
|---|---|---|
| packages/core/derive/trajectory.js | 1 | Normalize cur/tgt→current/target |
| generate-qa-data.js | 2a, 2c, 3 | Expand company schema, metricFact pool, goal history |
| packages/core/raw/stageParams.js | 2b | Add bounds for new metrics |
| packages/core/derive/snapshot.js | 2d | Expand SNAPSHOT_METRICS |
| packages/core/derive/anomalyDetection.js | 2e | Add 5 new anomaly types |
| packages/core/raw/chunks/*.json | 4 | Regenerated data |

## QA gates

No new gates required. Existing gates cover:
- Layer imports (no cross-layer violations)
- No stored derivations in raw (new fields are raw inputs, not derivations)
- DAG integrity (no new nodes)
- Ranking surface (unchanged)
- Events purity (unchanged)
