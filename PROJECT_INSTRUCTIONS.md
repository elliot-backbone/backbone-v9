# Backbone V9 — Project Instructions
*Updated: 2026-02-05*

## Source of Truth
**Repo:** https://github.com/elliot-backbone/backbone-v9
**Deploy:** https://backbone-v9-ziji.vercel.app
**Dashboard:** https://vercel.com/backbone-2944a29b/backbone-v9-ziji
**Doctrine:** `DOCTRINE.md` (v3.0, shared alignment contract between Chat and Code)

## Reload Protocol
```bash
curl -sL https://api.github.com/repos/elliot-backbone/backbone-v9/zipball/main -o /home/claude/repo.zip
rm -rf /home/claude/backbone-v9
unzip -o /home/claude/repo.zip -d /home/claude/
mv /home/claude/elliot-backbone-backbone-v9-* /home/claude/backbone-v9
echo "<GITHUB_TOKEN>" > /home/claude/backbone-v9/.github-token
cd /home/claude/backbone-v9 && node .backbone/cli.js pull --force
```

## CLI Commands
```bash
node .backbone/cli.js pull              # Full reload + Vercel + Redis + GitHub auth check
node .backbone/cli.js pull --force      # Force pull, overwrite local changes
node .backbone/cli.js sync              # Lightweight refresh (manifest + QA only)
node .backbone/cli.js status            # Workspace state
node .backbone/cli.js push <files> -m   # Push files to GitHub via API (runs QA first)
node .backbone/cli.js refresh           # Generate certified refresh packet (ZIP)
node .backbone/cli.js handoff           # Generate compaction handoff doc
```

### GitHub API
Token stored in `.github-token` (gitignored). The pull command preserves the token across workspace reloads. Push and deploy use it automatically.
To rotate: generate a new token at https://github.com/settings/tokens, update the echo line in Reload Protocol above.

---

## Architecture Layers (Engine)
| Layer | Path | Purpose |
|-------|------|---------|
| L0 | `/raw` | Raw entities + validation |
| L1 | `/derive` | Pure deterministic derivations |
| L3 | `/predict` | Issues, trajectories, ripple, calibration |
| L5 | `/decide` | Action ranking (single surface) |
| L6 | `/runtime` | Orchestration + IO |
| — | `/qa` | Quality gates |
| — | `/ui` | Frontend (Next.js) |

## Hard Constraints (Engine)
1. **No stored derivations** — `forbidden.js` enforces
2. **One ranking surface** — `rankScore` only
3. **DAG execution order** — `graph.js` enforces
4. **Files <500 lines**
5. **No upward layer imports**
6. **Append-only events** — action events are immutable ledger
7. **Lifecycle monotonic** — proposed → executed → observed, never backwards

## Impact Model (Goal-Centric)
```
upside = Σ (goalWeight × Δprobability)
```

All action upside is measured by impact on goal fulfillment:
- **ISSUE** actions: Fixing problems lifts goal probability (12-40% based on severity)
- **PREISSUE** actions: Prevention maintains probability (likelihood × 8-15%)
- **GOAL** actions: Direct progress (25% of trajectory gap)

See `docs/IMPACT_MODEL.md` for full documentation.

## Ranking Formula
```
rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost
```
Where `expectedNetImpact` = `upside × probabilityOfSuccess`

## North Stars
- NS1: Actions are the product
- NS2: Optimize for net value
- NS3: Truth before intelligence
- NS4: Separation of meaning is sacred
- NS5: Architecture enforces doctrine
- NS6: ONE ranking surface

---

## Dual-Environment Protocol

**Chat thinks. Code does.**

- **Chat** (claude.ai): Research, design, architecture decisions, external services (Vercel, Explorium, Gmail, Drive), documents for humans, thinking through problems
- **Code** (Claude Code): Edit files, run tests, fix bugs, git operations, QA, execute pipelines, debug

Sync mechanism: `.backbone/SESSION_LEDGER.md` — both environments read on start, write on finish. Newest entry first.

Doctrine: `DOCTRINE.md` (v3.0) — shared alignment contract. Chat owns updates, Code reads and flags staleness.

---

## QA
All changes validated by `qa/qa_gate.js` before push. 10 gates passing:

1. Layer imports (no upward)
2. No stored derivations in raw/
3. DAG integrity (cycle detection)
4. Actions have rankScore
5. Single ranking surface
6. Append-only events
7. Unified impact model

QA CLI runner loads full runtime data (sample.json → engine → DAG → ranking) so data-dependent gates execute on every run.

---

## Meetings Pipeline

### Data Flow
```
Granola API → ~/granola-transcripts/ (standalone repo) → raw/meetings/ (backbone-v9)
```

### Components
- **Standalone sync:** `~/granola-transcripts/bin/sync.sh` — daily launchd job (`com.elliotstorey.granola-transcript-sync`), OAuth auto-refresh from macOS Keychain, SHA-256 dedup
- **Transcript repo:** `github.com/elliot-backbone/granola-transcripts` (private)
- **Raw data:** `raw/meetings/meetings_0.json` + `raw/meetings/transcripts/` (25 transcripts)
- **NLP extraction:** `derive/meetingParsing.js` — action items, decisions, risks, metric mentions, topic classification, sentiment scoring (pure rule-based, no ML)
- **Company matching:** `derive/meetings.js` — 3-strategy cascade (participant org → title parsing → email domain), per-company intelligence aggregation
- **DAG node:** `meetings` (base node, no dependencies)

### Portfolio Companies (from meetings)
GroceryList, Checker, Lava Payments, Autar, Pluto Credit, Lucius Finance, Dolfin AI — stubs in `raw/sample.json` with realistic data from meeting content.

---

## UI Profile Pages — ✅ COMPLETE

### Prime Directive
> **Profiles exist to help the user decide whether and how to execute the Action — not to replace the Action.**

### Universal Layout Skeleton (Fixed Order)
```
[A] Identity Header
[B] At-a-Glance Strip (≤5 tiles)
[C] Entity-Specific Sections (ordered per entity)
[D] Related Actions (Current / Executed / Deferred)
[E] Event / History Log (append-only)
```

### All Entity Sections — ✅ Complete
| Entity | Sections |
|--------|----------|
| Company | Snapshot → Core Metrics → Relationships → Goals & Issues |
| Person | Identity & Role → Relationship Map → Activity Signals |
| Firm | Firm Snapshot → Internal Structure → Portfolio Exposure → Relationship State |
| Deal | Deal Summary → Participants → Process State |
| Round | Round Snapshot → Allocation Map → Risk Factors |
| Goal | Goal Definition → Trajectory → Blocking Issues |
| Issue | Issue Definition → Impact Surface → Candidate Actions |
| Action | Action Definition → Impact Rationale → Dependencies |

### Infrastructure — ✅ Complete
- Section registry (`ui/components/profile/sections/registry.js`)
- Dynamic route page (`ui/pages/entities/[type]/[id].js`)
- All 8 adapters (`ui/lib/profile/adapters/`)
- Both selectors (`ui/lib/profile/selectors/`)
- QA checklists (`ui/QA/`)
- EntityLink component (`ui/components/links/EntityLink.js`)

### File Tree (all ✅)
```
ui/components/profile/
├── ProfileLayout.js
├── IdentityHeader.js
├── AtAGlanceStrip.js, AtAGlanceTile.js
├── RelatedActionsPanel.js
├── EventLog.js, EventRow.js
└── sections/
    ├── registry.js
    ├── shared/EmptyState.js, SectionWrapper.js
    ├── company/ (4 files)
    ├── person/ (3 files)
    ├── firm/ (4 files)
    ├── deal/ (3 files)
    ├── round/ (3 files)
    ├── goal/ (3 files)
    ├── issue/ (3 files)
    └── action/ (3 files)

ui/lib/profile/
├── adapters/ (9 files: registry + 8 entity adapters)
└── selectors/ (2 files: relatedActionsForEntity, eventsForEntity)

ui/pages/entities/[type]/
├── [id].js (dynamic route)
└── index.js (entity list)

ui/QA/
├── UI_PROFILE_PAGES_ACCEPTANCE_CHECKLIST.md
└── UI_PROFILE_PAGES_RED_TEAM.md
```

### Red-Team Failure Modes (Still enforced)
1. Dashboard creep (no overview/insights pages)
2. Second ranking surface (no alternative priority lists)
3. Fake precision (no invented 73.42/100 scores)
4. Storing derived values (no localStorage/server writes of computed data)
5. Editable profiles (no inline edit icons)
6. Tabs hiding sections (structure must be visible by default)
7. Modal hell (use pages, not nested modals)
8. Card UI overuse (calm density, not heavy shadows everywhere)
9. Color overuse (semantic only: risk/urgency/state)
10. Profiles as starting point (Next Action remains spine)
11. Inventing entities (no Projects/Workspaces/Boards)
12. Breaking one-scroll (no persistent sidebars inside profiles)
13. Mixing raw/derived unlabeled
14. Action lifecycle distortion (no backward transitions)
15. Silent empty states (always render explicit "Not available")

---

## Vercel Integration
- **Project ID:** `prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ`
- **Team ID:** `team_jy2mjx7oEsxBERbaUiBIWRrz`

```javascript
// Check deployments
Vercel:list_deployments({ projectId: 'prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ', teamId: 'team_jy2mjx7oEsxBERbaUiBIWRrz' })

// Get build logs
Vercel:get_deployment_build_logs({ idOrUrl: 'dpl_xxx', teamId: 'team_jy2mjx7oEsxBERbaUiBIWRrz' })
```

---

## Key Entry Points
```
runtime/main.js                  Core engine
runtime/engine.js                DAG executor
runtime/graph.js                 DAG definition
qa/qa_gate.js                    QA validation (10 gates)
decide/ranking.js                THE ranking function
derive/meetingParsing.js         NLP extraction from transcripts
derive/meetings.js               Company matching + aggregation
ui/pages/index.js                UI entry
ui/pages/api/actions/today.js    Action API
.backbone/config.js              Project config (env-aware)
.backbone/granola.js             Meeting sync pipeline
.backbone/SESSION_LEDGER.md      Cross-env sync
DOCTRINE.md                      Shared alignment contract (v3.0)
```

---

## Pending Work
```
P1  Wire meetings → preissues         "no meeting in 30 days" detection
P2  Wire meetings → actionCandidates  follow-up actions from extracted items
P3  Meeting-derived health scoring    engagement, sentiment, frequency
P4  Populate actionEvents.json        enables Gates C/D/E full execution
P5  Add introOutcomes.json            when intro tracking implemented
```
