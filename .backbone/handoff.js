#!/usr/bin/env node

/**
 * BACKBONE V9 - COMPACTION HANDOFF
 * 
 * Claude-triggered tool for generating continuation context when
 * approaching context window limits. Produces minimal-token, 
 * maximum-context handoff document.
 * 
 * Usage: node .backbone/handoff.js [options]
 *   --task "description"    Current task
 *   --status "description"  Progress so far  
 *   --next "description"    Immediate next step
 *   --files file1,file2     Key files being modified
 *   --decisions "d1;;d2"    Key decisions (double-semicolon separated)
 *   --blockers "b1;;b2"     Blockers (double-semicolon separated)
 *   --context "text"        Critical context to preserve
 */

import { writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __handoff_filename = fileURLToPath(import.meta.url);
const __handoff_dirname = dirname(__handoff_filename);
const WORKSPACE = join(__handoff_dirname, '..');
const OUTPUT_DIR = '/mnt/user-data/outputs';

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
        result.decisions = value ? value.split(';;').map(d => d.trim()) : [];
        i++;
        break;
      case '--blockers':
      case '-b':
        result.blockers = value ? value.split(';;').map(b => b.trim()) : [];
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

function getRecentFiles(dir, hours = 2) {
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
        } else if (stat.mtimeMs > cutoff && (item.endsWith('.js') || item.endsWith('.json') || item.endsWith('.md'))) {
          modified.push(relativePath);
        }
      }
    } catch (e) {}
  }
  
  scan(dir);
  return modified.slice(0, 8);
}

function getCommit() {
  try {
    const sha = execSync('git rev-parse HEAD 2>/dev/null', { cwd: WORKSPACE, encoding: 'utf8' }).trim().substring(0, 7);
    const msg = execSync('git log -1 --format="%s" 2>/dev/null', { cwd: WORKSPACE, encoding: 'utf8' }).trim();
    return `${sha} (${msg})`;
  } catch (e) {
    return 'unknown';
  }
}

function getUncommitted() {
  try {
    const result = execSync('git status --porcelain 2>/dev/null', { cwd: WORKSPACE, encoding: 'utf8' });
    return result.trim().split('\n').filter(Boolean).map(l => l.substring(3));
  } catch (e) {
    return [];
  }
}

function generateHandoff(params) {
  const ts = new Date().toISOString();
  const commit = getCommit();
  const uncommitted = getUncommitted();
  const recentFiles = getRecentFiles(WORKSPACE);
  const allFiles = [...new Set([...params.files, ...recentFiles])];

  let doc = `# Backbone V9 — Compaction Handoff
${ts}

## State
Commit: ${commit}
Uncommitted: ${uncommitted.length > 0 ? uncommitted.join(', ') : 'none'}

## Load
\`\`\`bash
curl -sL https://api.github.com/repos/elliot-backbone/backbone-v9/zipball/main -o /home/claude/repo.zip && rm -rf /home/claude/backbone-v9 && unzip -o /home/claude/repo.zip -d /home/claude/ && mv /home/claude/elliot-backbone-backbone-v9-* /home/claude/backbone-v9 && cd /home/claude/backbone-v9 && node .backbone/cli.js pull --force
\`\`\`

`;

  if (params.task) doc += `## Task\n${params.task}\n\n`;
  if (params.status) doc += `## Progress\n${params.status}\n\n`;
  if (params.decisions.length > 0) doc += `## Decisions\n${params.decisions.map(d => `- ${d}`).join('\n')}\n\n`;
  if (allFiles.length > 0) doc += `## Files\n${allFiles.map(f => `- ${f}`).join('\n')}\n\n`;
  if (uncommitted.length > 0) doc += `## Uncommitted (push before pull)\n${uncommitted.map(f => `- ${f}`).join('\n')}\n\n`;
  if (params.blockers.length > 0) doc += `## Blockers\n${params.blockers.map(b => `- ${b}`).join('\n')}\n\n`;
  if (params.next) doc += `## Next Step\n${params.next}\n\n`;
  if (params.context) doc += `## Context\n${params.context}\n\n`;

  doc += `---\n**Resume**: Load workspace, continue from Next Step.`;
  return doc;
}

// Main
const params = parseArgs(process.argv.slice(2));
const handoff = generateHandoff(params);
const filename = `handoff-${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.md`;
const outputPath = join(OUTPUT_DIR, filename);

writeFileSync(outputPath, handoff);

console.log('\n' + '═'.repeat(50));
console.log('COMPACTION HANDOFF');
console.log('═'.repeat(50));
console.log(`Output: ${outputPath}\n`);
console.log('─'.repeat(50));
console.log(handoff);
console.log('─'.repeat(50));
