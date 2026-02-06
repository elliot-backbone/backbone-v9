# Backbone V9 — Claude Code

**Chat thinks. Code does.**

Chat handles research, design, external services, and documents for humans.
You handle code, git, tests, QA, and the filesystem.

---

## On Session Start

**Constraint:** Claude Code cannot output before the user's first message. The startup hook runs automatically and its output arrives as a system message, but you cannot respond until the user sends something.

**Protocol:** Your first response to any user message MUST begin with these two items before addressing the user's request:

1. **Startup hook output** — Copy the full output from `.claude/hooks/startup.sh` verbatim. Don't summarize it. Show the entire block (git status, doctrine status, QA result, last session summary, Chat/Code reminder).

2. **Ledger summary** — Run `git pull origin main`, then read `.backbone/SESSION_LEDGER.md` (head 30 lines), and output a summary: last session, current state, next steps, and blockers.

These two items come first in your first response. No exceptions. Then address whatever the user said.

```bash
git pull origin main
cat .backbone/SESSION_LEDGER.md | head -30
node packages/core/qa/qa_gate.js
```

The ledger tells you what Chat decided. Do that.

---

## Rules

1. **QA must pass before push:** `node packages/core/qa/qa_gate.js`
2. **No derivations in raw/*.json** — rankScore, health, priority computed at runtime
3. **One ranking surface** — only `packages/core/decide/ranking.js` sorts actions
4. **Write a ledger entry when done** — 6 fields (what happened, state, active, decisions, next, blockers)

---

## Key Files

```
packages/core/runtime/graph.js    DAG definition
packages/core/runtime/engine.js   DAG executor
packages/core/decide/ranking.js   THE ranking function
packages/core/qa/qa_gate.js       Run before every push
.backbone/SESSION_LEDGER.md       Read on start, write on finish
DOCTRINE.md                       Full spec (Chat maintains this)
```

---

## Workflow

```
1. git pull
2. Read ledger → see what Chat wants
3. Do the work
4. node packages/core/qa/qa_gate.js → must pass
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
