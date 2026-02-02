# Goal Suggestion Taxonomy

## Overview

The goal suggestion system maps **anomalies** (deviations from stage-appropriate bounds) to **recommended goals**. This creates a closed-loop system where:

1. **ETL ingests real data** → validated against stage params
2. **Anomaly detection** → identifies gaps vs expected bounds
3. **Goal suggestions** → recommends actions to close gaps
4. **User accepts/modifies** → creates trackable goals
5. **Issue detection** → monitors goal progress
6. **Action ranking** → surfaces next steps

---

## Anomaly → Goal Mapping

### Financial Anomalies

| Anomaly Type | Severity | Suggested Goal Type | Goal Name Template | Rationale |
|--------------|----------|---------------------|-------------------|-----------|
| `RUNWAY_BELOW_MIN` | CRITICAL/HIGH | `operational` | Extend runway to {target} months | Existential risk |
| `RUNWAY_BELOW_MIN` | CRITICAL/HIGH | `fundraise` | Initiate {nextStage} fundraise | Capital infusion needed |
| `RUNWAY_BELOW_MIN` | MEDIUM | `operational` | Reduce burn to ${target}K/mo | Extend runway without dilution |
| `BURN_ABOVE_MAX` | HIGH/MEDIUM | `operational` | Reduce burn to ${target}K/mo | Capital inefficiency |
| `RAISE_ABOVE_MAX` | MEDIUM | `operational` | Validate stage classification | Positioning may be wrong |

### Team Anomalies

| Anomaly Type | Severity | Suggested Goal Type | Goal Name Template | Rationale |
|--------------|----------|---------------------|-------------------|-----------|
| `EMPLOYEES_BELOW_MIN` | HIGH | `hiring` | Build team to {target} FTE | Execution capacity limited |
| `EMPLOYEES_ABOVE_MAX` | MEDIUM | `operational` | Optimize team efficiency | May indicate inefficiency |

### Revenue Anomalies

| Anomaly Type | Severity | Suggested Goal Type | Goal Name Template | Rationale |
|--------------|----------|---------------------|-------------------|-----------|
| `REVENUE_MISSING_REQUIRED` | HIGH | `revenue` | Establish revenue stream | Expected at stage |
| `REVENUE_BELOW_MIN` | HIGH | `revenue` | Grow revenue to ${target}M ARR | Affects fundraising |
| `REVENUE_ABOVE_MAX` | LOW | `fundraise` | Prepare {nextStage} fundraise | Ready for next stage |

### Stage Anomalies

| Anomaly Type | Severity | Suggested Goal Type | Goal Name Template | Rationale |
|--------------|----------|---------------------|-------------------|-----------|
| `STAGE_MISMATCH_METRICS` | MEDIUM | `operational` | Review stage classification | Metrics suggest different stage |

---

## Goal Types

| Type | Description | Typical Targets | Stage Relevance |
|------|-------------|-----------------|-----------------|
| `revenue` | Revenue/ARR milestones | Dollar amounts | Seed+ |
| `product` | Product development | % complete, feature count | All stages |
| `hiring` | Team building | Headcount | All stages |
| `fundraise` | Capital raising | Dollar amounts | When raising |
| `operational` | Efficiency/process | Various | All stages |
| `partnership` | Business development | Partner count | Series A+ |

---

## Priority Calculation

Goals are prioritized by:

1. **Severity** (from source anomaly)
   - CRITICAL (3): Immediate action required
   - HIGH (2): Action needed soon
   - MEDIUM (1): Should address
   - LOW (0): Nice to have

2. **Priority score** (from mapping)
   - 1: First-order action (directly addresses anomaly)
   - 2: Second-order action (alternative approach)
   - 3: Third-order action (validation/review)
   - 10+: Stage template suggestions (no anomaly source)

3. **Sort order**: Higher severity first, then lower priority score

---

## Stage Parameters Reference

### Pre-seed
```
Raise:     $500K - $5M
Burn:      $42K - $417K/mo
Employees: 2 - 8
Runway:    6 - 18 months (target: 12)
Revenue:   $0 - $100K (not required)
```

### Seed
```
Raise:     $2M - $10M
Burn:      $167K - $833K/mo
Employees: 5 - 20
Runway:    9 - 18 months (target: 12)
Revenue:   $0 - $2M (not required)
```

### Series A
```
Raise:     $5M - $25M
Burn:      $208K - $1.04M/mo
Employees: 15 - 50
Runway:    12 - 24 months (target: 18)
Revenue:   $500K - $5M (required)
```

### Series B
```
Raise:     $15M - $50M
Burn:      $625K - $2.08M/mo
Employees: 40 - 120
Runway:    18 - 30 months (target: 24)
Revenue:   $3M - $20M (required)
```

### Series C
```
Raise:     $50M - $150M
Burn:      $2.08M - $6.25M/mo
Employees: 100 - 350
Runway:    18 - 36 months (target: 24)
Revenue:   $15M - $75M (required)
```

### Series D
```
Raise:     $100M - $300M
Burn:      $4.17M - $12.5M/mo
Employees: 300 - 1000
Runway:    24 - 48 months (target: 30)
Revenue:   $50M - $250M (required)
```

---

## ETL Validation Rules

When ingesting real data, validate:

### Hard Failures (reject record)
- Missing required fields: `id`, `name`, `stage`
- Invalid stage value
- Negative values for `cash`, `burn`, `employees`
- `burn` > `cash` (implies negative runway)

### Soft Alerts (flag for review)
- Any value outside stage bounds → create anomaly
- Missing optional fields → create `DATA_MISSING` issue
- Stale `asOf` date → create `DATA_STALE` issue

### Cross-Field Validation
- `cash / burn` should ≈ reported runway (if present)
- `roundTarget` should be within stage raise bounds (if raising)
- `employees` growth should track with burn growth

---

## Integration Points

### With Issues (`predict/issues.js`)
- `NO_GOALS` issue triggers stage template suggestions
- `GOAL_BEHIND` may trigger additional corrective goals
- Anomaly-driven goals prevent future issues

### With Actions (`decide/ranking.js`)
- Suggested goals can generate action candidates
- Accepting a goal creates downstream actions
- Goal progress updates feed back to action ranking

### With UI (`ui/components/profile/`)
- `CompanyGoalsIssues.js` displays both existing and suggested goals
- User can accept/modify/dismiss suggestions
- Accepted suggestions become active goals

---

## Usage Example

```javascript
import { detectAnomalies } from './derive/anomalyDetection.js';
import { suggestGoals } from './predict/suggestedGoals.js';

// Detect anomalies for a company
const { anomalies } = detectAnomalies(company);

// Generate goal suggestions
const { suggestions, summary } = suggestGoals(company, anomalies, {
  includeStageTemplates: true,
  existingGoals: company.goals,
  minSeverity: 1, // MEDIUM and above
});

// High priority suggestions
const urgent = suggestions.filter(s => s.severity >= 2);

// Convert suggestion to goal (after user accepts)
import { suggestionToGoal } from './predict/suggestedGoals.js';
const newGoal = suggestionToGoal(suggestions[0], {
  target: 1000000, // User-specified target
});
```
