/**
 * GRANOLA MCP SYNC — Configuration
 */

export const GRANOLA = {
  // MCP endpoint
  MCP_ENDPOINT: 'https://mcp.granola.ai/mcp',

  // OAuth
  TOKEN_ENDPOINT: 'https://mcp-auth.granola.ai/oauth2/token',

  // macOS Keychain
  KEYCHAIN_SERVICE: 'Claude Code-credentials',
  KEYCHAIN_ACCOUNT: 'elliotstorey',

  // list_meetings defaults
  LIST_TIME_RANGE: 'last_30_days',   // 'this_week' | 'last_week' | 'last_30_days' | 'custom'
  GET_MEETINGS_BATCH: 10,

  // Feature flags
  fetchTranscripts: false,

  // Paths (relative to project root)
  STATE_FILE: '.backbone/granola-state.json',
  OUTPUT_DIR: 'raw/meetings',
  TRANSCRIPT_DIR: 'raw/meetings/transcripts',
  LOG_FILE: '.backbone/granola-sync.log'
};
