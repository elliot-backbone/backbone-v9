# Backbone V9

VC portfolio operations engine with action-driven UI.

## Quick Start

```bash
# Load workspace
curl -sL https://api.github.com/repos/elliot-backbone/backbone-v9/zipball/main -o /home/claude/repo.zip
rm -rf /home/claude/backbone-v9
unzip -o /home/claude/repo.zip -d /home/claude/
mv /home/claude/elliot-backbone-backbone-v9-* /home/claude/backbone-v9
cd /home/claude/backbone-v9 && node .backbone/cli.js pull
```

## CLI Commands

```bash
node .backbone/cli.js pull              # Full reload + Vercel + Redis
node .backbone/cli.js sync              # Lightweight refresh
node .backbone/cli.js status            # Workspace state
node .backbone/cli.js push <files> -m   # Push files (runs QA first)
node .backbone/cli.js deploy [msg]      # QA + generate git commands
node .backbone/cli.js handover          # Generate handover doc
```

## Project Structure

```
raw/        Input data layer
derive/     Derived calculations  
predict/    Forward predictions
decide/     Action ranking
runtime/    Execution engine
qa/         Quality gates (6 gates)
ui/         Frontend (Next.js)
```

## Vercel Deployment

**Project:** backbone-v9-ziji  
**Team:** backbone-2944a29b  
**URL:** https://backbone-v9-ziji.vercel.app  
**Dashboard:** https://vercel.com/backbone-2944a29b/backbone-v9-ziji

### Vercel MCP Connector

Claude has access to the Vercel connector for deployment management:

```javascript
// List deployments
Vercel:list_deployments({
  projectId: 'prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ',
  teamId: 'team_jy2mjx7oEsxBERbaUiBIWRrz'
})

// Get deployment details
Vercel:get_deployment({
  idOrUrl: 'dpl_xxx',
  teamId: 'team_jy2mjx7oEsxBERbaUiBIWRrz'
})

// Get build logs
Vercel:get_deployment_build_logs({
  idOrUrl: 'dpl_xxx',
  teamId: 'team_jy2mjx7oEsxBERbaUiBIWRrz'
})
```

### IDs Reference

| Resource | ID |
|----------|-----|
| Project ID | `prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ` |
| Team ID | `team_jy2mjx7oEsxBERbaUiBIWRrz` |
| Team Slug | `backbone-2944a29b` |

## Push Workflow

When pushing changes:

1. **QA Gate** runs automatically (6/6 must pass)
2. **GitHub push** via API
3. **Vercel auto-deploys** from GitHub
4. **Verify** via Vercel connector:
   - Check deployment state
   - Review build logs if needed
   - Confirm production URL works

## Redis (Upstash)

Events stored in Upstash Redis. Check status:
```bash
curl https://backbone-v9-ziji.vercel.app/api/debug
```

Clear events (dev only):
```bash
curl -X POST https://backbone-v9-ziji.vercel.app/api/clear-events
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/actions/today` | GET | Get top 5 actions |
| `/api/actions/execute` | POST | Mark action executed |
| `/api/actions/observe` | POST | Record observation |
| `/api/events` | GET | List all events |
| `/api/debug` | GET | Redis status |
| `/api/clear-events` | POST | Clear events (dev) |
