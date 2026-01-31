# Manual QA Validation Checklist - Phase 0.1

**Run this on your Mac after starting the dev server**

## Prerequisites

```bash
cd /path/to/backbone-v9/ui
npm install
npm run dev
# → Open http://localhost:3000 in browser
```

---

## AT-001: Only ONE Action Visible

**Test Steps:**
1. Load http://localhost:3000
2. Count visible actions on screen

**Pass Criteria:**
- [ ] Exactly ONE action title (h1) visible
- [ ] Exactly ONE company name visible
- [ ] Exactly ONE steps list visible
- [ ] NO multiple action cards/containers
- [ ] NO action queue or list UI

**Visual Check:**
```
Should see:
  Company Name (small, gray)
  
  Action Title (large, black)
  
  1. Step one...
  2. Step two...
  3. Step three...
  
  [Mark Complete]  Skip
```

---

## AT-002: Mark Complete Transitions

**Test Steps:**
1. Load page, note the action title
2. Click "Mark Complete" button
3. Wait for new action to load
4. Verify action title changed

**Pass Criteria:**
- [ ] "Mark Complete" button exists and is clickable
- [ ] After clicking, page shows a different action
- [ ] Previous action is no longer visible
- [ ] New action loads smoothly (no errors)

**Network Check (DevTools):**
- [ ] POST request to `/api/actions/[id]/complete`
- [ ] Request includes `actionId` and `completedAt`
- [ ] Response is `204 No Content`
- [ ] GET request to `/api/actions/today` follows

---

## AT-003: Refresh Returns to Rank-1

**Test Steps:**
1. Load page
2. Note first action shown
3. Click "Mark Complete" to advance
4. Hard refresh page (Cmd+Shift+R / Ctrl+Shift+F5)
5. Verify which action appears

**Pass Criteria:**
- [ ] After refresh, page shows an action (not blank)
- [ ] No localStorage persistence of "last viewed"
- [ ] Fresh GET request to `/api/actions/today`
- [ ] Action is from mock's ranked list (currently first available)

---

## AT-004: No Forbidden Data in DOM

**Test Steps:**
1. Load page
2. Open DevTools → Elements/Inspector
3. Search page source (Cmd+F / Ctrl+F) for forbidden terms
4. Also check with: View → Developer → View Page Source

**Forbidden Terms** (search for each):
- [ ] "rank" or "ranking"
- [ ] "rankScore" or "score"
- [ ] "priority"
- [ ] "health"
- [ ] "impact"
- [ ] "urgency"
- [ ] "runway"
- [ ] "probability"
- [ ] "onTrack" or "velocity"
- [ ] "expectedNetImpact"

**Pass Criteria:**
- [ ] NONE of the above terms found in HTML
- [ ] No hidden divs containing ranking data
- [ ] No data attributes with forbidden values

---

## AT-005: No Prefetching

**Test Steps:**
1. Open DevTools → Network tab
2. Clear network log
3. Load http://localhost:3000
4. Wait 5 seconds after page fully loads
5. Review all network requests

**Pass Criteria:**
- [ ] Exactly ONE request to `/api/actions/today`
- [ ] NO requests to `/api/actions/[specific-id]` for other actions
- [ ] NO background polling/timers
- [ ] NO WebSocket connections for actions
- [ ] NO requests for "next" or "queue" endpoints

**Network Log Should Show:**
```
localhost:3000              (HTML)
_next/static/...            (JS/CSS bundles)
/api/actions/today          (ONE REQUEST ONLY)
```

---

## VD-001: No Progress Indicators

**Visual Inspection:**
- [ ] NO text like "5 of 23 actions"
- [ ] NO progress bars
- [ ] NO "X remaining" counters
- [ ] NO completion percentage
- [ ] NO circular progress indicators

---

## VD-002: No Semantic Color Coding

**Visual Inspection:**
- [ ] NO red/yellow/green status colors
- [ ] NO color-coded priority badges
- [ ] NO health indicators with colors
- [ ] Button is neutral (gray/black, not green "success")
- [ ] All text is black/gray (neutral palette)

**CSS Check (DevTools → Elements):**
- [ ] NO classes like `bg-red`, `bg-green`, `bg-yellow`
- [ ] NO classes like `text-success`, `text-danger`, `text-warning`

---

## VD-003: Centered Layout, No Sidebars

**Visual Inspection:**
- [ ] Action content is centered on page
- [ ] NO left sidebar
- [ ] NO right sidebar
- [ ] NO persistent navigation header
- [ ] NO footer with extra controls

**Layout Check:**
```
Should see:
┌─────────────────────────────────────┐
│                                     │
│         (centered content)          │
│                                     │
│  Company Name                       │
│  Action Title                       │
│  1. Step...                         │
│  [Mark Complete] Skip               │
│                                     │
└─────────────────────────────────────┘
```

---

## VD-004: Typography Compliance

**Font Checks:**
- [ ] Action title is large (appears ~36px / 2.25rem)
- [ ] Company name is small and gray
- [ ] Step numbers use monospace font
- [ ] No excessive bold or italic styling

---

## VD-005: Mobile Responsive

**Test Steps:**
1. Open DevTools → Device Toolbar
2. Select iPhone or small viewport
3. Verify layout adapts

**Pass Criteria:**
- [ ] Content remains centered
- [ ] Button stack vertically on mobile
- [ ] Text remains readable
- [ ] No horizontal scroll

---

## API Contract Validation

### Test GET /api/actions/today

```bash
curl http://localhost:3000/api/actions/today
```

**Expected Response:**
```json
{
  "actionId": "action_001",
  "title": "Schedule investor update...",
  "entityRef": {
    "type": "company",
    "id": "comp_001",
    "name": "Pluto Analytics"
  },
  "resolutionId": "SCHEDULE_UPDATE",
  "steps": [
    {"step": 1, "action": "..."},
    {"step": 2, "action": "..."},
    {"step": 3, "action": "..."}
  ],
  "sources": [...],
  "type": "COMMUNICATION"
}
```

**Validation:**
- [ ] Returns 200 OK
- [ ] Response is valid JSON
- [ ] Has all required fields
- [ ] `steps` is an array with `step` and `action` properties

### Test POST /api/actions/[id]/complete

```bash
curl -X POST http://localhost:3000/api/actions/action_001/complete \
  -H "Content-Type: application/json" \
  -d '{"actionId":"action_001","completedAt":"2026-01-28T12:00:00Z"}'
```

**Validation:**
- [ ] Returns 204 No Content
- [ ] No response body
- [ ] Subsequent `/today` request returns different action

### Test POST /api/actions/[id]/skip

```bash
curl -X POST http://localhost:3000/api/actions/action_002/skip \
  -H "Content-Type: application/json" \
  -d '{"actionId":"action_002"}'
```

**Validation:**
- [ ] Returns 204 No Content
- [ ] No response body
- [ ] Subsequent `/today` request returns different action

---

## Anti-Pattern Detection

### FP-001: No Helpful Additions
- [ ] NO text like "This will improve runway by 2 months"
- [ ] NO outcome predictions
- [ ] NO estimated impact statements

### FP-002: No Implicit Ranking
- [ ] NO "3 of 15 actions today"
- [ ] NO queue visualization
- [ ] NO total action count

### FP-003: No Progressive Enhancement
- [ ] NO "Quick view" of next actions
- [ ] NO action preview cards
- [ ] NO "peek" at upcoming actions

### FP-004: No Usability Theater
- [ ] NO color-coded steps by effort
- [ ] NO time estimates on steps
- [ ] NO difficulty ratings

### FP-005: No Derived Data Leakage
- [ ] NO "High Priority" badges
- [ ] NO "Critical" indicators
- [ ] NO ranking scores visible

---

## Automated Test Execution (If Playwright Works)

```bash
# Run all tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test tests/phase-0.1-qa.spec.js

# Run single test
npx playwright test -g "AT-001"
```

**Expected Output:**
```
Running 8 tests using 1 worker

  ✓ AT-001: Only ONE action visible
  ✓ AT-002: Mark Complete transitions
  ✓ AT-003: Refresh returns to rank-1
  ✓ AT-004: No forbidden data in DOM
  ✓ AT-005: No prefetching
  ✓ VD-001: No progress indicators
  ✓ VD-002: No semantic color coding
  ✓ VD-003: Centered layout

8 passed (5s)
```

---

## Final Certification

**All checks must pass for Phase 0.1 certification**

**Contract Compliance:**
- [ ] PR-001: Single Action Render
- [ ] PR-002: Execution Interface  
- [ ] PR-003: Visual Doctrine
- [ ] PR-004: State Management
- [ ] API Contract (3 endpoints)
- [ ] Zero Forbidden Patterns

**Manual Test Results:**
- AT-001: [ ] PASS / [ ] FAIL
- AT-002: [ ] PASS / [ ] FAIL
- AT-003: [ ] PASS / [ ] FAIL
- AT-004: [ ] PASS / [ ] FAIL
- AT-005: [ ] PASS / [ ] FAIL
- VD-001: [ ] PASS / [ ] FAIL
- VD-002: [ ] PASS / [ ] FAIL
- VD-003: [ ] PASS / [ ] FAIL

**Overall Status:** [ ] ✅ CERTIFIED / [ ] ❌ FAILED

**Tested by:** _______________
**Date:** _______________
**Notes:** _______________

---

## Troubleshooting

### Issue: Blank Page
**Solution:** Check browser console for errors, verify server is running

### Issue: API Returns 404
**Solution:** Ensure you're at `http://localhost:3000` not `localhost:3000/api`

### Issue: Actions Don't Change
**Solution:** Check Network tab for failed POST requests, verify Mock API state

### Issue: Port 3000 In Use
**Solution:**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

---

**This checklist validates Phase 0.1 implementation against BACKBONE_UI_IMPLEMENTATION_CONTRACT.md**
