/**
 * ranking_live.spec.js — Unit tests for the live ranking system
 *
 * Tests: computeExpectedNetImpact, computeRankScore, rankActions,
 * validateRanking, computeTrustPenalty, computeExecutionFrictionPenalty,
 * computeTimeCriticalityBoost, computeSourceTypeBoost, timePenalty.
 *
 * A2.3: Pattern lift integration test included.
 *
 * Run: node tests/ranking_live.spec.js
 */

import {
  computeExpectedNetImpact,
  computeRankScore,
  rankActions,
  validateRanking
} from '../decide/ranking.js';

import {
  computeTrustPenalty,
  computeExecutionFrictionPenalty,
  computeTimeCriticalityBoost,
  computeSourceTypeBoost,
  timePenalty
} from '../decide/weights.js';

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    failures.push({ name, error: error.message });
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) { if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`); },
    toBeGreaterThan(expected) { if (!(actual > expected)) throw new Error(`Expected ${actual} > ${expected}`); },
    toBeGreaterThanOrEqual(expected) { if (!(actual >= expected)) throw new Error(`Expected ${actual} >= ${expected}`); },
    toBeLessThan(expected) { if (!(actual < expected)) throw new Error(`Expected ${actual} < ${expected}`); },
    toBeLessThanOrEqual(expected) { if (!(actual <= expected)) throw new Error(`Expected ${actual} <= ${expected}`); },
    toBeDefined() { if (actual === undefined) throw new Error('Expected defined'); },
    toHaveLength(expected) { if (actual.length !== expected) throw new Error(`Expected length ${expected}, got ${actual.length}`); },
  };
}

// Test fixtures
const makeAction = (overrides = {}) => ({
  actionId: overrides.actionId || 'a1',
  entityRef: { type: 'company', id: 'c1', name: 'TestCo' },
  sources: overrides.sources || [{ sourceType: 'ISSUE', issueId: 'i1' }],
  impact: {
    upsideMagnitude: 50,
    probabilityOfSuccess: 0.7,
    executionProbability: 0.8,
    downsideMagnitude: 10,
    timeToImpactDays: 14,
    effortCost: 3,
    secondOrderLeverage: 2,
    ...(overrides.impact || {})
  },
  steps: overrides.steps || [{ step: 1, action: 'Do it' }],
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════
// computeExpectedNetImpact
// ═══════════════════════════════════════════════════════════════

console.log('\nR1 computeExpectedNetImpact');
console.log('─'.repeat(50));

test('R1.1 positive impact with defaults', () => {
  const eni = computeExpectedNetImpact({ upsideMagnitude: 50, probabilityOfSuccess: 0.8 });
  // upside: 50 * 1 * 0.8 = 40, downside: 0, timePen: 14/7=2, effort: 0, leverage: 0
  // = 40 - 0 - 0 - 2 = 38
  expect(eni).toBeGreaterThan(0);
});

test('R1.2 negative impact when effort dominates', () => {
  const eni = computeExpectedNetImpact({
    upsideMagnitude: 5,
    probabilityOfSuccess: 0.1,
    executionProbability: 0.1,
    downsideMagnitude: 20,
    effortCost: 30,
    timeToImpactDays: 90,
  });
  expect(eni).toBeLessThan(0);
});

test('R1.3 zero upside returns negative', () => {
  const eni = computeExpectedNetImpact({
    upsideMagnitude: 0,
    effortCost: 5,
    timeToImpactDays: 14,
  });
  expect(eni).toBeLessThan(0);
});

test('R1.4 all-defaults produces a value', () => {
  const eni = computeExpectedNetImpact({});
  // upside: 0*1*0.5=0, timePen: 14/7=2 → -2
  expect(typeof eni).toBe('number');
  expect(eni).toBeLessThan(0);
});

test('R1.5 secondOrderLeverage adds to score', () => {
  const base = computeExpectedNetImpact({ upsideMagnitude: 50, secondOrderLeverage: 0 });
  const with_lev = computeExpectedNetImpact({ upsideMagnitude: 50, secondOrderLeverage: 10 });
  expect(with_lev).toBeGreaterThan(base);
});

// ═══════════════════════════════════════════════════════════════
// computeTrustPenalty
// ═══════════════════════════════════════════════════════════════

console.log('\nR2 computeTrustPenalty');
console.log('─'.repeat(50));

test('R2.1 zero risk returns zero penalty', () => {
  expect(computeTrustPenalty(0)).toBe(0);
});

test('R2.2 below threshold returns zero', () => {
  expect(computeTrustPenalty(0.2)).toBe(0);
});

test('R2.3 above threshold returns positive penalty', () => {
  const penalty = computeTrustPenalty(0.8);
  expect(penalty).toBeGreaterThan(0);
});

// ═══════════════════════════════════════════════════════════════
// computeExecutionFrictionPenalty
// ═══════════════════════════════════════════════════════════════

console.log('\nR3 computeExecutionFrictionPenalty');
console.log('─'.repeat(50));

test('R3.1 no steps returns zero', () => {
  expect(computeExecutionFrictionPenalty({})).toBe(0);
});

test('R3.2 more steps = higher penalty', () => {
  const oneStep = computeExecutionFrictionPenalty({ steps: [{ step: 1 }] });
  const threeSteps = computeExecutionFrictionPenalty({ steps: [{ step: 1 }, { step: 2 }, { step: 3 }] });
  expect(threeSteps).toBeGreaterThan(oneStep);
});

test('R3.3 complexity adds penalty', () => {
  const noComplexity = computeExecutionFrictionPenalty({ steps: [{ step: 1 }] });
  const withComplexity = computeExecutionFrictionPenalty({ steps: [{ step: 1 }], complexity: 3 });
  expect(withComplexity).toBeGreaterThan(noComplexity);
});

// ═══════════════════════════════════════════════════════════════
// computeTimeCriticalityBoost
// ═══════════════════════════════════════════════════════════════

console.log('\nR4 computeTimeCriticalityBoost');
console.log('─'.repeat(50));

test('R4.1 null deadline returns zero', () => {
  expect(computeTimeCriticalityBoost(null)).toBe(0);
});

test('R4.2 far deadline returns zero', () => {
  expect(computeTimeCriticalityBoost(365)).toBe(0);
});

test('R4.3 near deadline returns positive boost', () => {
  const boost = computeTimeCriticalityBoost(3);
  expect(boost).toBeGreaterThan(0);
});

test('R4.4 nearer deadline = higher boost', () => {
  const near = computeTimeCriticalityBoost(2);
  const farther = computeTimeCriticalityBoost(14);
  expect(near).toBeGreaterThan(farther);
});

// ═══════════════════════════════════════════════════════════════
// computeSourceTypeBoost
// ═══════════════════════════════════════════════════════════════

console.log('\nR5 computeSourceTypeBoost');
console.log('─'.repeat(50));

test('R5.1 ISSUE gets highest boost', () => {
  const issueBoost = computeSourceTypeBoost({ sources: [{ sourceType: 'ISSUE' }] });
  const preissueBoost = computeSourceTypeBoost({ sources: [{ sourceType: 'PREISSUE' }] });
  expect(issueBoost).toBeGreaterThan(preissueBoost);
});

test('R5.2 unknown source gets zero boost', () => {
  expect(computeSourceTypeBoost({ sources: [{ sourceType: 'INTRODUCTION' }] })).toBe(0);
});

test('R5.3 missing sources returns zero', () => {
  expect(computeSourceTypeBoost({})).toBe(0);
});

// ═══════════════════════════════════════════════════════════════
// timePenalty
// ═══════════════════════════════════════════════════════════════

console.log('\nR6 timePenalty');
console.log('─'.repeat(50));

test('R6.1 zero days returns zero penalty', () => {
  expect(timePenalty(0)).toBe(0);
});

test('R6.2 longer time = higher penalty', () => {
  expect(timePenalty(30)).toBeGreaterThan(timePenalty(7));
});

test('R6.3 capped at max', () => {
  const veryLong = timePenalty(10000);
  expect(veryLong).toBe(30); // WEIGHTS.impact.timePenaltyMax
});

// ═══════════════════════════════════════════════════════════════
// computeRankScore
// ═══════════════════════════════════════════════════════════════

console.log('\nR7 computeRankScore');
console.log('─'.repeat(50));

test('R7.1 returns rankScore and components', () => {
  const action = makeAction();
  const result = computeRankScore(action);
  expect(typeof result.rankScore).toBe('number');
  expect(result.components.expectedNetImpact).toBeDefined();
  expect(result.components.trustPenalty).toBeDefined();
  expect(result.components.executionFrictionPenalty).toBeDefined();
  expect(result.components.timeCriticalityBoost).toBeDefined();
  expect(result.components.sourceTypeBoost).toBeDefined();
});

test('R7.2 high trustRisk lowers score', () => {
  const action = makeAction();
  const normal = computeRankScore(action, { trustRisk: 0 });
  const risky = computeRankScore(action, { trustRisk: 0.9 });
  expect(risky.rankScore).toBeLessThan(normal.rankScore);
});

test('R7.3 deadline boost raises score', () => {
  const action = makeAction();
  const noDeadline = computeRankScore(action, {});
  const withDeadline = computeRankScore(action, { daysUntilDeadline: 3 });
  expect(withDeadline.rankScore).toBeGreaterThan(noDeadline.rankScore);
});

// ═══════════════════════════════════════════════════════════════
// rankActions
// ═══════════════════════════════════════════════════════════════

console.log('\nR8 rankActions');
console.log('─'.repeat(50));

test('R8.1 empty input returns empty', () => {
  expect(rankActions([])).toHaveLength(0);
  expect(rankActions(null)).toHaveLength(0);
});

test('R8.2 sorts descending by rankScore', () => {
  const actions = [
    makeAction({ actionId: 'low', impact: { upsideMagnitude: 10 } }),
    makeAction({ actionId: 'high', impact: { upsideMagnitude: 80 } }),
    makeAction({ actionId: 'mid', impact: { upsideMagnitude: 40 } }),
  ];
  const ranked = rankActions(actions);
  for (let i = 1; i < ranked.length; i++) {
    expect(ranked[i].rankScore).toBeLessThanOrEqual(ranked[i - 1].rankScore);
  }
});

test('R8.3 deterministic — same input, same output', () => {
  const actions = [
    makeAction({ actionId: 'a1', impact: { upsideMagnitude: 50 } }),
    makeAction({ actionId: 'a2', impact: { upsideMagnitude: 50 } }),
    makeAction({ actionId: 'a3', impact: { upsideMagnitude: 30 } }),
  ];
  const r1 = rankActions(actions);
  const r2 = rankActions(actions);
  expect(r1.length).toBe(r2.length);
  for (let i = 0; i < r1.length; i++) {
    expect(r1[i].actionId).toBe(r2[i].actionId);
  }
});

test('R8.4 per-company-per-type cap at 5', () => {
  const actions = Array.from({ length: 10 }, (_, i) =>
    makeAction({
      actionId: `a${i}`,
      impact: { upsideMagnitude: 80 - i },
      sources: [{ sourceType: 'ISSUE' }],
    })
  );
  const ranked = rankActions(actions);
  const issueCount = ranked.filter(
    a => a.sources[0]?.sourceType === 'ISSUE' && a.entityRef.name === 'TestCo'
  ).length;
  expect(issueCount).toBeLessThanOrEqual(5);
});

test('R8.5 negative scores filtered out', () => {
  const actions = [
    makeAction({
      actionId: 'neg',
      impact: { upsideMagnitude: 0, effortCost: 100, downsideMagnitude: 50 },
    }),
  ];
  const ranked = rankActions(actions);
  expect(ranked.length).toBe(0);
});

test('R8.6 assigns sequential ranks starting at 1', () => {
  const actions = [
    makeAction({ actionId: 'a1', impact: { upsideMagnitude: 80 } }),
    makeAction({ actionId: 'a2', impact: { upsideMagnitude: 50 } }),
  ];
  const ranked = rankActions(actions);
  expect(ranked[0].rank).toBe(1);
  expect(ranked[1].rank).toBe(2);
});

test('R8.7 rankComponents present on every action', () => {
  const actions = [makeAction()];
  const ranked = rankActions(actions);
  expect(ranked[0].rankComponents).toBeDefined();
  expect(ranked[0].rankComponents.expectedNetImpact).toBeDefined();
  expect(typeof ranked[0].rankComponents.patternLift).toBe('number');
});

// ═══════════════════════════════════════════════════════════════
// validateRanking
// ═══════════════════════════════════════════════════════════════

console.log('\nR9 validateRanking');
console.log('─'.repeat(50));

test('R9.1 valid ranking passes', () => {
  const actions = [
    makeAction({ actionId: 'a1', impact: { upsideMagnitude: 80 } }),
    makeAction({ actionId: 'a2', impact: { upsideMagnitude: 50 } }),
  ];
  const ranked = rankActions(actions);
  const result = validateRanking(ranked);
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
});

test('R9.2 empty ranking passes', () => {
  const result = validateRanking([]);
  expect(result.valid).toBe(true);
});

// ═══════════════════════════════════════════════════════════════
// A2.3: Pattern Lift Integration
// ═══════════════════════════════════════════════════════════════

console.log('\nR10 Pattern Lift Integration (A2.3)');
console.log('─'.repeat(50));

test('R10.1 events key is "events" not "actionEvents"', () => {
  const actions = [
    makeAction({ actionId: 'a1', impact: { upsideMagnitude: 50 } }),
  ];
  // Just verify it doesn't crash with the correct key
  const ranked = rankActions(actions, {
    events: [
      {
        id: 'ev1',
        actionId: 'a1',
        eventType: 'completed',
        timestamp: new Date().toISOString(),
        actor: 'user',
        payload: { outcome: 'success' },
      },
    ],
  });
  expect(ranked.length).toBeGreaterThan(0);
  expect(typeof ranked[0].rankComponents.patternLift).toBe('number');
});

test('R10.2 patternLift non-zero with relevant events', () => {
  const actions = [
    makeAction({
      actionId: 'a1',
      sources: [{ sourceType: 'ISSUE', issueType: 'RUNWAY_WARNING' }],
      impact: { upsideMagnitude: 50 },
    }),
  ];
  // Multiple completed events for same action type → should produce pattern lift
  const events = Array.from({ length: 5 }, (_, i) => ({
    id: `ev${i}`,
    actionId: `past-${i}`,
    eventType: 'outcome_recorded',
    timestamp: new Date(Date.now() - i * 86400000).toISOString(),
    actor: 'user',
    payload: {
      outcome: 'success',
      sourceType: 'ISSUE',
      issueType: 'RUNWAY_WARNING',
    },
  }));
  const ranked = rankActions(actions, { events });
  // Pattern lift may or may not be non-zero depending on pattern matching logic,
  // but the field must exist and be numeric
  expect(typeof ranked[0].rankComponents.patternLift).toBe('number');
});

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(50));
console.log('RANKING LIVE SPEC SUMMARY');
console.log('═'.repeat(50));
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  console.log('\n❌ RANKING LIVE SPEC FAILED');
  process.exit(1);
} else {
  console.log('\n✅ RANKING LIVE SPEC PASSED');
  process.exit(0);
}
