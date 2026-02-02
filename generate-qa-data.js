#!/usr/bin/env node

/**
 * generate-qa-data.js
 * 
 * Generates realistic sample data for Backbone V9.
 * 
 * NOW USES:
 * - raw/stageParams.js for canonical stage bounds
 * - derive/anomalyDetection.js for detecting issues
 * - predict/suggestedGoals.js for anomaly-driven goal generation
 * 
 * GOALS: Only generated for portfolio companies (20), using:
 * 1. Stage-appropriate templates from STAGE_GOALS
 * 2. Anomaly-driven suggestions when company has issues
 * 
 * Target counts:
 * - Companies: 120 (20 portfolio, 100 market)
 * - People: 614
 * - Investors (firms): 360
 * - Rounds: 201
 * - Deals: 536
 * - Goals: 56 (portfolio only)
 * - Relationships: 1,228
 */

import { writeFileSync } from 'fs';
import { 
  STAGE_PARAMS, 
  STAGE_GOALS, 
  STAGES,
  getStageParams,
  getStageGoals 
} from './raw/stageParams.js';
import { detectAnomalies, ANOMALY_SEVERITY } from './derive/anomalyDetection.js';
import { suggestGoals, suggestionToGoal } from './predict/suggestedGoals.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  portfolioCompanies: 20,
  marketCompanies: 100,
  targetPeople: 614,
  targetFirms: 360,
  targetRounds: 201,
  targetDeals: 536,
  targetGoals: 56,
  targetRelationships: 1228,
  
  // Portfolio stage distribution
  portfolioStages: {
    'Pre-seed': 0.20,
    'Seed': 0.35,
    'Series A': 0.25,
    'Series B': 0.15,
    'Series C': 0.05,
  },
  
  // Anomaly rates for realistic data
  anomalyRates: {
    portfolio: 0.35,  // 35% have some anomaly → drives goal suggestions
    market: 0.20,
  },
};

// =============================================================================
// REFERENCE DATA
// =============================================================================

const SECTORS = [
  'Payments', 'Enterprise Software', 'Fintech', 'Healthcare',
  'Developer Tools', 'Security', 'Infrastructure', 'AI/ML',
  'E-commerce', 'Logistics', 'Climate', 'Consumer'
];

const CITIES = [
  'San Francisco', 'New York', 'Los Angeles', 'Boston',
  'Austin', 'Seattle', 'Chicago', 'Miami', 'Denver', 'London'
];

const FIRST_NAMES = [
  'Alex', 'Sarah', 'Marcus', 'Priya', 'James', 'Elena', 'David', 'Lisa',
  'Michael', 'Jennifer', 'Carlos', 'Nina', 'Ryan', 'Rachel', 'Tom', 'Jordan',
  'Sam', 'Yuki', 'Maria', 'Kevin', 'Daniel', 'Jessica', 'Robert', 'Amanda',
  'Chris', 'Emily', 'Andrew', 'Michelle', 'Ben', 'Sophia', 'Nathan', 'Olivia'
];

const LAST_NAMES = [
  'Chen', 'Smith', 'Johnson', 'Williams', 'Rodriguez', 'Lee', 'Kim', 'Patel',
  'Garcia', 'Martinez', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson',
  'Martin', 'Thompson', 'White', 'Lopez', 'Harris', 'Clark', 'Lewis', 'Young',
  'Walker', 'Hall', 'Allen', 'King', 'Wright', 'Scott', 'Green', 'Adams', 'Baker'
];

const COMPANY_PREFIXES = [
  'Nova', 'Quantum', 'Apex', 'Nexus', 'Pulse', 'Vertex', 'Cipher', 'Prism',
  'Helix', 'Flux', 'Zephyr', 'Atlas', 'Orbit', 'Vector', 'Spark', 'Bridge',
  'Stack', 'Cloud', 'Data', 'Edge', 'Core', 'Flow', 'Grid', 'Link', 'Net',
  'Sync', 'True', 'Blue', 'Clear', 'Fast', 'Smart', 'Open', 'Pure', 'Safe'
];

const COMPANY_SUFFIXES = [
  'Labs', 'Tech', 'AI', 'Systems', 'Analytics', 'Software', 'Solutions',
  'Platform', 'Cloud', 'Data', 'Logic', 'Works', 'Hub', 'Base', 'Flow',
  'Ops', 'ify', 'ly', 'io', '.ai', 'HQ', 'App', 'X', 'Up', 'Go'
];

const FIRM_TYPES = ['Ventures', 'Capital', 'Partners', 'Fund', 'Investments', 'VC'];

const TITLES = {
  founder: ['CEO', 'CTO', 'Co-founder', 'Founder & CEO'],
  executive: ['VP Engineering', 'VP Sales', 'VP Product', 'CFO', 'COO', 'CMO', 'CRO'],
  investor: ['Partner', 'Principal', 'Associate', 'Managing Partner', 'General Partner'],
};

const DEAL_STAGES = ['Sourcing', 'First Meeting', 'Deep Dive', 'Partner Meeting', 'Term Sheet', 'Due Diligence', 'Closed'];
const DEAL_STATUSES = ['active', 'won', 'lost', 'passed'];

// =============================================================================
// UTILITIES
// =============================================================================

const usedIds = new Set();

function uniqueId(prefix, seed = '') {
  const base = seed ? seed.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : '';
  let id;
  let attempts = 0;
  do {
    const rand = Math.random().toString(36).slice(2, 8);
    id = prefix ? `${prefix}-${base}${rand}` : `${base}${rand}`;
    attempts++;
  } while (usedIds.has(id) && attempts < 100);
  usedIds.add(id);
  return id;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max) { return Math.random() * (max - min) + min; }
function probability(p) { return Math.random() < p; }
function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function generateEmail(first, last, domain) {
  const formats = [
    `${first.toLowerCase()}@${domain}`,
    `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    `${first[0].toLowerCase()}${last.toLowerCase()}@${domain}`,
  ];
  return pick(formats);
}

function generateCompanyName() {
  if (probability(0.3)) {
    return `${pick(COMPANY_PREFIXES)}${pick(COMPANY_SUFFIXES)}`;
  }
  return `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)}`;
}

function generateFirmName() {
  const patterns = [
    () => `${pick(LAST_NAMES)} ${pick(FIRM_TYPES)}`,
    () => `${pick(LAST_NAMES)} & ${pick(LAST_NAMES)} ${pick(FIRM_TYPES)}`,
    () => `${pick(COMPANY_PREFIXES)} ${pick(FIRM_TYPES)}`,
    () => `${pick(['First', 'Next', 'New', 'True', 'Prime', 'Alpha', 'Beta'])} ${pick(FIRM_TYPES)}`,
  ];
  return pick(patterns)();
}

function generateDomain(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
}

function pickStage(distribution) {
  const r = Math.random();
  let cumulative = 0;
  for (const [stage, prob] of Object.entries(distribution)) {
    cumulative += prob;
    if (r < cumulative) return stage;
  }
  return 'Seed';
}

// =============================================================================
// ENTITY GENERATORS
// =============================================================================

function generatePerson(role, companyOrFirm, index) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const domain = companyOrFirm?.domain || 'gmail.com';
  
  let title;
  if (role === 'founder') title = pick(TITLES.founder);
  else if (role === 'executive') title = pick(TITLES.executive);
  else if (role === 'investor') title = pick(TITLES.investor);
  else title = role;
  
  return {
    id: uniqueId('p', `${firstName}${lastName}`),
    fn: firstName,
    ln: lastName,
    email: generateEmail(firstName, lastName, domain),
    title,
    role,
    org: companyOrFirm?.id || null,
    orgName: companyOrFirm?.name || null,
    loc: pick(CITIES),
    linkedin: `linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}${randomInt(1, 999)}`,
    asOf: daysAgo(randomInt(1, 30)),
  };
}

function generateCompany(name, stage, isPortfolio, sector, hasAnomaly = false) {
  const id = uniqueId('c', name);
  const params = getStageParams(stage);
  const domain = generateDomain(name);
  
  let burn, cash, employees, revenue;
  
  if (hasAnomaly && probability(0.7)) {
    // Generate company with anomalies for realistic problem scenarios
    const anomalyType = pick(['runway', 'burn', 'employees', 'revenue']);
    
    burn = Math.floor(randomFloat(params.burnMin, params.burnMax));
    employees = randomInt(params.employeesMin, params.employeesMax);
    revenue = params.revenueRequired ? randomInt(params.revenueMin, params.revenueMax) : 0;
    
    switch (anomalyType) {
      case 'runway':
        // Low runway: 3-8 months instead of 9-18
        const lowRunway = randomFloat(3, 8);
        cash = Math.floor(burn * lowRunway);
        break;
      case 'burn':
        // High burn: 1.3-2x max
        burn = Math.floor(params.burnMax * randomFloat(1.3, 2.0));
        cash = burn * randomInt(params.runwayMin, params.runwayMax);
        break;
      case 'employees':
        // Under-staffed: 50-80% of minimum
        employees = Math.floor(params.employeesMin * randomFloat(0.5, 0.8));
        cash = burn * randomInt(params.runwayMin, params.runwayMax);
        break;
      case 'revenue':
        // Low revenue if required
        if (params.revenueRequired) {
          revenue = Math.floor(params.revenueMin * randomFloat(0.3, 0.7));
        }
        cash = burn * randomInt(params.runwayMin, params.runwayMax);
        break;
      default:
        cash = burn * randomInt(params.runwayMin, params.runwayMax);
    }
  } else {
    // Normal healthy company
    burn = Math.floor(randomFloat(params.burnMin, params.burnMax));
    const runwayMonths = randomInt(params.runwayMin, params.runwayMax);
    cash = burn * runwayMonths;
    employees = randomInt(params.employeesMin, params.employeesMax);
    revenue = params.revenueRequired ? randomInt(params.revenueMin, params.revenueMax) : 
              (probability(0.3) ? randomInt(0, params.revenueMax / 2) : 0);
  }
  
  const raising = isPortfolio ? probability(0.4) : probability(0.2);
  
  return {
    id,
    name,
    domain,
    stage,
    sector,
    loc: pick(CITIES),
    isPortfolio,
    
    // Financials
    cash,
    burn,
    arr: revenue,
    employees,
    
    // Fundraising
    raising,
    roundTarget: raising ? Math.floor(randomFloat(params.raiseMin, params.raiseMax)) : null,
    
    // Metadata
    founded: new Date(Date.now() - randomInt(1, 8) * 365 * 24 * 60 * 60 * 1000).getFullYear(),
    asOf: daysAgo(randomInt(1, 14)),
  };
}

function generateFirm(index) {
  const name = generateFirmName();
  const domain = generateDomain(name);
  const aum = pick([50, 100, 200, 500, 1000, 2000, 5000]) * 1000000;
  
  return {
    id: uniqueId('f', name),
    name,
    domain,
    type: 'vc',
    aum,
    stage: pick(['Seed', 'Series A', 'Series B', 'Growth', 'Multi-stage']),
    sectors: pickN(SECTORS, randomInt(2, 5)),
    loc: pick(CITIES),
    asOf: daysAgo(randomInt(1, 60)),
  };
}

function generateRound(company, firms, roundNumber) {
  const params = getStageParams(company.stage);
  const amount = Math.floor(randomFloat(params.raiseMin, params.raiseMax));
  const leadFirm = pick(firms);
  
  const closeDate = new Date(Date.now() - randomInt(30, 720) * 24 * 60 * 60 * 1000);
  
  return {
    id: uniqueId('r', `${company.id}r${roundNumber}`),
    companyId: company.id,
    stage: company.stage,
    amt: amount,
    leadId: leadFirm.id,
    leadName: leadFirm.name,
    status: pick(['closed', 'closed', 'closed', 'active']),
    closeDate: closeDate.toISOString().split('T')[0],
    asOf: daysAgo(randomInt(1, 30)),
  };
}

function generateDeal(company, firm, round, dealIndex) {
  const stage = pick(DEAL_STAGES);
  const stageIndex = DEAL_STAGES.indexOf(stage);
  
  let status;
  if (stage === 'Closed') status = 'won';
  else if (stageIndex < 2) status = probability(0.8) ? 'active' : 'passed';
  else status = pick(['active', 'active', 'passed', 'lost']);
  
  const params = getStageParams(company.stage);
  const amount = Math.floor(randomFloat(params.raiseMin * 0.1, params.raiseMax * 0.5));
  
  return {
    id: uniqueId('d', `${company.id}d${dealIndex}`),
    companyId: company.id,
    companyName: company.name,
    firmId: firm.id,
    firmName: firm.name,
    roundId: round?.id || null,
    stage,
    status,
    amt: amount,
    nextStep: status === 'active' ? pick(['Follow up call', 'Send deck', 'Partner intro', 'Site visit', 'Reference calls']) : null,
    lastContact: daysAgo(randomInt(1, 45)),
    asOf: daysAgo(randomInt(1, 14)),
  };
}

/**
 * Generate goals for a portfolio company using:
 * 1. Anomaly detection → suggested goals
 * 2. Stage templates for coverage
 */
function generateGoalsForCompany(company, targetPerCompany) {
  const goals = [];
  const stageGoals = getStageGoals(company.stage);
  
  // First, detect anomalies and generate suggested goals
  const { anomalies } = detectAnomalies(company);
  const { suggestions } = suggestGoals(company, anomalies, {
    includeStageTemplates: false,
    existingGoals: [],
  });
  
  // Add anomaly-driven goals (high priority)
  for (const suggestion of suggestions.slice(0, 2)) {
    if (goals.length >= targetPerCompany) break;
    
    const goal = suggestionToGoal(suggestion, {
      current: suggestion.proposedGoal.type === 'operational' ? randomInt(20, 60) : 0,
    });
    
    goals.push({
      id: `${company.id}-g${goals.length}`,
      companyId: company.id,
      name: goal.name,
      type: goal.type,
      cur: goal.current,
      tgt: goal.target || 100,
      status: pick(['active', 'active', 'active', 'blocked']),
      due: goal.due,
      provenance: 'anomaly',
      sourceAnomaly: suggestion.sourceAnomalyType,
      asOf: daysAgo(randomInt(1, 14)),
    });
  }
  
  // Fill remaining with stage template goals
  const shuffledTemplates = [...stageGoals].sort(() => Math.random() - 0.5);
  
  for (const template of shuffledTemplates) {
    if (goals.length >= targetPerCompany) break;
    
    // Skip if we already have a goal of this type
    if (goals.some(g => g.type === template.type)) continue;
    
    const isCompleted = probability(0.25);
    const isActive = !isCompleted && probability(0.7);
    
    let current, target;
    const params = getStageParams(company.stage);
    
    switch (template.type) {
      case 'revenue':
        target = randomInt(500, 5000) * 1000;
        current = isCompleted ? target : Math.floor(target * randomFloat(0.3, 0.9));
        break;
      case 'product':
        target = 100;
        current = isCompleted ? 100 : randomInt(30, 90);
        break;
      case 'hiring':
        target = randomInt(5, 30);
        current = isCompleted ? target : randomInt(1, target - 1);
        break;
      case 'partnership':
        target = randomInt(3, 10);
        current = isCompleted ? target : randomInt(0, target - 1);
        break;
      case 'fundraise':
        target = company.roundTarget || params.raiseMin;
        current = isCompleted ? target : Math.floor(target * randomFloat(0.2, 0.7));
        break;
      default:
        target = 100;
        current = randomInt(30, 90);
    }
    
    goals.push({
      id: `${company.id}-g${goals.length}`,
      companyId: company.id,
      name: template.name,
      type: template.type,
      cur: current,
      tgt: target,
      status: isCompleted ? 'completed' : (isActive ? 'active' : pick(['blocked', 'abandoned'])),
      due: daysFromNow(randomInt(30, 180)),
      unlocks: template.unlocks,
      provenance: 'template',
      asOf: daysAgo(randomInt(1, 14)),
    });
  }
  
  return goals;
}

function generateRelationship(person1, person2, type) {
  return {
    id: uniqueId('rel', `${person1.id}${person2.id}`),
    p1Id: person1.id,
    p1Name: `${person1.fn} ${person1.ln}`,
    p2Id: person2.id,
    p2Name: `${person2.fn} ${person2.ln}`,
    type,
    strength: pick(['strong', 'medium', 'weak']),
    lastContact: daysAgo(randomInt(1, 90)),
    asOf: daysAgo(randomInt(1, 30)),
  };
}

// =============================================================================
// MAIN GENERATION
// =============================================================================

function generate() {
  console.log('Generating Backbone V9 Sample Data...\n');
  
  const data = {
    companies: [],
    people: [],
    firms: [],
    rounds: [],
    deals: [],
    goals: [],
    relationships: [],
    meta: {
      generatedAt: new Date().toISOString(),
      version: '9.0',
    },
  };
  
  // 1. Generate Firms (360)
  console.log(`Generating ${CONFIG.targetFirms} firms...`);
  for (let i = 0; i < CONFIG.targetFirms; i++) {
    data.firms.push(generateFirm(i));
  }
  
  // 2. Generate investor people from firms (2-4 per firm, ~1000 people)
  console.log('Generating investor people...');
  const investorPeople = [];
  for (const firm of data.firms) {
    const count = randomInt(2, 4);
    for (let i = 0; i < count; i++) {
      const person = generatePerson('investor', firm, i);
      investorPeople.push(person);
    }
  }
  
  // 3. Generate Portfolio Companies (20)
  console.log(`Generating ${CONFIG.portfolioCompanies} portfolio companies...`);
  const portfolioCompanies = [];
  for (let i = 0; i < CONFIG.portfolioCompanies; i++) {
    const stage = pickStage(CONFIG.portfolioStages);
    const hasAnomaly = probability(CONFIG.anomalyRates.portfolio);
    const company = generateCompany(generateCompanyName(), stage, true, pick(SECTORS), hasAnomaly);
    portfolioCompanies.push(company);
    data.companies.push(company);
  }
  
  // 4. Generate Market Companies (100)
  console.log(`Generating ${CONFIG.marketCompanies} market companies...`);
  const marketStages = { 'Seed': 0.5, 'Series A': 0.3, 'Series B': 0.15, 'Series C': 0.05 };
  for (let i = 0; i < CONFIG.marketCompanies; i++) {
    const stage = pickStage(marketStages);
    const hasAnomaly = probability(CONFIG.anomalyRates.market);
    const company = generateCompany(generateCompanyName(), stage, false, pick(SECTORS), hasAnomaly);
    data.companies.push(company);
  }
  
  // 5. Generate company people (founders + executives)
  console.log('Generating company people...');
  const companyPeople = [];
  for (const company of data.companies) {
    // 1-2 founders
    const founderCount = randomInt(1, 2);
    for (let i = 0; i < founderCount; i++) {
      companyPeople.push(generatePerson('founder', company, i));
    }
    // 1-3 executives for portfolio, 0-1 for market
    const execCount = company.isPortfolio ? randomInt(1, 3) : randomInt(0, 1);
    for (let i = 0; i < execCount; i++) {
      companyPeople.push(generatePerson('executive', company, i));
    }
  }
  
  // Combine people and trim to target
  let allPeople = [...investorPeople, ...companyPeople];
  if (allPeople.length > CONFIG.targetPeople) {
    allPeople = allPeople.slice(0, CONFIG.targetPeople);
  }
  // If under target, add more
  while (allPeople.length < CONFIG.targetPeople) {
    const person = generatePerson('advisor', pick(data.companies), allPeople.length);
    allPeople.push(person);
  }
  data.people = allPeople;
  
  // 6. Generate Rounds (201 total, distributed across companies)
  console.log(`Generating ${CONFIG.targetRounds} rounds...`);
  let roundCount = 0;
  const roundsPerCompany = Math.ceil(CONFIG.targetRounds / data.companies.length);
  
  for (const company of data.companies) {
    const numRounds = Math.min(randomInt(1, roundsPerCompany + 1), CONFIG.targetRounds - roundCount);
    for (let i = 0; i < numRounds && roundCount < CONFIG.targetRounds; i++) {
      data.rounds.push(generateRound(company, data.firms, i));
      roundCount++;
    }
  }
  
  // 7. Generate Deals (536 total)
  console.log(`Generating ${CONFIG.targetDeals} deals...`);
  let dealCount = 0;
  
  for (const company of data.companies) {
    const companyRounds = data.rounds.filter(r => r.companyId === company.id);
    const numDeals = Math.min(randomInt(2, 8), CONFIG.targetDeals - dealCount);
    
    for (let i = 0; i < numDeals && dealCount < CONFIG.targetDeals; i++) {
      const firm = pick(data.firms);
      const round = companyRounds.length > 0 ? pick(companyRounds) : null;
      data.deals.push(generateDeal(company, firm, round, i));
      dealCount++;
    }
  }
  
  // 8. Generate Goals (56 total, PORTFOLIO ONLY)
  console.log(`Generating ${CONFIG.targetGoals} goals (portfolio only)...`);
  const goalsPerCompany = Math.ceil(CONFIG.targetGoals / CONFIG.portfolioCompanies);
  
  for (const company of portfolioCompanies) {
    const companyGoals = generateGoalsForCompany(company, goalsPerCompany);
    data.goals.push(...companyGoals);
  }
  
  // Trim to exact target
  if (data.goals.length > CONFIG.targetGoals) {
    data.goals = data.goals.slice(0, CONFIG.targetGoals);
  }
  
  // 9. Generate Relationships (1228 total)
  console.log(`Generating ${CONFIG.targetRelationships} relationships...`);
  const relationshipTypes = ['worked_together', 'introduced_by', 'co_invested', 'advised', 'knows'];
  
  while (data.relationships.length < CONFIG.targetRelationships) {
    const p1 = pick(data.people);
    const p2 = pick(data.people);
    if (p1.id !== p2.id) {
      // Avoid duplicates
      const exists = data.relationships.some(r => 
        (r.p1Id === p1.id && r.p2Id === p2.id) || (r.p1Id === p2.id && r.p2Id === p1.id)
      );
      if (!exists) {
        data.relationships.push(generateRelationship(p1, p2, pick(relationshipTypes)));
      }
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('GENERATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Companies:     ${data.companies.length} (${portfolioCompanies.length} portfolio, ${data.companies.length - portfolioCompanies.length} market)`);
  console.log(`  People:        ${data.people.length}`);
  console.log(`  Firms:         ${data.firms.length}`);
  console.log(`  Rounds:        ${data.rounds.length}`);
  console.log(`  Deals:         ${data.deals.length}`);
  console.log(`  Goals:         ${data.goals.length} (portfolio only)`);
  console.log(`  Relationships: ${data.relationships.length}`);
  
  // Count anomaly-driven goals
  const anomalyGoals = data.goals.filter(g => g.provenance === 'anomaly');
  const templateGoals = data.goals.filter(g => g.provenance === 'template');
  console.log(`\n  Goal provenance:`);
  console.log(`    Anomaly-driven: ${anomalyGoals.length}`);
  console.log(`    Stage templates: ${templateGoals.length}`);
  
  return data;
}

// =============================================================================
// OUTPUT
// =============================================================================

const args = process.argv.slice(2);
const outputPath = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'ui/raw/sample.json';

const data = generate();

// Write output
const json = JSON.stringify(data);
writeFileSync(outputPath, json);

const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
console.log(`\nOutput: ${outputPath} (${sizeKB} KB)`);
