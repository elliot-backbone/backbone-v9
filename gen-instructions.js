// gen-instructions.js
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

function getGitInfo() {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const lastCommit = execSync('git log -1 --format="%h %s"', { encoding: 'utf8' }).trim();
    const tags = execSync('git tag --sort=-creatordate', { encoding: 'utf8' }).trim().split('\n');
    const stableTag = tags.find(t => t.includes('stable')) || 'none';
    return { branch, lastCommit, stableTag };
  } catch { return { branch: 'unknown', lastCommit: 'unknown', stableTag: 'unknown' }; }
}

function getQAStatus() {
  const suites = [
    { name: 'smoke.js', cmd: 'node smoke.js' },
    { name: 'qa32.js', cmd: 'node qa32.js' },
    { name: 'qa40.js', cmd: 'node qa40.js' },
    { name: 'qa45.js', cmd: 'node --experimental-vm-modules qa45.js' },
    { name: 'derive_test.js', cmd: 'node --experimental-vm-modules derive_test.js' }
  ];
  return suites.map(s => {
    try {
      const out = execSync(s.cmd, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
      const m = out.match(/(\d+)\/(\d+)/);
      return { name: s.name, status: m ? `${m[1]}/${m[2]} ✓` : '✓' };
    } catch { return { name: s.name, status: '✗ FAILED' }; }
  });
}

function generate() {
  const git = getGitInfo();
  const qa = getQAStatus();
  const ts = new Date().toISOString();
  const qaTable = qa.map(r => `| ${r.name} | ${r.status} |`).join('\n');

  const md = `# Backbone V9 — Project Instructions
*Auto-generated: ${ts}*

## Source of Truth
**Repo:** https://github.com/elliot-backbone/01-27
**Branch:** ${git.branch} | **Stable Tag:** ${git.stableTag} | **Last Commit:** ${git.lastCommit}

## Refresh Protocol
\`git pull && node smoke.js && node qa32.js && node gen-instructions.js\`
If QA passes: \`git add . && git commit -m "Auto-save" && git push\`
If QA fails: \`git checkout ${git.stableTag}\`

## QA Status
| Suite | Status |
|-------|--------|
${qaTable}

## Architecture Layers
L0 /raw — Raw entities + validation
L1 /derive — Pure deterministic derivations
L3 /predict — Issues, trajectories, ripple, calibration
L5 /decide — Action ranking (single surface)
L6 /runtime — Orchestration + IO

## Hard Constraints
1. No stored derivations (forbidden.js enforces)
2. One ranking surface (rankScore only)
3. DAG execution order (graph.js enforces)
4. Files <500 lines
5. No upward layer imports

## Ranking Formula
rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost

## North Stars
NS1: Actions are the product | NS2: Optimize for net value | NS3: Truth before intelligence
NS4: Separation of meaning is sacred | NS5: Architecture enforces doctrine | NS6: ONE ranking surface

*Regenerate with \`node gen-instructions.js\`*
`;
  writeFileSync('INSTRUCTIONS.md', md);
  console.log('✓ Generated INSTRUCTIONS.md');
  qa.forEach(r => console.log('  ' + r.name + ': ' + r.status));
}
generate();
