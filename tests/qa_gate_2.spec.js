/**
 * QA Gate 2: OPPORTUNITY Generation Validation
 * 
 * Run: node tests/qa_gate_2.spec.js
 */

import {
  OPPORTUNITY_CLASSES,
  TIMING_WINDOW_TYPES,
  generateOpportunityCandidates,
  generatePortfolioOpportunityCandidates,
  generateRelationshipLeverageOpportunities,
  generateTimingWindowOpportunities,
  generateCrossEntitySynergyOpportunities,
  generateGoalAccelerationOpportunities,
  generateOptionalityBuilderOpportunities,
} from '../predict/opportunityCandidates.js';

// Simple test framework
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
    toBe(expected) {
      if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) throw new Error(`Expected ${actual} > ${expected}`);
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(actual >= expected)) throw new Error(`Expected ${actual} >= ${expected}`);
    },
    toBeDefined() {
      if (actual === undefined) throw new Error(`Expected value to be defined`);
    },
    toHaveLength(expected) {
      if (actual.length !== expected) throw new Error(`Expected length ${expected}, got ${actual.length}`);
    },
    toBeArray() {
      if (!Array.isArray(actual)) throw new Error(`Expected array, got ${typeof actual}`);
    },
  };
}

// Test data
const mockCompany = {
  id: 'company-1',
  name: 'TestCo',
  isPortfolio: true,
  stage: 'Seed',
  sector: 'fintech',
  founderPersonIds: ['p-founder-1'],
};

const mockGoals = [
  { id: 'g1', type: 'fundraise', status: 'active', name: 'Close Seed Round', companyId: 'company-1' },
  { id: 'g2', type: 'revenue', status: 'active', name: 'Hit $100K MRR', companyId: 'company-1' },
];

const mockPeople = [
  { id: 'p-founder-1', name: 'Alice Founder', orgId: 'company-1', orgType: 'company', role: 'CEO' },
  { id: 'p-investor-1', name: 'Bob Investor', orgId: 'fund-1', orgType: 'investor', role: 'Partner' },
  { id: 'p-advisor-1', name: 'Dan Advisor', orgId: 'external', orgType: 'external', role: 'Advisor' },
];

const mockRelationships = [
  { fromPersonId: 'p-founder-1', toPersonId: 'p-advisor-1', strength: 80, lastTouchAt: '2025-06-01' },
  { fromPersonId: 'p-advisor-1', toPersonId: 'p-investor-1', strength: 70, lastTouchAt: '2025-11-01' },
];

const mockInvestors = [
  { id: 'fund-1', personId: 'p-investor-1', name: 'Alpha Ventures', stageFocus: 'Seed', sectorFocus: 'fintech' },
];

const mockTeam = [{ personId: 'p-founder-1', name: 'Alice Founder', role: 'CEO' }];

const mockExternalEvents = [
  { name: 'TechCrunch Disrupt', date: '2026-03-15', type: 'demo_day' },
];

const mockFundCycles = [
  { firmId: 'fund-1', firmName: 'Alpha Ventures', fundNumber: 'III', status: 'deploying' },
];

const mockRoleChanges = [
  { personId: 'p-advisor-1', personName: 'Dan Advisor', newOrg: 'Gamma Fund', newRole: 'Partner', changedAt: '2026-01-15' },
];

const now = new Date('2026-02-02');

// Tests
console.log('\n2.1 Relationship Leverage');
console.log('─'.repeat(50));

test('2.1.1 generates with correct sourceType', () => {
  const opps = generateRelationshipLeverageOpportunities({
    company: mockCompany, goals: mockGoals, people: mockPeople,
    relationships: mockRelationships, team: mockTeam, investors: mockInvestors, now,
  });
  opps.forEach(opp => expect(opp.sources[0].sourceType).toBe('OPPORTUNITY'));
});

test('2.1.2 sets correct opportunityClass', () => {
  const opps = generateRelationshipLeverageOpportunities({
    company: mockCompany, goals: mockGoals, people: mockPeople,
    relationships: mockRelationships, team: mockTeam, investors: mockInvestors, now,
  });
  opps.forEach(opp => expect(opp.sources[0].opportunityClass).toBe(OPPORTUNITY_CLASSES.RELATIONSHIP_LEVERAGE));
});

test('2.1.3 returns array with no relationships', () => {
  const opps = generateRelationshipLeverageOpportunities({
    company: mockCompany, goals: mockGoals, people: mockPeople,
    relationships: [], team: mockTeam, investors: mockInvestors, now,
  });
  expect(opps).toBeArray();
});

console.log('\n2.2 Timing Windows');
console.log('─'.repeat(50));

test('2.2.1 generates event opportunities', () => {
  const opps = generateTimingWindowOpportunities({
    company: mockCompany, goals: mockGoals, externalEvents: mockExternalEvents,
    investorFundCycles: [], roleChanges: [], now,
  });
  expect(opps.length).toBeGreaterThan(0);
});

test('2.2.2 generates fund cycle opportunities', () => {
  const opps = generateTimingWindowOpportunities({
    company: mockCompany, goals: mockGoals, externalEvents: [],
    investorFundCycles: mockFundCycles, roleChanges: [], now,
  });
  const fundOpps = opps.filter(o => o.sources[0].timingWindowType === TIMING_WINDOW_TYPES.FUND_CYCLE);
  expect(fundOpps.length).toBeGreaterThan(0);
});

test('2.2.3 generates role change opportunities', () => {
  const opps = generateTimingWindowOpportunities({
    company: mockCompany, goals: mockGoals, externalEvents: [],
    investorFundCycles: [], roleChanges: mockRoleChanges, now,
  });
  expect(opps.length).toBeGreaterThan(0);
});

test('2.2.4 sets correct opportunityClass', () => {
  const opps = generateTimingWindowOpportunities({
    company: mockCompany, goals: mockGoals, externalEvents: mockExternalEvents,
    investorFundCycles: mockFundCycles, roleChanges: mockRoleChanges, now,
  });
  opps.forEach(opp => expect(opp.sources[0].opportunityClass).toBe(OPPORTUNITY_CLASSES.TIMING_WINDOW));
});

console.log('\n2.3 Cross-Entity Synergy');
console.log('─'.repeat(50));

test('2.3.1 returns array for portfolio', () => {
  const mockCompanyB = { id: 'company-2', name: 'PartnerCo', isPortfolio: true, sector: 'security' };
  const opps = generateCrossEntitySynergyOpportunities({
    companies: [mockCompany, mockCompanyB],
    goalsByCompany: { 'company-1': mockGoals, 'company-2': [] }, now,
  });
  expect(opps).toBeArray();
});

test('2.3.2 sets correct opportunityClass when found', () => {
  const mockCompanyB = { id: 'company-2', name: 'PartnerCo', isPortfolio: true, sector: 'security' };
  const opps = generateCrossEntitySynergyOpportunities({
    companies: [mockCompany, mockCompanyB],
    goalsByCompany: { 'company-1': mockGoals, 'company-2': [] }, now,
  });
  opps.forEach(opp => expect(opp.sources[0].opportunityClass).toBe(OPPORTUNITY_CLASSES.CROSS_ENTITY_SYNERGY));
});

console.log('\n2.4 Goal Acceleration');
console.log('─'.repeat(50));

test('2.4.1 generates for at-risk goals', () => {
  const opps = generateGoalAccelerationOpportunities({
    company: mockCompany, goals: mockGoals,
    goalTrajectories: [{ goalId: 'g1', status: 'at_risk' }], marketData: {}, now,
  });
  expect(opps.length).toBeGreaterThan(0);
});

test('2.4.2 skips on-track goals', () => {
  const opps = generateGoalAccelerationOpportunities({
    company: mockCompany, goals: [{ id: 'g1', type: 'fundraise', status: 'active' }],
    goalTrajectories: [{ goalId: 'g1', status: 'on_track' }], marketData: {}, now,
  });
  expect(opps).toHaveLength(0);
});

test('2.4.3 sets correct opportunityClass', () => {
  const opps = generateGoalAccelerationOpportunities({
    company: mockCompany, goals: mockGoals,
    goalTrajectories: [{ goalId: 'g1', status: 'at_risk' }], marketData: {}, now,
  });
  opps.forEach(opp => expect(opp.sources[0].opportunityClass).toBe(OPPORTUNITY_CLASSES.GOAL_ACCELERATION));
});

console.log('\n2.5 Optionality Builders');
console.log('─'.repeat(50));

test('2.5.1 requires futureUnlocks', () => {
  // Use very dormant relationship (>90 days) to trigger optionality generation
  const opps = generateOptionalityBuilderOpportunities({
    company: mockCompany, goals: mockGoals,
    relationships: [{ fromPersonId: 'p-founder-1', toPersonId: 'p-investor-1', strength: 70, lastTouchAt: '2025-08-01' }],
    people: mockPeople, now,
  });
  // If opportunities are generated, they must have futureUnlocks
  opps.forEach(opp => {
    expect(opp.futureUnlocks).toBeDefined();
    expect(opp.futureUnlocks.length).toBeGreaterThan(0);
  });
  // Also verify the function returns an array even if empty
  expect(opps).toBeArray();
});

test('2.5.2 includes actNowRationale', () => {
  const opps = generateOptionalityBuilderOpportunities({
    company: mockCompany, goals: mockGoals,
    relationships: [{ fromPersonId: 'p-founder-1', toPersonId: 'p-investor-1', strength: 70, lastTouchAt: '2025-08-01' }],
    people: mockPeople, now,
  });
  opps.forEach(opp => expect(opp.actNowRationale).toBeDefined());
  expect(opps).toBeArray();
});

test('2.5.3 sets correct opportunityClass', () => {
  const opps = generateOptionalityBuilderOpportunities({
    company: mockCompany, goals: mockGoals,
    relationships: [{ fromPersonId: 'p-founder-1', toPersonId: 'p-investor-1', strength: 70, lastTouchAt: '2025-06-01' }],
    people: mockPeople, now,
  });
  opps.forEach(opp => expect(opp.sources[0].opportunityClass).toBe(OPPORTUNITY_CLASSES.OPTIONALITY_BUILDER));
});

console.log('\n2.6 Main Generator');
console.log('─'.repeat(50));

test('2.6.1 generateOpportunityCandidates returns array', () => {
  const opps = generateOpportunityCandidates({
    company: mockCompany, goals: mockGoals, people: mockPeople,
    relationships: mockRelationships, team: mockTeam, investors: mockInvestors,
    externalEvents: mockExternalEvents, investorFundCycles: mockFundCycles,
    roleChanges: mockRoleChanges, goalTrajectories: [{ goalId: 'g1', status: 'at_risk' }], now,
  });
  expect(opps).toBeArray();
});

test('2.6.2 all have sourceType OPPORTUNITY', () => {
  const opps = generateOpportunityCandidates({
    company: mockCompany, goals: mockGoals, people: mockPeople,
    relationships: mockRelationships, team: mockTeam, investors: mockInvestors,
    externalEvents: mockExternalEvents, investorFundCycles: mockFundCycles,
    roleChanges: mockRoleChanges, goalTrajectories: [{ goalId: 'g1', status: 'at_risk' }], now,
  });
  opps.forEach(opp => expect(opp.sources[0].sourceType).toBe('OPPORTUNITY'));
});

test('2.6.3 OPPORTUNITY_CLASSES has five classes', () => {
  expect(Object.keys(OPPORTUNITY_CLASSES).length).toBe(5);
});

// Summary
console.log('\n' + '═'.repeat(50));
console.log('QA GATE 2 SUMMARY');
console.log('═'.repeat(50));
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  console.log('\n❌ QA GATE 2 FAILED');
  process.exit(1);
} else {
  console.log('\n✅ QA GATE 2 PASSED - Ready for Phase 3');
  process.exit(0);
}
