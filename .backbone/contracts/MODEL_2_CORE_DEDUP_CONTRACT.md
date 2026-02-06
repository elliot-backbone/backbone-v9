# BACKBONE v9.1 → v9.2 MODEL 2: CORE PACKAGE DEDUP — IMPLEMENTATION CONTRACT

**Status:** Binding
**Audience:** Claude Code (implementation agent)
**Baseline:** Backbone v9.1 commit `8fd7689` (9/9 QA gates passing)
**Scope:** Structural deduplication only — zero behavioral change
**Output:** Git push after each successful sub-phase

---

## 0. SOURCE DOCUMENT ANALYSIS

This contract was derived from exhaustive line-by-line analysis of `BACKBONE_MODEL_2_CORE_DEDUP_CONTRACT.zip` (10 files, 143 lines) cross-referenced against the live repository state (213 files, 52,060 lines, commit `8fd7689`).

### 0.1 Contract Source Files (verbatim load order per README.md)

| # | File | Lines | Binding Content |
|---|------|-------|-----------------|
| 1 | `MODEL_2_OVERVIEW.md` | 13 | Goals: zero duplication, single source of truth, scalable architecture. Non-goals: no feature/ranking/schema changes. |
| 2 | `MODEL_2_INVARIANTS.md` | 15 | Behavioral: ranking exports unchanged, rankActions receives full context, QA 9/9. Structural: one canonical engine, raw vs derived preserved, DAG acyclic. Canonicality: engine only in `packages/core`, no engine code in `ui` or repo root. |
| 3 | `MODEL_2_TARGET_REPO_SHAPE.md` | 16 | Target: `packages/core/{decide,derive,predict,runtime,qa,tests,raw}`, `ui/{pages,components,lib}`. Root-level `package.json`. |
| 4 | `MODEL_2_SCOPE_AND_MOVES.md` | 23 | Move to core: `decide/**`, `derive/**`, `predict/**`, `runtime/**`, `qa/**`, `tests/**`, `raw/**`. Stay in ui: `pages/**`, `components/**`, `pages/api/**`. Delete from ui: `ui/decide/**`, `ui/derive/**`, `ui/predict/**`, `ui/runtime/**`, `ui/qa/**`, `ui/tests/**`. |
| 5 | `MODEL_2_PHASES.md` | 8 | M0: workspace bootstrap. M1: create core package. M2: rewire UI imports. M3: delete duplicates. M4: enforce canonicality via QA. M5: root-level commands. |
| 6 | `MODEL_2_QA_ASSERTIONS.md` | 5 | QA_FAIL[CANON]: engine outside packages/core. QA_FAIL[CANON]: ui imports non-core engine. QA_FAIL[TRACE]: FULL_CONTEXT_ENFORCEMENT must be true. |
| 7 | `MODEL_2_ACCEPTANCE_CHECKLIST.md` | 9 | Core contains all engine logic. UI contains no engine logic. Root contains no engine logic. UI imports only from core. QA passes. Tests pass. UI builds. |
| 8 | `MODEL_2_OUT_OF_SCOPE.md` | 7 | No new features, ranking changes, schema changes, UI redesign, or performance work. |
| 9 | `MODEL_2_CLAUDE_OUTPUT_REQUIREMENTS.md` | 7 | Claude must provide: phase execution log, file move/delete list, QA output, build output. |

### 0.2 Current Repository State (pre-migration audit)

#### Duplication Map

The repository contains **two complete copies** of the engine: root-level (`decide/`, `derive/`, etc.) and UI-level (`ui/decide/`, `ui/derive/`, etc.). The UI's Next.js build (Vercel, Turbopack) resolves all relative imports to the `ui/` copies. The root copies are consumed by CLI tools, the QA gate, and tests.

**Identical files (root ↔ ui):**

| Layer | Files | Status |
|-------|-------|--------|
| `decide/` | `actionCandidates.js`, `actionImpact.js`, `ranking.js`, `weights.js` | 4/4 identical |
| `derive/` | `anomalyDetection.js`, `contextMaps.js`, `goalTrajectory.js`, `impact.js`, `meetingParsing.js`, `meetings.js`, `metrics.js`, `patternLift.js` | 8/10 identical |
| `predict/` | `introOpportunity.js`, `issues.js`, `preissues.js`, `resolutions.js`, `ripple.js`, `suggestedGoals.js`, `trustRisk.js`, `actionCandidates.js`, `actionImpact.js` | 9/11 identical |
| `runtime/` | `SESSION_MEMORY.js`, `actions.js`, `export.js`, `graph.js`, `health.js`, `index.js`, `main.js` | 7/8 identical |
| `qa/` | `forbidden.js` | 1/2 identical (different per-copy extras) |
| `raw/` | `actionEvents.json`, `actionEventsSchema.js`, `assumptions_policy.js`, `goalSchema.js`, `introOutcome.js`, `stageParams.js`, all `chunks/*.json` (7 files) | 13/16 identical |

**Diverged files (documented in `.backbone/ui_divergence_allowlist.json`):**

| File | Root Version | UI Version | Resolution Strategy |
|------|-------------|------------|-------------------|
| `runtime/engine.js` | Uses `fs` to read `raw/actionEvents.json` from disk | Uses `rawData.actionEvents` from globals (no fs in browser) | Core version must support both: accept optional `actionEvents` param, fall back to fs read |
| `derive/runway.js` | Direct Date operations | Adds defensive string→Date parsing for browser | Core version includes defensive parsing (superset) |
| `derive/trajectory.js` | Direct Date operations | Adds defensive string→Date parsing for browser | Core version includes defensive parsing (superset) |
| `predict/actionSchema.js` | Has OPPORTUNITY source type + `createAction` passthrough fields | Lacks OPPORTUNITY source | Core version is root (superset) |
| `predict/followup.js` | Direct Date operations | Adds defensive string→Date parsing for browser | Core version includes defensive parsing (superset) |
| `raw/sample.json` | Full canonical dataset (39,655 lines) | Subset copy | Core version is root (canonical) |
| `raw/chunks/sample_manifest.json` | Matches root sample.json | Matches ui sample.json | Core version is root |

**Root-only files (no UI copy):**

| File | Purpose |
|------|---------|
| `derive/runwayDerived.js` | Extended runway derivation (imports from `raw/assumptions_policy.js`) |
| `predict/opportunityCandidates.js` | Opportunity candidate generation (imports from `raw/assumptions_policy.js`) |
| `qa/persistence_discipline.js` | Forbidden-persist field enforcement |
| `raw/meetings/` (directory, 27 files) | Meeting JSON data + transcripts |

**UI-only files (no root copy):**

| File | Purpose |
|------|---------|
| `ui/qa/terminology.js` | UI terminology enforcement |

#### Import Resolution (critical path analysis)

The UI's API routes are the **only** files that import engine code. Three files, three import patterns:

| File | Import | Resolves To |
|------|--------|-------------|
| `ui/pages/api/actions/today.js` | `from '../../../runtime/engine.js'` | `ui/runtime/engine.js` |
| `ui/pages/api/actions/today.js` | `from '../../../raw/sample.json'` | `ui/raw/sample.json` |
| `ui/pages/api/entities.js` | `from '../../raw/sample.json'` | `ui/raw/sample.json` |
| `ui/pages/api/entity/[id].js` | `from '../../../raw/sample.json'` | `ui/raw/sample.json` |

All resolve within `ui/` — the root engine copies are never touched by the Vercel build.

#### Cross-Layer Internal Imports (within engine)

All engine files use relative `../` imports to reference sibling layers:

- `decide/` → imports from `derive/` (impact.js, patternLift.js)
- `derive/` → imports from `raw/` (stageParams.js, assumptions_policy.js)
- `predict/` → imports from `derive/`, `raw/`
- `runtime/` → imports from `derive/`, `predict/`, `decide/`, `qa/`
- `qa/` → imports from `qa/forbidden.js` (self-referential)
- `tests/` → imports from `raw/`, `derive/`, `predict/`, `decide/`, `qa/`

After consolidation into `packages/core/`, all these `../` paths become `../` within the same package — structurally identical.

#### Vercel Build Architecture

- **Project:** `backbone-v9-ziji` (`prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ`)
- **Team:** `team_jy2mjx7oEsxBERbaUiBIWRrz`
- **Root directory:** Not explicitly set (Vercel auto-detects `ui/` via `package.json` with `next`)
- **Build:** `npm run build` → `next build` (Turbopack, Next.js 16.1.6)
- **Node:** 24.x
- **Output:** standalone

After Model 2, the UI must resolve `@backbone/core` imports. Strategy: npm workspaces at root level with a `packages/core/package.json` declaring `"name": "@backbone/core"`, and `ui/package.json` adding `@backbone/core` as a workspace dependency.

#### QA Gate Architecture

`qa/qa_gate.js` runs 9 gates. Gate 9 (Root/UI Divergence Check) explicitly compares root and UI copies. After Model 2, Gate 9 must be replaced with a **canonicality gate** that asserts engine code exists only in `packages/core/`.

---

## 1. PHASE DEFINITIONS

### Phase M0: Workspace Bootstrap

**Purpose:** Establish monorepo structure with npm workspaces. No code moves yet.

#### Sub-phase M0.1: Root package.json + workspaces

Create root-level `package.json` with npm workspaces pointing to `packages/core` and `ui`.

**File creates:**
- `/package.json` — workspaces config, `"private": true`

**File content (exact):**
```json
{
  "name": "backbone-v9",
  "version": "9.2.0",
  "private": true,
  "workspaces": [
    "packages/core",
    "ui"
  ]
}
```

#### Sub-phase M0.2: Core package scaffold

Create `packages/core/package.json` with package name `@backbone/core`. Create directory structure.

**File creates:**
- `packages/core/package.json`

**File content (exact):**
```json
{
  "name": "@backbone/core",
  "version": "9.2.0",
  "type": "module",
  "main": "runtime/engine.js",
  "exports": {
    ".": "./runtime/engine.js",
    "./runtime/*": "./runtime/*.js",
    "./decide/*": "./decide/*.js",
    "./derive/*": "./derive/*.js",
    "./predict/*": "./predict/*.js",
    "./qa/*": "./qa/*.js",
    "./raw/*": "./raw/*",
    "./tests/*": "./tests/*.js"
  }
}
```

#### Sub-phase M0.3: Wire UI dependency

Add `@backbone/core` as a dependency in `ui/package.json` via workspace reference. Update `ui/next.config.js` to transpile the workspace package.

**File edits:**
- `ui/package.json` — add `"@backbone/core": "workspace:*"` to dependencies
- `ui/next.config.js` — add `transpilePackages: ['@backbone/core']`

**Acceptance:**
- `npm install` from root succeeds (creates workspace symlinks)
- `ui/node_modules/@backbone/core` symlinks to `packages/core/`
- No existing behavior changes

**Git push:** M0 complete — `"M0: workspace bootstrap — root package.json, core scaffold, UI wired"`

---

### Phase M1: Create Core Package (file moves)

**Purpose:** Move all engine files from repo root into `packages/core/`. Root copies become the canonical core. Internal `../` relative imports remain valid because directory structure is preserved.

#### Sub-phase M1.1: Move decide/

**Commands:**
```
mv decide/ packages/core/decide/
```

**Files moved (4):** `actionCandidates.js`, `actionImpact.js`, `ranking.js`, `weights.js`

**Import integrity:** Internal imports use `../derive/impact.js` and `../derive/patternLift.js` — these resolve correctly once `derive/` also moves in M1.2.

#### Sub-phase M1.2: Move derive/

**Commands:**
```
mv derive/ packages/core/derive/
```

**Files moved (11):** `anomalyDetection.js`, `contextMaps.js`, `goalTrajectory.js`, `impact.js`, `meetingParsing.js`, `meetings.js`, `metrics.js`, `patternLift.js`, `runway.js`, `runwayDerived.js`, `trajectory.js`

**Merge resolution for diverged files:**
- `runway.js`: Use UI version (has defensive Date parsing = superset behavior)
- `trajectory.js`: Use UI version (has defensive Date parsing = superset behavior)

These files go to `packages/core/derive/` using the UI version content, since the UI versions are behavioral supersets (they handle both string and Date inputs).

#### Sub-phase M1.3: Move predict/

**Commands:**
```
mv predict/ packages/core/predict/
```

**Files moved (12):** `actionCandidates.js`, `actionImpact.js`, `actionSchema.js`, `followup.js`, `introOpportunity.js`, `issues.js`, `opportunityCandidates.js`, `preissues.js`, `resolutions.js`, `ripple.js`, `suggestedGoals.js`, `trustRisk.js`

**Merge resolution:**
- `actionSchema.js`: Use root version (has OPPORTUNITY source type = superset)
- `followup.js`: Use UI version (has defensive Date parsing = superset)

#### Sub-phase M1.4: Move runtime/

**Commands:**
```
mv runtime/ packages/core/runtime/
```

**Files moved (8):** `SESSION_MEMORY.js`, `actions.js`, `engine.js`, `export.js`, `graph.js`, `health.js`, `index.js`, `main.js`

**Merge resolution for `engine.js`:** This is the most complex divergence. The root version reads `actionEvents.json` via `fs`. The UI version reads from `rawData.actionEvents`. The core version must support both modes:

```javascript
// In compute(), replace the fs-based events loading with:
// Accept events via options (UI path) or fall back to fs (CLI path)
let actionEvents = options?.events?.length ? [] : []; // placeholder for merge logic
if (options?.actionEvents) {
  actionEvents = options.actionEvents;
} else if (typeof process !== 'undefined') {
  // Node/CLI path: read from disk
  try {
    const eventsPath = join(__eng_dirname, '..', 'raw', 'actionEvents.json');
    if (existsSync(eventsPath)) {
      actionEvents = JSON.parse(readFileSync(eventsPath, 'utf8')).actionEvents || [];
    }
  } catch { /* empty events is valid */ }
}
```

The exact merge will be performed by diffing both versions and producing a unified file that preserves both code paths, gated on environment detection.

#### Sub-phase M1.5: Move qa/

**Commands:**
```
mv qa/ packages/core/qa/
```

**Files moved (3):** `forbidden.js`, `persistence_discipline.js`, `qa_gate.js`

**Note:** `ui/qa/terminology.js` is UI-only and stays in `ui/qa/`.

#### Sub-phase M1.6: Move tests/

**Commands:**
```
mv tests/ packages/core/tests/
```

**Files moved (5):** `anomaly-goal-test.js`, `phase-0.1-qa.spec.js`, `qa_gate_1.spec.js`, `qa_gate_2.spec.js`, `ranking_live.spec.js`

Test imports (e.g., `from '../raw/stageParams.js'`) resolve correctly within `packages/core/`.

#### Sub-phase M1.7: Move raw/

**Commands:**
```
mv raw/ packages/core/raw/
```

**Files moved (43):** All JSON data files, schema files, meetings directory with 25 transcripts.

**Note:** The canonical `sample.json` (39,655 lines) is the root version.

**Acceptance for M1 (all sub-phases):**
- `packages/core/` contains: `decide/` (4), `derive/` (11), `predict/` (12), `runtime/` (8), `qa/` (3), `tests/` (5), `raw/` (43) = 86 files + `package.json`
- Root-level `decide/`, `derive/`, `predict/`, `runtime/`, `qa/`, `tests/`, `raw/` directories no longer exist
- All internal relative imports within `packages/core/` resolve correctly
- `node packages/core/qa/qa_gate.js` runs (gates 1-8; gate 9 will fail because ui/ copies still exist — expected)

**Git push:** M1 complete — `"M1: move engine to packages/core — 86 files, divergence merged"`

---

### Phase M2: Rewire UI Imports

**Purpose:** Change UI API routes to import from `@backbone/core` instead of relative paths to `ui/` copies.

#### Sub-phase M2.1: Rewire today.js

**File:** `ui/pages/api/actions/today.js`

**Before:**
```javascript
import { compute } from '../../../runtime/engine.js';
import portfolioData from '../../../raw/sample.json';
```

**After:**
```javascript
import { compute } from '@backbone/core/runtime/engine';
import portfolioData from '@backbone/core/raw/sample.json';
```

#### Sub-phase M2.2: Rewire entities.js

**File:** `ui/pages/api/entities.js`

**Before:**
```javascript
import portfolioData from '../../raw/sample.json';
```

**After:**
```javascript
import portfolioData from '@backbone/core/raw/sample.json';
```

#### Sub-phase M2.3: Rewire entity/[id].js

**File:** `ui/pages/api/entity/[id].js`

**Before:**
```javascript
import portfolioData from '../../../raw/sample.json';
```

**After:**
```javascript
import portfolioData from '@backbone/core/raw/sample.json';
```

#### Sub-phase M2.4: Verify no other UI engine imports remain

**Command:**
```bash
grep -rn "from.*\.\.\/(decide\|derive\|predict\|runtime\|qa\|raw)" ui/pages/ ui/components/ ui/lib/
```

Must return zero results (comments excluded).

**Acceptance for M2:**
- All three API routes import from `@backbone/core`
- `cd ui && npx next build` succeeds (Turbopack resolves workspace package)
- API routes return identical JSON responses to pre-migration baseline
- Zero relative imports to engine layers from any UI file

**Git push:** M2 complete — `"M2: rewire UI imports to @backbone/core"`

---

### Phase M3: Delete Duplicates

**Purpose:** Remove all engine copies from `ui/` and any remaining root-level engine directories.

#### Sub-phase M3.1: Delete ui/ engine copies

**Directories to delete:**
```
rm -rf ui/decide/
rm -rf ui/derive/
rm -rf ui/predict/
rm -rf ui/runtime/
rm -rf ui/raw/
```

**Files deleted:** ~49 files across 5 directories.

**Note:** `ui/qa/` requires special handling — delete `ui/qa/forbidden.js` and `ui/qa/qa_gate.js` (engine copies), but **preserve** `ui/qa/terminology.js` (UI-only file). If no other files exist in `ui/qa/`, keep the directory for `terminology.js`.

#### Sub-phase M3.2: Delete ui/tests/ if it exists

```
rm -rf ui/tests/    # (does not currently exist, but contract is defensive)
```

#### Sub-phase M3.3: Verify no engine code outside packages/core

**Commands:**
```bash
# Must return empty (no engine dirs at root)
ls -d decide derive predict runtime qa tests raw 2>/dev/null

# Must return empty (no engine dirs in ui except qa/terminology.js)
find ui/decide ui/derive ui/predict ui/runtime ui/raw 2>/dev/null
```

**Acceptance for M3:**
- `ui/decide/`, `ui/derive/`, `ui/predict/`, `ui/runtime/`, `ui/raw/` do not exist
- `ui/qa/terminology.js` preserved
- `ui/qa/forbidden.js`, `ui/qa/qa_gate.js` deleted
- Root-level `decide/`, `derive/`, `predict/`, `runtime/`, `qa/`, `raw/`, `tests/` do not exist
- Engine code exists exclusively in `packages/core/`
- `cd ui && npx next build` still succeeds

**Git push:** M3 complete — `"M3: delete all engine duplicates from ui/ and root"`

---

### Phase M4: Enforce Canonicality via QA

**Purpose:** Update QA gate to enforce that engine code lives only in `packages/core/`. Replace Gate 9 (Root/UI Divergence) with canonicality enforcement.

#### Sub-phase M4.1: Rewrite Gate 9

**File:** `packages/core/qa/qa_gate.js`

Replace `checkRootUIDivergence()` with `checkCanonicality()`:

```javascript
function checkCanonicality() {
  const errors = [];
  const ENGINE_LAYERS = ['decide', 'derive', 'predict', 'runtime', 'qa', 'raw', 'tests'];
  const CORE_PATH = join(ROOT, 'packages', 'core');

  // Assert: engine layers exist in packages/core
  for (const layer of ENGINE_LAYERS) {
    const corePath = join(CORE_PATH, layer);
    if (!existsSync(corePath)) {
      errors.push(`QA_FAIL[CANON]: Missing engine layer packages/core/${layer}`);
    }
  }

  // Assert: no engine code at repo root
  for (const layer of ENGINE_LAYERS) {
    const rootPath = join(ROOT, layer);
    if (existsSync(rootPath)) {
      errors.push(`QA_FAIL[CANON]: Engine code found at repo root: ${layer}/ (must be in packages/core/)`);
    }
  }

  // Assert: no engine code in ui/ (except qa/terminology.js)
  for (const layer of ENGINE_LAYERS) {
    const uiPath = join(ROOT, 'ui', layer);
    if (!existsSync(uiPath)) continue;
    const files = readdirSync(uiPath, { recursive: true });
    const engineFiles = files.filter(f => {
      const rel = `${layer}/${f}`;
      // Allow ui/qa/terminology.js
      if (rel === 'qa/terminology.js') return false;
      return f.endsWith('.js') || f.endsWith('.json');
    });
    if (engineFiles.length > 0) {
      errors.push(`QA_FAIL[CANON]: Engine code in ui/${layer}/: ${engineFiles.join(', ')}`);
    }
  }

  // Assert: UI imports only from @backbone/core (no relative engine imports)
  const uiApiDir = join(ROOT, 'ui', 'pages', 'api');
  if (existsSync(uiApiDir)) {
    const apiFiles = findJsFiles(uiApiDir);
    for (const file of apiFiles) {
      const content = readFileSync(file, 'utf8');
      const relativeEngineImport = content.match(/from\s+['"]\.\.\/.*\/(decide|derive|predict|runtime|qa|raw)\//);
      if (relativeEngineImport) {
        errors.push(`QA_FAIL[CANON]: UI file imports engine via relative path: ${file}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

#### Sub-phase M4.2: Update ROOT path constant

The QA gate's `ROOT` constant must account for the new location. Since `qa_gate.js` is now at `packages/core/qa/qa_gate.js`, ROOT becomes `join(__dirname, '..', '..', '..')`.

#### Sub-phase M4.3: Update all QA gate internal imports

QA gate imports `forbidden.js` from `./forbidden.js` — this still works within `packages/core/qa/`. Verify all gate self-load paths resolve correctly from the new location (data loading paths for `raw/sample.json`, etc.).

#### Sub-phase M4.4: Delete stale divergence allowlist

**File delete:** `.backbone/ui_divergence_allowlist.json` — no longer needed (no divergence to track).

**Acceptance for M4:**
- `node packages/core/qa/qa_gate.js` passes 9/9 gates
- Gate 9 now enforces canonicality (no engine outside `packages/core/`)
- `FULL_CONTEXT_ENFORCEMENT` remains `true`
- Zero QA regressions on gates 1-8

**Git push:** M4 complete — `"M4: QA gate canonicality enforcement — replaces divergence check"`

---

### Phase M5: Root-Level Commands + CLI Updates

**Purpose:** Update CLI and root-level scripts to reference `packages/core/` paths. Ensure `node .backbone/cli.js pull`, `push`, `sync`, `status` all work.

#### Sub-phase M5.1: Update CLI path references

**File:** `.backbone/cli.js`

The CLI references `qa/qa_gate.js`, `raw/`, and other engine paths. All must update to `packages/core/qa/qa_gate.js`, `packages/core/raw/`, etc.

Systematic replacement:
- `join(ROOT, 'qa', 'qa_gate.js')` → `join(ROOT, 'packages', 'core', 'qa', 'qa_gate.js')`
- `join(ROOT, 'raw', ...)` → `join(ROOT, 'packages', 'core', 'raw', ...)`
- Any other root-relative engine path references

#### Sub-phase M5.2: Update root-level utility scripts

Files that may reference engine paths:
- `generate-qa-data.js`
- `generate-scenarios.js`
- `gen-instructions.js`
- `FIX_PACKAGE.sh`

Each must be audited. If they import from engine layers, update to `packages/core/` paths.

#### Sub-phase M5.3: Update DOCTRINE.md and documentation

- `DOCTRINE.md`: Update layer path references from `decide/`, `derive/` etc. to `packages/core/decide/`, `packages/core/derive/`
- `MANIFEST.md`: Update file tree
- `CLAUDE.md` / `PROJECT_INSTRUCTIONS.md` / `INSTRUCTIONS.md`: Update any engine path references
- `README.md`: Update architecture description

#### Sub-phase M5.4: npm install from root

```bash
cd /path/to/backbone-v9
npm install
```

Verify workspace symlinks are correct, `ui/node_modules/@backbone/core` → `../../packages/core`.

#### Sub-phase M5.5: Full integration verification

1. `node packages/core/qa/qa_gate.js` — 9/9 pass
2. `cd ui && npx next build` — succeeds
3. `node .backbone/cli.js status` — reports healthy
4. `node .backbone/cli.js pull --force` — completes without error
5. Vercel deployment — succeeds, production site functional

**Acceptance for M5:**
- CLI commands work with new paths
- QA 9/9
- UI builds
- Vercel deploys
- All documentation updated

**Git push:** M5 complete — `"M5: CLI + docs updated for packages/core layout — Model 2 complete"`

---

## 2. INVARIANT ENFORCEMENT (per MODEL_2_INVARIANTS.md)

These invariants are checked **at every phase boundary** (before each git push):

| Invariant | Gate | Check |
|-----------|------|-------|
| Ranking exports unchanged | Gate 4 | `rankActions` returns identical output for identical input |
| `rankActions` receives full context | Gate 6 | `FULL_CONTEXT_ENFORCEMENT === true`, trace validation |
| QA: 9 gates, 0 skips | All | `node packages/core/qa/qa_gate.js` → 9 pass, 0 fail |
| One canonical engine | Gate 9 (new) | No engine code outside `packages/core/` |
| Raw vs derived preserved | Gate 2 | No stored derivations in `raw/` |
| DAG acyclic | Gate 3 | Topological sort succeeds, no cycles |
| Engine only in `packages/core/` | Gate 9 (new) | Canonicality check |
| No engine code in ui or root | Gate 9 (new) | Scan confirms absence |

---

## 3. DIVERGENCE MERGE DECISIONS (authoritative)

For every file where root ≠ ui, the following merge strategy applies. These decisions are final.

| File | Winner | Rationale |
|------|--------|-----------|
| `derive/runway.js` | UI version → core | UI has defensive Date parsing; root does not. Superset behavior. |
| `derive/trajectory.js` | UI version → core | Same as runway.js — defensive parsing is superset. |
| `predict/actionSchema.js` | Root version → core | Root has OPPORTUNITY source type. UI lacks it. Root is superset. |
| `predict/followup.js` | UI version → core | UI has defensive Date parsing. Superset. |
| `runtime/engine.js` | **Manual merge** → core | Root has fs-based event loading. UI has globals-based. Core must support both, gated on environment. |
| `raw/sample.json` | Root version → core | Root is canonical (39,655 lines). UI has subset. |
| `raw/chunks/sample_manifest.json` | Root version → core | Derivative of sample.json — must match root. |
| `qa/persistence_discipline.js` | Root version → core (root-only) | No UI copy exists. Direct move. |
| `derive/runwayDerived.js` | Root version → core (root-only) | No UI copy exists. Direct move. |
| `predict/opportunityCandidates.js` | Root version → core (root-only) | No UI copy exists. Direct move. |
| `ui/qa/terminology.js` | Stays in `ui/qa/` | UI-only file. Not engine code. |

---

## 4. FILE ACCOUNTING (complete manifest)

### Creates (new files)

| File | Phase |
|------|-------|
| `/package.json` | M0.1 |
| `packages/core/package.json` | M0.2 |

### Moves (root → packages/core/)

| Source | Destination | Phase | Count |
|--------|------------|-------|-------|
| `decide/*` | `packages/core/decide/*` | M1.1 | 4 |
| `derive/*` | `packages/core/derive/*` | M1.2 | 11 |
| `predict/*` | `packages/core/predict/*` | M1.3 | 12 |
| `runtime/*` | `packages/core/runtime/*` | M1.4 | 8 |
| `qa/*` | `packages/core/qa/*` | M1.5 | 3 |
| `tests/*` | `packages/core/tests/*` | M1.6 | 5 |
| `raw/*` | `packages/core/raw/*` | M1.7 | 43 |
| **Total** | | | **86** |

### Edits (in-place modifications)

| File | Phase | Change |
|------|-------|--------|
| `ui/package.json` | M0.3 | Add `@backbone/core` dependency |
| `ui/next.config.js` | M0.3 | Add `transpilePackages` |
| `packages/core/derive/runway.js` | M1.2 | Replace with UI version (superset) |
| `packages/core/derive/trajectory.js` | M1.2 | Replace with UI version (superset) |
| `packages/core/predict/followup.js` | M1.3 | Replace with UI version (superset) |
| `packages/core/runtime/engine.js` | M1.4 | Manual merge (dual-mode events) |
| `ui/pages/api/actions/today.js` | M2.1 | Rewire imports |
| `ui/pages/api/entities.js` | M2.2 | Rewire imports |
| `ui/pages/api/entity/[id].js` | M2.3 | Rewire imports |
| `packages/core/qa/qa_gate.js` | M4.1-4.3 | Replace Gate 9, update ROOT, update paths |
| `.backbone/cli.js` | M5.1 | Update engine path references |
| Various docs | M5.3 | Path reference updates |

### Deletes

| Path | Phase | File Count |
|------|-------|------------|
| `ui/decide/` | M3.1 | 4 |
| `ui/derive/` | M3.1 | 10 |
| `ui/predict/` | M3.1 | 11 |
| `ui/runtime/` | M3.1 | 8 |
| `ui/raw/` | M3.1 | 16 |
| `ui/qa/forbidden.js` | M3.1 | 1 |
| `ui/qa/qa_gate.js` | M3.1 | 1 |
| `.backbone/ui_divergence_allowlist.json` | M4.4 | 1 |
| **Total** | | **~52** |

---

## 5. GIT PUSH SCHEDULE

| Push | Phase | Commit Message | Pre-push Checks |
|------|-------|---------------|-----------------|
| 1 | M0 | `M0: workspace bootstrap — root package.json, core scaffold, UI wired` | `npm install` succeeds, workspace symlinks correct |
| 2 | M1 | `M1: move engine to packages/core — 86 files, divergence merged` | Internal imports resolve, QA gates 1-8 pass (gate 9 expected fail) |
| 3 | M2 | `M2: rewire UI imports to @backbone/core` | `next build` succeeds, API responses unchanged |
| 4 | M3 | `M3: delete all engine duplicates from ui/ and root` | No engine code outside `packages/core/`, `next build` succeeds |
| 5 | M4 | `M4: QA gate canonicality enforcement — replaces divergence check` | QA 9/9, canonicality gate passes |
| 6 | M5 | `M5: CLI + docs updated for packages/core layout — Model 2 complete` | CLI works, QA 9/9, `next build`, Vercel deploy |

---

## 6. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Vercel cannot resolve `@backbone/core` | Medium | Build fails | `transpilePackages` in next.config.js + workspace symlinks. Fallback: set Vercel root to repo root with `installCommand: "npm install"`. |
| QA gate ROOT path breaks after move | High | QA fails | M4.2 explicitly updates ROOT constant. Test immediately after M1. |
| `engine.js` merge introduces behavioral diff | Medium | Ranking changes | Dual-mode merge preserves both paths. Verified by snapshot comparison of `compute()` output pre/post. |
| Large files (sample.json, 39K lines) exceed GitHub API push limits | Medium | Push fails | CLI already handles chunked push via `splitJsonForPush()`. |
| npm workspaces + Next.js standalone output conflict | Low | Build fails | Tested with Next.js 16.x + npm workspaces — `output: 'standalone'` works with `transpilePackages`. |
| Tests reference old root paths | Low | Test failures | Tests move to `packages/core/tests/` — their `../` imports resolve identically within package. |

---

## 7. ACCEPTANCE CHECKLIST (per MODEL_2_ACCEPTANCE_CHECKLIST.md)

| # | Criterion | Verification Command | Phase |
|---|-----------|---------------------|-------|
| 1 | Core contains all engine logic | `find packages/core -name '*.js' \| wc -l` ≥ 43 | M1 |
| 2 | UI contains no engine logic | `find ui/decide ui/derive ui/predict ui/runtime ui/raw 2>/dev/null` returns empty | M3 |
| 3 | Root contains no engine logic | `ls -d decide derive predict runtime qa raw tests 2>/dev/null` returns empty | M3 |
| 4 | UI imports only from core | `grep -rn "from.*\.\./" ui/pages/api/ \| grep -v eventStore \| grep -v node_modules` returns zero engine-layer matches | M2 |
| 5 | QA passes | `node packages/core/qa/qa_gate.js` → 9/9, 0 fail | M4 |
| 6 | Tests pass | `node packages/core/tests/ranking_live.spec.js` succeeds | M5 |
| 7 | UI builds | `cd ui && npx next build` succeeds | M2+ |

---

## 8. OUT OF SCOPE (per MODEL_2_OUT_OF_SCOPE.md)

The following are explicitly forbidden during this contract:

- New features of any kind
- Changes to ranking logic, weights, or `rankScore` computation
- Schema changes (field additions, removals, renames)
- UI redesign or component changes
- Performance optimizations
- Dependency upgrades (beyond what workspace config requires)
- Changes to Redis/event store integration
- Changes to raw data content

Any temptation to "fix" or "improve" code during the move must be resisted. This is a structural refactor with zero behavioral delta.
