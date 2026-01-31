# Backbone V9 — Claude Operating Protocol

## CURRENT STATE

**Repository:** https://github.com/elliot-backbone/backbone-v9
**Deployment:** https://backbone-v9.vercel.app
**Latest Commit:** ea8b6ed (ea8b6ed262cebd1628f945ca90dfc85047cad273)
**Message:** Add protocol system from 01-27 repo
**Author:** Elliot Storey
**Date:** 31 seconds ago

**Workspace:**
- Files: 106
- Lines: 30142
- QA Gates: 6/6 must pass

---

## SINGLE-WORD PROTOCOLS

When you (Claude) see these words from the user, execute the corresponding protocol immediately on your computer and show **real output only**.

### "status"
### "qa"
### "update"
### "reload"
### "handover"
### "review"

**Available:** status, qa, update, reload, handover, review

**Implementation:** ✅ All protocols available

---

## DEPLOYMENT

**Live URL:** https://backbone-v9.vercel.app
**Platform:** Vercel (Team: Backbone)

**API Endpoints:**
- Today's Actions: https://backbone-v9.vercel.app/api/actions/today
- Complete Action: https://backbone-v9.vercel.app/api/actions/[id]/complete
- Skip Action: https://backbone-v9.vercel.app/api/actions/[id]/skip

**Auto-Deploy:** Push to `main` → Vercel builds automatically

---

## PROTOCOL EXECUTION

**Command format:**
```bash
node .backbone/protocols.js <command>
```

**Behavior:**
- Claude executes immediately when user says protocol word
- Shows real output from actual execution
- Never shows fake/example output
- Protocol menu appears after completion
- All operations validated by QA gates

---

## CRITICAL RULES

1. Real output only - never fake examples
2. Execute on trigger - when user says protocol word, run it
3. QA gates required - all commits must pass
4. Dynamic content - all metrics/counts must be live
5. Protocol menu - shows after every completion
6. No derived fields in raw data
7. Event append-only structure
8. Referential integrity - all IDs must exist
9. Correct repository URL always
10. Vercel deployment auto-triggers on push

---

## ARCHITECTURE

**Layer Separation:**
- **raw/** - Input data layer
- **derive/** - Derived calculations
- **predict/** - Forward predictions
- **decide/** - Action ranking
- **runtime/** - Execution engine
- **qa/** - Quality gates
- **ui/** - Frontend (Next.js)
- **api/** - API server

**QA Gates:** 6/6 gates must pass before any commit

---

## KEY FILES

- qa/qa_gate.js
- qa-sweep.js
- runtime/main.js
- SCHEMA_REFERENCE.md
- generate-qa-data.js
- generate-scenarios.js
- .backbone/protocols.js
- PROJECT_INSTRUCTIONS.md

---

## REFERENCE

**Repository:** https://github.com/elliot-backbone/backbone-v9/commit/ea8b6ed262cebd1628f945ca90dfc85047cad273
**Deployment:** https://backbone-v9.vercel.app
**Protocols:** .backbone/protocols.js
**QA Gates:** qa/qa_gate.js
**QA Sweep:** qa-sweep.js
**Source of Truth:** .backbone/source-of-truth.js

---

**Last Updated:** 2026-01-31T02:44:49.967Z
**Auto-generated** - Regenerated on each UPDATE protocol execution.
**All URLs/references pulled from:** .backbone/source-of-truth.js
