# Contract: Canonicality + Library Richness

**Priority:** HIGHEST
**Date:** 2026-02-11
**Author:** Chat
**Executor:** Code
**Supersedes:** LIBRARY_RICHNESS_CONTRACT.md (absorbed), BACKBONE_V9_PHASE_D0_IMPLEMENTATION_CONTRACT_v2.md (incremental items absorbed)

---

## Origin

This contract aggregates two sources:

1. **D0 — Canonicality Enforcement Contract v2** (uploaded, authored by Marc + Linus). Eliminates documentation-level semantic drift and enforces a single authoritative doctrine surface. Evaluation against current codebase found: DOCTRINE/QA gate mismatch (§4.3) already resolved — `qa_at_update: 18/18` matches `18 GATES, ZERO SKIPS`. Incremental items: AUTHORITY.md (§4.1) not created, 15 drift files at root not demoted (§4.2).

2. **Library Richness & Pipeline Fix** (Chat-authored, pushed to `.backbone/contracts/`). Fixes pipeline uniformity: goal field mismatch, resolution coverage gaps, context-aware steps/titles, pre-issue calibration, source propagation.

Phase D0 runs first (no runtime changes, just repo hygiene). Then L0-L5 fix the pipeline.

---

## Phase D0: Canonicality Enforcement

**Files:** repo root, `docs/legacy/` (new directory)
**Runtime changes:** NONE
**Source:** D0 Contract v2, §4.1 + §4.2 (§4.3 already resolved)

### D0.1: Create `AUTHORITY.md` at repo root

```markdown
# AUTHORITY

## Authoritative (Constitutional)

These files define system truth. If any file contradicts them, these win.

- `DOCTRINE.md` — Architectural contract, auto-regenerated on push
- `SCHEMA_REFERENCE.md` — Data schema specification
- `PROJECT_INSTRUCTIONS.md` — Session start and operational protocol
- `packages/core/qa/qa_gate.js` — QA constitution (18 gates)

Rules:
- DOCTRINE.md wins all contradictions.
- System state is canonical only if enforced by QA gate.
- No parallel specifications. One truth surface.

## Operational

Actively used by tooling or environments. Non-constitutional but current:

- `CLAUDE.md` — Code environment instructions
- `README.md` — Repo entry point
- `VIEWING_INSTRUCTIONS.md` — How to run the UI
- `MANUAL_QA_CHECKLIST.md` — Manual validation steps

These must not contradict doctrine. If they do, update them or delete them.

## Legacy

Historical documents live in `docs/legacy/`. They are:
- Non-authoritative
- Non-binding
- Preserved for audit trail only
- Never referenced by tooling or contracts

## Enforcement

If it is not in the authoritative list above and it claims project status,
architecture, or system state — it is legacy. Move it to `docs/legacy/`.
```

### D0.2: Move 15 drift files to `docs/legacy/`

Create `docs/legacy/` directory. Move each file, adding `_2026_02_11` suffix:

| Source (repo root) | Destination |
|---|---|
| `STATUS.md` | `docs/legacy/STATUS_2026_02_11.md` |
| `IMPLEMENTATION_PROGRESS.md` | `docs/legacy/IMPLEMENTATION_PROGRESS_2026_02_11.md` |
| `PHASE_0.1_SUMMARY.md` | `docs/legacy/PHASE_0.1_SUMMARY_2026_02_11.md` |
| `QA_PHASE_0.1.md` | `docs/legacy/QA_PHASE_0.1_2026_02_11.md` |
| `VALIDATION_PHASE_0.1.md` | `docs/legacy/VALIDATION_PHASE_0.1_2026_02_11.md` |
| `SCHEMA_CORRECTIONS.md` | `docs/legacy/SCHEMA_CORRECTIONS_2026_02_11.md` |
| `QA_DATA_SYSTEM.md` | `docs/legacy/QA_DATA_SYSTEM_2026_02_11.md` |
| `README_QA_DATA.md` | `docs/legacy/README_QA_DATA_2026_02_11.md` |
| `NORTH_STAR_REVIEW_ea8b6ed_1769827551977.md` | `docs/legacy/NORTH_STAR_REVIEW_2026_02_11.md` |
| `VERCEL_DEPLOYMENT_SESSION.md` | `docs/legacy/VERCEL_DEPLOYMENT_SESSION_2026_02_11.md` |
| `CLAUDE_UI_HANDOVER.md` | `docs/legacy/CLAUDE_UI_HANDOVER_2026_02_11.md` |
| `UI_NEXT_STEPS.md` | `docs/legacy/UI_NEXT_STEPS_2026_02_11.md` |
| `DESIGN_QA_RED_TEAM_CHECKLIST.md` | `docs/legacy/DESIGN_QA_RED_TEAM_CHECKLIST_2026_02_11.md` |
| `MANIFEST.md` | `docs/legacy/MANIFEST_2026_02_11.md` |
| `INSTRUCTIONS.md` | `docs/legacy/INSTRUCTIONS_2026_02_11.md` |

Prepend each moved file with:
```
LEGACY DOCUMENT — NON-AUTHORITATIVE
Superseded by DOCTRINE.md and QA gate
```

### D0.3: Verify clean root

After D0.2, repo root should contain exactly:

```
AUTHORITY.md            (new, D0.1)
CLAUDE.md               (operational)
DOCTRINE.md             (constitutional)
MANUAL_QA_CHECKLIST.md  (informational)
PROJECT_INSTRUCTIONS.md (constitutional)
README.md               (informational)
SCHEMA_REFERENCE.md     (constitutional)
VIEWING_INSTRUCTIONS.md (informational)
```

Plus non-markdown operational files: `package.json`, `generate-qa-data.js`, `next.config.mjs`, etc.

**Validation:**
- `node packages/core/qa/qa_gate.js` → 18/18 passing
- `grep "qa_at_update" DOCTRINE.md` → `18/18`
- `grep -r "15/15" *.md` → no matches
- No file at root claims project status, phase completion, or architecture that contradicts DOCTRINE.md
- `ls docs/legacy/*.md | wc -l` → 15

---

## Phase L0: Goal Field Name Fix + Goal Surfacing

**Files:** `generate-qa-data.js`, `packages/core/runtime/engine.js`, `ui/pages/api/entity/[id].js`

### Problem

`generate-qa-data.js` writes goals with `cur`/`tgt` fields. `deriveTrajectory()` reads `goal.current`/`goal.target`. No normalization maps between them. Result: every goal trajectory returns null/stalled, producing 218 of 255 pre-issues from two types (GOAL_MISS + GOAL_FEASIBILITY_RISK) that all say the same thing. Additionally, the engine returns `{ id, name, raw, derived }` per company — goals live on `company.raw.goals` but UI reads `company.goals` → `undefined`.

### L0.1: Fix goal field names in generator

In `generate-qa-data.js`, change all goal object literals:
- `cur:` → `current:`
- `tgt:` → `target:`

Add `history` arrays to goals (2-4 data points, spread over 30-90 days) so trajectory has velocity data:

```js
history: [
  { date: daysAgo(60), value: Math.floor(current * 0.4) },
  { date: daysAgo(30), value: Math.floor(current * 0.7) },
  { date: daysAgo(7), value: current },
]
```

### L0.2: Surface goals on company return object

In `engine.js` line ~382, add goals at top level of returned company:

```js
return {
  id: company.id,
  name: company.name,
  goals: company.goals,  // ← ADD
  raw: company,
  derived: { ... }
};
```

### L0.3: Fix entity API goal field mapping

In `ui/pages/api/entity/[id].js` line ~230, add fallback:

```js
current: ng.current ?? ng.cur ?? 0,
target: ng.target ?? ng.tgt ?? 0,
```

### L0.4: Regenerate sample data

Run `node generate-qa-data.js` to produce new chunks with correct field names.

**Validation:** Run engine, verify:
- Every portfolio company has 5+ goals
- Goals have `current`/`target` fields with numeric values
- Trajectory produces non-null results for goals with history
- Pre-issue distribution changes (GOAL_MISS count drops significantly)

---

## Phase L1: Issue→Resolution Coverage Gap

**Files:** `packages/core/predict/resolutions.js`, `packages/core/predict/actionCandidates.js`, `packages/core/predict/preissues.js`

### L1.1: Add missing reactive resolutions

These issue types are detected but have no resolution mapping:

| Issue Type | Count | New Resolution ID |
|---|---|---|
| DEAL_STALE | 77 | `RESOLVE_DEAL_STALE` |
| GOAL_STALLED | 37 | `RESOLVE_GOAL_STALLED` |
| PIPELINE_GAP | 5 | `RESOLVE_PIPELINE_GAP` |
| DATA_MISSING | 1 | Verify mapping — may just need `issueType` field fix |
| DATA_STALE | 4 | Verify mapping — may just need `issueType` field fix |

Add to `RESOLUTIONS` in `resolutions.js`:

```js
RESOLVE_DEAL_STALE: {
  resolutionId: 'RESOLVE_DEAL_STALE',
  issueType: ISSUE_TYPES.DEAL_STALE,
  title: 'Re-engage stale investor conversation',
  defaultEffort: 1, defaultImpact: 0.5, effectiveness: 0.5,
  actionSteps: ['Review last interaction and deal stage', 'Prepare relevant update or ask', 'Send personalized follow-up', 'Set next follow-up date']
},
RESOLVE_GOAL_STALLED: {
  resolutionId: 'RESOLVE_GOAL_STALLED',
  issueType: ISSUE_TYPES.GOAL_STALLED,
  title: 'Unblock stalled goal',
  defaultEffort: 3, defaultImpact: 0.6, effectiveness: 0.6,
  actionSteps: ['Identify root cause of stall', 'Review dependencies and blockers', 'Adjust approach or resources', 'Set short-term checkpoint']
},
RESOLVE_PIPELINE_GAP: {
  resolutionId: 'RESOLVE_PIPELINE_GAP',
  issueType: ISSUE_TYPES.PIPELINE_GAP,
  title: 'Close pipeline coverage gap',
  defaultEffort: 7, defaultImpact: 0.7, effectiveness: 0.7,
  actionSteps: ['Quantify gap between pipeline and round target', 'Identify warm intro paths to new investors', 'Activate dormant conversations', 'Accelerate existing deal stages']
}
```

### L1.2: Add missing preventative resolutions

Pre-issue types that fire but reference non-existent resolution IDs:

```js
// Add to PREVENTATIVE_RESOLUTIONS in actionCandidates.js:
RESOLVE_DEPENDENCY: {
  resolutionId: 'RESOLVE_DEPENDENCY',
  title: 'Resolve blocking dependency',
  defaultEffort: 3, defaultImpact: 0.6, effectiveness: 0.6,
  actionSteps: ['Map dependency chain', 'Identify critical path', 'Parallel-path around blocker', 'Escalate if external']
},
ACCELERATE_TIMING: {
  resolutionId: 'ACCELERATE_TIMING',
  title: 'Accelerate before window closes',
  defaultEffort: 7, defaultImpact: 0.7, effectiveness: 0.7,
  actionSteps: ['Confirm window deadline', 'Compress remaining steps', 'Remove non-essential gates', 'Drive to decision']
},
REQUEST_DATA_UPDATE: {
  resolutionId: 'REQUEST_DATA_UPDATE',
  title: 'Request missing data from founder',
  defaultEffort: 0.5, defaultImpact: 0.3, effectiveness: 0.3,
  actionSteps: ['Identify specific data gaps', 'Draft data request', 'Send to founder/CFO', 'Set follow-up reminder']
}
```

Wire correct `preventativeActions` arrays for DEPENDENCY_RISK, TIMING_WINDOW_RISK, DATA_BLINDSPOT_RISK in `preissues.js`.

**Validation:** Re-run engine. Every issue type and every pre-issue type that fires must produce at least one action. Zero dead-end detections.

---

## Phase L2: Context-Aware Resolution Infrastructure

**Files:** `packages/core/predict/resolutions.js`, `packages/core/predict/actionCandidates.js`

### L2.1: Add STEP_LIBRARY to resolutions.js

Export a new `STEP_LIBRARY` object keyed by resolutionId, with context branches:

```js
export const STEP_LIBRARY = {
  RESOLVE_DEAL_STALE: {
    default: ['Review last interaction', 'Prepare update', 'Send follow-up', 'Set next date'],
    byDealStage: {
      'Sourcing': ['Send intro deck with recent traction', 'Offer quick 15-min call', 'Include relevant portfolio reference'],
      'First Meeting': ['Share updated metrics since last meeting', 'Propose specific next step', 'Offer reference call with portfolio CEO'],
      'Deep Dive': ['Send data room access', 'Address outstanding questions', 'Propose partner meeting date'],
      'Partner Meeting': ['Follow up with requested materials', 'Provide competitive dynamics update', 'Push for term sheet timeline'],
      'Term Sheet': ['Confirm outstanding terms', 'Address legal questions', 'Drive to signing deadline'],
      'Due Diligence': ['Provide remaining diligence items', 'Arrange management meetings', 'Confirm close timeline'],
    },
    byDaysSinceContact: {
      recent: ['Quick check-in with new data point', 'Share relevant news or intro'],
      moderate: ['Substantive update with metrics', 'Propose specific meeting', 'Reference recent milestone'],
      stale: ['Re-engagement with compelling hook', 'New information they haven\'t seen', 'Direct ask about continued interest'],
    }
  },
  ACCELERATE_FUNDRAISE: {
    default: ['Expand investor pipeline', 'Increase outreach velocity', 'Fast-track promising leads', 'Consider bridge financing'],
    byStage: {
      'Pre-seed': ['Focus on angel networks and micro-VCs', 'Leverage accelerator demo days', 'Build proof points for seed pitch'],
      'Seed': ['Target Seed-focused funds with thesis fit', 'Warm intro through existing angels', 'Prepare Series A narrative'],
      'Series A': ['Engage growth-oriented Seed investors for bridge', 'Target Series A specialists', 'Prepare data room with key metrics'],
      'Series B': ['Approach existing investors for pro-rata', 'Target growth funds with sector thesis', 'Prepare detailed financial model'],
    },
    byRunwayMonths: {
      critical: ['Emergency bridge from existing investors', 'Compress timeline to 4-6 weeks', 'Accept less favorable terms for speed'],
      urgent: ['Parallel-path 8-10 investors simultaneously', 'Set artificial deadline', 'Leverage competitive dynamics'],
      comfortable: ['Run disciplined process over 8-12 weeks', 'Optimize for best partner and terms', 'Build FOMO through selective sharing'],
    }
  },
  REDUCE_BURN: {
    default: ['Review expense categories', 'Identify non-essential costs', 'Negotiate with vendors', 'Implement reductions'],
    byBurnRatio: {
      extreme: ['Immediate hiring freeze', 'Cut non-revenue-generating programs', 'Renegotiate all contracts', 'Consider restructuring'],
      elevated: ['Pause open roles except critical hires', 'Audit SaaS subscriptions', 'Defer non-essential projects', 'Set monthly burn targets'],
      moderate: ['Optimize cloud and infrastructure costs', 'Review contractor relationships', 'Consolidate tools'],
    }
  },
  REVENUE_PUSH: {
    default: ['Accelerate sales pipeline', 'Optimize conversion funnel', 'Expand to adjacent market', 'Increase pricing or upsell'],
    byStage: {
      'Seed': ['Focus on first 10 paying customers', 'Validate willingness-to-pay', 'Iterate pricing rapidly', 'Build case studies'],
      'Series A': ['Hire first dedicated AE', 'Formalize sales process', 'Target $100K+ deals', 'Build repeatable playbook'],
      'Series B': ['Scale sales team to 3-5 AEs', 'Expand to enterprise', 'Launch partner channel', 'Land-and-expand motion'],
    }
  },
  PRODUCT_SPRINT: {
    default: ['Define sprint scope', 'Allocate engineering', 'Clear blockers daily', 'Track to milestone'],
    byGoalName: {
      'mvp': ['Define minimum feature set', 'Cut scope aggressively', 'Ship to first 5 beta users', 'Collect feedback within 48hr'],
      'v2': ['Prioritize by customer impact', 'Set hard ship date', 'Parallel QA and development', 'Plan phased rollout'],
      'platform': ['Identify stability bottlenecks', 'Invest in monitoring first', 'Set reliability targets (99.9%)', 'Establish on-call'],
      'pmf': ['Run 10 customer interviews', 'Identify must-have vs nice-to-have', 'Ship feature experiment', 'Measure retention at 7d/30d'],
    }
  },
  FOLLOW_UP_INVESTOR: {
    default: ['Send check-in email', 'Provide recent updates', 'Ask about timeline', 'Confirm next steps'],
    byDealStage: {
      'Sourcing': ['Share company one-pager', 'Offer intro call with founder', 'Highlight thesis alignment'],
      'First Meeting': ['Send follow-up with key points', 'Address questions raised', 'Propose deep dive'],
      'Deep Dive': ['Provide requested materials', 'Offer customer references', 'Discuss valuation framework'],
      'Partner Meeting': ['Thank for time', 'Reiterate differentiators', 'Ask for feedback and timeline'],
    }
  },
  HIRING_PUSH: {
    default: ['Expand sourcing channels', 'Speed up interview process', 'Make competitive offers', 'Onboard quickly'],
    byStage: {
      'Pre-seed': ['Leverage founder networks', 'Offer meaningful equity', 'Sell mission and early impact', 'Consider contract-to-hire'],
      'Seed': ['Post on Wellfound/HN', 'Use agencies for senior roles', 'Build employer brand', 'Offer competitive packages'],
      'Series A': ['Hire dedicated recruiter', 'Build structured interview process', 'Create leveling framework', 'Invest in onboarding'],
      'Series B': ['Scale recruiting team', 'Launch referral program', 'Build 6-month talent pipeline', 'Establish employer brand'],
    }
  },
  RESOLVE_GOAL_STALLED: {
    default: ['Identify root cause', 'Review blockers', 'Adjust approach', 'Set checkpoint'],
    byGoalType: {
      'fundraise': ['Check if pitch or market is the problem', 'Get blunt feedback from 2 trusted investors', 'Consider pivoting round size or terms', 'Set 2-week sprint'],
      'revenue': ['Diagnose pipeline vs conversion problem', 'Talk to 5 churned or lost prospects', 'Test pricing or packaging change', 'Focus on one channel'],
      'hiring': ['Audit job description and comp range', 'Check if hiring bar is miscalibrated', 'Try different sourcing channel', 'Consider fractional bridge'],
      'product': ['Run user session to identify blocker', 'Cut scope to ship this week', 'Bring in external technical review', 'Redefine success criteria'],
      'operational': ['Map process bottleneck with team', 'Get outside perspective', 'Set smaller intermediate milestones', 'Remove or defer dependencies'],
    }
  },
  RESOLVE_PIPELINE_GAP: {
    default: ['Quantify gap', 'Identify warm intro paths', 'Activate dormant conversations', 'Accelerate existing deals'],
    byGapSeverity: {
      large: ['Map all possible warm intro paths', 'Host investor event or demo day', 'Engage 3+ new channels this week', 'Consider strategic/corporate VC'],
      moderate: ['Activate 5 dormant investor relationships', 'Ask existing investors for intros', 'Target 3 specific new funds'],
      small: ['Focus on advancing existing pipeline', 'Add 2-3 backup investors', 'Strengthen lead investor conviction'],
    }
  }
};
```

### L2.2: Context-aware step selection function

Add to `actionCandidates.js`:

```js
import { STEP_LIBRARY } from './resolutions.js';

function selectSteps(resolutionId, context) {
  const library = STEP_LIBRARY[resolutionId];
  if (!library) return null;  // Fall back to resolution.actionSteps
  
  if (context.dealStage && library.byDealStage?.[context.dealStage])
    return library.byDealStage[context.dealStage];
  if (context.stage && library.byStage?.[context.stage])
    return library.byStage[context.stage];
  if (context.goalType && library.byGoalType?.[context.goalType])
    return library.byGoalType[context.goalType];
  if (context.goalName && library.byGoalName) {
    const nameLower = context.goalName.toLowerCase();
    for (const [key, steps] of Object.entries(library.byGoalName))
      if (nameLower.includes(key)) return steps;
  }
  if (context.runwayMonths !== undefined && library.byRunwayMonths) {
    if (context.runwayMonths < 6) return library.byRunwayMonths.critical;
    if (context.runwayMonths < 9) return library.byRunwayMonths.urgent;
    return library.byRunwayMonths.comfortable;
  }
  if (context.daysSinceContact !== undefined && library.byDaysSinceContact) {
    if (context.daysSinceContact < 14) return library.byDaysSinceContact.recent;
    if (context.daysSinceContact < 30) return library.byDaysSinceContact.moderate;
    return library.byDaysSinceContact.stale;
  }
  if (context.burnRatio !== undefined && library.byBurnRatio) {
    if (context.burnRatio > 1.5) return library.byBurnRatio.extreme;
    if (context.burnRatio > 1.0) return library.byBurnRatio.elevated;
    return library.byBurnRatio.moderate;
  }
  if (context.gapSeverity && library.byGapSeverity)
    return library.byGapSeverity[context.gapSeverity];
  
  return library.default;
}
```

### L2.3: Wire context into action generation

Modify `generateActionFromIssue()` and `generateActionsFromPreIssue()` to:
1. Accept `companyContext` parameter: `{ stage, runwayMonths, burnRatio }`
2. Build issue/preissue-specific context from evidence fields
3. Call `selectSteps(resolutionId, context)` instead of using static `resolution.actionSteps`

Update `generateCompanyActionCandidates` signature to accept and pass through company context.

**Validation:** Actions for the same resolutionId but different companies produce different step arrays. No two DEAL_STALE actions for deals at different stages have identical steps.

---

## Phase L3: Dynamic Title Generation

**Files:** `packages/core/predict/actionCandidates.js`

### L3.1: Title template registry

Add `TITLE_TEMPLATES` object keyed by resolutionId, with context-branching functions:

```js
const TITLE_TEMPLATES = {
  RESOLVE_DEAL_STALE: {
    default: (ctx) => `Re-engage ${ctx.firmName || 'investor'} on ${ctx.companyName} deal`,
    byDealStage: {
      'Sourcing': (ctx) => `Get ${ctx.firmName} to first meeting for ${ctx.companyName}`,
      'First Meeting': (ctx) => `Move ${ctx.firmName} to deep dive on ${ctx.companyName}`,
      'Deep Dive': (ctx) => `Push ${ctx.firmName} to partner meeting`,
      'Partner Meeting': (ctx) => `Drive ${ctx.firmName} to term sheet`,
      'Term Sheet': (ctx) => `Close ${ctx.firmName} term sheet for ${ctx.companyName}`,
      'Due Diligence': (ctx) => `Complete ${ctx.firmName} diligence for ${ctx.companyName}`,
    },
    byDaysSinceContact: {
      stale: (ctx) => `${ctx.firmName} gone dark on ${ctx.companyName} — re-engage`,
      moderate: (ctx) => `Follow up with ${ctx.firmName} on ${ctx.companyName}`,
      recent: (ctx) => `Nudge ${ctx.firmName} forward on ${ctx.companyName}`,
    }
  },
  ACCELERATE_FUNDRAISE: {
    default: (ctx) => `Accelerate ${ctx.companyName} ${ctx.roundStage || ''} fundraise`,
    byRunwayMonths: {
      critical: (ctx) => `${ctx.companyName}: Emergency fundraise — ${ctx.runwayMonths}mo runway`,
      urgent: (ctx) => `${ctx.companyName}: Compress fundraise timeline`,
      comfortable: (ctx) => `${ctx.companyName}: Optimize fundraise process`,
    }
  },
  REDUCE_BURN: {
    default: (ctx) => `${ctx.companyName}: Reduce burn rate`,
    byBurnRatio: {
      extreme: (ctx) => `${ctx.companyName}: Cut burn immediately — ${ctx.burnRatio?.toFixed(1)}x stage norm`,
      elevated: (ctx) => `${ctx.companyName}: Bring burn back in range`,
      moderate: (ctx) => `${ctx.companyName}: Optimize burn efficiency`,
    }
  },
  REVENUE_PUSH: {
    default: (ctx) => `${ctx.companyName}: Push revenue toward ${ctx.goalTarget ? '$' + (ctx.goalTarget/1000).toFixed(0) + 'K' : 'target'}`,
    byStage: {
      'Seed': (ctx) => `${ctx.companyName}: Land first paying customers`,
      'Series A': (ctx) => `${ctx.companyName}: Build repeatable sales motion`,
      'Series B': (ctx) => `${ctx.companyName}: Scale revenue engine`,
    }
  },
  PRODUCT_SPRINT: {
    default: (ctx) => `${ctx.companyName}: Sprint to ${ctx.goalName || 'product milestone'}`,
    byGoalName: {
      'mvp': (ctx) => `${ctx.companyName}: Ship MVP to first users`,
      'v2': (ctx) => `${ctx.companyName}: Launch V2`,
      'platform': (ctx) => `${ctx.companyName}: Stabilize platform reliability`,
      'pmf': (ctx) => `${ctx.companyName}: Validate product-market fit`,
    }
  },
  FOLLOW_UP_INVESTOR: {
    default: (ctx) => `Follow up with ${ctx.firmName || 'investor'} for ${ctx.companyName}`,
    byDealStage: {
      'Sourcing': (ctx) => `Get ${ctx.companyName} deck in front of ${ctx.firmName}`,
      'First Meeting': (ctx) => `${ctx.firmName}: Send ${ctx.companyName} follow-up materials`,
      'Deep Dive': (ctx) => `${ctx.firmName}: Provide ${ctx.companyName} diligence materials`,
      'Partner Meeting': (ctx) => `${ctx.firmName}: Drive to term sheet for ${ctx.companyName}`,
    }
  },
  RESOLVE_GOAL_STALLED: {
    default: (ctx) => `${ctx.companyName}: Unblock "${ctx.goalName || 'goal'}"`,
    byGoalType: {
      'fundraise': (ctx) => `${ctx.companyName}: Diagnose fundraise stall`,
      'revenue': (ctx) => `${ctx.companyName}: Unstick revenue growth`,
      'hiring': (ctx) => `${ctx.companyName}: Fix hiring bottleneck`,
      'product': (ctx) => `${ctx.companyName}: Break through product block`,
    }
  },
  RESOLVE_PIPELINE_GAP: {
    default: (ctx) => `${ctx.companyName}: Fill ${ctx.gapPct ? ctx.gapPct + '% ' : ''}pipeline gap`,
  },
  HIRING_PUSH: {
    default: (ctx) => `${ctx.companyName}: Accelerate hiring for ${ctx.goalName || 'team build'}`,
  },
  EXPAND_INVESTOR_LIST: {
    default: (ctx) => `${ctx.companyName} ${ctx.roundStage || ''}: Expand investor target list`,
  },
  PRIORITIZE_LEAD_CANDIDATES: {
    default: (ctx) => `${ctx.companyName} ${ctx.roundStage || ''}: Identify lead investor candidates`,
  },
  ACCELERATE_GOAL: {
    default: (ctx) => `${ctx.companyName}: Accelerate "${ctx.goalName || 'goal'}" progress`,
  },
  RESOLVE_DEPENDENCY: {
    default: (ctx) => `${ctx.companyName}: Resolve "${ctx.goalName || 'blocking'}" dependency`,
  },
  ACCELERATE_TIMING: {
    default: (ctx) => `${ctx.companyName}: Act before ${ctx.windowDescription || 'window closes'}`,
  },
  REQUEST_DATA_UPDATE: {
    default: (ctx) => `${ctx.companyName}: Request ${ctx.missingFields?.join(', ') || 'updated data'} from founder`,
  },
};
```

### L3.2: generateTitle function

```js
function generateTitle(resolutionId, context) {
  const templates = TITLE_TEMPLATES[resolutionId];
  if (!templates) return `${context.companyName}: ${context.resolutionTitle || resolutionId}`;
  
  // Try specific context keys in priority order
  if (context.dealStage && templates.byDealStage?.[context.dealStage])
    return templates.byDealStage[context.dealStage](context);
  if (context.runwayMonths !== undefined && templates.byRunwayMonths) {
    const key = context.runwayMonths < 6 ? 'critical' : context.runwayMonths < 9 ? 'urgent' : 'comfortable';
    if (templates.byRunwayMonths[key]) return templates.byRunwayMonths[key](context);
  }
  if (context.burnRatio !== undefined && templates.byBurnRatio) {
    const key = context.burnRatio > 1.5 ? 'extreme' : context.burnRatio > 1.0 ? 'elevated' : 'moderate';
    if (templates.byBurnRatio[key]) return templates.byBurnRatio[key](context);
  }
  if (context.stage && templates.byStage?.[context.stage])
    return templates.byStage[context.stage](context);
  if (context.goalType && templates.byGoalType?.[context.goalType])
    return templates.byGoalType[context.goalType](context);
  if (context.goalName && templates.byGoalName) {
    const nameLower = context.goalName.toLowerCase();
    for (const [key, fn] of Object.entries(templates.byGoalName))
      if (nameLower.includes(key)) return fn(context);
  }
  if (context.daysSinceContact !== undefined && templates.byDaysSinceContact) {
    const key = context.daysSinceContact > 30 ? 'stale' : context.daysSinceContact > 14 ? 'moderate' : 'recent';
    if (templates.byDaysSinceContact[key]) return templates.byDaysSinceContact[key](context);
  }
  
  return templates.default(context);
}
```

### L3.3: Wire into action generation

Replace static title construction in `generateActionFromIssue()` and `generateActionsFromPreIssue()` with `generateTitle(resolutionId, context)`. Context object includes: `companyName`, `stage`, `firmName`, `dealStage`, `goalName`, `goalType`, `goalTarget`, `roundStage`, `runwayMonths`, `burnRatio`, `daysSinceContact`, `gapPct`, `resolutionTitle`.

**Validation:** No two actions with the same resolutionId have identical titles (unless truly identical situations). DEAL_STALE actions for different deal stages have different titles.

---

## Phase L4: Pre-Issue Threshold Calibration

**Files:** `packages/core/predict/preissues.js`

### L4.1: Tighten GOAL_MISS threshold

Current: fires when `probabilityOfHit < 0.6`. Change to: `probabilityOfHit < 0.4`.

### L4.2: Tighten GOAL_FEASIBILITY_RISK

Add minimum conditions — only fire if:
- `daysLeft < 60` AND `probabilityOfHit < 0.5`
- OR velocity is negative (regressing)

### L4.3: Boost under-represented types

Review RUNWAY_COMPRESSION_RISK (currently 1 instance) — consider adding `runway < 12 months` as alternative trigger. Review TIMING_WINDOW_RISK (currently 2 instances) — should fire for any goal with `daysLeft < 30` and `probabilityOfHit < 0.7`.

**Validation:** No single pre-issue type >35% of total. At least 5 pre-issue types fire. Total pre-issue count 100-200.

---

## Phase L5: Source Type Propagation

**Files:** `packages/core/predict/actionCandidates.js`, `ui/components/ActionCard.js`

### L5.1: Add sourceType convenience field

In `generateActionFromIssue()`: `action.sourceType = 'issue';`
In `generateActionsFromPreIssue()`: `action.sourceType = 'preissue';`

### L5.2: Fix ActionCard sourceType reading

```js
const sourceType = action.sourceType
  || action.sources?.[0]?.sourceType?.toLowerCase()
  || 'other';
```

**Validation:** Every action card renders with correct source badge color.

---

## Phase L6: Sample Data Quality

**Files:** `generate-qa-data.js`

### L6.1: Goal diversity

- 3-6 goals per company (randomized, not fixed 5)
- Not every company needs every type
- Some goals `completed`/`resolved` (showing history)
- 10-20% `at_risk` or `behind` with realistic evidence
- All goals have `history` arrays (2-5 data points)

### L6.2: Deal stage distribution

- At least 30% of portfolio deals are `active`
- Stage distribution covers all DEAL_STAGES
- `lastContact` creates realistic stale distribution (some recent, some 30+ days)

### L6.3: Financial variety

- 2-3 companies with <6 month runway
- 2-3 companies with burn >1.3x stage max
- 3-4 companies with pipeline gaps
- 1-2 companies missing revenue when stage requires it

### L6.4: Regenerate and validate

| Metric | Before | Target |
|---|---|---|
| Goals per company | 0 (broken join) | 3-6 |
| Unique issue types firing | 7 | 10+ |
| Unique pre-issue types firing | 7 | 8+ |
| Actions | 91 | 150-250 |
| Unique resolution IDs on actions | 10 | 18+ |
| No single pre-issue type >35% | GOAL_MISS at 43% | ≤35% |
| Dead-end detections | 122 | 0 |

---

## Execution Order

**D0 → L0 → L6 → L1 → L4 → L2 → L3 → L5**

Rationale:
- D0 cleans the repo surface. No runtime changes, zero risk. Clears the decks.
- L0 fixes the data break (goals actually flow). Must precede everything else.
- L6 regenerates sample data with correct fields + variety. Must follow L0.
- L1 plugs resolution coverage gaps. Quick wins, big action count impact.
- L4 calibrates pre-issue thresholds. Reduces noise before adding richness.
- L2 adds context-aware steps. The biggest quality change.
- L3 adds dynamic titles. Visible impact, depends on L2 context infrastructure.
- L5 propagates source type. Quick fix, visual impact.

## QA Gates

No new QA gates required. Existing 18 gates cover all architectural invariants. Validation criteria in each phase are runtime assertions run after engine execution, not permanent gates.

## Non-Negotiable Invariants (from D0 Contract §5)

This contract must NOT:
- Introduce new ranking surfaces
- Modify `rankScore` formula
- Store derived fields in raw/
- Add layer coupling
- Weaken QA enforcement

---

## D0 Acceptance Criteria (from D0 Contract §6)

After D0 phase:
- `node packages/core/qa/qa_gate.js` → 18/18 passing
- AUTHORITY.md exists with exact authority declarations
- 15 files moved to `docs/legacy/`
- `grep "qa_at_update" DOCTRINE.md` → `18/18`
- No 15/15 claim anywhere at root
- Root contains exactly 8 .md files (AUTHORITY, CLAUDE, DOCTRINE, MANUAL_QA_CHECKLIST, PROJECT_INSTRUCTIONS, README, SCHEMA_REFERENCE, VIEWING_INSTRUCTIONS)

## Risk

- **STEP_LIBRARY size**: ~200 lines of template data. If it grows beyond 500 lines, split into `resolutions.js` + `stepLibrary.js`.
- **Title generation**: Trivial string interpolation. No performance concern.
- **Threshold calibration (L4)**: Values are estimates. May need one tuning round after seeing output distribution. Code should log distribution counts.
