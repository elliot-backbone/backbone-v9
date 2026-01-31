# Backbone UI Next Steps
Generated: 2026-01-31
Baseline: BACKBONE_STABLE_BASELINE_v1.0

## Current State

**UI-0 (Single Action Surface): IMPLEMENTED ✅**
- One action displayed at a time
- Company name → Title → Steps → Complete/Skip
- No scores, ranks, or derived data shown
- No dashboard, no overview
- Passes Hard Fail checklist items A, B, E

**UI-1 (Inspection Views): IMPLEMENTED ✅**
- Entity inspection: click company name → raw entity data
- Event log: nested under entity inspection
- Progressive disclosure: collapsed by default
- Close returns to unchanged UI-0

**Infrastructure: OPERATIONAL ✅**
- Vercel deployment live
- Redis persistence working
- API returning ranked actions
- Complete/Skip events recording
- Events API endpoint live

## Completed Phases

### Phase 1: UI-0 Polish ✅
- `0072b42` - Minimal spinner (no text)
- `865cf28` - Neutral empty state (em-dash only)
- `865cf28` - Neutral error state (retry button, no red)
- `0072b42` - Fixed steps render for string arrays

### Phase 2: UI-1 Entity Inspection ✅
- `d678e2a` - Company name clickable → entity overlay
- `97ae9b8` - EntityInspect component (raw data only)
- Progressive disclosure compliant

### Phase 3: UI-1 Event Log ✅
- `3725d72` - Event log link in entity view
- `af5bbf0` - EventLog component (raw timestamps)
- `c706e4d` - /api/events endpoint

### Phase 4: Keyboard Shortcuts ✅
- `6123b70` - Enter = complete, Escape = skip
- `71085a4` - Minimal key hints on buttons (desktop only)

### Phase 5: Entity Detail API ✅
- `664c8dd` - /api/entity/[id] endpoint
- `03b48d0` - Fixed Next.js config for dynamic routes
- Returns raw company/deal data (no derived fields)
- UI-1 EntityInspect now shows full entity details

## Doctrine Compliance Audit

| Check | Status | Notes |
|-------|--------|-------|
| A. Action Primacy | ✅ | Single action on render |
| B. One-Screen-One-Question | ✅ | Execute or skip, nothing else |
| C. Progressive Disclosure | ✅ | UI-1 collapsed by default |
| D. Raw vs Derived Integrity | ✅ | No scores shown in UI |
| E. Anti-Dashboard Drift | ✅ | No grids, no summaries |
| F. UI-1 Boundary | ✅ | Inspect only, close returns unchanged |
| G. Investor Psychology Traps | ✅ | No urgency colors, no gamification |
| H. Claude Failure Modes | ✅ | No explanations, no rankings |

## Next Steps (Future)

### Data Layer Enhancements
- ~~Entity detail API with raw company/deal fields~~ ✅
- Filter events by entityId

### UI Refinements
- Mobile responsive polish

## Hard Rules (From Handover)

1. **One Action at a time** — never show queue
2. **One question per screen** — execute or don't
3. **Progressive disclosure only** — collapsed by default
4. **Raw over derived** — no scores, no confidence
5. **No dashboards** — no overview screens
6. **No system explanations** — no "why" text

## Files Modified

| File | Commit | Change |
|------|--------|--------|
| `ui/components/Action.js` | `d678e2a` | Loading/empty states, entity link |
| `ui/pages/index.js` | `865cf28` | Error state styling |
| `ui/components/EntityInspect.js` | `3725d72` | UI-1 entity view |
| `ui/components/EventLog.js` | `af5bbf0` | UI-1 history view |
| `ui/pages/api/events.js` | `c706e4d` | Events API |
