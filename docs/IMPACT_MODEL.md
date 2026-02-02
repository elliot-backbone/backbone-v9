# Impact Model: Unified Goal-Centric Upside

## Core Formula

```
upside = Σ (goalWeight × Δprobability)
```

Every action's value is measured by its impact on goal fulfillment.

## How It Works

### 1. Link Action to Affected Goals

Actions are linked to goals by type mapping:

| Issue/Preissue Type | Affected Goal Types |
|---------------------|---------------------|
| `RUNWAY_WARNING` | fundraise, operational |
| `RUNWAY_CRITICAL` | fundraise, operational |
| `BURN_SPIKE` | operational, fundraise |
| `DEAL_STALL` | fundraise |
| `ROUND_STALL` | fundraise |
| `LEAD_VACANCY` | fundraise |
| `GOAL_MISS` | direct goalId link |
| `CONNECTION_DORMANT` | partnership, fundraise |

### 2. Calculate Probability Lift

How much does resolving this improve goal probability?

| Source Type | Lift Calculation |
|-------------|------------------|
| ISSUE (critical) | 40% |
| ISSUE (high) | 28% |
| ISSUE (medium) | 18% |
| PREISSUE (high severity) | likelihood × 15% |
| PREISSUE (medium severity) | likelihood × 8% |
| GOAL (direct) | 25% of trajectory gap |

### 3. Weight by Goal Importance

Base weights by goal type:

| Goal Type | Weight | Notes |
|-----------|--------|-------|
| fundraise | 90 | Existential for early stage |
| revenue | 85 | Core business metric |
| operational | 70 | Efficiency/runway |
| hiring | 60 | Team building |
| product | 55 | Feature delivery |
| partnership | 50 | Relationship building |

Stage modifiers:
- Pre-seed/Seed: fundraise × 1.2, revenue × 0.7
- Series A: neutral
- Series B+: fundraise × 0.8, revenue × 1.1

### 4. Sum Across Affected Goals

```javascript
for (const goal of affectedGoals) {
  const weight = getGoalWeight(goal, company);
  const lift = probabilityLift(action, goal, context);
  totalUpside += weight * lift;
}
```

## Result Hierarchy

| Source | Range | Explanation |
|--------|-------|-------------|
| ISSUE | 13-62 | Actual problems, highest priority |
| PREISSUE | 10-41 | Prevention, medium priority |
| GOAL | 10-23 | Direct progress, lower priority |

## Example Calculations

### Critical Runway Issue
- Company has "Close Seed Round" goal (fundraise, weight=108 with Seed modifier)
- RUNWAY_CRITICAL issue, severity=3, lift=40%
- Also affects "Extend Runway" goal (operational, weight=70), lift=40%
- **Upside = (108 × 0.40) + (70 × 0.40) = 43 + 28 = 71** (capped at 62)

### Deal Stall Preissue
- Company has "Initiate Seed fundraise" goal (fundraise, weight=108)
- DEAL_STALL preissue, likelihood=0.7, severity=high, lift=10.5%
- **Upside = 108 × 0.105 = 11** (boosted to 14 with base floor)

## Key Properties

1. **Company-scoped**: Actions only affect goals for their own company
2. **Implicit goals**: If no explicit goal exists, system creates implicit fundraise/operational goal based on stage
3. **Multi-goal leverage**: Actions affecting multiple goals naturally score higher
4. **Explainable**: Every upside has explanation like "+40% on Extend runway goal"

## Files

- `predict/actionImpact.js` — Primary implementation
- `ui/predict/actionImpact.js` — UI copy (synced)
- `decide/actionImpact.js` — Decide layer copy (synced)
