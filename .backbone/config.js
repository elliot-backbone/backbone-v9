#!/usr/bin/env node

/**
 * BACKBONE V9 - CONFIGURATION
 * Centralized project references and settings
 * 
 * Environment-aware: detects Chat sandbox vs Claude Code vs local dev.
 * WORKSPACE_PATH resolves automatically based on where the CLI is run.
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Detect workspace path: use repo root (parent of .backbone/)
const __config_filename = fileURLToPath(import.meta.url);
const __config_dirname = dirname(__config_filename);
const DETECTED_WORKSPACE = resolve(__config_dirname, '..');

// Detect environment
const HAS_GIT = existsSync(resolve(DETECTED_WORKSPACE, '.git'));
const IS_CHAT_SANDBOX = DETECTED_WORKSPACE.startsWith('/home/claude');
const ENVIRONMENT = HAS_GIT ? 'CODE' : (IS_CHAT_SANDBOX ? 'CHAT' : 'LOCAL');

export const CONFIG = {
  // Repository
  GITHUB_REPO: 'https://github.com/elliot-backbone/backbone-v9',
  GITHUB_API_ZIP: 'https://api.github.com/repos/elliot-backbone/backbone-v9/zipball/main',
  GITHUB_ORG: 'elliot-backbone',
  GITHUB_PROJECT: 'backbone-v9',
  WORKSPACE_PATH: DETECTED_WORKSPACE,
  
  // Environment detection
  ENVIRONMENT,       // 'CODE' | 'CHAT' | 'LOCAL'
  HAS_GIT,           // true if .git exists (Code or local dev)
  IS_CHAT_SANDBOX,   // true if running in /home/claude
  
  // Deployment - Vercel MCP Connector
  VERCEL_URL: 'https://backbone-v9-ziji.vercel.app',
  VERCEL_DASHBOARD: 'https://vercel.com/backbone-2944a29b/backbone-v9-ziji',
  VERCEL_PROJECT: 'backbone-v9-ziji',
  VERCEL_PROJECT_ID: 'prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ',
  VERCEL_TEAM_ID: 'team_jy2mjx7oEsxBERbaUiBIWRrz',
  VERCEL_TEAM_SLUG: 'backbone-2944a29b',
  VERCEL_DEPLOY_HOOK: 'https://api.vercel.com/v1/integrations/deploy/prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ/N4YZcrsGXs',
  
  // API Endpoints
  API_BASE: 'https://backbone-v9-ziji.vercel.app/api',
  API_TODAY: 'https://backbone-v9-ziji.vercel.app/api/actions/today',
  API_COMPLETE: 'https://backbone-v9-ziji.vercel.app/api/actions/[id]/complete',
  API_SKIP: 'https://backbone-v9-ziji.vercel.app/api/actions/[id]/skip',
  
  // Branch
  DEFAULT_BRANCH: 'main',
  
  // CLI Commands
  COMMANDS: ['status', 'qa', 'deploy', 'pull', 'handover', 'review'],
  
  // QA
  QA_GATE_COUNT: 18,
  
  // Architecture
  DIRECTORIES: [
    { path: 'raw', desc: 'Input data layer' },
    { path: 'raw/meetings', desc: 'Granola meeting notes (daily sync)' },
    { path: 'derive', desc: 'Derived calculations' },
    { path: 'predict', desc: 'Forward predictions' },
    { path: 'decide', desc: 'Action ranking' },
    { path: 'runtime', desc: 'Execution engine' },
    { path: 'qa', desc: 'Quality gates' },
    { path: 'ui', desc: 'Frontend (Next.js)' }
  ],
  
  // Milestones
  MILESTONES: [
    { name: 'QA-First Development', status: 'ACHIEVED' },
    { name: 'CLI Tooling', status: 'ACHIEVED' },
    { name: 'Zero Derived Fields in Raw Data', status: 'ACHIEVED' },
    { name: 'Immutable Event Ledger', status: 'ACHIEVED' },
    { name: 'Auto-Deploy Pipeline', status: 'ACHIEVED' }
  ]
};

export function getCommitURL(hash) {
  return `${CONFIG.GITHUB_REPO}/commit/${hash}`;
}

export function getAPIEndpoint(path) {
  return `${CONFIG.API_BASE}${path}`;
}
