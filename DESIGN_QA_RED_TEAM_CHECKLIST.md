# Backbone Front-End Design QA & Red-Team Checklist
Anchored to: BACKBONE_STABLE_BASELINE_v1.0

## Purpose
This checklist exists to catch *subtle, high-probability UI drift* that violates Backbone doctrine **without appearing incorrect**.

Failure on any **Hard Fail** item = automatic rejection.

---

## A. Action Primacy (Hard Fail)
- [ ] Exactly one Action is visible on initial render
- [ ] No secondary Actions implied visually or textually
- [ ] Removing the Action makes the UI meaningless

## B. One-Screen-One-Question (Hard Fail)
- [ ] Each screen answers only one explicit question
- [ ] No mixed execution + explanation surfaces
- [ ] No screen simultaneously informs and persuades

## C. Progressive Disclosure (Hard Fail)
- [ ] All secondary content is collapsed by default
- [ ] No passive information leakage
- [ ] User intent required to reveal detail

## D. Raw vs Derived Integrity (Hard Fail)
- [ ] No scores, ranks, or health shown as facts
- [ ] No confidence indicators
- [ ] Deltas and counterfactuals are clearly hypothetical

## E. Anti-Dashboard Drift (Hard Fail)
- [ ] No grids of information implying overview
- [ ] No persistent summaries
- [ ] No “home” other than the Action

## F. UI-1 Boundary Enforcement
- [ ] UI-1 views inspect only
- [ ] UI-1 never suggests decisions
- [ ] Closing UI-1 returns to unchanged UI-0

## G. Investor Psychology Traps
- [ ] No color-coded urgency
- [ ] No gamification
- [ ] No implied certainty or authority

## H. Claude Failure Modes (Red-Team)
- [ ] Claude added helpful explanations
- [ ] Claude added rankings “for clarity”
- [ ] Claude added navigation polish implying structure
- [ ] Claude surfaced multiple Actions “temporarily”

---

## Certification Statement
UI passes QA **only if every Hard Fail item is satisfied**.
