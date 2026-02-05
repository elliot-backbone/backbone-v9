# Backbone V9 — Claude Code

> **You are in Code.** This file loads automatically. DOCTRINE.md has the full spec.
> A startup hook runs `.claude/hooks/startup.sh` — check its output for sync status.

---

## FIRST: Verify Sync

```bash
git fetch origin main && git rev-parse --short HEAD
head -15 DOCTRINE.md
cat .backbone/SESSION_LEDGER.md | head -25
node qa/qa_gate.js
```

If HEAD differs from `head_at_update` in DOCTRINE.md and you're doing architectural work, flag it: "doctrine stale, Chat must regen."

---

## You Own

```
raw/          immutable data (schemas, events, meetings)
derive/       deterministic calculations (metrics, trajectory, meetings NLP)
predict/      forward predictions (issues, preissues, goals)
decide/       action ranking (ONE function: ranking.js)
runtime/      DAG executor (graph.js, engine.js)
qa/           gates (qa_gate.js — 16 checks)
ui/           Next.js frontend
.backbone/    CLI, config, granola sync
```

**Native git.** Commit freely, push when QA passes. Feature branches OK.

---

## You Don't Have

- Vercel MCP (Chat monitors deploys)
- Explorium/prospecting tools (Chat only)
- Gmail/Calendar/Drive (Chat only)
- Document generation (Chat only)

**If you need deploy status:** Tell user to ask Chat, or check https://vercel.com/backbone-2944a29b/backbone-v9-ziji manually.

---

## Hard Constraints (QA enforces)

```
HC1  No derivations in raw/*.json     (rankScore, health, priority = runtime only)
HC2  Single ranking surface           (only decide/ranking.js sorts by rankScore)
HC3  DAG has no cycles                (runtime/graph.js)
HC4  Append-only events               (raw/actionEvents.json immutable)
HC5  Lifecycle monotonic              (proposed → executed → observed, never back)
HC6  Files < 500 lines                (split if approaching)
HC7  No upward imports                (derive can't import predict, etc.)
```

---

## Impact Model (memorize)

```
upside         = Σ(goalWeight × Δprobability)
rankScore      = expectedNetImpact − trustPenalty − friction + urgency
expectedNet    = upside × probabilityOfSuccess
```

---

## DAG (runtime/graph.js)

```
runway → health
metrics → trajectory → goalTrajectory → issues → ripple
                    ↘ preissues
                    ↘ introOpportunity
                         ↘ actionCandidates → actionImpact → actionRanker → priority

meetings (base node, nothing depends on it yet — wiring pending)
```

---

## Workflow

```
1. git pull origin main
2. Read SESSION_LEDGER.md "Active work" and "Next steps"
3. Do the work (edit files, run tests, debug)
4. node qa/qa_gate.js → must pass
5. git add -A && git commit -m "msg" && git push origin main
6. Write ledger entry (6 fields: what happened, state, active, decisions, next, blockers)
7. git add .backbone/SESSION_LEDGER.md && git commit -m "ledger" && git push
```

If you changed architecture/gates/DAG/impact model: note "doctrine needs regen" in ledger.

---

## Key Files

| What | Where |
|------|-------|
| DAG definition | `runtime/graph.js` |
| DAG executor | `runtime/engine.js` |
| THE ranking function | `decide/ranking.js` |
| QA (run before commit) | `node qa/qa_gate.js` |
| Meeting NLP | `derive/meetingParsing.js` |
| Meeting → company | `derive/meetings.js` |
| Session sync | `.backbone/SESSION_LEDGER.md` |
| Full doctrine | `DOCTRINE.md` |

---

## Local Dev

```bash
cd ui && npm install && npm run dev
# http://localhost:3000
```

---

## Compact Instructions

When context compacts, focus on:
- Current QA status (`node qa/qa_gate.js`)
- DOCTRINE.md §5 (DAG) and §18 (PENDING)
- SESSION_LEDGER.md top entry
- Any file you were actively editing

---

## Don't

- Push without QA passing
- Edit DOCTRINE.md (Chat owns it)
- Assume you have Vercel/Explorium/Gmail access (you don't)
- Store derived fields in raw/*.json
- Create alternative ranking surfaces
- Forget the ledger entry
