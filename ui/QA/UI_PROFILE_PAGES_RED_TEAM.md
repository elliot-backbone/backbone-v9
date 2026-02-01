# BACKBONE UI — PROFILE PAGES
## Red-Team Checklist (Drift Prevention)

**Document ID:** BB-UI-PROFILES-RED-TEAM-v1.0  
**Purpose:** Explicit failure modes to actively prevent during implementation and review.  
**Rule:** If any of these patterns are detected, the implementation must be corrected before acceptance.

---

## Overview

This is the "how implementations drift in practice" list. These are failure modes that must be actively avoided. Each item represents a way the UI could accidentally violate Backbone doctrine.

---

## 10.1 "Dashboard creep"

- ❌ Adding a global "Company Dashboard" page with charts and KPIs  
- ❌ Adding a global "Insights" tab as a second home screen  
- ❌ Adding a "Portfolio Overview" that becomes the de facto main surface  

**Why it's a violation:** It competes with Next `Action` and introduces browsing-as-work.

**How to check:** Search codebase for "dashboard", "overview", "insights", "portfolio" in page/route names.

---

## 10.2 "Second ranking surface"

- ❌ Adding "Top Actions for this week" globally  
- ❌ Adding "Highest priority issues" lists outside of the action flow  
- ❌ Sorting entity pages by an "urgency score" that isn't the canonical `rankScore` surface  

**Why it's a violation:** Users will route around Next `Action`.

**How to check:** Verify no global sorted lists exist outside the canonical Next `Action` flow.

---

## 10.3 "Fake precision"

- ❌ Showing numeric scores with 2 decimal places (e.g., 73.42) without a real model requirement  
- ❌ Showing "Health = 81/100" everywhere because it looks good  
- ❌ Showing "confidence" numbers not backed by engine output  

**Why it's a violation:** It lies and creates false trust. If the engine doesn't compute it, UI must not invent it.

**How to check:** Grep for `.toFixed(`, decimal scores, or "confidence" displays not sourced from engine.

---

## 10.4 "Storing derived values by accident"

- ❌ Caching computed values in persisted storage as if they were raw  
- ❌ Writing derived fields back to server "for convenience"  
- ❌ Adding localStorage persistence for derived widgets  

**Why it's a violation:** Breaks Raw vs Derived and creates rot.

**How to check:** Search for `localStorage`, `sessionStorage`, or POST/PUT calls that write derived values.

---

## 10.5 "Editable profile pages"

- ❌ Adding inline edit icons "just to make it nice"  
- ❌ Adding freeform notes that mutate entity records  
- ❌ Turning profiles into CRM entry screens  

**Why it's a violation:** Scope explosion and truth corruption. Editing belongs in explicitly defined flows, not profiles.

**How to check:** Search for `<input`, `<textarea`, `contentEditable`, edit icons in profile components.

---

## 10.6 "Tabs as structure avoidance"

- ❌ Using tabs to hide canonical sections by default  
- ❌ Making At-a-glance a tab, and metrics another tab, etc.  

**Why it's a violation:** Structure becomes inconsistent and users can't build stable mental models.

**How to check:** Verify ProfileLayout renders all sections in fixed order, no tab components wrapping sections.

---

## 10.7 "Modal hell"

- ❌ Opening entity details in modals instead of navigable pages  
- ❌ Nested modals for linked entities  

**Why it's a violation:** Breaks graph-native traversal and kills orientation.

**How to check:** Verify EntityLink navigates to pages, not modals. Search for modal components in profile views.

---

## 10.8 "Too much card UI"

- ❌ Everything becomes a big rounded card with heavy shadows  
- ❌ Visual noise that makes dense data hard to scan  

**Why it's a violation:** Visually pleasing ≠ decorative. Calm density is the goal.

**How to check:** Visual review of profile pages for shadow/card overuse.

---

## 10.9 "Overusing color"

- ❌ Colorizing every metric  
- ❌ Using color as decoration rather than semantic state  

**Why it's a violation:** Users lose signal fidelity; UI becomes a toy.

**How to check:** Visual review — color should indicate state/risk/urgency only.

---

## 10.10 "Making profiles the starting point"

- ❌ Landing page routes to Company list / dashboard  
- ❌ Putting "Explore" as the primary navigation item  

**Why it's a violation:** The Inbox/Next `Action` must remain the spine.

**How to check:** Verify `/` route goes to Next Action, not entity browse.

---

## 10.11 "Inventing new entities or concepts in UI indicates drift"

- ❌ Adding "Projects", "Workspaces", "Boards", "Collections" to organize pages  

**Why it's a violation:** New concepts need explicit doctrine and layer approval; otherwise it's semantic drift.

**How to check:** Search for entity types not in canonical list (company, person, firm, deal, round, goal, issue, action).

---

## 10.12 "Breaking the one-scroll rule"

- ❌ Persistent left nav inside a profile page  
- ❌ Multi-pane layouts where core content is split  

**Why it's a violation:** Violates canonical scanning pattern and creates second-order navigation surfaces.

**How to check:** Visual review of profile pages for sidebar/split-pane layouts.

---

## 10.13 "Mixing raw and derived without labeling"

- ❌ Showing derived values as if they were raw facts (especially if users can copy/paste them)  

**Why it's a violation:** Users treat UI as truth; derived must be visually treated as derived.

**How to check:** Verify derived values (runway, trajectory, etc.) are styled/labeled differently from raw.

---

## 10.14 "Action lifecycle distortion"

- ❌ UI labels that imply "un-executing" or "reverting"  
- ❌ Buttons that change lifecycle backwards  

**Why it's a violation:** Violates lifecycle rules and creates audit inconsistency.

**How to check:** Verify action buttons only move lifecycle forward (pending → executed → observed).

---

## 10.15 "Silent empty states"

- ❌ Omitting sections entirely when data is missing  
- ❌ Rendering blank whitespace without explicit "No data"  

**Why it's a violation:** Users can't tell if something is missing vs truly absent; also breaks structural consistency.

**How to check:** Test profiles with missing data — all sections should render with explicit empty states.

---

## Prime Directive Reminder

> **Profiles exist to help the user decide whether and how to execute the `Action` — not to replace the `Action`.**

If any design choice makes users spend time browsing instead of executing, it is wrong.

---

## Verification Commands

```bash
# Check for dashboard/overview pages
grep -r "dashboard\|overview\|insights" ui/pages/ --include="*.js"

# Check for localStorage/sessionStorage usage
grep -r "localStorage\|sessionStorage" ui/ --include="*.js"

# Check for edit controls in profile components
grep -r "contentEditable\|<input\|<textarea" ui/components/profile/ --include="*.js"

# Check for modal components in profile views
grep -r "Modal\|Dialog" ui/components/profile/ --include="*.js"

# Check for unauthorized entity types
grep -r "workspace\|board\|collection\|project" ui/ --include="*.js" -i
```

---

**End of Document — BB-UI-PROFILES-RED-TEAM-v1.0**
