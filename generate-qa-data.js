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

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import {
  STAGE_PARAMS,
  STAGE_GOALS,
  STAGES,
  getStageParams,
  getStageGoals
} from './packages/core/raw/stageParams.js';
import { detectAnomalies, ANOMALY_SEVERITY } from './packages/core/derive/anomalyDetection.js';
import { suggestGoals, suggestionToGoal } from './packages/core/predict/suggestedGoals.js';
import { GOAL_TYPES, normalizeGoal } from './packages/core/raw/goalSchema.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const GOAL_TYPE_WEIGHTS = {
  fundraise: 90, revenue: 85, operational: 70,
  hiring: 60, product: 55, partnership: 50,
  intro_target: 45, relationship_build: 40, deal_close: 80,
  round_completion: 85, investor_activation: 35, champion_cultivation: 30,
};

const CONFIG = {
  portfolioCompanies: 20,
  marketCompanies: 100,
  targetPeople: 614,
  targetFirms: 360,
  targetRounds: 201,
  targetDeals: 536,
  targetGoals: 100,  // 20 companies × 5 diverse goals each
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
  executive: ['VP Engineering', 'VP Sales', 'VP Product', 'CFO', 'COO', 'CMO', 'CRO', 'Head of Engineering', 'Head of Product'],
  investor: ['Partner', 'Principal', 'Associate', 'Managing Partner', 'General Partner'],
  operator: [
    'Engineering Manager', 'Staff Engineer', 'Senior Engineer', 'Tech Lead', 'Principal Engineer',
    'Product Manager', 'Senior Product Manager',
    'Head of Growth', 'Account Executive', 'Sales Manager', 'Customer Success Manager',
    'Head of Design', 'Senior Designer', 'UX Lead',
    'Data Scientist', 'Data Engineer', 'ML Engineer',
    'Operations Manager', 'DevOps Lead', 'QA Lead',
  ],
  advisor: ['Advisor', 'Board Member', 'Board Observer', 'Strategic Advisor'],
};

const DEPARTMENTS = {
  'Engineering Manager': 'engineering',
  'Staff Engineer': 'engineering',
  'Senior Engineer': 'engineering',
  'Tech Lead': 'engineering',
  'Principal Engineer': 'engineering',
  'Product Manager': 'product',
  'Senior Product Manager': 'product',
  'Head of Growth': 'growth',
  'Account Executive': 'sales',
  'Sales Manager': 'sales',
  'Customer Success Manager': 'sales',
  'Head of Design': 'design',
  'Senior Designer': 'design',
  'UX Lead': 'design',
  'Data Scientist': 'data',
  'Data Engineer': 'data',
  'ML Engineer': 'data',
  'Operations Manager': 'operations',
  'DevOps Lead': 'engineering',
  'QA Lead': 'engineering',
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
  let department = null;
  
  if (role === 'founder') {
    title = pick(TITLES.founder);
  } else if (role === 'executive') {
    title = pick(TITLES.executive);
  } else if (role === 'investor') {
    title = pick(TITLES.investor);
  } else if (role === 'operator') {
    title = pick(TITLES.operator);
    department = DEPARTMENTS[title] || 'operations';
  } else if (role === 'advisor') {
    title = pick(TITLES.advisor);
  } else {
    title = role;
  }
  
  // Determine org type
  const orgType = role === 'investor' ? 'firm' : 'company';
  
  // Generate start date (founders earlier, operators more recent)
  let startDate = null;
  if (orgType === 'company' && companyOrFirm?.founded) {
    const foundedYear = companyOrFirm.founded;
    const now = new Date();
    const companyAgeMonths = (now.getFullYear() - foundedYear) * 12;
    
    if (role === 'founder') {
      // Founders joined at founding
      startDate = `${foundedYear}-${String(randomInt(1, 12)).padStart(2, '0')}-01`;
    } else if (role === 'executive') {
      // Executives joined 6-24 months after founding
      const monthsAfterFounding = Math.min(randomInt(6, 24), companyAgeMonths);
      const joinDate = new Date(foundedYear, monthsAfterFounding, 1);
      startDate = joinDate.toISOString().split('T')[0];
    } else if (role === 'operator') {
      // Operators joined more recently, 3-18 months ago
      const monthsAgo = randomInt(3, Math.min(18, companyAgeMonths));
      const joinDate = new Date(now);
      joinDate.setMonth(joinDate.getMonth() - monthsAgo);
      startDate = joinDate.toISOString().split('T')[0];
    } else if (role === 'advisor') {
      // Advisors joined after first funding, 6-36 months after founding
      const monthsAfterFounding = Math.min(randomInt(6, 36), companyAgeMonths);
      const joinDate = new Date(foundedYear, monthsAfterFounding, 1);
      startDate = joinDate.toISOString().split('T')[0];
    }
  }
  
  const person = {
    id: uniqueId('p', `${firstName}${lastName}`),
    fn: firstName,
    ln: lastName,
    email: generateEmail(firstName, lastName, domain),
    title,
    role,
    org: companyOrFirm?.id || null,
    orgName: companyOrFirm?.name || null,
    orgType,
    loc: pick(CITIES),
    linkedin: `linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}${randomInt(1, 999)}`,
    asOf: daysAgo(randomInt(1, 30)),
  };
  
  // Add optional fields only if present
  if (department) person.department = department;
  if (startDate) person.startDate = startDate;
  
  return person;
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
  
  // ALWAYS generate exactly 5 diverse, high-impact goals per portfolio company
  // Goal types in priority order (most impactful first)
  const REQUIRED_GOAL_TYPES = ['fundraise', 'revenue', 'operational', 'hiring', 'product'];
  
  for (const goalType of REQUIRED_GOAL_TYPES) {
    if (goals.length >= 5) break;
    
    const template = stageGoals.find(t => t.type === goalType) || { type: goalType, name: `${goalType} goal` };
    const params = getStageParams(company.stage);
    
    let current, target, name;
    
    switch (goalType) {
      case 'fundraise':
        target = company.roundTarget || params.raiseMin || 2000000;
        current = Math.floor(target * randomFloat(0.1, 0.5)); // Always behind
        name = `${company.stage} Round`;
        break;
      case 'revenue':
        target = randomInt(1000, 10000) * 1000;
        current = Math.floor(target * randomFloat(0.3, 0.7)); // Gap to close
        name = company.arr > 0 ? 'ARR Target' : 'First Revenue';
        break;
      case 'operational':
        target = 100;
        current = randomInt(40, 75); // Always room to improve
        name = pick(['Reduce Burn', 'Extend Runway', 'Market Expansion', 'Process Efficiency']);
        break;
      case 'hiring':
        target = randomInt(8, 25);
        current = Math.max(1, target - randomInt(2, 6)); // Hiring gap
        name = pick(['Engineering Team', 'Go-to-Market Team', 'Executive Team']);
        break;
      case 'product':
        target = 100;
        current = randomInt(50, 85); // Getting to PMF
        name = pick(['Product-Market Fit', 'V2 Launch', 'Platform Stability']);
        break;
      default:
        target = 100;
        current = randomInt(30, 70);
        name = template.name;
    }
    
    // gap/gapPct are derived (computed at runtime), not stored
    const gapPct = target > 0 ? (target - current) / target : 0;

    goals.push({
      id: `${company.id}-g${goals.length}`,
      companyId: company.id,
      entityRefs: [{ type: 'company', id: company.id, role: 'primary' }],
      name: name,
      type: goalType,
      cur: current,
      tgt: target,
      status: gapPct > 0.3 ? 'at_risk' : 'active',
      due: daysFromNow(randomInt(30, 180)),
      provenance: 'template',
      weight: GOAL_TYPE_WEIGHTS[goalType] || 50,
      asOf: daysAgo(randomInt(1, 7)),
    });
  }
  
  return goals;
}

/**
 * Generate multi-entity goals (intro_target, relationship_build, deal_close, etc.)
 * These goals span multiple entity types and track cross-entity progress.
 */
function generateMultiEntityGoals(data, targetCount) {
  const multiEntityGoals = [];
  const portfolioCompanies = data.companies.filter(c => c.isPortfolio);
  
  // 1. intro_target: company + firm + person
  // "Intro [Company] to [Firm GP] by [date]"
  for (let i = 0; i < Math.ceil(targetCount * 0.25); i++) {
    const company = pick(portfolioCompanies);
    const firm = pick(data.firms);
    // Find a person at this firm (or create a reference)
    const firmPartners = data.people.filter(p => p.firmId === firm.id);
    const person = firmPartners.length > 0 ? pick(firmPartners) : pick(data.people);
    
    multiEntityGoals.push({
      id: uniqueId('goal-intro', `${company.id}-${firm.id}`),
      name: `Intro ${company.name} to ${firm.name}`,
      type: 'intro_target',
      entityRefs: [
        { type: 'company', id: company.id, role: 'primary' },
        { type: 'firm', id: firm.id, role: 'target' },
        { type: 'person', id: person.id, role: 'target' },
      ],
      companyId: company.id, // backward compat
      firmId: firm.id,
      personId: person.id,
      cur: pick([0, 0, 0, 50, 100]), // 0=not started, 50=intro made, 100=meeting held
      tgt: 100,
      status: pick(['active', 'active', 'active', 'completed', 'blocked']),
      due: daysFromNow(randomInt(30, 120)),
      unlocks: 'Investor relationship',
      provenance: 'suggested',
      weight: GOAL_TYPE_WEIGHTS.intro_target || 45,
      milestones: probability(0.4) ? [
        { date: daysAgo(randomInt(5, 30)), value: 50, note: 'Intro email sent' },
      ] : [],
      activityLog: probability(0.3) ? [
        { date: daysAgo(randomInt(1, 14)), entityRef: { type: 'person', id: person.id }, action: 'email_sent', outcome: 'positive' },
      ] : [],
      asOf: daysAgo(randomInt(1, 14)),
    });
  }
  
  // 2. relationship_build: firm + person
  // "Build relationship with [Firm] via [Person]"
  for (let i = 0; i < Math.ceil(targetCount * 0.20); i++) {
    const firm = pick(data.firms);
    const firmPartners = data.people.filter(p => p.firmId === firm.id);
    const person = firmPartners.length > 0 ? pick(firmPartners) : pick(data.people);
    
    multiEntityGoals.push({
      id: uniqueId('goal-rel', `${firm.id}-${person.id}`),
      name: `Build relationship with ${firm.name}`,
      type: 'relationship_build',
      entityRefs: [
        { type: 'firm', id: firm.id, role: 'primary' },
        { type: 'person', id: person.id, role: 'target' },
      ],
      firmId: firm.id,
      personId: person.id,
      cur: randomInt(0, 80),
      tgt: 100,
      status: pick(['active', 'active', 'completed', 'blocked']),
      due: daysFromNow(randomInt(60, 180)),
      unlocks: 'Deal flow access',
      provenance: 'manual',
      weight: GOAL_TYPE_WEIGHTS.relationship_build || 40,
      milestones: probability(0.3) ? [
        { date: daysAgo(randomInt(10, 60)), value: 30, note: 'Initial meeting' },
      ] : [],
      asOf: daysAgo(randomInt(1, 14)),
    });
  }
  
  // 3. deal_close: deal + company + firm
  // "Close [Firm] term sheet for [Company]"
  const activeDeals = data.deals.filter(d => 
    d.stage && !['Closed', 'Not Interested', 'Conflict'].includes(d.stage)
  );
  for (let i = 0; i < Math.min(Math.ceil(targetCount * 0.25), activeDeals.length); i++) {
    const deal = activeDeals[i];
    const company = data.companies.find(c => c.id === deal.companyId);
    const firm = data.firms.find(f => f.id === deal.firmId);
    if (!company || !firm) continue;
    
    multiEntityGoals.push({
      id: uniqueId('goal-deal', `${deal.id}`),
      name: `Close ${firm.name} deal for ${company.name}`,
      type: 'deal_close',
      entityRefs: [
        { type: 'deal', id: deal.id, role: 'primary' },
        { type: 'company', id: company.id, role: 'participant' },
        { type: 'firm', id: firm.id, role: 'target' },
      ],
      companyId: company.id,
      firmId: firm.id,
      dealId: deal.id,
      cur: deal.hardCommit || 0,
      tgt: deal.softCommit || 500000,
      status: pick(['active', 'active', 'blocked']),
      due: daysFromNow(randomInt(14, 60)),
      unlocks: 'Round progress',
      provenance: 'suggested',
      weight: GOAL_TYPE_WEIGHTS.deal_close || 80,
      asOf: daysAgo(randomInt(1, 7)),
    });
  }

  // 4. round_completion: round + company
  // "Complete [Stage] round for [Company]"
  const activeRounds = data.rounds.filter(r => r.status === 'Active');
  for (let i = 0; i < Math.min(Math.ceil(targetCount * 0.20), activeRounds.length); i++) {
    const round = activeRounds[i];
    const company = data.companies.find(c => c.id === round.companyId);
    if (!company) continue;
    
    const roundDeals = data.deals.filter(d => d.roundId === round.id);
    const totalCommitted = roundDeals.reduce((sum, d) => sum + (d.hardCommit || 0), 0);
    
    multiEntityGoals.push({
      id: uniqueId('goal-round', `${round.id}`),
      name: `Complete ${round.stage || 'Seed'} round for ${company.name}`,
      type: 'round_completion',
      entityRefs: [
        { type: 'round', id: round.id, role: 'primary' },
        { type: 'company', id: company.id, role: 'participant' },
      ],
      companyId: company.id,
      roundId: round.id,
      cur: totalCommitted,
      tgt: round.targetAmount || 5000000,
      status: pick(['active', 'active', 'blocked']),
      due: round.targetCloseDate || daysFromNow(randomInt(30, 90)),
      unlocks: 'Growth capital',
      provenance: 'suggested',
      weight: GOAL_TYPE_WEIGHTS.round_completion || 85,
      asOf: daysAgo(randomInt(1, 7)),
    });
  }
  
  // 5. investor_activation: firm + company
  // "Re-engage [Firm] for [Company] deal flow"
  for (let i = 0; i < Math.ceil(targetCount * 0.10); i++) {
    const company = pick(portfolioCompanies);
    const firm = pick(data.firms);
    
    multiEntityGoals.push({
      id: uniqueId('goal-activate', `${firm.id}-${company.id}`),
      name: `Re-engage ${firm.name} for ${company.name}`,
      type: 'investor_activation',
      entityRefs: [
        { type: 'firm', id: firm.id, role: 'primary' },
        { type: 'company', id: company.id, role: 'target' },
      ],
      companyId: company.id,
      firmId: firm.id,
      cur: randomInt(0, 50),
      tgt: 100,
      status: pick(['active', 'blocked']),
      due: daysFromNow(randomInt(30, 90)),
      unlocks: 'Deal pipeline',
      provenance: 'manual',
      weight: GOAL_TYPE_WEIGHTS.investor_activation || 35,
      asOf: daysAgo(randomInt(1, 14)),
    });
  }
  
  return multiEntityGoals;
}

/**
 * Generate metricFacts for a company.
 * Portfolio companies get 5-8 facts, market companies get 2-4.
 * Facts have varied asOf dates (1-90 days ago) for time-series depth.
 */
function generateMetricFacts(company) {
  const facts = [];
  const isPortfolio = company.isPortfolio;
  const factCount = isPortfolio ? randomInt(5, 8) : randomInt(2, 4);

  const metricPool = [
    { key: 'cash', unit: 'usd', valueFn: () => company.cash || randomInt(100000, 5000000) },
    { key: 'burn', unit: 'usd_monthly', valueFn: () => company.burn || randomInt(50000, 500000) },
    { key: 'arr', unit: 'usd_annual', valueFn: () => company.arr || randomInt(0, 5000000) },
    { key: 'mrr', unit: 'usd_monthly', valueFn: () => Math.round((company.arr || randomInt(0, 5000000)) / 12) },
    { key: 'employees', unit: 'count', valueFn: () => company.employees || randomInt(2, 50) },
    { key: 'revenue', unit: 'usd_monthly', valueFn: () => randomInt(0, 500000) },
    { key: 'customers', unit: 'count', valueFn: () => randomInt(5, 500) },
    { key: 'churn_rate', unit: 'percentage', valueFn: () => Math.round(randomFloat(1, 15) * 100) / 100 },
  ];

  // Pick a subset of metrics
  const selected = [...metricPool].sort(() => Math.random() - 0.5).slice(0, factCount);

  for (const metric of selected) {
    // Generate 1-3 observations per metric (different asOf dates for time-series)
    const observationCount = isPortfolio ? randomInt(1, 3) : 1;
    for (let i = 0; i < observationCount; i++) {
      const daysBack = i * randomInt(14, 45); // Spread observations over time
      const value = metric.valueFn();
      // Add slight variation for historical values
      const historicalValue = i === 0 ? value : Math.round(value * randomFloat(0.85, 1.15) * 100) / 100;

      facts.push({
        id: `mf-${company.id}-${metric.key}-${i}`,
        companyId: company.id,
        metricKey: metric.key,
        value: Math.round(historicalValue * 100) / 100,
        unit: metric.unit,
        source: pick(['manual', 'spreadsheet', 'founder_update', 'bank_sync']),
        asOf: daysAgo(daysBack),
      });
    }
  }

  return facts;
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
  
  // 5. Generate company people (founders + executives + operators)
  console.log('Generating company people...');
  const companyPeople = [];
  for (const company of data.companies) {
    // 1-2 founders
    const founderCount = randomInt(1, 2);
    for (let i = 0; i < founderCount; i++) {
      companyPeople.push(generatePerson('founder', company, i));
    }
    
    // Executives: stage-dependent
    const execCount = {
      'Pre-seed': 0,
      'Seed': randomInt(0, 2),
      'Series A': randomInt(2, 4),
      'Series B': randomInt(3, 5),
      'Series C': randomInt(4, 6),
    }[company.stage] || (company.isPortfolio ? randomInt(1, 3) : randomInt(0, 1));
    for (let i = 0; i < execCount; i++) {
      companyPeople.push(generatePerson('executive', company, i));
    }
    
    // Operators: key people based on company size (only for portfolio)
    if (company.isPortfolio) {
      const keyPeopleRatio = {
        'Pre-seed': 0.5,
        'Seed': 0.3,
        'Series A': 0.2,
        'Series B': 0.1,
        'Series C': 0.05,
      }[company.stage] || 0.15;
      
      const targetKeyPeople = Math.ceil((company.employees || 10) * keyPeopleRatio);
      const operatorCount = Math.max(0, Math.min(targetKeyPeople - founderCount - execCount, 10));
      
      for (let i = 0; i < operatorCount; i++) {
        companyPeople.push(generatePerson('operator', company, i));
      }
      
      // Advisors: 0-2 for funded companies
      if (company.stage !== 'Pre-seed' && probability(0.4)) {
        const advisorCount = randomInt(1, 2);
        for (let i = 0; i < advisorCount; i++) {
          companyPeople.push(generatePerson('advisor', company, i));
        }
      }
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
  
  // 8. Generate Goals (company-only goals + multi-entity goals)
  console.log(`Generating goals...`);
  
  // 8a. Company-only goals (legacy, ~56)
  const goalsPerCompany = Math.ceil(CONFIG.targetGoals / CONFIG.portfolioCompanies);
  
  for (const company of portfolioCompanies) {
    const companyGoals = generateGoalsForCompany(company, goalsPerCompany);
    data.goals.push(...companyGoals);
  }
  
  // Trim company goals to target
  if (data.goals.length > CONFIG.targetGoals) {
    data.goals = data.goals.slice(0, CONFIG.targetGoals);
  }
  
  // 8b. Multi-entity goals (NEW ~30 goals spanning multiple entities)
  const multiEntityGoalTarget = 30;
  console.log(`Generating ${multiEntityGoalTarget} multi-entity goals...`);
  const multiGoals = generateMultiEntityGoals(data, multiEntityGoalTarget);
  data.goals.push(...multiGoals);
  
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
  
  // 10. Generate metricFacts for all companies
  console.log('Generating metricFacts...');
  const metricFacts = [];
  for (const company of data.companies) {
    metricFacts.push(...generateMetricFacts(company));
  }
  data.metricFacts = metricFacts;
  console.log(`  Generated ${metricFacts.length} metricFacts`);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('GENERATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Companies:     ${data.companies.length} (${portfolioCompanies.length} portfolio, ${data.companies.length - portfolioCompanies.length} market)`);
  console.log(`  People:        ${data.people.length}`);
  console.log(`  Firms:         ${data.firms.length}`);
  console.log(`  Rounds:        ${data.rounds.length}`);
  console.log(`  Deals:         ${data.deals.length}`);
  console.log(`  Goals:         ${data.goals.length}`);
  console.log(`  Relationships: ${data.relationships.length}`);
  
  // Count goal types
  const anomalyGoals = data.goals.filter(g => g.provenance === 'anomaly');
  const templateGoals = data.goals.filter(g => g.provenance === 'template');
  const suggestedGoals = data.goals.filter(g => g.provenance === 'suggested');
  const manualGoals = data.goals.filter(g => g.provenance === 'manual');
  const multiEntityGoals = data.goals.filter(g => g.entityRefs && g.entityRefs.length > 1);
  
  console.log(`\n  Goal provenance:`);
  console.log(`    Anomaly-driven: ${anomalyGoals.length}`);
  console.log(`    Stage templates: ${templateGoals.length}`);
  console.log(`    Suggested: ${suggestedGoals.length}`);
  console.log(`    Manual: ${manualGoals.length}`);
  
  console.log(`\n  Goal entity scope:`);
  console.log(`    Company-only: ${data.goals.filter(g => !g.entityRefs || g.entityRefs.length <= 1).length}`);
  console.log(`    Multi-entity: ${multiEntityGoals.length}`);
  
  // Multi-entity breakdown
  const goalTypeCount = {};
  data.goals.forEach(g => {
    goalTypeCount[g.type] = (goalTypeCount[g.type] || 0) + 1;
  });
  console.log(`\n  Goal types:`);
  Object.entries(goalTypeCount).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`    ${type}: ${count}`);
  });
  
  return data;
}

// =============================================================================
// OUTPUT
// =============================================================================

const args = process.argv.slice(2);
const outputPath = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'packages/core/raw/chunks/';

const data = generate();

// Determine output mode: directory (chunks) or single file
if (outputPath.endsWith('/') || outputPath.endsWith('chunks')) {
  // Write individual chunk files + manifest
  const chunksDir = outputPath.endsWith('/') ? outputPath : outputPath + '/';
  if (!existsSync(chunksDir)) mkdirSync(chunksDir, { recursive: true });

  const chunkKeys = ['companies', 'people', 'firms', 'rounds', 'deals', 'goals', 'relationships', 'metricFacts'];
  const manifest = {
    source: 'generate-qa-data.js',
    baseName: 'sample',
    generatedAt: new Date().toISOString(),
    chunks: [],
    meta: data.meta || { generatedAt: new Date().toISOString(), version: '9.0' },
  };

  for (const key of chunkKeys) {
    const arr = data[key] || [];
    if (arr.length === 0) continue;
    const fileName = `sample_${key}_0.json`;
    writeFileSync(join(chunksDir, fileName), JSON.stringify(arr));
    manifest.chunks.push({ key, index: 0, file: fileName, count: arr.length });
  }

  writeFileSync(join(chunksDir, 'sample_manifest.json'), JSON.stringify(manifest, null, 2));

  const totalSize = manifest.chunks.reduce((sum, c) => sum + c.count, 0);
  console.log(`\nChunks written to ${chunksDir}`);
  console.log(`  ${manifest.chunks.length} chunk files, ${totalSize} total records`);
} else {
  // Single file mode (legacy)
  const json = JSON.stringify(data);
  writeFileSync(outputPath, json);
  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`\nOutput: ${outputPath} (${sizeKB} KB)`);
}
