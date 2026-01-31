# Backbone V9 — Claude Operating Protocol

**STATUS: DEPRECATED - Use PROJECT_INSTRUCTIONS.md instead**

This file has been replaced by the automated protocol system.

---

## NEW PROTOCOL SYSTEM

All protocols now use the `.backbone/protocols.js` system.

**Primary Reference:** `PROJECT_INSTRUCTIONS.md` (auto-generated, always current)

### Single-Word Protocols

When you (Claude) see these words from the user, execute immediately:

```bash
node .backbone/protocols.js status    # Show workspace status
node .backbone/protocols.js qa        # Run QA sweep
node .backbone/protocols.js update    # Commit, QA, push, deploy
node .backbone/protocols.js reload    # Pull latest from GitHub
node .backbone/protocols.js handover  # Generate handover package
node .backbone/protocols.js review    # Generate north star review
```

### Legacy Triggers (DEPRECATED)

The following triggers are obsolete:

- ❌ "refresh" - Use `node .backbone/protocols.js reload` instead
- ❌ "push" - Use `node .backbone/protocols.js update` instead
- ❌ "save" - Use `node .backbone/protocols.js update` instead

### "why"

First principles explanation. No hedging.

---

## CURRENT STATE

**Repository:** https://github.com/elliot-backbone/backbone-v9
**Deployment:** https://backbone-v9.vercel.app
**Protocol System:** .backbone/protocols.js
**Source of Truth:** .backbone/source-of-truth.js
**Documentation:** PROJECT_INSTRUCTIONS.md (auto-generated)

---

## MIGRATION COMPLETE

All protocol automation is now handled by:
- `.backbone/protocols.js` - Protocol execution
- `.backbone/source-of-truth.js` - All URLs/references
- `.backbone/update-project-instructions.js` - Dynamic doc generation
- `PROJECT_INSTRUCTIONS.md` - Auto-generated instructions

**For current instructions, see:** `PROJECT_INSTRUCTIONS.md`

---

*Last updated: 2026-01-31 - Migrated to protocol automation system*
