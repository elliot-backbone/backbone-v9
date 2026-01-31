# Backbone V9 Data Schema Reference

**Purpose**: Exhaustive schema documentation for generating QA-valid sample data.

**Version**: 9.1.0  
**Updated**: 2026-01-30

---

## Core Principles

### Storage Rules (NS3: No Stored Derivations)
- **RAW ONLY**: Companies, People, Relationships, Goals, Deals, IntroOutcomes, ActionEvents
- **DERIVED ONLY**: Health, Runway, Trajectories, Priorities, Actions, Ripple, Calibration
- **FORBIDDEN IN RAW**: Any field from the FORBIDDEN list (see QA Gate section)

### Provenance Tracking
Every raw entity must have:
- `asOf`: ISO timestamp when data was captured
- `provenance`: One of `["manual", "import", "sync", "derived"]`

---

## 1. COMPANIES

**Location**: `rawData.companies[]`

### Required Fields
```typescript
{
  id: string,                    // Unique identifier (kebab-case)
  name: string,                  // Display name
  tagline: string,               // One-line description
  stage: enum,                   // See STAGE_ENUM
  burn: number,                  // Monthly burn rate (USD)
  cash: number,                  // Cash on hand (USD)
  employees: number,             // Headcount
  hq: string,                    // City
  sector: string,                // Industry sector
  color: string,                 // Tailwind gradient classes
  raising: boolean,              // Currently fundraising?
  roundTarget: number,           // Target raise (USD, 0 if not raising)
  founderPersonIds: string[],    // Array of person IDs
  asOf: string,                  // ISO timestamp
  provenance: string             // One of: manual|import|sync
}
```

### Optional Fields
```typescript
{
  mrr?: number,                  // Monthly recurring revenue (USD)
  // NOTE: If mrr exists, arr MUST NOT exist (QA Gate B2)
  arr?: number,                  // Annual recurring revenue (USD, only if no mrr)
  investors?: string[],          // Array of investor IDs
  website?: string,              // URL
  notes?: string                 // Freeform notes
}
```

### Nested: Founders
```typescript
founders: [
  {
    name: string,                // Full name
    role: string,                // e.g., "CEO", "CTO"
    bio: string                  // Background summary
  }
]
```

### Nested: Goals
```typescript
goals: [
  {
    id: string,                  // Unique within company (e.g., "v1", "n2")
    type: enum,                  // See GOAL_TYPE_ENUM
    name: string,                // Display name
    current: number,             // Progress value
    target: number,              // Target value
    due: string,                 // ISO date (YYYY-MM-DD or full ISO)
    status: enum,                // See GOAL_STATUS_ENUM
    asOf: string,                // ISO timestamp
    provenance: string           // manual|import|sync
  }
]
```

### Nested: Deals
```typescript
deals: [
  {
    id: string,                  // Unique (e.g., "d-vel-1")
    investorId: string,          // Links to investors array
    investor: string,            // Investor name (denormalized)
    status: enum,                // See DEAL_STATUS_ENUM
    probability: number,         // 0-100
    amount: number,              // USD
    asOf: string,                // ISO timestamp
    provenance: string           // manual|import|sync
  }
]
```

### ENUMS

```javascript
STAGE_ENUM = [
  "Pre-seed",
  "Seed", 
  "Series A",
  "Series B",
  "Series C+",
  "Growth"
]

GOAL_TYPE_ENUM = [
  "revenue",      // MRR/ARR targets
  "product",      // Product milestones
  "fundraise",    // Fundraising goals
  "hiring",       // Team growth
  "partnership"   // Strategic partnerships
]

GOAL_STATUS_ENUM = [
  "active",       // In progress
  "completed",    // Achieved
  "abandoned",    // Discontinued
  "blocked"       // Stuck
]

DEAL_STATUS_ENUM = [
  "meeting",      // Initial conversation
  "dd",           // Due diligence
  "termsheet",    // Term sheet stage
  "closed",       // Deal done
  "passed"        // Investor passed
]
```

### Sample Data Constraints
- `burn` should be 10-50% of cash (runway 2-10 months)
- `employees` should correlate with stage: Pre-seed (3-10), Seed (10-25), Series A (25-50)
- `roundTarget` typically: Seed ($1-5M), Series A ($5-20M), Series B ($20-50M)
- `goals`: 2-5 per company
- `deals`: 0-5 per company, only if `raising: true`
- `mrr` range: $10K-$500K for early stage, $500K-$5M for growth
- Never include both `mrr` and `arr` (QA Gate violation)

---

## 2. PEOPLE

**Location**: `rawData.people[]`

### Schema
```typescript
{
  id: string,                    // Unique (prefix: "p-")
  name: string,                  // Full name
  orgId: string,                 // Company/investor ID they belong to
  orgType: enum,                 // See ORG_TYPE_ENUM
  role: string,                  // Job title/role
  tags: string[],                // Keywords (e.g., ["fintech", "stanford"])
  asOf: string,                  // ISO timestamp
  provenance: string             // manual|import|sync
}
```

### Optional Fields
```typescript
{
  email?: string,                // Email address
  linkedin?: string,             // LinkedIn URL
  bio?: string,                  // Background paragraph
  location?: string              // City/region
}
```

### ENUMS
```javascript
ORG_TYPE_ENUM = [
  "company",      // Portfolio company employee
  "investor",     // Investor/VC partner
  "external"      // External contact (advisor, industry expert)
]
```

### Sample Data Constraints
- Founders: Use role "CEO", "CTO", "COO"
- Investors: Use role "Partner", "Managing Partner", "Associate"
- `tags`: 2-5 tags per person (schools, companies, skills)
- Person IDs linked to companies via `company.founderPersonIds`

---

## 3. RELATIONSHIPS

**Location**: `rawData.relationships[]`

### Schema
```typescript
{
  id: string,                    // Unique (e.g., "r1", "r2")
  fromPersonId: string,          // Source person ID
  toPersonId: string,            // Target person ID
  relationshipType: enum,        // See RELATIONSHIP_TYPE_ENUM
  strength: number,              // 0-100 (relationship quality)
  lastTouchAt: string,           // ISO timestamp of last interaction
  channel: enum,                 // See CHANNEL_ENUM
  provenance: string,            // manual|import|sync
  introCount: number,            // Total intros made through this relationship
  introSuccessCount: number      // Successful intros
}
```

### Optional Fields
```typescript
{
  notes?: string,                // Context notes
  frequency?: string             // How often they interact
}
```

### ENUMS
```javascript
RELATIONSHIP_TYPE_ENUM = [
  "board",            // Board member relationship
  "professional",     // Professional contact
  "alumni",           // School/company alumni
  "former-colleague", // Worked together
  "co-investor",      // Co-investment relationship
  "mentor-mentee",    // Mentorship
  "friend"            // Personal friendship
]

CHANNEL_ENUM = [
  "in-person",        // Face-to-face meeting
  "video",            // Video call
  "phone",            // Phone call
  "email",            // Email exchange
  "linkedin",         // LinkedIn message
  "conference",       // Met at conference
  "github"            // GitHub interaction
]
```

### Sample Data Constraints
- `strength` ranges:
  - 90-100: Very strong (board, close colleagues)
  - 70-89: Strong (regular professional contact)
  - 50-69: Moderate (occasional contact)
  - 20-49: Weak (infrequent)
- `introCount` should be 0-10, with `introSuccessCount <= introCount`
- `lastTouchAt` should be recent for high strength relationships
- Relationships are bidirectional (graph traversal works both ways)

---

## 4. INVESTORS

**Location**: `rawData.investors[]`

### Schema
```typescript
{
  id: string,                    // Unique (prefix: "i" + number)
  name: string,                  // Fund name
  type: enum,                    // See INVESTOR_TYPE_ENUM
  stage: string[],               // Target stages (from STAGE_ENUM)
  sectors: string[],             // Focus sectors
  checkSize: string,             // Range (e.g., "$1M-$5M")
  location: string,              // HQ location
  asOf: string,                  // ISO timestamp
  provenance: string             // manual|import|sync
}
```

### Optional Fields
```typescript
{
  website?: string,              // Fund website
  portfolio?: string[],          // Portfolio company names
  notes?: string                 // Investment thesis, preferences
}
```

### ENUMS
```javascript
INVESTOR_TYPE_ENUM = [
  "vc",               // Venture capital
  "angel",            // Angel investor
  "corporate",        // Corporate VC
  "family-office",    // Family office
  "accelerator"       // Accelerator/incubator
]
```

### Sample Data Constraints
- `stage` should be 1-3 stages (e.g., ["Seed", "Series A"])
- `sectors` should be 2-5 sectors
- `checkSize` examples: "$500K-$2M", "$2M-$10M", "$10M-$50M"

---

## 5. TEAM

**Location**: `rawData.team[]`

### Schema
```typescript
{
  id: string,                    // Unique
  personId: string,              // Links to people array
  name: string,                  // Full name (denormalized)
  role: string,                  // Role on investment team
  focus: string[],               // Investment focus areas
  asOf: string,                  // ISO timestamp
  provenance: string             // manual|import|sync
}
```

### Sample Data Constraints
- `role` examples: "Partner", "Principal", "Analyst", "Venture Partner"
- `focus` examples: ["fintech", "saas"], ["healthcare", "ai"]
- Typically 3-8 team members for a VC firm

---

## 6. INTRO OUTCOMES

**Location**: `rawData.introOutcomes[]`

**Purpose**: Tracks introduction outcomes for calibration (Phase 4.5)

### Schema
```typescript
{
  id: string,                        // Unique
  createdAt: string,                 // ISO timestamp
  actionId: string,                  // Links to the action that created this intro
  introducerPersonId: string,        // Who made the intro
  targetPersonId?: string,           // Who was introduced (person)
  targetOrgId?: string,              // Who was introduced (org)
  companyId?: string,                // Which portfolio company
  introType?: string,                // Type (e.g., "investor", "customer", "partner")
  pathType?: string,                 // Path type (e.g., "direct", "warm", "second-order")
  status: enum,                      // See INTRO_STATUS_ENUM
  statusUpdatedAt: string            // ISO timestamp of status change
}
```

### Required: At least one of `targetPersonId` OR `targetOrgId`

### ENUMS
```javascript
INTRO_STATUS_ENUM = [
  "drafted",      // Action created but not executed
  "sent",         // Introduction sent
  "replied",      // Target responded
  "meeting",      // Meeting scheduled/held
  "positive",     // Led to desired outcome (TERMINAL)
  "negative",     // Explicit rejection (TERMINAL)
  "ghosted"       // No response after 14 days (TERMINAL)
]

// Terminal statuses (end states)
TERMINAL_STATUSES = ["positive", "negative", "ghosted"]
```

### Status Flow
```
drafted → sent → replied → meeting → positive|negative|ghosted
                                  ↓
                              ghosted (if no reply after 14 days)
```

### Sample Data Constraints
- Most intros should be in "sent" or "replied" status
- ~15-30% should reach "meeting"
- ~10-20% should be "positive"
- ~5-10% should be "negative"
- ~10-20% should be "ghosted"
- `statusUpdatedAt` must be >= `createdAt`
- For "ghosted" status, `statusUpdatedAt` should be 14+ days after "sent"

---

## 7. ACTION EVENTS

**Location**: `rawData.actionEvents.actionEvents[]`

**Purpose**: Append-only ledger of action lifecycle events (Phase 4.6)

### File Structure
```json
{
  "actionEvents": [...]
}
```

### Event Schema
```typescript
{
  id: string,                    // Unique event ID
  actionId: string,              // Which action this event is for
  eventType: enum,               // See EVENT_TYPE_ENUM
  timestamp: string,             // ISO 8601 timestamp
  actor: string,                 // Who triggered the event (user ID or "system")
  payload: object                // Event-specific data (see below)
}
```

### ENUMS
```javascript
EVENT_TYPE_ENUM = [
  "created",          // Action was created
  "assigned",         // Action assigned to someone
  "started",          // Work began on action
  "completed",        // Action finished
  "outcome_recorded", // Outcome captured after completion
  "followup_created", // Followup action created
  "note_added"        // Note/comment added
]
```

### Payload Schemas by Event Type

#### created
```typescript
payload: {
  source?: string,              // How action was created
  companyId?: string           // Associated company
}
```

#### assigned
```typescript
payload: {
  assignedTo: string,           // Person ID
  assignedBy?: string          // Who made the assignment
}
```

#### started
```typescript
payload: {
  startedBy?: string           // Who started work
}
```

#### completed
```typescript
payload: {
  completedBy?: string,        // Who completed it
  duration?: number            // Time to complete (hours)
}
```

#### outcome_recorded
```typescript
payload: {
  outcome: enum,               // See OUTCOME_ENUM
  impactObserved?: number,     // Actual impact (-100 to 100)
  timeToOutcomeDays?: number,  // Days to see outcome
  notes?: string               // Outcome description
}

OUTCOME_ENUM = ["success", "partial", "failed", "abandoned"]
```

#### followup_created
```typescript
payload: {
  followupActionId: string,    // ID of newly created followup action
  reason?: string              // Why followup needed
}
```

#### note_added
```typescript
payload: {
  note: string,                // Note text
  addedBy?: string            // Who added the note
}
```

### FORBIDDEN KEYS IN PAYLOAD

**CRITICAL**: These derived fields MUST NEVER appear in event payloads (QA Gate F):
```javascript
FORBIDDEN_PAYLOAD_KEYS = [
  'rankScore',
  'expectedNetImpact',
  'impactScore',
  'rippleScore',
  'priorityScore',
  'healthScore',
  'executionProbability',
  'frictionPenalty',
  'calibratedProbability',
  'learnedExecutionProbability',
  'learnedFrictionPenalty'
]
```

### Sample Data Constraints
- Events must be in chronological order (by `timestamp`)
- Every `actionId` should have at least a "created" event
- `timestamp` format: `"2026-01-30T22:25:36.986Z"` (ISO 8601)
- `actor` examples: "user", "system", person IDs like "p-alex-thompson"
- Event IDs should be unique (use pattern like `"evt_${Date.now()}_${randomString}"`)
- Typical event sequence: created → [assigned] → [started] → completed → [outcome_recorded]

---

## 8. FORBIDDEN FIELDS IN RAW DATA

**Source**: QA Gate GATE 2 (checkNoStoredDerivations)

### Core Forbidden List
These fields MUST NEVER appear in raw storage:

```javascript
FORBIDDEN_IN_RAW = [
  // Core derivations (Phase 4.6)
  'runway',
  'runwayMonths',
  'health',
  'healthScore',
  'healthBand',
  'healthSignals',
  'priority',
  'priorityScore',
  'rankScore',
  'expectedNetImpact',
  'rank',
  'rankComponents',
  'progressPct',
  'valueVector',
  'weeklyValue',
  
  // Extended forbidden
  'impact',
  'urgency',
  'risk',
  'score',
  'tier',
  'band',
  'label',
  'coverage',
  'expectedValue',
  'conversionProb',
  'onTrack',
  'projectedDate',
  'velocity',
  'issues',
  'priorities',
  'actions',
  'rippleScore',
  'calibratedProbability',
  'escalationWindow',
  'costOfDelay',
  'executionProbability',
  'timing',
  'timingRationale'
]
```

### QA Validation
Any of these fields found in raw data will cause **QA Gate FAILURE**.

---

## 9. DATA GENERATION GUIDELINES

### Volume Targets for QA
```
Companies:        10-50
People:           50-200
Relationships:    100-500
Investors:        10-30
Team:             3-8
Goals:            20-150 (2-5 per company)
Deals:            20-100 (2-4 per fundraising company)
IntroOutcomes:    50-200
ActionEvents:     100-1000+
```

### Realism Rules

#### Dates & Timestamps
- `asOf` dates should be recent (last 30-90 days)
- `due` dates for goals should be 1-6 months in future
- `lastTouchAt` for relationships: stronger = more recent
- All timestamps use ISO 8601: `"2026-01-30T22:25:36.986Z"`

#### Financial Data
- Early stage (Pre-seed/Seed): $50K-$200K burn, $500K-$3M cash
- Series A: $150K-$500K burn, $3M-$15M cash
- Series B+: $500K-$2M burn, $15M-$50M cash
- MRR growth: 10-30% month-over-month for healthy companies
- Never include both `mrr` and `arr` in same company

#### Goals & Progress
- `current` should be 40-90% of `target` for active goals
- Blocked goals: `current` at 20-60%, no movement
- Completed goals: `current >= target`
- At least 1-2 "blocked" goals per company for intro generation

#### Relationships
- Every person should have 2-10 relationships
- Team members should have strong relationships with founders (80-95 strength)
- Investors should have relationships with relevant team members
- Include some weak relationships (20-40 strength) for realism

#### Introduction Outcomes
- 40-50% should be in "sent" status
- 20-30% in "replied" or "meeting"
- 10-15% terminal positive
- 5-10% terminal negative
- 10-15% ghosted
- Every `actionId` should be unique (links to future action system)

#### Action Events
- Every action needs at minimum: `created` event
- 60-70% of actions should have `completed` event
- 30-40% of completed actions should have `outcome_recorded`
- Events must be chronologically ordered
- Use realistic timestamps (minutes to hours between events)
- `actor` field: mix of "user", "system", and person IDs

### Referential Integrity

**CRITICAL LINKS** (must be valid):
```
company.founderPersonIds   → people[].id
company.goals[].id         → unique within company
company.deals[].investorId → investors[].id
relationship.fromPersonId  → people[].id
relationship.toPersonId    → people[].id
team[].personId            → people[].id
introOutcome.actionId      → [future: actions array]
introOutcome.introducerPersonId → people[].id
introOutcome.targetPersonId    → people[].id (optional)
introOutcome.targetOrgId       → companies[].id OR investors[].id (optional)
actionEvent.actionId       → [future: actions array]
```

### ID Naming Conventions
```
Companies:       kebab-case (e.g., "velocity", "nexgen", "harmonic")
People:          "p-" + kebab-case (e.g., "p-marcus-chen", "p-inv-horizon")
Relationships:   "r" + number (e.g., "r1", "r42")
Investors:       "i" + number (e.g., "i1", "i7")
Team:            "t-" + name (e.g., "t-alex-thompson")
IntroOutcomes:   "intro-" + timestamp or uuid
ActionEvents:    "evt_" + timestamp + "_" + random (e.g., "evt_1769811936986_b9j7pg")
Actions (future): "action-" + short-hash (e.g., "action-3ff5a8ac904b")
```

---

## 10. DERIVED DATA STRUCTURES

**Note**: These are computed at runtime, NEVER stored in raw data.

### Health
```typescript
{
  companyId: string,
  healthScore: number,           // 0-100
  healthBand: string,            // "critical"|"warning"|"healthy"|"excellent"
  healthSignals: {
    runway: "green"|"yellow"|"red",
    revenue: "green"|"yellow"|"red",
    hiring: "green"|"yellow"|"red"
  },
  lastUpdated: string
}
```

### Runway
```typescript
{
  companyId: string,
  runwayMonths: number,          // Cash / burn
  runwayBand: string,            // "critical"|"warning"|"healthy"
  cashOutDate: string,           // Projected date
  lastUpdated: string
}
```

### Goal Trajectory
```typescript
{
  goalId: string,
  companyId: string,
  velocity: number,              // Progress per week
  projectedCompletion: string,   // ISO date
  onTrack: boolean,
  issues: string[],              // Identified blockers
  lastUpdated: string
}
```

### Actions (Introduction Opportunities)
```typescript
{
  id: string,
  type: "INTRODUCTION",
  companyId: string,
  goalId: string,
  introducerId: string,
  targetPersonId: string,
  probability: number,           // 0-100
  trustRisk: {
    trustRiskScore: number,      // 0-100
    trustRiskBand: string,       // "low"|"medium"|"high"
    factors: string[]
  },
  timing: string,                // "NOW"|"SOON"|"LATER"|"NEVER"
  timingRationale: string[],
  rankScore: number,             // Final ranking score
  ephemeral: true
}
```

---

## 11. VALIDATION CHECKLIST

Use this checklist when generating sample data:

### Structural Validation
- [ ] All required fields present for each entity type
- [ ] All enum values are valid (from defined ENUM lists)
- [ ] All IDs are unique within their type
- [ ] All timestamps are valid ISO 8601
- [ ] All numbers are within realistic ranges

### Referential Integrity
- [ ] All person IDs exist in people array
- [ ] All company IDs exist in companies array
- [ ] All investor IDs exist in investors array
- [ ] Relationship endpoints reference valid people
- [ ] IntroOutcome actionIds are unique strings
- [ ] ActionEvent actionIds link to valid actions

### Business Logic
- [ ] If company has `mrr`, it does NOT have `arr`
- [ ] Goal `current` values are realistic vs `target`
- [ ] Relationship `introSuccessCount` <= `introCount`
- [ ] Deal probabilities match their status (termsheet > dd > meeting)
- [ ] ActionEvent timestamps are chronological
- [ ] IntroOutcome status flows are valid (drafted→sent→replied→etc)

### QA Gate Compliance
- [ ] No FORBIDDEN fields in any raw entity
- [ ] No derived keys in ActionEvent payloads
- [ ] ActionEvents wrapped in `{"actionEvents": [...]}`
- [ ] All timestamps parseable by `Date.parse()`
- [ ] No duplicate event IDs in ActionEvents

### Realism
- [ ] Company burn/cash ratios create 2-10 month runways
- [ ] Goals have realistic progress (40-90% for active)
- [ ] Relationships have appropriate strength for type
- [ ] Team members have strong links to their portfolio companies
- [ ] IntroOutcome status distribution is realistic

---

## 12. SAMPLE DATA TEMPLATES

### Minimal Valid Company
```json
{
  "id": "acme",
  "name": "Acme Corp",
  "tagline": "Building the future",
  "stage": "Seed",
  "burn": 150000,
  "cash": 2000000,
  "employees": 15,
  "hq": "San Francisco",
  "sector": "SaaS",
  "color": "from-blue-500 to-indigo-600",
  "raising": false,
  "roundTarget": 0,
  "founderPersonIds": ["p-founder-1"],
  "founders": [
    {
      "name": "Jane Doe",
      "role": "CEO",
      "bio": "Ex-Google PM"
    }
  ],
  "goals": [],
  "deals": [],
  "asOf": "2026-01-30T12:00:00Z",
  "provenance": "manual"
}
```

### Minimal Valid Person
```json
{
  "id": "p-founder-1",
  "name": "Jane Doe",
  "orgId": "acme",
  "orgType": "company",
  "role": "CEO",
  "tags": ["saas", "google", "stanford"],
  "asOf": "2026-01-30T12:00:00Z",
  "provenance": "manual"
}
```

### Minimal Valid Relationship
```json
{
  "id": "r1",
  "fromPersonId": "p-founder-1",
  "toPersonId": "p-investor-1",
  "relationshipType": "professional",
  "strength": 75,
  "lastTouchAt": "2026-01-25T10:00:00Z",
  "channel": "email",
  "provenance": "manual",
  "introCount": 2,
  "introSuccessCount": 1
}
```

### Minimal Valid IntroOutcome
```json
{
  "id": "intro-1",
  "createdAt": "2026-01-20T10:00:00Z",
  "actionId": "action-abc123",
  "introducerPersonId": "p-founder-1",
  "targetPersonId": "p-investor-1",
  "companyId": "acme",
  "introType": "investor",
  "pathType": "direct",
  "status": "sent",
  "statusUpdatedAt": "2026-01-20T10:30:00Z"
}
```

### Minimal Valid ActionEvent
```json
{
  "id": "evt_1234567890_abc123",
  "actionId": "action-abc123",
  "eventType": "created",
  "timestamp": "2026-01-20T09:00:00Z",
  "actor": "user",
  "payload": {
    "source": "system",
    "companyId": "acme"
  }
}
```

---

## 13. COMMON PITFALLS

### ❌ VIOLATIONS (Will Fail QA)

1. **Including arr when mrr exists**
   ```json
   {
     "mrr": 100000,
     "arr": 1200000  // ❌ QA_FAIL_RAW_ARR_PRESENT_WITH_MRR
   }
   ```

2. **Derived fields in raw data**
   ```json
   {
     "id": "acme",
     "healthScore": 85  // ❌ QA_FAIL_FORBIDDEN_KEY_IN_RAW
   }
   ```

3. **Derived fields in event payloads**
   ```json
   {
     "eventType": "completed",
     "payload": {
       "rankScore": 92  // ❌ QA_FAIL_DERIVED_KEY_IN_EVENT
     }
   }
   ```

4. **Wrong ActionEvents structure**
   ```json
   [
     { "id": "evt_1", ... }  // ❌ Must be wrapped in {"actionEvents": [...]}
   ]
   ```

5. **Invalid enum values**
   ```json
   {
     "stage": "Round A"  // ❌ Must be "Series A"
   }
   ```

6. **Broken references**
   ```json
   {
     "founderPersonIds": ["p-nonexistent"]  // ❌ Person doesn't exist
   }
   ```

### ✅ CORRECT PATTERNS

1. **Choose mrr OR arr, never both**
   ```json
   {
     "mrr": 100000  // ✅ Only one revenue metric
   }
   ```

2. **Keep raw data pure**
   ```json
   {
     "id": "acme",
     "burn": 150000,
     "cash": 2000000
     // Health/runway computed at runtime
   }
   ```

3. **Valid event payload**
   ```json
   {
     "eventType": "outcome_recorded",
     "payload": {
       "outcome": "success",
       "impactObserved": 75  // ✅ Raw observed data
     }
   }
   ```

4. **Proper ActionEvents structure**
   ```json
   {
     "actionEvents": [
       { "id": "evt_1", ... }
     ]
   }
   ```

---

## 14. NEXT STEPS

To create QA data generation scripts:

1. **Read this schema thoroughly**
2. **Review existing sample.json** for real examples
3. **Create generator functions** for each entity type
4. **Implement realistic distributions** (see Data Generation Guidelines)
5. **Build referential integrity checker** before export
6. **Run QA gate** on generated data: `node qa/qa_gate.js`
7. **Iterate until QA passes**

### Recommended Generation Order

1. Investors (independent, no dependencies)
2. Companies (independent, no dependencies)
3. People (depends on: companies, investors)
4. Team (depends on: people)
5. Relationships (depends on: people)
6. IntroOutcomes (depends on: people, companies, relationships)
7. ActionEvents (depends on: IntroOutcomes for actionIds)

---

**End of Schema Reference**
