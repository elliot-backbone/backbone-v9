#!/usr/bin/env node

/**
 * SINGLE SOURCE OF TRUTH
 * All references, URLs, and key facts about the project
 * This file is imported by all documentation generators
 */

export const SOURCES = {
  // Repository
  GITHUB_REPO: 'https://github.com/elliot-backbone/backbone-v9',
  GITHUB_ORG: 'elliot-backbone',
  GITHUB_PROJECT: 'backbone-v9',
  
  // Deployment
  VERCEL_URL: 'https://backbone-v9.vercel.app',
  VERCEL_TEAM: 'Backbone',
  VERCEL_PROJECT_ID: 'prj_e6alboLzsUj0TLstVn7LhDI2tM3y',
  VERCEL_DEPLOY_HOOK: 'https://api.vercel.com/v1/integrations/deploy/prj_e6alboLzsUj0TLstVn7LhDI2tM3y/KmvKStfiuE',
  
  // API Endpoints
  API_BASE: 'https://backbone-v9.vercel.app/api',
  API_TODAY: 'https://backbone-v9.vercel.app/api/actions/today',
  API_COMPLETE: 'https://backbone-v9.vercel.app/api/actions/[id]/complete',
  API_SKIP: 'https://backbone-v9.vercel.app/api/actions/[id]/skip',
  
  // Branch
  DEFAULT_BRANCH: 'main',
  
  // Protocols
  PROTOCOLS: ['status', 'qa', 'update', 'reload', 'handover', 'review'],
  
  // QA
  QA_GATE_COUNT: 6,
  
  // Key Files
  KEY_FILES: [
    'qa/qa_gate.js',
    'qa-sweep.js',
    'runtime/main.js',
    'SCHEMA_REFERENCE.md',
    'generate-qa-data.js',
    'generate-scenarios.js',
    '.backbone/protocols.js',
    'DEPLOYMENT.md',
    'PROJECT_INSTRUCTIONS.md',
    'NORTH_STAR_REVIEW.md'
  ],
  
  // Directories
  ARCHITECTURE_DIRS: [
    { path: 'raw', desc: 'Input data layer' },
    { path: 'derive', desc: 'Derived calculations' },
    { path: 'predict', desc: 'Forward predictions' },
    { path: 'decide', desc: 'Action ranking' },
    { path: 'runtime', desc: 'Execution engine' },
    { path: 'qa', desc: 'Quality gates' },
    { path: 'ui', desc: 'Frontend (Next.js)' },
    { path: 'api', desc: 'API server' }
  ],
  
  // Critical Rules
  RULES: [
    'Real output only - never fake examples',
    'Execute on trigger - when user says protocol word, run it',
    'QA gates required - all commits must pass',
    'Dynamic content - all metrics/counts must be live',
    'Protocol menu - shows after every completion',
    'No derived fields in raw data',
    'Event append-only structure',
    'Referential integrity - all IDs must exist',
    'Correct repository URL always',
    'Vercel deployment auto-triggers on push'
  ],
  
  // North Stars
  NORTH_STARS: [
    { name: 'QA-First Development', status: 'ACHIEVED' },
    { name: 'Single-Word Protocol Simplicity', status: 'ACHIEVED' },
    { name: 'Zero Derived Fields in Raw Data', status: 'ACHIEVED' },
    { name: 'Immutable Event Ledger', status: 'ACHIEVED' },
    { name: 'Self-Documenting System', status: 'ACHIEVED' }
  ]
};

// Helper to get commit info
export function getCommitURL(hash) {
  return `${SOURCES.GITHUB_REPO}/commit/${hash}`;
}

// Helper to get API endpoint
export function getAPIEndpoint(path) {
  return `${SOURCES.API_BASE}${path}`;
}

// Helper to format repository reference
export function getRepoReference(commit = 'master') {
  return `${SOURCES.GITHUB_REPO}/tree/${commit}`;
}
