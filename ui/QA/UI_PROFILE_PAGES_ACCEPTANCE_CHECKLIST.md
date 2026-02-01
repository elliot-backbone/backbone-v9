# BACKBONE UI — PROFILE PAGES
## Tick-Box Acceptance Checklist (UI-Specific)

**Document ID:** BB-UI-PROFILES-CHECKLIST-v1.0  
**Purpose:** A literal acceptance checklist Elliot can tick off.  
**Rule:** If any unchecked item fails, the implementation is not accepted.

---

## A. Global Doctrine Compliance (hard fail if any NO)

- [x] **Single driving surface preserved:** Next `Action` remains the primary entry and primary CTA (profiles do not become home screen).
- [x] **No dashboards introduced:** there is no new "Overview/Insights/Portfolio Dashboard" page that competes with Next `Action`.
- [x] **No second ranking surface:** there is no alternative global prioritized list beyond the canonical `rankScore` → Next `Action` flow.
- [x] **Raw vs Derived respected:** no derived values are persisted by the UI (no server writes, no localStorage persistence, no "save view").
- [x] **Read-only profiles:** no inline edit controls exist on profile pages.
- [x] **No invented metrics:** UI displays only raw fields or derived fields that already exist from engine/API (clearly treated as derived).

---

## B. Routing & Navigation (hard fail if any NO)

- [x] There is a working route for **Company** profiles.
- [x] There is a working route for **Person** profiles.
- [x] There is a working route for **Firm** profiles.
- [x] There is a working route for **Deal** profiles.
- [x] There is a working route for **Round** profiles.
- [x] There is a working route for **Goal** profiles.
- [x] There is a working route for **Issue** profiles.
- [x] There is a working route for **`Action`** profiles.

- [x] **Graph-native links:** every related entity name is clickable and navigates to its profile.
- [x] **No dead-end pages:** every profile has at least one outgoing entity link OR an explicit "no links available" state when truly none exist.
- [x] **No modal navigation:** entity exploration uses pages, not nested modals.

---

## C. Universal Layout Skeleton (order is fixed)

For **every** entity profile page:

- [x] [A] Identity Header exists.
- [x] [B] At-a-Glance Strip exists.
- [x] [C] Entity-specific sections exist (in correct order).
- [x] [D] Related Actions panel exists.
- [x] [E] Event / History Log exists.

- [x] **Order is exactly:** A → B → C → D → E (no exceptions).
- [x] **Empty-state discipline:** missing data never removes sections; sections render explicit empty states.

---

## D. Identity Header (universal)

For **every** entity profile page:

- [x] Displays entity **name**.
- [x] Displays entity **type badge**.
- [x] Displays **one-line descriptor** (stage/role/status as appropriate, or "Not available").
- [x] Displays stable **ID** subtly.

- [x] Contains **no charts**.
- [x] Contains **no lists**.
- [x] Contains **no edit controls**.

---

## E. At-a-Glance Strip (universal)

For **every** entity profile page:

- [x] At-a-Glance contains **≤ 5 tiles**.
- [x] Tiles shown are only from the allowed set:
  - [x] Health (only where allowed)
  - [x] Top Issue
  - [x] Time since last meaningful event
  - [x] Exposure / importance
  - [x] Blocking / blocked status
- [x] No pseudo-precision (no "73.42/100" style invented scoring).
- [x] Top Issue tile links to the Issue profile when present.

---

## F. Entity-Specific Sections (order + content)

### Company
- [x] Snapshot section exists (stage, ownership, last round, category, geography if available).
- [x] Core Metrics section exists (burn, runway derived, traction, headcount if available).
- [x] Relationships section exists (founders/execs, investors, operators/advisors if available).
- [x] Goals & Issues section exists (active + resolved collapsed).

### Person
- [x] Identity & Role exists.
- [x] Relationship Map exists.
- [x] Activity Signals exists.

### Firm
- [x] Firm Snapshot exists.
- [x] Internal Structure exists.
- [x] Portfolio Exposure exists.
- [x] Relationship State exists.

### Deal
- [x] Deal Summary exists.
- [x] Participants exists.
- [x] Process State exists.

### Round
- [x] Round Snapshot exists.
- [x] Allocation Map exists.
- [x] Risk Factors exists.

### Goal
- [x] Goal Definition exists.
- [x] Trajectory exists (or explicit "Not available" if not provided by engine/API).
- [x] Blocking Issues exists.

### Issue
- [x] Issue Definition exists.
- [x] Impact Surface exists.
- [x] Candidate Actions exists and is explicitly contextual ("Actions that address this Issue").

### `Action`
- [x] Action Definition exists (verb-first, owner, time sensitivity if available, lifecycle badge).
- [x] Impact Rationale exists (only if engine/API provides).
- [x] Dependencies exists (upstream/downstream links).

---

## G. Related Actions Panel (universal)

For **every** entity profile page:

- [x] Panel is present even when empty.
- [x] Contains subsections: **Current**, **Executed**, **Deferred**.
- [x] Each Action row shows:
  - [x] verb-first label
  - [x] lifecycle badge
  - [x] timestamp
  - [x] link to Action profile
- [x] Panel does not act as a second global ranking surface.

---

## H. Event / History Log (universal)

For **every** entity profile page:

- [x] Log is present even when empty.
- [x] Default view is "All" (filters optional).
- [x] Each event row shows:
  - [x] timestamp
  - [x] event type badge
  - [x] short description
  - [x] related entity links where available
- [x] No edits/deletes/reordering by user.

---

## I. Visual Discipline (FM-grade calm density)

- [x] Typography-first layout (clear headers, readable metadata).
- [x] Semantic color only (risk/urgency/state/lifecycle).
- [x] No decorative gradients.
- [x] No heavy shadow "card explosion" that harms scanning.
- [x] No chart walls; only tiny contextual trends if present.
- [x] No sidebar inside profile pages.
- [x] One-scroll experience preserved.

---

## J. Regression Gates

- [x] Existing `Action` lifecycle UI (execute/observe) still works.
- [x] No backward lifecycle transitions are possible or implied.
- [x] No navigation dead-ends introduced by the profile routing change.

---

**End of Checklist — BB-UI-PROFILES-CHECKLIST-v1.0**
