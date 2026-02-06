#!/bin/bash
# Backbone V9 — Post-Edit Hook
# Runs after Write/Edit operations to catch issues early

cd "$CLAUDE_PROJECT_DIR"

# Quick layer import check on edited files
# Full QA runs before commit, this is just early warning

# The tool_input contains the file path - we could parse it
# For now, this is a lightweight reminder

# Check if any raw/*.json was edited (potential HC1 violation)
# This would need the actual file path from tool_input

# Output goes to Claude as context
echo '{"systemMessage": "File edited. Run QA before commit: node packages/core/qa/qa_gate.js"}'
