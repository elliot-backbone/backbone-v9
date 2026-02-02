# Backbone V9 — Project Instructions
*Generated: 2026-02-01*

## Source of Truth
**Repo:** https://github.com/elliot-backbone/backbone-v9  
**Deploy:** https://backbone-v9-ziji.vercel.app  
**Dashboard:** https://vercel.com/backbone-2944a29b/backbone-v9-ziji

## Reload Protocol
```bash
curl -sL https://api.github.com/repos/elliot-backbone/backbone-v9/zipball/main -o /home/claude/repo.zip
rm -rf /home/claude/backbone-v9
unzip -o /home/claude/repo.zip -d /home/claude/
mv /home/claude/elliot-backbone-backbone-v9-* /home/claude/backbone-v9
cd /home/claude/backbone-v9 && node .backbone/cli.js pull
```

## CLI Commands (Implemented)
```bash
node .backbone/cli.js pull              # Full reload + Vercel + Redis status
node .backbone/cli.js sync              # Lightweight refresh (no services check)
node .backbone/cli.js status            # Workspace state summary
node .backbone/cli.js push <files> -m "msg"  # Push files via GitHub API
node .backbone/cli.js refresh           # Generate CERTIFIED refresh packet (ZIP)
```

### Refresh Packet
The `refresh` command generates a **certified refresh packet** per REFRESH_PACKET_SPEC v1:
- Contains: REPO_SNAPSHOT, BACKBONE_STATE, RUNTIME_STATUS, MANIFEST
- Validates: no secrets, no stored derivations, no tone/language drift
- Output: timestamped ZIP file for session handover or audit

### Not Yet Implemented (documented but missing)
```bash
# These appear in README.md/MANIFEST.md but are NOT in cli.js:
node .backbone/cli.js deploy [msg]      # ❌ Not implemented
node .backbone/cli.js handover          # ❌ Not implemented
```

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

## Current Work: UI Profile Pages (BB-UI-PROFILES-CONTRACT-v1.0)

### Prime Directive
> **Profiles exist to help the user decide whether and how to execute the Action — not to replace the Action.**

### Doctrine
- Single driving surface: **Next Action** is primary (profiles support, never compete)
- **Raw vs Derived**: runtime only, never stored
- **Action lifecycle integrity**: no backward transitions
- **No second ranking surface**: Related Actions is contextual, not global
- **Read-only profiles**: no inline editing

### Universal Layout Skeleton (Fixed Order)
```
[A] Identity Header
[B] At-a-Glance Strip (≤5 tiles)
[C] Entity-Specific Sections (ordered per entity)
[D] Related Actions (Current / Executed / Deferred)
[E] Event / History Log (append-only)
```

### Entity Section Order (Contract-Mandated)
| Entity | Sections (in order) |
|--------|---------------------|
| Company | Snapshot → Core Metrics → Relationships → Goals & Issues |
| Person | Identity & Role → Relationship Map → Activity Signals |
| Firm | Firm Snapshot → Internal Structure → Portfolio Exposure → Relationship State |
| Deal | Deal Summary → Participants → Process State |
| Round | Round Snapshot → Allocation Map → Risk Factors |
| Goal | Goal Definition → Trajectory → Blocking Issues |
| Issue | Issue Definition → Impact Surface → Candidate Actions |
| Action | Action Definition → Impact Rationale → Dependencies |

### Implementation Status

#### ✅ Complete (UI-P0 Scaffolding)
- `ui/components/profile/ProfileLayout.js` — universal skeleton
- `ui/components/profile/IdentityHeader.js`
- `ui/components/profile/AtAGlanceStrip.js`, `AtAGlanceTile.js`
- `ui/components/profile/RelatedActionsPanel.js`
- `ui/components/profile/EventLog.js`, `EventRow.js`
- `ui/components/links/EntityLink.js` — single linking component
- `ui/lib/entities/entityTypes.js`, `routeForEntity.js`
- `ui/components/profile/sections/shared/EmptyState.js`, `SectionWrapper.js`

#### ✅ Complete (Entity Sections)
- **Company** (4/4): Snapshot, CoreMetrics, Relationships, GoalsIssues
- **Person** (3/3): IdentityRole, RelationshipMap, ActivitySignals
- **Firm** (4/4): Snapshot, InternalStructure, PortfolioExposure, RelationshipState
- **Deal** (3/3): Summary, Participants, ProcessState
- **Round** (3/3): Snapshot, AllocationMap, RiskFactors ✅
- **Goal** (3/3): Definition, Trajectory, BlockingIssues ✅

#### 🔲 In Progress
- `ui/components/profile/sections/registry.js` ✅ (created, imports pending sections)

#### ❌ Remaining
- **Issue** (3): IssueDefinition, IssueImpactSurface, IssueCandidateActions
- **Action** (3): ActionDefinition, ActionImpactRationale, ActionDependencies
- `ui/pages/entities/[type]/[id].js` — dynamic route page
- `ui/lib/profile/adapters/*.js` — data adapters (8 files)
- `ui/lib/profile/selectors/*.js` — relatedActionsForEntity, eventsForEntity
- `ui/QA/*.md` — acceptance checklist, red-team checklist

### Micro-Task Queue
| # | Task | Status |
|---|------|--------|
| M1 | Section registry | ✅ |
| M2 | Round sections | ✅ |
| M3 | Goal sections | ✅ |
| M4 | Issue sections | ⏳ Next |
| M5 | Action sections | 🔲 |
| M6 | Dynamic route page | 🔲 |
| M7 | Adapters | 🔲 |
| M8 | Selectors | 🔲 |
| M9 | QA checklists | 🔲 |
| M10 | Integration + deploy | 🔲 |

### Red-Team Failure Modes (Avoid)
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

## File Targets (Contract-Specified Paths)

### Profile Components
```
ui/components/profile/
├── ProfileLayout.js          ✅
├── IdentityHeader.js         ✅
├── AtAGlanceStrip.js         ✅
├── AtAGlanceTile.js          ✅
├── RelatedActionsPanel.js    ✅
├── EventLog.js               ✅
├── EventRow.js               ✅
└── sections/
    ├── registry.js           ✅
    ├── shared/
    │   ├── EmptyState.js     ✅
    │   └── SectionWrapper.js ✅
    ├── company/              ✅ (4 files)
    ├── person/               ✅ (3 files)
    ├── firm/                 ✅ (4 files)
    ├── deal/                 ✅ (3 files)
    ├── round/                ✅ (3 files)
    ├── goal/                 ✅ (3 files)
    ├── issue/                ❌ (3 files needed)
    └── action/               ❌ (3 files needed)
```

### Routing & Lib
```
ui/lib/entities/
├── entityTypes.js            ✅
└── routeForEntity.js         ✅

ui/lib/profile/
├── adapters/                 ❌ (8 files needed)
│   ├── adapterRegistry.js
│   ├── companyAdapter.js
│   ├── personAdapter.js
│   ├── firmAdapter.js
│   ├── dealAdapter.js
│   ├── roundAdapter.js
│   ├── goalAdapter.js
│   ├── issueAdapter.js
│   └── actionAdapter.js
└── selectors/                ❌ (2 files needed)
    ├── relatedActionsForEntity.js
    └── eventsForEntity.js

ui/pages/entities/[type]/
└── [id].js                   ❌ (dynamic route needed)

ui/components/links/
└── EntityLink.js             ✅
```

### QA
```
ui/QA/
├── UI_PROFILE_PAGES_ACCEPTANCE_CHECKLIST.md  ❌
└── UI_PROFILE_PAGES_RED_TEAM.md              ❌
```

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

*Resume with `M4` to continue Issue sections implementation.*
