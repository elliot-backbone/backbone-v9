/**
 * Quick test: anomaly detection → goal suggestion pipeline
 */

import { getStageParams, STAGE_PARAMS } from '../raw/stageParams.js';
import { detectAnomalies, ANOMALY_SEVERITY } from '../derive/anomalyDetection.js';
import { suggestGoals, getHighPrioritySuggestions } from '../predict/suggestedGoals.js';

// Test company: Seed stage with problems
const testCompany = {
  id: 'test-co',
  name: 'TestCo',
  stage: 'Seed',
  
  // Problems:
  cash: 500000,      // Low cash
  burn: 150000,      // Normal-ish burn → ~3.3 months runway (below min of 9)
  employees: 3,      // Below min of 5
  revenue: 0,        // No revenue (OK for Seed)
  raising: false,
  roundTarget: 0,
  
  goals: [],
  asOf: new Date().toISOString(),
};

console.log('═══════════════════════════════════════════════════════════');
console.log('TEST: Anomaly Detection → Goal Suggestion Pipeline');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Show stage params
const params = getStageParams(testCompany.stage);
console.log(`Stage: ${testCompany.stage}`);
console.log(`Expected bounds:`);
console.log(`  Runway:    ${params.runwayMin}-${params.runwayMax} months`);
console.log(`  Burn:      $${(params.burnMin/1000).toFixed(0)}K-$${(params.burnMax/1000).toFixed(0)}K/mo`);
console.log(`  Employees: ${params.employeesMin}-${params.employeesMax}`);
console.log('');

// 2. Detect anomalies
console.log('Company metrics:');
console.log(`  Cash:      $${(testCompany.cash/1000).toFixed(0)}K`);
console.log(`  Burn:      $${(testCompany.burn/1000).toFixed(0)}K/mo`);
console.log(`  Runway:    ${(testCompany.cash/testCompany.burn).toFixed(1)} months`);
console.log(`  Employees: ${testCompany.employees}`);
console.log('');

const { anomalies, summary: anomalySummary } = detectAnomalies(testCompany);

console.log(`Detected ${anomalies.length} anomalies:`);
for (const a of anomalies) {
  const sevName = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][a.severity];
  console.log(`  [${sevName}] ${a.type}`);
  console.log(`           ${a.evidence.explain}`);
}
console.log('');

// 3. Suggest goals
const { suggestions, summary: suggestionSummary } = suggestGoals(testCompany, anomalies, {
  includeStageTemplates: true,
  existingGoals: [],
});

console.log(`Generated ${suggestions.length} goal suggestions:`);
for (const s of suggestions) {
  const sevName = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][s.severity];
  const source = s.sourceAnomalyId ? 'anomaly' : 'template';
  console.log(`  [${sevName}] ${s.proposedGoal.name}`);
  console.log(`           Type: ${s.proposedGoal.type} | Source: ${source}`);
  console.log(`           Rationale: ${s.rationale}`);
}
console.log('');

// 4. High priority
const highPriority = getHighPrioritySuggestions(suggestions);
console.log(`High priority suggestions: ${highPriority.length}`);
for (const s of highPriority) {
  console.log(`  → ${s.proposedGoal.name}`);
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✓ Pipeline test complete');
console.log('═══════════════════════════════════════════════════════════');
