# Schema Corrections & Clarifications

## Issue 1: Goals and Deals Location - CLARIFIED

**You asked**: "where do goals rounds and deals fit in the schema i dont see them"

**Answer**: They are **NESTED INSIDE COMPANIES** - not separate top-level entities.

```
rawData
├── companies[]
│   ├── goals[]          ← Nested here
│   ├── deals[]          ← Nested here
│   └── founders[]       ← Also nested
├── people[]
├── relationships[]
└── ...
```

### Why This Matters

Goals and deals are **compositional data** - they don't exist independently, they belong TO a company.

This is different from:
- **People** - exist independently (can work at different companies)
- **Relationships** - exist between people (independent of companies)
- **IntroOutcomes** - track outcomes across portfolio (independent ledger)

### Schema Structure

```javascript
{
  companies: [
    {
      id: "velocity",
      name: "Velocity",
      // Company-level fields
      burn: 180000,
      cash: 2520000,
      
      // NESTED: Goals belong to this company
      goals: [
        { id: "v1", type: "revenue", current: 850000, target: 1000000 },
        { id: "v2", type: "product", current: 80, target: 100 }
      ],
      
      // NESTED: Deals belong to this company
      deals: [
        { id: "d-vel-1", investorId: "i1", amount: 5000000, probability: 70 }
      ]
    }
  ]
}
```

**NOT like this:**
```javascript
{
  companies: [...],
  goals: [...],      // ❌ Wrong - goals don't exist at top level
  deals: [...]       // ❌ Wrong - deals don't exist at top level
}
```

---

## Issue 2: MRR/ARR Exclusivity Rule - REASSESSED

**You asked**: "why do we pay such particular attention to this MRR/ARR exclusivity rule surely that is just like a micro rule somewhere else"

**You're RIGHT** - this rule is over-emphasized. Let me recalculate its importance.

### Current State
- QA Gate B2 dedicated to this rule
- Treated as critical violation
- Mentioned prominently in documentation

### Reality Check

**What is ARR?** ARR = MRR × 12

This is a **derived field**. If you have MRR, ARR should be *calculated*, not stored.

**The REAL rule should be:**

```
Rule: Don't store derived fields in raw data
Violation: Having 'arr' when 'mrr' exists (because arr = mrr * 12)
```

### Revised Priority

**Original classification:** Critical, dedicated QA gate  
**Revised classification:** Specific instance of "No Stored Derivations" rule

### Where It Belongs

```
QA Gate 2: No Stored Derivations
├── Check FORBIDDEN_IN_RAW list (rankScore, healthScore, etc)
└── Check MRR/ARR rule (arr is derived from mrr)
    ↑ Just one example of the broader rule
```

### Why It Got Overemphasized

Looking at the code, this appears to be a **specific historical bug** that got caught and codified into its own check. But it's really just enforcing the broader "no derived fields" principle.

---

## Recalculated Rules

### CRITICAL Rules (Build-Blocking)

1. **No Derived Fields in Raw Data**
   - Example violations: rankScore, healthScore, runway, arr (when mrr exists)
   - Why critical: Breaks fundamental architecture (raw vs derived separation)
   - QA Gate: GATE 2

2. **Referential Integrity**
   - Example violations: personId references non-existent person
   - Why critical: Breaks data model, causes runtime errors
   - QA Gate: Manual verification (no automatic gate currently)

3. **Required Fields Present**
   - Example violations: Company missing 'id' or 'name'
   - Why critical: Runtime will crash
   - QA Gate: Implicit in schema validation

4. **Event Chronological Order**
   - Example violations: Events not sorted by timestamp
   - Why critical: Breaks append-only ledger invariant
   - QA Gate: GATE H (partial check)

5. **No Derived Keys in Event Payloads**
   - Example violations: rankScore in event payload
   - Why critical: Violates event sourcing principles
   - QA Gate: GATE F

### IMPORTANT Rules (Should Be Enforced)

6. **Enum Values Valid**
   - Example violations: stage = "Round A" instead of "Series A"
   - Why important: Breaks downstream logic
   - QA Gate: Not currently checked

7. **Timestamps Parseable**
   - Example violations: Invalid ISO 8601 format
   - Why important: Runtime errors in date parsing
   - QA Gate: GATE C

8. **Unique IDs**
   - Example violations: Duplicate event IDs
   - Why important: Breaks uniqueness assumptions
   - QA Gate: GATE D

### NICE-TO-HAVE Rules (Data Quality)

9. **Realistic Value Ranges**
   - Example: burn > cash (implies negative runway)
   - Why nice: Better test data quality
   - QA Gate: Not checked

10. **Relationship Strength Consistency**
    - Example: "board" relationship with strength 10
    - Why nice: More realistic test scenarios
    - QA Gate: Not checked

---

## Specific Corrections to Documentation

### SCHEMA_REFERENCE.md

**Section 1 (Companies)** - CORRECT
- Already shows goals[] and deals[] as nested

**Section "FORBIDDEN FIELDS"** - NEEDS REVISION
Should read:
```markdown
### MRR/ARR Exclusivity

**Rule**: Never include both `mrr` and `arr` in the same company
**Reason**: ARR is derived (arr = mrr × 12)
**Classification**: Specific instance of "No Derived Fields" rule
**Priority**: IMPORTANT (not CRITICAL - it's caught by broader rule)
```

### QA_DATA_SYSTEM.md

**QA Gate Compliance section** - NEEDS REVISION
Change from:
```
2. ✅ No derived fields in raw data
3. ✅ MRR→ARR exclusivity rule
```

To:
```
2. ✅ No derived fields in raw data
   └─ Including MRR/ARR exclusivity (arr = mrr × 12)
```

---

## Recommended Changes

### 1. Merge MRR/ARR Check into Derived Fields Check

**Current:**
```javascript
// Gate 2: No stored derivations
gate('B1: No derived fields', () => checkNoStoredDerivations());
gate('B2: MRR→ARR rule', () => checkMRRARRRule());
```

**Proposed:**
```javascript
// Gate 2: No stored derivations (including arr when mrr exists)
gate('No derived fields in raw data', () => {
  const derivedCheck = checkNoStoredDerivations(rawData);
  // MRR/ARR is just one example of derived field
  // Already caught by FORBIDDEN_IN_RAW if 'arr' is in the list
  return derivedCheck;
});
```

### 2. Add 'arr' to FORBIDDEN_IN_RAW List

```javascript
const FORBIDDEN_IN_RAW = [
  // Revenue metrics (arr is derived from mrr)
  'arr',  // ← Add this
  
  // Core derivations
  'runway', 'runwayMonths',
  'health', 'healthScore',
  // ... rest
];
```

Then MRR/ARR rule is automatically enforced by the main check.

### 3. Update Documentation Emphasis

**De-emphasize MRR/ARR as a special case**
- Mention it as an example, not a separate rule
- Focus on the principle: "Don't store derived fields"

---

## Summary

### Your Questions - Answered

1. **"where do goals rounds and deals fit in the schema"**
   → They're NESTED inside companies[], not top-level entities

2. **"why do we pay such particular attention to this MRR/ARR exclusivity rule"**
   → You're right - it's over-emphasized. It's just one instance of "no derived fields"

### Recommended Action

**Option A: Quick Fix**
- Update documentation to de-emphasize MRR/ARR
- Make it clear it's nested under "No Derived Fields" rule

**Option B: Code Refactor**
- Add 'arr' to FORBIDDEN_IN_RAW list
- Remove dedicated MRR/ARR check function
- Simplify QA gate to single "No Derived Fields" check

**I recommend Option A** - documentation fix only, no code changes needed right now.

---

## Revised Priority Ranking

1. **CRITICAL**: No derived fields in raw data (including arr)
2. **CRITICAL**: No derived keys in events
3. **CRITICAL**: Referential integrity
4. **IMPORTANT**: Valid enum values
5. **IMPORTANT**: Chronological events
6. **IMPORTANT**: Unique IDs
7. **IMPORTANT**: Parseable timestamps
8. **NICE-TO-HAVE**: Realistic value ranges

MRR/ARR is now correctly classified as **part of rule #1**, not a separate rule.
