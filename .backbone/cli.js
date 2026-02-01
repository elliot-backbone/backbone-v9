#!/usr/bin/env node

/**
 * BACKBONE V9 - CLI TOOLS
 */

import { execSync } from 'child_process';
import { writeFileSync, readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CONFIG, getCommitURL } from './config.js';

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

function generateInstructions() {
  return `# Backbone V9

## Repository
${CONFIG.GITHUB_REPO}

## Deployment
${CONFIG.VERCEL_URL}

## Load Workspace
\`\`\`bash
curl -sL ${CONFIG.GITHUB_API_ZIP} -o /home/claude/repo.zip
rm -rf /home/claude/backbone-v9
unzip -o /home/claude/repo.zip -d /home/claude/
mv /home/claude/elliot-backbone-backbone-v9-* /home/claude/backbone-v9
node /home/claude/backbone-v9/qa/qa_gate.js
\`\`\`

## CLI Tools
\`\`\`bash
node .backbone/cli.js status     # Workspace status
node .backbone/cli.js qa         # Run QA sweep
node .backbone/cli.js deploy     # Commit + push + deploy
node .backbone/cli.js pull       # Pull latest
node .backbone/cli.js handover   # Generate handover doc
node .backbone/cli.js review     # Generate review doc
\`\`\`

## Structure

- \`raw/\` — Input data
- \`derive/\` — Derived calculations
- \`predict/\` — Forward predictions
- \`decide/\` — Action ranking
- \`runtime/\` — Execution engine
- \`qa/\` — Quality gates
- \`ui/\` — Frontend (Next.js)

## QA

All changes validated by \`qa/qa_gate.js\` before deploy.
`;
}

function showMenu() {
  console.log(`
Commands:
  pull              Full workspace load
  sync              Lightweight refresh
  load <dirs>       Load specific modules
  status            Workspace state
  push <files>      Push files via GitHub API
  deploy [msg]      QA + generate push commands
  handover          Generate handover doc
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
  if (vercelTimestamp) {
    console.log(`           Triggered: ${vercelTimestamp}`);
  }
  console.log(`           Project:   ${CONFIG.VERCEL_URL}`);
  console.log(`           Dashboard: https://vercel.com/${CONFIG.VERCEL_TEAM.toLowerCase()}/${CONFIG.GITHUB_PROJECT}`);
  console.log(`Redis:     ${redisStatus}${eventsCount ? ` (${eventsCount} events)` : ''}`);
  if (redisTimestamp) {
    console.log(`           Checked:   ${redisTimestamp}`);
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

async function cmdLoad(dirs) {
  if (!dirs || dirs.length === 0) {
    console.log('LOAD - Targeted module load\n');
    console.log('Usage: node .backbone/cli.js load <dir1> [dir2] ...');
    console.log('\nAvailable directories:');
    CONFIG.DIRECTORIES.forEach(d => console.log(`  ${d.path.padEnd(12)} ${d.desc}`));
    return;
  }
  
  console.log(`LOAD - Loading: ${dirs.join(', ')}\n`);
  
  const baseUrl = 'https://api.github.com/repos/elliot-backbone/backbone-v9/contents';
  
  for (const dir of dirs) {
    console.log(`\n--- ${dir}/ ---`);
    const result = exec(`curl -sL ${baseUrl}/${dir}`, true);
    if (result.success) {
      try {
        const files = JSON.parse(result.output);
        if (Array.isArray(files)) {
          for (const file of files) {
            if (file.type === 'file' && file.name.endsWith('.js')) {
              console.log(`\n// ${dir}/${file.name}`);
              const content = exec(`curl -sL ${file.download_url}`, true);
              if (content.success) {
                console.log(content.output);
              }
            }
          }
        }
      } catch (e) {
        console.log(`Failed to parse: ${e.message}`);
      }
    }
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

async function cmdDeploy(commitMsg) {
  console.log('DEPLOY\n');
  
  console.log('Running QA...');
  const qaResult = exec('node qa/qa_gate.js', true);
  if (!qaResult.success || qaResult.output.includes('QA_FAIL')) {
    console.log('❌ QA FAILED - deploy aborted\n');
    console.log(qaResult.output);
    process.exit(1);
  }
  const qaCount = qaResult.output?.match(/QA GATE: (\d+) passed/)?.[1] || '?';
  console.log(`✅ QA passed (${qaCount}/${CONFIG.QA_GATE_COUNT})\n`);
  
  const statusResult = exec('git status --porcelain', true);
  if (!statusResult.output.trim()) {
    console.log('No changes to deploy.\n');
    return;
  }
  
  console.log('Changed files:');
  console.log(statusResult.output);
  
  const message = commitMsg || `Deploy: ${new Date().toISOString().split('T')[0]}`;
  
  const diffResult = exec('git diff --stat', true);
  if (diffResult.output) {
    console.log('Diff summary:');
    console.log(diffResult.output);
  }
  
  console.log('─'.repeat(50));
  console.log('RUN IN YOUR TERMINAL:');
  console.log('─'.repeat(50));
  console.log(`
cd backbone-v9
git add -A
git commit -m "${message}"
git push origin main
`);
  console.log('─'.repeat(50));
  console.log(`Vercel will auto-deploy to: ${CONFIG.VERCEL_URL}`);
}

async function cmdHandover() {
  const commitShort = getCommitShort();
  const files = countFiles();
  const lines = countLines();
  
  const qaResult = exec('node qa/qa_gate.js', true);
  const qaCount = qaResult.output?.match(/QA GATE: (\d+) passed/)?.[1] || '?';
  
  const handover = `# Backbone V9 - Handover

Repo: ${CONFIG.GITHUB_REPO}
Deploy: ${CONFIG.VERCEL_URL}
Commit: ${commitShort}
Generated: ${new Date().toISOString()}

## State
Files: ${files} | Lines: ${lines} | QA: ${qaCount}/${CONFIG.QA_GATE_COUNT}

## Load
\`\`\`bash
curl -sL ${CONFIG.GITHUB_API_ZIP} -o backbone.zip
unzip backbone.zip && mv elliot-backbone-backbone-v9-* backbone-v9
node backbone-v9/qa/qa_gate.js
\`\`\`

## CLI
\`\`\`bash
node .backbone/cli.js pull        # Full load
node .backbone/cli.js sync        # Quick refresh
node .backbone/cli.js load <dir>  # Load module
node .backbone/cli.js status      # Check state
node .backbone/cli.js push <file> # Push via API
node .backbone/cli.js deploy      # QA + generate commands
node .backbone/cli.js handover    # This doc
\`\`\`

## Structure
${CONFIG.DIRECTORIES.map(d => `- ${d.path}/ — ${d.desc}`).join('\n')}
`;
  
  const filename = `HANDOVER_${commitShort}.md`;
  writeFileSync(filename, handover);
  console.log(handover);
  console.log(`\nSaved: ${filename}`);
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
    
    console.log(`Pushing ${file}...`);
    const result = await githubPush(file, `${message} - ${file}`);
    
    if (result.success) {
      console.log(`✅ ${file} → ${result.sha}`);
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
else if (command === 'load') await cmdLoad(args.slice(1));
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
else if (command === 'deploy') await cmdDeploy(args.slice(1).join(' '));
else if (command === 'handover') await cmdHandover();
else {
  console.log('Backbone V9 CLI');
  showMenu();
  process.exit(command ? 1 : 0);
}
