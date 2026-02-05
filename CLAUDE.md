# Backbone V9 — Claude Code

**Chat thinks. Code does.**

Chat handles research, design, external services, and documents for humans.
You handle code, git, tests, QA, and the filesystem.

---

## On Startup

```bash
git pull origin main
cat .backbone/SESSION_LEDGER.md | head -30
node qa/qa_gate.js
```

The ledger tells you what Chat decided. Do that.

---

## Rules

1. **QA must pass before push:** `node qa/qa_gate.js`
2. **No derivations in raw/*.json** — rankScore, health, priority computed at runtime
3. **One ranking surface** — only `decide/ranking.js` sorts actions
4. **Write a ledger entry when done** — 6 fields (what happened, state, active, decisions, next, blockers)

---

## Key Files

```
runtime/graph.js          DAG definition
runtime/engine.js         DAG executor  
decide/ranking.js         THE ranking function
qa/qa_gate.js             Run before every push
.backbone/SESSION_LEDGER.md   Read on start, write on finish
DOCTRINE.md               Full spec (Chat maintains this)
```

---

## Workflow

```
1. git pull
2. Read ledger → see what Chat wants
3. Do the work
4. node qa/qa_gate.js → must pass
5. git add -A && git commit && git push
6. Write ledger entry
7. Push ledger
```

---

## You Don't Have

Vercel MCP, Explorium, Gmail, Calendar, Drive, document generation.
If you need those, tell user to ask Chat.

---

## Local Dev

```bash
cd ui && npm install && npm run dev
# http://localhost:3000
```

---

## Deploy

https://backbone-v9-ziji.vercel.app
Auto-deploys on push. Chat monitors status.
