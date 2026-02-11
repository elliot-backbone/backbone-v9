# IMPLEMENTATION CONTRACT: Proactive Engine — Complete Gap Closure

> **For:** Claude Code
> **From:** Claude Chat
> **Created:** 2026-02-11
> **Baseline:** Backbone v9, HEAD `e761fb4`, QA 15/15, 96 actions, 142 preissues
> **Source:** BACKBONE_PROACTIVE_ENGINE_HANDOVER_V3_FULL.zip (5 files)
> **Status:** Binding
> **Supersedes:** PROACTIVE_ENGINE_P5_P6_CONTRACT.md (deleted)

---

## 0. GAP ANALYSIS

Cross-referenced full handover spec (OVERVIEW.md, PRE_ISSUES_AND_PROACTIVITY.md, IMPLEMENTATION_CONTRACT.md, PRE_ISSUE_HEURISTICS_V1.md) against live codebase.

### Already complete (P0–P4 core)

- P0: Doctrine hardening — forbidden.js (80+ fields), persistence_discipline.js, Gates 2/14
- P1: Pre-Issue schema + PREISSUE_TYPES enum (5 heuristic + entity types)
- P1.3: No caching — DAG node regenerates each cycle
- P2: All 5 heuristic detectors coded (RUNWAY_COMPRESSION_RISK, GOAL_FEASIBILITY_RISK, DEPENDENCY_RISK, TIMING_WINDOW_RISK, DATA_BLINDSPOT_RISK)
- P2.5: Per-entity dedup enforced
- P3: Action generation from preissues via resolution templates, ≤2 per pre-issue
- P4: derivePreissueStake → expectedNetImpact → computeRankScore, single surface

### Gaps found

| ID | Gap | Spec reference |
|----|-----|---------------|
| G1 | 5 heuristic detectors produce 0 output (sample data doesn't trigger thresholds) | P2.1–P2.4 acceptance: "Pre-Issues appear before Issues" |
| G2 | Missing `irreversibility` field (0–1 score) on all pre-issues | PRE_ISSUES_AND_PROACTIVITY.md §Properties, HEURISTICS_V1.md per-type I values |
| G3 | Missing `rationale` field (spec name; code uses `explain[]` — needs canonical alias) | PRE_ISSUES_AND_PROACTIVITY.md §Properties |
| G4 | Missing `linkedGoals[]` field (spec name; code uses singular `goalId` — needs array) | PRE_ISSUES_AND_PROACTIVITY.md §Properties |
| G5 | Missing `supportingSignals[]` field (spec name; code uses `evidence{}` — needs canonical alias) | PRE_ISSUES_AND_PROACTIVITY.md §Properties |
| G6 | `expectedFutureCost` doesn't use `irreversibility` (spec: P × I × impactMagnitude) | HEURISTICS_V1.md §Notes |
| G7 | No "Upcoming Constraints" section on entity profile | P5.2 |
| G8 | No "Seeing Around Corners" on portfolio overview | P5.3, max 3 |
| G9 | No preventative/reactive distinction on action cards | Implied by P5.1 |
| G10 | No QA gate: proactive action integrity (preIssueId must exist) | P6 |
| G11 | No QA gate: pre-issue schema enforcement | P6 |
| G12 | No QA gate: per-entity action cap validated on output | P6 |

---

## PHASE 1 — PRE-ISSUE SCHEMA COMPLIANCE (G2–G6)

Bring pre-issue output shape into spec compliance.

### 1.1 — Add `irreversibility` to all pre-issue detectors

**File:** `packages/core/predict/preissues.js`

Add `irreversibility` (float, 0–1) to every pre-issue emitted. Values per heuristic type from HEURISTICS_V1.md:

| Detector | Logic |
|----------|-------|
| RUNWAY_COMPRESSION_RISK | 0.8 if burn accelerating (burn growth > 0), else 0.6 |
| GOAL_FEASIBILITY_RISK | `clamp(1 - (daysLeft / 365), 0.2, 0.9)` |
| DEPENDENCY_RISK | 0.7 if dependency is relationship/regulatory type, else 0.5 |
| TIMING_WINDOW_RISK | 0.9 (fixed — windows rarely reopen) |
| DATA_BLINDSPOT_RISK | 0.6 (fixed) |
| GOAL_MISS | `clamp(1 - (daysLeft / 365), 0.2, 0.8)` |
| DEAL_STALL | 0.5 |
| ROUND_STALL | 0.6 |
| LEAD_VACANCY | 0.7 |
| All others | 0.5 (default) |

Update `expectedFutureCost` formula to: `P × I × impactMagnitude` (currently `P × impactMagnitude`, missing I).

### 1.2 — Add canonical field aliases

**File:** `packages/core/predict/preissues.js`

On every emitted pre-issue, add:
- `rationale`: alias of `explain[0]` (string, human-readable one-liner)
- `linkedGoals`: array — `[goalId]` if goalId exists, else `[]`
- `supportingSignals`: alias of `evidence` (same object, canonical name)

These are additions, not replacements. Keep `explain`, `goalId`, `evidence` for backward compat.

### 1.3 — Verify all heuristic + entity detectors emit compliant shape

After edits, run engine. Every pre-issue must have all of:
`preIssueId`, `preIssueType`, `probability`, `ttiDays`, `irreversibility`, `expectedFutureCost`, `rationale`, `linkedGoals`, `supportingSignals`, `entityRef`

**Acceptance:**
- Engine runs clean, 0 errors related to new fields
- All 142+ preissues have all spec-required fields
- `expectedFutureCost` values change (they now include irreversibility)
- QA 15/15
- Total actions ≥90

**Push:** `node .backbone/cli.js push packages/core/predict/preissues.js -m "Phase 1: Pre-issue schema compliance — irreversibility, canonical aliases, expectedFutureCost fix"`

---

## PHASE 2 — SAMPLE DATA: EXERCISE ALL HEURISTIC DETECTORS (G1)

### 2.1 — Patch sample companies to trigger each heuristic

**File:** `packages/core/raw/chunks/sample_companies_0.json`

Modify ≥5 existing synthetic companies (NOT real portfolio stubs) to trigger thresholds:

| Heuristic | Trigger condition | Patch |
|-----------|------------------|-------|
| RUNWAY_COMPRESSION_RISK | P ≥ 0.25, TTI ≤ 180d | Set cash=200000, burn=25000 (8mo runway vs 12 required) |
| GOAL_FEASIBILITY_RISK | P ≥ 0.3, D ≤ 270d | Goal with target well above current + slow velocity |
| DEPENDENCY_RISK | P ≥ 0.4, TTI ≤ 120d | Goal trajectory with `dependencies: [{met:false},{met:false},{met:true}]` |
| TIMING_WINDOW_RISK | P ≥ 0.5, TTI ≤ 150d | Deal with targetCloseDate ~60 days from now |
| DATA_BLINDSPOT_RISK | P ≥ 0.5, TTI ≤ 90d | Remove ≥2 of [cash, burn, arr, employees] from a company |

May also need patches to: `sample_goals_0.json`, `sample_deals_0.json`, `sample_metricFacts_0.json` if the companies chosen don't have the right related entities.

### 2.2 — Regen actionEvents if action IDs change

**File:** `packages/core/raw/actionEvents.json`

Data regen changes action IDs. If any event references a now-invalid action, remap (same fix as Gate 7 regression earlier this session).

### 2.3 — Verify heuristic output

Run engine. Confirm:
- ≥1 preissue of each of the 5 heuristic types
- Each has `irreversibility`, `rationale`, `linkedGoals`, `supportingSignals` (from Phase 1)
- Actions generated from heuristic preissues

**Acceptance:**
- QA 15/15
- All 5 heuristic types produce ≥1 preissue
- Total actions ≥90

**Push:** `node .backbone/cli.js push <all modified raw files> -m "Phase 2: Sample data triggers all 5 heuristic detectors"`

---

## PHASE 3 — UI SURFACES (G7–G9)

### 3.1 — "Upcoming Constraints" section on company profile

**Files:**
- CREATE `ui/components/profile/sections/company/CompanyPreIssues.js`
- MODIFY `ui/components/profile/sections/registry.js`
- MODIFY `ui/lib/profile/adapters/companyAdapter.js`

**Spec:**
- Section title: "Upcoming Constraints"
- Renders `company.derived.preissues` for the entity
- Each pre-issue shows: title, probability as %, time-to-impact in days, irreversibility as %, one-line rationale
- Sorted by `expectedFutureCost` descending
- Max 5 displayed
- Each links to highest-ranked related action (if exists)
- Empty state when 0 preissues
- No alert styling, no color-coded severity — data only

**Acceptance:**
- `/entities/company/[id]` renders section for companies with preissues
- Empty state for companies without
- QA 15/15

**Push:** `node .backbone/cli.js push ui/components/profile/sections/company/CompanyPreIssues.js ui/components/profile/sections/registry.js ui/lib/profile/adapters/companyAdapter.js -m "Phase 3.1: Upcoming Constraints section on company profile"`

### 3.2 — "Seeing Around Corners" on portfolio overview

**Files:**
- MODIFY `ui/pages/portfolio/index.js`

**Spec:**
- Compact strip below existing portfolio content
- Title: "Seeing Around Corners"
- Top 3 preissues across entire portfolio by `expectedFutureCost`
- Each entry: company name, pre-issue title (one line), days until impact
- Each links to company profile
- No scores, no ranking numbers

Check `ui/pages/api/entities.js` — if preissues aren't in the entities API payload, add them (they're in `company.derived.preissues` from engine output).

**Acceptance:**
- `/portfolio` shows strip with up to 3 items
- Each clickable through to entity profile
- QA 15/15

**Push:** `node .backbone/cli.js push ui/pages/portfolio/index.js -m "Phase 3.2: Seeing Around Corners portfolio strip"` (include entities.js if modified)

### 3.3 — Preventative label on action cards

**File:** MODIFY `ui/components/ActionCard.js`

- Actions with `sources[0].sourceType === 'PREISSUE'` show subtle text "preventative" near source info
- Actions with `sources[0].sourceType === 'ISSUE'` show nothing extra (reactive is default)
- No badges, no colors — text only

**Acceptance:**
- Visual distinction between reactive and preventative actions
- QA 15/15

**Push:** `node .backbone/cli.js push ui/components/ActionCard.js -m "Phase 3.3: Preventative label on preissue-sourced actions"`

---

## PHASE 4 — QA GATES (G10–G12)

### 4.1 — Gate 16: Proactive Action Integrity

**File:** MODIFY `packages/core/qa/qa_gate.js`

**Logic:**
- Every action with `sources[0].sourceType === 'PREISSUE'` must have a `preIssueId` in sources that matches an existing preissue in engine output
- Every action must have a `resolutionId`
- Report count of orphaned proactive actions

**Acceptance:** Gate passes on current data. Would fail on fabricated preIssueId.

**Push:** `node .backbone/cli.js push packages/core/qa/qa_gate.js -m "Phase 4.1: Gate 16 — proactive action integrity"`

### 4.2 — Gate 17: Pre-Issue Schema Enforcement

**File:** MODIFY `packages/core/qa/qa_gate.js`

**Logic:**
- Every preissue must have: `preIssueId`, `preIssueType`, `probability` (0–1), `ttiDays` (>0), `irreversibility` (0–1), `entityRef`, `rationale` (string), `linkedGoals` (array), `supportingSignals` (object)
- `preIssueType` must be in PREISSUE_TYPES
- Fail on any missing or out-of-range field

**Acceptance:** Gate passes on current data (after Phase 1 edits). Would fail on malformed preissue.

**Push:** `node .backbone/cli.js push packages/core/qa/qa_gate.js -m "Phase 4.2: Gate 17 — pre-issue schema enforcement"`

### 4.3 — Gate 18: Per-Entity Action Cap

**File:** MODIFY `packages/core/qa/qa_gate.js`

**Logic:**
- No entity may have >5 actions per source type (ISSUE or PREISSUE)
- Group actions by `entityRef.id` + `sources[0].sourceType`, count, fail if any >5

**Acceptance:** Gate passes on current data.

**Push:** `node .backbone/cli.js push packages/core/qa/qa_gate.js -m "Phase 4.3: Gate 18 — per-entity action cap"`

### 4.4 — Bump gate count in config

**File:** MODIFY `.backbone/config.js`

Update `QA_GATE_COUNT` to 18.

**Acceptance:** CLI reports QA 18/18.

**Push:** `node .backbone/cli.js push .backbone/config.js -m "Phase 4.4: QA gate count → 18"`

---

## EXECUTION RULES

1. **Phase order is mandatory:** 1 → 2 → 3 → 4 (schema before data before UI before gates)
2. **Push after each sub-phase.** Do not batch.
3. **QA must pass before every push.** Fix before proceeding.
4. **No new DAG nodes.** All data flows through existing nodes.
5. **No new API routes** unless Phase 3.2 requires preissues in entities payload.
6. **No new dependencies.**
7. **Ledger entry after final push:** what happened, state (QA count, HEAD, action count, preissue count by type), decisions, next steps, blockers.

---

## INVARIANTS (must hold after every sub-phase)

- QA passes at current or higher gate count
- Total actions ≥90
- rankScore is the only ranking surface
- No derived values in raw/
- DAG acyclic, no dead-ends
- Doctrine auto-regenerates on push
- Pre-issue count by type: all 5 heuristic types ≥1 (after Phase 2)

---

## OUT OF SCOPE

- Resolution primitive closed-set validation (defer until resolution templates formalized)
- Time-sensitivity enforcement gate (`whyNow` field not yet on actions)
- Heuristic threshold tuning beyond triggering
- Non-company entity pre-issue UI (firm, deal, round profiles)
- `expectedTimeToImpact` as distribution (spec aspirational; `ttiDays` as point estimate is sufficient for now)
