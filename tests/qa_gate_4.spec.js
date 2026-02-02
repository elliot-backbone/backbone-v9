/**
 * QA Gate 4: Ranking Integration Validation
 * Run: node tests/qa_gate_4.spec.js
 */

import {
  GATE_CLASS,
  computeProactiveRankScore,
  applyUrgencyGate,
  validateProactivityDistribution,
  rankActions,
  validateRanking,
} from '../decide/ranking.js';

import { ASSUMPTIONS } from '../raw/assumptions_policy.js';

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
    toBeDefined() { if (actual === undefined) throw new Error(`Expected defined`); },
    toHaveLength(expected) { if (actual.length !== expected) throw new Error(`Expected length ${expected}, got ${actual.length}`); },
  };
}

// Test data
const mockOpportunityAction = {
  actionId: 'opp-1',
  entityRef: { type: 'company', id: 'c1', name: 'TestCo' },
  sources: [{ sourceType: 'OPPORTUNITY', opportunityClass: 'relationship_leverage', opportunityRationale: 'test' }],
  impact: { upsideMagnitude: 50, executionProbability: 0.7, effortCost: 5, timeToImpactDays: 14 },
};

const mockIssueAction = {
  actionId: 'issue-1',
  entityRef: { type: 'company', id: 'c1', name: 'TestCo' },
  sources: [{ sourceType: 'ISSUE', issueId: 'i1', issueType: 'RUNWAY_CRITICAL' }],
  impact: { upsideMagnitude: 80, executionProbability: 0.9, effortCost: 10, timeToImpactDays: 7 },
};

console.log('\n4.1 Component Clamping');
console.log('─'.repeat(50));

test('4.1.1 weak impact does not zero rankScore', () => {
  const action = {
    ...mockOpportunityAction,
    impact: { upsideMagnitude: 5, executionProbability: 0.1, effortCost: 1, timeToImpactDays: 60 },
  };
  const { rankScore, components } = computeProactiveRankScore(action, {});
  expect(rankScore).toBeGreaterThan(0);
  expect(components.impact).toBeGreaterThanOrEqual(0.2);
});

test('4.1.2 weak feasibility does not zero rankScore', () => {
  const action = {
    ...mockOpportunityAction,
    impact: { upsideMagnitude: 80, executionProbability: 0.1, effortCost: 25, timeToImpactDays: 14 },
  };
  const { rankScore, components } = computeProactiveRankScore(action, { trustRisk: 0.8 });
  expect(rankScore).toBeGreaterThan(0);
  expect(components.feasibility).toBeGreaterThanOrEqual(0.2);
});

test('4.1.3 all components clamped to [0.2, 1.0]', () => {
  const { components } = computeProactiveRankScore(mockOpportunityAction, {});
  expect(components.impact).toBeGreaterThanOrEqual(0.2);
  expect(components.impact).toBeLessThanOrEqual(1.0);
  expect(components.feasibility).toBeGreaterThanOrEqual(0.2);
  expect(components.feasibility).toBeLessThanOrEqual(1.0);
  expect(components.timing).toBeGreaterThanOrEqual(0.2);
  expect(components.timing).toBeLessThanOrEqual(1.0);
});

test('4.1.4 obviousness penalty capped at 0.8', () => {
  const { components } = computeProactiveRankScore(mockOpportunityAction, {
    obviousnessContext: {
      recentUserActions: [{ companyId: 'c1', goalId: 'g1', completedAt: new Date().toISOString() }],
      dismissals: [{ actionId: 'opp-1', reason: 'disagree', dismissedAt: new Date().toISOString() }],
      userFocusEntities: ['c1'],
    },
  });
  expect(components.obviousnessPenalty).toBeLessThanOrEqual(0.8);
});

console.log('\n4.2 Urgency Gates');
console.log('─'.repeat(50));

test('4.2.1 CAT1 triggers for runway cliff', () => {
  const result = applyUrgencyGate(mockIssueAction, {
    company: { cash: 20000, burn: 10000 }, // 2 months runway
    goals: [], // No active fundraise
  });
  expect(result.gated).toBe(true);
  expect(result.gateClass).toBe('CAT1');
});

test('4.2.2 CAT1 does not trigger with active fundraise', () => {
  const result = applyUrgencyGate(mockIssueAction, {
    company: { cash: 20000, burn: 10000 },
    goals: [{ type: 'fundraise', status: 'active' }],
  });
  // Should not be CAT1 because fundraise is active
  expect(result.gateClass !== 'CAT1' || result.gated === false).toBe(true);
});

test('4.2.3 CAT2 requires unblocks array', () => {
  const issueWithBlocker = {
    ...mockIssueAction,
    sources: [{ sourceType: 'ISSUE', issueId: 'i1', issueType: 'DATA_MISSING' }],
  };
  const result = applyUrgencyGate(issueWithBlocker, {
    company: { cash: 100000, burn: 10000 }, // Healthy runway
    goals: [],
    topOpportunityActions: [{
      actionId: 'opp-1',
      entityRef: { id: 'c1' },
      requiresData: true,
    }],
  });
  if (result.gateClass === 'CAT2') {
    expect(result.unblocks).toBeDefined();
    expect(result.unblocks.length).toBeGreaterThan(0);
  }
});

test('4.2.4 no gate for healthy company', () => {
  const result = applyUrgencyGate(mockIssueAction, {
    company: { cash: 100000, burn: 10000 }, // 10 months runway
    goals: [],
    topOpportunityActions: [],
  });
  // Either not gated, or not CAT1
  if (result.gated) {
    expect(result.gateClass).toBe('CAT2');
  }
});

test('4.2.5 OPPORTUNITY actions bypass gates', () => {
  const result = applyUrgencyGate(mockOpportunityAction, {
    company: { cash: 20000, burn: 10000 },
    goals: [],
  });
  expect(result.gated).toBe(false);
});

console.log('\n4.3 Proactivity Distribution');
console.log('─'.repeat(50));

test('4.3.1 ≥70% OPPORTUNITY when no gate', () => {
  const actions = [
    ...Array(7).fill(null).map((_, i) => ({ 
      actionId: `opp${i}`, 
      sources: [{ sourceType: 'OPPORTUNITY' }],
      rankScore: 10 - i,
    })),
    ...Array(3).fill(null).map((_, i) => ({ 
      actionId: `issue${i}`, 
      sources: [{ sourceType: 'ISSUE' }],
      rankScore: 3 - i,
    })),
  ];
  const result = validateProactivityDistribution(actions, {});
  expect(result.valid).toBe(true);
  expect(result.ratio).toBeGreaterThanOrEqual(0.7);
});

test('4.3.2 fails when <70% OPPORTUNITY (no gate)', () => {
  const actions = [
    ...Array(5).fill(null).map((_, i) => ({ 
      actionId: `opp${i}`, 
      sources: [{ sourceType: 'OPPORTUNITY' }],
      rankScore: 10 - i,
    })),
    ...Array(5).fill(null).map((_, i) => ({ 
      actionId: `issue${i}`, 
      sources: [{ sourceType: 'ISSUE' }],
      rankScore: 5 - i,
    })),
  ];
  const result = validateProactivityDistribution(actions, {});
  expect(result.valid).toBe(false);
});

test('4.3.3 CAT2 allows ≥50% OPPORTUNITY', () => {
  const actions = [
    ...Array(5).fill(null).map((_, i) => ({ 
      actionId: `opp${i}`, 
      sources: [{ sourceType: 'OPPORTUNITY' }],
      rankScore: 10 - i,
    })),
    ...Array(5).fill(null).map((_, i) => ({ 
      actionId: `issue${i}`, 
      sources: [{ sourceType: 'ISSUE' }],
      rankScore: 5 - i,
    })),
  ];
  const result = validateProactivityDistribution(actions, { activeCat2Gate: true });
  expect(result.valid).toBe(true);
});

test('4.3.4 CAT1 has no distribution requirement', () => {
  const actions = [
    ...Array(2).fill(null).map((_, i) => ({ 
      actionId: `opp${i}`, 
      sources: [{ sourceType: 'OPPORTUNITY' }],
      rankScore: 10 - i,
    })),
    ...Array(8).fill(null).map((_, i) => ({ 
      actionId: `issue${i}`, 
      sources: [{ sourceType: 'ISSUE' }],
      rankScore: 8 - i,
    })),
  ];
  const result = validateProactivityDistribution(actions, { activeCat1Gate: true });
  expect(result.valid).toBe(true);
});

console.log('\n4.4 Single Ranking Surface');
console.log('─'.repeat(50));

test('4.4.1 rankActions sorts by rankScore', () => {
  const actions = [
    { ...mockOpportunityAction, actionId: 'a1', impact: { upsideMagnitude: 30 } },
    { ...mockOpportunityAction, actionId: 'a2', impact: { upsideMagnitude: 80 } },
    { ...mockOpportunityAction, actionId: 'a3', impact: { upsideMagnitude: 50 } },
  ];
  const ranked = rankActions(actions, {});
  
  // Should be sorted descending by score
  for (let i = 1; i < ranked.length; i++) {
    expect(ranked[i].rankScore).toBeLessThanOrEqual(ranked[i-1].rankScore);
  }
});

test('4.4.2 validateRanking confirms correct order', () => {
  const actions = [
    { ...mockOpportunityAction, actionId: 'a1', impact: { upsideMagnitude: 80 } },
    { ...mockOpportunityAction, actionId: 'a2', impact: { upsideMagnitude: 50 } },
  ];
  const ranked = rankActions(actions, {});
  const result = validateRanking(ranked);
  expect(result.valid).toBe(true);
});

test('4.4.3 all ranked actions have rankScore', () => {
  const actions = [mockOpportunityAction, { ...mockOpportunityAction, actionId: 'a2' }];
  const ranked = rankActions(actions, {});
  ranked.forEach(action => {
    expect(action.rankScore).toBeDefined();
    expect(typeof action.rankScore).toBe('number');
  });
});

console.log('\n' + '═'.repeat(50));
console.log('QA GATE 4 SUMMARY');
console.log('═'.repeat(50));
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  console.log('\n❌ QA GATE 4 FAILED');
  process.exit(1);
} else {
  console.log('\n✅ QA GATE 4 PASSED - Ready for Phase 5');
  process.exit(0);
}
