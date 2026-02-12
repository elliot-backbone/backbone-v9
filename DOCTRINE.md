# BACKBONE V9 — SHARED DOCTRINE

> **Both Chat and Code read this file on session start.**
> If `doctrine_hash` below doesn't match your local copy, pull before proceeding.
> Auto-regenerated on each push by `.backbone/doctrine-gen.js`.

---

## §0 VERSION

```
doctrine_version: 4.0
doctrine_hash:    a739e8da
updated:          2026-02-12
updated_by:       AUTO (doctrine-gen.js)
head_at_update:   cf6463e
qa_at_update:     18/18
```

**Auto-generated on each push.** Extracted sections (DAG, gates, layers, companies, meetings, entry points) are rebuilt from source. Preserved sections (north stars, constraints, changelog, pending) are kept from the previous version.

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

## §3 RANKING MODEL

Canonical scorer: `computeRankScore` (additive EV formula). No other scoring function is engine-reachable.

```
rankScore = expectedNetImpact
          − trustPenalty
          − executionFrictionPenalty
          + timeCriticalityBoost
          + sourceTypeBoost
          + patternLift

expectedNetImpact = (upsideMagnitude × combinedProbability)
                  + secondOrderLeverage
                  − (downsideMagnitude × (1 − combinedProbability))
                  − effortCost
                  − timePenalty(timeToImpactDays)

combinedProbability = executionProbability × probabilityOfSuccess
```

```
ISSUE     lift 12–40% (severity-based)
PREISSUE  maintain: likelihood × 8–15%
GOAL      direct: 25% of trajectory gap
```

---

## §4 LAYERS

```
L0  packages/core/raw/        imports: nothing                 immutable input data
L1  packages/core/derive/     imports: raw                     pure deterministic derivations
L3  packages/core/predict/    imports: raw, derive             forward predictions
L5  packages/core/decide/     imports: raw, derive, predict    action ranking
L6  packages/core/runtime/    imports: all                     DAG executor, engine
--  packages/core/qa/         imports: raw, derive, qa         structural validation
--  ui/                       imports: @backbone/core          Next.js frontend
```

---

## §5 DAG

```
runway:               []
metrics:              []
meetings:             []
snapshot:             [metrics]
trajectory:           [metrics]
goalTrajectory:       [metrics, trajectory]
health:               [runway]
issues:               [runway, trajectory, goalTrajectory, snapshot]
preissues:            [runway, goalTrajectory, trajectory, metrics, meetings, snapshot]
ripple:               [issues]
introOpportunity:     [goalTrajectory, issues]
goalDamage:           [issues, goalTrajectory]
suggestedGoals:       [snapshot, goalTrajectory, issues]
actionCandidates:     [issues, preissues, goalTrajectory, introOpportunity, meetings, suggestedGoals, goalDamage]
actionImpact:         [actionCandidates, ripple, goalDamage]
actionRanker:         [actionImpact, health]
priority:             [actionRanker]
```

---

## §6 QA GATES

```
Total: 18 gates, 0 skips
Runner: node packages/core/qa/qa_gate.js
```

```
Gate 1  LAYER IMPORT RULES                    always runs
Gate 2  NO STORED DERIVATIONS                 always runs
Gate 3  DAG INTEGRITY + DEAD-END DETECTION    always runs
Gate 4  RANKING OUTPUT CORRECTNESS            always runs
Gate 5  SINGLE RANKING SURFACE + DEAD CODE GUARDalways runs
Gate 6  RANKING TRACE                         always runs
Gate 7  ACTION EVENTS + EVENT PURITY          always runs
Gate 8  FOLLOWUP DEDUP                        always runs
Gate 9  CANONICALITY ENFORCEMENT              always runs
Gate 10 METRICFACT SCHEMA                     always runs
Gate 11 NO DERIVED IN METRICFACTS             always runs
Gate 12 BACKWARD COMPATIBILITY                always runs
Gate 13 SINGLE GOAL FRAMEWORK                 always runs
Gate 14 GOALDAMAGE DERIVED ONLY               always runs
Gate 15 RESOLUTION EFFECTIVENESS BOUNDS       always runs
Gate 16 PROACTIVE ACTION INTEGRITY            always runs
Gate 17 PRE-ISSUE SCHEMA ENFORCEMENT          always runs
Gate 18 PER-ENTITY ACTION CAP                 always runs
```

---

## §7 OWNERSHIP

```
Code owns:     All code (packages/core/*, ui/)
Chat owns:     DOCTRINE.md, human-facing documents
Shared:        .backbone/SESSION_LEDGER.md (both read and write)
```

---

## §8 DIVISION

```
Chat thinks.    Research, design, external services, documents for humans.
Code does.      Code, git, tests, QA, filesystem.
```

The ledger is the handoff. Chat writes what to do. Code does it. Code writes what happened.

---

## §9 SYNC

```
One rule: Push before switch. Whoever edited must push before the other starts.
Ledger: Every session that changes files writes an entry before closing.
Conflict: Code is authoritative on code. Chat is authoritative on doctrine.
```

---

## §10 WORKFLOW

**Code:**
```
git pull → read ledger → do work → QA → commit → push → write ledger → push ledger
```

**Chat:**
```
pull workspace → read ledger → think/research/design → write ledger with instructions for Code
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

Synthetic: 120 generated companies (for pipeline testing)
Total: 120 companies
```

---

## §13 MEETING INTELLIGENCE

```
Pipeline:     .backbone/granola.js → packages/core/raw/meetings/ → packages/core/derive/meetingParsing.js → packages/core/derive/meetings.js
Meetings:     ? synced
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
packages/core/runtime/main.js         core engine
packages/core/runtime/engine.js       DAG executor
packages/core/runtime/graph.js        DAG definition
packages/core/qa/qa_gate.js           QA validation
packages/core/decide/ranking.js       THE ranking function
packages/core/derive/meetingParsing.js NLP extraction
packages/core/derive/meetings.js      company matching + aggregation
ui/pages/index.js                     UI entry
ui/pages/api/actions/today.js         action API
.backbone/config.js                   project config (env-aware)
.backbone/granola.js                  meeting sync pipeline
.backbone/SESSION_LEDGER.md           cross-env sync
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
Gate count             → 9 gates (was 10 in v3.0, consolidated in B1 rewrite).
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

QA:         6/6 → 10/10 (consolidated gates, loads full runtime data)
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
P3  Meeting-derived health scoring    engagement, sentiment, frequency
P5  Add introOutcomes.json            when intro tracking implemented
```

**Resolved:**
```
P1  meetings → preissues              DONE (A3)
P2  meetings → actionCandidates       DONE (A3)
P4  actionEvents.json populated       DONE (B2)
```
