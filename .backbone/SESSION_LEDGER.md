# Backbone V9 — Session Ledger

> **Both Claude Chat and Claude Code read this file on session start and append to it on session end.**
> This is the synchronization mechanism between environments. Newest entry first.

---

## 2026-02-06T00:15:00Z | CODE | Exhaustive ranking system audit — ~80% dead code identified

**What happened:** Ran a 9-agent parallel audit tracing every export, import, and call site across the entire ranking pipeline (decide/, derive/, raw/, runtime/, qa/, tests/). Mapped the complete dependency graph from engine.js through rankActions down to every leaf function. Found that roughly 80% of the ranking infrastructure is dead code — exported but never called in production, or computed but never consumed downstream.

**Current state:** HEAD is 955740d. QA 10/10 passing. No code changes made — this was a read-only audit. DOCTRINE v2.1 (stale hash).

**Active work:** None — audit complete, awaiting architectural decision.

**Decisions made:**
- None yet — audit is informational. Cleanup vs build-forward is an open question for Chat.

**Key findings for Chat to consider:**

1. **Two ranking formulas exist, only one is wired.** `computeRankScore` (additive, legacy) is the live path. `computeProactiveRankScore` (multiplicative, clamped components, obviousness penalty) is fully built but never called by the engine. The entire proactive formula + urgency gates (CAT1/CAT2) + proactivity distribution validation are dead code.

2. **The engine passes empty context to rankActions every time.** `trustRiskByAction`, `deadlinesByAction`, `events`, `obviousnessContext` — all default to empty. This means: pattern lifts always 0, urgency gates never fire, obviousness penalty never computed, time criticality boost usually 0.

3. **Three DAG nodes are dead-ends.** `meetings` (computed but nothing reads it), `health` (computed but nothing reads it), `priority` (redundant mapping, never consumed). The P1/P2 tasks (wire meetings into preissues/actionCandidates) would revive the `meetings` node.

4. **Four entire files are orphaned.** `derive/actionFriction.js`, `derive/executionProbability.js`, `derive/actionOutcomeStats.js`, `derive/calibration.js` — killed in Phase 4.5.2 but never deleted.

5. **The obviousness/dismissal system is fully built but inert.** `obviousness.js` (340 lines), `dismissalSchema.js` (140 lines), `dismissals.json` — none of it executes because `computeProactiveRankScore` is never called and context is never populated.

6. **Constants are duplicated instead of imported.** `BASELINE_CONVERSION`, `SECOND_ORDER_MIN_LIFT`, `MAX_PATH_DEPTH` each have a "canonical" export in weights.js that nothing imports — every module hardcodes its own copy. `timePenalty()` has two different implementations. `goalWeightsByStage` in assumptions_policy.js is reimplemented locally in actionImpact.js.

7. **Tests cover the wrong code.** ~30 tests validate dead functions (proactive ranking, urgency gates, obviousness, dismissal schema). The 5 live weights.js functions (`computeTrustPenalty`, `computeExecutionFrictionPenalty`, `computeTimeCriticalityBoost`, `computeSourceTypeBoost`, `timePenalty`) and `computeRankScore` itself have zero unit tests.

8. **~8 of ~50 exported ranking functions are actually live.** The live set: `rankActions`, `computeRankScore`, `computeExpectedNetImpact`, `computeTrustPenalty`, `computeExecutionFrictionPenalty`, `computeTimeCriticalityBoost`, `computeSourceTypeBoost`, `timePenalty`, `computeAllPatternLifts`.

**Next steps — three options for Chat to decide:**
- **Option A: Clean up first** — Delete dead code, consolidate duplicates, rewrite tests for live path, then proceed with P1/P2.
- **Option B: Build forward** — Accept dead code, proceed with P1/P2 (wiring meetings into preissues/actionCandidates), which would revive the meetings dead-end node.
- **Option C: Hybrid** — Delete clearly dead files + dead exports, then do P1/P2 on cleaner foundation.
- **Meta-question:** Should the proactive formula (multiplicative + clamped + obviousness + gates) *replace* the legacy additive formula? Or was it intentionally abandoned? This determines whether the dead code is "future work" or "cleanup target."

**Blockers:** Needs Chat architectural decision before Code proceeds.

---

## 2026-02-05T04:40:00Z | CODE | Standalone transcript archive + automated daily sync

**What happened:** Built a standalone Granola transcript sync system at `~/granola-transcripts/`. Created `bin/sync.sh` that replicates the manual MCP flow: reads OAuth token from macOS Keychain, auto-refreshes if expired, calls `list_meetings` for a 25-hour window, then `get_meeting_transcript` for each meeting ID. Saves full verbatim transcripts (not summaries) as JSON files organized by date. SHA-256 dedup ensures re-runs skip unchanged files. Scheduled via launchd at midnight (`com.elliotstorey.granola-transcript-sync`). Removed old `com.backbone.granola-sync` agent and plist. Initialized git repo, installed `gh` CLI (brew), authenticated as `elliot-backbone`, created private GitHub repo `elliot-backbone/granola-transcripts` and pushed. First run pulled 25 transcripts (668KB, 23 full text, 1 null, 1 short). Updated DOCTRINE.md v2.0→v2.1 and CLAUDE.md with new sync architecture.

**Current state:** HEAD is `4d078f1` (backbone-v9). Standalone transcript repo at `elliot-backbone/granola-transcripts` on GitHub (private). Launchd agent running. DOCTRINE v2.1.

**Active work:** None — transcript sync pipeline complete and verified.

**Decisions made:**
- Standalone repo (`~/granola-transcripts/`) separate from backbone-v9 — transcripts are large binary-like data, better isolated
- Direct MCP API calls via curl (SSE parsing) since MCP tools don't surface as native tools in Claude Code
- Token refresh updates macOS Keychain in-place so Claude Code OAuth stays in sync
- Old `com.backbone.granola-sync` launchd agent replaced by `com.elliotstorey.granola-transcript-sync`
- `gh` CLI installed and authenticated for future GitHub operations
- DOCTRINE.md updated by Code (exception to normal Chat-updates rule, per user request)

**Next steps:**
- Wire `meetings` into `preissues` to detect "no meeting in 30 days" signals (P1)
- Wire `meetings` into `actionCandidates` to generate follow-up actions (P2)
- Consider piping standalone transcript archive into backbone-v9 derive layer for richer NLP

**Blockers:** None

---

## 2026-02-05T01:15:00Z | CHAT | Add DOCTRINE.md shared alignment contract + wire into CLI and Code

**What happened:** Created `DOCTRINE.md` (334 lines, 10KB) — a flat diff-optimized markdown file that serves as the shared alignment contract between Chat and Code. Contains all architectural invariants: North Stars, Hard Constraints mapped to QA gates, canonical Impact Model, Layer Architecture, full DAG with pending wiring, QA gate reference (16 checks), file ownership, task routing, sync invariants, session protocol, deploy config, and changelog. Version-stamped with `doctrine_hash` for O(1) staleness detection. Wired into `.backbone/cli.js` pull output (new DOCTRINE section with staleness check). Updated `CLAUDE.md` session start/end protocol to include doctrine steps. Added **explicit handoff prompts**: pull now prints CODE STARTUP box with commands to run in Code/terminal; push now prints SESSION SHUTDOWN CHECKLIST with ledger/doctrine reminders. Pushed across commits aa0f91a → 66e87e8.

**Current state:** QA 16/16 passing. HEAD is `66e87e8`. 220 files. DOCTRINE.md live. CLI prints handoff instructions after pull and shutdown checklist after push.

**Active work:** None — doctrine pipeline + handoff prompts complete.

**Decisions made:**
- DOCTRINE.md lives at repo root for visibility
- Format: flat markdown with code fences, optimized for `git diff`
- Chat owns DOCTRINE.md updates; Code reads and flags staleness
- CLI pull prints "CODE STARTUP" box with exact commands for Code session
- CLI push prints "SESSION SHUTDOWN CHECKLIST" with ledger/doctrine reminders
- Cannot auto-trigger Code from Chat — these are prompts for human to copy/paste or for Code's Claude to read
- Also generated `Backbone_V9_Operations_Manual_v2.docx` for human reference (not pushed to repo)

**Next steps:**
- Wire `meetings` into `preissues` to detect "no meeting in 30 days" signals (P1 in doctrine §18)
- Wire `meetings` into `actionCandidates` to generate follow-up actions (P2 in doctrine §18)
- Populate `raw/actionEvents.json` with real events so Gates C/D/E execute fully (P4 in doctrine §18)

**Blockers:** None

---

## 2026-02-05T04:00:00Z | CODE | Wire meeting data into derive layer + enable transcripts

**What happened:** Implemented full meeting intelligence pipeline. Enabled transcript fetching in Granola config and re-synced all 25 meetings to populate `raw/meetings/transcripts/`. Created `derive/meetingParsing.js` (NLP extraction: action items, decisions, risks, metric mentions, topic classification, sentiment scoring) and `derive/meetings.js` (company matching via participant org/title/email domain + per-company intelligence aggregation). Added `meetings: []` node to DAG in `runtime/graph.js`. Wired into `runtime/engine.js`: meeting loading, company matching, NODE_COMPUTE entry, derived output. Added 7 real portfolio company stubs to `raw/sample.json` (GroceryList, Checker, Lava Payments, Autar, Pluto Credit, Lucius Finance, Dolfin AI). Commit `0cc4228`.

**Current state:** QA 16/0 passing. HEAD is `0cc4228`. 25 meetings with transcripts synced. 7 companies matched to meetings with full intelligence output (actions, decisions, risks, metrics, topics, sentiment, engagement signals).

**Active work:** None — meeting derive layer complete and verified.

**Decisions made:**
- `meetings` node has no DAG dependencies (base node like runway, metrics)
- Company matching uses 3-strategy cascade: participant org → title parsing → email domain
- Meeting intelligence is per-company, available at `derived.meetings` in engine output
- NLP extraction is pure rule-based/deterministic (no ML, no external deps)
- 7 portfolio company stubs added with realistic data from meeting content (ARR, burn, stage)
- Nothing depends on the `meetings` node yet — downstream wiring (preissues, actionCandidates) deferred to follow-up

**Next steps:**
- Wire `meetings` into `preissues` to detect "no meeting in 30 days" signals
- Wire `meetings` into `actionCandidates` to generate follow-up actions from extracted action items
- Consider meeting-derived signals for health scoring

**Blockers:** None

---

## 2026-02-05T03:00:00Z | CODE | QA gate CLI runner loads full runtime data

**What happened:** The standalone CLI runner in `qa/qa_gate.js` was calling `runQAGate({})` with an empty options object, causing 11 of 17 gates to skip due to missing runtime data. Updated the CLI runner to load `raw/sample.json`, run the compute engine, build the DAG map, import the rank function, and pass all data to `runQAGate()`. Now 16/17 gates execute (Gates C/D/E legitimately skip because `actionEvents.json` is empty). Commit `db55e1b`.

**Current state:** QA 16/0 passing. HEAD is `db55e1b`. All data-dependent gates (determinism, ranking surface, impact model, intro outcomes, etc.) now run on every `node qa/qa_gate.js` invocation.

**Active work:** None — single-file change, complete.

**Decisions made:**
- Used dynamic `await import()` for engine/graph/ranking modules (only loaded when file is run as CLI, tree-shaken when imported as module)
- `actionsInput` sourced from `engineOutput.companies[].derived.actions` (per-company pre-portfolio-rank candidates)
- `introOutcomes` passed as `[]` since no `introOutcomes.json` file exists yet (Gate 7 validates array, empty is valid)
- Unrelated `ui/package-lock.json` changes not included in commit

**Next steps:**
- Populate `raw/actionEvents.json` with real events so Gates C/D/E can execute
- Consider adding `introOutcomes.json` when intro tracking is implemented

**Blockers:** None

---

## 2026-02-04T23:35:00Z | CHAT | Reconciled Granola commit from Code

**What happened:** Code pushed `7d0deb1` (Granola MCP daily sync pipeline) on top of our dual-env commits. Reconciled: config.js already merged cleanly (Code preserved env-aware version, added `raw/meetings` to DIRECTORIES). Updated CLAUDE.md to reference Granola pipeline, config, and launchd job. No conflicts — Code's commit parented directly on our last Chat commit (`ebf8405`).

**Current state:** QA 6/6 passing. HEAD is `7d0deb1`. 217 files (53,265 lines). 25 meeting notes in `raw/meetings/meetings_0.json`. Granola sync pipeline operational: `.backbone/granola.js` (470 LOC), `.backbone/granola-config.js`, `LaunchAgents/com.backbone.granola-sync.plist`.

**Active work:** Dual-env implementation complete. Granola pipeline integrated. First successful Chat←Code sync via ledger protocol.

**Decisions made:**
- Granola meeting data lives in `raw/meetings/` (immutable, chunk/manifest pattern)
- Sync state file (`.backbone/granola-state.json`) and logs gitignored
- Code did NOT write a ledger entry for `7d0deb1` — protocol was just established, this is the first reconciliation proving it works
- CLAUDE.md now documents Granola pipeline for future Code sessions

**Next steps:**
- Verify Granola data can be consumed by derive/ layer for meeting-based insights
- Test Granola sync on your Mac: `node .backbone/granola.js`
- Code should write its first ledger entry on next session

**Blockers:** None

---

## 2026-02-04T23:30:00Z | CHAT | Dual-Environment Implementation Complete

**What happened:** Implemented full Chat/Code segmentation infrastructure. Three files changed: `.backbone/config.js` is now environment-aware (auto-detects CODE/CHAT/LOCAL based on .git presence and path), `CLAUDE.md` contains complete Code project context with session start/end protocols, and `SESSION_LEDGER.md` established as the shared sync mechanism. CLI updated with `ledger` command and pull output now shows last session entry.

**Current state:** QA 6/6 passing. Vercel deployed. Redis connected (98 events). Config detects CHAT environment correctly in sandbox, will detect CODE when .git present.

**Active work:** None — implementation complete. Ready for first Code session to test round-trip.

**Decisions made:**
- GitHub is the single synchronization point between environments
- SESSION_LEDGER.md is append-only shared state (newest first)
- config.js auto-detects environment: CODE (has .git), CHAT (/home/claude), LOCAL (other)
- CLAUDE.md provides Code with equivalent project context to Chat's system prompt
- Chat owns: orchestration, portfolio ops, deployment monitoring, documents, refresh, architecture decisions
- Code owns: file editing, git operations, local dev server, QA execution, refactoring, debugging
- Workflow pattern: Design in Chat → Execute in Code → Verify in Chat
- CLI pull output shows last session entry automatically

**Next steps:**
- Clone repo in Claude Code and verify CLAUDE.md is read automatically
- Run `node qa/qa_gate.js` in Code to confirm QA works portably
- Run `cd ui && npm run dev` in Code to confirm local dev works
- Make a test edit in Code, push, then pull in Chat to verify round-trip
- Write first CODE ledger entry to confirm sync protocol works end-to-end

**Blockers:** None

---

## 2026-02-04T23:15:00Z | CHAT | Session Ledger Created

**What happened:** Established dual-environment synchronization protocol. Created SESSION_LEDGER.md as the shared state file between Chat and Code.

**Current state:** QA 6/6 passing. Vercel deployed. Redis connected (98 events). Latest commit: 1c134aa.

**Active work:** Designing Chat/Code segmentation — implementation contract in progress.

**Decisions made:**
- GitHub is the single synchronization point between environments
- SESSION_LEDGER.md is the shared context file (append-only, newest first)
- Chat retains: orchestration, portfolio ops, deployment monitoring, document generation, refresh certification
- Code takes over: file editing, git operations, local dev server, test execution

**Next steps:**
- Create CLAUDE.md for Code project context
- Make .backbone/config.js environment-aware (detect workspace path)
- Test full round-trip: Code edits → git push → Chat pull → ledger reads correctly

**Blockers:** None

---

<!-- ENTRY TEMPLATE (copy this for new entries)

## YYYY-MM-DDTHH:MM:SSZ | CHAT or CODE | Brief Title

**What happened:** One paragraph max.

**Current state:** QA X/Y, deploy status, key metrics.

**Active work:** What's in progress right now.

**Decisions made:**
- Decision 1
- Decision 2

**Next steps:**
- Step 1
- Step 2

**Blockers:** None or list them.

---

-->
