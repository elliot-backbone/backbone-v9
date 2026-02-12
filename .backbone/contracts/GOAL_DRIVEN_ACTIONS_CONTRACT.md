# GOAL_DRIVEN_ACTIONS_CONTRACT.md

**Objective**: Refactor the action pipeline so goals are the sole source of actions. The flow becomes:

```
raw metrics (18 fields) → stageParams bounds → anomaly detection → goals (5 per company) → actions (3 per goal, 1 from each of 3 categories)
```

This replaces the current flow where issues and preissues independently generate actions. Goals become the organizing unit. Every action traces back to a goal. Every goal traces back to an anomaly (or a stage template for healthy companies).

**Target state**: 20 portfolio companies × 5 goals × 3 actions = 300 total actions, each tagged with a goalId and a category.

---

## Current Flow (being replaced)

```
raw metrics → anomalies → issues ──────────────→ action candidates → impact → rank
                        → preissues ────────────→ action candidates → impact → rank
                        → goals (parallel, mostly disconnected from actions)
```

- 180 actions, only 4 reference a goalId
- Actions sourced from issues (88) and preissues (92), not from goals
- Goals exist but mainly for trajectory tracking and UI display
- suggestedGoals exist but don't generate actions

## Target Flow

```
raw metrics (18) → stageParams → anomalies → goals (5 per company)
                                                ↓
                                         per goal: 3 actions
                                         (1 each from 3 distinct categories)
                                                ↓
                                         impact scoring → rankScore
```

- 300 actions, ALL reference a goalId
- Goals are the sole source of actions
- Each goal gets exactly 3 actions from 3 different categories
- Categories assigned based on goal type (see mapping below)
- Issues and preissues still exist for diagnostics/UI but no longer generate actions directly

---

## Goal-Type to Action-Category Mapping

Each goal type gets 3 action categories. The first is the "primary" category (most directly addresses the goal), the other two are supporting.

```
Goal Type          Category 1 (primary)    Category 2              Category 3
──────────────────────────────────────────────────────────────────────────────
revenue            growth                  pipeline                data
fundraise          fundraise               pipeline                intros
hiring             goals                   growth                  data
product            goals                   growth                  data
operational        financial               goals                   data
partnership        intros                  pipeline                goals
retention          goals                   growth                  financial
efficiency         financial               goals                   growth
customer_growth    growth                  goals                   pipeline
intro_target       intros                  pipeline                goals
deal_close         pipeline                fundraise               intros
round_completion   fundraise               pipeline                financial
investor_activation intros                 pipeline                fundraise
champion_cultivation intros                goals                   pipeline
relationship_build intros                  goals                   pipeline
```

---

## Phase 1: Goal generation from anomalies (engine layer)

**File**: `packages/core/runtime/engine.js`

### 1a. New DAG step: `goalGeneration`

Insert a new DAG step after anomaly detection (inside the suggestedGoals step or replacing it) that produces exactly 5 goals per company:

```javascript
goalGeneration: (ctx, company, now) => {
  // 1. Detect anomalies (already available via snapshot-augmented company)
  const snapshot = ctx.snapshot;
  const augmented = snapshot?.metrics ? { ...company, ...snapshot.metrics } : company;
  const anomalies = detectAnomalies(augmented, now);

  // 2. Map anomalies to goal candidates (using ANOMALY_TO_GOAL_MAP)
  const anomalyGoals = mapAnomaliesToGoals(anomalies.anomalies, company);

  // 3. Include stage template goals for coverage
  const templateGoals = getStageGoals(company.stage).map(t => ({
    ...t, source: 'template', companyId: company.id
  }));

  // 4. Merge existing raw goals (user-created goals take priority)
  const existingGoals = company.goals || [];

  // 5. Select top 5 by priority: existing first, then anomaly-driven, then templates
  //    Deduplicate by goal type
  return selectTopGoals(existingGoals, anomalyGoals, templateGoals, 5);
}
```

### 1b. New module: `predict/goalFromAnomaly.js`

**File**: `packages/core/predict/goalFromAnomaly.js` (CREATE)

Functions:
- `mapAnomaliesToGoals(anomalies, company)` — Uses ANOMALY_TO_GOAL_MAP from suggestedGoals.js to create goal objects from anomalies. Each anomaly produces one goal candidate with: id, name, type, companyId, source ('anomaly'), sourceAnomaly, cur, tgt, status, due, weight.
- `selectTopGoals(existing, anomalyGoals, templateGoals, limit)` — Selects exactly `limit` goals. Priority: (1) existing raw goals that are active/at_risk, (2) anomaly-driven goals sorted by anomaly severity, (3) stage template goals. Deduplicates by goal type — at most 1 per type. If fewer than `limit` candidates exist, pad with template goals.

### 1c. Modify engine to use goalGeneration

The `goalGeneration` step replaces the current suggestedGoals step as the source of truth for "what goals does this company have." The output is always exactly 5 goals.

The existing `suggestedGoals` step can remain for backward compat (the UI shows suggested goals separately) but it no longer feeds into action generation.

**Acceptance**: Every portfolio company has exactly 5 goals in `derived.activeGoals`. Each goal has: id, name, type, companyId, source (existing/anomaly/template), cur, tgt, status, due, weight.

---

## Phase 2: Goal-driven action generation

### 2a. New module: `predict/goalActions.js`

**File**: `packages/core/predict/goalActions.js` (CREATE)

Core function:

```javascript
export function generateActionsForGoal(goal, company, categoryTriple) {
  // categoryTriple = ['growth', 'pipeline', 'data'] (from GOAL_CATEGORY_MAP)
  // Returns exactly 3 actions, one per category

  return categoryTriple.map((category, idx) => {
    const template = getActionTemplate(goal, category, company);
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
      isPrimary: idx === 0,  // first category is primary
      sources: [{
        sourceType: 'GOAL',
        sourceId: goal.id,
        goalId: goal.id,
      }],
      entityRef: { type: 'company', id: company.id, name: company.name },
    };
  });
}
```

`GOAL_CATEGORY_MAP`: The mapping table from above, exported as a constant.

`getActionTemplate(goal, category, company)`: Returns a resolution template (resolutionId, title, steps, effort) based on goal type + category combination. Use existing resolution templates where they match, create new ones where needed. For example:
- `revenue` goal + `growth` category → `REVENUE_PUSH` resolution
- `revenue` goal + `pipeline` category → `RESOLVE_PIPELINE_GAP` resolution
- `revenue` goal + `data` category → `RESOLVE_DATA_STALE` resolution
- `fundraise` goal + `fundraise` category → `ACCELERATE_FUNDRAISE` resolution
- `fundraise` goal + `pipeline` category → `EXPAND_INVESTOR_LIST` resolution
- `fundraise` goal + `intros` category → `NETWORK_INTRO` resolution (or new `FUNDRAISE_INTRO`)
- `retention` goal + `goals` category → `ACCELERATE_GOAL` resolution
- `retention` goal + `growth` category → new `RETENTION_CAMPAIGN` resolution
- `retention` goal + `financial` category → new `CHURN_COST_ANALYSIS` resolution

Total: ~45 goal-type × category combinations (15 goal types × 3 categories each). Each needs a resolutionId, title template, and 2-4 action steps.

### 2b. Replace actionCandidates DAG step

**File**: `packages/core/runtime/engine.js`

Replace the `actionCandidates` step:

```javascript
actionCandidates: (ctx, company, now) => {
  const goals = ctx.goalGeneration || [];  // exactly 5 goals
  const allActions = [];

  for (const goal of goals) {
    const categoryTriple = GOAL_CATEGORY_MAP[goal.type] || ['goals', 'data', 'growth'];
    const actions = generateActionsForGoal(goal, company, categoryTriple);
    allActions.push(...actions);
  }

  return allActions;  // exactly 15 actions per company (5 goals × 3)
}
```

### 2c. Impact scoring stays the same

The `actionImpact` step still runs — it scores each action based on goalWeight × Δprobability. The key change is that every action now has a `goalId`, so the impact model can properly compute how much this action moves the goal.

### 2d. Action ranker stays the same

`actionRanker` still sorts by rankScore. The per-entity cap (Gate 18) still applies. The difference is that all actions are now goal-sourced.

**Acceptance**: Every company has exactly 15 actions (5 goals × 3 categories). Every action has a goalId. No action has sourceType 'ISSUE' or 'PREISSUE'. Actions span at least 5 distinct categories per company.

---

## Phase 3: Update action categories for kanban

**File**: `ui/lib/actionCategories.js`

### 3a. Add new resolutionIds to CATEGORY_MAP

Add all new resolution IDs created in Phase 2 to the CATEGORY_MAP. Every resolutionId must map to exactly one of the 7 categories.

### 3b. Verify kanban compatibility

The CompanyCard and ActionSlot components should work unchanged — they already consume actions grouped by category. The key difference is that each company will now have more even category coverage (currently dominated by `pipeline` with 74 RESOLVE_DEAL_STALE actions).

**Acceptance**: Every resolutionId in the system maps to a category. Kanban displays actions across multiple categories per company (not dominated by one).

---

## Phase 4: Update data generator

**File**: `generate-qa-data.js`

### 4a. Generate exactly 5 goals per portfolio company

The `generateGoalsForCompany()` function must produce exactly 5 goals. Current logic already targets 5 but has variable output. Enforce exactly 5:

1. Stage template goals (2-3)
2. Anomaly-appropriate goals (1-2, including retention/efficiency/customer_growth for non-Pre-seed)
3. Pad with remaining types if under 5, trim if over 5

### 4b. Action events sync

After regeneration, `actionEvents.json` must be synced to the new action IDs (which are now `{goalId}-act-{category}` format).

**Acceptance**: Every portfolio company has exactly 5 goals. QA 18/18.

---

## Phase 5: Update QA gates

**File**: `packages/core/qa/qa_gate.js`

### 5a. Modify Gate 4 (Ranking Output Correctness)

Update to verify:
- Every action has a goalId
- Every action has a category
- 15 actions per company (5 goals × 3)

### 5b. New Gate: Goal Coverage

Add gate verifying:
- Every portfolio company has exactly 5 goals in derived.activeGoals
- Goals cover at least 3 distinct types per company
- Every goal has 3 actions

### 5c. Modify Gate 16 (Proactive Action Integrity)

Update to check goal-sourced actions instead of preissue-sourced actions. Or simplify: every action references a valid goalId.

**Acceptance**: QA gates validate the new pipeline. All gates pass.

---

## Phase 6: Regenerate + verify + cleanup

1. Run `node generate-qa-data.js`
2. Sync actionEvents.json
3. Run engine, verify 300 actions (20 companies × 15)
4. Run QA
5. Write SESSION_LEDGER.md entry
6. Push

**Verification**:
```
Total actions: 300 (±10 for non-portfolio entity actions)
Every action has goalId: true
Actions per company: exactly 15
Goals per company: exactly 5
Distinct categories per company: ≥5
No ISSUE or PREISSUE sourceType on actions
QA: all gates pass
```

---

## Files Modified

- `packages/core/predict/goalFromAnomaly.js` (CREATE — Phase 1)
- `packages/core/predict/goalActions.js` (CREATE — Phase 2)
- `packages/core/runtime/engine.js` (Phase 1, 2 — new DAG steps)
- `packages/core/predict/suggestedGoals.js` (Phase 1 — reuse ANOMALY_TO_GOAL_MAP)
- `packages/core/predict/actionCandidates.js` (Phase 2 — replaced or simplified)
- `ui/lib/actionCategories.js` (Phase 3 — new resolutionIds)
- `generate-qa-data.js` (Phase 4 — exactly 5 goals)
- `packages/core/qa/qa_gate.js` (Phase 5 — updated gates)
- `packages/core/raw/chunks/sample_*.json` (Phase 6 — regenerated)
- `packages/core/raw/actionEvents.json` (Phase 6 — synced)
- `.backbone/SESSION_LEDGER.md` (Phase 6)

**Execution order**: 1 → 2 → 3 → 4 → 5 → 6. Phases 1-2 are engine core. Phase 3 is UI wiring. Phase 4 is data. Phase 5 is QA. Phase 6 is regen+verify.

---

## Dependency on FULL_METRIC_COVERAGE_CONTRACT

This contract assumes the FULL_METRIC_COVERAGE_CONTRACT has been executed first. That contract ensures:
- All 18 metric fields have stageParams bounds
- All 18 fields have anomaly detectors
- All anomaly types have goal mappings
- Data generator produces 100% fill rate

Without that contract, anomaly detection is incomplete and goal generation will be starved.

**Execution order**: FULL_METRIC_COVERAGE_CONTRACT first, then this contract.
