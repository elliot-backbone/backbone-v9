# Backbone V9 — Session Ledger

> **Both Claude Chat and Claude Code read this file on session start and append to it on session end.**
> This is the synchronization mechanism between environments. Newest entry first.

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

## 2026-02-05T01:00:00Z | CHAT | Add DOCTRINE.md shared alignment contract + wire into CLI and Code

**What happened:** Created `DOCTRINE.md` (334 lines, 10KB) — a flat diff-optimized markdown file that serves as the shared alignment contract between Chat and Code. Contains all architectural invariants: North Stars, Hard Constraints mapped to QA gates, canonical Impact Model, Layer Architecture, full DAG with pending wiring, QA gate reference (16 checks), file ownership, task routing, sync invariants, session protocol, deploy config, and changelog. Version-stamped with `doctrine_hash` for O(1) staleness detection. Wired into `.backbone/cli.js` pull output (new DOCTRINE section between SERVICES and LAST SESSION with staleness check). Updated `CLAUDE.md` session start protocol to include doctrine read step, session end protocol to flag when doctrine regeneration needed. Pushed across commits aa0f91a → 847c18c.

**Current state:** QA 16/16 passing. HEAD is `847c18c`. 220 files. DOCTRINE.md live in repo, visible in pull output, referenced in CLAUDE.md.

**Active work:** None — doctrine pipeline complete.

**Decisions made:**
- DOCTRINE.md lives at repo root (not .backbone/) for visibility
- Format: flat markdown with code fences, not docx — optimized for `git diff` and programmatic extraction
- Chat owns DOCTRINE.md updates; Code reads on session start and flags staleness in ledger if architecture changed
- Staleness check: CLI pull compares `head_at_update` in doctrine §0 against current HEAD
- Bootstrapping caveat: the commit that updates DOCTRINE.md will always show as stale (doctrine references prior HEAD). This is correct — next pull sees the updated version.
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
