#!/bin/bash
# Backbone V9 — Claude Code Session Startup
# This runs automatically when a Code session starts

set -e
cd "$CLAUDE_PROJECT_DIR"

echo "═══════════════════════════════════════════════════════════════"
echo "  BACKBONE V9 — SESSION STARTUP"
echo "═══════════════════════════════════════════════════════════════"

# 1. Git sync
echo ""
echo "▶ Git status..."
CURRENT_BRANCH=$(git branch --show-current)
git fetch origin main --quiet
LOCAL_HEAD=$(git rev-parse HEAD)
REMOTE_HEAD=$(git rev-parse origin/main)

if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
    echo "⚠️  LOCAL HEAD:  $LOCAL_HEAD"
    echo "⚠️  REMOTE HEAD: $REMOTE_HEAD"
    echo "⚠️  Run: git pull origin main"
else
    echo "✅ HEAD: ${LOCAL_HEAD:0:7} (synced with origin/main)"
fi

# 2. Doctrine check
echo ""
echo "▶ Doctrine version..."
if [ -f DOCTRINE.md ]; then
    DOCTRINE_HEAD=$(grep "head_at_update:" DOCTRINE.md | awk '{print $2}')
    DOCTRINE_VERSION=$(grep "doctrine_version:" DOCTRINE.md | awk '{print $2}')
    DOCTRINE_HASH=$(grep "doctrine_hash:" DOCTRINE.md | awk '{print $2}')
    echo "   Version: $DOCTRINE_VERSION"
    echo "   Hash:    $DOCTRINE_HASH"
    echo "   Written at HEAD: $DOCTRINE_HEAD"
    
    if [ "${LOCAL_HEAD:0:7}" != "$DOCTRINE_HEAD" ]; then
        echo "⚠️  DOCTRINE STALE — written at $DOCTRINE_HEAD, current is ${LOCAL_HEAD:0:7}"
        echo "   If architectural work needed, flag for Chat to regenerate."
    else
        echo "✅ Doctrine current"
    fi
else
    echo "❌ DOCTRINE.md not found!"
fi

# 3. QA check
echo ""
echo "▶ QA gate..."
QA_OUTPUT=$(node qa/qa_gate.js 2>&1)
if echo "$QA_OUTPUT" | grep -q "QA GATE PASSED"; then
    QA_COUNT=$(echo "$QA_OUTPUT" | grep -o '[0-9]* passed' | grep -o '[0-9]*')
    echo "✅ QA: $QA_COUNT passing"
else
    echo "❌ QA FAILING — run: node qa/qa_gate.js"
    echo "$QA_OUTPUT" | tail -10
fi

# 4. Last session summary
echo ""
echo "▶ Last session..."
if [ -f .backbone/SESSION_LEDGER.md ]; then
    # Extract timestamp and title from first entry
    LAST_SESSION=$(grep -m1 "^## " .backbone/SESSION_LEDGER.md | head -1)
    ACTIVE_WORK=$(grep -A1 "^\*\*Active work:\*\*" .backbone/SESSION_LEDGER.md | tail -1 | head -c 100)
    NEXT_STEPS=$(grep -A1 "^\*\*Next steps:\*\*" .backbone/SESSION_LEDGER.md | tail -1 | head -c 100)
    
    echo "   $LAST_SESSION"
    if [ -n "$ACTIVE_WORK" ]; then
        echo "   Active: ${ACTIVE_WORK}..."
    fi
    if [ -n "$NEXT_STEPS" ]; then
        echo "   Next: ${NEXT_STEPS}..."
    fi
else
    echo "❌ SESSION_LEDGER.md not found!"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Ready. Read DOCTRINE.md §5 (DAG) and §18 (PENDING) for context."
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│  CHAT THINKS. CODE DOES.                                        │"
echo "├─────────────────────────────────────────────────────────────────┤"
echo "│                                                                 │"
echo "│  You are in CODE. Use this for:                                 │"
echo "│    • Edit files, run tests, fix bugs                            │"
echo "│    • Git operations (branches, commits, merges)                 │"
echo "│    • Run QA, execute pipelines, debug                           │"
echo "│    • Anything that touches the filesystem                       │"
echo "│                                                                 │"
echo "│  Switch to CHAT when you need to:                               │"
echo "│    • Research, design, architecture decisions                   │"
echo "│    • External services (Vercel, Explorium, Gmail, Drive)        │"
echo "│    • Documents for humans (reports, packets, handoffs)          │"
echo "│                                                                 │"
echo "│  The ledger is the handoff. Read it. Write to it.               │"
echo "└─────────────────────────────────────────────────────────────────┘"
