# IMPLEMENTATION CONTRACT: Data Lake Phase 1

> **For:** Claude Code  
> **From:** Claude Chat  
> **Created:** 2026-02-05  
> **Priority:** P1  
> **Spec:** `docs/DATA_LAKE_SPEC.md`

---

## OBJECTIVE

Set up data lake infrastructure (Cloudflare R2 + Supabase) and wire the existing Granola transcript sync to feed into it.

---

## SCOPE

### In Scope
1. Create Cloudflare R2 bucket
2. Create Supabase project with schema
3. Modify `granola-transcripts` sync to upload to R2
4. Build ETL pipeline: R2 → Supabase
5. Backfill existing transcripts from `granola-transcripts/` repo

### Out of Scope
- G-Suite MCP integration (pending MCP installation)
- WhatsApp MCP integration (future)
- Embeddings / pgvector (future)
- Multi-tenant support (not needed)

---

## DELIVERABLES

### D1: R2 Bucket Configuration

```
Bucket name:     backbone-lake
Region:          auto
Access:          private (API keys only)
```

Create and store credentials:
- R2 Access Key ID
- R2 Secret Access Key
- R2 Endpoint URL

Store in:
- `~/.backbone/r2-credentials` (local, gitignored)
- Vercel environment variables (for production ETL)

### D2: Supabase Project

Create project and run schema from `docs/DATA_LAKE_SPEC.md` §3:

Tables required:
- `lake_sync_state`
- `interactions`
- `signals`
- `people`
- `companies`
- `firms`
- `deals`
- `rounds`
- `relationships`
- `goals`
- `action_events`

Views required:
- `v_person_recent_interactions`
- `v_pending_signals`
- `v_company_interaction_recency`

Store credentials:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

### D3: Granola → R2 Upload

Modify `~/granola-transcripts/bin/sync.sh` to:

1. After saving transcript locally, upload to R2
2. Use standard envelope format:

```json
{
  "_lake": {
    "source": "granola",
    "document_type": "meeting_transcript",
    "document_id": "{meeting_id}",
    "ingested_at": "{ISO8601}",
    "ingested_by": "granola-sync-v1",
    "sha256": "{hash}",
    "byte_size": {size}
  },
  "data": { /* original meeting payload */ }
}
```

3. Path convention: `/raw/granola/{YYYY}/{MM}/{DD}/{meeting_id}.json`

4. Idempotent: skip upload if document already exists (check by path or hash)

### D4: ETL Script

Create `backbone-v9/.backbone/etl/granola-to-supabase.js`:

```
Input:  R2 bucket (raw/granola/*)
Output: Supabase tables (interactions, signals)
Trigger: Manual or cron

Logic:
1. Read lake_sync_state for 'granola' source
2. List R2 objects newer than last_sync_at
3. For each document:
   a. Parse envelope
   b. Transform to interaction record
   c. Upsert to interactions table
   d. Extract action_items → insert to signals table
   e. Log progress
4. Update lake_sync_state with new watermark
```

### D5: Backfill Script

Create `backbone-v9/.backbone/etl/backfill-granola.js`:

```
Input:  ~/granola-transcripts/transcripts/*.json (local files)
Output: R2 bucket + Supabase

Logic:
1. List all local transcript files
2. For each file:
   a. Wrap in lake envelope
   b. Upload to R2 (skip if exists)
   c. Run ETL to Supabase
3. Report: X files backfilled, Y skipped, Z errors
```

### D6: Cron Setup

Configure daily ETL run via one of:
- GitHub Actions (preferred, free)
- Vercel Cron
- Cloudflare Worker scheduled trigger

Schedule: 04:00 UTC daily (after Granola sync at midnight)

---

## VERIFICATION CHECKLIST

- [ ] R2 bucket created and accessible via API
- [ ] Supabase project created with all tables
- [ ] `granola-transcripts/bin/sync.sh` uploads to R2
- [ ] Manual ETL run populates interactions table
- [ ] Backfill script processes existing transcripts
- [ ] Cron job configured and triggers successfully
- [ ] Credentials stored securely (not in git)

---

## CREDENTIALS MANAGEMENT

### Local Development

Create `~/.backbone/credentials.env`:

```bash
# R2
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_ENDPOINT=https://{account_id}.r2.cloudflarestorage.com
R2_BUCKET=backbone-lake

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
```

### Production (Vercel)

Add to Vercel project environment variables:
- All R2 credentials
- All Supabase credentials

---

## DEPENDENCIES

### NPM Packages (add to backbone-v9)

```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@supabase/supabase-js": "^2.x"
}
```

### External Accounts Required

1. **Cloudflare account** — for R2 bucket
2. **Supabase account** — for Postgres database

Elliot to create accounts if not existing. Claude Code can proceed with setup once credentials provided.

---

## HANDOFF NOTES

1. **Spec is authoritative** — schema and envelope format defined in `docs/DATA_LAKE_SPEC.md`

2. **Granola transcript format** — existing files in `~/granola-transcripts/transcripts/` are JSON with structure:
   ```json
   {
     "id": "mtg_xxx",
     "title": "...",
     "started_at": "ISO8601",
     "participants": [...],
     "transcript": "...",
     "action_items": [...]
   }
   ```

3. **R2 is S3-compatible** — use AWS SDK with custom endpoint

4. **Single-tenant** — no user isolation needed, no RLS complexity

5. **Idempotency** — all operations must be safe to re-run (upsert, skip-if-exists)

---

## SUCCESS CRITERIA

After implementation:

1. New Granola meetings automatically land in R2 within 24 hours
2. ETL populates Supabase `interactions` table daily
3. Action items extracted to `signals` table
4. Existing 25 transcripts backfilled
5. `node .backbone/etl/granola-to-supabase.js` runs without errors
6. Query works: `SELECT * FROM interactions WHERE source = 'granola'`

---

## QUESTIONS FOR ELLIOT (before starting)

1. Do you have a Cloudflare account? If not, create one at https://dash.cloudflare.com
2. Do you have a Supabase account? If not, create one at https://supabase.com
3. Confirm: backfill all existing transcripts, or start fresh from today?

Once accounts exist, provide Claude Code with:
- Cloudflare account ID (for R2 endpoint)
- R2 API token (create at Cloudflare dashboard → R2 → Manage API tokens)
- Supabase project URL and keys (from project settings → API)
