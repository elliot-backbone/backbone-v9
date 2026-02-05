# BACKBONE V9 — SHARED DOCTRINE

> **Both Chat and Code read this file on session start.**
> If `doctrine_hash` below doesn't match your local copy, pull before proceeding.
> Updated between each handover session. Format optimized for diff.

---

## §0 VERSION

```
doctrine_version: 2.1
doctrine_hash:    2206ab2
updated:          2026-02-05T22:20:51Z
updated_by:       CLI
head_at_update:   da90c5b
qa_at_update:     10/10
files_at_update:  218 (53,881 lines)
```

**Alignment check:** both environments compare `doctrine_hash` on session start. Mismatch → pull → re-read before any work.

---

## §1 NORTH STARS

```
NS1  Actions are the product
NS2  Optimize for net value
NS3  Truth before intelligence
NS4  Separation of meaning is sacred
NS5  Architecture enforces doctrine
NS6  ONE ranking surface
```

---

## §2 HARD CONSTRAINTS

```
HC1  No stored derivations in raw/        → Gate B
HC2  Single ranking surface (rankScore)    → Gate F
HC3  DAG integrity (no cycles)             → Gate A
HC4  Append-only events                    → Gate H
HC5  Lifecycle: proposed→executed→observed  → Gate C/D/E
HC6  Files < 500 lines                     → manual
HC7  No upward layer imports               → Gate A
```

---

## §3 IMPACT MODEL

```
upside           = Σ(goalWeight × Δprobability)
rankScore        = expectedNetImpact − trustPenalty − executionFrictionPenalty + timeCriticalityBoost
expectedNetImpact = upside × probabilityOfSuccess
```

```
ISSUE     lift 12–40% (severity-based)
PREISSUE  maintain: likelihood × 8–15%
GOAL      direct: 25% of trajectory gap
```

---

## §4 LAYERS

```
L0  raw/       imports: nothing          immutable input data
L1  derive/    imports: raw              pure deterministic derivations
L3  predict/   imports: raw, derive      forward predictions
L5  decide/    imports: raw, derive, predict   action ranking
L6  runtime/   imports: all              DAG executor, engine
--  qa/        imports: raw, derive, qa  structural validation
--  ui/        imports: (browser copies) Next.js frontend
```

---

## §5 DAG

```
runway:            []
metrics:           []
meetings:          []
trajectory:        [metrics]
goalTrajectory:    [metrics, trajectory]
health:            [runway]
issues:            [runway, trajectory, goalTrajectory]
preissues:         [runway, goalTrajectory, trajectory, metrics]
ripple:            [issues]
introOpportunity:  [goalTrajectory, issues]
actionCandidates:  [issues, preissues, goalTrajectory, introOpportunity]
actionImpact:      [actionCandidates, ripple]
actionRanker:      [actionImpact]
priority:          [actionRanker]
```

**Pending wiring (not yet connected):**

```
meetings → preissues       "no meeting in 30 days" signal
meetings → actionCandidates follow-up actions from extracted items
meetings → health          engagement/sentiment signals
```

---

## §6 QA GATES

```
Total: 16 checks, 7 structural gates
Runner: node qa/qa_gate.js (loads full runtime data since db55e1b)
```

```
Gate A  Layer imports              always runs
Gate B  No stored derivations      always runs
Gate C  DAG integrity              runs when events exist
Gate D  Actions have rankScore     runs when events exist
Gate E  Lifecycle monotonicity     runs when events exist
Gate F  Single ranking surface     always runs
Gate G  Determinism                always runs
Gate H  Append-only events         always runs
Gate I  Unified impact model       always runs
```

---

## §7 FILE OWNERSHIP

```
OWNER    PATH                              OTHER ENV
Code     raw/ derive/ predict/ decide/     Chat: read only
Code     runtime/                          Chat: read only
Code     qa/qa_gate.js                     Chat: run, not edit
Code     ui/                               Chat: view, not edit
Code     .backbone/granola.js              Chat: read output
Code     raw/meetings/                     Chat: read for analysis
Code     raw/meetings/transcripts/         Chat: read for analysis
Code     derive/meetingParsing.js          Chat: read via engine
Code     derive/meetings.js               Chat: read derived.meetings
Shared   .backbone/cli.js                  coordinate via ledger
Shared   .backbone/config.js              coordinate via ledger
Shared   .backbone/SESSION_LEDGER.md      both append
Shared   CLAUDE.md                         coordinate via ledger
Shared   DOCTRINE.md (this file)           Chat updates, Code reads
```

---

## §8 TASK ROUTING

```
CHAT: deploy monitoring, prospecting (Explorium), email/calendar,
      document generation, fundraising outreach, architecture decisions,
      past conversation lookup, meeting analysis, refresh packets,
      doctrine updates

CODE: file edits (all layers), multi-file refactors, QA execution,
      UI development, git operations, dependency management,
      test execution, Granola sync, bug debugging
```

---

## §9 SYNC INVARIANTS

```
INV1  One writer at a time      only one env edits repo files per task
INV2  Push before switch        env that edited must push before other starts
INV3  Ledger before close       every file-changing session writes ledger entry
```

**Conflict resolution:**

```
Both pushed         → Code authoritative, Chat re-pulls
Chat fragmented     → Code squashes next session
Code forgot ledger  → Chat writes reconciliation
Chat forgot ledger  → Code writes reconciliation
Doctrine mismatch   → older env pulls; Chat authoritative on doctrine content
```

---

## §10 SESSION PROTOCOL

**Startup:**

```
1  Chat: pull workspace (downloads repo, runs QA, shows ledger)
2  Code: git pull origin main
3  Code: cat .backbone/SESSION_LEDGER.md | head -20
4  Code: node qa/qa_gate.js → must show 16/16
5  Both: compare HEAD hashes → must match
6  Both: compare doctrine_hash → must match
```

**Shutdown:**

```
1  Code: node qa/qa_gate.js → must pass
2  Code: git add -A && git commit -m 'msg'
3  Writer: edit .backbone/SESSION_LEDGER.md (6 required fields)
4  Code: git commit ledger && git push origin main
5  Chat (optional): Vercel:list_deployments → confirm READY
6  If architecture/gates/model changed → regenerate DOCTRINE.md
```

---

## §11 LEDGER FIELDS

```
REQUIRED  What happened       factual summary
REQUIRED  Current state       QA, HEAD, file count, deploy
REQUIRED  Active work         in progress or partial
REQUIRED  Decisions made      architecture/design choices
REQUIRED  Next steps          what next session should do
REQUIRED  Blockers            anything preventing progress
```

---

## §12 PORTFOLIO COMPANIES (in raw/sample.json)

```
Real stubs (meeting-matched):
  c-grocerylist    GroceryList
  c-checker        Checker
  c-lavapayments   Lava Payments
  c-autar          Autar
  c-plutocredit    Pluto Credit
  c-lucius         Lucius Finance
  c-dolfinai       Dolfin AI

Synthetic: 120 generated companies (for pipeline testing)
Total: 127 companies
```

---

## §13 MEETING INTELLIGENCE

```
Pipeline:     .backbone/granola.js → raw/meetings/ → derive/meetingParsing.js → derive/meetings.js
Meetings:     25 synced
Transcripts:  25 in raw/meetings/transcripts/
Matching:     3-strategy cascade (participant org → title parsing → email domain)
NLP:          pure rule-based/deterministic, no ML
Output:       derived.meetings per company (actions, decisions, risks, metrics, topics, sentiment)
DAG node:     meetings (base node, no dependencies)
Downstream:   nothing depends on meetings yet (wiring deferred)
```

### Standalone Transcript Archive

```
Repo:         github.com/elliot-backbone/granola-transcripts (private)
Local:        ~/granola-transcripts/
Script:       ~/granola-transcripts/bin/sync.sh
Schedule:     midnight daily via launchd (com.elliotstorey.granola-transcript-sync)
Old agent:    com.backbone.granola-sync REMOVED (was in backbone-v9, replaced)
Flow:         Keychain OAuth → token refresh → list_meetings (25h window) → get_meeting_transcript per ID
Output:       ~/granola-transcripts/transcripts/YYYY-MM-DD/{Title}__{meeting-id}.json
Content:      FULL verbatim transcripts (not summaries), verified word-for-word
Dedup:        SHA-256 diff check, skips unchanged on re-run
Logs:         ~/granola-transcripts/logs/sync-YYYY-MM-DD.log
First run:    25 transcripts, 668KB, 23 meetings with full text, 1 null, 1 short
```

---

## §14 KEY ENTRY POINTS

```
runtime/main.js                  core engine
runtime/engine.js                DAG executor
runtime/graph.js                 DAG definition
qa/qa_gate.js                    QA validation (16 checks)
decide/ranking.js                THE ranking function
derive/meetingParsing.js         NLP extraction
derive/meetings.js               company matching + aggregation
ui/pages/index.js                UI entry
ui/pages/api/actions/today.js    action API
.backbone/config.js              project config (env-aware)
.backbone/granola.js             meeting sync pipeline
.backbone/SESSION_LEDGER.md      cross-env sync
```

---

## §15 DEPLOY

```
url:          https://backbone-v9-ziji.vercel.app
dashboard:    https://vercel.com/backbone-2944a29b/backbone-v9-ziji
project_id:   prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ
team_id:      team_jy2mjx7oEsxBERbaUiBIWRrz
trigger:      auto on push to main
local dev:    cd ui && npm run dev → http://localhost:3000
```

---

## §16 EMERGENCY

```
Different HEADs        → Code: git pull. Chat: pull --force. Compare.
QA failing             → Code fixes locally, re-runs. Never push failing QA.
Vercel deploy failed   → Chat: Vercel:get_deployment_build_logs. Code fixes.
Token expired          → Regenerate at github.com/settings/tokens. Update .github-token.
Ledger out of sync     → Whoever notices writes reconciliation entry.
Context compaction     → Chat re-pulls workspace. Ledger provides continuity.
Doctrine stale         → Chat regenerates. Code pulls.
Gate count confusion   → Was 6 (v1.0), now 16 (since db55e1b). This is correct.
```

---

## §17 CHANGELOG

```
v2.0 → v2.1  (2026-02-05)

Transcript sync:  Standalone repo ~/granola-transcripts/ (github.com/elliot-backbone/granola-transcripts)
                  Automated daily sync via bin/sync.sh + launchd at midnight
                  Full verbatim transcripts via direct MCP API (get_meeting_transcript)
                  OAuth auto-refresh from macOS Keychain, SHA-256 dedup
                  First run: 25 transcripts, 668KB
LaunchAgent:      com.backbone.granola-sync REMOVED → com.elliotstorey.granola-transcript-sync
GitHub CLI:       gh installed (brew), authenticated as elliot-backbone
Updated by:       CODE

v1.0 → v2.0  (2026-02-04 → 2026-02-05)

QA:         6/6 → 16/16 (CLI runner loads full runtime data, db55e1b)
HEAD:       b6a5ced → 25506e0 (3 Code sessions)
Files:      217 (53,292 LOC) → 219 (54,018 LOC)
New:        derive/meetingParsing.js, derive/meetings.js
DAG:        +meetings node (base, no deps)
Companies:  +7 real stubs (GroceryList, Checker, Lava, Autar, Pluto, Lucius, Dolfin)
Transcripts: 0 → 25 (enabled in granola-config.js)
Matching:   3-strategy cascade implemented
Format:     restructured from docx → flat diff-optimized .md
```

---

## §18 PENDING

```
P1  Wire meetings → preissues         "no meeting in 30 days" detection
P2  Wire meetings → actionCandidates  follow-up actions from extracted items
P3  Meeting-derived health scoring    engagement, sentiment, frequency
P4  Populate actionEvents.json        enables Gates C/D/E full execution
P5  Add introOutcomes.json            when intro tracking implemented
```
