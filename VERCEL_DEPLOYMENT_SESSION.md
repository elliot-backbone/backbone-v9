# Vercel Deployment — Backbone V9

## Current Configuration

- **Deploy root:** `ui/` (configured in Vercel dashboard, not via root vercel.json)
- **Build manifest:** `ui/package.json`
- **Build command:** `npm run build` (runs inside `ui/`)
- **Output directory:** `ui/.next`
- **Framework:** Next.js
- **Production URL:** https://backbone-v9-ziji.vercel.app
- **Vercel project:** `backbone-v9-ziji` (Team: Backbone)
- **Dashboard:** https://vercel.com/backbone-2944a29b/backbone-v9-ziji

## Deployment Flow

1. `git push` to `main`
2. Vercel auto-deploys from `ui/` subdirectory
3. `cd ui && npm install && npm run build`
4. API routes become serverless functions
5. Static assets served from CDN

## Important

- **No root `vercel.json` exists.** The Vercel project root directory is set to `ui/` in the Vercel dashboard. A root `vercel.json` would create ambiguity since there is no root `package.json` or root Next.js app.
- **`ui/` contains copies of backend layers** (`runtime/`, `raw/`, `derive/`, `decide/`, `predict/`, `qa/`) for build access. These must stay in sync with root copies (enforced by QA divergence checks post-C2).

## API Endpoints

```
/api/actions/today          — Daily ranked actions
/api/actions/[id]/complete  — Mark action complete
/api/actions/[id]/skip      — Skip action
/api/debug                  — Debug info (Redis, event count)
```

## Redis (EventStore)

- Production uses Vercel KV (Redis) for event persistence
- Falls back to in-memory store if Redis unavailable
- Configuration via Vercel environment variables
