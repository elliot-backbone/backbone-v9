# Vercel Deployment Session - 2026-01-31

## Overview

Complete Vercel deployment from initial setup through production readiness. This document captures the full journey including all failures, iterations, and final solutions.

## Initial State
- **Local repository**: `~/Projects/backbone-v9` (Mac)
- **GitHub repository**: `elliot-backbone/backbone-v9`
- **Vercel project**: `backbone-v9` (Team: Backbone)
- **Target URL**: https://backbone-v9.vercel.app
- **Original structure**: Flat directory with Next.js files at root level

## Problems Solved

### 1. API Routes Not Deploying (404 Errors)

**Root Cause:**
- Structural mismatch between package.json naming ("ui") and actual directory structure
- next.config.js contained production-breaking rewrites to localhost:4000

**Solution:**
- Restructured to separate ui/ subdirectory
- Created vercel.json to specify build directory
- Copied backend dependencies into ui/ for build access

**Result:**
```
Route (pages)
├ ƒ /api/actions/[id]/complete
├ ƒ /api/actions/[id]/skip
└ ƒ /api/actions/today
```

### 2. Auto-Deploy Not Working

**Root Cause:**
- GitHub webhook not created automatically
- Team permissions blocked manual vercel CLI deployments

**Solution:**
- Created Vercel Deploy Hook manually
- Added webhook to GitHub repository settings
- Configured for push events on main branch

**Webhook URL:**
```
https://api.vercel.com/v1/integrations/deploy/prj_e6alboLzsUj0TLstVn7LhDI2tM3y/KmvKStfiuE
```

### 3. Runtime Error: "r.getTime is not a function"

**Iterations:**
1. **Attempt 1**: Added parseDates() function - Error persisted
2. **Attempt 2**: Improved regex to parse all date formats - Error persisted
3. **Attempt 3**: Found actual bug - passing events array instead of Date to compute()

**Root Cause:**
```javascript
// WRONG - Line 32 in today.js
const result = compute(rawData, events);  // events is an array

// Engine signature expects:
export function compute(rawData, now = new Date()) { }
```

**Solution:**
```javascript
// CORRECT
const now = new Date();
const result = compute(rawData, now);
```

**Additional Fixes:**
- Added defensive date handling in followup.js, trajectory.js, runway.js
- Handles both Date objects and ISO strings safely

### 4. Frontend React Error

**Root Cause:**
- API returns `{actions: [], metadata: {...}}`
- Frontend expected single action object, got full response
- Tried to access `action.entityRef.name` on response object

**Solution:**
```javascript
// Extract first action from response array
setAction(data.actions && data.actions.length > 0 ? data.actions[0] : null);
```

## Final Architecture

```
~/Projects/backbone-v9/
├── runtime/          (backend - root level)
├── raw/
├── derive/
├── decide/
├── predict/
├── qa/
├── ui/               (Next.js app)
│   ├── pages/
│   │   ├── api/actions/
│   │   ├── index.js
│   │   └── _app.js
│   ├── runtime/      (copied for build)
│   ├── raw/
│   ├── derive/
│   ├── decide/
│   ├── predict/
│   └── qa/
└── vercel.json
```

## Deployment Flow

1. Developer: `git push` to `main` branch
2. GitHub: Webhook POST to Vercel Deploy Hook
3. Vercel: Clone repo at commit hash
4. Vercel: `cd ui && npm install`
5. Vercel: `cd ui && npm run build`
6. Vercel: Deploy `/ui/.next` output directory
7. Vercel: API routes become serverless functions
8. Vercel: Promote to production

## All Commits

1. `0b44dcb` - Restructure: separate ui/ directory with backend dependencies
2. `e337919` - Force Vercel rebuild
3. `64618dc` - Test webhook deployment
4. `9efa6a3` - Fix date parsing in API
5. `7e4e7e5` - Fix: parse ALL date strings including due/asOf fields
6. `3aa239d` - Force new deployment
7. `3cabf76` - Fix: pass Date to compute(), not events array + safe date handling
8. `2a1054a` - Fix: extract first action from API response array

## Verification

**Test API:**
```bash
curl https://backbone-v9.vercel.app/api/actions/today
```

**Expected Response:**
```json
{"actions":[],"metadata":{"total":0,"timestamp":"2026-01-31T01:41:03.132Z"}}
```

**View Site:**
```
https://backbone-v9.vercel.app
```

**Expected Display:**
```
No actions available
```

## Known Limitations

- Actions array returns empty (data/logic issue, not deployment issue)
- swcMinify warning in build (deprecated Next.js config, non-breaking)
- Backend code duplicated in ui/ directory (increases bundle size)
- Team permission issue prevents individual CLI deployments

## Key Learnings

1. **Vercel Deploy Hooks bypass GitHub integration issues** - Manual webhook creation works when auto-creation fails
2. **JSON module imports don't auto-parse dates** - Need explicit conversion or defensive handling
3. **Subdirectory builds require explicit vercel.json** - Default detection doesn't work for nested structures
4. **Parameter ordering matters** - Passing wrong type to function parameter causes cryptic errors
5. **GitHub webhooks must be manually added if auto-creation fails** - Check webhook deliveries for debugging

## Status

✅ Fully functional production deployment  
✅ Auto-deploy via GitHub webhook  
✅ API serverless functions operational  
✅ Frontend renders without crashes  
✅ Graceful empty state handling  

**Production URL:** https://backbone-v9.vercel.app  
**Last Deploy:** Commit `2a1054a` (2026-01-31 01:43:06 UTC)  
**All Systems:** Operational
