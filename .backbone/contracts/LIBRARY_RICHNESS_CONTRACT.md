# Contract: Library Richness & Pipeline Fix

**Priority:** HIGHEST
**Date:** 2026-02-11
**Author:** Chat
**Executor:** Code

## Problem Statement

The pipeline metrics → goals → issues/pre-issues → actions is architecturally correct but produces **uniform, repetitive output** due to six compounding failures:

### Root Causes

1. **Goal field name mismatch (CRITICAL).** `generate-qa-data.js` writes goals with `cur`/`tgt` fields. `deriveTrajectory()` reads `goal.current`/`goal.target`. No normalization step maps between them. Result: **every goal trajectory returns null/stalled**, producing 218 of 255 pre-issues from two types (GOAL_MISS + GOAL_FEASIBILITY_RISK) that all say the same thing.

2. **Goals not surfaced on company objects.** Engine returns `{ id, name, raw: company, derived: {...} }`. Goals live on `company.raw.goals` but UI/API reads `company.goals` → `undefined`. Entity API at `ui/pages/api/entity/[id].js:227` loads goals separately from `getRawData().goals` but maps `ng.current`/`ng.target` which are also undefined due to cause #1.

3. **Resolution library is shallow.** 14 reactive resolutions + 24 preventative resolutions, but only 7 resolution IDs account for 84 of 91 actions. Each resolution has 4 generic action steps regardless of company stage, sector, financial state, or goal context. "Accelerate fundraising" reads identically for a pre-seed and a Series B.

4. **Title generation is mechanical.** Pattern: `"{CompanyName} {context}: {ResolutionTitle}"`. Every action card looks the same. No variation in urgency framing, entity context, or specificity.

5. **Pre-issue thresholds under-calibrated.** GOAL_MISS fires for every goal with `probabilityOfHit < 0.6` — 109 times. GOAL_FEASIBILITY_RISK fires for every goal — 109 times. The other 5 heuristic types (RUNWAY_COMPRESSION_RISK, DEPENDENCY_RISK, DATA_BLINDSPOT_RISK, TIMING_WINDOW_RISK, DEAL_STALL) produce only 37 combined. The proactive engine is live but its signal is drowned.

6. **5 issue types and 4 pre-issue types produce zero actions.** Issues: DATA_MISSING (1), DATA_STALE (4), DEAL_STALE (77), GOAL_STALLED (37), PIPELINE_GAP (5) — all detected, none generate actions because `getResolution()` returns null (the resolution `issueType` field doesn't match). Pre-issues: DATA_BLINDSPOT_RISK, DEPENDENCY_RISK, RUNWAY_COMPRESSION_RISK, TIMING_WINDOW_RISK — detected but `preventativeActions` array references resolution IDs that don't exist in `PREVENTATIVE_RESOLUTIONS`.

### Architectural Decision: Runtime Generation vs. Pre-coded

**Decision: Maximize runtime generation on a richer infrastructure of templates.**

The resolution library stays pre-coded (templates are the "raw" infrastructure) but becomes **stage-aware, sector-aware, and context-branching**. Title generation, action step selection, and severity framing are all **computed at runtime** from the template + entity state. The sample data generator produces realistic goals with correct field names, but the engine does all derivation.

Concretely:
- Resolution templates: **pre-coded** (expanded from 38 to ~60, with stage/context variants)
- Goal suggestions: **runtime** (already works, just needs data fix)
- Action titles: **runtime** (computed from entity state + template, not static string)
- Action steps: **runtime** (selected from template step library based on stage/context)
- Pre-issue thresholds: **pre-coded** (calibrated constants in preissues.js)
- Issue→resolution mapping: **pre-coded** (fixed lookup, but expanded to cover all 14 issue types)

---

## Phase L0: Field Name Fix + Goal Surfacing

**Files:** `generate-qa-data.js`, `packages/core/runtime/engine.js`, `ui/pages/api/entity/[id].js`

### L0.1: Fix goal field names in generator

In `generate-qa-data.js`, the `generateGoalsForCompany()` function and `generateMultiEntityGoals()` function use `cur`/`tgt`. Change to `current`/`target` to match what `deriveTrajectory()`, `detectIssues()`, and all downstream consumers expect.

Find all occurrences of:
- `cur:` → `current:`
- `tgt:` → `target:`

in goal object literals within `generate-qa-data.js`.

Also add `history` arrays to goals (2-4 data points, spread over 30-90 days) so trajectory has velocity data:

```js
history: [
  { date: daysAgo(60), value: Math.floor(current * 0.4) },
  { date: daysAgo(30), value: Math.floor(current * 0.7) },
  { date: daysAgo(7), value: current },
]
```

### L0.2: Surface goals on company return object

In `engine.js` line ~382, the return object has `{ id, name, raw, derived }`. Add goals at top level:

```js
return {
  id: company.id,
  name: company.name,
  goals: company.goals,  // ← ADD THIS
  raw: company,
  derived: { ... }
};
```

### L0.3: Fix entity API goal field mapping

In `ui/pages/api/entity/[id].js` line ~230, the goal mapping reads `ng.current`/`ng.target`. After L0.1 these will exist. But also add fallback for any legacy data:

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
- Pre-issue distribution changes (GOAL_MISS count should drop significantly)

---

## Phase L1: Issue→Resolution Coverage Gap

**Files:** `packages/core/predict/resolutions.js`, `packages/core/predict/actionCandidates.js`

### L1.1: Add missing reactive resolutions

These issue types are detected but have no resolution mapping:

| Issue Type | Count | Resolution to Add |
|---|---|---|
| DEAL_STALE | 77 | `RESOLVE_DEAL_STALE` — "Re-engage stale investor conversation" |
| GOAL_STALLED | 37 | `RESOLVE_GOAL_STALLED` — "Unblock stalled goal" |
| PIPELINE_GAP | 5 | `RESOLVE_PIPELINE_GAP` — "Expand deal pipeline" |
| DATA_MISSING | 1 | Already exists but `issueType` mapping may be wrong — verify |
| DATA_STALE | 4 | Already exists but `issueType` mapping may be wrong — verify |

For DEAL_STALE (77 instances — the largest issue type by count), the resolution must be **stage-aware**:

```js
RESOLVE_DEAL_STALE: {
  resolutionId: 'RESOLVE_DEAL_STALE',
  issueType: ISSUE_TYPES.DEAL_STALE,
  title: 'Re-engage stale investor conversation',
  defaultEffort: 1,
  defaultImpact: 0.5,
  effectiveness: 0.5,
  // Stage-variant steps — see L2
  actionSteps: [
    'Review last interaction and deal stage',
    'Prepare relevant update or ask',
    'Send personalized follow-up',
    'Set next follow-up date'
  ]
}
```

For GOAL_STALLED:
```js
RESOLVE_GOAL_STALLED: {
  resolutionId: 'RESOLVE_GOAL_STALLED',
  issueType: ISSUE_TYPES.GOAL_STALLED,
  title: 'Unblock stalled goal',
  defaultEffort: 3,
  defaultImpact: 0.6,
  effectiveness: 0.6,
  actionSteps: [
    'Identify root cause of stall',
    'Review dependencies and blockers',
    'Adjust approach or resources',
    'Set short-term checkpoint'
  ]
}
```

For PIPELINE_GAP:
```js
RESOLVE_PIPELINE_GAP: {
  resolutionId: 'RESOLVE_PIPELINE_GAP',
  issueType: ISSUE_TYPES.PIPELINE_GAP,
  title: 'Close pipeline coverage gap',
  defaultEffort: 7,
  defaultImpact: 0.7,
  effectiveness: 0.7,
  actionSteps: [
    'Quantify gap between pipeline and round target',
    'Identify warm intro paths to new investors',
    'Activate dormant conversations',
    'Accelerate existing deal stages'
  ]
}
```

### L1.2: Add missing preventative resolutions

These pre-issue types fire but reference resolution IDs that don't exist:

| Pre-issue Type | Missing Resolution |
|---|---|
| RUNWAY_COMPRESSION_RISK | Has `REDUCE_BURN` — verify it exists in PREVENTATIVE_RESOLUTIONS ✓ |
| GOAL_FEASIBILITY_RISK | References `ACCELERATE_GOAL` — verify ✓ |
| DEPENDENCY_RISK | Needs new `RESOLVE_DEPENDENCY` |
| TIMING_WINDOW_RISK | Needs new `ACCELERATE_TIMING` |
| DATA_BLINDSPOT_RISK | Needs new `REQUEST_DATA_UPDATE` |

Add to PREVENTATIVE_RESOLUTIONS:
```js
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

Then update preissues.js to wire the correct `preventativeActions` arrays for DEPENDENCY_RISK, TIMING_WINDOW_RISK, DATA_BLINDSPOT_RISK.

**Validation:** Re-run engine. Every issue type and every pre-issue type that fires must produce at least one action. Zero dead-end detections.

---

## Phase L2: Context-Aware Resolution Infrastructure

**Files:** `packages/core/predict/resolutions.js`, `packages/core/predict/actionCandidates.js`

This is the core richness upgrade. Instead of static `actionSteps` arrays, resolutions get a **step library** keyed by context.

### L2.1: Resolution step library structure

Add a new export to `resolutions.js`:

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
      recent: ['Quick check-in with new data point', 'Share relevant news or intro'],  // 7-14 days
      moderate: ['Substantive update with metrics', 'Propose specific meeting', 'Reference recent milestone'],  // 14-30 days  
      stale: ['Re-engagement with compelling hook', 'New information they haven\'t seen', 'Direct ask about continued interest'],  // 30+ days
    }
  },
  ACCELERATE_FUNDRAISE: {
    default: ['Expand investor pipeline', 'Increase outreach velocity', 'Fast-track promising leads', 'Consider bridge financing'],
    byStage: {
      'Pre-seed': ['Focus on angel networks and micro-VCs', 'Leverage accelerator demo days', 'Build proof points for seed pitch'],
      'Seed': ['Target Seed-focused funds with thesis fit', 'Warm intro through existing angels', 'Prepare Series A narrative for forward-looking investors'],
      'Series A': ['Engage growth-oriented Seed investors for bridge', 'Target Series A specialists with right check size', 'Prepare data room with key metrics'],
      'Series B': ['Approach existing investors for pro-rata + new capital', 'Target growth funds with sector thesis', 'Prepare detailed financial model and projections'],
    },
    byRunwayMonths: {
      critical: ['Emergency bridge from existing investors', 'Compress timeline to 4-6 weeks', 'Accept less favorable terms for speed'],  // <6 months
      urgent: ['Parallel-path 8-10 investors simultaneously', 'Set artificial deadline for decision', 'Leverage competitive dynamics'],  // 6-9 months
      comfortable: ['Run disciplined process over 8-12 weeks', 'Optimize for best partner and terms', 'Build FOMO through selective information sharing'],  // 9+ months
    }
  },
  REDUCE_BURN: {
    default: ['Review expense categories', 'Identify non-essential costs', 'Negotiate with vendors', 'Implement reductions'],
    byBurnRatio: {
      extreme: ['Immediate hiring freeze', 'Cut non-revenue-generating programs', 'Renegotiate all contracts', 'Consider team restructuring'],  // >1.5x stage max
      elevated: ['Pause open roles except critical hires', 'Audit tool and SaaS subscriptions', 'Defer non-essential projects', 'Set monthly burn targets'],  // 1.0-1.5x stage max
      moderate: ['Optimize cloud and infrastructure costs', 'Review contractor relationships', 'Consolidate tools', 'Improve procurement process'],  // within norms but trending up
    }
  },
  REVENUE_PUSH: {
    default: ['Accelerate sales pipeline', 'Optimize conversion funnel', 'Expand to adjacent market', 'Increase pricing or upsell'],
    byStage: {
      'Seed': ['Focus on first 10 paying customers', 'Validate willingness-to-pay', 'Iterate pricing rapidly', 'Build referenceable case studies'],
      'Series A': ['Hire first dedicated AE', 'Formalize sales process', 'Target $100K+ deals', 'Build repeatable playbook'],
      'Series B': ['Scale sales team to 3-5 AEs', 'Expand to enterprise segment', 'Launch partner channel', 'Target land-and-expand motion'],
    }
  },
  PRODUCT_SPRINT: {
    default: ['Define sprint scope', 'Allocate engineering', 'Clear blockers daily', 'Track to milestone'],
    byGoalName: {
      'mvp': ['Define minimum feature set for launch', 'Cut scope aggressively', 'Ship to first 5 beta users', 'Collect feedback within 48 hours'],
      'v2': ['Prioritize features by customer impact', 'Set hard ship date', 'Parallel QA and development', 'Plan phased rollout'],
      'platform': ['Identify stability bottlenecks', 'Invest in monitoring first', 'Set reliability targets (99.9%)', 'Establish on-call rotation'],
      'pmf': ['Run 10 customer interviews this week', 'Identify must-have vs nice-to-have', 'Ship feature experiment', 'Measure retention at 7d/30d'],
    }
  },
  FOLLOW_UP_INVESTOR: {
    default: ['Send check-in email', 'Provide recent updates', 'Ask about timeline', 'Confirm next steps'],
    byDealStage: {
      'Sourcing': ['Share company one-pager', 'Offer intro call with founder', 'Highlight thesis alignment'],
      'First Meeting': ['Send follow-up with key points', 'Address questions raised', 'Propose deep dive session'],
      'Deep Dive': ['Provide requested materials', 'Offer customer references', 'Discuss valuation framework'],
      'Partner Meeting': ['Thank for time', 'Reiterate key differentiators', 'Ask for feedback and timeline'],
    }
  },
  HIRING_PUSH: {
    default: ['Expand sourcing channels', 'Speed up interview process', 'Make competitive offers', 'Onboard quickly'],
    byStage: {
      'Pre-seed': ['Leverage founder networks', 'Offer meaningful equity', 'Sell the mission and early impact', 'Consider fractional/contract-to-hire'],
      'Seed': ['Post on Wellfound and Hacker News', 'Use recruiting agencies for senior roles', 'Build employer brand content', 'Offer competitive packages'],
      'Series A': ['Hire dedicated recruiter', 'Build structured interview process', 'Create leveling framework', 'Invest in onboarding program'],
      'Series B': ['Scale recruiting team', 'Launch referral program', 'Build talent pipeline for 6-month plan', 'Establish employer brand presence'],
    }
  },
  RESOLVE_GOAL_STALLED: {
    default: ['Identify root cause', 'Review blockers', 'Adjust approach', 'Set checkpoint'],
    byGoalType: {
      'fundraise': ['Check if pitch or market is the problem', 'Get blunt feedback from 2 trusted investors', 'Consider pivoting round size or terms', 'Set 2-week sprint with specific targets'],
      'revenue': ['Diagnose pipeline vs conversion problem', 'Talk to 5 churned or lost prospects', 'Test pricing or packaging change', 'Focus on one channel until it works'],
      'hiring': ['Audit job description and comp range', 'Check if hiring bar is miscalibrated', 'Try different sourcing channel', 'Consider a fractional or consultant bridge'],
      'product': ['Run user session to identify real blocker', 'Cut scope to ship something this week', 'Bring in external technical review if stuck', 'Redefine success criteria if too ambitious'],
      'operational': ['Map process bottleneck with team', 'Get outside perspective from advisor/peer', 'Set smaller intermediate milestones', 'Remove or defer dependencies'],
    }
  },
  RESOLVE_PIPELINE_GAP: {
    default: ['Quantify gap', 'Identify warm intro paths', 'Activate dormant conversations', 'Accelerate existing deals'],
    byGapSeverity: {
      large: ['Map all possible warm intro paths', 'Host investor event or demo day', 'Engage 3+ new investor channels this week', 'Consider strategic investors or corporate VC'],  // >50% gap
      moderate: ['Activate 5 dormant investor relationships', 'Ask existing investors for intros', 'Target 3 specific new funds with thesis fit'],  // 20-50% gap
      small: ['Focus on advancing existing pipeline stage', 'Add 2-3 backup investors', 'Strengthen lead investor conviction'],  // <20% gap
    }
  }
};
```

### L2.2: Context-aware step selection in actionCandidates.js

Replace static `resolution.actionSteps` usage with a new function:

```js
function selectSteps(resolutionId, context) {
  const library = STEP_LIBRARY[resolutionId];
  if (!library) return null;  // Fall back to resolution.actionSteps
  
  // Try context-specific steps in priority order
  if (context.dealStage && library.byDealStage?.[context.dealStage]) {
    return library.byDealStage[context.dealStage];
  }
  if (context.stage && library.byStage?.[context.stage]) {
    return library.byStage[context.stage];
  }
  if (context.goalType && library.byGoalType?.[context.goalType]) {
    return library.byGoalType[context.goalType];
  }
  if (context.goalName && library.byGoalName) {
    const nameLower = context.goalName.toLowerCase();
    for (const [key, steps] of Object.entries(library.byGoalName)) {
      if (nameLower.includes(key)) return steps;
    }
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
  if (context.gapSeverity && library.byGapSeverity) {
    return library.byGapSeverity[context.gapSeverity];
  }
  
  return library.default;
}
```

Modify `generateActionFromIssue()` and `generateActionsFromPreIssue()` to build a context object from the issue/preissue evidence and pass it to `selectSteps()`:

```js
// In generateActionFromIssue:
const context = {
  stage: companyStage,  // need to pass stage through
  dealStage: issue.evidence?.dealStage,
  daysSinceContact: issue.evidence?.daysSinceContact || issue.evidence?.daysSinceUpdate,
  runwayMonths: issue.evidence?.runwayMonths,
  goalType: issue.evidence?.goalType,
  goalName: issue.evidence?.goalName,
  burnRatio: issue.evidence?.burnRatio,
};
const steps = selectSteps(resolution.resolutionId, context) || resolution.actionSteps;
```

**Function signatures change:** `generateActionFromIssue` and `generateActionsFromPreIssue` need company stage and financial context passed in. Update `generateCompanyActionCandidates` to accept and pass through `{ companyStage, runwayMonths, burnRatio }`.

**Validation:** Run engine, verify that actions for the same resolution ID but different companies produce **different step arrays**. No two DEAL_STALE actions for deals at different stages should have identical steps.

---

## Phase L3: Dynamic Title Generation

**Files:** `packages/core/predict/actionCandidates.js`

### L3.1: Title generator function

Replace the mechanical `"{CompanyName} {context}: {ResolutionTitle}"` pattern with a context-aware title generator:

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

function generateTitle(resolutionId, context) {
  const templates = TITLE_TEMPLATES[resolutionId];
  if (!templates) return `${context.companyName}: ${context.resolutionTitle || resolutionId}`;
  
  // Try specific context keys in priority order
  if (context.dealStage && templates.byDealStage?.[context.dealStage]) {
    return templates.byDealStage[context.dealStage](context);
  }
  if (context.runwayMonths !== undefined && templates.byRunwayMonths) {
    const key = context.runwayMonths < 6 ? 'critical' : context.runwayMonths < 9 ? 'urgent' : 'comfortable';
    if (templates.byRunwayMonths[key]) return templates.byRunwayMonths[key](context);
  }
  if (context.burnRatio !== undefined && templates.byBurnRatio) {
    const key = context.burnRatio > 1.5 ? 'extreme' : context.burnRatio > 1.0 ? 'elevated' : 'moderate';
    if (templates.byBurnRatio[key]) return templates.byBurnRatio[key](context);
  }
  if (context.stage && templates.byStage?.[context.stage]) {
    return templates.byStage[context.stage](context);
  }
  if (context.goalType && templates.byGoalType?.[context.goalType]) {
    return templates.byGoalType[context.goalType](context);
  }
  if (context.goalName && templates.byGoalName) {
    const nameLower = context.goalName.toLowerCase();
    for (const [key, fn] of Object.entries(templates.byGoalName)) {
      if (nameLower.includes(key)) return fn(context);
    }
  }
  if (context.daysSinceContact !== undefined && templates.byDaysSinceContact) {
    const key = context.daysSinceContact > 30 ? 'stale' : context.daysSinceContact > 14 ? 'moderate' : 'recent';
    if (templates.byDaysSinceContact[key]) return templates.byDaysSinceContact[key](context);
  }
  
  return templates.default(context);
}
```

### L3.2: Wire into action generation

Replace static title construction in `generateActionFromIssue()` and `generateActionsFromPreIssue()` with calls to `generateTitle(resolutionId, context)`.

The context object should include: `companyName`, `stage` (company stage), `firmName` (from deal/issue evidence), `dealStage`, `goalName`, `goalType`, `goalTarget`, `roundStage`, `runwayMonths`, `burnRatio`, `daysSinceContact`, `gapPct`, `resolutionTitle` (fallback).

**Validation:** Run engine, verify:
- No two actions with the same resolutionId have identical titles (unless they're truly identical situations)
- Titles read naturally and carry specific context
- DEAL_STALE actions for different deal stages have different titles

---

## Phase L4: Pre-Issue Threshold Calibration

**Files:** `packages/core/predict/preissues.js`

### L4.1: Tighten GOAL_MISS threshold

Current: fires when `probabilityOfHit < 0.6` — too permissive.
Change to: `probabilityOfHit < 0.4`

This should cut GOAL_MISS from ~109 to ~40-60, letting other pre-issue types have proportional visibility.

### L4.2: Tighten GOAL_FEASIBILITY_RISK

This fires for virtually every goal. Review the firing condition and add minimum thresholds:
- Only fire if `daysLeft < 60` AND `probabilityOfHit < 0.5`
- Or if velocity is negative (regressing)

### L4.3: Boost firing of under-represented types

Review DEAL_STALL (currently 32 instances — healthy), RUNWAY_COMPRESSION_RISK (1), DEPENDENCY_RISK (1), DATA_BLINDSPOT_RISK (1), TIMING_WINDOW_RISK (2).

For RUNWAY_COMPRESSION_RISK: the threshold may be too tight. Check if it requires `burnGrowth > 0` — many companies have flat burn that's still compressing due to time passing. Consider adding `runway < 12 months` as an alternative trigger.

For TIMING_WINDOW_RISK: check if the window calculation is correct. Should fire for any goal with `daysLeft < 30` and `probabilityOfHit < 0.7`.

**Validation:** Run engine, verify:
- No single pre-issue type accounts for >35% of total pre-issues
- At least 5 pre-issue types fire
- Total pre-issue count is 100-200 (signal, not noise)

---

## Phase L5: Source Type Propagation

**Files:** `packages/core/predict/actionCandidates.js`, `ui/components/ActionCard.js`

### L5.1: Add sourceType convenience field

In `generateActionFromIssue()` and `generateActionsFromPreIssue()`, add a top-level `sourceType` field to the created action:

```js
// In generateActionFromIssue:
const action = createAction({ ... });
action.sourceType = 'issue';  // lowercase for UI consistency

// In generateActionsFromPreIssue:
action.sourceType = 'preissue';
```

### L5.2: Fix ActionCard sourceType reading

The ActionCard currently reads `action.sourceType` (which is undefined) and also checks `action.sources?.[0]?.sourceType`. Make consistent:

```js
const sourceType = action.sourceType 
  || action.sources?.[0]?.sourceType?.toLowerCase() 
  || 'other';
```

**Validation:** Every action card renders with correct source badge color (red for issue, amber for preissue, green for other). The "Preventative" tag shows on preissue-sourced actions.

---

## Phase L6: Sample Data Quality

**Files:** `generate-qa-data.js`

### L6.1: Goal diversity

Current generator produces exactly 5 goals per company from the same REQUIRED_GOAL_TYPES list. Add variance:

- 3-6 goals per company (randomized)
- Not every company needs every type
- Some companies should have resolved/completed goals (showing history)
- 10-20% of goals should be `at_risk` or `behind` with realistic evidence
- All goals must have `history` arrays (2-5 data points)

### L6.2: Deal stage distribution

Current deals have random stages. For the pipeline to produce meaningful actions, ensure:
- At least 30% of portfolio company deals are `active` status
- Stage distribution covers all DEAL_STAGES
- `lastContact` dates should create a realistic stale distribution (some recent, some 30+ days)

### L6.3: Financial variety

Ensure portfolio companies have enough financial variety to trigger diverse issues:
- 2-3 companies with <6 month runway (RUNWAY_CRITICAL/WARNING → REDUCE_BURN, BRIDGE_ROUND)
- 2-3 companies with burn >1.3x stage max (BURN_ABOVE_MAX → REDUCE_BURN with context)
- 3-4 companies with pipeline gaps (total deals < round target)
- 1-2 companies missing revenue when stage requires it

### L6.4: Regenerate and validate

Run `node generate-qa-data.js` and then run engine. Expected output:

| Metric | Before | Target |
|---|---|---|
| Goals per company | 0 (broken join) | 3-6 |
| Unique issue types firing | 7 | 10+ |
| Unique pre-issue types firing | 7 | 8+ |
| Actions | 91 | 150-250 |
| Unique resolution IDs on actions | 10 | 18+ |
| No single pre-issue type >35% | GOAL_MISS at 43% | ≤35% |
| Dead-end detections (issue/preissue with no action) | 122 | 0 |

---

## Execution Order

L0 → L6 → L1 → L4 → L2 → L3 → L5

Rationale:
- L0 fixes the data break (goals actually flow). Must be first.
- L6 regenerates sample data with correct fields + variety. Must follow L0.
- L1 plugs resolution coverage gaps. Quick wins, big impact.
- L4 calibrates pre-issue thresholds. Reduces noise before adding richness.
- L2 adds context-aware steps. The biggest quality change.
- L3 adds dynamic titles. Visible impact, depends on L2 context infrastructure.
- L5 propagates source type. Quick fix, visual impact.

## QA Gates

No new QA gates required. Existing gates cover:
- Gate 4: Actions have rankScore ✓
- Gate 5: Single ranking surface ✓
- Gate 9: Canonicality ✓

The validation criteria in each phase are runtime assertions, not permanent gates. Code should run the engine after each phase and verify the stated metrics.

## Risk

- **STEP_LIBRARY size**: ~200 lines of template data in resolutions.js. This is pre-coded infrastructure, not derived data, so it belongs in predict/ layer. If it grows beyond 500 lines, consider splitting into `resolutions.js` (schema) and `stepLibrary.js` (templates).
- **Title generation performance**: Template functions are trivial string interpolation. No performance concern.
- **Threshold calibration**: L4 values are estimates. May need one round of tuning after seeing actual output distribution. Code should log distribution counts after engine run.
