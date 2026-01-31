#!/usr/bin/env node

/**
 * BACKBONE V9 - CLI TOOLS
 */

import { execSync } from 'child_process';
import { writeFileSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { CONFIG, getCommitURL } from './config.js';

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
  pull          Full workspace load
  sync          Lightweight refresh
  load <dirs>   Load specific modules
  status        Workspace state
  deploy        QA + commit + push
  handover      Generate handover doc
`);
}

// ============ COMMANDS ============

async function cmdPull() {
  console.log('PULL - Full workspace load\n');
  
  exec(`curl -sL ${CONFIG.GITHUB_API_ZIP} -o /home/claude/repo.zip`, true);
  exec(`rm -rf ${CONFIG.WORKSPACE_PATH}`, true);
  exec('unzip -o /home/claude/repo.zip -d /home/claude/', true);
  exec(`mv /home/claude/elliot-backbone-backbone-v9-* ${CONFIG.WORKSPACE_PATH}`, true);
  exec('rm /home/claude/repo.zip', true);
  
  const qaResult = exec(`node ${CONFIG.WORKSPACE_PATH}/qa/qa_gate.js`, true);
  const qaPassed = qaResult.success && !qaResult.output.includes('QA_FAIL');
  const qaCount = qaResult.output?.match(/QA GATE: (\d+) passed/)?.[1] || '?';
  
  const files = countFiles(CONFIG.WORKSPACE_PATH);
  const lines = countLines(CONFIG.WORKSPACE_PATH);
  
  console.log(`Status: ${qaPassed ? '✅' : '❌'}
Workspace: ${CONFIG.WORKSPACE_PATH}
QA: ${qaCount}/${CONFIG.QA_GATE_COUNT} passing
Files: ${files} (${lines} lines)
`);
}

async function cmdSync() {
  console.log('SYNC - Lightweight refresh\n');
  
  const baseUrl = 'https://raw.githubusercontent.com/elliot-backbone/backbone-v9/main';
  
  // Fetch manifest
  console.log('--- MANIFEST.md ---');
  const manifestResult = exec(`curl -sL ${baseUrl}/MANIFEST.md`, true);
  if (manifestResult.success) {
    console.log(manifestResult.output);
  }
  
  // Fetch config
  console.log('--- .backbone/config.js (key values) ---');
  const configResult = exec(`curl -sL ${baseUrl}/.backbone/config.js`, true);
  if (configResult.success) {
    // Extract just the key URLs
    const lines = configResult.output.split('\n');
    for (const line of lines) {
      if (line.includes('GITHUB_REPO:') || line.includes('VERCEL_URL:') || line.includes('QA_GATE_COUNT:')) {
        console.log(line.trim());
      }
    }
  }
  
  // Run QA gate if workspace exists
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

async function cmdDeploy() {
  console.log('DEPLOY\n');
  
  // Run QA
  console.log('Running QA...');
  const qaResult = exec('node qa/qa_gate.js', true);
  if (!qaResult.success || qaResult.output.includes('QA_FAIL')) {
    console.log('❌ QA FAILED - deploy aborted\n');
    console.log(qaResult.output);
    process.exit(1);
  }
  const qaCount = qaResult.output?.match(/QA GATE: (\d+) passed/)?.[1] || '?';
  console.log(`✅ QA passed (${qaCount}/${CONFIG.QA_GATE_COUNT})\n`);
  
  // Stage and commit
  exec('git add -A');
  const statusResult = exec('git status --porcelain', true);
  if (!statusResult.output.trim()) {
    console.log('No changes to deploy.\n');
    return;
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  exec(`git commit -m "Deploy: ${timestamp}"`, true);
  
  // Push
  console.log(`Pushing to ${CONFIG.DEFAULT_BRANCH}...`);
  const pushResult = exec(`git push origin ${CONFIG.DEFAULT_BRANCH}`, true);
  if (!pushResult.success) {
    console.log('❌ Push failed\n');
    process.exit(1);
  }
  
  const commit = getCommitShort();
  console.log(`✅ Deployed: ${commit}\n`);
  console.log(`Live: ${CONFIG.VERCEL_URL}\n`);
  
  // Output instructions
  console.log('─'.repeat(50));
  console.log('UPDATE CLAUDE PROJECT INSTRUCTIONS:');
  console.log('─'.repeat(50));
  console.log(generateInstructions());
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
node .backbone/cli.js deploy      # Ship it
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

// ============ MAIN ============

const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

if (command === 'pull') await cmdPull();
else if (command === 'sync') await cmdSync();
else if (command === 'load') await cmdLoad(args.slice(1));
else if (command === 'status') await cmdStatus();
else if (command === 'deploy') await cmdDeploy();
else if (command === 'handover') await cmdHandover();
else {
  console.log('Backbone V9 CLI');
  showMenu();
  process.exit(command ? 1 : 0);
}
