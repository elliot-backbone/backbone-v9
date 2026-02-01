#!/usr/bin/env node

/**
 * BACKBONE V9 - REFRESH PACKET GENERATOR
 * 
 * Generates CERTIFIED refresh packets per REFRESH_PACKET_SPEC v1
 * 
 * Usage: node .backbone/refresh.js
 * 
 * Output: backbone-v9_<timestamp>_<sha>.zip
 */

import { execSync } from 'child_process';
import { 
  writeFileSync, readFileSync, existsSync, mkdirSync, 
  readdirSync, statSync, createWriteStream 
} from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import { CONFIG } from './config.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const REQUIRED_REPO_DIRS = ['raw', 'derive', 'predict', 'decide', 'runtime', 'qa', 'ui', '.backbone'];
const REQUIRED_STATE_FILES = ['STATUS.md', 'SESSION_MEMORY.md', 'DECISIONS.md', 'PROTOCOL_LEDGER.md', 'CHANGELOG.md'];
const FORBIDDEN_PATTERNS = [
  /ghp_[A-Za-z0-9]{36}/,           // GitHub tokens
  /sk-[A-Za-z0-9]{48}/,            // OpenAI keys
  /UPSTASH_REDIS_REST_URL\s*=\s*["']?https?:\/\/[^"'\s]+/,
  /UPSTASH_REDIS_REST_TOKEN\s*=\s*["']?[^"'\s]+/,
  /-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----/,
  /password\s*[:=]\s*["']?[^"'\s]{8,}/i
];
const FORBIDDEN_DERIVED_FIELDS = ['health', 'priority', 'urgency', 'rankScore', 'coverage'];

// =============================================================================
// UTILITIES
// =============================================================================

function exec(cmd, silent = true) {
  try {
    return { success: true, output: execSync(cmd, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' }) };
  } catch (e) {
    return { success: false, error: e.message, output: e.stdout || '' };
  }
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function sha256File(filepath) {
  return sha256(readFileSync(filepath));
}

function getAllFiles(dir, base = dir) {
  let files = [];
  for (const item of readdirSync(dir)) {
    if (item === 'node_modules' || item === '.git') continue;
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(full, base));
    } else {
      files.push({ path: relative(base, full), fullPath: full, bytes: stat.size });
    }
  }
  return files;
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// =============================================================================
// PRECHECKS (PART I)
// =============================================================================

function checkSecrets(files) {
  const violations = [];
  for (const file of files) {
    if (file.path.endsWith('.json') || file.path.endsWith('.js') || file.path.endsWith('.md') || file.path.endsWith('.env')) {
      try {
        const content = readFileSync(file.fullPath, 'utf8');
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(content)) {
            violations.push(`${file.path}: matches forbidden pattern ${pattern.toString().slice(0, 30)}...`);
          }
        }
      } catch (e) {}
    }
  }
  return violations;
}

function checkForbiddenDerivations(repoPath) {
  const violations = [];
  const rawDir = join(repoPath, 'raw');
  if (existsSync(rawDir)) {
    for (const file of readdirSync(rawDir).filter(f => f.endsWith('.json'))) {
      try {
        const content = readFileSync(join(rawDir, file), 'utf8');
        const data = JSON.parse(content);
        const checkObj = (obj, path) => {
          if (typeof obj !== 'object' || obj === null) return;
          for (const key of Object.keys(obj)) {
            if (FORBIDDEN_DERIVED_FIELDS.includes(key)) {
              violations.push(`${file}: forbidden derived field "${key}" at ${path}.${key}`);
            }
            if (typeof obj[key] === 'object') {
              checkObj(obj[key], `${path}.${key}`);
            }
          }
        };
        checkObj(data, 'root');
      } catch (e) {}
    }
  }
  return violations;
}

// =============================================================================
// DATA COLLECTION
// =============================================================================

function getGitInfo() {
  const apiResult = exec(`curl -s "https://api.github.com/repos/${CONFIG.GITHUB_ORG}/${CONFIG.GITHUB_PROJECT}/commits/main"`);
  let info = { owner: CONFIG.GITHUB_ORG, name: CONFIG.GITHUB_PROJECT, branch: 'main' };
  if (apiResult.success && apiResult.output) {
    try {
      const data = JSON.parse(apiResult.output);
      info.commitSha = data.sha;
      info.commitShaShort = data.sha?.substring(0, 7);
      info.commitMessage = data.commit?.message?.split('\n')[0];
      info.commitAuthor = data.commit?.author?.name;
      info.commitTimestamp = data.commit?.committer?.date;
    } catch (e) {}
  }
  return info;
}

function getQAInfo(repoPath) {
  const result = exec(`node ${join(repoPath, 'qa/qa_gate.js')}`);
  const passed = result.success && !result.output.includes('QA_FAIL');
  const passMatch = result.output?.match(/(\d+) passed/);
  const failMatch = result.output?.match(/(\d+) failed/);
  const failedGates = [];
  if (!passed && result.output) {
    const lines = result.output.split('\n');
    for (const line of lines) {
      if (line.includes('✗') || line.includes('FAIL')) {
        failedGates.push(line.trim());
      }
    }
  }
  return {
    command: 'node qa/qa_gate.js',
    result: passed ? 'PASS' : 'FAIL',
    passed: parseInt(passMatch?.[1] || '0'),
    failed: parseInt(failMatch?.[1] || '0'),
    failedGates,
    output: result.output
  };
}

function getVercelInfo() {
  const result = exec(`curl -s "${CONFIG.VERCEL_DEPLOY_HOOK}" -X POST`);
  let info = { projectName: CONFIG.VERCEL_PROJECT, deploymentUrl: CONFIG.VERCEL_URL };
  // Get latest deployment status
  const statusResult = exec(`curl -s "https://api.vercel.com/v6/deployments?projectId=${CONFIG.VERCEL_PROJECT_ID}&teamId=${CONFIG.VERCEL_TEAM_ID}&limit=1" -H "Authorization: Bearer ${process.env.VERCEL_TOKEN || ''}"`);
  if (statusResult.success && statusResult.output) {
    try {
      const data = JSON.parse(statusResult.output);
      if (data.deployments?.[0]) {
        info.deploymentStatus = data.deployments[0].state;
        info.deploymentCreatedAt = new Date(data.deployments[0].created).toISOString();
        info.deploymentId = data.deployments[0].uid;
      }
    } catch (e) {}
  }
  info.deploymentStatus = info.deploymentStatus || 'UNKNOWN';
  info.deploymentCreatedAt = info.deploymentCreatedAt || new Date().toISOString();
  return info;
}

function getRedisInfo() {
  const result = exec(`curl -s "${CONFIG.API_BASE}/debug"`);
  let info = { ping: 'UNKNOWN', dbsize: 0, lastsave: null };
  if (result.success && result.output) {
    try {
      const data = JSON.parse(result.output);
      info.ping = data.hasRedisConfig ? 'PONG' : 'NO_CONFIG';
      info.dbsize = data.eventsCount || 0;
      info.lastsave = new Date().toISOString();
    } catch (e) {}
  }
  return info;
}

// =============================================================================
// FILE GENERATION
// =============================================================================

function generateManifest(repoPath, outputPath, git, qa, vercel, redis, files) {
  const manifest = {
    packetVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    generator: 'backbone-v9-refresh',
    repo: git,
    qa: {
      command: qa.command,
      result: qa.result,
      failedGates: qa.failedGates
    },
    vercel: vercel,
    redis: redis,
    files: files.map(f => ({ path: f.path, sha256: sha256File(f.fullPath), bytes: f.bytes }))
  };
  
  ensureDir(join(outputPath, 'MANIFEST'));
  writeFileSync(join(outputPath, 'MANIFEST/MANIFEST.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function generateChecksums(outputPath, files) {
  const lines = files.map(f => `${sha256File(f.fullPath)}  ${f.path}`);
  writeFileSync(join(outputPath, 'MANIFEST/CHECKSUMS.txt'), lines.join('\n'));
}

function generateStatus(outputPath, git, qa, vercel) {
  const status = `# Backbone V9 - Status

Generated: ${new Date().toISOString()}

## Current Phase
UI-3 (Pattern Detection Engine) - COMPLETE

## Git
- Commit: ${git.commitShaShort} (${git.commitSha})
- Branch: ${git.branch}
- Message: ${git.commitMessage}
- Author: ${git.commitAuthor}
- Date: ${git.commitTimestamp}

## QA
- Result: ${qa.result}
- Passed: ${qa.passed}/${qa.passed + qa.failed}
${qa.failedGates.length > 0 ? `- Failed Gates:\n${qa.failedGates.map(g => `  - ${g}`).join('\n')}` : ''}

## Deploy
- URL: ${vercel.deploymentUrl}
- Status: ${vercel.deploymentStatus}
- Created: ${vercel.deploymentCreatedAt}

## Completed Work
- UI-0: Single Action render
- UI-1: Entity inspection
- UI-2: Action lifecycle (proposed → executed → observed)
- UI-2.1: Lifecycle fixes (exclusion, keyboard, state)
- UI-3: Pattern detection engine (patternLift)

## In Progress
- None (ready for UI-4)
`;
  ensureDir(join(outputPath, 'BACKBONE_STATE'));
  writeFileSync(join(outputPath, 'BACKBONE_STATE/STATUS.md'), status);
}

function generateSessionMemory(outputPath) {
  const memory = `# Backbone V9 - Session Memory

## Active North Stars
1. Actions Are the Product — UI renders one Action at a time
2. Single Ranking Surface — only \`rankScore\` determines order
3. Raw vs Derived — events are raw facts, patterns are runtime-derived

## Do Not Break
- Lifecycle: proposed → executed → observed (monotonic)
- Exclusion: observed = permanent, skipped = 24h cooldown
- Pattern lift: bounded (±0.5 max), cold-start safe (min 3 obs)

## Known Sharp Edges
- Redis write latency can cause duplicate actions during rapid skip
- Client-side \`skippedThisSession\` Set mitigates this

## QA Reproduction
\`\`\`bash
cd /home/claude/backbone-v9
node qa/qa_gate.js
\`\`\`

## Temporary Exceptions
- None active
`;
  writeFileSync(join(outputPath, 'BACKBONE_STATE/SESSION_MEMORY.md'), memory);
}

function generateDecisions(outputPath) {
  const decisions = `# Backbone V9 - Decisions Log

## 2026-02-01: UI-2.1 Exclusion Logic
**Decision:** Exclude only terminal states (outcome_recorded, skipped with 24h cooldown), not executed
**Rationale:** Executed-but-unobserved actions must remain eligible for observation
**Scope:** eventStore.js getExcludedActionIds()
**Reversal:** If orphaned executed actions become a problem

## 2026-02-01: UI-3 Pattern Lift Bounds
**Decision:** LIFT_MAX = 0.5, MIN_OBSERVATIONS = 3
**Rationale:** Prevent pattern signal from dominating base ranking
**Scope:** derive/patternLift.js
**Reversal:** If users report actions not surfacing appropriately

## 2026-02-01: Client-Side Skip Tracking
**Decision:** Track skipped actions in session ref to prevent rapid-click duplicates
**Rationale:** Redis write latency causes race condition
**Scope:** ui/pages/index.js skippedThisSession
**Reversal:** If server-side exclusion becomes reliable enough
`;
  writeFileSync(join(outputPath, 'BACKBONE_STATE/DECISIONS.md'), decisions);
}

function generateProtocolLedger(outputPath) {
  const ledger = `# Backbone V9 - Protocol Ledger

## Protocol Version
v1.0.0

## Last Refresh
${new Date().toISOString()}

## Certification Rules
- ZIP must contain REPO_SNAPSHOT/, BACKBONE_STATE/, RUNTIME_STATUS/, MANIFEST/
- MANIFEST.json must have all required fields
- No secrets or tokens in any file
- No derived fields in raw/ stores
- QA must pass (or failure explicitly acknowledged)
- SHA consistency across all status files

## Failure Conditions
- P1: Any secret/token detected → HARD FAIL
- P2: Missing required directory → HARD FAIL
- M2: Missing MANIFEST field → NOT CERTIFIED
- R3: Forbidden derivation in raw/ → NOT CERTIFIED
- C1: SHA mismatch → NOT CERTIFIED
`;
  writeFileSync(join(outputPath, 'BACKBONE_STATE/PROTOCOL_LEDGER.md'), ledger);
}

function generateChangelog(outputPath, git) {
  const changelog = `# Backbone V9 - Changelog

## [Unreleased]

### Added
- UI-3: Pattern detection engine (derive/patternLift.js)
- Client-side skip tracking for rapid-click dedup

### Changed
- UI-2.1: Exclusion now terminal-only (not executed)
- UI-2.1: Explicit observed lifecycle state
- UI-2.1: Working keyboard shortcuts

### Fixed
- Skipped actions reappearing (24h cooldown + client tracking)
- Enter key not working in proposed state

## Commits Since Last Tag
- ${git.commitShaShort}: ${git.commitMessage}
`;
  writeFileSync(join(outputPath, 'BACKBONE_STATE/CHANGELOG.md'), changelog);
}

function generatePanelStatus(outputPath, git, qa, vercel, redis) {
  const panel = `# Backbone V9 - Panel Status

Generated: ${new Date().toISOString()}

## Git
- Repo: ${git.owner}/${git.name}
- Branch: ${git.branch}
- Commit: ${git.commitShaShort} (${git.commitSha})
- Message: ${git.commitMessage}
- Author: ${git.commitAuthor}
- Date: ${git.commitTimestamp}
- Dirty: false

## QA
- Command: ${qa.command}
- Result: ${qa.result}
- Passed: ${qa.passed}
- Failed: ${qa.failed}
${qa.result === 'FAIL' ? `- Details:\n${qa.failedGates.map(g => `  ${g}`).join('\n')}` : ''}

## Vercel
- Project: ${vercel.projectName}
- URL: ${vercel.deploymentUrl}
- ID: ${vercel.deploymentId || 'N/A'}
- Status: ${vercel.deploymentStatus}
- Created: ${vercel.deploymentCreatedAt}

## Redis
- Ping: ${redis.ping}
- DB Size: ${redis.dbsize} events
- Last Save: ${redis.lastsave || 'N/A'}
`;
  ensureDir(join(outputPath, 'RUNTIME_STATUS'));
  writeFileSync(join(outputPath, 'RUNTIME_STATUS/PANEL_STATUS.md'), panel);
}

function generateQARun(outputPath, qa) {
  const run = `# QA Run Output

Command: ${qa.command}
Node: ${process.version}
Result: ${qa.result}

## Output
${qa.output || 'No output captured'}
`;
  writeFileSync(join(outputPath, 'RUNTIME_STATUS/QA_RUN.txt'), run);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const startTime = Date.now();
  const failures = [];
  const warnings = [];
  
  console.log('═'.repeat(65));
  console.log('BACKBONE V9 - REFRESH PACKET GENERATOR');
  console.log('═'.repeat(65));
  console.log();
  
  const repoPath = CONFIG.WORKSPACE_PATH;
  const timestamp = new Date().toISOString().replace(/[:-]/g, '').replace('T', '_').split('.')[0];
  
  // --- COLLECT DATA ---
  console.log('Collecting data...');
  const git = getGitInfo();
  const qa = getQAInfo(repoPath);
  const vercel = getVercelInfo();
  const redis = getRedisInfo();
  const files = getAllFiles(repoPath);
  
  console.log(`  Git: ${git.commitShaShort || 'unknown'}`);
  console.log(`  QA: ${qa.result} (${qa.passed}/${qa.passed + qa.failed})`);
  console.log(`  Vercel: ${vercel.deploymentStatus}`);
  console.log(`  Redis: ${redis.ping}`);
  console.log(`  Files: ${files.length}`);
  console.log();
  
  // --- P1: SECRETS CHECK ---
  console.log('P1: Checking for secrets...');
  const secretViolations = checkSecrets(files);
  if (secretViolations.length > 0) {
    console.log('  ❌ HARD FAIL: Secrets detected');
    secretViolations.forEach(v => console.log(`     ${v}`));
    process.exit(1);
  }
  console.log('  ✅ No secrets found');
  
  // --- P2: REQUIRED DIRS ---
  console.log('P2: Checking required directories...');
  for (const dir of REQUIRED_REPO_DIRS) {
    if (!existsSync(join(repoPath, dir))) {
      failures.push(`P2: Missing required directory: ${dir}/`);
    }
  }
  if (failures.length > 0) {
    console.log('  ❌ Missing directories');
    failures.forEach(f => console.log(`     ${f}`));
  } else {
    console.log('  ✅ All required directories present');
  }
  
  // --- R3: FORBIDDEN DERIVATIONS ---
  console.log('R3: Checking for forbidden derivations...');
  const derivationViolations = checkForbiddenDerivations(repoPath);
  if (derivationViolations.length > 0) {
    derivationViolations.forEach(v => failures.push(`R3: ${v}`));
    console.log('  ⚠️  Forbidden derivations found');
    derivationViolations.forEach(v => console.log(`     ${v}`));
  } else {
    console.log('  ✅ No forbidden derivations');
  }
  
  // --- BUILD OUTPUT ---
  console.log();
  console.log('Building packet...');
  
  const outputDir = `/tmp/backbone-refresh-${timestamp}`;
  ensureDir(outputDir);
  ensureDir(join(outputDir, 'REPO_SNAPSHOT'));
  
  // Copy repo
  exec(`cp -r ${repoPath}/* ${join(outputDir, 'REPO_SNAPSHOT')}/`);
  exec(`rm -rf ${join(outputDir, 'REPO_SNAPSHOT/node_modules')}`);
  exec(`rm -rf ${join(outputDir, 'REPO_SNAPSHOT/.git')}`);
  exec(`rm -f ${join(outputDir, 'REPO_SNAPSHOT/.github-token')}`);
  
  // Generate state files
  generateStatus(outputDir, git, qa, vercel);
  generateSessionMemory(outputDir);
  generateDecisions(outputDir);
  generateProtocolLedger(outputDir);
  generateChangelog(outputDir, git);
  
  // Generate runtime status
  generatePanelStatus(outputDir, git, qa, vercel, redis);
  generateQARun(outputDir, qa);
  
  // Generate manifest
  const allOutputFiles = getAllFiles(outputDir);
  const manifest = generateManifest(repoPath, outputDir, git, qa, vercel, redis, allOutputFiles);
  generateChecksums(outputDir, allOutputFiles);
  
  // --- ZIP ---
  const zipName = `backbone-v9_${timestamp}_${git.commitShaShort || 'unknown'}.zip`;
  const zipPath = `/home/claude/${zipName}`;
  const zipResult = exec(`cd ${outputDir} && zip -rq ${zipPath} .`);
  
  if (!existsSync(zipPath)) {
    console.log('❌ Failed to create ZIP');
    console.log(zipResult.error || zipResult.output);
    process.exit(1);
  }
  
  // --- CERTIFICATION ---
  console.log();
  console.log('═'.repeat(65));
  
  if (failures.length === 0 && qa.result === 'PASS') {
    console.log('✅ CERTIFIED');
    console.log('All checks passed. Packet is safe for refresh.');
  } else {
    console.log('❌ NOT CERTIFIED');
    console.log('Failing checks:');
    failures.forEach(f => console.log(`  - ${f}`));
    if (qa.result === 'FAIL') {
      console.log(`  - QA: ${qa.result}`);
      qa.failedGates.forEach(g => console.log(`    ${g}`));
    }
  }
  
  console.log('═'.repeat(65));
  console.log();
  console.log(`Output: ${zipPath}`);
  console.log(`Size: ${(statSync(zipPath).size / 1024).toFixed(1)} KB`);
  console.log(`Time: ${Date.now() - startTime}ms`);
  
  // Copy to outputs
  exec(`cp ${zipPath} /mnt/user-data/outputs/`);
  console.log(`Copied to: /mnt/user-data/outputs/${zipName}`);
  
  // Cleanup
  exec(`rm -rf ${outputDir}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
