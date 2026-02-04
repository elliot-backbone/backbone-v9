# Backbone V9 — Claude Code Project Context

## First: Read the Session Ledger
**Before doing anything, read `.backbone/SESSION_LEDGER.md`** to understand what happened in the last session (whether it was in Chat or Code). This is how you stay in sync with the other environment.

## Before Finishing: Write to the Session Ledger
**Before ending any session where you made changes, append a new entry** (newest first) to `.backbone/SESSION_LEDGER.md` using the template at the bottom of that file. This is how Chat stays in sync with you.

---

## Architecture

Layered computation engine for venture portfolio management. Layer imports flow downward only.

```
raw/        → L0: Immutable input data (entities, schemas, events)
derive/     → L1: Pure deterministic derivations (metrics, trajectory, calibration)
predict/    → L3: Forward predictions (issues, preissues, goals, ripple)
decide/     → L5: Action ranking (single surface via rankScore)
runtime/    → L6: Execution engine (DAG, graph, session memory)
qa/         → Quality gates (structural validation)
ui/         → Frontend (Next.js, Tailwind, profile pages, API routes)
.backbone/  → CLI tools, config, session ledger
```

Import rules: raw imports nothing external. derive imports raw. predict imports raw + derive. decide imports raw + derive + predict. runtime imports everything. qa imports raw + derive + qa.

## Hard Constraints (Never Violate)

1. **No stored derivations in raw/** — Fields like rankScore, health, priority, runway must never appear in raw/*.json. All derivations computed at runtime.
2. **Single ranking surface** — Only `rankScore` determines action order. Only `decide/ranking.js` may sort actions. No other file may sort by rankScore or create alternative rankings.
3. **DAG integrity** — `runtime/graph.js` enforces acyclic execution. No cycles permitted.
4. **Append-only events** — `raw/actionEvents.json` is an immutable ledger. Events are never modified or deleted.
5. **Lifecycle monotonicity** — Actions flow: proposed → executed → observed. Never backwards.
6. **Files < 500 lines** — Split if approaching limit.
7. **No upward layer imports** — derive/ cannot import from predict/. predict/ cannot import from decide/. Etc.

## Impact Model

```
upside = Σ(goalWeight × Δprobability)
```

All action value measured by impact on goal fulfillment:
- ISSUE actions: Fixing problems lifts goal probability (12-40% based on severity)
- PREISSUE actions: Prevention maintains probability (likelihood × 8-15%)
- GOAL actions: Direct progress (25% of trajectory gap)

## Ranking Formula

```
rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost
```

Where `expectedNetImpact = upside × probabilityOfSuccess`

## North Stars

- NS1: Actions are the product
- NS2: Optimize for net value
- NS3: Truth before intelligence
- NS4: Separation of meaning is sacred
- NS5: Architecture enforces doctrine
- NS6: ONE ranking surface

## QA Gate — Run Before Every Commit

```bash
node qa/qa_gate.js
```

Must pass before pushing. 7 structural gates:
1. Layer import rules
2. No stored derivations in raw/
3. DAG has no cycles
4. Actions have rankScore
5. Single ranking surface
6. Append-only events
7. Unified impact model

## Pre-Commit Checklist

```bash
node qa/qa_gate.js          # Must pass
git add -A
git commit -m "descriptive message - list files changed"
git push origin main
```

Vercel auto-deploys on push to main. No manual deploy step needed.

## What This Environment Handles

You (Claude Code) handle: file editing, git operations, local dev server, QA execution, test execution, refactoring, debugging. You have persistent disk and native git.

## What Chat Handles (Don't Duplicate)

Claude Chat handles: Vercel deployment monitoring (MCP connector), refresh packet certification, handoff documents, portfolio operations (Explorium, Drive, Gmail), document generation (docx/pptx), fundraising outreach, architecture decisions that require cross-referencing external services.

## Key Entry Points

- `runtime/main.js` — Core engine
- `runtime/engine.js` — DAG executor
- `qa/qa_gate.js` — QA validation
- `decide/ranking.js` — The ONE ranking function
- `ui/pages/index.js` — UI entry
- `ui/pages/api/actions/today.js` — Action API
- `.backbone/config.js` — Project config
- `.backbone/SESSION_LEDGER.md` — Cross-environment sync

## Local Dev

```bash
cd ui && npm install && npm run dev
# Opens at http://localhost:3000
```

## Deployed

- URL: https://backbone-v9-ziji.vercel.app
- Dashboard: https://vercel.com/backbone-2944a29b/backbone-v9-ziji
