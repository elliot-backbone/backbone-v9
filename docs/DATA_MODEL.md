# Backbone V9 Data Model

## Overview

Backbone tracks venture capital portfolio companies and the broader market ecosystem. The data model captures companies, the people who build and fund them, and the financial events that shape their growth.

## Entity Hierarchy

```
Companies (central entity)
├── People (founders, executives, advisors)
├── Rounds (funding events)
│   └── Deals (investor negotiations per round)
│       └── Firms (investment entities)
│           └── People (partners, associates)
├── Goals (stage-appropriate milestones)
└── Relationships (tracked connections between people)
```

## Company Universe

### Portfolio Segmentation
- **Total Companies**: ~120 in tracked universe
- **Portfolio Companies**: ~20 (companies Backbone has invested in)
- **Market Companies**: ~100 (companies being tracked/evaluated)

### Portfolio Stage Distribution
Portfolio companies (~20) follow this distribution:
- **20% Pre-funding** (~4): Pre-seed, no institutional money yet
- **60% Early Stage** (~12): Seed through Series A, bias toward earlier
- **20% Growth Stage** (~4): Series B through Series D

### Market Company Characteristics
Market companies (~100) represent:
- Pipeline candidates at various stages
- Competitive landscape companies
- Companies with relationship touchpoints
- Mix of stages reflecting broader market

## Entity Definitions

### Company
The central entity. Represents a startup/business being tracked.

```javascript
{
  id: string,              // kebab-case identifier
  name: string,            // Company name
  tagline: string,         // One-line description
  stage: string,           // Current stage: Pre-seed|Seed|Series A|B|C|D
  sector: string,          // Industry vertical
  hq: string,              // Headquarters city
  
  // Financials (for portfolio companies)
  burn: number,            // Monthly burn rate ($)
  cash: number,            // Cash on hand ($)
  employees: number,       // Headcount
  
  // Fundraising state
  raising: boolean,        // Currently fundraising?
  roundTarget: number,     // Target raise amount ($)
  
  // Portfolio flag
  isPortfolio: boolean,    // Is this a Backbone portfolio company?
  
  // Linked entities
  founderPersonIds: string[],  // Person IDs of founders
  founders: object[],          // Denormalized founder info
  goals: Goal[],               // Company goals
  rounds: Round[],             // Historical + current funding rounds
  
  // Metadata
  founded: string,         // Founding year/date
  asOf: string,            // Data freshness timestamp
  provenance: string       // Data source
}
```

### Person
Individuals in the ecosystem: founders, executives, investors, advisors.

```javascript
{
  id: string,              // p-{kebab-name} format
  name: string,            // Full name
  orgId: string,           // Primary organization ID
  orgType: string,         // company|fund|external
  role: string,            // Current title/role
  tags: string[],          // Skills, background, interests
  
  // Metadata
  asOf: string,
  provenance: string
}
```

### Firm
Investment entities: VC funds, angels, corporate investors.

```javascript
{
  id: string,              // i{number} format
  name: string,            // Firm name
  personId: string,        // Primary contact person ID
  
  // Investment thesis
  aum: string,             // Assets under management
  stageFocus: string,      // Investment stage focus
  sectorFocus: string,     // Sector preferences
  
  // Activity
  deals: string[],         // Company IDs with active/past deals
  
  // Metadata
  asOf: string,
  provenance: string
}
```

### Round
A distinct funding event for a company. Companies accumulate rounds over time.

```javascript
{
  id: string,              // r-{company}-{stage} format
  companyId: string,       // Parent company
  stage: string,           // Round stage: Pre-seed|Seed|Series A|B|C|D
  target: number,          // Target raise amount ($)
  raised: number,          // Amount actually raised ($)
  status: string,          // active|closed|abandoned
  
  // Timeline
  openedAt: string,        // When round opened
  closedAt: string,        // When round closed (if closed)
  
  // Participants
  leadInvestorId: string,  // Lead firm ID
  deals: Deal[],           // All deals in this round
  
  // Metadata
  asOf: string,
  provenance: string
}
```

### Deal
A negotiation between a company and a firm for a specific round.

```javascript
{
  id: string,              // d-{company}-{firm}-{round} format
  roundId: string,         // Parent round
  companyId: string,       // Company being invested in
  firmId: string,          // Investing firm
  
  // Deal terms
  amount: number,          // Investment amount ($)
  status: string,          // outreach|meeting|dd|termsheet|closed|passed
  probability: number,     // Close probability (0-100)
  
  // People
  leadPersonIds: string[], // Person IDs leading the deal
  
  // Timeline
  firstContact: string,    // Initial outreach date
  lastActivity: string,    // Most recent activity
  closedAt: string,        // Close date (if closed)
  
  // Metadata
  asOf: string,
  provenance: string
}
```

### Goal
Stage-appropriate milestones tied to company progress and future funding.

```javascript
{
  id: string,              // {company}-g{index} format
  companyId: string,       // Parent company
  
  // Definition
  name: string,            // Goal name
  type: string,            // revenue|product|hiring|partnership|fundraise|operational
  
  // Progress
  current: number,         // Current value
  target: number,          // Target value
  status: string,          // active|completed|blocked|abandoned
  
  // Timeline
  due: string,             // Target completion date
  
  // Funding linkage
  unlocks: string,         // What this goal unlocks (e.g., "Series A readiness")
  
  // Metadata
  asOf: string,
  provenance: string
}
```

### Relationship
Tracked connections between people, especially for intro tracking.

```javascript
{
  id: string,              // r{index} format
  fromPersonId: string,    // Person A
  toPersonId: string,      // Person B
  
  // Relationship characteristics
  relationshipType: string, // board|professional|alumni|former-colleague|mentor|friend
  strength: number,         // 0-100 relationship strength
  
  // Interaction tracking
  lastTouchAt: string,     // Last interaction
  channel: string,         // in-person|video|email|linkedin|etc
  
  // Intro tracking (for Backbone-facilitated intros)
  introCount: number,      // Total intros made
  introSuccessCount: number, // Successful intros
  introducedBy: string,    // Backbone person who made intro (if applicable)
  
  // Metadata
  provenance: string
}
```

## Stage Progression Logic

### Typical Funding Journey
```
Pre-seed → Seed → Series A → Series B → Series C → Series D+
```

### Stage Characteristics

Raise sizes based on market data. Burn rates derived from runway expectations:
- Pre-seed/Seed: 12 months runway from raise
- Series A+: 24 months runway from raise

| Stage | Typical Raise | Monthly Burn Range | Employees |
|-------|--------------|-------------------|-----------|
| Pre-seed | $500K-$5M | $42K-$417K | 2-8 |
| Seed | $2M-$10M | $167K-$833K | 5-20 |
| Series A | $5M-$25M | $208K-$1.04M | 15-50 |
| Series B | $15M-$50M | $625K-$2.08M | 40-120 |
| Series C | $50M-$150M | $2.08M-$6.25M | 100-350 |
| Series D+ | $100M+ | $4.17M-$12.5M | 300-1000 |

### Goal Types by Stage

**Pre-seed:**
- Product MVP completion
- First 10 customers
- Seed round preparation

**Seed:**
- Product-market fit signals
- Revenue milestones ($50K-$500K ARR)
- Team expansion (engineering, sales)
- Series A preparation

**Series A:**
- Revenue growth (2-3x YoY)
- Unit economics validation
- Market expansion
- Series B preparation

**Series B+:**
- Market leadership metrics
- Profitability path
- International expansion
- M&A or IPO readiness

## Referential Integrity Rules

1. Every `Deal` must reference a valid `Round`, `Company`, and `Firm`
2. Every `Round` must reference a valid `Company`
3. Every `Goal` must reference a valid `Company`
4. Person `orgId` must reference a valid `Company` or `Firm`
5. Relationship `fromPersonId` and `toPersonId` must reference valid `Person` records
6. Firm `deals` array must contain valid `Company` IDs
7. Round `leadInvestorId` must reference a valid `Firm`
8. Deal `leadPersonIds` must reference valid `Person` records

## Data Generation Rules

### Historical Consistency
- Companies at Series A should have Pre-seed and Seed rounds in history
- Each historical round should have closed deals
- Employee count should grow with stage progression
- Cash/burn should reflect stage-appropriate metrics

### Realistic Distributions
- ~40% of fundraising rounds succeed
- Lead investors typically invest 30-50% of round
- 2-5 firms participate per round
- Deal conversion: outreach→meeting (30%), meeting→dd (40%), dd→termsheet (50%), termsheet→closed (80%)
