# Backbone V9 — Claude Code Project Context

## Session Start Protocol

1. **Read the session ledger first:** `cat .backbone/SESSION_LEDGER.md` — the top entry tells you what happened last (in Chat or Code). This is how you stay synchronized.
2. **Read the doctrine:** `head -15 DOCTRINE.md` — check `doctrine_hash` and `head_at_update`. If `head_at_update` doesn't match current HEAD, doctrine is stale. Chat must regenerate before architectural work proceeds.
3. **Pull latest:** `git pull origin main`
4. **Run QA:** `node qa/qa_gate.js` — confirm baseline is clean before making changes.
5. **Check active work:** The ledger entry's "Active work" and "Next steps" fields tell you what to continue.

## Session End Protocol

1. **Run QA:** `node qa/qa_gate.js` — must pass before committing.
2. **Commit and push:** `git add -A && git commit -m "descriptive message" && git push origin main`
3. **Write ledger entry:** Append a new entry to `.backbone/SESSION_LEDGER.md` (newest first, use the template at the bottom of that file). Then commit and push the ledger too.
4. **If architecture, gates, impact model, or DAG changed:** Note in the ledger entry that doctrine needs regeneration. Chat will update `DOCTRINE.md` on next session.

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

**Import rules:** raw imports nothing external. derive imports raw. predict imports raw + derive. decide imports raw + derive + predict. runtime imports everything. qa imports raw + derive + qa.

**Data ingestion:** `raw/meetings/` populated by Granola MCP daily sync (`.backbone/granola.js`). Meeting notes normalized to chunk/manifest pattern. Config in `.backbone/granola-config.js`. Full verbatim transcripts also archived to standalone repo `~/granola-transcripts/` via `bin/sync.sh` + launchd at midnight (`com.elliotstorey.granola-transcript-sync`). Old agent `com.backbone.granola-sync` removed.

## Hard Constraints (Never Violate)

1. **No stored derivations in raw/** — Fields like rankScore, health, priority, runway must never appear in raw/*.json. All derivations computed at runtime.
2. **Single ranking surface** — Only `rankScore` determines action order. Only `decide/ranking.js` may sort actions. No other file may sort by rankScore or create alternative rankings.
3. **DAG integrity** — `runtime/graph.js` enforces acyclic execution. No cycles.
4. **Append-only events** — `raw/actionEvents.json` is an immutable ledger. Events never modified or deleted.
5. **Lifecycle monotonicity** — Actions: proposed → executed → observed. Never backwards.
6. **Files < 500 lines** — Split if approaching limit.
7. **No upward layer imports** — derive/ cannot import predict/. predict/ cannot import decide/. Etc.

## Impact Model

```
upside = Σ(goalWeight × Δprobability)
```

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

## QA Gate

```bash
node qa/qa_gate.js
```

7 structural gates — must all pass before any commit:
1. Layer import rules
2. No stored derivations in raw/
3. DAG has no cycles
4. Actions have rankScore
5. Single ranking surface
6. Append-only events
7. Unified impact model

## What This Environment (Code) Handles

- All file edits to raw/, derive/, predict/, decide/, runtime/, ui/
- Running QA gates and fixing failures in-place
- Git branch management (feature branches OK)
- Next.js dev server: `cd ui && npm install && npm run dev`
- Refactoring passes across multiple files
- Debugging build failures with real stack traces
- Test execution: `node tests/*.spec.js`

## What Chat Handles (Do NOT Duplicate Here)

- Vercel deployment monitoring via MCP connector
- Refresh packet certification (`node .backbone/cli.js refresh`)
- Handoff document generation (`node .backbone/cli.js handoff`)
- Portfolio operations (Explorium prospecting, Drive, Gmail, Calendar)
- Document generation (docx/pptx/xlsx)
- Fundraising outreach
- Architecture decisions requiring cross-reference with external services

## Workflow Pattern

**Design in Chat → Execute in Code → Verify in Chat**

Chat decides what to build (architecture, data model, QA gate requirements). Code builds it (file edits, tests, git). Chat verifies it (deploy monitoring, refresh certification, integration with external services).

## Key Entry Points

| File | Purpose |
|------|---------|
| `runtime/main.js` | Core engine |
| `runtime/engine.js` | DAG executor |
| `qa/qa_gate.js` | QA validation |
| `decide/ranking.js` | The ONE ranking function |
| `ui/pages/index.js` | UI entry |
| `ui/pages/api/actions/today.js` | Action API |
| `.backbone/config.js` | Project config (environment-aware) |
| `.backbone/granola.js` | Granola MCP meeting sync pipeline |
| `.backbone/granola-config.js` | Granola OAuth, paths, feature flags |
| `.backbone/SESSION_LEDGER.md` | Cross-environment sync |

## Local Dev

```bash
cd ui && npm install && npm run dev
# http://localhost:3000
```

## Deployed

- URL: https://backbone-v9-ziji.vercel.app
- Dashboard: https://vercel.com/backbone-2944a29b/backbone-v9-ziji
- Vercel auto-deploys on push to main
