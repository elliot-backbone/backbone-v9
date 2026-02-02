/**
 * QA Gate 3: Obviousness Derivation Validation
 * Run: node tests/qa_gate_3.spec.js
 */

import { 
  DISMISSAL_REASONS, 
  DISMISSAL_PENALTY_STRENGTH,
  isStrongDismissal,
  createDismissalEvent,
  validateDismissalEvent,
} from '../raw/dismissalSchema.js';

import { 
  computeObviousnessPenalty,
  computeDecayFactor,
  getObviousnessPenaltyBreakdown,
} from '../derive/obviousness.js';

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

const mockAction = {
  actionId: 'action-test-123',
  entityRef: { type: 'company', id: 'c1', name: 'TestCo' },
  goalId: 'g1',
  sources: [{ sourceType: 'OPPORTUNITY', opportunityClass: 'relationship_leverage' }],
};

const now = new Date('2026-02-02T00:00:00Z');

console.log('\n3.1 Dismissal Schema');
console.log('─'.repeat(50));

test('3.1.1 has all four reason types', () => {
  expect(Object.keys(DISMISSAL_REASONS).length).toBe(4);
  expect(DISMISSAL_REASONS.NOT_NOW).toBeDefined();
  expect(DISMISSAL_REASONS.NOT_RELEVANT).toBeDefined();
  expect(DISMISSAL_REASONS.ALREADY_DOING).toBeDefined();
  expect(DISMISSAL_REASONS.DISAGREE).toBeDefined();
});

test('3.1.2 penalty strengths defined', () => {
  for (const reason of Object.values(DISMISSAL_REASONS)) {
    expect(DISMISSAL_PENALTY_STRENGTH[reason]).toBeDefined();
  }
});

test('3.1.3 isStrongDismissal identifies strong reasons', () => {
  expect(isStrongDismissal(DISMISSAL_REASONS.NOT_RELEVANT)).toBe(true);
  expect(isStrongDismissal(DISMISSAL_REASONS.DISAGREE)).toBe(true);
  expect(isStrongDismissal(DISMISSAL_REASONS.NOT_NOW)).toBe(false);
});

test('3.1.4 createDismissalEvent creates valid event', () => {
  const event = createDismissalEvent({
    actionId: 'action-1', reason: DISMISSAL_REASONS.NOT_NOW,
    userId: 'user-1', companyId: 'c1', sourceType: 'OPPORTUNITY',
  });
  expect(event.eventId).toBeDefined();
  expect(event.actionId).toBe('action-1');
});

test('3.1.5 validateDismissalEvent validates correctly', () => {
  const event = createDismissalEvent({
    actionId: 'action-1', reason: DISMISSAL_REASONS.NOT_NOW,
    userId: 'user-1', companyId: 'c1', sourceType: 'OPPORTUNITY',
  });
  const result = validateDismissalEvent(event);
  expect(result.valid).toBe(true);
});

console.log('\n3.2 Penalty Computation');
console.log('─'.repeat(50));

test('3.2.1 returns value in [0, 0.8]', () => {
  const penalty = computeObviousnessPenalty(mockAction, { now });
  expect(penalty).toBeGreaterThanOrEqual(0);
  expect(penalty).toBeLessThanOrEqual(0.8);
});

test('3.2.2 strong dismissal (disagree) adds significant penalty', () => {
  const penalty = computeObviousnessPenalty(mockAction, {
    dismissals: [{ actionId: 'action-test-123', reason: DISMISSAL_REASONS.DISAGREE, dismissedAt: now.toISOString() }],
    now,
  });
  expect(penalty).toBeGreaterThanOrEqual(0.3);
});

test('3.2.3 mild dismissal (not_now) adds small penalty', () => {
  const penalty = computeObviousnessPenalty(mockAction, {
    dismissals: [{ actionId: 'action-test-123', reason: DISMISSAL_REASONS.NOT_NOW, dismissedAt: now.toISOString() }],
    now,
  });
  expect(penalty).toBeLessThanOrEqual(0.15);
});

test('3.2.4 penalty decays over time', () => {
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentPenalty = computeObviousnessPenalty(mockAction, {
    dismissals: [{ actionId: 'action-test-123', reason: DISMISSAL_REASONS.NOT_NOW, dismissedAt: now.toISOString() }],
    now,
  });
  const oldPenalty = computeObviousnessPenalty(mockAction, {
    dismissals: [{ actionId: 'action-test-123', reason: DISMISSAL_REASONS.NOT_NOW, dismissedAt: thirtyDaysAgo }],
    now,
  });
  expect(oldPenalty).toBeLessThan(recentPenalty);
});

test('3.2.5 surfaced without dismissal has mild penalty', () => {
  const penalty = computeObviousnessPenalty(mockAction, {
    recentlySurfaced: [{ actionId: 'action-test-123', surfacedAt: now.toISOString() }],
    now,
  });
  expect(penalty).toBeLessThanOrEqual(0.15);
  expect(penalty).toBeGreaterThan(0);
});

test('3.2.6 recent user action adds penalty', () => {
  const penalty = computeObviousnessPenalty(mockAction, {
    recentUserActions: [{ companyId: 'c1', goalId: 'g1', completedAt: now.toISOString() }],
    now,
  });
  expect(penalty).toBeGreaterThanOrEqual(0.4);
});

console.log('\n3.3 Cap Enforcement');
console.log('─'.repeat(50));

test('3.3.1 cap at 0.8 with multiple sources', () => {
  const penalty = computeObviousnessPenalty(mockAction, {
    recentUserActions: [{ companyId: 'c1', goalId: 'g1', completedAt: now.toISOString() }],
    dismissals: [{ actionId: 'action-test-123', reason: DISMISSAL_REASONS.DISAGREE, dismissedAt: now.toISOString() }],
    userFocusEntities: ['c1'],
    now,
  });
  expect(penalty).toBeLessThanOrEqual(0.8);
});

test('3.3.2 no action fully suppressed', () => {
  const penalty = computeObviousnessPenalty(mockAction, {
    recentUserActions: [{ companyId: 'c1', goalId: 'g1', completedAt: now.toISOString() }],
    dismissals: [{ actionId: 'action-test-123', reason: DISMISSAL_REASONS.DISAGREE, dismissedAt: now.toISOString() }],
    userFocusEntities: ['c1', 'g1'],
    now,
  });
  expect(penalty).toBeLessThan(1.0);
});

test('3.3.3 computeDecayFactor returns correct decay', () => {
  const immediate = computeDecayFactor(0, 14);
  const halfLife = computeDecayFactor(14, 14);
  expect(immediate).toBe(1);
  expect(Math.abs(halfLife - 0.5)).toBeLessThan(0.01);
});

test('3.3.4 breakdown available for debugging', () => {
  const breakdown = getObviousnessPenaltyBreakdown(mockAction, {
    recentUserActions: [{ companyId: 'c1', goalId: 'g1', completedAt: now.toISOString() }],
    now,
  });
  expect(breakdown.total).toBeDefined();
  expect(breakdown.recentActionMatch).toBeGreaterThanOrEqual(0);
});

console.log('\n' + '═'.repeat(50));
console.log('QA GATE 3 SUMMARY');
console.log('═'.repeat(50));
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  console.log('\n❌ QA GATE 3 FAILED');
  process.exit(1);
} else {
  console.log('\n✅ QA GATE 3 PASSED - Ready for Phase 4');
  process.exit(0);
}
