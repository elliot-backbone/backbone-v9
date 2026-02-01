#!/usr/bin/env node

/**
 * generate-qa-data.js
 * 
 * Generates massive amounts of QA-valid sample data for Backbone V9
 * 
 * Usage:
 *   node generate-qa-data.js [--companies=50] [--output=generated-data.json]
 * 
 * Features:
 * - Realistic data distributions
 * - Full referential integrity
 * - QA gate compliant
 * - Configurable scale
 */

import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG = {
  companies: 30,
  peoplePerCompany: 4,        // Avg people per company (founders + team)
  investorsPerCompany: 0.5,   // Avg investors linked per company
  relationshipsPerPerson: 5,  // Avg relationships per person
  goalsPerCompany: 3,         // Avg goals per company
  dealsPerRaisingCompany: 3,  // Avg deals when raising
  totalInvestors: 20,
  totalTeamMembers: 5
};

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'];

const GOAL_TYPES = ['revenue', 'product', 'fundraise', 'hiring', 'partnership'];
const GOAL_STATUSES = ['active', 'completed', 'abandoned', 'blocked'];

const DEAL_STATUSES = ['meeting', 'dd', 'termsheet', 'closed', 'passed'];

const ORG_TYPES = ['company', 'investor', 'external'];

const RELATIONSHIP_TYPES = [
  'board', 'professional', 'alumni', 'former-colleague', 
  'co-investor', 'mentor-mentee', 'friend'
];

const CHANNELS = [
  'in-person', 'video', 'phone', 'email', 
  'linkedin', 'conference', 'github'
];

const INTRO_STATUSES = [
  'drafted', 'sent', 'replied', 'meeting', 
  'positive', 'negative', 'ghosted'
];

const EVENT_TYPES = [
  'created', 'assigned', 'started', 'completed',
  'outcome_recorded', 'followup_created', 'note_added'
];

const OUTCOMES = ['success', 'partial', 'failed', 'abandoned'];

const SECTORS = [
  'Payments', 'Enterprise Software', 'Fintech', 'Healthcare',
  'Developer Tools', 'Security', 'Infrastructure', 'AI/ML',
  'E-commerce', 'Logistics', 'EdTech', 'Climate'
];

const CITIES = [
  'New York', 'San Francisco', 'Los Angeles', 'Boston',
  'Austin', 'Seattle', 'Chicago', 'Miami', 'Denver', 'Atlanta'
];

const INVESTOR_TYPES = ['vc', 'angel', 'corporate', 'family-office', 'accelerator'];

const FIRST_NAMES = [
  'Alex', 'Sarah', 'Marcus', 'Priya', 'James', 'Elena', 
  'David', 'Lisa', 'Michael', 'Jennifer', 'Carlos', 'Nina',
  'Ryan', 'Rachel', 'Tom', 'Jordan', 'Sam', 'Yuki',
  'Maria', 'Kevin', 'Daniel', 'Jessica', 'Robert', 'Amanda'
];

const LAST_NAMES = [
  'Chen', 'Thompson', 'Rodriguez', 'Sharma', 'Kim', 'Patel',
  'Lee', 'Garcia', 'Anderson', 'Martinez', 'Wilson', 'Moore',
  'Taylor', 'Brown', 'Davis', 'Miller', 'Johnson', 'Williams'
];

const COMPANY_ADJECTIVES = [
  'Velocity', 'NexGen', 'Quantum', 'Apex', 'Zenith', 'Vanguard',
  'Catalyst', 'Prism', 'Meridian', 'Sentinel', 'Harmonic', 'Cascade',
  'Axiom', 'Beacon', 'Clarity', 'Dynamo', 'Eclipse', 'Frontier',
  'Gravity', 'Horizon', 'Ionic', 'Kinetic', 'Lumina', 'Momentum'
];

const INVESTOR_NAMES = [
  'Horizon Ventures', 'Atlas Capital', 'Pinnacle Partners', 'Sterling Ventures',
  'Evergreen Capital', 'Catalyst Ventures', 'Founder Collective', 'Techstars',
  'Amplify Partners', 'Sequoia Capital', 'Benchmark', 'Accel', 'Greylock',
  'FirstMark', 'Union Square Ventures', 'Andreessen Horowitz', 'Lightspeed'
];

const SCHOOLS = [
  'stanford', 'mit', 'harvard', 'berkeley', 'cmu', 'yale',
  'princeton', 'cornell', 'northwestern', 'ucla', 'upenn', 'duke'
];

const BIG_TECH = [
  'google', 'stripe', 'microsoft', 'apple', 'meta', 'amazon',
  'uber', 'airbnb', 'square', 'coinbase', 'plaid', 'github'
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

function pickN(array, n) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function probability(p) {
  return Math.random() < p;
}

function generateId(prefix = '') {
  const random = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}-${random}` : random;
}

function kebabCase(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

function randomDate(daysAgo, daysFromNow = 0) {
  const now = Date.now();
  const start = now - (daysAgo * 24 * 60 * 60 * 1000);
  const end = now + (daysFromNow * 24 * 60 * 60 * 1000);
  return new Date(randomFloat(start, end)).toISOString();
}

function recentDate(maxDaysAgo = 30) {
  return randomDate(maxDaysAgo);
}

function futureDate(minDays = 30, maxDays = 180) {
  const now = Date.now();
  const days = randomInt(minDays, maxDays);
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function generateEventId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `evt_${timestamp}_${random}`;
}

// =============================================================================
// ENTITY GENERATORS
// =============================================================================

function generateCompany(index, config) {
  const id = kebabCase(COMPANY_ADJECTIVES[index % COMPANY_ADJECTIVES.length] + 
                       (index > COMPANY_ADJECTIVES.length ? index : ''));
  const name = COMPANY_ADJECTIVES[index % COMPANY_ADJECTIVES.length] +
               (index > COMPANY_ADJECTIVES.length ? ` ${Math.floor(index / COMPANY_ADJECTIVES.length)}` : '');
  
  const stage = pick(STAGES);
  const sector = pick(SECTORS);
  const raising = probability(0.4); // 40% are fundraising
  
  // Financial params based on stage
  let burn, cash, employees, roundTarget;
  switch(stage) {
    case 'Pre-seed':
      burn = randomInt(30, 100) * 1000;
      cash = randomInt(300, 1500) * 1000;
      employees = randomInt(3, 10);
      roundTarget = raising ? randomInt(500, 2000) * 1000 : 0;
      break;
    case 'Seed':
      burn = randomInt(100, 250) * 1000;
      cash = randomInt(1500, 5000) * 1000;
      employees = randomInt(10, 25);
      roundTarget = raising ? randomInt(2, 8) * 1000000 : 0;
      break;
    case 'Series A':
      burn = randomInt(200, 500) * 1000;
      cash = randomInt(3, 15) * 1000000;
      employees = randomInt(25, 60);
      roundTarget = raising ? randomInt(10, 25) * 1000000 : 0;
      break;
    case 'Series B':
      burn = randomInt(400, 1000) * 1000;
      cash = randomInt(10, 40) * 1000000;
      employees = randomInt(50, 150);
      roundTarget = raising ? randomInt(25, 75) * 1000000 : 0;
      break;
    default:
      burn = randomInt(800, 2000) * 1000;
      cash = randomInt(30, 100) * 1000000;
      employees = randomInt(100, 400);
      roundTarget = raising ? randomInt(50, 200) * 1000000 : 0;
  }
  
  const company = {
    id,
    name,
    tagline: `${pick(['Revolutionary', 'Next-gen', 'AI-powered', 'Modern', 'Cloud-native'])} ${sector.toLowerCase()} platform`,
    stage,
    burn,
    cash,
    employees,
    hq: pick(CITIES),
    sector,
    color: pick([
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-purple-500 to-pink-600',
      'from-orange-500 to-red-600',
      'from-cyan-500 to-blue-600'
    ]),
    raising,
    roundTarget,
    founderPersonIds: [], // Will be filled later
    founders: [],
    goals: [],
    deals: [],
    asOf: recentDate(90),
    provenance: 'manual'
  };
  
  return company;
}

function generatePerson(id, name, orgId, orgType, role, tags) {
  return {
    id,
    name,
    orgId,
    orgType,
    role,
    tags: tags || [],
    asOf: recentDate(90),
    provenance: 'manual'
  };
}

function generateFounders(company) {
  const count = probability(0.7) ? 2 : 1; // 70% have co-founders
  const founders = [];
  const founderPeople = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const role = i === 0 ? 'CEO' : pick(['CTO', 'COO', 'CPO']);
    
    const personId = `p-${kebabCase(name)}`;
    const tags = [
      company.sector.toLowerCase().replace(/\//g, '-'),
      pick(BIG_TECH),
      pick(SCHOOLS)
    ];
    
    founders.push({
      name,
      role,
      bio: `${pick(['Previously', 'Former', 'Ex-'])} ${pick(['led', 'founded', 'built'])} ${pick(BIG_TECH)}. ${pick(SCHOOLS).toUpperCase()} ${pick(['MBA', 'CS', 'Engineering'])}.`
    });
    
    founderPeople.push(generatePerson(personId, name, company.id, 'company', role, tags));
  }
  
  return { founders, founderPeople };
}

function generateGoal(company, index) {
  const type = pick(GOAL_TYPES);
  const status = pick(GOAL_STATUSES);
  
  let name, current, target;
  switch(type) {
    case 'revenue':
      target = randomInt(500, 5000) * 1000;
      current = status === 'completed' ? target : target * randomFloat(0.4, 0.9);
      name = probability(0.5) ? 'Q1 Revenue Target' : 'Revenue Growth';
      break;
    case 'fundraise':
      target = company.roundTarget || randomInt(5, 20) * 1000000;
      current = status === 'completed' ? target : target * randomFloat(0.3, 0.8);
      name = `${company.stage} Close`;
      break;
    case 'hiring':
      target = randomInt(15, 50);
      current = status === 'completed' ? target : Math.floor(target * randomFloat(0.5, 0.9));
      name = 'Engineering Team';
      break;
    case 'product':
      target = 100;
      current = status === 'completed' ? 100 : randomInt(40, 90);
      name = pick(['API V2 Launch', 'Mobile App', 'Enterprise Features', 'Integration Platform']);
      break;
    case 'partnership':
      target = randomInt(3, 10);
      current = status === 'completed' ? target : randomInt(1, target - 1);
      name = 'Strategic Partnerships';
      break;
  }
  
  return {
    id: `${company.id}-g${index}`,
    type,
    name,
    current: Math.floor(current),
    target: Math.floor(target),
    due: futureDate(30, 180),
    status,
    asOf: recentDate(30),
    provenance: 'manual'
  };
}

function generateDeal(company, investors, index) {
  const investor = pick(investors);
  const status = pick(DEAL_STATUSES);
  
  let probability;
  switch(status) {
    case 'meeting': probability = randomInt(20, 40); break;
    case 'dd': probability = randomInt(50, 70); break;
    case 'termsheet': probability = randomInt(75, 90); break;
    case 'closed': probability = 100; break;
    case 'passed': probability = 0; break;
  }
  
  const amount = Math.floor(company.roundTarget * randomFloat(0.2, 0.6));
  
  return {
    id: `d-${company.id}-${index}`,
    investorId: investor.id,
    investor: investor.name,
    status,
    probability,
    amount,
    asOf: recentDate(30),
    provenance: 'manual'
  };
}

function generateInvestor(index, investorPeople) {
  const name = INVESTOR_NAMES[index] || `${pick(['Alpha', 'Beta', 'Gamma', 'Delta'])} Ventures ${index}`;
  const personId = `p-inv-${kebabCase(name.split(' ')[0])}-${index}`;
  
  // AUM as string with unit
  const aumValues = ['250M', '400M', '600M', '800M', '1B', '1.5B', '2B', '2.5B', '3B', '5B'];
  const aum = pick(aumValues);
  
  // Stage focus as string
  const stageFocusOptions = ['Pre-Seed-Seed', 'Seed-Series A', 'Series A-B', 'Series A-C', 'Growth'];
  const stageFocus = pick(stageFocusOptions);
  
  // Sector focus as comma-separated string
  const sectors = pickN(SECTORS, randomInt(2, 4));
  const sectorFocus = sectors.join(', ');
  
  return {
    id: `i${index + 1}`,
    personId,
    name,
    aum,
    stageFocus,
    sectorFocus,
    deals: [], // Will be populated when deals are created
    asOf: recentDate(90),
    provenance: 'manual'
  };
}

function generateInvestorPeople(investors) {
  const people = [];
  
  for (const investor of investors) {
    // Create person matching the investor's personId
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName} (${investor.name.split(' ')[0]})`;
    
    // Parse sectors from sectorFocus string
    const sectors = investor.sectorFocus.split(', ').map(s => s.toLowerCase().replace(/\//g, '-'));
    
    people.push(generatePerson(
      investor.personId,
      name,
      investor.id,
      'fund',
      pick(['Partner', 'Managing Partner', 'Principal', 'General Partner']),
      [...sectors, 'vc', 'investor']
    ));
  }
  
  return people;
}

function generateTeamMember(index) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const personId = `p-team-${kebabCase(name)}`;
  
  return {
    id: `t-${index}`,
    personId,
    name,
    role: pick(['Partner', 'Principal', 'Venture Partner', 'Analyst']),
    focus: pickN(SECTORS.map(s => s.toLowerCase()), randomInt(2, 4)),
    asOf: recentDate(90),
    provenance: 'manual'
  };
}

function generateTeamPeople(team) {
  return team.map(t => 
    generatePerson(
      t.personId,
      t.name,
      'backbone',
      'investor',
      t.role,
      [...t.focus, 'vc', 'investor']
    )
  );
}

function generateRelationship(fromPersonId, toPersonId, index, people) {
  const fromPerson = people.find(p => p.id === fromPersonId);
  const toPerson = people.find(p => p.id === toPersonId);
  
  // Determine relationship type based on org types
  let relType;
  if (fromPerson.orgType === 'company' && toPerson.orgType === 'company') {
    relType = pick(['professional', 'alumni', 'former-colleague']);
  } else if (fromPerson.orgType === 'investor' && toPerson.orgType === 'investor') {
    relType = pick(['professional', 'co-investor']);
  } else {
    relType = pick(['board', 'professional', 'mentor-mentee']);
  }
  
  // Strength based on relationship type
  let strength;
  if (relType === 'board') strength = randomInt(80, 95);
  else if (relType === 'professional') strength = randomInt(50, 85);
  else if (relType === 'former-colleague') strength = randomInt(60, 90);
  else if (relType === 'co-investor') strength = randomInt(65, 85);
  else strength = randomInt(40, 75);
  
  const introCount = relType === 'board' ? randomInt(2, 8) : randomInt(0, 5);
  
  return {
    id: `r${index}`,
    fromPersonId,
    toPersonId,
    relationshipType: relType,
    strength,
    lastTouchAt: randomDate(strength > 70 ? 30 : 90),
    channel: pick(CHANNELS),
    provenance: 'manual',
    introCount,
    introSuccessCount: Math.floor(introCount * randomFloat(0.5, 0.9))
  };
}

function generateIntroOutcome(company, people, relationships, index) {
  // Pick a team member as introducer
  const teamPeople = people.filter(p => p.orgType === 'investor');
  if (teamPeople.length === 0) return null;
  
  const introducer = pick(teamPeople);
  
  // Find people they have relationships with
  const introducerRels = relationships.filter(r => 
    r.fromPersonId === introducer.id || r.toPersonId === introducer.id
  );
  
  if (introducerRels.length === 0) return null;
  
  const rel = pick(introducerRels);
  const targetPersonId = rel.fromPersonId === introducer.id ? rel.toPersonId : rel.fromPersonId;
  
  // Distribute statuses realistically
  let status;
  const rand = Math.random();
  if (rand < 0.15) status = 'positive';
  else if (rand < 0.25) status = 'negative';
  else if (rand < 0.40) status = 'ghosted';
  else if (rand < 0.60) status = 'meeting';
  else if (rand < 0.80) status = 'replied';
  else status = 'sent';
  
  const createdAt = randomDate(60);
  let statusUpdatedAt = createdAt;
  
  // For terminal statuses, update timestamp
  if (['positive', 'negative', 'ghosted', 'meeting', 'replied'].includes(status)) {
    const created = new Date(createdAt);
    const daysAfter = status === 'ghosted' ? randomInt(14, 30) : randomInt(1, 14);
    statusUpdatedAt = new Date(created.getTime() + daysAfter * 24 * 60 * 60 * 1000).toISOString();
  }
  
  return {
    id: `intro-${company.id}-${index}`,
    createdAt,
    actionId: `action-${generateId()}`,
    introducerPersonId: introducer.id,
    targetPersonId,
    companyId: company.id,
    introType: pick(['investor', 'customer', 'partner', 'advisor']),
    pathType: probability(0.8) ? 'direct' : 'warm',
    status,
    statusUpdatedAt
  };
}

function generateActionEvent(introOutcome, index, isFirst, isLast) {
  const baseTime = new Date(introOutcome.createdAt).getTime();
  
  if (isFirst) {
    // Created event
    return {
      id: generateEventId(),
      actionId: introOutcome.actionId,
      eventType: 'created',
      timestamp: introOutcome.createdAt,
      actor: 'system',
      payload: {
        source: 'intro_generator',
        companyId: introOutcome.companyId
      }
    };
  }
  
  if (isLast && ['positive', 'negative'].includes(introOutcome.status)) {
    // Outcome recorded event
    const outcomeTime = new Date(introOutcome.statusUpdatedAt).getTime();
    return {
      id: generateEventId(),
      actionId: introOutcome.actionId,
      eventType: 'outcome_recorded',
      timestamp: new Date(outcomeTime).toISOString(),
      actor: 'user',
      payload: {
        outcome: introOutcome.status === 'positive' ? 'success' : 'failed',
        impactObserved: introOutcome.status === 'positive' ? randomInt(50, 90) : randomInt(10, 40),
        timeToOutcomeDays: Math.floor((outcomeTime - baseTime) / (24 * 60 * 60 * 1000)),
        notes: introOutcome.status === 'positive' ? 'Great conversation, moving forward' : 'Not the right fit'
      }
    };
  }
  
  // Middle events
  const eventTypes = ['assigned', 'started', 'completed', 'note_added'];
  const eventType = eventTypes[index % eventTypes.length];
  const hoursOffset = randomInt(1, 48);
  const timestamp = new Date(baseTime + hoursOffset * 60 * 60 * 1000).toISOString();
  
  let payload = {};
  switch(eventType) {
    case 'assigned':
      payload = { assignedTo: introOutcome.introducerPersonId, assignedBy: 'system' };
      break;
    case 'started':
      payload = { startedBy: introOutcome.introducerPersonId };
      break;
    case 'completed':
      payload = { completedBy: introOutcome.introducerPersonId, duration: randomFloat(0.5, 4) };
      break;
    case 'note_added':
      payload = { note: 'Following up on intro', addedBy: introOutcome.introducerPersonId };
      break;
  }
  
  return {
    id: generateEventId(),
    actionId: introOutcome.actionId,
    eventType,
    timestamp,
    actor: 'user',
    payload
  };
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

function generateData(config = DEFAULT_CONFIG) {
  console.log('Generating QA data with config:', config);
  
  const data = {
    version: '9.1.0',
    exportedAt: new Date().toISOString(),
    companies: [],
    team: [],
    investors: [],
    people: [],
    relationships: []
  };
  
  // Generate investors
  console.log('Generating investors...');
  for (let i = 0; i < config.totalInvestors; i++) {
    data.investors.push(generateInvestor(i));
  }
  
  // Generate companies
  console.log('Generating companies...');
  for (let i = 0; i < config.companies; i++) {
    const company = generateCompany(i, config);
    
    // Generate founders
    const { founders, founderPeople } = generateFounders(company);
    company.founders = founders;
    company.founderPersonIds = founderPeople.map(p => p.id);
    data.people.push(...founderPeople);
    
    // Generate goals
    const goalCount = randomInt(2, Math.ceil(config.goalsPerCompany * 1.5));
    for (let j = 0; j < goalCount; j++) {
      company.goals.push(generateGoal(company, j));
    }
    
    // Generate deals if raising
    if (company.raising) {
      const dealCount = randomInt(2, config.dealsPerRaisingCompany);
      for (let j = 0; j < dealCount; j++) {
        company.deals.push(generateDeal(company, data.investors, j));
      }
    }
    
    data.companies.push(company);
  }
  
  // Populate investor.deals arrays from generated deals
  for (const company of data.companies) {
    for (const deal of company.deals) {
      const investor = data.investors.find(inv => inv.id === deal.investorId);
      if (investor && !investor.deals.includes(company.id)) {
        investor.deals.push(company.id);
      }
    }
  }
  
  // Generate investor people
  console.log('Generating investor people...');
  data.people.push(...generateInvestorPeople(data.investors));
  
  // Generate team
  console.log('Generating team...');
  for (let i = 0; i < config.totalTeamMembers; i++) {
    data.team.push(generateTeamMember(i));
  }
  data.people.push(...generateTeamPeople(data.team));
  
  // Generate external people (advisors, industry experts)
  console.log('Generating external people...');
  const externalCount = Math.floor(config.companies * 0.3);
  for (let i = 0; i < externalCount; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const company = pick(BIG_TECH);
    
    data.people.push(generatePerson(
      `p-ext-${kebabCase(name)}`,
      name,
      company,
      'external',
      pick(['CEO', 'CTO', 'VP Engineering', 'Partner', 'Advisor']),
      [company, pick(SECTORS).toLowerCase(), pick(SCHOOLS)]
    ));
  }
  
  // Generate relationships
  console.log('Generating relationships...');
  const peopleIds = data.people.map(p => p.id);
  const targetRelCount = Math.floor(peopleIds.length * config.relationshipsPerPerson / 2);
  
  let relIndex = 1;
  const usedPairs = new Set();
  
  while (relIndex <= targetRelCount && relIndex < peopleIds.length * 10) {
    const fromId = pick(peopleIds);
    const toId = pick(peopleIds);
    
    if (fromId === toId) continue;
    
    const pairKey = [fromId, toId].sort().join('|');
    if (usedPairs.has(pairKey)) continue;
    
    usedPairs.add(pairKey);
    data.relationships.push(generateRelationship(fromId, toId, relIndex, data.people));
    relIndex++;
  }
  
  console.log('\nGeneration complete!');
  console.log('Statistics:');
  console.log(`  Companies: ${data.companies.length}`);
  console.log(`  People: ${data.people.length}`);
  console.log(`  Relationships: ${data.relationships.length}`);
  console.log(`  Investors: ${data.investors.length}`);
  console.log(`  Team: ${data.team.length}`);
  console.log(`  Goals: ${data.companies.reduce((sum, c) => sum + c.goals.length, 0)}`);
  console.log(`  Deals: ${data.companies.reduce((sum, c) => sum + c.deals.length, 0)}`);
  
  return data;
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  let outputFile = 'raw/sample.json';
  
  for (const arg of args) {
    if (arg.startsWith('--companies=')) {
      config.companies = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--output=')) {
      outputFile = arg.split('=')[1];
    } else if (arg === '--help') {
      console.log(`
Usage: node generate-qa-data.js [options]

Options:
  --companies=N    Number of companies to generate (default: ${DEFAULT_CONFIG.companies})
  --output=FILE    Output filename (default: generated-qa-data.json)
  --help           Show this help

Example:
  node generate-qa-data.js --companies=50 --output=large-dataset.json
      `);
      process.exit(0);
    }
  }
  
  return { config, outputFile };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { config, outputFile } = parseArgs();
  
  try {
    const data = generateData(config);
    const jsonData = JSON.stringify(data, null, 2);
    
    // Write to primary location
    console.log(`\nWriting to ${outputFile}...`);
    writeFileSync(outputFile, jsonData);
    
    // Also write to ui/raw/ for the UI to consume
    const uiOutputFile = outputFile.replace(/^raw\//, 'ui/raw/');
    if (uiOutputFile !== outputFile) {
      console.log(`Writing to ${uiOutputFile}...`);
      writeFileSync(uiOutputFile, jsonData);
    }
    
    console.log('✓ Done!');
    console.log(`\nNext steps:`);
    console.log(`  1. Validate: node qa/qa_gate.js`);
    console.log(`  2. Refresh UI at http://localhost:3000`);
  } catch (error) {
    console.error('Error generating data:', error);
    process.exit(1);
  }
}

export { generateData, DEFAULT_CONFIG };
