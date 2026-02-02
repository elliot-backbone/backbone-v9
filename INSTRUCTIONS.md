# Backbone V9 — Project Instructions
*Auto-generated: 2026-02-02T02:29:42.394Z*

## Source of Truth
**Repo:** https://github.com/elliot-backbone/backbone-v9
**Branch:** unknown | **Stable Tag:** unknown | **Last Commit:** unknown

## Reload Protocol
`node .backbone/protocols.js reload`
If QA passes: `node .backbone/protocols.js update`
If QA fails: restore from last known good commit

## QA Status
| Suite | Status |
|-------|--------|
| smoke.js | ✗ FAILED |
| qa32.js | ✗ FAILED |
| qa40.js | ✗ FAILED |
| qa45.js | ✗ FAILED |
| derive_test.js | ✗ FAILED |

## Architecture Layers
L0 /raw — Raw entities + validation
L1 /derive — Pure deterministic derivations
L3 /predict — Issues, trajectories, ripple, calibration
L5 /decide — Action ranking (single surface)
L6 /runtime — Orchestration + IO

## Hard Constraints
1. No stored derivations (forbidden.js enforces)
2. One ranking surface (rankScore only)
3. DAG execution order (graph.js enforces)
4. Files <500 lines
5. No upward layer imports

## Impact Model (Goal-Centric)
upside = Σ (goalWeight × Δprobability)
- ISSUE: 13-62 (actual problems, highest priority)
- PREISSUE: 10-41 (prevention, medium priority)
- GOAL: 10-23 (direct progress, lower priority)

## Ranking Formula
rankScore = expectedNetImpact - trustPenalty - executionFrictionPenalty + timeCriticalityBoost

## North Stars
NS1: Actions are the product | NS2: Optimize for net value | NS3: Truth before intelligence
NS4: Separation of meaning is sacred | NS5: Architecture enforces doctrine | NS6: ONE ranking surface

*Regenerate with `node gen-instructions.js`*
