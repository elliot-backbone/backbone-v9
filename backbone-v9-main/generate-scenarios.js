#!/usr/bin/env node

/**
 * generate-scenarios.js
 * 
 * Generate specific test scenarios for targeted feature testing
 * 
 * Usage:
 *   node generate-scenarios.js <scenario> [--output=file.json]
 * 
 * Available scenarios:
 *   - high-risk: Companies with critical runway (<3 months)
 *   - fundraising: Companies actively raising with multiple deals
 *   - blocked-goals: Companies with multiple blocked goals
 *   - high-growth: Companies with strong metrics and momentum
 *   - intro-heavy: Heavy introduction activity across portfolio
 *   - new-portfolio: Fresh portfolio with minimal history
 *   - mature-portfolio: Established portfolio with rich history
 */

import { generateData, DEFAULT_CONFIG } from './generate-qa-data.js';
import { writeFileSync } from 'fs';

// =============================================================================
// SCENARIO GENERATORS
// =============================================================================

/**
 * High-Risk Scenario: Critical runway situations
 */
function generateHighRiskScenario() {
  const config = {
    ...DEFAULT_CONFIG,
    companies: 15
  };
  
  const data = generateData(config);
  
  // Modify companies to have critical runway
  for (const company of data.companies) {
    // Set cash to 2-3 months of burn
    company.cash = company.burn * (Math.random() * 1 + 2);
    
    // Ensure they're raising
    company.raising = true;
    company.roundTarget = company.burn * 12 * (Math.random() * 0.5 + 1);
    
    // Add blocked fundraise goal
    company.goals.push({
      id: `${company.id}-fundraise-critical`,
      type: 'fundraise',
      name: 'Emergency Fundraise',
      current: company.roundTarget * 0.2,
      target: company.roundTarget,
      due: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'blocked',
      asOf: new Date().toISOString(),
      provenance: 'manual'
    });
    
    // Ensure they have deals but low probability
    if (company.deals.length === 0) {
      company.deals.push({
        id: `d-${company.id}-1`,
        investorId: data.investors[0].id,
        investor: data.investors[0].name,
        status: 'meeting',
        probability: 30,
        amount: company.roundTarget * 0.4,
        asOf: new Date().toISOString(),
        provenance: 'manual'
      });
    }
  }
  
  return data;
}

/**
 * Fundraising Scenario: Active fundraising with multiple investors
 */
function generateFundraisingScenario() {
  const config = {
    ...DEFAULT_CONFIG,
    companies: 20,
    dealsPerRaisingCompany: 5
  };
  
  const data = generateData(config);
  
  // Make 80% of companies fundraising
  for (const company of data.companies.slice(0, 16)) {
    company.raising = true;
    company.roundTarget = company.burn * 18 * (Math.random() * 0.5 + 1);
    
    // Ensure diverse deal pipeline
    const dealStatuses = ['meeting', 'dd', 'termsheet', 'dd', 'meeting'];
    company.deals = dealStatuses.map((status, i) => ({
      id: `d-${company.id}-${i}`,
      investorId: data.investors[i % data.investors.length].id,
      investor: data.investors[i % data.investors.length].name,
      status,
      probability: status === 'termsheet' ? 85 : status === 'dd' ? 60 : 35,
      amount: company.roundTarget * (Math.random() * 0.3 + 0.2),
      asOf: new Date().toISOString(),
      provenance: 'manual'
    }));
  }
  
  return data;
}

/**
 * Blocked Goals Scenario: Multiple blocked goals needing intervention
 */
function generateBlockedGoalsScenario() {
  const config = {
    ...DEFAULT_CONFIG,
    companies: 12,
    goalsPerCompany: 5
  };
  
  const data = generateData(config);
  
  // Make most goals blocked
  for (const company of data.companies) {
    for (const goal of company.goals) {
      if (Math.random() > 0.3) {
        goal.status = 'blocked';
        goal.current = goal.target * (Math.random() * 0.3 + 0.2);
      }
    }
  }
  
  return data;
}

/**
 * High Growth Scenario: Strong metrics and momentum
 */
function generateHighGrowthScenario() {
  const config = {
    ...DEFAULT_CONFIG,
    companies: 15
  };
  
  const data = generateData(config);
  
  // Boost all companies to high-growth status
  for (const company of data.companies) {
    // Strong MRR with healthy growth
    company.mrr = company.burn * (Math.random() * 1 + 1.5);
    delete company.arr;
    
    // Healthy runway
    company.cash = company.burn * (Math.random() * 6 + 6);
    
    // Goals mostly on track
    for (const goal of company.goals) {
      if (goal.status === 'active') {
        goal.current = goal.target * (Math.random() * 0.2 + 0.7);
      }
    }
    
    // Not raising (don't need to)
    company.raising = false;
    company.roundTarget = 0;
    company.deals = [];
  }
  
  return data;
}

/**
 * Intro Heavy Scenario: Lots of introduction activity
 */
function generateIntroHeavyScenario() {
  const config = {
    ...DEFAULT_CONFIG,
    companies: 20,
    introOutcomesPerCompany: 10,
    eventsPerIntro: 4
  };
  
  const data = generateData(config);
  
  // Ensure diverse intro statuses with more activity
  const introStatuses = ['sent', 'replied', 'meeting', 'positive', 'sent', 'replied', 'meeting', 'negative', 'ghosted', 'sent'];
  
  for (let i = 0; i < data.introOutcomes.length; i++) {
    data.introOutcomes[i].status = introStatuses[i % introStatuses.length];
  }
  
  return data;
}

/**
 * New Portfolio Scenario: Fresh portfolio with minimal history
 */
function generateNewPortfolioScenario() {
  const config = {
    ...DEFAULT_CONFIG,
    companies: 8,
    relationshipsPerPerson: 2,
    introOutcomesPerCompany: 1,
    eventsPerIntro: 1.5
  };
  
  const data = generateData(config);
  
  // All companies in early stages
  for (const company of data.companies) {
    company.stage = Math.random() > 0.5 ? 'Pre-seed' : 'Seed';
    company.employees = Math.floor(Math.random() * 12) + 3;
    company.burn = Math.random() * 100000 + 50000;
    company.cash = company.burn * (Math.random() * 4 + 8);
  }
  
  return data;
}

/**
 * Mature Portfolio Scenario: Established portfolio with rich history
 */
function generateMaturePortfolioScenario() {
  const config = {
    ...DEFAULT_CONFIG,
    companies: 30,
    relationshipsPerPerson: 8,
    introOutcomesPerCompany: 8,
    eventsPerIntro: 4,
    goalsPerCompany: 5
  };
  
  const data = generateData(config);
  
  // Mix of stages weighted toward later
  const stageWeights = ['Series A', 'Series B', 'Series B', 'Series C+', 'Growth'];
  
  for (let i = 0; i < data.companies.length; i++) {
    const company = data.companies[i];
    company.stage = stageWeights[i % stageWeights.length];
    
    // Larger teams
    company.employees = Math.floor(Math.random() * 200) + 50;
    
    // Significant burn and cash
    company.burn = Math.random() * 1000000 + 400000;
    company.cash = company.burn * (Math.random() * 8 + 4);
    
    // Strong MRR
    if (Math.random() > 0.2) {
      company.mrr = company.burn * (Math.random() * 2 + 1);
      delete company.arr;
    }
    
    // Many completed goals
    for (const goal of company.goals) {
      if (Math.random() > 0.6) {
        goal.status = 'completed';
        goal.current = goal.target;
      }
    }
  }
  
  // Ensure high relationship strength
  for (const rel of data.relationships) {
    if (rel.strength < 60) {
      rel.strength = Math.floor(Math.random() * 30) + 60;
    }
  }
  
  return data;
}

/**
 * All Scenarios: Generate all scenarios at once
 */
function generateAllScenarios() {
  return {
    'high-risk': generateHighRiskScenario(),
    'fundraising': generateFundraisingScenario(),
    'blocked-goals': generateBlockedGoalsScenario(),
    'high-growth': generateHighGrowthScenario(),
    'intro-heavy': generateIntroHeavyScenario(),
    'new-portfolio': generateNewPortfolioScenario(),
    'mature-portfolio': generateMaturePortfolioScenario()
  };
}

// =============================================================================
// SCENARIO METADATA
// =============================================================================

const SCENARIOS = {
  'high-risk': {
    name: 'High Risk Companies',
    description: 'Companies with critical runway (<3 months) needing urgent action',
    generator: generateHighRiskScenario,
    testCases: [
      'Runway calculations show critical status',
      'Health scores are low/critical',
      'Urgent intro actions prioritized',
      'Fundraising goals are blocked',
      'Deal pipeline exists but low probability'
    ]
  },
  'fundraising': {
    name: 'Active Fundraising',
    description: 'Companies actively raising with diverse deal pipelines',
    generator: generateFundraisingScenario,
    testCases: [
      'Deal tracking and probability calculations',
      'Investor intro opportunities',
      'Deal status progression',
      'Round coverage calculations',
      'Investor relationship mapping'
    ]
  },
  'blocked-goals': {
    name: 'Blocked Goals',
    description: 'Multiple blocked goals across portfolio needing intervention',
    generator: generateBlockedGoalsScenario,
    testCases: [
      'Blocked goal detection',
      'Intro opportunity generation for goal unblocking',
      'Goal trajectory predictions',
      'Escalation triggers',
      'Action prioritization for blocked goals'
    ]
  },
  'high-growth': {
    name: 'High Growth Companies',
    description: 'Strong metrics, healthy runway, goals on track',
    generator: generateHighGrowthScenario,
    testCases: [
      'Health scores show excellence',
      'Positive trajectories',
      'Low urgency actions',
      'Partnership intros (not fundraising)',
      'Hiring and growth support'
    ]
  },
  'intro-heavy': {
    name: 'High Introduction Activity',
    description: 'Portfolio with extensive introduction history and outcomes',
    generator: generateIntroHeavyScenario,
    testCases: [
      'Intro outcome tracking',
      'Calibration learning from outcomes',
      'Trust risk calculations',
      'Relationship strength updates',
      'Followup action generation'
    ]
  },
  'new-portfolio': {
    name: 'New Portfolio',
    description: 'Fresh portfolio with minimal relationships and history',
    generator: generateNewPortfolioScenario,
    testCases: [
      'Bootstrapping relationship graphs',
      'Initial intro recommendations',
      'New company onboarding flows',
      'Building relationship networks',
      'Early-stage focus areas'
    ]
  },
  'mature-portfolio': {
    name: 'Mature Portfolio',
    description: 'Established portfolio with rich history and relationships',
    generator: generateMaturePortfolioScenario,
    testCases: [
      'Complex relationship traversal',
      'Historical pattern analysis',
      'Second-order intro opportunities',
      'Portfolio-wide optimization',
      'Performance at scale'
    ]
  }
};

// =============================================================================
// CLI
// =============================================================================

function printUsage() {
  console.log(`
Usage: node generate-scenarios.js <scenario> [--output=file.json]

Available Scenarios:
`);
  
  for (const [key, scenario] of Object.entries(SCENARIOS)) {
    console.log(`  ${key.padEnd(20)} ${scenario.name}`);
    console.log(`  ${' '.repeat(20)} ${scenario.description}`);
    console.log();
  }
  
  console.log(`Special Commands:
  all                  Generate all scenarios
  list                 List scenarios with test cases
  help                 Show this help

Examples:
  node generate-scenarios.js high-risk
  node generate-scenarios.js fundraising --output=fundraising-test.json
  node generate-scenarios.js all
`);
}

function listScenarios() {
  console.log('\n=== Available Test Scenarios ===\n');
  
  for (const [key, scenario] of Object.entries(SCENARIOS)) {
    console.log(`📋 ${scenario.name.toUpperCase()}`);
    console.log(`   Scenario: ${key}`);
    console.log(`   ${scenario.description}`);
    console.log('\n   Test Cases:');
    scenario.testCases.forEach(tc => console.log(`   - ${tc}`));
    console.log();
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
  printUsage();
  process.exit(0);
}

if (args[0] === 'list') {
  listScenarios();
  process.exit(0);
}

const scenario = args[0];
const outputArg = args.find(a => a.startsWith('--output='));
const outputFile = outputArg ? outputArg.split('=')[1] : `${scenario}-scenario.json`;

if (scenario === 'all') {
  console.log('Generating all scenarios...\n');
  const allScenarios = generateAllScenarios();
  
  for (const [key, data] of Object.entries(allScenarios)) {
    const filename = `scenario-${key}.json`;
    console.log(`Writing ${filename}...`);
    writeFileSync(filename, JSON.stringify(data, null, 2));
  }
  
  console.log('\n✓ All scenarios generated!');
  console.log('\nGenerated files:');
  for (const key of Object.keys(allScenarios)) {
    console.log(`  - scenario-${key}.json`);
  }
  
  process.exit(0);
}

if (!SCENARIOS[scenario]) {
  console.error(`\n❌ Unknown scenario: ${scenario}\n`);
  console.log('Available scenarios:', Object.keys(SCENARIOS).join(', '));
  console.log('\nUse "node generate-scenarios.js help" for more info');
  process.exit(1);
}

console.log(`\nGenerating scenario: ${SCENARIOS[scenario].name}`);
console.log(`Description: ${SCENARIOS[scenario].description}\n`);

try {
  const data = SCENARIOS[scenario].generator();
  
  console.log(`Writing to ${outputFile}...`);
  writeFileSync(outputFile, JSON.stringify(data, null, 2));
  
  console.log('✓ Done!\n');
  console.log('Test Cases for this scenario:');
  SCENARIOS[scenario].testCases.forEach(tc => console.log(`  - ${tc}`));
  
  console.log('\nNext steps:');
  console.log(`  1. Validate: node validate-generated.js ${outputFile}`);
  console.log(`  2. Use in tests: import data from './${outputFile}'`);
} catch (error) {
  console.error('\n❌ Error generating scenario:', error);
  process.exit(1);
}
