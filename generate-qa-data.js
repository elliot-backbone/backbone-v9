#!/usr/bin/env node

/**
 * generate-qa-data.js
 * 
 * Generates realistic sample data for Backbone V9 reflecting actual VC ecosystem.
 * 
 * Entity Structure (all top-level):
 * - Companies: 20 portfolio + 100 market = 120 total
 * - People: Founders, executives, advisors, investors
 * - Firms: 3x company count for realistic deal flow
 * - Rounds: Funding events (linked to companies)
 * - Deals: Investor negotiations (linked to rounds)
 * - Goals: Stage-appropriate milestones (linked to companies)
 * - Relationships: Tracked connections between people
 * 
 * Usage:
 *   node generate-qa-data.js [--portfolio=20] [--market=100] [--output=ui/raw/sample.json]
 */

import { writeFileSync } from 'fs';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  portfolioCompanies: 20,
  marketCompanies: 100,
  
  // Portfolio stage distribution (must sum to 1.0)
  portfolioStages: {
    preFunding: 0.20,    // ~4 companies (Pre-seed)
    earlySeed: 0.35,     // ~7 companies (Seed)
    seriesA: 0.25,       // ~5 companies
    growthStage: 0.20,   // ~4 companies (B, C, D)
  },
  
  firmRatio: 3,          // 3x companies = 360 firms
  backboneTeamSize: 6,
  relationshipsPerPerson: 4,
};

// =============================================================================
// STAGE PARAMETERS
// =============================================================================

// Raise ranges and burn derived from runway expectations:
// Pre-seed/Seed: 12 months runway
// Series A+: 24 months runway

const STAGE_PARAMS = {
  'Pre-seed': {
    raiseMin: 500000,      // $500K
    raiseMax: 5000000,     // $5M
    burnMin: 500000 / 12,  // ~$42K/mo
    burnMax: 5000000 / 12, // ~$417K/mo
    employeesMin: 2,
    employeesMax: 8,
    cashMonths: [6, 18],
  },
  'Seed': {
    raiseMin: 2000000,      // $2M
    raiseMax: 10000000,     // $10M
    burnMin: 2000000 / 12,  // ~$167K/mo
    burnMax: 10000000 / 12, // ~$833K/mo
    employeesMin: 5,
    employeesMax: 20,
    cashMonths: [9, 18],
  },
  'Series A': {
    raiseMin: 5000000,      // $5M
    raiseMax: 25000000,     // $25M
    burnMin: 5000000 / 24,  // ~$208K/mo
    burnMax: 25000000 / 24, // ~$1.04M/mo
    employeesMin: 15,
    employeesMax: 50,
    cashMonths: [12, 24],
  },
  'Series B': {
    raiseMin: 15000000,     // $15M
    raiseMax: 50000000,     // $50M
    burnMin: 15000000 / 24, // ~$625K/mo
    burnMax: 50000000 / 24, // ~$2.08M/mo
    employeesMin: 40,
    employeesMax: 120,
    cashMonths: [18, 30],
  },
  'Series C': {
    raiseMin: 50000000,      // $50M
    raiseMax: 150000000,     // $150M
    burnMin: 50000000 / 24,  // ~$2.08M/mo
    burnMax: 150000000 / 24, // ~$6.25M/mo
    employeesMin: 100,
    employeesMax: 350,
    cashMonths: [18, 36],
  },
  'Series D': {
    raiseMin: 100000000,     // $100M
    raiseMax: 300000000,     // $300M
    burnMin: 100000000 / 24, // ~$4.17M/mo
    burnMax: 300000000 / 24, // ~$12.5M/mo
    employeesMin: 300,
    employeesMax: 1000,
    cashMonths: [24, 48],
  },
};

const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D'];

const STAGE_SEQUENCE = {
  'Pre-seed': 0,
  'Seed': 1,
  'Series A': 2,
  'Series B': 3,
  'Series C': 4,
  'Series D': 5,
};

// =============================================================================
// GOAL TEMPLATES BY STAGE
// =============================================================================

const STAGE_GOALS = {
  'Pre-seed': [
    { type: 'product', name: 'MVP Launch', unlocks: 'Seed readiness' },
    { type: 'product', name: 'Beta Users', unlocks: 'Early traction' },
    { type: 'fundraise', name: 'Seed Round', unlocks: 'Growth capital' },
  ],
  'Seed': [
    { type: 'revenue', name: 'First Revenue', unlocks: 'PMF signal' },
    { type: 'product', name: 'Product-Market Fit', unlocks: 'Series A readiness' },
    { type: 'hiring', name: 'Engineering Team', unlocks: 'Product velocity' },
    { type: 'revenue', name: 'ARR Target', unlocks: 'Series A metrics' },
    { type: 'fundraise', name: 'Series A Round', unlocks: 'Scale capital' },
  ],
  'Series A': [
    { type: 'revenue', name: 'Revenue Growth', unlocks: 'Series B metrics' },
    { type: 'operational', name: 'Unit Economics', unlocks: 'Scalable model' },
    { type: 'hiring', name: 'Go-to-Market Team', unlocks: 'Sales velocity' },
    { type: 'partnership', name: 'Strategic Partners', unlocks: 'Distribution' },
    { type: 'fundraise', name: 'Series B Round', unlocks: 'Expansion capital' },
  ],
  'Series B': [
    { type: 'revenue', name: 'ARR Milestone', unlocks: 'Market leadership' },
    { type: 'operational', name: 'Market Expansion', unlocks: 'TAM capture' },
    { type: 'hiring', name: 'Executive Team', unlocks: 'Organizational scale' },
    { type: 'fundraise', name: 'Series C Round', unlocks: 'Dominance capital' },
  ],
  'Series C': [
    { type: 'revenue', name: 'Revenue Target', unlocks: 'IPO readiness' },
    { type: 'operational', name: 'International', unlocks: 'Global presence' },
    { type: 'operational', name: 'Profitability Path', unlocks: 'Sustainability' },
  ],
  'Series D': [
    { type: 'operational', name: 'Market Leadership', unlocks: 'Category winner' },
    { type: 'operational', name: 'IPO Preparation', unlocks: 'Public markets' },
  ],
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
  'Chris', 'Emily', 'Andrew', 'Michelle', 'Brian', 'Lauren', 'Steven', 'Ashley',
  'Eric', 'Megan', 'Jason', 'Stephanie', 'Benjamin', 'Nicole', 'Jonathan', 'Heather',
  'Patrick', 'Anna', 'Matt', 'Sophie', 'Jake', 'Olivia', 'Nathan', 'Emma'
];

const LAST_NAMES = [
  'Chen', 'Thompson', 'Rodriguez', 'Sharma', 'Kim', 'Patel', 'Lee', 'Garcia',
  'Anderson', 'Martinez', 'Wilson', 'Moore', 'Taylor', 'Brown', 'Davis', 'Miller',
  'Johnson', 'Williams', 'Zhang', 'Wang', 'Singh', 'Park', 'Nakamura', 'Okonkwo',
  'Mueller', 'Costa', 'Berg', 'Fischer', 'Santos', 'Reyes', 'Scott', 'Green'
];

const COMPANY_NAMES = [
  'Velocity', 'NexGen', 'Quantum', 'Apex', 'Zenith', 'Vanguard', 'Catalyst', 'Prism',
  'Meridian', 'Sentinel', 'Harmonic', 'Cascade', 'Axiom', 'Beacon', 'Clarity', 'Dynamo',
  'Eclipse', 'Frontier', 'Gravity', 'Horizon', 'Ionic', 'Kinetic', 'Lumina', 'Momentum',
  'Nova', 'Orbit', 'Pulse', 'Quasar', 'Radiant', 'Stellar', 'Titanium', 'Unity',
  'Vector', 'Wavelength', 'Xenon', 'Yield', 'Zephyr', 'Atlas', 'Bolt', 'Core',
  'Delta', 'Echo', 'Flux', 'Grid', 'Helix', 'Index', 'Junction', 'Keystone',
  'Layer', 'Matrix', 'Nexus', 'Onyx', 'Pinnacle', 'Quartz', 'Relay', 'Spectrum',
  'Tensor', 'Uplink', 'Vertex', 'Warp', 'Aether', 'Blaze', 'Cipher', 'Drift'
];

const FIRM_PREFIXES = [
  'Horizon', 'Atlas', 'Pinnacle', 'Sterling', 'Evergreen', 'Catalyst', 'Sequoia',
  'Benchmark', 'Accel', 'Greylock', 'FirstMark', 'Lightspeed', 'Founders', 'Amplify',
  'Union Square', 'Andreessen', 'Bessemer', 'NEA', 'General Atlantic', 'Tiger Global',
  'Insight', 'Kleiner', 'Index', 'Battery', 'Spark', 'Matrix', 'GGV', 'IVP',
  'Menlo', 'Norwest', 'Redpoint', 'Scale', 'Thrive', 'Coatue', 'Ribbit', 'QED',
  'Valor', 'Initialized', 'Felicis', 'Floodgate', 'First Round', 'True', 'Emergence',
  'Craft', 'CRV', 'Point Nine', 'Balderton', 'Atomico', 'Northzone', 'SignalFire',
  'Oak', 'Maple', 'Cedar', 'Pine', 'Birch', 'Aspen', 'Willow', 'Summit', 'Alpine'
];

const FIRM_SUFFIXES = ['Ventures', 'Capital', 'Partners', 'Fund', 'Investments', 'VC', 'Growth'];

const RELATIONSHIP_TYPES = ['board', 'professional', 'alumni', 'former-colleague', 'co-investor', 'mentor', 'advisor', 'friend'];
const CHANNELS = ['in-person', 'video', 'phone', 'email', 'linkedin', 'conference'];
const SCHOOLS = ['Stanford', 'MIT', 'Harvard', 'Berkeley', 'CMU', 'Wharton', 'Yale', 'Princeton'];
const BIG_TECH = ['Google', 'Stripe', 'Microsoft', 'Apple', 'Meta', 'Amazon', 'Uber', 'Airbnb'];

// =============================================================================
// UTILITIES
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
  return shuffled.slice(0, Math.min(n, array.length));
}

function pickWeighted(options) {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let random = Math.random() * total;
  for (const [value, weight] of options) {
    random -= weight;
    if (random <= 0) return value;
  }
  return options[options.length - 1][0];
}

function probability(p) {
  return Math.random() < p;
}

function kebabCase(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function monthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

// =============================================================================
// ID GENERATORS
// =============================================================================

const usedIds = new Set();

function uniqueId(prefix, base) {
  let id = prefix ? `${prefix}-${kebabCase(base)}` : kebabCase(base);
  let counter = 1;
  while (usedIds.has(id)) {
    id = prefix ? `${prefix}-${kebabCase(base)}-${counter}` : `${kebabCase(base)}-${counter}`;
    counter++;
  }
  usedIds.add(id);
  return id;
}

// =============================================================================
// ENTITY GENERATORS
// =============================================================================

function generatePerson(name, orgId, orgType, role, tags = []) {
  return {
    id: uniqueId('p', name),
    name,
    orgId,
    orgType,
    role,
    tags,
    asOf: daysAgo(randomInt(1, 30)),
    provenance: 'manual'
  };
}

function generateFounder(companyId, sector, isFirst, allPeople) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const role = isFirst ? 'CEO' : pick(['CTO', 'COO', 'CPO', 'CFO']);
  
  const tags = [kebabCase(sector), kebabCase(pick(BIG_TECH)), kebabCase(pick(SCHOOLS))];
  const person = generatePerson(name, companyId, 'company', role, tags);
  allPeople.push(person);
  
  const founderInfo = {
    name,
    role,
    bio: `${pick(['Previously', 'Former', 'Ex-'])} ${pick(['led', 'founded', 'built'])} at ${pick(BIG_TECH)}. ${pick(SCHOOLS)}.`
  };
  
  return { personId: person.id, founderInfo };
}

function generateFirm(index) {
  const prefixIndex = index % FIRM_PREFIXES.length;
  const suffixIndex = Math.floor(index / FIRM_PREFIXES.length) % FIRM_SUFFIXES.length;
  const fundNumber = Math.floor(index / (FIRM_PREFIXES.length * FIRM_SUFFIXES.length)) + 1;
  
  const prefix = FIRM_PREFIXES[prefixIndex];
  const suffix = FIRM_SUFFIXES[suffixIndex];
  const name = fundNumber > 1 ? `${prefix} ${suffix} ${fundNumber}` : `${prefix} ${suffix}`;
  
  const aumOptions = ['150M', '250M', '400M', '600M', '800M', '1B', '1.5B', '2B', '3B', '5B'];
  const stageOptions = ['Pre-Seed-Seed', 'Seed-Series A', 'Series A-B', 'Series A-C', 'Growth'];
  
  return {
    id: `i${index + 1}`,
    name,
    personId: null, // Set when person created
    aum: pick(aumOptions),
    stageFocus: pick(stageOptions),
    sectorFocus: pickN(SECTORS, randomInt(2, 4)).join(', '),
    asOf: daysAgo(randomInt(1, 90)),
    provenance: 'manual'
  };
}

function generateFirmPerson(firm, allPeople) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const firmShortName = firm.name.split(' ')[0];
  const name = `${firstName} ${lastName} (${firmShortName})`;
  
  const person = generatePerson(
    name,
    firm.id,
    'fund',
    pick(['Partner', 'Managing Partner', 'General Partner', 'Principal']),
    [kebabCase(firm.stageFocus), 'investor', 'vc']
  );
  
  firm.personId = person.id;
  allPeople.push(person);
  return person;
}

function generateRound(companyId, companyName, stage, isCurrent, currentStage) {
  const params = STAGE_PARAMS[stage];
  const target = randomInt(params.raiseMin, params.raiseMax);
  
  // Timeline
  let openedAt, closedAt;
  const stageIndex = STAGE_SEQUENCE[stage];
  const currentStageIndex = STAGE_SEQUENCE[currentStage];
  
  if (!isCurrent) {
    // Historical round - closed months ago based on stage difference
    const monthsBack = (currentStageIndex - stageIndex) * 12 + randomInt(6, 18);
    closedAt = monthsAgo(monthsBack);
    openedAt = monthsAgo(monthsBack + randomInt(3, 9));
  } else {
    // Current round - opened recently
    openedAt = monthsAgo(randomInt(1, 6));
    closedAt = null;
  }
  
  return {
    id: uniqueId('r', `${companyId}-${kebabCase(stage)}`),
    companyId,
    companyName,
    stage,
    target,
    raised: isCurrent ? 0 : target, // Historical rounds fully raised
    status: isCurrent ? 'active' : 'closed',
    openedAt,
    closedAt,
    leadFirmId: null, // Set when deals created
    asOf: daysAgo(1),
    provenance: 'manual'
  };
}

function generateDeal(round, company, firm, isLead, allPeople) {
  const isCurrent = round.status === 'active';
  
  let status, prob;
  if (!isCurrent) {
    // Historical deal - closed
    status = 'closed';
    prob = 100;
  } else {
    // Current deal - various statuses
    const statusWeights = [
      ['outreach', 10], ['meeting', 25], ['dd', 30],
      ['termsheet', 20], ['closed', 10], ['passed', 5],
    ];
    status = pickWeighted(statusWeights);
    
    switch (status) {
      case 'outreach': prob = randomInt(10, 25); break;
      case 'meeting': prob = randomInt(25, 45); break;
      case 'dd': prob = randomInt(50, 70); break;
      case 'termsheet': prob = randomInt(75, 90); break;
      case 'closed': prob = 100; break;
      case 'passed': prob = 0; break;
    }
  }
  
  // Lead takes 30-50%, others 10-25%
  const share = isLead ? randomFloat(0.30, 0.50) : randomFloat(0.10, 0.25);
  const amount = Math.floor(round.target * share);
  
  // Find investor person at firm
  const firmPeople = allPeople.filter(p => p.orgId === firm.id);
  const leadPersonIds = firmPeople.length > 0 ? [pick(firmPeople).id] : [];
  
  return {
    id: uniqueId('d', `${company.id}-${firm.id}-${kebabCase(round.stage)}`),
    roundId: round.id,
    companyId: company.id,
    companyName: company.name,
    firmId: firm.id,
    firmName: firm.name,
    amount,
    status,
    probability: prob,
    leadPersonIds,
    isLead,
    firstContact: round.openedAt,
    lastActivity: daysAgo(randomInt(1, 14)),
    closedAt: status === 'closed' ? (round.closedAt || daysAgo(randomInt(7, 30))) : null,
    asOf: daysAgo(1),
    provenance: 'manual'
  };
}

function generateGoal(company, goalTemplate, index) {
  const isCompleted = probability(0.3);
  const isActive = !isCompleted && probability(0.7);
  
  let current, target;
  const params = STAGE_PARAMS[company.stage];
  
  switch (goalTemplate.type) {
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
    case 'operational':
      target = 100;
      current = isCompleted ? 100 : randomInt(20, 80);
      break;
    default:
      target = 100;
      current = randomInt(30, 90);
  }
  
  return {
    id: `${company.id}-g${index}`,
    companyId: company.id,
    companyName: company.name,
    name: goalTemplate.name,
    type: goalTemplate.type,
    current,
    target,
    status: isCompleted ? 'completed' : (isActive ? 'active' : pick(['blocked', 'abandoned'])),
    due: new Date(Date.now() + randomInt(30, 180) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unlocks: goalTemplate.unlocks,
    asOf: daysAgo(randomInt(1, 14)),
    provenance: 'manual'
  };
}

function generateCompany(name, stage, isPortfolio, sector, allPeople) {
  const id = uniqueId('', name);
  const params = STAGE_PARAMS[stage];
  
  const burn = Math.floor(randomFloat(params.burnMin, params.burnMax));
  const cashMonths = randomInt(params.cashMonths[0], params.cashMonths[1]);
  const cash = burn * cashMonths;
  const employees = randomInt(params.employeesMin, params.employeesMax);
  
  const raising = isPortfolio ? probability(0.4) : probability(0.2);
  const roundTarget = raising ? randomInt(params.raiseMin, params.raiseMax) : 0;
  
  const company = {
    id,
    name,
    tagline: `${pick(['Next-gen', 'AI-powered', 'Modern', 'Enterprise', 'Cloud-native'])} ${sector.toLowerCase()} platform`,
    stage,
    sector,
    hq: pick(CITIES),
    isPortfolio,
    burn,
    cash,
    employees,
    raising,
    roundTarget,
    founderPersonIds: [],
    founders: [],
    founded: `${2024 - STAGE_SEQUENCE[stage] - randomInt(0, 2)}`,
    asOf: daysAgo(randomInt(1, 7)),
    provenance: 'manual'
  };
  
  // Generate founders (1-3)
  const founderCount = probability(0.7) ? 2 : (probability(0.5) ? 1 : 3);
  for (let i = 0; i < founderCount; i++) {
    const { personId, founderInfo } = generateFounder(id, sector, i === 0, allPeople);
    company.founderPersonIds.push(personId);
    company.founders.push(founderInfo);
  }
  
  return company;
}

function generateRelationship(fromPerson, toPerson, index, introducedBy = null) {
  const relType = pick(RELATIONSHIP_TYPES);
  
  let strength;
  switch (relType) {
    case 'board': strength = randomInt(80, 95); break;
    case 'professional': strength = randomInt(50, 80); break;
    case 'former-colleague': strength = randomInt(60, 90); break;
    case 'co-investor': strength = randomInt(65, 85); break;
    case 'mentor': strength = randomInt(70, 90); break;
    case 'advisor': strength = randomInt(65, 85); break;
    default: strength = randomInt(40, 70);
  }
  
  const introCount = introducedBy ? randomInt(1, 5) : 0;
  
  return {
    id: `rel-${index}`,
    fromPersonId: fromPerson.id,
    toPersonId: toPerson.id,
    relationshipType: relType,
    strength,
    lastTouchAt: daysAgo(randomInt(1, strength > 70 ? 30 : 90)),
    channel: pick(CHANNELS),
    introCount,
    introSuccessCount: Math.floor(introCount * randomFloat(0.5, 0.9)),
    introducedBy,
    provenance: 'manual'
  };
}

function generateBackboneTeam(allPeople) {
  const teamRoles = [
    { role: 'Managing Partner', focus: ['fintech', 'payments', 'enterprise'] },
    { role: 'Partner', focus: ['infrastructure', 'developer-tools', 'ai'] },
    { role: 'Partner', focus: ['healthcare', 'climate', 'consumer'] },
    { role: 'Principal', focus: ['fintech', 'security', 'saas'] },
    { role: 'Associate', focus: ['developer-tools', 'infrastructure', 'ai'] },
    { role: 'VP Operations', focus: ['operations', 'portfolio-support'] },
  ];
  
  const team = [];
  
  for (let i = 0; i < CONFIG.backboneTeamSize && i < teamRoles.length; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const { role, focus } = teamRoles[i];
    
    const person = generatePerson(name, 'backbone', 'fund', role, focus);
    allPeople.push(person);
    
    team.push({
      id: `t-${i + 1}`,
      personId: person.id,
      name,
      role,
      focus,
      asOf: daysAgo(1),
      provenance: 'manual'
    });
  }
  
  return team;
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

function generateData() {
  console.log('Generating Backbone V9 sample data...\n');
  
  const data = {
    version: '9.2.0',
    exportedAt: new Date().toISOString(),
    companies: [],
    people: [],
    investors: [],  // Firms
    rounds: [],
    deals: [],
    goals: [],
    team: [],
    relationships: []
  };
  
  // Step 1: Generate firms
  const totalFirms = (CONFIG.portfolioCompanies + CONFIG.marketCompanies) * CONFIG.firmRatio;
  console.log(`Generating ${totalFirms} investment firms...`);
  
  for (let i = 0; i < totalFirms; i++) {
    const firm = generateFirm(i);
    data.investors.push(firm);
    generateFirmPerson(firm, data.people);
  }
  
  // Step 2: Generate Backbone team
  console.log(`Generating Backbone team (${CONFIG.backboneTeamSize} members)...`);
  data.team = generateBackboneTeam(data.people);
  
  // Step 3: Generate portfolio companies
  console.log(`Generating ${CONFIG.portfolioCompanies} portfolio companies...`);
  
  const portfolioStageDistribution = [];
  const { preFunding, earlySeed, seriesA, growthStage } = CONFIG.portfolioStages;
  
  for (let i = 0; i < Math.round(CONFIG.portfolioCompanies * preFunding); i++) {
    portfolioStageDistribution.push('Pre-seed');
  }
  for (let i = 0; i < Math.round(CONFIG.portfolioCompanies * earlySeed); i++) {
    portfolioStageDistribution.push('Seed');
  }
  for (let i = 0; i < Math.round(CONFIG.portfolioCompanies * seriesA); i++) {
    portfolioStageDistribution.push('Series A');
  }
  const growthCount = Math.round(CONFIG.portfolioCompanies * growthStage);
  for (let i = 0; i < growthCount; i++) {
    portfolioStageDistribution.push(pick(['Series B', 'Series C', 'Series D']));
  }
  
  const shuffledPortfolioStages = portfolioStageDistribution.sort(() => Math.random() - 0.5);
  const usedNames = new Set();
  
  for (let i = 0; i < CONFIG.portfolioCompanies; i++) {
    let name = pick(COMPANY_NAMES);
    while (usedNames.has(name)) name = pick(COMPANY_NAMES);
    usedNames.add(name);
    
    const stage = shuffledPortfolioStages[i] || 'Seed';
    const company = generateCompany(name, stage, true, pick(SECTORS), data.people);
    data.companies.push(company);
  }
  
  // Step 4: Generate market companies
  console.log(`Generating ${CONFIG.marketCompanies} market companies...`);
  
  for (let i = 0; i < CONFIG.marketCompanies; i++) {
    let name = pick(COMPANY_NAMES);
    let suffix = 1;
    while (usedNames.has(name)) {
      name = `${pick(COMPANY_NAMES)} ${pick(['Labs', 'AI', 'Tech', 'Systems', 'Health', 'Data'])}`;
      suffix++;
      if (suffix > 10) name = `${pick(COMPANY_NAMES)}${i}`;
    }
    usedNames.add(name);
    
    const stage = pickWeighted([
      ['Pre-seed', 25], ['Seed', 35], ['Series A', 20],
      ['Series B', 10], ['Series C', 7], ['Series D', 3],
    ]);
    
    const company = generateCompany(name, stage, false, pick(SECTORS), data.people);
    data.companies.push(company);
  }
  
  // Step 5: Generate rounds and deals for each company
  console.log('Generating rounds and deals...');
  
  for (const company of data.companies) {
    const currentStageIndex = STAGE_SEQUENCE[company.stage];
    
    // Historical rounds (all stages before current)
    for (let i = 0; i < currentStageIndex; i++) {
      const historicalStage = STAGES[i];
      const round = generateRound(company.id, company.name, historicalStage, false, company.stage);
      data.rounds.push(round);
      
      // Generate deals for this round
      const numDeals = randomInt(1, 4);
      const participatingFirms = pickN(data.investors, numDeals);
      
      let isLead = true;
      for (const firm of participatingFirms) {
        const deal = generateDeal(round, company, firm, isLead, data.people);
        data.deals.push(deal);
        
        if (isLead) {
          round.leadFirmId = firm.id;
        }
        
        // Update raised amount for closed deals
        if (deal.status === 'closed' || deal.status === 'termsheet') {
          round.raised += deal.amount;
        }
        
        isLead = false;
      }
    }
    
    // Current round if raising
    if (company.raising) {
      const currentRound = generateRound(company.id, company.name, company.stage, true, company.stage);
      data.rounds.push(currentRound);
      
      // Generate active deals
      const numDeals = randomInt(2, 5);
      const participatingFirms = pickN(data.investors, numDeals);
      
      let isLead = true;
      for (const firm of participatingFirms) {
        const deal = generateDeal(currentRound, company, firm, isLead, data.people);
        data.deals.push(deal);
        
        if (isLead) {
          currentRound.leadFirmId = firm.id;
        }
        
        if (deal.status === 'closed' || deal.status === 'termsheet') {
          currentRound.raised += deal.amount;
        }
        
        isLead = false;
      }
    }
    
    // Generate goals
    const stageGoals = STAGE_GOALS[company.stage] || STAGE_GOALS['Seed'];
    const selectedGoals = pickN(stageGoals, randomInt(2, Math.min(4, stageGoals.length)));
    selectedGoals.forEach((template, idx) => {
      data.goals.push(generateGoal(company, template, idx));
    });
  }
  
  // Step 6: Generate relationships
  console.log('Generating relationships...');
  
  const allPeopleIds = data.people.map(p => p.id);
  const backboneTeamIds = data.team.map(t => t.personId);
  const targetRelCount = Math.floor(data.people.length * CONFIG.relationshipsPerPerson / 2);
  
  const usedPairs = new Set();
  let relIndex = 1;
  
  // Backbone team relationships first
  for (const teamMember of data.team) {
    const numRels = randomInt(10, 20);
    for (let i = 0; i < numRels && relIndex <= targetRelCount; i++) {
      const toPersonId = pick(allPeopleIds.filter(id => id !== teamMember.personId));
      const pairKey = [teamMember.personId, toPersonId].sort().join('|');
      
      if (!usedPairs.has(pairKey)) {
        usedPairs.add(pairKey);
        const fromPerson = data.people.find(p => p.id === teamMember.personId);
        const toPerson = data.people.find(p => p.id === toPersonId);
        
        if (fromPerson && toPerson) {
          const introducedBy = probability(0.3) ? pick(backboneTeamIds) : null;
          data.relationships.push(generateRelationship(fromPerson, toPerson, relIndex, introducedBy));
          relIndex++;
        }
      }
    }
  }
  
  // Fill remaining relationships
  while (relIndex <= targetRelCount) {
    const fromId = pick(allPeopleIds);
    const toId = pick(allPeopleIds);
    
    if (fromId === toId) continue;
    
    const pairKey = [fromId, toId].sort().join('|');
    if (usedPairs.has(pairKey)) continue;
    
    usedPairs.add(pairKey);
    const fromPerson = data.people.find(p => p.id === fromId);
    const toPerson = data.people.find(p => p.id === toId);
    
    if (fromPerson && toPerson) {
      const introducedBy = probability(0.15) ? pick(backboneTeamIds) : null;
      data.relationships.push(generateRelationship(fromPerson, toPerson, relIndex, introducedBy));
      relIndex++;
    }
  }
  
  // Statistics
  console.log('\n✓ Generation complete!\n');
  console.log('Statistics:');
  console.log(`  Companies: ${data.companies.length}`);
  console.log(`    - Portfolio: ${data.companies.filter(c => c.isPortfolio).length}`);
  console.log(`    - Market: ${data.companies.filter(c => !c.isPortfolio).length}`);
  console.log(`  People: ${data.people.length}`);
  console.log(`  Firms: ${data.investors.length}`);
  console.log(`  Rounds: ${data.rounds.length}`);
  console.log(`  Deals: ${data.deals.length}`);
  console.log(`  Goals: ${data.goals.length}`);
  console.log(`  Team: ${data.team.length}`);
  console.log(`  Relationships: ${data.relationships.length}`);
  
  console.log('\nPortfolio by stage:');
  const portfolioByStage = {};
  data.companies.filter(c => c.isPortfolio).forEach(c => {
    portfolioByStage[c.stage] = (portfolioByStage[c.stage] || 0) + 1;
  });
  Object.entries(portfolioByStage)
    .sort((a, b) => STAGE_SEQUENCE[a[0]] - STAGE_SEQUENCE[b[0]])
    .forEach(([stage, count]) => console.log(`  ${stage}: ${count}`));
  
  return data;
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  let outputFile = 'ui/raw/sample.json';
  
  for (const arg of args) {
    if (arg.startsWith('--output=')) {
      outputFile = arg.split('=')[1];
    } else if (arg.startsWith('--portfolio=')) {
      CONFIG.portfolioCompanies = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--market=')) {
      CONFIG.marketCompanies = parseInt(arg.split('=')[1]);
    } else if (arg === '--help') {
      console.log(`
Usage: node generate-qa-data.js [options]

Options:
  --portfolio=N    Number of portfolio companies (default: ${CONFIG.portfolioCompanies})
  --market=N       Number of market companies (default: ${CONFIG.marketCompanies})
  --output=FILE    Output filename (default: ui/raw/sample.json)
  --help           Show this help
      `);
      process.exit(0);
    }
  }
  
  return { outputFile };
}

// Run
const { outputFile } = parseArgs();

try {
  const data = generateData();
  const jsonData = JSON.stringify(data, null, 2);
  
  console.log(`\nWriting to ${outputFile}...`);
  writeFileSync(outputFile, jsonData);
  
  console.log('✓ Done!\n');
} catch (error) {
  console.error('Error generating data:', error);
  process.exit(1);
}

export { generateData, CONFIG };
