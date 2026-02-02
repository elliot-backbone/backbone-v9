#!/usr/bin/env node

/**
 * BACKBONE V9 - CLI TOOLS
 */

import { execSync } from 'child_process';
import { writeFileSync, readdirSync, statSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname, basename } from 'path';
import { CONFIG, getCommitURL } from './config.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_FILE_SIZE_KB = 500; // GitHub API limit ~1MB, stay well under
const CHUNK_DIR = '.backbone/chunks';

// =============================================================================
// QA TEST DEFINITIONS (for detailed pull output)
// =============================================================================

const QA_TESTS = [
  { id: 1, name: 'Layer imports', checks: 'raw/, derive/, predict/, decide/, runtime/, qa/' },
  { id: 2, name: 'No stored derivations', checks: 'raw/*.json schema validation' },
  { id: 3, name: 'DAG integrity', checks: 'runtime/graph.js cycle detection' },
  { id: 4, name: 'Actions have rankScore', checks: 'decide/ranking.js output' },
  { id: 5, name: 'Single ranking surface', checks: 'decide/*.js, ui/decide/*.js' },
  { id: 6, name: 'Append-only events', checks: 'raw/actionEvents.json structure' }
];

// =============================================================================
// GITHUB API HELPERS
// =============================================================================

async function githubPush(filePath, commitMessage) {
  const token = process.env.GITHUB_TOKEN || readGitHubToken();
  if (!token) {
    return { success: false, error: 'No GitHub token. Set GITHUB_TOKEN env var or store in .github-token' };
  }
  
  const content = readFileSync(filePath, 'utf8');
  const base64Content = Buffer.from(content).toString('base64');
  
  const getUrl = `https://api.github.com/repos/elliot-backbone/backbone-v9/contents/${filePath}`;
  const getResult = exec(`curl -s -H "Authorization: token ${token}" "${getUrl}"`, true);
  
  let sha = null;
  if (getResult.success && getResult.output) {
    try {
      const data = JSON.parse(getResult.output);
      sha = data.sha;
    } catch (e) {}
  }
  
  const body = JSON.stringify({
    message: commitMessage,
    content: base64Content,
    ...(sha && { sha })
  });
  
  const putResult = exec(`curl -s -X PUT -H "Authorization: token ${token}" -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}' "${getUrl}"`, true);
  
  if (putResult.success && putResult.output) {
    try {
      const data = JSON.parse(putResult.output);
      if (data.commit) {
        return { success: true, sha: data.commit.sha.substring(0, 7) };
      }
    } catch (e) {}
  }
  
  return { success: false, error: putResult.output || 'Push failed' };
}

/**
 * Split large JSON file into chunks for GitHub API push
 * Returns array of chunk file paths
 */
function splitJsonForPush(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const sizeKB = Buffer.byteLength(content) / 1024;
  
  if (sizeKB <= MAX_FILE_SIZE_KB) {
    return null; // No splitting needed
  }
  
  const data = JSON.parse(content);
  const baseName = basename(filePath, '.json');
  const targetDir = filePath.includes('ui/') ? 'ui/raw/chunks' : 'raw/chunks';
  
  // Ensure chunk directory exists
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  
  const chunks = [];
  const manifest = {
    source: filePath,
    baseName,
    generatedAt: new Date().toISOString(),
    chunks: [],
  };
  
  // Split each top-level array into chunks
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 0) {
      // Calculate items per chunk to stay under size limit
      const itemSize = JSON.stringify(value[0]).length;
      const itemsPerChunk = Math.floor((MAX_FILE_SIZE_KB * 1024 * 0.8) / itemSize);
      
      for (let i = 0; i < value.length; i += itemsPerChunk) {
        const chunkData = value.slice(i, i + itemsPerChunk);
        const chunkIndex = Math.floor(i / itemsPerChunk);
        const chunkName = `${baseName}_${key}_${chunkIndex}.json`;
        const chunkPath = join(targetDir, chunkName);
        
        writeFileSync(chunkPath, JSON.stringify(chunkData));
        chunks.push(chunkPath);
        manifest.chunks.push({
          key,
          index: chunkIndex,
          file: chunkName,
          count: chunkData.length,
        });
      }
    } else if (!Array.isArray(value)) {
      // Non-array values go in manifest
      manifest[key] = value;
    }
  }
  
  // Write manifest
  const manifestPath = join(targetDir, `${baseName}_manifest.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  chunks.unshift(manifestPath);
  
  return chunks;
}

/**
 * Reassemble chunks back into original file (for loading)
 */
function reassembleFromChunks(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const chunkDir = dirname(manifestPath);
  
  const data = {};
  
  // Copy non-chunk data from manifest
  for (const [key, value] of Object.entries(manifest)) {
    if (!['source', 'baseName', 'generatedAt', 'chunks'].includes(key)) {
      data[key] = value;
    }
  }
  
  // Reassemble arrays from chunks
  const arrayData = {};
  for (const chunk of manifest.chunks) {
    const chunkPath = join(chunkDir, chunk.file);
    const chunkData = JSON.parse(readFileSync(chunkPath, 'utf8'));
    
    if (!arrayData[chunk.key]) {
      arrayData[chunk.key] = [];
    }
    arrayData[chunk.key].push(...chunkData);
  }
  
  // Merge arrays into data
  Object.assign(data, arrayData);
  
  return data;
}

/**
 * Push large JSON file by splitting into chunks
 */
async function pushLargeJson(filePath, commitMessage) {
  const chunks = splitJsonForPush(filePath);
  
  if (!chunks) {
    // File small enough, use normal push
    return await githubPush(filePath, commitMessage);
  }
  
  console.log(`  Splitting ${filePath} into ${chunks.length} chunks...`);
  
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = chunks[i];
    const chunkMsg = i === 0 
      ? `${commitMessage} (manifest)` 
      : `${commitMessage} (chunk ${i}/${chunks.length - 1})`;
    
    process.stdout.write(`  Pushing chunk ${i + 1}/${chunks.length}...`);
    const result = await githubPush(chunkPath, chunkMsg);
    
    if (result.success) {
      console.log(` ✅ ${result.sha}`);
      results.push(result);
    } else {
      console.log(` ❌`);
      return { success: false, error: `Chunk ${i + 1} failed: ${result.error}` };
    }
  }
  
  return { success: true, sha: results[results.length - 1].sha, chunked: true, chunkCount: chunks.length };
}

function readGitHubToken() {
  const tokenPath = join(process.cwd(), '.github-token');
  if (existsSync(tokenPath)) {
    return readFileSync(tokenPath, 'utf8').trim();
  }
  return null;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function exec(cmd, silent = false) {
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return { success: true, output: output || '' };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

function countFiles(dir = '.', extensions = ['.js', '.md']) {
  let count = 0;
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      if (item === 'node_modules' || item === '.git') continue;
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        count += countFiles(fullPath, extensions);
      } else if (extensions.some(ext => item.endsWith(ext))) {
        count++;
      }
    }
  } catch (e) {}
  return count;
}

function countLines(dir = '.') {
  const result = exec(`find ${dir} -type f \\( -name "*.js" -o -name "*.md" \\) ! -path "*/node_modules/*" ! -path "*/.git/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}'`, true);
  return parseInt(result.output?.trim() || '0');
}

function getCommitShort() {
  const result = exec('git rev-parse HEAD 2>/dev/null', true);
  return result.success && result.output ? result.output.trim().substring(0, 7) : 'unknown';
}

function getGitInfoFromAPI() {
  const apiResult = exec(`curl -s "https://api.github.com/repos/${CONFIG.GITHUB_ORG}/${CONFIG.GITHUB_PROJECT}/commits/${CONFIG.DEFAULT_BRANCH}"`, true);
  
  let commitFull = null;
  let commitShort = 'unknown';
  let commitDate = null;
  let commitMessage = null;
  const branch = CONFIG.DEFAULT_BRANCH;
  
  if (apiResult.success && apiResult.output) {
    try {
      const data = JSON.parse(apiResult.output);
      commitFull = data.sha;
      commitShort = commitFull ? commitFull.substring(0, 7) : 'unknown';
      commitDate = data.commit?.committer?.date;
      commitMessage = data.commit?.message?.split('\n')[0];
      if (commitDate) {
        commitDate = new Date(commitDate).toISOString().replace('T', ' ').replace('Z', ' UTC');
      }
    } catch (e) {}
  }
  
  return { commitFull, commitShort, branch, commitDate, commitMessage };
}

function buildFileTree(dir, prefix = '', depth = 0, maxDepth = 1) {
  if (depth > maxDepth) return [];
  const lines = [];
  
  try {
    const items = readdirSync(dir).filter(f => 
      !f.startsWith('.') && f !== 'node_modules' && f !== 'package-lock.json'
    ).sort((a, b) => {
      const aIsDir = statSync(join(dir, a)).isDirectory();
      const bIsDir = statSync(join(dir, b)).isDirectory();
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isLast = i === items.length - 1;
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      const connector = isLast ? '└── ' : '├── ';
      
      if (stat.isDirectory()) {
        lines.push(`${prefix}${connector}${item}/`);
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        lines.push(...buildFileTree(fullPath, childPrefix, depth + 1, maxDepth));
      } else if (depth < maxDepth) {
        lines.push(`${prefix}${connector}${item}`);
      }
    }
  } catch (e) {}
  
  return lines;
}

function countByDir(rootDir) {
  const counts = {};
  for (const d of CONFIG.DIRECTORIES) {
    const dirPath = join(rootDir, d.path);
    try {
      const files = readdirSync(dirPath).filter(f => f.endsWith('.js') || f.endsWith('.json'));
      counts[d.path] = files.length;
    } catch (e) {
      counts[d.path] = 0;
    }
  }
  return counts;
}

function showMenu() {
  console.log(`
Commands:
  pull              Full workspace load
  sync              Lightweight refresh
  status            Workspace state
  push <files>      Push files via GitHub API
  refresh           Generate CERTIFIED refresh packet (ZIP)
`);
}

// =============================================================================
// COMMANDS
// =============================================================================

async function cmdPull() {
  const pullStart = Date.now();
  console.log('PULL - Full workspace load\n');
  
  // 1. Download and extract repo
  exec(`curl -sL ${CONFIG.GITHUB_API_ZIP} -o /home/claude/repo.zip`, true);
  exec(`rm -rf ${CONFIG.WORKSPACE_PATH}`, true);
  exec('unzip -o /home/claude/repo.zip -d /home/claude/', true);
  exec(`mv /home/claude/elliot-backbone-backbone-v9-* ${CONFIG.WORKSPACE_PATH}`, true);
  exec('rm /home/claude/repo.zip', true);
  
  // 2. Get git info from GitHub API
  const git = getGitInfoFromAPI();
  
  // 3. Run QA gate
  const qaResult = exec(`node ${CONFIG.WORKSPACE_PATH}/qa/qa_gate.js`, true);
  const qaPassed = qaResult.success && !qaResult.output.includes('QA_FAIL');
  const passedMatch = qaResult.output?.match(/(\d+) passed/);
  const failedMatch = qaResult.output?.match(/(\d+) failed/);
  const qaPasses = parseInt(passedMatch?.[1] || '0');
  const qaFails = parseInt(failedMatch?.[1] || '0');
  
  // 4. Count files
  const files = countFiles(CONFIG.WORKSPACE_PATH);
  const lines = countLines(CONFIG.WORKSPACE_PATH);
  const dirCounts = countByDir(CONFIG.WORKSPACE_PATH);
  
  // 5. Trigger Vercel redeploy
  let vercelStatus = '⏳';
  let vercelTimestamp = null;
  let vercelJobId = null;
  const deployResult = exec(`curl -sX POST "${CONFIG.VERCEL_DEPLOY_HOOK}"`, true);
  if (deployResult.success && deployResult.output) {
    try {
      const data = JSON.parse(deployResult.output);
      vercelTimestamp = new Date().toISOString();
      if (data.job && data.job.id) {
        vercelJobId = data.job.id;
        vercelStatus = '✅ triggered';
      } else if (data.error) {
        vercelStatus = `❌ ${data.error.message || 'failed'}`;
      } else {
        vercelStatus = '✅ triggered';
      }
    } catch (e) {
      vercelStatus = deployResult.output.includes('error') ? '❌ failed' : '✅ triggered';
      vercelTimestamp = new Date().toISOString();
    }
  } else {
    vercelStatus = '❌ failed';
  }
  
  // 6. Check Redis health
  let redisStatus = '⏳';
  let eventsCount = 0;
  let redisTimestamp = null;
  const debugResult = exec(`curl -s "${CONFIG.API_BASE}/debug"`, true);
  if (debugResult.success && debugResult.output) {
    try {
      const data = JSON.parse(debugResult.output);
      redisTimestamp = new Date().toISOString();
      if (data.hasRedisConfig) {
        eventsCount = data.eventsCount || 0;
        redisStatus = '✅ connected';
      } else {
        redisStatus = '⚠️  not configured';
      }
    } catch (e) {
      redisStatus = '❌ unreachable';
    }
  } else {
    redisStatus = '❌ unreachable';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('═'.repeat(65));
  console.log('GIT');
  console.log('═'.repeat(65));
  console.log(`Commit:    ${git.commitShort} (${git.commitFull || 'unknown'})`);
  console.log(`Branch:    ${git.branch}`);
  console.log(`Date:      ${git.commitDate || 'unknown'}`);
  console.log(`Message:   ${git.commitMessage || 'unknown'}`);
  console.log(`Repo:      ${CONFIG.GITHUB_REPO}`);
  
  console.log('\n' + '═'.repeat(65));
  console.log(`QA: ${qaPassed ? '✅' : '❌'} ${qaPasses}/${qaPasses + qaFails} passing`);
  console.log('═'.repeat(65));
  for (const test of QA_TESTS) {
    const status = qaPasses >= test.id ? '✓' : '✗';
    console.log(`  ${status} ${test.name.padEnd(24)} → ${test.checks}`);
  }
  
  console.log('\n' + '═'.repeat(65));
  console.log(`FILES: ${files} files (${lines.toLocaleString()} lines)`);
  console.log('═'.repeat(65));
  
  // File tree
  const tree = buildFileTree(CONFIG.WORKSPACE_PATH, '', 0, 1);
  for (const line of tree.slice(0, 25)) {
    console.log(line);
  }
  if (tree.length > 25) {
    console.log(`  ... and ${tree.length - 25} more`);
  }
  
  console.log('\nBy directory:');
  for (const d of CONFIG.DIRECTORIES) {
    const count = dirCounts[d.path] || 0;
    console.log(`  ${d.path.padEnd(10)} ${String(count).padStart(3)} files  ${d.desc}`);
  }
  
  console.log('\n' + '═'.repeat(65));
  console.log('SERVICES');
  console.log('═'.repeat(65));
  console.log(`Vercel:    ${vercelStatus}${vercelJobId ? ` (job: ${vercelJobId})` : ''}`);
  console.log(`           Project: ${CONFIG.VERCEL_PROJECT || CONFIG.GITHUB_PROJECT}`);
  console.log(`           Dashboard: ${CONFIG.VERCEL_DASHBOARD || 'https://vercel.com'}`);
  if (vercelTimestamp) {
    console.log(`           Triggered: ${vercelTimestamp}`);
  }
  console.log(`Redis:     ${redisStatus}${eventsCount ? ` (${eventsCount} events)` : ''}`);
  if (redisTimestamp) {
    console.log(`           Checked: ${redisTimestamp}`);
  }
  
  console.log('\n' + '═'.repeat(65));
  console.log(`Pull completed in ${Date.now() - pullStart}ms`);
  console.log('═'.repeat(65));
}

async function cmdSync() {
  console.log('SYNC - Lightweight refresh\n');
  
  const baseUrl = 'https://raw.githubusercontent.com/elliot-backbone/backbone-v9/main';
  
  console.log('--- MANIFEST.md ---');
  const manifestResult = exec(`curl -sL ${baseUrl}/MANIFEST.md`, true);
  if (manifestResult.success) {
    console.log(manifestResult.output);
  }
  
  console.log('--- .backbone/config.js (key values) ---');
  const configResult = exec(`curl -sL ${baseUrl}/.backbone/config.js`, true);
  if (configResult.success) {
    const lines = configResult.output.split('\n');
    for (const line of lines) {
      if (line.includes('GITHUB_REPO:') || line.includes('VERCEL_URL:') || line.includes('QA_GATE_COUNT:')) {
        console.log(line.trim());
      }
    }
  }
  
  try {
    statSync(CONFIG.WORKSPACE_PATH);
    console.log('\n--- QA Gate ---');
    const qaResult = exec(`node ${CONFIG.WORKSPACE_PATH}/qa/qa_gate.js`, true);
    const qaPassed = qaResult.success && !qaResult.output.includes('QA_FAIL');
    const qaCount = qaResult.output?.match(/QA GATE: (\d+) passed/)?.[1] || '?';
    console.log(`QA: ${qaPassed ? '✅' : '❌'} ${qaCount}/${CONFIG.QA_GATE_COUNT}`);
  } catch (e) {
    console.log('\nWorkspace not loaded. Run: node .backbone/cli.js pull');
  }
}

async function cmdStatus() {
  const commitShort = getCommitShort();
  
  const logResult = exec(`git log -1 --format="%s|%ar" 2>/dev/null`, true);
  let subject = '-', date = '-';
  if (logResult.success && logResult.output) {
    [subject, date] = logResult.output.trim().split('|');
  }
  
  const files = countFiles();
  const lines = countLines();
  
  const statusResult = exec('git status --porcelain', true);
  const hasChanges = statusResult.success && statusResult.output.trim();
  
  const qaResult = exec('node qa/qa_gate.js', true);
  const qaPassed = qaResult.success && !qaResult.output.includes('QA_FAIL');
  const qaCount = qaResult.output?.match(/QA GATE: (\d+) passed/)?.[1] || '?';
  
  console.log(`Commit:   ${commitShort} (${date})
Message:  ${subject}
Files:    ${files} (${lines} lines)
QA:       ${qaPassed ? '✅' : '❌'} ${qaCount}/${CONFIG.QA_GATE_COUNT}
Changes:  ${hasChanges ? '⚠️  uncommitted' : 'clean'}
Repo:     ${CONFIG.GITHUB_REPO}
Deploy:   ${CONFIG.VERCEL_URL}
`);
}

async function cmdPush(files, commitMsg) {
  if (!files || files.length === 0) {
    console.log('PUSH - Push files via GitHub API\n');
    console.log('Usage: node .backbone/cli.js push <file1> [file2] ... [-m "commit message"]');
    console.log('\nRequires: GITHUB_TOKEN env var or .github-token file');
    return;
  }
  
  console.log('PUSH via GitHub API\n');
  
  console.log('Running QA...');
  const qaResult = exec('node qa/qa_gate.js', true);
  if (!qaResult.success || qaResult.output.includes('QA_FAIL')) {
    console.log('❌ QA FAILED - push aborted\n');
    console.log(qaResult.output);
    process.exit(1);
  }
  const qaCount = qaResult.output?.match(/QA GATE: (\d+) passed/)?.[1] || '?';
  console.log(`✅ QA passed (${qaCount}/${CONFIG.QA_GATE_COUNT})\n`);
  
  const message = commitMsg || `Update: ${new Date().toISOString().split('T')[0]}`;
  
  for (const file of files) {
    if (!existsSync(file)) {
      console.log(`❌ File not found: ${file}`);
      continue;
    }
    
    const fileSizeKB = statSync(file).size / 1024;
    const isLargeJson = file.endsWith('.json') && fileSizeKB > MAX_FILE_SIZE_KB;
    
    console.log(`Pushing ${file}...`);
    
    let result;
    if (isLargeJson) {
      console.log(`  (Large file: ${fileSizeKB.toFixed(0)}KB, will chunk)`);
      result = await pushLargeJson(file, `${message} - ${file}`);
    } else {
      result = await githubPush(file, `${message} - ${file}`);
    }
    
    if (result.success) {
      if (result.chunked) {
        console.log(`✅ ${file} → ${result.sha} (${result.chunkCount} chunks)`);
      } else {
        console.log(`✅ ${file} → ${result.sha}`);
      }
    } else {
      console.log(`❌ ${file}: ${result.error}`);
    }
  }
  
  console.log(`\nVercel will auto-deploy: ${CONFIG.VERCEL_URL}`);
}

// =============================================================================
// MAIN
// =============================================================================

const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

if (command === 'pull') await cmdPull();
else if (command === 'sync') await cmdSync();
else if (command === 'status') await cmdStatus();
else if (command === 'push') {
  const mIndex = args.indexOf('-m');
  let files, message;
  if (mIndex > 0) {
    files = args.slice(1, mIndex);
    message = args.slice(mIndex + 1).join(' ');
  } else {
    files = args.slice(1);
    message = null;
  }
  await cmdPush(files, message);
}
else if (command === 'refresh') {
  // Run refresh.js
  const refreshPath = join(process.cwd(), '.backbone/refresh.js');
  if (existsSync(refreshPath)) {
    exec(`node ${refreshPath}`, false);
  } else {
    console.log('refresh.js not found. Run from workspace root.');
  }
}
else {
  console.log('Backbone V9 CLI');
  showMenu();
  process.exit(command ? 1 : 0);
}
