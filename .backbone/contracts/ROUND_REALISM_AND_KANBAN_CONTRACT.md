# ROUND_REALISM_AND_KANBAN_CONTRACT

**Date:** 2026-02-12
**Author:** Chat
**Scope:** Data generator round/deal realism, preissue action scoring calibration, kanban UI

---

## Context

Three interconnected issues:

1. **Duplicate/unrealistic rounds** — generator creates multiple rounds at the same stage per company, allows multiple simultaneous active rounds, and deals are randomly assigned to rounds regardless of round status. 31 rounds have zero deals. Only 46/148 closed rounds have won deals.

2. **Preissue actions buried** — preissue-sourced actions average rankScore 18.1 vs issue-sourced at 77.0. Upcoming constraints are correctly computed and wired to the UpcomingConstraints component, but the actions they generate never surface because the impact scoring systematically underweights them.

3. **Kanban UI** — replace the current proactive/reactive action list with a Portfolio Command Board of company trading cards, each showing one action per category.

---

## PHASE 1 — Round & Deal Realism (generate-qa-data.js)

### 1.1 — Progressive round stages per company

**File:** `generate-qa-data.js` → `generateRound()`

Current: every round gets `company.stage` as its stage.
Fix: each company gets a progression of rounds. A Series B company should have: closed Pre-seed, closed Seed, closed Series A, active Series B.

```
STAGE_ORDER = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C']
```

For company at stage index N, generate rounds from index 0 to N. Rounds at index < N are `closed`. Round at index N is `active` (if company.raising) or `closed` (if not). Max 1 active round per company, enforced.

### 1.2 — Deal composition per round

**File:** `generate-qa-data.js` → deal generation loop

Current: deals randomly assigned to any round via `pick(companyRounds)`, status independent of round status.

Fix: deals must be coherent with their round's status.

**Closed rounds** get:
- 1–3 won deals (these are the investors who participated)
- 1–4 lost/passed deals (investors who declined or didn't proceed)
- 0 active deals (round is done)
- Total committed from won deals should approximate the round's `amt` field

**Active rounds** get:
- 0–2 won deals (committed investors so far)
- 1–3 active deals at various stages (Sourcing through Due Diligence)
- 0–2 passed/lost deals
- Total committed from won deals should be < round `amt` (still raising)

**No round should have zero deals.** Every round gets at least 2 deals.

### 1.3 — Round target amounts coherent with stage

Round `amt` field should reflect realistic raise sizes from `stageParams.js`:
- Pre-seed: $500K–$2M
- Seed: $2M–$8M  
- Series A: $8M–$25M
- Series B: $20M–$60M
- Series C: $50M–$150M

### 1.4 — Won deal amounts sum to round amount

For closed rounds: sum of `amt` on won deals ≈ round `amt` (within ±15%).
For active rounds: sum of `amt` on won deals < round `amt`.

**Acceptance:**
- 0 companies with >1 active round
- 0 rounds with 0 deals
- All closed rounds have ≥1 won deal
- All active rounds have ≥1 active deal
- Round stages are progressive per company (no Series A before Seed)
- QA 18/18

**Push:** `node .backbone/cli.js push generate-qa-data.js packages/core/raw/chunks/sample_rounds_0.json packages/core/raw/chunks/sample_deals_0.json packages/core/raw/actionEvents.json -m "Phase 1: Round & deal realism — progressive stages, coherent deal composition"`

---

## PHASE 2 — Preissue Action Scoring Calibration (predict/actionImpact.js)

### 2.1 — Fix likelihood floor

**File:** `packages/core/predict/actionImpact.js`

Current: `const likelihood = preissue.likelihood || 0.5` — defaults to 0.5 even when the preissue has a computed `probability` field.

Fix: use `preissue.probability || preissue.likelihood || 0.5`. The preissue probability is already computed in `preissues.js` — the impact function just isn't reading it.

### 2.2 — Reduce time-to-impact discount

Current behavior: preissues 60+ days out get heavily discounted. A preissue at 60 days with $5M stake and 70% probability scores ~18 while an issue with $500K stake scores ~77.

Fix: change the TTI discount curve. Preissues within 30 days should score at parity with issues of equivalent stake. Preissues 30–90 days out should get a 0.6–0.9 multiplier, not the current effective 0.15–0.3.

Proposed curve:
```
ttiMultiplier = ttiDays <= 14 ? 1.0
              : ttiDays <= 30 ? 0.9
              : ttiDays <= 60 ? 0.75
              : ttiDays <= 90 ? 0.6
              : 0.4
```

### 2.3 — Increase preissue stake floor for fundraising types

`derivePreissueStake()` for `ROUND_STALL` and `GOAL_MISS` (fundraise goals) should use the round amount as stake, not a generic calculation. A stalled $20M Series B round has $20M at risk.

### 2.4 — Verify calibration

After changes, run engine. Confirm:
- Top 20 actions include ≥5 preissue-sourced actions
- Preissue action average score ≥ 40 (up from 18.1)
- No preissue action scores higher than the highest issue action (issue actions should still dominate when genuinely more urgent)

**Acceptance:**
- Preissue actions appear in top 20
- Average preissue score ≥ 40
- Score distribution has reasonable overlap between issue and preissue sources
- QA 18/18

**Push:** `node .backbone/cli.js push packages/core/predict/actionImpact.js -m "Phase 2: Preissue scoring calibration — fix likelihood, TTI curve, stake floor"`

---

## PHASE 3 — Regenerate Data & Verify Pipeline

### 3.1 — Regenerate sample data

```bash
node generate-qa-data.js
```

### 3.2 — Sync actionEvents

If action IDs changed, remap `actionEvents.json` references.

### 3.3 — Verify end-to-end

Run engine. Confirm:
- Rounds are progressive per company
- All rounds have deals
- Preissue actions surface in top 20
- UpcomingConstraints component shows data on company profiles
- Total actions ≥ 100

**Acceptance:**
- QA 18/18
- Engine runs without errors
- All Phase 1 and Phase 2 acceptance criteria met

**Push:** all modified raw chunk files + actionEvents.json

---

## PHASE 4 — Portfolio Command Board (Kanban UI)

### 4.1 — Action category utility

**CREATE:** `ui/lib/actionCategories.js`

Maps resolutionId → user-facing category:

| Category | Label | Resolution IDs |
|----------|-------|----------------|
| fundraise | Fundraise | ACCELERATE_FUNDRAISE, EXPAND_INVESTOR_LIST, FOLLOW_UP_INVESTOR |
| pipeline | Pipeline | RESOLVE_PIPELINE_GAP, RESOLVE_DEAL_STALE, PRIORITIZE_LEAD_CANDIDATES |
| goals | Goals | RESOLVE_GOAL_STALLED, ACCELERATE_GOAL |
| financial | Financial | REDUCE_BURN |
| growth | Growth | REVENUE_PUSH, PRODUCT_SPRINT |
| data | Data | RESOLVE_DATA_MISSING, RESOLVE_DATA_STALE |
| intros | Intros | INTRODUCTION, FOLLOWUP |

Impact bucketing (derived at render time, never stored):
- High: rankScore ≥ 60
- Medium: rankScore 30–59
- Low: rankScore < 30

### 4.2 — Companies API route

**CREATE:** `ui/pages/api/companies.js`

Returns portfolio companies with snapshot metrics: id, name, stage, sector, burn, cash, runway (derived), revenue/ARR, headcount, raising, roundTarget. Sourced from `loadRawData()` + engine `compute()` for derived fields.

### 4.3 — CompanyCard component

**CREATE:** `ui/components/CompanyCard.js`

Anatomy (top to bottom):
1. **Identity strip** — company name, stage badge, sector tag
2. **Snapshot row** — 3–4 compact metrics: runway (months), ARR, burn, headcount
3. **Action slots** — one row per category, showing top-ranked action. Each slot: category label, action title (truncated), impact badge (H/M/L), done ✓ / skip ✗ buttons
4. **Card border/treatment** — subtle visual conveying overall urgency (derived from aggregate score, no number shown)

### 4.4 — ActionSlot component

**CREATE:** `ui/components/ActionSlot.js`

Single category row within a card:
- Category icon + label (left)
- Action title, truncated to 1 line (center)
- Impact badge: High (bb-red), Medium (bb-amber), Low (bb-text-muted)
- Done button (✓) — fires skip/complete event, loads next action in category
- Skip button (✗) — fires skip event with 24h cooldown, loads next action
- Empty state when no more actions in category
- Click on title opens ActionDetailModal

### 4.5 — Rewrite index.js

**REWRITE:** `ui/pages/index.js`

Replace two-column reactive/proactive layout with:
- Title: "Portfolio Command Board" or just the existing header
- Grid of CompanyCards, responsive (2 cols on desktop, 1 on mobile)
- Cards sorted by aggregate impact (sum of top action rankScores per category)
- Fetches from `/api/actions/today` + `/api/companies`
- Groups actions by company, then by category
- Each card consumes its slice of actions

### 4.6 — ActionDetailModal compatibility

**MODIFY:** `ui/components/ActionDetailModal.js` (if needed)

Ensure it works when opened from CompanyCard context. No structural changes expected — just verify props pass through correctly.

**Acceptance:**
- Homepage shows company cards in a grid
- Each card shows identity + snapshot + action slots
- Done/skip on slots loads next action in category
- Click action title opens detail modal
- No scores visible — only H/M/L impact badges
- Cards ordered by aggregate impact
- Empty categories show graceful empty state
- Mobile responsive (1 column)
- QA 18/18

**Push:** `node .backbone/cli.js push ui/lib/actionCategories.js ui/pages/api/companies.js ui/components/CompanyCard.js ui/components/ActionSlot.js ui/pages/index.js -m "Phase 4: Portfolio Command Board — kanban company cards with category action slots"`

---

## PHASE 5 — Round List Dedup + Ledger

### 5.1 — Rounds page grouping

**MODIFY:** `ui/pages/rounds/index.js`

Group rounds by company. Within each company, show rounds in stage order (earliest first). Active rounds get visual prominence. Closed rounds are collapsed/secondary.

### 5.2 — Entity API dedup hint

**MODIFY:** `ui/pages/api/entities.js`

For round entities, add `isLatest: true/false` flag — true if this is the company's most recent round. UI can filter on this.

### 5.3 — Ledger entry

Write session ledger entry documenting all changes.

**Acceptance:**
- Rounds page groups by company
- No visual duplicates (same company + same stage showing twice prominently)
- QA 18/18

**Push:** remaining modified files + SESSION_LEDGER.md

---

## Execution Order

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phases 1–3 are data/engine. Phase 4 is UI. Phase 5 is cleanup. Each phase is independently pushable and verifiable.

## QA Gates

All existing 18 gates must pass after every phase. No new gates required — the existing "single ranking surface" gate ensures the kanban doesn't introduce a second ranking mechanism (it doesn't — it groups the same rankScore-ordered actions by category).
