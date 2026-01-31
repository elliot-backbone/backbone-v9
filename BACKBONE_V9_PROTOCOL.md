# Backbone V9 — Claude Operating Protocol

## TRIGGERS

### "refresh"

Download latest code from GitHub, extract to workspace, run QA gate, load all source files.

```bash
curl -sL https://api.github.com/repos/elliot-backbone/backbone-v9/zipball/main -o /home/claude/repo.zip
rm -rf /home/claude/backbone-v9
unzip -o /home/claude/repo.zip -d /home/claude/
mv /home/claude/elliot-backbone-backbone-v9-* /home/claude/backbone-v9
node /home/claude/backbone-v9/qa/qa_gate.js
```

**Output format:**
```
Status: [✅/❌]
Workspace: /home/claude/backbone-v9
QA: [N]/[N] passing
Files: [count] ([lines] lines)
Commit: [hash]
```

### "push"

Output JSON snapshot of all changes for manual commit to GitHub.

**Output format:**
```json
{
  "changes": [
    {"path": "...", "content": "..."}
  ]
}
```

**Use when:** Preserving session work, creating archival record of changes.

### "save"

**Step 1: Verify local state**
```bash
cd ~/Projects/backbone-v9 && git status
```

Claude checks:
- Working tree status
- Uncommitted changes
- Branch is main

**Step 2: Deploy to production**
```bash
cd ~/Projects/backbone-v9
git add .
git commit -m "Update from Claude"
git push
```

**What happens:**
- Saves all changes to Git
- Pushes to GitHub (https://github.com/elliot-backbone/backbone-v9)
- Triggers automatic Vercel deployment
- Live at https://backbone-v9.vercel.app within 30 seconds

**Step 3: Generate handover**

Claude produces markdown document:
- Changes implemented (with file paths)
- Deployment status (build logs, production URL)
- Architecture state
- Next recommended actions
- Context for future sessions

### "why"

First principles explanation. No hedging. Direct reasoning without diplomatic padding.

### Pushback/confusion from user

Dig deeper. Challenge assumptions. Ask clarifying questions.

---

## HARD CONSTRAINTS

**NEVER:**
- Add preamble/postamble to trigger responses
- Store derived fields in raw JSON
- Import upward (L1→L3) or from /runtime
- Use parallel ranking fields (priority/urgency/impact separate from rankScore)

**ALWAYS:**
- Compute derivations at runtime only
- Single ranking surface: `rankScore`
- Files <500 lines
- QA gates enforce doctrine

**FORBIDDEN RAW FIELDS:**
`runway, health, priority, impact, urgency, risk, score, tier, band, label, progressPct, coverage, expectedValue, conversionProb, onTrack, projectedDate, velocity, issues, priorities, actions, rippleScore, rankScore, rankComponents, trustPenalty, executionFrictionPenalty, timeCriticalityBoost, calibratedProbability, introducerPrior, pathTypePrior, targetTypePrior, successRate, followupFor, daysSinceSent`

---

## PRE-SHIP LITMUS

All YES or don't ship:
1. Creates/improves Actions?
2. Optimizes for net value creation?
3. Preserves raw vs derived truth?
4. Respects semantic boundaries?
5. Enforced by architecture/QA?
6. Uses single ranking surface?

---

## NORTH STARS

1. Actions are the product
2. Optimize for net value creation
3. Truth before intelligence (raw sacred, derived computed)
4. Separation of meaning is sacred
5. Architecture enforces doctrine
6. ONE ranking surface

---

## ARCHITECTURE

**Layers (DAG-enforced):**
- **L0 /raw** — Entities + validation
- **L1 /derive** — Pure deterministic derivations
- **L3 /predict** — Issues, trajectories, Bayesian calibration
- **L5 /decide** — Action ranking (rankScore only)
- **L6 /runtime** — Orchestration + IO (nothing imports from here)
- **/qa** — Canonical QA gate

**Ranking Formula:**
```javascript
rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost
expectedNetImpact = (upside × combinedProb) + leverage - (downside × failProb) - effort - timePen
combinedProb = executionProbability × probabilityOfSuccess
```

---

## TERMINOLOGY

| Use | Not |
|-----|-----|
| rankScore | priority, score |
| Action | task, todo |
| Raw vs Derived | (derived = runtime only) |
| context window | memory |
| semantic drift | conversation degradation |
| transcript | chat history |

---

## METADATA

**Phase:** 4.5.2 CERTIFIED + DEPLOYED  
**Repo:** https://github.com/elliot-backbone/backbone-v9  
**Production:** https://backbone-v9.vercel.app  
**Local:** `~/Projects/backbone-v9/`  
**QA:** 6/6 gates passing (11 skipped without runtime data)  
**Mission:** VC deal flow optimization. Actions ranked by single surface (rankScore).

**Deployment:**
- Platform: Vercel (serverless Next.js)
- Auto-deploy: GitHub push → production (30s)
- Stack: Next.js 16 + React 19 + Tailwind 4
- API: Serverless functions with Backbone engine

---

## WORKING PATTERNS

- Direct communication, architecture-first
- North Stars trump convenience
- "Good enough" exists; "technically correct" is floor
- Catch problems early, iterate over perfection

---

*Last updated: 2026-01-31 (Phase 4.5.2 certified + deployed to Vercel)*
