/**
 * QA Gate 1: Foundation Validation
 * 
 * Tests for Phase 1 deliverables:
 * - 1.1 ASSUMPTIONS policy layer
 * - 1.2 Derived metrics infrastructure
 * - 1.3 Persistence discipline enforcement
 * 
 * ALL TESTS MUST PASS before proceeding to Phase 2.
 * 
 * Run: node tests/qa_gate_1.spec.js
 */

import { ASSUMPTIONS, getGoalWeight, getTimingUrgency, computeOptionalityDiscount, getRelationshipBand } from '../raw/assumptions_policy.js';
import { deriveRunwayMonths, deriveRunwayStatus, isAtRunwayCliff, deriveRunwayHealthScore } from '../derive/runwayDerived.js';
import { normalizeImpact, clampComponent, normalizeFeasibility, normalizeTiming, isValidClampedComponent } from '../derive/impactNormalized.js';
import { FORBIDDEN_PERSIST_FIELDS, validateBeforePersist, auditRawDirectory, stripForbiddenFields } from '../qa/persistence_discipline.js';

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
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(actual >= expected)) {
        throw new Error(`Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (!(actual <= expected)) {
        throw new Error(`Expected ${actual} <= ${expected}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected value to be undefined, got ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected array to contain ${expected}`);
      }
    },
    toHaveLength(expected) {
      if (actual.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${actual.length}`);
      }
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// 1.1 ASSUMPTIONS POLICY LAYER
// ═══════════════════════════════════════════════════════════════

console.log('\n1.1 ASSUMPTIONS Policy Layer');
console.log('─'.repeat(50));

test('1.1.1 ASSUMPTIONS exports object', () => {
  expect(ASSUMPTIONS).toBeDefined();
  expect(typeof ASSUMPTIONS).toBe('object');
});

test('1.1.2 ASSUMPTIONS has version and updatedAt', () => {
  expect(ASSUMPTIONS.version).toBeDefined();
  expect(ASSUMPTIONS.updatedAt).toBeDefined();
  expect(typeof ASSUMPTIONS.version).toBe('string');
  expect(typeof ASSUMPTIONS.updatedAt).toBe('string');
});

test('1.1.3 ASSUMPTIONS has goalWeightsByStage', () => {
  expect(ASSUMPTIONS.goalWeightsByStage).toBeDefined();
  expect(ASSUMPTIONS.goalWeightsByStage['Seed']).toBeDefined();
  expect(ASSUMPTIONS.goalWeightsByStage['Series A']).toBeDefined();
});

test('1.1.4 getGoalWeight returns valid multiplier', () => {
  const weight = getGoalWeight('fundraise', 'Pre-seed');
  expect(weight).toBeGreaterThan(0);
  expect(weight).toBeLessThan(2);
});

test('1.1.5 getGoalWeight returns 1.0 for unknown', () => {
  const weight = getGoalWeight('unknown_type', 'Unknown Stage');
  expect(weight).toBe(1.0);
});

test('1.1.6 getTimingUrgency returns correct levels', () => {
  expect(getTimingUrgency(3)).toBe('critical');
  expect(getTimingUrgency(10)).toBe('high');
  expect(getTimingUrgency(20)).toBe('medium');
  expect(getTimingUrgency(45)).toBe('low');
});

test('1.1.7 computeOptionalityDiscount returns valid discount', () => {
  const immediate = computeOptionalityDiscount(0);
  const sixMonths = computeOptionalityDiscount(6);
  const tooFar = computeOptionalityDiscount(24);
  
  expect(immediate).toBe(1);
  expect(sixMonths).toBeLessThan(1);
  expect(sixMonths).toBeGreaterThan(0);
  expect(tooFar).toBe(0);
});

test('1.1.8 getRelationshipBand returns correct band', () => {
  expect(getRelationshipBand(80)).toBe('strong');
  expect(getRelationshipBand(50)).toBe('moderate');
  expect(getRelationshipBand(20)).toBe('weak');
});

test('1.1.9 ASSUMPTIONS has urgencyGates', () => {
  expect(ASSUMPTIONS.urgencyGates).toBeDefined();
  expect(ASSUMPTIONS.urgencyGates.runwayCliffMonths).toBeDefined();
  expect(typeof ASSUMPTIONS.urgencyGates.runwayCliffMonths).toBe('number');
});

test('1.1.10 ASSUMPTIONS has rankingBounds', () => {
  expect(ASSUMPTIONS.rankingBounds).toBeDefined();
  expect(ASSUMPTIONS.rankingBounds.componentFloor).toBe(0.2);
  expect(ASSUMPTIONS.rankingBounds.componentCeiling).toBe(1.0);
  expect(ASSUMPTIONS.rankingBounds.obviousnessCap).toBe(0.8);
});

// ═══════════════════════════════════════════════════════════════
// 1.2 DERIVED METRICS INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════

console.log('\n1.2 Derived Metrics Infrastructure');
console.log('─'.repeat(50));

test('1.2.1 deriveRunwayMonths handles normal case', () => {
  const company = { cash: 100000, burn: 10000 };
  expect(deriveRunwayMonths(company)).toBe(10);
});

test('1.2.2 deriveRunwayMonths handles zero cash', () => {
  const company = { cash: 0, burn: 10000 };
  expect(deriveRunwayMonths(company)).toBe(0);
});

test('1.2.3 deriveRunwayMonths handles zero burn', () => {
  const company = { cash: 100000, burn: 0 };
  expect(deriveRunwayMonths(company)).toBe(Infinity);
});

test('1.2.4 deriveRunwayMonths handles missing fields', () => {
  const company = {};
  expect(deriveRunwayMonths(company)).toBe(Infinity); // 0/0 → Infinity via burn=0 path
});

test('1.2.5 deriveRunwayStatus returns correct status', () => {
  expect(deriveRunwayStatus({ cash: 100000, burn: 50000 })).toBe('critical'); // 2 months
  expect(deriveRunwayStatus({ cash: 100000, burn: 20000 })).toBe('warning');  // 5 months
  expect(deriveRunwayStatus({ cash: 100000, burn: 5000 })).toBe('healthy');   // 20 months
});

test('1.2.6 isAtRunwayCliff identifies cliff correctly', () => {
  const criticalCompany = { cash: 20000, burn: 10000 }; // 2 months
  const healthyCompany = { cash: 100000, burn: 10000 }; // 10 months
  
  // Critical with no fundraise = cliff
  expect(isAtRunwayCliff(criticalCompany, [])).toBe(true);
  
  // Critical with active fundraise = not cliff
  expect(isAtRunwayCliff(criticalCompany, [
    { type: 'fundraise', status: 'active' }
  ])).toBe(false);
  
  // Healthy = not cliff
  expect(isAtRunwayCliff(healthyCompany, [])).toBe(false);
});

test('1.2.7 deriveRunwayHealthScore returns 0-100', () => {
  const score = deriveRunwayHealthScore({ cash: 100000, burn: 10000 });
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
});

test('1.2.8 normalizeImpact returns [0, 1]', () => {
  expect(normalizeImpact(0)).toBe(0);
  expect(normalizeImpact(100)).toBe(1);
  expect(normalizeImpact(50)).toBe(0.5);
});

test('1.2.9 normalizeImpact clamps out-of-range values', () => {
  expect(normalizeImpact(-10)).toBe(0);
  expect(normalizeImpact(150)).toBe(1);
});

test('1.2.10 normalizeImpact handles invalid input', () => {
  expect(normalizeImpact(null)).toBe(0);
  expect(normalizeImpact(undefined)).toBe(0);
  expect(normalizeImpact(NaN)).toBe(0);
});

test('1.2.11 clampComponent enforces floor', () => {
  const clamped = clampComponent(0.1);
  expect(clamped).toBe(0.2); // Floor is 0.2
});

test('1.2.12 clampComponent enforces ceiling', () => {
  const clamped = clampComponent(1.5);
  expect(clamped).toBe(1.0);
});

test('1.2.13 normalizeFeasibility combines factors', () => {
  const high = normalizeFeasibility({
    executionProbability: 0.9,
    trustRiskScore: 10,
    effortCost: 1,
  });
  
  const low = normalizeFeasibility({
    executionProbability: 0.3,
    trustRiskScore: 80,
    effortCost: 20,
  });
  
  expect(high).toBeGreaterThan(low);
  expect(high).toBeLessThanOrEqual(1);
  expect(low).toBeGreaterThanOrEqual(0);
});

test('1.2.14 normalizeTiming decays with time', () => {
  const immediate = normalizeTiming(0);
  const oneMonth = normalizeTiming(30);
  const twoMonths = normalizeTiming(60);
  
  expect(immediate).toBeGreaterThan(oneMonth);
  expect(oneMonth).toBeGreaterThan(twoMonths);
});

test('1.2.15 isValidClampedComponent validates correctly', () => {
  expect(isValidClampedComponent(0.5)).toBe(true);
  expect(isValidClampedComponent(0.2)).toBe(true);
  expect(isValidClampedComponent(1.0)).toBe(true);
  expect(isValidClampedComponent(0.1)).toBe(false); // Below floor
  expect(isValidClampedComponent(1.5)).toBe(false); // Above ceiling
});

// ═══════════════════════════════════════════════════════════════
// 1.3 PERSISTENCE DISCIPLINE ENFORCEMENT
// ═══════════════════════════════════════════════════════════════

console.log('\n1.3 Persistence Discipline Enforcement');
console.log('─'.repeat(50));

test('1.3.1 FORBIDDEN_PERSIST_FIELDS includes rankScore', () => {
  expect(FORBIDDEN_PERSIST_FIELDS).toContain('rankScore');
});

test('1.3.2 FORBIDDEN_PERSIST_FIELDS includes obviousnessPenalty', () => {
  expect(FORBIDDEN_PERSIST_FIELDS).toContain('obviousnessPenalty');
});

test('1.3.3 FORBIDDEN_PERSIST_FIELDS includes derived runway', () => {
  expect(FORBIDDEN_PERSIST_FIELDS).toContain('runwayMonthsDerived');
});

test('1.3.4 validateBeforePersist catches rankScore', () => {
  const badObj = { name: 'test', rankScore: 50 };
  const result = validateBeforePersist(badObj, 'test');
  expect(result.valid).toBe(false);
  expect(result.violations.length).toBeGreaterThan(0);
});

test('1.3.5 validateBeforePersist catches nested forbidden fields', () => {
  const badObj = { 
    name: 'test', 
    nested: { obviousnessPenalty: 0.3 } 
  };
  const result = validateBeforePersist(badObj, 'test');
  expect(result.valid).toBe(false);
});

test('1.3.6 validateBeforePersist allows clean objects', () => {
  const goodObj = { 
    name: 'test', 
    goalId: 'g1',
    impact: { upsideMagnitude: 50 }
  };
  const result = validateBeforePersist(goodObj, 'test');
  expect(result.valid).toBe(true);
  expect(result.violations).toHaveLength(0);
});

test('1.3.7 validateBeforePersist checks arrays', () => {
  const badObj = {
    items: [
      { name: 'ok' },
      { name: 'bad', rankScore: 10 },
    ]
  };
  const result = validateBeforePersist(badObj, 'test');
  expect(result.valid).toBe(false);
});

test('1.3.8 stripForbiddenFields removes rankScore', () => {
  const obj = { name: 'test', rankScore: 50, goalId: 'g1' };
  const cleaned = stripForbiddenFields(obj);
  expect(cleaned.rankScore).toBeUndefined();
  expect(cleaned.name).toBe('test');
  expect(cleaned.goalId).toBe('g1');
});

test('1.3.9 stripForbiddenFields handles nested objects', () => {
  const obj = { 
    name: 'test', 
    nested: { value: 1, obviousnessPenalty: 0.5 } 
  };
  const cleaned = stripForbiddenFields(obj);
  expect(cleaned.nested.obviousnessPenalty).toBeUndefined();
  expect(cleaned.nested.value).toBe(1);
});

test('1.3.10 auditRawDirectory validates structure', () => {
  const rawData = {
    'companies.json': [
      { id: 'c1', name: 'Test' },
      { id: 'c2', name: 'Test2' },
    ],
    'goals.json': [
      { id: 'g1', name: 'Goal' },
    ],
  };
  
  const result = auditRawDirectory(rawData);
  expect(result.valid).toBe(true);
  expect(result.summary.filesChecked).toBe(2);
});

test('1.3.11 auditRawDirectory catches violations', () => {
  const rawData = {
    'companies.json': [
      { id: 'c1', name: 'Test', rankScore: 50 }, // Violation!
    ],
  };
  
  const result = auditRawDirectory(rawData);
  expect(result.valid).toBe(false);
  expect(result.summary.violationsFound).toBeGreaterThan(0);
});

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(50));
console.log('QA GATE 1 SUMMARY');
console.log('═'.repeat(50));
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach(f => {
    console.log(`  - ${f.name}: ${f.error}`);
  });
  console.log('\n❌ QA GATE 1 FAILED - Do not proceed to Phase 2');
  process.exit(1);
} else {
  console.log('\n✅ QA GATE 1 PASSED - Ready for Phase 2');
  process.exit(0);
}
