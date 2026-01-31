#!/usr/bin/env node

/**
 * BACKBONE V9 - CLI TOOLS
 * Developer utilities for QA, deployment, and project management
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

function runQAGate() {
  console.log('Running QA Gate...');
  const result = exec('node qa/qa_gate.js', true);
  if (!result.success || result.output.includes('QA_FAIL')) {
    console.log('QA Gate FAILED\n' + result.output);
    return false;
  }
  const passed = (result.output.match(/QA GATE: (\d+) passed/)?.[1]) || '0';
  console.log(`QA Gate PASSED: ${passed} gates`);
  return true;
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

function getQAGateCount() {
  const result = exec('node qa/qa_gate.js', true);
  return (result.output?.match(/QA GATE: (\d+) passed/)?.[1]) || String(CONFIG.QA_GATE_COUNT);
}

function getCommitShort() {
  const result = exec('git rev-parse HEAD 2>/dev/null', true);
  return result.success && result.output ? result.output.trim().substring(0, 7) : 'unknown';
}

function generateInstructions() {
  const commit = getCommitShort();
  
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
  node .backbone/cli.js status       Workspace status
  node .backbone/cli.js qa           Run QA sweep
  node .backbone/cli.js deploy       Commit, validate, push
  node .backbone/cli.js pull         Pull latest from GitHub
  node .backbone/cli.js handover     Generate handover doc
  node .backbone/cli.js review       Generate review doc
  node .backbone/cli.js instructions Output project instructions
`);
}

async function cmdStatus() {
  console.log('BACKBONE V9 - STATUS\n');
  
  const commitResult = exec('git rev-parse HEAD 2>/dev/null', true);
  const commit = commitResult.success && commitResult.output ? commitResult.output.trim() : 'unknown';
  const commitShort = commit.substring(0, 7);
  
  const logResult = exec(`git log -1 --format="%s|%an|%ar" 2>/dev/null`, true);
  let subject = 'unknown', author = 'unknown', date = 'unknown';
  if (logResult.success && logResult.output) {
    [subject, author, date] = logResult.output.trim().split('|');
  }
  
  const files = countFiles();
  const lines = countLines();
  
  const statusResult = exec('git status --porcelain', true);
  const hasChanges = statusResult.success && statusResult.output.trim();
  
  const qaResult = exec('node qa/qa_gate.js', true);
  const qaPassed = qaResult.success && !qaResult.output.includes('QA_FAIL');
  const qaCount = qaResult.output?.match(/QA GATE: (\d+) passed/)?.[1] || '?';
  
  console.log(`Commit:    ${commitShort}
Message:   ${subject}
Author:    ${author}
Date:      ${date}

Files:     ${files}
Lines:     ${lines}

QA Gates:  ${qaPassed ? 'PASS' : 'FAIL'} ${qaCount}/${CONFIG.QA_GATE_COUNT}
Changes:   ${hasChanges ? 'Uncommitted changes' : 'Clean'}

Repo:      ${getCommitURL(commit)}
Deploy:    ${CONFIG.VERCEL_URL}
`);
  showMenu();
}

async function cmdQA() {
  console.log('BACKBONE V9 - QA SWEEP\n');
  const result = exec('node qa-sweep.js');
  if (result.success) {
    console.log('\nQA SWEEP COMPLETE\n');
  }
  showMenu();
  process.exit(result.success ? 0 : 1);
}

async function cmdDeploy() {
  console.log('BACKBONE V9 - DEPLOY\n');
  
  if (!runQAGate()) {
    console.log('\nDEPLOY ABORTED: QA gates must pass\n');
    showMenu();
    process.exit(1);
  }
  
  console.log('\nStaging and committing...');
  exec('git add -A');
  
  const statusResult = exec('git status --porcelain', true);
  if (!statusResult.output.trim()) {
    console.log('No changes to deploy\n');
    showMenu();
    return;
  }
  
  const timestamp = new Date().toISOString();
  writeFileSync('.git-commit-msg', `Update: ${timestamp}`);
  exec('git commit -F .git-commit-msg');
  exec('rm .git-commit-msg');
  
  console.log(`\nPushing to ${CONFIG.DEFAULT_BRANCH}...`);
  const pushResult = exec(`git push origin ${CONFIG.DEFAULT_BRANCH}`);
  
  if (!pushResult.success) {
    console.log('Push failed\n');
    showMenu();
    process.exit(1);
  }
  
  const commitResult = exec('git rev-parse HEAD', true);
  if (commitResult.success && commitResult.output) {
    const commit = commitResult.output.trim();
    console.log(`\nDEPLOY COMPLETE
Commit: ${commit.substring(0, 7)}
URL: ${CONFIG.VERCEL_URL}
`);
  }
  
  // Output instructions for Claude Project update
  console.log('═'.repeat(60));
  console.log('CLAUDE PROJECT INSTRUCTIONS - Copy below this line:');
  console.log('═'.repeat(60));
  console.log(generateInstructions());
  console.log('═'.repeat(60));
  
  showMenu();
}

async function cmdPull() {
  console.log('BACKBONE V9 - PULL\n');
  
  console.log('Downloading latest...');
  exec(`curl -sL ${CONFIG.GITHUB_API_ZIP} -o /home/claude/repo.zip`, true);
  
  console.log('Clearing workspace...');
  exec(`rm -rf ${CONFIG.WORKSPACE_PATH}`, true);
  
  console.log('Extracting...');
  exec('unzip -o /home/claude/repo.zip -d /home/claude/', true);
  exec(`mv /home/claude/elliot-backbone-backbone-v9-* ${CONFIG.WORKSPACE_PATH}`, true);
  exec('rm /home/claude/repo.zip', true);
  
  console.log('Running QA Gate...');
  const qaResult = exec(`node ${CONFIG.WORKSPACE_PATH}/qa/qa_gate.js`, true);
  const qaPassed = qaResult.success && !qaResult.output.includes('QA_FAIL');
  const qaCount = qaResult.output?.match(/QA GATE: (\d+) passed/)?.[1] || '?';
  
  const files = countFiles(CONFIG.WORKSPACE_PATH);
  const lines = countLines(CONFIG.WORKSPACE_PATH);
  
  console.log(`
Status: ${qaPassed ? 'PASS' : 'FAIL'}
Workspace: ${CONFIG.WORKSPACE_PATH}
QA: ${qaCount}/${CONFIG.QA_GATE_COUNT}
Files: ${files} (${lines} lines)
`);
  showMenu();
}

async function cmdHandover() {
  console.log('BACKBONE V9 - HANDOVER\n');
  
  const commitResult = exec('git rev-parse HEAD', true);
  const commit = commitResult.success && commitResult.output ? commitResult.output.trim() : 'unknown';
  const commitShort = commit.substring(0, 7);
  
  const files = countFiles();
  const lines = countLines();
  const qaGates = getQAGateCount();
  
  const handover = `# Backbone V9 - Handover

Repository: ${CONFIG.GITHUB_REPO}
Deployment: ${CONFIG.VERCEL_URL}
Commit: ${commitShort}
Generated: ${new Date().toISOString()}

## Workspace

Files: ${files}
Lines: ${lines}
QA Gates: ${qaGates}/${CONFIG.QA_GATE_COUNT}

## Quick Start

\`\`\`bash
curl -sL ${CONFIG.GITHUB_API_ZIP} -o backbone.zip
unzip backbone.zip && mv elliot-backbone-backbone-v9-* backbone-v9 && cd backbone-v9
node qa/qa_gate.js
\`\`\`

## CLI Commands

\`\`\`bash
node .backbone/cli.js status
node .backbone/cli.js qa
node .backbone/cli.js deploy
node .backbone/cli.js pull
node .backbone/cli.js handover
node .backbone/cli.js review
\`\`\`

## Architecture

${CONFIG.DIRECTORIES.map(d => `- ${d.path}/ - ${d.desc}`).join('\n')}

## Deployment

Live: ${CONFIG.VERCEL_URL}
API: ${CONFIG.API_TODAY}
Auto-deploy on push to \`${CONFIG.DEFAULT_BRANCH}\`
`;
  
  writeFileSync(`HANDOVER_${commitShort}.md`, handover);
  console.log(`Generated: HANDOVER_${commitShort}.md\n`);
  console.log(handover);
  showMenu();
}

async function cmdReview() {
  console.log('BACKBONE V9 - REVIEW\n');
  
  const commitResult = exec('git rev-parse HEAD', true);
  const commit = commitResult.success && commitResult.output ? commitResult.output.trim() : 'unknown';
  const commitShort = commit.substring(0, 7);
  
  const files = countFiles();
  const lines = countLines();
  const qaGates = getQAGateCount();
  const timestamp = new Date().toISOString();
  
  const review = `# Backbone V9 - Review

Generated: ${timestamp}
Commit: ${commitShort}

## Current State

Repository: ${getCommitURL(commit)}
Deployment: ${CONFIG.VERCEL_URL}
Files: ${files}
Lines: ${lines}
QA Gates: ${qaGates}/${CONFIG.QA_GATE_COUNT}

## Milestones

${CONFIG.MILESTONES.map(m => `- ${m.name}: ${m.status}`).join('\n')}

## API Endpoints

- Today: ${CONFIG.API_TODAY}
- Complete: ${CONFIG.API_COMPLETE}
- Skip: ${CONFIG.API_SKIP}

## Repository

${CONFIG.GITHUB_REPO}
`;
  
  const reviewFilename = `REVIEW_${commitShort}_${Date.now()}.md`;
  writeFileSync(reviewFilename, review);
  console.log(`Generated: ${reviewFilename}\n`);
  console.log(review);
  showMenu();
}

async function cmdInstructions() {
  console.log(generateInstructions());
}

const command = process.argv[2]?.toLowerCase();
if (command === 'status') await cmdStatus();
else if (command === 'qa') await cmdQA();
else if (command === 'deploy') await cmdDeploy();
else if (command === 'pull') await cmdPull();
else if (command === 'handover') await cmdHandover();
else if (command === 'review') await cmdReview();
else if (command === 'instructions') await cmdInstructions();
else {
  console.log(`Backbone V9 CLI

Usage: node .backbone/cli.js <command>
`);
  showMenu();
  process.exit(1);
}
