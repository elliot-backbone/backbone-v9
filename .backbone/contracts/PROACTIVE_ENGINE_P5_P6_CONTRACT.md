# IMPLEMENTATION CONTRACT: Proactive Engine — P5 + P6 Completion

> **For:** Claude Code
> **From:** Claude Chat
> **Created:** 2026-02-11
> **Baseline:** Backbone v9, HEAD `b6bfaec`, QA 15/15
> **Spec:** BACKBONE PROACTIVE ACTION & PRE-ISSUE ENGINE v1.0
> **Status:** Binding

---

## 0. CONTEXT

Phases P0–P4 of the Proactive Engine spec are **fully implemented**:
- P0: Doctrine hardening (forbidden.js, persistence_discipline.js, Gates 2/14)
- P1: Pre-Issue schema + 5 canonical types in PREISSUE_TYPES
- P2: Future pressure detection (5 heuristic detectors + entity-level detectors, 142 preissues at runtime)
- P3: Proactive action generation (94/96 actions from preissues via resolution templates)
- P4: rankScore integration (derivePreissueStake, goal-damage blending, single surface)

**This contract covers the remaining P5 (UI surfaces) and P6 (QA gates), plus a data quality phase (P2.1) to exercise the 5 heuristic detectors.**

---

## 1. PHASE P2.1 — SAMPLE DATA: TRIGGER HEURISTIC DETECTORS

**Problem:** The 5 heuristic detectors (RUNWAY_COMPRESSION_RISK, GOAL_FEASIBILITY_RISK, DEPENDENCY_RISK, TIMING_WINDOW_RISK, DATA_BLINDSPOT_RISK) are implemented but produce 0 results because sample data doesn't trigger thresholds.

**Why it matters:** Dead code. If no sample data exercises the heuristics, UI work and QA gates can't be validated against real output.

### 1.1 — Patch sample companies to trigger each heuristic

**Files:** `packages/core/raw/chunks/sample_companies_0.json`

Modify ≥5 existing synthetic companies so each heuristic fires at least once:

| Heuristic | Data needed | Company to patch |
|-----------|-------------|------------------|
| RUNWAY_COMPRESSION_RISK | cash/burn ratio < 12mo, burn > 0 | Pick 1 with cash + burn fields |
| GOAL_FEASIBILITY_RISK | goal with trajectory falling behind (velocity < required_slope) | Pick 1 with goals + metricFacts |
| DEPENDENCY_RISK | goal with unmet dependencies array | Pick 1, add `dependencies: [{met: false}, {met: false}, {met: true}]` to a goal trajectory |
| TIMING_WINDOW_RISK | deal with targetCloseDate < 75 days out | Pick 1 deal with close date |
| DATA_BLINDSPOT_RISK | ≥2 of 4 core metrics (cash, burn, arr, employees) missing or >30d stale | Pick 1 company, remove metrics |

**Acceptance:**
- `node packages/core/qa/qa_gate.js` → 15/15
- Engine produces ≥1 preissue of each of the 5 heuristic types
- Total action count remains ≥90 (no regression)

**Push after:** `node .backbone/cli.js push packages/core/raw/chunks/sample_companies_0.json -m "P2.1: Patch sample data to trigger all 5 heuristic detectors"`

### 1.2 — Verify heuristic output shape

**Files:** none (verification only)

Run engine, extract preissues by type, verify each heuristic preissue has:
- `probability` (number, 0–1)
- `ttiDays` (number, >0)
- `expectedFutureCost` (number, >0)
- `explain` (array, ≥1 entry)
- `evidence` (object, non-empty)
- `preventativeActions` (array, ≥1 entry)
- `preIssueType` matches one of the 5 heuristic types

If any field is missing or wrong, fix the detector in `packages/core/predict/preissues.js`.

**Acceptance:**
- All 5 heuristic types produce structurally complete preissues
- QA 15/15

**Push after (if preissues.js changed):** `node .backbone/cli.js push packages/core/predict/preissues.js -m "P2.1.2: Fix heuristic output shape"`

---

## 2. PHASE P5 — UI SURFACES

### 2.1 — Pre-Issue section on entity profile pages

**Files:**
- CREATE `ui/components/profile/sections/company/CompanyPreIssues.js`
- MODIFY `ui/components/profile/sections/registry.js` (register new section)
- MODIFY `ui/lib/profile/adapters/companyAdapter.js` (expose preissues in adapter)

**Spec:**
- New section "Upcoming Constraints" on company profile
- Renders derived preissues for the entity (from `company.derived.preissues`)
- Each pre-issue shows: title, probability (as %), time-to-impact (days), severity badge, explain[0]
- Sorted by `expectedFutureCost` descending
- Max 5 displayed, expandable if more
- Each pre-issue links to its highest-ranked related action (if one exists)
- No color-coded severity bands, no alert styling — data only

**Acceptance:**
- Company profile at `/entities/company/[id]` shows "Upcoming Constraints" section
- Section is empty when company has 0 preissues (show empty state)
- Section renders ≥1 pre-issue for patched companies from P2.1
- No new API routes needed (data already in engine output)
- QA 15/15

**Push after:** `node .backbone/cli.js push ui/components/profile/sections/company/CompanyPreIssues.js ui/components/profile/sections/registry.js ui/lib/profile/adapters/companyAdapter.js -m "P5.1: Company pre-issue profile section"`

### 2.2 — "Seeing Around Corners" on portfolio overview

**Files:**
- MODIFY `ui/pages/portfolio/index.js`
- MODIFY `ui/pages/api/entities.js` (if needed — check if preissues are already in payload)

**Spec:**
- Add compact strip below existing portfolio grid: "Seeing Around Corners"
- Shows top 3 pre-issues across entire portfolio, ranked by `expectedFutureCost`
- Each entry: company name, pre-issue title (one line), days until impact
- Each entry links to the company profile page
- No ranking numbers, no scores exposed

**Acceptance:**
- Portfolio page at `/portfolio` shows the strip
- Strip shows exactly 3 items (or fewer if <3 preissues exist)
- Each item is a click-through to entity profile
- No KPI walls, no dashboard feel
- QA 15/15

**Push after:** `node .backbone/cli.js push ui/pages/portfolio/index.js -m "P5.2: Seeing Around Corners portfolio strip"`

### 2.3 — Pre-issue tag on Action Inbox items

**Files:**
- MODIFY `ui/components/ActionCard.js`

**Spec:**
- Actions sourced from PREISSUE show a subtle "preventative" label (text only, no badge)
- Actions sourced from ISSUE show nothing extra (reactive is the default)
- Label links to the source pre-issue on the entity profile page

**Acceptance:**
- Action cards distinguish reactive vs preventative
- No visual clutter — label is secondary information
- QA 15/15

**Push after:** `node .backbone/cli.js push ui/components/ActionCard.js -m "P5.3: Preventative label on preissue-sourced actions"`

---

## 3. PHASE P6 — PROACTIVITY QA GATES

### 3.1 — Gate 16: Proactive Action Integrity

**Files:**
- MODIFY `packages/core/qa/qa_gate.js`

**Gate logic:**
- Every action with `sources[0].sourceType === 'PREISSUE'` must have a valid `preIssueId` that exists in the engine's preissue output
- Every action must have a `resolutionId` that maps to a known resolution template
- Fail count: report how many orphaned proactive actions exist

**Acceptance:**
- Gate 16 passes on current data
- Gate 16 would fail if a preissue-sourced action had a fabricated preIssueId
- QA now reports X/16 (gate count incremented)

**Push after:** `node .backbone/cli.js push packages/core/qa/qa_gate.js -m "P6.1: Gate 16 — proactive action integrity"`

### 3.2 — Gate 17: Pre-Issue Schema Enforcement

**Files:**
- MODIFY `packages/core/qa/qa_gate.js`

**Gate logic:**
- Every preissue in engine output must have: `preIssueId`, `preIssueType`, `probability` (0–1), `ttiDays` (>0), `entityRef`
- `preIssueType` must be in `PREISSUE_TYPES` enum
- No preissue may have `probability` outside [0, 1]
- No preissue may have `ttiDays` ≤ 0

**Acceptance:**
- Gate 17 passes on current data
- Gate 17 would fail on a malformed preissue
- QA X/17

**Push after:** `node .backbone/cli.js push packages/core/qa/qa_gate.js -m "P6.2: Gate 17 — pre-issue schema enforcement"`

### 3.3 — Gate 18: Per-Entity Action Cap

**Files:**
- MODIFY `packages/core/qa/qa_gate.js`

**Gate logic:**
- No single entity may have >5 actions per source type (ISSUE or PREISSUE)
- This is already enforced in ranking.js — the gate validates the output matches

**Acceptance:**
- Gate 18 passes on current data
- QA X/18

**Push after:** `node .backbone/cli.js push packages/core/qa/qa_gate.js -m "P6.3: Gate 18 — per-entity action cap"`

### 3.4 — Update CONFIG.QA_GATE_COUNT

**Files:**
- MODIFY `.backbone/config.js`

Update `QA_GATE_COUNT` from current value to 18.

**Acceptance:**
- CLI reports QA X/18 consistently
- QA 18/18

**Push after:** `node .backbone/cli.js push .backbone/config.js -m "P6.4: Bump QA gate count to 18"`

---

## 4. EXECUTION RULES

1. **Execute phases in order:** P2.1 → P5.1 → P5.2 → P5.3 → P6.1 → P6.2 → P6.3 → P6.4
2. **Push after each sub-phase.** Do not batch.
3. **QA must pass before every push.** If QA fails, fix before proceeding.
4. **No new DAG nodes.** All data already flows through existing nodes.
5. **No new API routes** unless P5.2 requires preissues in the entities payload (check first).
6. **No new dependencies.** Pure JS, existing libraries only.
7. **Ledger entry after final push** with: what happened, state (QA count, HEAD, action count), decisions, next steps, blockers.

---

## 5. INVARIANTS (must hold after every sub-phase)

- QA passes at current or higher gate count
- Total actions ≥90 (no regression)
- rankScore is the only ranking surface
- No derived values in raw/
- DAG acyclic, no dead-ends
- Doctrine auto-regenerates on push

---

## 6. OUT OF SCOPE

- Resolution primitive validation gate (spec §5.2 mentions closed set — defer until resolution templates are formalized)
- Time-sensitivity enforcement gate (requires `whyNow` field on actions — defer until action schema v2)
- Heuristic threshold tuning (P2.1 makes them fire; tuning is a separate iteration)
- Non-company entity pre-issue UI (firm, deal, round profiles — future contract)
