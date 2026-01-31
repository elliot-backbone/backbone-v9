# Backbone V9 — Claude Operating Protocol

## SINGLE-WORD COMMANDS

When you say these words, Claude will execute them on Claude's computer and show real output:

### "status"
Shows current workspace state: commit, files, lines, QA status, uncommitted changes.

### "qa"
Runs comprehensive QA sweep checking for issues.

### "update"
Commits all changes, runs QA gates, pushes to GitHub. Aborts if QA fails.

### "reload"
Downloads latest from GitHub, replaces workspace, verifies QA gates.

### "handover"
Generates complete handover package. Auto-runs UPDATE if uncommitted changes exist.

---

## IMPLEMENTATION

All protocols are implemented in `.backbone/protocols.js` and can be run with:
```bash
node .backbone/protocols.js <command>
```

Each protocol outputs:
- Real commit IDs from git
- Actual file/line counts
- Live QA gate results
- Protocol menu showing all available commands

---

## LEGACY TRIGGERS

### "refresh"
Manual reload using curl/unzip (for when protocols aren't available).

### "push"
Outputs JSON payload for manual commits.

### "why"
First principles. No hedging.

---

## PROTOCOL LOCK

FROZEN v2.0 — Changes require explicit "unfreeze protocol" command.

---

## REFERENCE

**Repository:** https://github.com/elliot-backbone/01-27  
**Protocols:** .backbone/protocols.js  
**QA Gates:** qa/qa_gate.js (must pass 6/6)  
**QA Sweep:** qa-sweep.js (comprehensive checks)

---

## CRITICAL RULES

1. Never show fake example output - always run commands and show real results
2. When user says a protocol word, execute it on Claude's computer
3. All commits must pass QA gates before push
4. Protocol menu shows after every command completion
