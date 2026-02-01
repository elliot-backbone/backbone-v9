#!/usr/bin/env node

/**
 * BACKBONE V9 - CONFIGURATION
 * Centralized project references and settings
 */

export const CONFIG = {
  // Repository
  GITHUB_REPO: 'https://github.com/elliot-backbone/backbone-v9',
  GITHUB_API_ZIP: 'https://api.github.com/repos/elliot-backbone/backbone-v9/zipball/main',
  GITHUB_ORG: 'elliot-backbone',
  GITHUB_PROJECT: 'backbone-v9',
  WORKSPACE_PATH: '/home/claude/backbone-v9',
  
  // Deployment
  VERCEL_URL: 'https://backbone-v9-ziji.vercel.app',
  VERCEL_DASHBOARD: 'https://vercel.com/backbone/backbone-v9-ziji',
  VERCEL_PROJECT: 'backbone-v9-ziji',
  VERCEL_TEAM: 'Backbone',
  VERCEL_PROJECT_ID: 'prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ',
  VERCEL_DEPLOY_HOOK: 'https://api.vercel.com/v1/integrations/deploy/prj_p0TqhP8riVcGFYxkq39Pnh9adjbQ/o9szWFYCRd',
  
  // API Endpoints
  API_BASE: 'https://backbone-v9.vercel.app/api',
  API_TODAY: 'https://backbone-v9.vercel.app/api/actions/today',
  API_COMPLETE: 'https://backbone-v9.vercel.app/api/actions/[id]/complete',
  API_SKIP: 'https://backbone-v9.vercel.app/api/actions/[id]/skip',
  
  // Branch
  DEFAULT_BRANCH: 'main',
  
  // CLI Commands
  COMMANDS: ['status', 'qa', 'deploy', 'pull', 'handover', 'review'],
  
  // QA
  QA_GATE_COUNT: 6,
  
  // Architecture
  DIRECTORIES: [
    { path: 'raw', desc: 'Input data layer' },
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
