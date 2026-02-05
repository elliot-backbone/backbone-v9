# Backbone V9 — Data Lake Architecture Spec

> **Status:** DRAFT  
> **Created:** 2026-02-05  
> **Purpose:** Unified landing zone for all raw/semi-structured data sources, with structured extraction to production database.

---

## §1 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA SOURCES (MCPs)                              │
├──────────────────┬──────────────────┬──────────────────┬────────────────────┤
│   Granola MCP    │   G-Suite MCP    │  WhatsApp MCP    │   (future MCPs)    │
│   transcripts    │   emails, cal    │   messages       │   linkedin, etc    │
└────────┬─────────┴────────┬─────────┴────────┬─────────┴──────────┬─────────┘
         │                  │                  │                    │
         ▼                  ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAKE: Cloudflare R2                            │
│                                                                             │
│  bucket: backbone-lake                                                      │
│  ├── /raw/granola/2026/02/05/{meeting_id}.json                             │
│  ├── /raw/gsuite/emails/2026/02/05/{message_id}.json                       │
│  ├── /raw/gsuite/calendar/2026/02/05/{event_id}.json                       │
│  ├── /raw/whatsapp/2026/02/05/{chat_id}_{timestamp}.json                   │
│  └── /raw/{source}/{date}/*.json                                           │
│                                                                             │
│  Properties:                                                                │
│  - Append-only (immutable raw data)                                         │
│  - Schema-on-read (no enforcement at write time)                            │
│  - Partitioned by source + date for efficient scans                         │
│  - Retention: indefinite (cheap storage)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (nightly ETL cron)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRODUCTION DB: Supabase (Postgres)                     │
│                                                                             │
│  Structured tables derived from raw lake data:                              │
│  - interactions (meetings, emails, messages → normalized)                   │
│  - signals (extracted intents, sentiments, action items)                    │
│  - lake_sync_state (ETL watermarks, dedup tracking)                         │
│                                                                             │
│  Existing backbone tables (migrate from JSON):                              │
│  - people, companies, firms, deals, rounds, relationships, goals            │
│                                                                             │
│  Future:                                                                    │
│  - embeddings (pgvector for semantic search)                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (API query or JSON export)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           backbone-v9 runtime                               │
│                                                                             │
│  Option A: Query Supabase directly from API routes                          │
│  Option B: Nightly export to raw/*.json (current model, offline-capable)    │
│  Option C: Hybrid (Supabase for fresh data, JSON for bulk/offline)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## §2 R2 BUCKET STRUCTURE

### Bucket Configuration

```
Bucket name:    backbone-lake
Region:         auto (Cloudflare edge)
Storage class:  Standard
Public access:  disabled
```

### Path Convention

```
/raw/{source}/{year}/{month}/{day}/{document_id}.json

Examples:
/raw/granola/2026/02/05/mtg_abc123.json
/raw/gsuite/emails/2026/02/05/msg_def456.json
/raw/gsuite/calendar/2026/02/05/evt_ghi789.json
/raw/whatsapp/2026/02/05/chat_447xxx_1738800000.json
```

### Document Envelope

Every document in the lake uses a standard envelope:

```json
{
  "_lake": {
    "source": "granola",
    "document_type": "meeting_transcript",
    "document_id": "mtg_abc123",
    "ingested_at": "2026-02-05T04:30:00Z",
    "ingested_by": "granola-sync-v1",
    "sha256": "a1b2c3...",
    "byte_size": 45678
  },
  "data": {
    // Original payload from source, unmodified
  }
}
```

### Source-Specific Schemas

#### Granola (meeting transcripts)

```
Path: /raw/granola/{year}/{month}/{day}/{meeting_id}.json

data: {
  id: string,
  title: string,
  started_at: ISO8601,
  ended_at: ISO8601,
  duration_minutes: number,
  participants: [{ name, email? }],
  transcript: string | null,
  summary: string | null,
  action_items: [string] | null,
  source_url: string | null
}
```

#### G-Suite Emails

```
Path: /raw/gsuite/emails/{year}/{month}/{day}/{message_id}.json

data: {
  id: string,
  thread_id: string,
  from: { name, email },
  to: [{ name, email }],
  cc: [{ name, email }],
  subject: string,
  body_text: string,
  body_html: string | null,
  received_at: ISO8601,
  labels: [string],
  attachments: [{ name, mime_type, size_bytes }]
}
```

#### G-Suite Calendar

```
Path: /raw/gsuite/calendar/{year}/{month}/{day}/{event_id}.json

data: {
  id: string,
  calendar_id: string,
  title: string,
  description: string | null,
  start: ISO8601,
  end: ISO8601,
  all_day: boolean,
  location: string | null,
  attendees: [{ name, email, response_status }],
  organizer: { name, email },
  recurring: boolean,
  meeting_link: string | null
}
```

#### WhatsApp

```
Path: /raw/whatsapp/{year}/{month}/{day}/{chat_id}_{timestamp}.json

data: {
  chat_id: string,
  chat_name: string,
  is_group: boolean,
  messages: [{
    id: string,
    from: { phone, name },
    timestamp: ISO8601,
    type: "text" | "image" | "document" | "voice" | "video",
    body: string | null,
    media_url: string | null,
    quoted_message_id: string | null
  }]
}
```

---

## §3 SUPABASE SCHEMA

### Core Tables

```sql
-- ============================================================================
-- LAKE SYNC STATE (ETL bookkeeping)
-- ============================================================================

CREATE TABLE lake_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,              -- 'granola', 'gsuite_email', 'whatsapp'
  last_sync_at TIMESTAMPTZ NOT NULL,
  last_document_id TEXT,
  documents_processed INT DEFAULT 0,
  errors INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_lake_sync_source ON lake_sync_state(source);

-- ============================================================================
-- INTERACTIONS (unified view of all communications)
-- ============================================================================

CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source tracking
  source TEXT NOT NULL,              -- 'granola', 'gsuite_email', 'gsuite_calendar', 'whatsapp'
  source_id TEXT NOT NULL,           -- Original ID from source system
  lake_path TEXT NOT NULL,           -- R2 path for raw document
  
  -- Core fields
  interaction_type TEXT NOT NULL,    -- 'meeting', 'email', 'message', 'calendar_event'
  direction TEXT,                    -- 'inbound', 'outbound', 'bidirectional'
  
  -- Timing
  occurred_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT,
  
  -- Content
  title TEXT,
  summary TEXT,
  body_text TEXT,
  
  -- Participants (denormalized for query speed)
  participant_emails TEXT[],
  participant_names TEXT[],
  participant_count INT,
  
  -- Extracted entities (populated by ETL)
  mentioned_company_ids UUID[],
  mentioned_person_ids UUID[],
  mentioned_deal_ids UUID[],
  
  -- Metadata
  raw_metadata JSONB,                -- Source-specific fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source, source_id)
);

CREATE INDEX idx_interactions_occurred ON interactions(occurred_at DESC);
CREATE INDEX idx_interactions_source ON interactions(source, occurred_at DESC);
CREATE INDEX idx_interactions_participants ON interactions USING GIN(participant_emails);
CREATE INDEX idx_interactions_companies ON interactions USING GIN(mentioned_company_ids);
CREATE INDEX idx_interactions_people ON interactions USING GIN(mentioned_person_ids);

-- ============================================================================
-- SIGNALS (extracted insights from interactions)
-- ============================================================================

CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source
  interaction_id UUID REFERENCES interactions(id),
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  
  -- Signal classification
  signal_type TEXT NOT NULL,         -- 'action_item', 'commitment', 'concern', 'opportunity', 'sentiment', 'mention'
  signal_subtype TEXT,               -- e.g., 'follow_up', 'intro_request', 'deadline'
  
  -- Content
  content TEXT NOT NULL,             -- The extracted signal text
  context TEXT,                      -- Surrounding context
  
  -- Attribution
  attributed_to_email TEXT,
  attributed_to_person_id UUID,
  
  -- Entities
  related_company_id UUID,
  related_deal_id UUID,
  related_goal_id UUID,
  
  -- Confidence & status
  confidence FLOAT DEFAULT 1.0,      -- ETL confidence score
  status TEXT DEFAULT 'pending',     -- 'pending', 'actioned', 'dismissed'
  actioned_at TIMESTAMPTZ,
  
  -- Timing
  occurred_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ,                -- For action items with deadlines
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_type ON signals(signal_type, status);
CREATE INDEX idx_signals_occurred ON signals(occurred_at DESC);
CREATE INDEX idx_signals_person ON signals(attributed_to_person_id);
CREATE INDEX idx_signals_company ON signals(related_company_id);
CREATE INDEX idx_signals_interaction ON signals(interaction_id);

-- ============================================================================
-- EXISTING BACKBONE ENTITIES (migrate from JSON)
-- ============================================================================

-- People
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  company_id UUID,
  role TEXT,
  relationship_strength FLOAT,
  last_interaction_at TIMESTAMPTZ,
  tags TEXT[],
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_people_email ON people(email) WHERE email IS NOT NULL;

-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  stage TEXT,                        -- 'seed', 'series_a', etc.
  sector TEXT,
  location TEXT,
  employee_count INT,
  is_portfolio BOOLEAN DEFAULT FALSE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_companies_domain ON companies(domain) WHERE domain IS NOT NULL;

-- Firms (VC/investors)
CREATE TABLE firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,                         -- 'vc', 'angel', 'corporate', 'bank'
  aum_millions FLOAT,
  stage_focus TEXT[],
  sector_focus TEXT[],
  location TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  stage TEXT,                        -- 'sourcing', 'dd', 'termsheet', 'closed', 'passed'
  lead_partner TEXT,
  introduced_by UUID REFERENCES people(id),
  first_meeting_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  expected_close_at TIMESTAMPTZ,
  check_size_millions FLOAT,
  valuation_millions FLOAT,
  notes TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_company ON deals(company_id);
CREATE INDEX idx_deals_stage ON deals(stage);

-- Rounds
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  round_type TEXT,                   -- 'seed', 'series_a', etc.
  amount_millions FLOAT,
  valuation_millions FLOAT,
  announced_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  lead_investor_id UUID REFERENCES firms(id),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rounds_company ON rounds(company_id);

-- Relationships
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id),
  entity_type TEXT NOT NULL,         -- 'company', 'firm', 'person'
  entity_id UUID NOT NULL,
  relationship_type TEXT,            -- 'founder', 'investor', 'advisor', 'board_member', 'knows'
  strength FLOAT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_relationships_person ON relationships(person_id);
CREATE INDEX idx_relationships_entity ON relationships(entity_type, entity_id);

-- Goals
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,         -- 'company', 'deal', 'person', 'portfolio'
  entity_id UUID,
  goal_type TEXT NOT NULL,
  description TEXT,
  target_value FLOAT,
  current_value FLOAT,
  weight FLOAT DEFAULT 1.0,
  due_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',      -- 'active', 'achieved', 'abandoned'
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_entity ON goals(entity_type, entity_id);
CREATE INDEX idx_goals_status ON goals(status);

-- ============================================================================
-- ACTION EVENTS (migrate from Redis)
-- ============================================================================

CREATE TABLE action_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id TEXT NOT NULL,
  event_type TEXT NOT NULL,          -- 'proposed', 'executed', 'skipped', 'observed'
  timestamp TIMESTAMPTZ NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_action_events_action ON action_events(action_id);
CREATE INDEX idx_action_events_type ON action_events(event_type, timestamp DESC);
CREATE INDEX idx_action_events_time ON action_events(timestamp DESC);
```

### Views

```sql
-- Recent interactions per person
CREATE VIEW v_person_recent_interactions AS
SELECT 
  p.id AS person_id,
  p.name,
  p.email,
  i.id AS interaction_id,
  i.interaction_type,
  i.title,
  i.occurred_at,
  i.summary
FROM people p
JOIN interactions i ON p.email = ANY(i.participant_emails)
ORDER BY i.occurred_at DESC;

-- Pending signals (action items, follow-ups)
CREATE VIEW v_pending_signals AS
SELECT 
  s.*,
  i.title AS interaction_title,
  i.interaction_type,
  p.name AS attributed_to_name,
  c.name AS related_company_name
FROM signals s
LEFT JOIN interactions i ON s.interaction_id = i.id
LEFT JOIN people p ON s.attributed_to_person_id = p.id
LEFT JOIN companies c ON s.related_company_id = c.id
WHERE s.status = 'pending'
ORDER BY 
  CASE WHEN s.due_at IS NOT NULL THEN 0 ELSE 1 END,
  s.due_at ASC NULLS LAST,
  s.occurred_at DESC;

-- Days since last interaction per company
CREATE VIEW v_company_interaction_recency AS
SELECT 
  c.id,
  c.name,
  c.is_portfolio,
  MAX(i.occurred_at) AS last_interaction_at,
  EXTRACT(DAY FROM NOW() - MAX(i.occurred_at)) AS days_since_interaction,
  COUNT(i.id) AS total_interactions
FROM companies c
LEFT JOIN interactions i ON c.id = ANY(i.mentioned_company_ids)
GROUP BY c.id, c.name, c.is_portfolio;
```

---

## §4 ETL PIPELINE

### Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  R2 Bucket  │────▶│  ETL Worker │────▶│  Supabase   │
│  (raw JSON) │     │  (daily)    │     │  (Postgres) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  backbone   │
                    │  raw/*.json │
                    └─────────────┘
```

### ETL Jobs

#### 1. Lake Ingestion (per source)

Each MCP sync script uploads to R2:

```javascript
// granola-sync uploads to R2 after local save
async function uploadToLake(meeting) {
  const date = meeting.started_at.slice(0, 10).replace(/-/g, '/');
  const path = `raw/granola/${date}/${meeting.id}.json`;
  
  const envelope = {
    _lake: {
      source: 'granola',
      document_type: 'meeting_transcript',
      document_id: meeting.id,
      ingested_at: new Date().toISOString(),
      ingested_by: 'granola-sync-v1',
      sha256: computeSha256(JSON.stringify(meeting)),
      byte_size: Buffer.byteLength(JSON.stringify(meeting))
    },
    data: meeting
  };
  
  await r2.put(path, JSON.stringify(envelope));
}
```

#### 2. Lake → Supabase ETL (nightly)

```javascript
// Runs daily via cron (Vercel cron, GitHub Actions, or Cloudflare Worker)
async function etlGranolaToSupabase() {
  // Get last sync state
  const { data: syncState } = await supabase
    .from('lake_sync_state')
    .select('*')
    .eq('source', 'granola')
    .single();
  
  const lastSync = syncState?.last_sync_at || '1970-01-01';
  
  // List new documents in R2
  const objects = await r2.list({
    prefix: 'raw/granola/',
    // Filter by date > lastSync
  });
  
  for (const obj of objects) {
    const doc = await r2.get(obj.key);
    const { _lake, data } = JSON.parse(doc);
    
    // Skip if already processed
    if (_lake.ingested_at <= lastSync) continue;
    
    // Transform to interaction
    const interaction = {
      source: 'granola',
      source_id: data.id,
      lake_path: obj.key,
      interaction_type: 'meeting',
      direction: 'bidirectional',
      occurred_at: data.started_at,
      duration_minutes: data.duration_minutes,
      title: data.title,
      summary: data.summary,
      body_text: data.transcript,
      participant_emails: data.participants.map(p => p.email).filter(Boolean),
      participant_names: data.participants.map(p => p.name),
      participant_count: data.participants.length,
      raw_metadata: data
    };
    
    // Upsert to Supabase
    await supabase.from('interactions').upsert(interaction, {
      onConflict: 'source,source_id'
    });
    
    // Extract signals (action items, etc.)
    if (data.action_items) {
      for (const item of data.action_items) {
        await supabase.from('signals').insert({
          interaction_id: interaction.id,
          source: 'granola',
          source_id: `${data.id}_action_${index}`,
          signal_type: 'action_item',
          content: item,
          occurred_at: data.started_at,
          confidence: 0.9
        });
      }
    }
  }
  
  // Update sync state
  await supabase.from('lake_sync_state').upsert({
    source: 'granola',
    last_sync_at: new Date().toISOString(),
    documents_processed: objects.length
  });
}
```

#### 3. Entity Resolution (weekly or on-demand)

Match people/companies mentioned in interactions to existing entities:

```javascript
async function resolveEntities() {
  // Get interactions with unresolved mentions
  const { data: interactions } = await supabase
    .from('interactions')
    .select('*')
    .is('mentioned_person_ids', null)
    .limit(100);
  
  for (const interaction of interactions) {
    const personIds = [];
    
    for (const email of interaction.participant_emails) {
      // Find or create person
      let { data: person } = await supabase
        .from('people')
        .select('id')
        .eq('email', email)
        .single();
      
      if (!person) {
        const name = interaction.participant_names[
          interaction.participant_emails.indexOf(email)
        ];
        const { data: newPerson } = await supabase
          .from('people')
          .insert({ email, name })
          .select('id')
          .single();
        person = newPerson;
      }
      
      personIds.push(person.id);
    }
    
    // Update interaction with resolved IDs
    await supabase
      .from('interactions')
      .update({ mentioned_person_ids: personIds })
      .eq('id', interaction.id);
  }
}
```

---

## §5 INTEGRATION WITH BACKBONE-V9

### Option A: Direct Supabase Queries (recommended)

Update API routes to query Supabase instead of JSON files:

```javascript
// ui/pages/api/entities.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { type } = req.query;
  
  const { data, error } = await supabase
    .from(type) // 'people', 'companies', etc.
    .select('*')
    .limit(1000);
  
  if (error) return res.status(500).json({ error });
  return res.json(data);
}
```

### Option B: Nightly JSON Export

Keep current architecture, export from Supabase to raw/*.json:

```javascript
// .backbone/export-from-supabase.js
async function exportToJson() {
  const tables = ['people', 'companies', 'firms', 'deals', 'rounds', 'relationships', 'goals'];
  
  for (const table of tables) {
    const { data } = await supabase.from(table).select('*');
    
    writeFileSync(
      `raw/chunks/sample_${table}_0.json`,
      JSON.stringify(data, null, 2)
    );
  }
  
  // Update manifest
  const manifest = {
    exported_at: new Date().toISOString(),
    tables: tables.map(t => ({
      name: t,
      file: `sample_${t}_0.json`,
      count: data.length
    }))
  };
  writeFileSync('raw/chunks/sample_manifest.json', JSON.stringify(manifest, null, 2));
}
```

### New Derived Signals

Wire signals table into backbone derive layer:

```javascript
// derive/signalMetrics.js
export function computeSignalMetrics(signals, interactions) {
  const pending = signals.filter(s => s.status === 'pending');
  const overdue = pending.filter(s => s.due_at && new Date(s.due_at) < new Date());
  
  return {
    pendingCount: pending.length,
    overdueCount: overdue.length,
    signalsByType: groupBy(pending, 'signal_type'),
    oldestPending: pending.sort((a, b) => 
      new Date(a.occurred_at) - new Date(b.occurred_at)
    )[0]
  };
}
```

Wire into preissues:

```javascript
// predict/preissues.js - add signal-based preissues
function detectSignalPreissues(signals, people) {
  const preissues = [];
  
  // Overdue action items
  const overdue = signals.filter(s => 
    s.signal_type === 'action_item' && 
    s.status === 'pending' &&
    s.due_at && new Date(s.due_at) < new Date()
  );
  
  for (const signal of overdue) {
    preissues.push({
      type: 'overdue_action_item',
      severity: 'medium',
      entity: signal.attributed_to_person_id,
      description: `Overdue action item: ${signal.content}`,
      signal_id: signal.id
    });
  }
  
  return preissues;
}
```

---

## §6 IMPLEMENTATION ROADMAP

### Phase 1: Infrastructure (Day 1)

- [ ] Create Cloudflare R2 bucket `backbone-lake`
- [ ] Create Supabase project
- [ ] Run schema migrations
- [ ] Set up env vars in Vercel

### Phase 2: Granola Integration (Day 2-3)

- [ ] Modify `granola-transcripts/bin/sync.sh` to upload to R2
- [ ] Write ETL script: R2 → Supabase interactions
- [ ] Test with existing transcripts
- [ ] Set up daily cron (GitHub Actions or Vercel cron)

### Phase 3: Backbone Integration (Day 4-5)

- [ ] Add Supabase client to backbone-v9
- [ ] Create API route for interactions
- [ ] Wire signals into preissues detection
- [ ] Wire interactions into "no contact in X days" detection

### Phase 4: Additional MCPs (Future)

- [ ] G-Suite MCP → R2 pipeline
- [ ] WhatsApp MCP → R2 pipeline
- [ ] Entity resolution across sources
- [ ] Embeddings + semantic search (pgvector)

---

## §7 COST ESTIMATES

### Cloudflare R2

```
Storage:     $0.015/GB/month
Operations:  $0.36/million Class A (writes)
             $0.36/million Class B (reads)
Egress:      FREE

Estimate (1 year):
- 10GB raw data: $1.80/year
- 1M writes: $0.36/year
- 10M reads: $3.60/year
Total: ~$6/year
```

### Supabase

```
Free tier:
- 500MB database
- 1GB file storage
- 2GB bandwidth
- 50K monthly active users

Pro tier ($25/month):
- 8GB database
- 100GB file storage
- 250GB bandwidth

Estimate: FREE for 6-12 months, then $25/month
```

### Total Year 1: ~$6 (R2) + $0-150 (Supabase) = $6-156

---

## §8 SECURITY CONSIDERATIONS

1. **R2 bucket**: Private, access via API keys only
2. **Supabase**: Row-level security (RLS) enabled, service key for ETL only
3. **Env vars**: Store in Vercel, never commit
4. **PII**: Transcripts contain names/emails — ensure GDPR compliance if EU data
5. **Retention**: Define policy (e.g., delete raw after 2 years, keep aggregates)

---

## §9 OPEN QUESTIONS

1. **Backfill**: Import existing `granola-transcripts/` repo into R2?
2. **Real-time option**: If latency requirements change, add Supabase real-time subscriptions?
3. **Embeddings**: When to add pgvector for semantic search over transcripts?
4. **Multi-tenant**: Will this ever support multiple users/orgs, or single-tenant only?
