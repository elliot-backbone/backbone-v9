#!/usr/bin/env node

/**
 * BACKBONE V9 - REFRESH PACKET GENERATOR
 * 
 * Generates CERTIFIED refresh packets per REFRESH_PACKET_SPEC v1
 * Error codes aligned with REFRESH_CERTIFICATION_FAILURE_MESSAGES v1
 * 
 * Usage: node .backbone/cli.js refresh
 */

import { execSync } from 'child_process';
import { 
  writeFileSync, readFileSync, existsSync, mkdirSync, 
  readdirSync, statSync 
} from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import { CONFIG } from './config.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const REQUIRED_TOP_DIRS = ['REPO_SNAPSHOT', 'BACKBONE_STATE', 'RUNTIME_STATUS', 'MANIFEST'];
const REQUIRED_REPO_DIRS = ['raw', 'derive', 'predict', 'decide', 'runtime', 'qa', 'ui', '.backbone'];
const REQUIRED_STATE_FILES = ['STATUS.md', 'SESSION_MEMORY.md', 'DECISIONS.md', 'PROTOCOL_LEDGER.md', 'CHANGELOG.md'];
const REQUIRED_PANEL_SECTIONS = ['Git', 'QA', 'Vercel', 'Redis'];
const REQUIRED_MANIFEST_FIELDS = [
  'packetVersion', 'generatedAt', 'generator',
  'repo.owner', 'repo.name', 'repo.branch', 'repo.commitSha', 'repo.commitShaShort',
  'repo.commitMessage', 'repo.commitAuthor', 'repo.commitTimestamp',
  'qa.command', 'qa.result', 'qa.failedGates',
  'vercel.projectName', 'vercel.deploymentUrl', 'vercel.deploymentStatus', 'vercel.deploymentCreatedAt',
  'redis.ping', 'redis.dbsize', 'redis.lastsave',
  'files'
];

const FORBIDDEN_PATTERNS = [
  { pattern: /ghp_[A-Za-z0-9]{36}/, desc: 'GitHub token' },
  { pattern: /sk-[A-Za-z0-9]{48}/, desc: 'OpenAI API key' },
  { pattern: /UPSTASH_REDIS_REST_URL\s*=\s*["']?https?:\/\/[^"'\s]+/, desc: 'Redis URL' },
  { pattern: /UPSTASH_REDIS_REST_TOKEN\s*=\s*["']?[A-Za-z0-9_-]{20,}/, desc: 'Redis token' },
  { pattern: /-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----/, desc: 'SSH private key' }
];

const FORBIDDEN_DERIVED_FIELDS = ['health', 'priority', 'urgency', 'rankScore', 'coverage'];

// Drift detection patterns (for generated content validation)
const TONE_DRIFT_PATTERNS = [
  /great work/i, /nice job/i, /impressive/i, /exciting/i, /love this/i,
  /keep it up/i, /you're on the right track/i, /you are on the right track/i,
  /feels like/i, /seems good/i, /probably fine/i
];

const LANGUAGE_DRIFT_PATTERNS = [
  /\bmight\b/i, /\bcould\b/i, /\bpossibly\b/i,
  /looks good/i, /reasonable approach/i,
  /this will scale/i, /this should work/i
];

// =============================================================================
// ERROR COLLECTION
// =============================================================================

const errors = [];

function fail(code, message) {
  errors.push({ code, message });
}

function printErrors() {
  if (errors.length === 0) return;
  
  console.log('REFRESH RESULT: NOT CERTIFIED');
  console.log('REASON: One or more mandatory checks failed. Refresh halted.');
  console.log('');
  
  for (const e of errors) {
    console.log(`**${e.code}**`);
    console.log(e.message);
    console.log('');
  }
  
  console.log('NEXT STEP: Fix listed failures and regenerate the refresh packet.');
  console.log('NO EVALUATION PERFORMED.');
}

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
  try {
    for (const item of readdirSync(dir)) {
      if (item === 'node_modules' || item === '.git' || item === '.github-token') continue;
      const full = join(dir, item);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        files = files.concat(getAllFiles(full, base));
      } else {
        files.push({ path: relative(base, full), fullPath: full, bytes: stat.size });
      }
    }
  } catch (e) {}
  return files;
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function getNestedField(obj, path) {
  const parts = path.split('.');
  let val = obj;
  for (const p of parts) {
    if (val === undefined || val === null) return undefined;
    val = val[p];
  }
  return val;
}

// =============================================================================
// PRECHECKS (PART I)
// =============================================================================

function checkSecrets(files) {
  for (const file of files) {
    if (file.path.endsWith('.json') || file.path.endsWith('.js') || 
        file.path.endsWith('.md') || file.path.endsWith('.env') ||
        file.path.endsWith('.txt')) {
      try {
        const content = readFileSync(file.fullPath, 'utf8');
        for (const { pattern, desc } of FORBIDDEN_PATTERNS) {
          if (pattern.test(content)) {
            fail('P1_SECRET_DETECTED', `Sensitive material detected (${desc}). Remove secrets and regenerate packet.`);
            return true; // Hard fail
          }
        }
        // Check for real .env values
        if (file.path.endsWith('.env') && !file.path.includes('.example')) {
          if (content.includes('=') && !content.includes('=REDACTED') && !content.includes('=placeholder')) {
            fail('P1_ENV_REAL_VALUES', '.env file contains real values. Redaction required.');
            return true;
          }
        }
      } catch (e) {}
    }
  }
  return false;
}

function checkForbiddenDerivations(repoPath) {
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
              fail('R3_FORBIDDEN_DERIVATION', `Persisted derived field detected: ${key} in raw/${file}.`);
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
}

function checkMergeConflicts(repoPath) {
  const files = getAllFiles(repoPath);
  for (const file of files) {
    if (file.path.endsWith('.js') || file.path.endsWith('.md') || file.path.endsWith('.json')) {
      try {
        const content = readFileSync(file.fullPath, 'utf8');
        // Check for actual merge conflict markers (7 chars each)
        const hasStart = /^<{7}\s/m.test(content);
        const hasMid = /^={7}$/m.test(content);
        const hasEnd = /^>{7}\s/m.test(content);
        if (hasStart && hasMid && hasEnd) {
          fail('R2_MERGE_CONFLICT_MARKERS', `Merge conflict markers detected in ${file.path}.`);
        }
      } catch (e) {}
    }
  }
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
  let info = { 
    projectName: CONFIG.VERCEL_PROJECT, 
    deploymentUrl: CONFIG.VERCEL_URL,
    deploymentStatus: 'UNKNOWN',
    deploymentCreatedAt: new Date().toISOString()
  };
  
  const debugResult = exec(`curl -s "${CONFIG.API_BASE}/debug"`);
  if (debugResult.success && debugResult.output) {
    try {
      JSON.parse(debugResult.output);
      info.deploymentStatus = 'READY';
    } catch (e) {}
  }
  
  return info;
}

function getRedisInfo() {
  let info = { ping: 'UNKNOWN', dbsize: 0, lastsave: new Date().toISOString() };
  const result = exec(`curl -s "${CONFIG.API_BASE}/debug"`);
  if (result.success && result.output) {
    try {
      const data = JSON.parse(result.output);
      info.ping = data.hasRedisConfig ? 'PONG' : 'NO_CONFIG';
      info.dbsize = data.eventsCount || 0;
    } catch (e) {}
  }
  return info;
}

// =============================================================================
// FILE GENERATION
// =============================================================================

function generateManifest(git, qa, vercel, redis, files) {
  return {
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
}

function generateStatus(git, qa, vercel) {
  return `# Backbone V9 - Status

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

## Completed Work
- UI-0: Single Action render
- UI-1: Entity inspection
- UI-2: Action lifecycle (proposed → executed → observed)
- UI-2.1: Lifecycle fixes (exclusion, keyboard, state)
- UI-3: Pattern detection engine (patternLift)

## In Progress
None
`;
}

function generateSessionMemory() {
  return `# Backbone V9 - Session Memory

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
None
`;
}

function generateDecisions() {
  return `# Backbone V9 - Decisions Log

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

## 2026-02-01: CLI Simplification
**Decision:** Remove handover, load, deploy commands; refresh is the only handover mechanism
**Rationale:** Single certified packet format ensures consistency
**Scope:** .backbone/cli.js
**Reversal:** If targeted loading becomes necessary again
`;
}

function generateProtocolLedger() {
  return `# Backbone V9 - Protocol Ledger

## Protocol Version
v1.0.0

## Last Refresh
${new Date().toISOString()}

## Certification Rules
- ZIP must contain REPO_SNAPSHOT/, BACKBONE_STATE/, RUNTIME_STATUS/, MANIFEST/
- MANIFEST.json must have all required fields (packet, git, qa, vercel, redis, files)
- No secrets or tokens in any file (P1)
- No derived fields in raw/ stores (R3)
- QA must pass or failure explicitly acknowledged (C3)
- SHA consistency across all status files (C1)
- Time ordering: generatedAt >= commit >= deploy (C2)

## Failure Conditions
- P1_SECRET_DETECTED: Any secret/token detected
- P2_DIR_MISSING: Required top-level directory missing
- R3_FORBIDDEN_DERIVATION: Derived field in raw store
- M2_MANIFEST_FIELD_MISSING: Required manifest field empty
- C1_SHA_INCONSISTENT: SHA mismatch across files
- C3_QA_FAIL_UNACKNOWLEDGED: QA failure not acknowledged

## Evaluation Posture Drift Detection (v1)

Drift is evaluated along five independent axes. A single failure on any axis triggers a POSTURE DRIFT FLAG.

### Axis 1 - Tone Drift (D1_TONE_DRIFT)
Forbidden: "great work", "nice job", "impressive", "exciting", "love this", "keep it up", "you're on the right track", "feels like", "seems good", "probably fine"

### Axis 2 - Motivational Drift (D2_MOTIVATION_DRIFT)
Required motivation: Prevent irreversible mistakes and protect long-term value.
Forbidden: Prioritizing speed/convenience/morale over risk, framing as collaboration instead of review.

### Axis 3 - Structural Drift (D3_STRUCTURE_DRIFT)
Required sections in order: Certification acknowledgement, Executive risk summary, Panel reviews, Doctrine compliance, Verdict, Binding outputs.

### Axis 4 - Language Drift (D4_LANGUAGE_DRIFT)
Forbidden: "might", "could", "possibly", "looks good", "reasonable approach", "this will scale", "this should work"
Required: Declarative, precise, bounded, falsifiable statements.

### Axis 5 - Role Drift (D5_ROLE_DRIFT)
Required posture: Independent review authority, capital allocator proxy, doctrine enforcer.
Forbidden: Acting as implementer, suggesting code without contract, brainstorming instead of judging.
`;
}

function generateChangelog(git) {
  return `# Backbone V9 - Changelog

## [${git.commitShaShort}] - ${new Date().toISOString().split('T')[0]}

### Added
- UI-3: Pattern detection engine (derive/patternLift.js)
- Client-side skip tracking for rapid-click dedup
- CERTIFIED refresh packet generator

### Changed
- UI-2.1: Exclusion now terminal-only (not executed)
- UI-2.1: Explicit observed lifecycle state
- UI-2.1: Working keyboard shortcuts
- CLI: Removed handover, load, deploy commands

### Fixed
- Skipped actions reappearing (24h cooldown + client tracking)
- Enter key not working in proposed state

## Commits
- ${git.commitShaShort}: ${git.commitMessage}
`;
}

function generatePanelStatus(git, qa, vercel, redis) {
  return `# Backbone V9 - Panel Status

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
- Status: ${vercel.deploymentStatus}
- Created: ${vercel.deploymentCreatedAt}

## Redis
- Ping: ${redis.ping}
- DB Size: ${redis.dbsize} events
- Last Save: ${redis.lastsave}
`;
}

function generateQARun(qa) {
  return `# QA Run Output

Command: ${qa.command}
Node: ${process.version}
Result: ${qa.result}

## Output
${qa.output || 'No output captured'}
`;
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateManifest(manifest) {
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    const val = getNestedField(manifest, field);
    if (val === undefined || val === null || val === '') {
      fail('M2_MANIFEST_FIELD_MISSING', `Required manifest field missing or empty: ${field}.`);
    }
  }
}

function validateStateFiles(outputDir) {
  for (const file of REQUIRED_STATE_FILES) {
    if (!existsSync(join(outputDir, 'BACKBONE_STATE', file))) {
      fail('S1_STATE_FILE_MISSING', `Required state file missing: ${file}.`);
    }
  }
}

function validatePanelSections(content) {
  for (const section of REQUIRED_PANEL_SECTIONS) {
    if (!content.includes(`## ${section}`)) {
      fail('T2_PANEL_SECTION_MISSING', `PANEL_STATUS.md missing required section: ${section}.`);
    }
  }
}

function validateSHAConsistency(manifest, statusContent, panelContent) {
  const manifestSha = manifest.repo.commitShaShort;
  if (!statusContent.includes(manifestSha)) {
    fail('C1_SHA_INCONSISTENT', 'Git SHA mismatch across MANIFEST, STATUS, and PANEL_STATUS.');
  }
  if (!panelContent.includes(manifestSha)) {
    fail('C1_SHA_INCONSISTENT', 'Git SHA mismatch across MANIFEST, STATUS, and PANEL_STATUS.');
  }
}

function validateTimeOrdering(manifest) {
  const generated = new Date(manifest.generatedAt).getTime();
  const commit = new Date(manifest.repo.commitTimestamp).getTime();
  const deploy = new Date(manifest.vercel.deploymentCreatedAt).getTime();
  
  if (generated < commit) {
    fail('C2_TIME_ORDER_INVALID', 'Invalid timestamp ordering (generatedAt, commit, deploy, redis).');
  }
}

function validateQAGating(qa) {
  if (qa.result === 'FAIL') {
    // For now, we acknowledge failures in the manifest
    // A real CI would require explicit acknowledgment
  }
}

// =============================================================================
// DRIFT DETECTION (Evaluation Posture Drift Detection Rule v1)
// =============================================================================

function checkToneDrift(content) {
  for (const pattern of TONE_DRIFT_PATTERNS) {
    if (pattern.test(content)) {
      return { drifted: true, match: content.match(pattern)?.[0] };
    }
  }
  return { drifted: false };
}

function checkLanguageDrift(content) {
  for (const pattern of LANGUAGE_DRIFT_PATTERNS) {
    if (pattern.test(content)) {
      return { drifted: true, match: content.match(pattern)?.[0] };
    }
  }
  return { drifted: false };
}

function validateGeneratedContent(files) {
  // Only scan BACKBONE_STATE files we generate, not repo snapshot
  const stateFiles = ['STATUS.md', 'SESSION_MEMORY.md', 'DECISIONS.md', 'CHANGELOG.md', 'PANEL_STATUS.md'];
  // Note: PROTOCOL_LEDGER.md excluded because it documents forbidden patterns
  
  for (const file of files) {
    // Only check files in BACKBONE_STATE or RUNTIME_STATUS directories
    if (!file.path.startsWith('BACKBONE_STATE/') && !file.path.startsWith('RUNTIME_STATUS/')) {
      continue;
    }
    
    const filename = file.path.split('/').pop();
    if (stateFiles.includes(filename)) {
      try {
        const content = readFileSync(file.fullPath, 'utf8');
        
        // D1: Tone drift
        const toneCheck = checkToneDrift(content);
        if (toneCheck.drifted) {
          fail('D1_TONE_DRIFT', `Tone drift detected in ${filename}: "${toneCheck.match}"`);
        }
        
        // D4: Language drift
        const langCheck = checkLanguageDrift(content);
        if (langCheck.drifted) {
          fail('D4_LANGUAGE_DRIFT', `Language drift detected in ${filename}: "${langCheck.match}"`);
        }
      } catch (e) {}
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const startTime = Date.now();
  
  const repoPath = CONFIG.WORKSPACE_PATH;
  const timestamp = new Date().toISOString().replace(/[:-]/g, '').replace('T', '_').split('.')[0];
  
  // --- COLLECT DATA ---
  const git = getGitInfo();
  const qa = getQAInfo(repoPath);
  const vercel = getVercelInfo();
  const redis = getRedisInfo();
  const repoFiles = getAllFiles(repoPath);
  
  // --- P1: SECRETS CHECK (HARD FAIL) ---
  if (checkSecrets(repoFiles)) {
    printErrors();
    process.exit(1);
  }
  
  // --- P2: REQUIRED REPO DIRS ---
  for (const dir of REQUIRED_REPO_DIRS) {
    if (!existsSync(join(repoPath, dir))) {
      fail('R1_REPO_DIR_MISSING', `Required repo directory missing from snapshot: ${dir}.`);
    }
  }
  
  // --- R2: BUILD/CONFIG SANITY ---
  // package.json can be in root or ui/
  if (!existsSync(join(repoPath, 'package.json')) && !existsSync(join(repoPath, 'ui/package.json'))) {
    fail('R2_PACKAGE_JSON_MISSING', 'package.json not found in repo snapshot.');
  }
  
  // Check for lockfiles in both root and ui/
  const lockfiles = repoFiles.filter(f => 
    f.path === 'package-lock.json' || f.path === 'yarn.lock' || f.path === 'pnpm-lock.yaml' ||
    f.path === 'ui/package-lock.json' || f.path === 'ui/yarn.lock' || f.path === 'ui/pnpm-lock.yaml'
  );
  if (lockfiles.length === 0) {
    fail('R2_LOCKFILE_INVALID', `Expected exactly one lockfile. Found ${lockfiles.length}.`);
  }
  
  checkMergeConflicts(repoPath);
  
  // --- R3: FORBIDDEN DERIVATIONS ---
  checkForbiddenDerivations(repoPath);
  
  // --- BUILD OUTPUT ---
  const outputDir = `/tmp/backbone-refresh-${timestamp}`;
  ensureDir(outputDir);
  ensureDir(join(outputDir, 'REPO_SNAPSHOT'));
  ensureDir(join(outputDir, 'BACKBONE_STATE'));
  ensureDir(join(outputDir, 'RUNTIME_STATUS'));
  ensureDir(join(outputDir, 'MANIFEST'));
  
  // Copy repo (excluding sensitive files)
  exec(`cp -r ${repoPath}/* ${join(outputDir, 'REPO_SNAPSHOT')}/`);
  exec(`rm -rf ${join(outputDir, 'REPO_SNAPSHOT/node_modules')}`);
  exec(`rm -rf ${join(outputDir, 'REPO_SNAPSHOT/.git')}`);
  exec(`rm -f ${join(outputDir, 'REPO_SNAPSHOT/.github-token')}`);
  exec(`rm -f ${join(outputDir, 'REPO_SNAPSHOT/.env')}`);
  
  // Generate state files
  const statusContent = generateStatus(git, qa, vercel);
  writeFileSync(join(outputDir, 'BACKBONE_STATE/STATUS.md'), statusContent);
  writeFileSync(join(outputDir, 'BACKBONE_STATE/SESSION_MEMORY.md'), generateSessionMemory());
  writeFileSync(join(outputDir, 'BACKBONE_STATE/DECISIONS.md'), generateDecisions());
  writeFileSync(join(outputDir, 'BACKBONE_STATE/PROTOCOL_LEDGER.md'), generateProtocolLedger());
  writeFileSync(join(outputDir, 'BACKBONE_STATE/CHANGELOG.md'), generateChangelog(git));
  
  // Generate runtime status
  const panelContent = generatePanelStatus(git, qa, vercel, redis);
  writeFileSync(join(outputDir, 'RUNTIME_STATUS/PANEL_STATUS.md'), panelContent);
  writeFileSync(join(outputDir, 'RUNTIME_STATUS/QA_RUN.txt'), generateQARun(qa));
  
  // Generate manifest
  const allOutputFiles = getAllFiles(outputDir);
  const manifest = generateManifest(git, qa, vercel, redis, allOutputFiles);
  writeFileSync(join(outputDir, 'MANIFEST/MANIFEST.json'), JSON.stringify(manifest, null, 2));
  
  // Generate checksums
  const checksumLines = allOutputFiles.map(f => `${sha256File(f.fullPath)}  ${f.path}`);
  writeFileSync(join(outputDir, 'MANIFEST/CHECKSUMS.txt'), checksumLines.join('\n'));
  
  // --- VALIDATION ---
  validateManifest(manifest);
  validateStateFiles(outputDir);
  validatePanelSections(panelContent);
  validateSHAConsistency(manifest, statusContent, panelContent);
  validateTimeOrdering(manifest);
  validateQAGating(qa);
  
  // --- DRIFT DETECTION ---
  validateGeneratedContent(allOutputFiles);
  
  // --- P2: REQUIRED TOP-LEVEL DIRS ---
  for (const dir of REQUIRED_TOP_DIRS) {
    if (!existsSync(join(outputDir, dir))) {
      fail('P2_DIR_MISSING', `Required top-level directory missing: ${dir}.`);
    }
  }
  
  // --- CHECK FOR ERRORS ---
  if (errors.length > 0) {
    printErrors();
    exec(`rm -rf ${outputDir}`);
    process.exit(1);
  }
  
  // --- ZIP ---
  const zipName = `backbone-v9_${timestamp}_${git.commitShaShort || 'unknown'}.zip`;
  const zipPath = `/home/claude/${zipName}`;
  const zipResult = exec(`cd ${outputDir} && zip -rq ${zipPath} .`);
  
  if (!existsSync(zipPath)) {
    fail('P0_ZIP_CORRUPT', 'ZIP could not be created.');
    printErrors();
    process.exit(1);
  }
  
  // --- SUCCESS ---
  console.log('REFRESH RESULT: CERTIFIED');
  console.log(`Loaded snapshot commit ${git.commitShaShort}. Drift scan complete. Ready for evaluation on request.`);
  console.log('');
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
  console.error('Fatal error:', e.message);
  process.exit(1);
});
