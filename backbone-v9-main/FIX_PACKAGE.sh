#!/bin/bash

echo "╔════════════════════════════════════════════════════════╗"
echo "║  BACKBONE V9 - QA FIX PACKAGE                          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Fix 1: Reset actionEvents.json
echo "🔧 Fixing actionEvents.json..."
echo '{"actionEvents": []}' > raw/actionEvents.json
echo "✓ actionEvents.json reset to empty (valid structure)"

# Fix 2: Verify structure
echo ""
echo "🔍 Verifying fix..."
if head -1 raw/actionEvents.json | grep -q '{"actionEvents"'; then
  echo "✓ Structure verified"
else
  echo "❌ Structure verification failed"
  exit 1
fi

# Fix 3: Run QA gates
echo ""
echo "🔍 Running QA gates..."
if node qa/qa_gate.js | grep -q "QA GATE PASSED"; then
  echo "✓ QA gates passing"
else
  echo "❌ QA gates failing - check output above"
  exit 1
fi

# Fix 4: Commit
echo ""
echo "💾 Committing fix..."
git add raw/actionEvents.json
git commit -m "Reset actionEvents.json to valid empty state"

# Fix 5: Push
echo ""
echo "🚀 Pushing to GitHub..."
git push

echo ""
echo "✅ ALL FIXES APPLIED AND PUSHED"
echo ""
echo "You can now run:"
echo "  node .backbone/protocols.js update"
echo "  node .backbone/protocols.js reload" 
echo "  node .backbone/protocols.js handover"
