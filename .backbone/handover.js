#!/usr/bin/env node

/**
 * BACKBONE V9 - HANDOVER GENERATOR
 * 
 * Creates a lightweight continuation document for next Claude session.
 * Maximizes context preservation while minimizing token usage.
 * 
 * Usage: node .backbone/handover.js [options]
 *   --task "description"    Current task being worked on
 *   --status "description"  Current status/progress
 *   --next "description"    Immediate next step
 *   --files file1,file2     Key files being modified
 *   --decisions "d1|d2|d3"  Key decisions made (pipe-separated)
 *   --blockers "b1|b2"      Current blockers (pipe-separated)
 */

import { writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

const WORKSPACE = '/home/claude/backbone-v9';
const OUTPUT_DIR = '/mnt/user-data/outputs';

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

function parseArgs(args) {
  const result = {
    task: null,
    status: null,
    next: null,
    files: [],
    decisions: [],
    blockers: [],
    context: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];
    
    switch (arg) {
      case '--task':
      case '-t':
        result.task = value;
        i++;
        break;
      case '--status':
      case '-s':
        result.status = value;
        i++;
        break;
      case '--next':
      case '-n':
        result.next = value;
        i++;
        break;
      case '--files':
      case '-f':
        result.files = value ? value.split(',').map(f => f.trim()) : [];
        i++;
        break;
      case '--decisions':
      case '-d':
        result.decisions = value ? value.split('||').map(d => d.trim()) : [];
        i++;
        break;
      case '--blockers':
      case '-b':
        result.blockers = value ? value.split('||').map(b => b.trim()) : [];
        i++;
        break;
      case '--context':
      case '-c':
        result.context = value;
        i++;
        break;
    }
  }
  
  return result;
}

// =============================================================================
// WORKSPACE ANALYSIS
// =============================================================================

function getRecentlyModifiedFiles(dir, hours = 2) {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  const modified = [];
  
  function scan(d, base = '') {
    try {
      const items = readdirSync(d);
      for (const item of items) {
        if (item === 'node_modules' || item === '.git' || item.startsWith('.')) continue;
        const fullPath = join(d, item);
        const relativePath = base ? join(base, item) : item;
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scan(fullPath, relativePath);
        } else if (stat.mtimeMs > cutoff) {
          if (item.endsWith('.js') || item.endsWith('.json') || item.endsWith('.md')) {
            modified.push({
              path: relativePath,
              mtime: stat.mtimeMs,
              size: stat.size
            });
          }
        }
      }
    } catch (e) {}
  }
  
  scan(dir);
  return modified.sort((a, b) => b.mtime - a.mtime);
}

function getGitStatus() {
  try {
    const result = execSync('git status --porcelain 2>/dev/null', { 
      cwd: WORKSPACE, 
      encoding: 'utf8' 
    });
    return result.trim().split('\n').filter(Boolean).map(line => {
      const status = line.substring(0, 2).trim();
      const file = line.substring(3);
      return { status, file };
    });
  } catch (e) {
    return [];
  }
}

function getLatestCommit() {
  try {
    const sha = execSync('git rev-parse HEAD 2>/dev/null', { 
      cwd: WORKSPACE, 
      encoding: 'utf8' 
    }).trim().substring(0, 7);
    
    const msg = execSync('git log -1 --format="%s" 2>/dev/null', { 
      cwd: WORKSPACE, 
      encoding: 'utf8' 
    }).trim();
    
    return { sha, msg };
  } catch (e) {
    return { sha: 'unknown', msg: 'unknown' };
  }
}

function getQAStatus() {
  try {
    const result = execSync('node qa/qa_gate.js 2>/dev/null', { 
      cwd: WORKSPACE, 
      encoding: 'utf8' 
    });
    const match = result.match(/(\d+) passed/);
    return match ? `${match[1]}/7` : 'unknown';
  } catch (e) {
    return 'failed';
  }
}

// =============================================================================
// HANDOVER GENERATION
// =============================================================================

function generateHandover(params) {
  const timestamp = new Date().toISOString();
  const commit = getLatestCommit();
  const qaStatus = getQAStatus();
  const recentFiles = getRecentlyModifiedFiles(WORKSPACE, 2);
  const gitChanges = getGitStatus();
  
  // Merge CLI-specified files with auto-detected recent files
  const allFiles = [...new Set([
    ...params.files,
    ...recentFiles.slice(0, 5).map(f => f.path)
  ])];
  
  let doc = `# Backbone V9 — Session Handover
Generated: ${timestamp}

## Workspace State
- **Commit**: ${commit.sha} (${commit.msg})
- **QA**: ${qaStatus} passing
- **Uncommitted**: ${gitChanges.length > 0 ? gitChanges.length + ' files' : 'clean'}

## Load Workspace
\`\`\`bash
curl -sL https://api.github.com/repos/elliot-backbone/backbone-v9/zipball/main -o /home/claude/repo.zip
rm -rf /home/claude/backbone-v9
unzip -o /home/claude/repo.zip -d /home/claude/
mv /home/claude/elliot-backbone-backbone-v9-* /home/claude/backbone-v9
cd /home/claude/backbone-v9 && node .backbone/cli.js pull
\`\`\`

`;

  // Task context
  if (params.task) {
    doc += `## Current Task
${params.task}

`;
  }

  // Status
  if (params.status) {
    doc += `## Progress
${params.status}

`;
  }

  // Key decisions
  if (params.decisions.length > 0) {
    doc += `## Key Decisions Made
${params.decisions.map(d => `- ${d}`).join('\n')}

`;
  }

  // Files being worked on
  if (allFiles.length > 0) {
    doc += `## Active Files
${allFiles.map(f => `- \`${f}\``).join('\n')}

`;
  }

  // Uncommitted changes
  if (gitChanges.length > 0) {
    doc += `## Uncommitted Changes
${gitChanges.map(c => `- [${c.status}] ${c.file}`).join('\n')}

`;
  }

  // Blockers
  if (params.blockers.length > 0) {
    doc += `## Blockers
${params.blockers.map(b => `- ${b}`).join('\n')}

`;
  }

  // Next step
  if (params.next) {
    doc += `## Immediate Next Step
${params.next}

`;
  }

  // Additional context
  if (params.context) {
    doc += `## Additional Context
${params.context}

`;
  }

  // Footer with instructions
  doc += `---
**Instructions for next session**: Load workspace, review active files, continue from next step. Push completed work before pulling to avoid losing changes.
`;

  return doc;
}

// =============================================================================
// INTERACTIVE MODE
// =============================================================================

function interactivePrompt() {
  console.log(`
HANDOVER GENERATOR - Interactive Mode

This generates a continuation document for the next Claude session.
Answer the prompts below (press Enter to skip optional fields).
`);

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const params = {
      task: null,
      status: null,
      next: null,
      files: [],
      decisions: [],
      blockers: [],
      context: null
    };

    const questions = [
      { key: 'task', prompt: 'Current task (what are you working on?): ' },
      { key: 'status', prompt: 'Progress so far: ' },
      { key: 'next', prompt: 'Immediate next step: ' },
      { key: 'files', prompt: 'Key files (comma-separated): ', array: true },
      { key: 'decisions', prompt: 'Key decisions made (pipe-separated): ', array: true, sep: '|' },
      { key: 'blockers', prompt: 'Blockers if any (pipe-separated): ', array: true, sep: '|' },
      { key: 'context', prompt: 'Additional context: ' }
    ];

    let idx = 0;

    function ask() {
      if (idx >= questions.length) {
        rl.close();
        resolve(params);
        return;
      }

      const q = questions[idx];
      rl.question(q.prompt, (answer) => {
        if (answer.trim()) {
          if (q.array) {
            params[q.key] = answer.split(q.sep || ',').map(s => s.trim());
          } else {
            params[q.key] = answer.trim();
          }
        }
        idx++;
        ask();
      });
    }

    ask();
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  let params;
  
  if (args.length === 0 || args[0] === '--interactive' || args[0] === '-i') {
    // Interactive mode
    params = await interactivePrompt();
  } else {
    // CLI mode
    params = parseArgs(args);
  }
  
  const handover = generateHandover(params);
  
  // Write to outputs directory
  const filename = `handover-${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.md`;
  const outputPath = join(OUTPUT_DIR, filename);
  
  writeFileSync(outputPath, handover);
  
  console.log('\n' + '═'.repeat(60));
  console.log('HANDOVER DOCUMENT GENERATED');
  console.log('═'.repeat(60));
  console.log(`\nOutput: ${outputPath}`);
  console.log('\nCopy the contents below into your next Claude chat:\n');
  console.log('─'.repeat(60));
  console.log(handover);
  console.log('─'.repeat(60));
}

main().catch(console.error);
