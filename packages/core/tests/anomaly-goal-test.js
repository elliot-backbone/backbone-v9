/**
 * Test: anomaly detection → goal suggestion pipeline
 * Demonstrates feathered bounds behavior
 */

import { getStageParams } from '../raw/stageParams.js';
import { detectAnomalies, ANOMALY_SEVERITY, TOLERANCE_CONFIG } from '../derive/anomalyDetection.js';
import { suggestGoals } from '../predict/suggestedGoals.js';

const SEVERITY_NAMES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

console.log('═══════════════════════════════════════════════════════════');
console.log('TEST: Feathered Bounds Anomaly Detection');
console.log('═══════════════════════════════════════════════════════════\n');

const params = getStageParams('Seed');
console.log('Stage: Seed');
console.log(`Runway bounds: ${params.runwayMin}-${params.runwayMax} months (target: ${params.runwayTarget})`);
console.log('Tolerance config:', JSON.stringify(TOLERANCE_CONFIG.runway, null, 2));
console.log('');

// Calculate the actual zones for Seed stage
const range = params.runwayMax - params.runwayMin; // 18-9 = 9
const innerBuffer = range * 0.15; // 1.35 months
const outerBuffer = params.runwayMin * 0.20; // 1.8 months

console.log('Calculated zones:');
console.log(`  Critical floor: < 3 months`);
console.log(`  Hard boundary:  < ${(params.runwayMin - outerBuffer).toFixed(1)} months (soft min)`);
console.log(`  Outer tolerance: ${(params.runwayMin - outerBuffer).toFixed(1)} - ${params.runwayMin} months`);
console.log(`  Inner warning:  ${params.runwayMin} - ${(params.runwayMin + innerBuffer).toFixed(1)} months`);
console.log(`  Safe zone:      ${(params.runwayMin + innerBuffer).toFixed(1)} - ${(params.runwayMax - innerBuffer).toFixed(1)} months`);
console.log('');

// Test cases showing feathered behavior
const testCases = [
  { name: 'Critical floor', runway: 2.5, expected: 'CRITICAL', note: 'Below 3-month floor → always critical' },
  { name: 'Well below min', runway: 5.0, expected: 'MEDIUM/HIGH', note: 'Below soft min (7.2) → reduced severity' },
  { name: 'In outer tolerance', runway: 8.0, expected: 'LOW', note: 'Between soft min and min → in tolerance' },
  { name: 'At minimum', runway: 9.0, expected: 'LOW (warning)', note: 'At min = in inner warning zone' },
  { name: 'In inner warning', runway: 10.0, expected: 'LOW (warning)', note: 'Between min and safe zone' },
  { name: 'Safe zone', runway: 12.0, expected: 'none', note: 'Well within bounds' },
  { name: 'Upper safe zone', runway: 16.0, expected: 'none', note: 'Still in safe zone' },
];

console.log('Test cases:\n');

for (const tc of testCases) {
  const company = {
    id: 'test',
    name: 'TestCo',
    stage: 'Seed',
    cash: tc.runway * 150000,
    burn: 150000,
    employees: 10,
    goals: [],
    asOf: new Date().toISOString(),
  };
  
  const { anomalies } = detectAnomalies(company);
  const runwayAnomaly = anomalies.find(a => a.metric === 'runway');
  
  let actual = 'none';
  if (runwayAnomaly) {
    actual = SEVERITY_NAMES[runwayAnomaly.severity];
    if (runwayAnomaly.evidence?.inToleranceZone) actual += ' (tolerance)';
    if (runwayAnomaly.evidence?.earlyWarning) actual += ' (warning)';
  }
  
  const match = tc.expected.includes(actual.split(' ')[0]) || 
                (tc.expected === 'none' && actual === 'none') ? '✓' : '✗';
  
  console.log(`  ${match} ${tc.name}:`);
  console.log(`    Runway: ${tc.runway} months → ${actual}`);
  console.log(`    ${tc.note}`);
}

// Full pipeline test
console.log('\n═══════════════════════════════════════════════════════════');
console.log('TEST: Full Pipeline - Feathered vs Non-Feathered');
console.log('═══════════════════════════════════════════════════════════\n');

const borderlineCompany = {
  id: 'borderline',
  name: 'BorderlineCo',
  stage: 'Seed',
  cash: 1200000,    // $1.2M
  burn: 150000,     // $150K/mo → 8 months runway (in outer tolerance of 9-month min)
  employees: 4,     // Below min of 5, but in 30% tolerance
  revenue: 0,
  raising: false,
  goals: [],
  asOf: new Date().toISOString(),
};

console.log('Borderline company:');
console.log(`  Runway: ${(borderlineCompany.cash/borderlineCompany.burn).toFixed(1)} months (min: ${params.runwayMin})`);
console.log(`  Employees: ${borderlineCompany.employees} (min: ${params.employeesMin})`);
console.log('');

const { anomalies: borderlineAnomalies } = detectAnomalies(borderlineCompany);

console.log('Anomalies (with feathering):');
for (const a of borderlineAnomalies) {
  const flags = [];
  if (a.evidence?.inToleranceZone) flags.push('in-tolerance');
  if (a.evidence?.earlyWarning) flags.push('early-warning');
  if (a.evidence?.feathered) flags.push('feathered');
  
  console.log(`  [${SEVERITY_NAMES[a.severity]}] ${a.type}`);
  console.log(`    ${a.evidence.explain}`);
  if (flags.length) console.log(`    Flags: ${flags.join(', ')}`);
}

console.log('\n→ Without feathering, both would be HIGH/MEDIUM severity');
console.log('→ With feathering, borderline cases are LOW severity (actionable but not alarming)');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✓ Feathered bounds test complete');
console.log('═══════════════════════════════════════════════════════════');
