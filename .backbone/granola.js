#!/usr/bin/env node

/**
 * GRANOLA MCP SYNC
 * Pulls meeting notes from Granola MCP, stores as raw JSON for ETL ingestion.
 * Zero dependencies — uses only Node.js built-ins.
 *
 * Usage: node .backbone/granola.js
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GRANOLA } from './granola-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Logging ──────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(path.join(ROOT, GRANOLA.LOG_FILE), line + '\n');
  } catch { /* ignore */ }
}

// ── Keychain helpers ─────────────────────────────────────────────────────────

function readKeychain() {
  const raw = execSync(
    `security find-generic-password -s "${GRANOLA.KEYCHAIN_SERVICE}" -a "${GRANOLA.KEYCHAIN_ACCOUNT}" -w`,
    { encoding: 'utf8' }
  ).trim();
  return JSON.parse(raw);
}

function writeKeychain(credentials) {
  const json = JSON.stringify(credentials);
  execSync(
    `security add-generic-password -U -s "${GRANOLA.KEYCHAIN_SERVICE}" -a "${GRANOLA.KEYCHAIN_ACCOUNT}" -w '${json.replace(/'/g, "'\\''")}'`,
    { encoding: 'utf8' }
  );
}

function getOAuthTokens(credentials) {
  const mcpOAuth = credentials.mcpOAuth;
  if (!mcpOAuth) throw new Error('No mcpOAuth field in keychain credentials');
  const entry = mcpOAuth[GRANOLA.MCP_ENDPOINT];
  if (!entry) throw new Error(`No OAuth entry for ${GRANOLA.MCP_ENDPOINT}`);
  return entry;
}

// ── Token refresh ────────────────────────────────────────────────────────────

function httpsPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = typeof body === 'string' ? body : JSON.stringify(body);
    const opts = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': headers['Content-Type'] || 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function refreshToken(tokens, credentials) {
  if (!tokens.refreshToken) throw new Error('No refresh token available');

  log('Access token expired, refreshing...');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    client_id: tokens.clientId
  }).toString();

  const res = await httpsPost(GRANOLA.TOKEN_ENDPOINT, body, {
    'Content-Type': 'application/x-www-form-urlencoded'
  });

  if (res.status !== 200) throw new Error(`Token refresh failed (${res.status}): ${res.body}`);

  const data = JSON.parse(res.body);
  const updated = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + (data.expires_in * 1000),
    clientId: tokens.clientId,
    tokenEndpoint: tokens.tokenEndpoint
  };

  // Write back to keychain
  credentials.mcpOAuth[GRANOLA.MCP_ENDPOINT] = updated;
  writeKeychain(credentials);
  log('Token refreshed successfully');
  return updated;
}

async function getValidToken() {
  const credentials = readKeychain();
  let tokens = getOAuthTokens(credentials);

  if (tokens.expiresAt && Date.now() >= tokens.expiresAt - 60000) {
    tokens = await refreshToken(tokens, credentials);
  }

  return tokens.accessToken;
}

// ── MCP call (SSE response parsing) ─────────────────────────────────────────

async function mcpCall(accessToken, toolName, args = {}) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: toolName, arguments: args }
  });

  const parsed = new URL(GRANOLA.MCP_ENDPOINT);
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        try {
          const result = parseSSEResponse(raw);
          resolve(result);
        } catch (err) {
          reject(new Error(`Failed to parse MCP response for ${toolName}: ${err.message}\nRaw: ${raw.slice(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function parseSSEResponse(raw) {
  // SSE format: "event: message\ndata: {JSON-RPC}\n\n"
  // May also be plain JSON if server returns application/json
  const trimmed = raw.trim();

  // Try plain JSON first
  if (trimmed.startsWith('{')) {
    const rpc = JSON.parse(trimmed);
    if (rpc.error) throw new Error(`JSON-RPC error: ${JSON.stringify(rpc.error)}`);
    return extractContent(rpc.result);
  }

  // Parse SSE — find last data: line (the final message event)
  const lines = trimmed.split('\n');
  let lastData = null;
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      lastData = line.slice(6);
    }
  }

  if (!lastData) throw new Error('No data: line found in SSE response');

  const rpc = JSON.parse(lastData);
  if (rpc.error) throw new Error(`JSON-RPC error: ${JSON.stringify(rpc.error)}`);
  return extractContent(rpc.result);
}

function extractContent(result) {
  if (!result || !result.content || !result.content.length) {
    throw new Error('Empty content in MCP result');
  }
  const text = result.content[0].text;
  // Content is usually JSON-encoded text, but Granola returns XML
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ── XML parsing (Granola returns XML-formatted text) ─────────────────────────

function parseMeetingList(xml) {
  const meetings = [];
  const meetingRe = /<meeting\s+id="([^"]+)"\s+title="([^"]+)"\s+date="([^"]+)">/g;
  const participantBlockRe = /<known_participants>\s*([\s\S]*?)\s*<\/known_participants>/g;

  let match;
  const blocks = xml.split(/<meeting\s+/).slice(1); // split by <meeting tags

  for (const block of blocks) {
    const idMatch = block.match(/id="([^"]+)"/);
    const titleMatch = block.match(/title="([^"]+)"/);
    const dateMatch = block.match(/date="([^"]+)"/);
    const partMatch = block.match(/<known_participants>\s*([\s\S]*?)\s*<\/known_participants>/);

    if (!idMatch) continue;

    meetings.push({
      id: idMatch[1],
      title: titleMatch ? titleMatch[1] : 'Untitled',
      date: dateMatch ? dateMatch[1] : null,
      participants: partMatch ? parseParticipants(partMatch[1]) : []
    });
  }
  return meetings;
}

function parseMeetingDetails(xml) {
  const meetings = [];
  const blocks = xml.split(/<meeting\s+/).slice(1);

  for (const block of blocks) {
    const idMatch = block.match(/id="([^"]+)"/);
    const titleMatch = block.match(/title="([^"]+)"/);
    const dateMatch = block.match(/date="([^"]+)"/);
    const partMatch = block.match(/<known_participants>\s*([\s\S]*?)\s*<\/known_participants>/);
    const summaryMatch = block.match(/<summary>\s*([\s\S]*?)\s*<\/summary>/);

    if (!idMatch) continue;

    meetings.push({
      id: idMatch[1],
      title: titleMatch ? titleMatch[1] : 'Untitled',
      date: dateMatch ? dateMatch[1] : null,
      participants: partMatch ? parseParticipants(partMatch[1]) : [],
      summary: summaryMatch ? summaryMatch[1].trim() : ''
    });
  }
  return meetings;
}

function parseParticipants(text) {
  // Format: "Name (note creator) from Org <email>, Name2 <email2>"
  return text.split(',').map(s => s.trim()).filter(Boolean).map(entry => {
    const emailMatch = entry.match(/<([^>]+)>/);
    const email = emailMatch ? emailMatch[1] : '';
    let rest = entry.replace(/<[^>]+>/, '').trim();

    // Remove "(note creator)" tag
    rest = rest.replace(/\(note creator\)/i, '').trim();

    // Extract "from Org" if present
    const orgMatch = rest.match(/\bfrom\s+(.+)$/i);
    const org = orgMatch ? orgMatch[1].trim() : '';
    const name = orgMatch ? rest.slice(0, orgMatch.index).trim() : rest;

    return { name, email, org };
  });
}

// ── State management ─────────────────────────────────────────────────────────

function loadState() {
  const stateFile = path.join(ROOT, GRANOLA.STATE_FILE);
  if (fs.existsSync(stateFile)) {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  }
  return { knownMeetingIds: [], lastSync: null, lastSyncStatus: null };
}

function saveState(state) {
  const stateFile = path.join(ROOT, GRANOLA.STATE_FILE);
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
}

// ── Meeting normalization ────────────────────────────────────────────────────

function normalizeMeeting(m) {
  return {
    id: m.id,
    title: m.title || 'Untitled Meeting',
    date: m.date || null,
    participants: (m.participants || []),
    summary: m.summary || '',
    source: 'granola',
    provenance: 'granola-mcp-sync',
    asOf: new Date().toISOString()
  };
}

// ── Output (chunk/manifest pattern) ──────────────────────────────────────────

function writeOutput(meetings) {
  const outDir = path.join(ROOT, GRANOLA.OUTPUT_DIR);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(ROOT, GRANOLA.TRANSCRIPT_DIR), { recursive: true });

  // Write chunk file
  const chunkFile = 'meetings_0.json';
  fs.writeFileSync(
    path.join(outDir, chunkFile),
    JSON.stringify(meetings, null, 2) + '\n'
  );

  // Write manifest
  const manifest = {
    source: 'granola-mcp-sync',
    baseName: 'meetings',
    generatedAt: new Date().toISOString(),
    chunks: [
      {
        key: 'meetings',
        index: 0,
        file: chunkFile,
        count: meetings.length
      }
    ],
    meta: {
      generatedAt: new Date().toISOString(),
      version: '9.0'
    }
  };
  fs.writeFileSync(
    path.join(outDir, 'meetings_manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );
}

function writeTranscript(meetingId, text) {
  const dir = path.join(ROOT, GRANOLA.TRANSCRIPT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `mtg_${meetingId}.txt`), text);
}

// ── Main sync ────────────────────────────────────────────────────────────────

async function main() {
  log('=== Granola MCP Sync starting ===');
  const state = loadState();

  let accessToken;
  try {
    accessToken = await getValidToken();
  } catch (err) {
    log(`ERROR: Failed to get OAuth token: ${err.message}`);
    state.lastSync = new Date().toISOString();
    state.lastSyncStatus = 'error_auth';
    saveState(state);
    process.exit(1);
  }

  // 1. List meetings
  log('Fetching meeting list...');
  let allMeetings;
  try {
    allMeetings = await mcpCall(accessToken, 'list_meetings', {
      time_range: GRANOLA.LIST_TIME_RANGE
    });
  } catch (err) {
    log(`ERROR: list_meetings failed: ${err.message}`);
    state.lastSync = new Date().toISOString();
    state.lastSyncStatus = 'error_list';
    saveState(state);
    process.exit(1);
  }

  // Parse XML response from Granola MCP
  const meetingList = typeof allMeetings === 'string'
    ? parseMeetingList(allMeetings)
    : (Array.isArray(allMeetings) ? allMeetings : (allMeetings.meetings || []));
  log(`Found ${meetingList.length} meetings in Granola`);

  // 2. Filter to new meetings
  const knownSet = new Set(state.knownMeetingIds);
  const newMeetings = meetingList.filter(m => !knownSet.has(m.id));
  log(`${newMeetings.length} new meetings to fetch`);

  if (newMeetings.length === 0) {
    log('No new meetings — sync complete');
    state.lastSync = new Date().toISOString();
    state.lastSyncStatus = 'success';
    saveState(state);
    return;
  }

  // 3. Get meeting details in batches
  const newIds = newMeetings.map(m => m.id);
  const detailed = [];

  for (let i = 0; i < newIds.length; i += GRANOLA.GET_MEETINGS_BATCH) {
    const batch = newIds.slice(i, i + GRANOLA.GET_MEETINGS_BATCH);
    log(`Fetching details batch ${Math.floor(i / GRANOLA.GET_MEETINGS_BATCH) + 1} (${batch.length} meetings)...`);
    try {
      const result = await mcpCall(accessToken, 'get_meetings', { meeting_ids: batch });
      const items = typeof result === 'string'
        ? parseMeetingDetails(result)
        : (Array.isArray(result) ? result : (result.meetings || [result]));
      detailed.push(...items);
    } catch (err) {
      log(`WARN: get_meetings batch failed: ${err.message}`);
    }
  }

  // 4. Optionally fetch transcripts
  if (GRANOLA.fetchTranscripts) {
    for (const mtg of detailed) {
      try {
        log(`Fetching transcript for ${mtg.id}...`);
        const transcript = await mcpCall(accessToken, 'get_meeting_transcript', { meeting_id: mtg.id });
        const text = typeof transcript === 'string' ? transcript : (transcript.transcript || JSON.stringify(transcript));
        writeTranscript(mtg.id, text);
      } catch (err) {
        log(`WARN: transcript fetch failed for ${mtg.id}: ${err.message}`);
      }
    }
  }

  // 5. Normalize and save
  const normalized = detailed.map(normalizeMeeting);

  // Merge with existing meetings if any
  const outFile = path.join(ROOT, GRANOLA.OUTPUT_DIR, 'meetings_0.json');
  let existing = [];
  if (fs.existsSync(outFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    } catch { /* start fresh */ }
  }

  const merged = [...existing, ...normalized];
  writeOutput(merged);
  log(`Wrote ${merged.length} total meetings (${normalized.length} new)`);

  // 6. Update state
  state.knownMeetingIds = [...new Set([...state.knownMeetingIds, ...newIds])];
  state.lastSync = new Date().toISOString();
  state.lastSyncStatus = 'success';
  state.totalMeetings = merged.length;
  saveState(state);

  log(`=== Sync complete: ${normalized.length} new meetings added ===`);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
