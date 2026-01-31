#!/usr/bin/env node

/**
 * Dynamically generates PROJECT_INSTRUCTIONS.md based on actual workspace state
 * Imports from source-of-truth.js for all references
 */

import { execSync } from 'child_process';
import { writeFileSync, statSync } from 'fs';
import { SOURCES } from './source-of-truth.js';

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function fileExists(path) {
  try {
    statSync(path);
    return true;
  } catch (e) {
    return false;
  }
}

// Get dynamic workspace data
const commit = exec('git rev-parse HEAD') || 'unknown';
const commitShort = commit.substring(0, 7);
const commitMsg = exec('git log -1 --format="%s"') || 'unknown';
const commitAuthor = exec('git log -1 --format="%an"') || 'unknown';
const commitDate = exec('git log -1 --format="%ar"') || 'unknown';

const files = parseInt(exec('find . -type f \\( -name "*.js" -o -name "*.md" \\) ! -path "*/node_modules/*" ! -path "*/.git/*" | wc -l')) || 0;
const lines = parseInt(exec('find . -type f \\( -name "*.js" -o -name "*.md" \\) ! -path "*/node_modules/*" ! -path "*/.git/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk \'{print $1}\'')) || 0;

const qaOutput = exec('node qa/qa_gate.js 2>&1');
const qaGates = (qaOutput.match(/QA GATE: (\d+) passed/)?.[1]) || SOURCES.QA_GATE_COUNT;

// Check which protocols exist
const protocolsExist = fileExists('.backbone/protocols.js');
const qaSweepExists = fileExists('qa-sweep.js');
const qaGateExists = fileExists('qa/qa_gate.js');

const instructions = `# Backbone V9 — Claude Operating Protocol

## CURRENT STATE

**Repository:** ${SOURCES.GITHUB_REPO}
**Deployment:** ${SOURCES.VERCEL_URL}
**Latest Commit:** ${commitShort} (${commit})
**Message:** ${commitMsg}
**Author:** ${commitAuthor}
**Date:** ${commitDate}

**Workspace:**
- Files: ${files}
- Lines: ${lines}
- QA Gates: ${qaGates}/${SOURCES.QA_GATE_COUNT} must pass

---

## SINGLE-WORD PROTOCOLS

When you (Claude) see these words from the user, execute the corresponding protocol immediately on your computer and show **real output only**.

${SOURCES.PROTOCOLS.map(p => `### "${p}"`).join('\n')}

**Available:** ${SOURCES.PROTOCOLS.filter(p => protocolsExist || p === 'qa').join(', ')}

**Implementation:** ${protocolsExist ? '✅ All protocols available' : '⚠️ Limited protocols'}

---

## DEPLOYMENT

**Live URL:** ${SOURCES.VERCEL_URL}
**Platform:** Vercel (Team: ${SOURCES.VERCEL_TEAM})

**API Endpoints:**
- Today's Actions: ${SOURCES.API_TODAY}
- Complete Action: ${SOURCES.API_COMPLETE}
- Skip Action: ${SOURCES.API_SKIP}

**Auto-Deploy:** Push to \`${SOURCES.DEFAULT_BRANCH}\` → Vercel builds automatically

---

## PROTOCOL EXECUTION

**Command format:**
\`\`\`bash
node .backbone/protocols.js <command>
\`\`\`

**Behavior:**
- Claude executes immediately when user says protocol word
- Shows real output from actual execution
- Never shows fake/example output
- Protocol menu appears after completion
- All operations validated by QA gates

---

## CRITICAL RULES

${SOURCES.RULES.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

---

## ARCHITECTURE

**Layer Separation:**
${SOURCES.ARCHITECTURE_DIRS.map(d => `- **${d.path}/** - ${d.desc}`).join('\n')}

**QA Gates:** ${qaGates}/${SOURCES.QA_GATE_COUNT} gates must pass before any commit

---

## KEY FILES

${SOURCES.KEY_FILES.filter(f => fileExists(f)).map(f => `- ${f}`).join('\n')}

---

## REFERENCE

**Repository:** ${SOURCES.GITHUB_REPO}/commit/${commit}
**Deployment:** ${SOURCES.VERCEL_URL}
**Protocols:** .backbone/protocols.js
**QA Gates:** qa/qa_gate.js
**QA Sweep:** qa-sweep.js
**Source of Truth:** .backbone/source-of-truth.js

---

**Last Updated:** ${new Date().toISOString()}
**Auto-generated** - Regenerated on each UPDATE protocol execution.
**All URLs/references pulled from:** .backbone/source-of-truth.js
`;

writeFileSync('PROJECT_INSTRUCTIONS.md', instructions);
console.log('✅ PROJECT_INSTRUCTIONS.md updated with current workspace state');
console.log(`   Commit: ${commitShort}`);
console.log(`   Files: ${files}`);
console.log(`   Lines: ${lines}`);
console.log(`   QA Gates: ${qaGates}`);
console.log(`   Repository: ${SOURCES.GITHUB_REPO}`);
console.log(`   Deployment: ${SOURCES.VERCEL_URL}`);
