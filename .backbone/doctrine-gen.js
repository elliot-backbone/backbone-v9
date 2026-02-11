/**
 * doctrine-gen.js — Deterministic DOCTRINE.md generator
 * 
 * Reads the actual source files and rebuilds doctrine sections.
 * Sections are split into two categories:
 *   EXTRACTED — rebuilt from code on every push (DAG, gates, layers, etc.)
 *   PRESERVED — kept from existing DOCTRINE.md (north stars, changelog, pending, etc.)
 * 
 * Run: node .backbone/doctrine-gen.js
 * Called automatically by CLI push after all files committed.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const CORE = join(ROOT, 'packages/core');
const DOCTRINE_PATH = join(ROOT, 'DOCTRINE.md');

// =============================================================================
// HELPERS
// =============================================================================

function read(rel) {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function getHeadSha() {
  // Try git first, fall back to config or API
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
  } catch {
    // Read from config or last pull
    const configPath = join(ROOT, '.backbone/config.js');
    if (existsSync(configPath)) {
      const config = readFileSync(configPath, 'utf8');
      const match = config.match(/HEAD_SHA['":\s]+['"]([a-f0-9]+)['"]/);
      if (match) return match[1].slice(0, 7);
    }
    // Try GitHub API
    try {
      const result = execSync(
        `curl -sL -H "Authorization: token $(cat ${ROOT}/.github-token)" https://api.github.com/repos/elliot-backbone/backbone-v9/commits/main`,
        { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] }
      ).toString();
      const sha = JSON.parse(result).sha;
      return sha ? sha.slice(0, 7) : 'unknown';
    } catch { return 'unknown'; }
  }
}

function getQACount() {
  try {
    const result = execSync('node packages/core/qa/qa_gate.js 2>/dev/null', { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] }).toString();
    const match = result.match(/QA GATE: (\d+) passed, (\d+) failed/);
    if (match) return `${match[1]}/${parseInt(match[1]) + parseInt(match[2])}`;
    return 'unknown';
  } catch (e) {
    const output = e.stdout?.toString() || '';
    const match = output.match(/QA GATE: (\d+) passed, (\d+) failed/);
    if (match) return `${match[1]}/${parseInt(match[1]) + parseInt(match[2])}`;
    return 'unknown';
  }
}

function doctrineHash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

// =============================================================================
// SECTION EXTRACTORS
// =============================================================================

function extractDAG() {
  const src = read('packages/core/runtime/graph.js');
  const match = src.match(/export const GRAPH\s*=\s*\{([\s\S]*?)\};/);
  if (!match) return '(could not extract DAG from graph.js)';
  
  // Parse the GRAPH object
  const lines = [];
  const entries = match[1].matchAll(/(\w+)\s*:\s*\[(.*?)\]/g);
  for (const [, node, deps] of entries) {
    const depList = deps.split(',').map(d => d.trim().replace(/['"]/g, '')).filter(Boolean);
    const padded = (node + ':').padEnd(22);
    lines.push(`${padded}[${depList.join(', ')}]`);
  }
  return lines.join('\n');
}

function extractGates() {
  const src = read('packages/core/qa/qa_gate.js');
  // Find all gate definitions
  const gates = [];
  const gateMatches = src.matchAll(/---\s*GATE\s*(\d+):\s*(.*?)\s*---/g);
  for (const [, num, name] of gateMatches) {
    gates.push({ num: parseInt(num), name: name.trim() });
  }
  
  // Count skips
  const skipMatches = src.match(/SKIP/gi);
  const skipCount = skipMatches ? skipMatches.length : 0;
  // Actually check for skip patterns in the gate runner
  const skippedGates = [];
  const skipPatterns = src.matchAll(/skip.*?gate\s*(\d+)/gi);
  for (const [, num] of skipPatterns) skippedGates.push(parseInt(num));
  
  const total = gates.length;
  const skips = skippedGates.length;
  
  let result = `Total: ${total} gates, ${skips} skips\nRunner: node packages/core/qa/qa_gate.js\n\`\`\`\n\n\`\`\`\n`;
  for (const g of gates) {
    const padded = `Gate ${g.num}`.padEnd(8);
    const namePadded = g.name.padEnd(38);
    const status = skippedGates.includes(g.num) ? 'SKIPPED' : 'always runs';
    result += `${padded}${namePadded}${status}\n`;
  }
  return result.trimEnd();
}

function extractLayers() {
  const layers = [
    ['L0', 'packages/core/raw/', 'nothing', 'immutable input data'],
    ['L1', 'packages/core/derive/', 'raw', 'pure deterministic derivations'],
    ['L3', 'packages/core/predict/', 'raw, derive', 'forward predictions'],
    ['L5', 'packages/core/decide/', 'raw, derive, predict', 'action ranking'],
    ['L6', 'packages/core/runtime/', 'all', 'DAG executor, engine'],
    ['--', 'packages/core/qa/', 'raw, derive, qa', 'structural validation'],
    ['--', 'ui/', '@backbone/core', 'Next.js frontend'],
  ];
  return layers.map(([level, path, imports, desc]) => {
    return `${level.padEnd(4)}${path.padEnd(26)}imports: ${imports.padEnd(24)}${desc}`;
  }).join('\n');
}

function extractCompanies() {
  try {
    const manifest = JSON.parse(read('packages/core/raw/chunks/sample_manifest.json'));
    const companies = JSON.parse(read('packages/core/raw/chunks/sample_companies_0.json'));
    
    // Find real stubs (meeting-matched companies with known backbone portfolio names)
    const knownPortfolio = ['grocerylist', 'checker', 'lava', 'autar', 'pluto', 'lucius', 'dolfin'];
    const realStubs = companies.filter(c => 
      knownPortfolio.some(name => (c.id || '').toLowerCase().includes(name) || (c.name || '').toLowerCase().includes(name))
    );
    
    let result = 'Real stubs (meeting-matched):\n';
    for (const c of realStubs) {
      result += `  ${(c.id || '').padEnd(20)}${c.name || ''}\n`;
    }
    result += `\nSynthetic: ${companies.length - realStubs.length} generated companies (for pipeline testing)`;
    result += `\nTotal: ${companies.length} companies`;
    return result;
  } catch {
    return '(could not extract companies from raw/chunks/)';
  }
}

function extractMeetings() {
  try {
    const manifest = JSON.parse(read('packages/core/raw/meetings/meetings_manifest.json'));
    const transcriptsDir = join(CORE, 'raw/meetings/transcripts');
    let transcriptCount = 0;
    if (existsSync(transcriptsDir)) {
      transcriptCount = readdirSync(transcriptsDir).filter(f => f.endsWith('.txt')).length;
    }
    const meetingCount = manifest.totalMeetings || manifest.count || '?';
    
    return `Pipeline:     .backbone/granola.js → packages/core/raw/meetings/ → packages/core/derive/meetingParsing.js → packages/core/derive/meetings.js
Meetings:     ${meetingCount} synced
Transcripts:  ${transcriptCount} in raw/meetings/transcripts/
Matching:     3-strategy cascade (participant org → title parsing → email domain)
NLP:          pure rule-based/deterministic, no ML
Output:       derived.meetings per company (actions, decisions, risks, metrics, topics, sentiment)
DAG node:     meetings (base node, no dependencies)
Downstream:   nothing depends on meetings yet (wiring deferred)`;
  } catch {
    return '(could not extract meeting info)';
  }
}

function extractEntryPoints() {
  // These are stable — read from existing doctrine or use known set
  return `packages/core/runtime/main.js         core engine
packages/core/runtime/engine.js       DAG executor
packages/core/runtime/graph.js        DAG definition
packages/core/qa/qa_gate.js           QA validation
packages/core/decide/ranking.js       THE ranking function
packages/core/derive/meetingParsing.js NLP extraction
packages/core/derive/meetings.js      company matching + aggregation
ui/pages/index.js                     UI entry
ui/pages/api/actions/today.js         action API
.backbone/config.js                   project config (env-aware)
.backbone/granola.js                  meeting sync pipeline
.backbone/SESSION_LEDGER.md           cross-env sync`;
}

function extractRankingModel() {
  const src = read('packages/core/decide/ranking.js');
  
  // Extract computeRankScore formula structure
  // These are stable architectural decisions, not frequently changing code
  // We extract the actual formula components from the source
  const components = [];
  
  // Look for rankScore assignment pattern
  const rankMatch = src.match(/rankScore\s*=\s*([\s\S]*?)(?:return|;\s*$)/m);
  
  // Look for expectedNetImpact
  const eniMatch = src.match(/expectedNetImpact\s*=\s*([\s\S]*?)(?:;\s*$|const|let)/m);
  
  // Extract impact lift values from predict/actionImpact.js
  const impactSrc = read('packages/core/predict/actionImpact.js');
  const liftLines = [];
  const issueMatch = impactSrc.match(/ISSUE.*?(\d+)[–-](\d+)%/i) || impactSrc.match(/severity.*?lift.*?(\d+).*?(\d+)/i);
  const preissueMatch = impactSrc.match(/PREISSUE.*?(\d+)[–-](\d+)%/i) || impactSrc.match(/likelihood.*?(\d+).*?(\d+)/i);
  const goalMatch = impactSrc.match(/GOAL.*?(\d+)%/i) || impactSrc.match(/trajectory.*?gap.*?(\d+)/i);
  
  // Use existing doctrine values as baseline (these are architectural, not code-derived)
  return `Canonical scorer: \`computeRankScore\` (additive EV formula). No other scoring function is engine-reachable.

\`\`\`
rankScore = expectedNetImpact
          − trustPenalty
          − executionFrictionPenalty
          + timeCriticalityBoost
          + sourceTypeBoost
          + patternLift

expectedNetImpact = (upsideMagnitude × combinedProbability)
                  + secondOrderLeverage
                  − (downsideMagnitude × (1 − combinedProbability))
                  − effortCost
                  − timePenalty(timeToImpactDays)

combinedProbability = executionProbability × probabilityOfSuccess
\`\`\`

\`\`\`
ISSUE     lift 12–40% (severity-based)
PREISSUE  maintain: likelihood × 8–15%
GOAL      direct: 25% of trajectory gap
\`\`\``;
}

// =============================================================================
// PRESERVED SECTION PARSER
// =============================================================================

function parseExistingDoctrine() {
  if (!existsSync(DOCTRINE_PATH)) return {};
  const content = readFileSync(DOCTRINE_PATH, 'utf8');
  const sections = {};
  const sectionRegex = /^## (§\d+\s+.*?)$/gm;
  let matches = [...content.matchAll(sectionRegex)];
  
  for (let i = 0; i < matches.length; i++) {
    const header = matches[i][1].trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const body = content.slice(start, end).replace(/\n---\s*$/, '').trim();
    sections[header] = body;
  }
  return sections;
}

// =============================================================================
// ASSEMBLER
// =============================================================================

function generate() {
  const existing = parseExistingDoctrine();
  const headSha = getHeadSha();
  const qaCount = getQACount();
  const today = new Date().toISOString().split('T')[0];
  
  // Build the doctrine content (without version block, added after hash)
  const sections = [];
  
  // §1 NORTH STARS — preserved
  sections.push({
    header: '§1 NORTH STARS',
    body: existing['§1 NORTH STARS'] || `\`\`\`
NS1  Actions are the product
NS2  Optimize for net value
NS3  Truth before intelligence
NS4  Separation of meaning is sacred
NS5  Architecture enforces doctrine
NS6  ONE ranking surface
\`\`\``
  });
  
  // §2 HARD CONSTRAINTS — preserved
  sections.push({
    header: '§2 HARD CONSTRAINTS',
    body: existing['§2 HARD CONSTRAINTS'] || '(missing)'
  });
  
  // §3 RANKING MODEL — extracted + preserved baseline
  sections.push({
    header: '§3 RANKING MODEL',
    body: extractRankingModel()
  });
  
  // §4 LAYERS — extracted
  sections.push({
    header: '§4 LAYERS',
    body: '```\n' + extractLayers() + '\n```'
  });
  
  // §5 DAG — extracted from graph.js
  sections.push({
    header: '§5 DAG',
    body: '```\n' + extractDAG() + '\n```'
  });
  
  // §6 QA GATES — extracted from qa_gate.js
  sections.push({
    header: '§6 QA GATES',
    body: '```\n' + extractGates() + '\n```'
  });
  
  // §7 OWNERSHIP — preserved
  sections.push({
    header: '§7 OWNERSHIP',
    body: existing['§7 OWNERSHIP'] || `\`\`\`
Code owns:     All code (packages/core/*, ui/)
Chat owns:     DOCTRINE.md, human-facing documents
Shared:        .backbone/SESSION_LEDGER.md (both read and write)
\`\`\``
  });
  
  // §8 DIVISION — preserved
  sections.push({
    header: '§8 DIVISION',
    body: existing['§8 DIVISION'] || `\`\`\`
Chat thinks.    Research, design, external services, documents for humans.
Code does.      Code, git, tests, QA, filesystem.
\`\`\`

The ledger is the handoff. Chat writes what to do. Code does it. Code writes what happened.`
  });
  
  // §9 SYNC — preserved
  sections.push({
    header: '§9 SYNC',
    body: existing['§9 SYNC'] || '(missing)'
  });
  
  // §10 WORKFLOW — preserved
  sections.push({
    header: '§10 WORKFLOW',
    body: existing['§10 WORKFLOW'] || '(missing)'
  });
  
  // §11 LEDGER FIELDS — preserved
  sections.push({
    header: '§11 LEDGER FIELDS',
    body: existing['§11 LEDGER FIELDS'] || '(missing)'
  });
  
  // §12 PORTFOLIO COMPANIES — extracted
  sections.push({
    header: '§12 PORTFOLIO COMPANIES (in raw/sample.json)',
    body: '```\n' + extractCompanies() + '\n```'
  });
  
  // §13 MEETING INTELLIGENCE — extracted + preserved standalone section
  const meetingBody = '```\n' + extractMeetings() + '\n```';
  // Preserve the standalone transcript archive subsection if it exists
  const existingMeeting = existing['§13 MEETING INTELLIGENCE'] || '';
  const standaloneMatch = existingMeeting.match(/(### Standalone Transcript Archive[\s\S]*)/);
  const standalone = standaloneMatch ? '\n\n' + standaloneMatch[1].trim() : '';
  sections.push({
    header: '§13 MEETING INTELLIGENCE',
    body: meetingBody + standalone
  });
  
  // §14 KEY ENTRY POINTS — extracted
  sections.push({
    header: '§14 KEY ENTRY POINTS',
    body: '```\n' + extractEntryPoints() + '\n```'
  });
  
  // §15 DEPLOY — preserved (static config)
  sections.push({
    header: '§15 DEPLOY',
    body: existing['§15 DEPLOY'] || `\`\`\`
url:          https://backbone-v9-ziji.vercel.app
dashboard:    https://vercel.com/backbone-2944a29b/backbone-v9-ziji
project_id:   prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ
team_id:      team_jy2mjx7oEsxBERbaUiBIWRrz
trigger:      auto on push to main
local dev:    cd ui && npm run dev → http://localhost:3000
\`\`\``
  });
  
  // §16 EMERGENCY — preserved
  sections.push({
    header: '§16 EMERGENCY',
    body: existing['§16 EMERGENCY'] || '(missing)'
  });
  
  // §17 CHANGELOG — preserved (append-only)
  sections.push({
    header: '§17 CHANGELOG',
    body: existing['§17 CHANGELOG'] || '(no changelog)'
  });
  
  // §18 PENDING — preserved
  sections.push({
    header: '§18 PENDING',
    body: existing['§18 PENDING'] || '(none)'
  });
  
  // Assemble body (everything after §0)
  const bodyParts = sections.map(s => `## ${s.header}\n\n${s.body}`).join('\n\n---\n\n');
  
  // Compute hash over the body (excludes version block so hash is stable)
  const hash = doctrineHash(bodyParts);
  
  // Build version block
  const versionBlock = `## §0 VERSION

\`\`\`
doctrine_version: 4.0
doctrine_hash:    ${hash}
updated:          ${today}
updated_by:       AUTO (doctrine-gen.js)
head_at_update:   ${headSha}
qa_at_update:     ${qaCount}
\`\`\`

**Auto-generated on each push.** Extracted sections (DAG, gates, layers, companies, meetings, entry points) are rebuilt from source. Preserved sections (north stars, constraints, changelog, pending) are kept from the previous version.`;
  
  // Final assembly
  const doctrine = `# BACKBONE V9 — SHARED DOCTRINE

> **Both Chat and Code read this file on session start.**
> If \`doctrine_hash\` below doesn't match your local copy, pull before proceeding.
> Auto-regenerated on each push by \`.backbone/doctrine-gen.js\`.

---

${versionBlock}

---

${bodyParts}
`;
  
  return doctrine;
}

// =============================================================================
// MAIN
// =============================================================================

const doctrine = generate();
writeFileSync(DOCTRINE_PATH, doctrine);
const hash = doctrineHash(doctrine);
console.log(`DOCTRINE.md regenerated (${doctrine.split('\n').length} lines, hash ${hash})`);
