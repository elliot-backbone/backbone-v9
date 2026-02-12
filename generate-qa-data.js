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
  getStageGoals,
  getStageIndex
} from './packages/core/raw/stageParams.js';
import { detectAnomalies, ANOMALY_SEVERITY } from './packages/core/derive/anomalyDetection.js';
import { suggestGoals, suggestionToGoal } from './packages/core/predict/suggestedGoals.js';
import { GOAL_TYPES, normalizeGoal } from './packages/core/raw/goalSchema.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const GOAL_TYPE_WEIGHTS = {
  fundraise: 90, revenue: 85, operational: 70,
  retention: 65, efficiency: 65,
  hiring: 60, customer_growth: 60, product: 55, partnership: 50,
  intro_target: 45, relationship_build: 40, deal_close: 80,
  round_completion: 85, investor_activation: 35, champion_cultivation: 30,
};

const SECTOR_GOAL_VARIANTS = {
  'AI/ML': {
    product: ['Ship Model V2', 'Launch Inference API', 'Training Pipeline Overhaul'],
    revenue: ['First Enterprise Contract', 'API Revenue Target', 'ML Platform ARR'],
    hiring: ['ML Engineering Team', 'Research Team Build', 'AI Safety Hire'],
    operational: ['Model Accuracy Target', 'Inference Latency SLA', 'Data Pipeline Scale'],
    fundraise: null,
    partnership: ['GPU Cloud Partnership', 'Data Provider Deal', 'Academic Collaboration'],
    retention: ['Reduce API Churn', 'Improve Model Stickiness', 'Usage Expansion Program'],
    efficiency: ['Optimize Compute Costs', 'Improve Inference Margin', 'Reduce Training CAC'],
    customer_growth: ['Enterprise Pilot Pipeline', 'Developer Adoption Growth', 'Self-Serve Expansion'],
  },
  'Security': {
    product: ['SOC2 Certification', 'Threat Detection V2', 'Zero Trust Module'],
    revenue: ['Security ARR Target', 'Enterprise Security Revenue', 'MSSP Channel Revenue'],
    hiring: ['Security Engineering Team', 'Threat Research Hire', 'Sales Engineer Build'],
    operational: ['False Positive Rate Target', 'Detection Coverage SLA', 'Compliance Audit'],
    fundraise: null,
    partnership: ['SIEM Integration', 'Cloud Provider Partnership', 'Channel Partner Program'],
    retention: ['Reduce Security Platform Churn', 'Expand Threat Module Adoption', 'Improve Renewal Rate'],
    efficiency: ['Optimize Alert Processing Cost', 'Improve Detection Per Dollar', 'Reduce False Positive Rate'],
    customer_growth: ['Enterprise Security Pipeline', 'SMB Self-Serve Growth', 'MSSP Channel Expansion'],
  },
  'Fintech': {
    product: ['Payment Flow Launch', 'KYC Module Ship', 'Lending Product Beta'],
    revenue: ['Transaction Volume Target', 'Net Revenue Target', 'Payment Processing ARR'],
    hiring: ['Compliance Team Build', 'Risk Engineering Hire', 'Banking Partnerships Lead'],
    operational: ['Transaction Success Rate', 'Fraud Rate Target', 'Regulatory Approval'],
    fundraise: null,
    partnership: ['Banking Partner Integration', 'Processor Partnership', 'Sponsor Bank Deal'],
    retention: ['Reduce Payment Platform Churn', 'Improve Merchant Retention', 'Expand Usage Per Account'],
    efficiency: ['Optimize Transaction Costs', 'Improve Net Take Rate', 'Reduce Compliance Overhead'],
    customer_growth: ['Merchant Acquisition Pipeline', 'SMB Banking Growth', 'Enterprise Fintech Expansion'],
  },
  'Healthcare': {
    product: ['Clinical Workflow Launch', 'EHR Integration Ship', 'Patient Portal V2'],
    revenue: ['Health System ARR', 'Per-Patient Revenue Target', 'Payer Contract Revenue'],
    hiring: ['Clinical Ops Team', 'Health Informatics Hire', 'Regulatory Affairs Lead'],
    operational: ['Patient Outcome Metric', 'HIPAA Compliance Audit', 'Clinical Validation Study'],
    fundraise: null,
    partnership: ['Health System Pilot', 'EHR Vendor Integration', 'Payer Partnership'],
    retention: ['Reduce Health System Churn', 'Improve Clinical Adoption', 'Expand Module Usage'],
    efficiency: ['Optimize Clinical Ops Cost', 'Improve Revenue Per Patient', 'Reduce Implementation Time'],
    customer_growth: ['Health System Pipeline', 'Clinic Network Expansion', 'Payer Channel Growth'],
  },
  'E-commerce': {
    product: ['Checkout Flow Optimization', 'Marketplace Launch', 'Mobile App V2'],
    revenue: ['GMV Target', 'Take Rate Optimization', 'Subscription Revenue'],
    hiring: ['Growth Marketing Team', 'Fulfillment Ops Build', 'Marketplace Ops Hire'],
    operational: ['Conversion Rate Target', 'Fulfillment SLA', 'Return Rate Reduction'],
    fundraise: null,
    partnership: ['Logistics Partner Deal', 'Payment Provider Integration', 'Brand Partnership'],
    retention: ['Reduce Buyer Churn', 'Improve Repeat Purchase Rate', 'Loyalty Program Expansion'],
    efficiency: ['Optimize Fulfillment Cost', 'Improve Unit Economics', 'Reduce Return Rate Cost'],
    customer_growth: ['New Buyer Acquisition', 'Marketplace Seller Growth', 'Geographic Expansion'],
  },
  'Infrastructure': {
    product: ['Platform GA Release', 'Multi-Region Deploy', 'CLI Tool Launch'],
    revenue: ['Usage-Based Revenue Target', 'Enterprise Tier ARR', 'Platform Revenue'],
    hiring: ['Platform Engineering Team', 'SRE Team Build', 'Developer Advocate Hire'],
    operational: ['Uptime SLA Target', 'P99 Latency Goal', 'Deployment Frequency'],
    fundraise: null,
    partnership: ['Cloud Marketplace Listing', 'ISV Integration Program', 'Open Source Community'],
    retention: ['Reduce Platform Churn', 'Improve Enterprise Renewal', 'Expand Usage Per Account'],
    efficiency: ['Optimize Infrastructure Cost', 'Improve Revenue Per Cluster', 'Reduce Support Burden'],
    customer_growth: ['Enterprise Infrastructure Pipeline', 'Self-Serve Developer Growth', 'Multi-Cloud Expansion'],
  },
  'Developer Tools': {
    product: ['IDE Plugin Ship', 'SDK V2 Launch', 'Developer Dashboard'],
    revenue: ['Developer Seat Revenue', 'Enterprise License ARR', 'Usage Revenue Target'],
    hiring: ['DevRel Team Build', 'Core Engineering Hire', 'Solutions Engineer'],
    operational: ['Developer NPS Target', 'Time-to-Value Metric', 'Documentation Coverage'],
    fundraise: null,
    partnership: ['IDE Vendor Integration', 'CI/CD Platform Partner', 'Framework Partnership'],
    retention: ['Reduce Developer Churn', 'Improve Paid Conversion', 'Expand Team Seat Adoption'],
    efficiency: ['Optimize Hosting Cost Per User', 'Improve Support Efficiency', 'Reduce Onboarding Cost'],
    customer_growth: ['Developer Community Growth', 'Enterprise DevTool Pipeline', 'Open Source to Paid Funnel'],
  },
  'Climate': {
    product: ['Carbon Measurement Platform', 'Emissions Tracking V2', 'Supply Chain Module'],
    revenue: ['Climate SaaS ARR', 'Carbon Credit Revenue', 'Enterprise Climate Revenue'],
    hiring: ['Sustainability Science Team', 'Climate Data Hire', 'Policy Affairs Lead'],
    operational: ['Measurement Accuracy Target', 'Reporting Automation Rate', 'Customer CO2 Reduction'],
    fundraise: null,
    partnership: ['Regulatory Body Partnership', 'Supply Chain Partner', 'Carbon Registry Integration'],
    retention: ['Reduce Enterprise Climate Churn', 'Improve Reporting Adoption', 'Expand Module Coverage'],
    efficiency: ['Optimize Data Collection Cost', 'Improve Revenue Per Report', 'Reduce Certification Overhead'],
    customer_growth: ['Enterprise Climate Pipeline', 'SMB Sustainability Growth', 'Regulated Industry Expansion'],
  },
  'Payments': {
    product: ['Cross-Border Flow Launch', 'Instant Settlement Ship', 'Merchant Portal V2'],
    revenue: ['Payment Volume Target', 'Interchange Revenue', 'Enterprise Payments ARR'],
    hiring: ['Payments Engineering Team', 'Risk Ops Build', 'Integration Engineer Hire'],
    operational: ['Settlement Speed SLA', 'Authorization Rate Target', 'Chargeback Rate Goal'],
    fundraise: null,
    partnership: ['Card Network Partnership', 'Banking Rails Deal', 'POS Integration'],
  },
  'Enterprise Software': {
    product: ['Workflow Engine V2', 'Admin Console Launch', 'API Gateway Ship'],
    revenue: ['Enterprise ARR Target', 'Expansion Revenue Goal', 'Net New Logo Revenue'],
    hiring: ['Enterprise Sales Team', 'Solutions Architecture Build', 'CSM Team Hire'],
    operational: ['Implementation Time Target', 'Customer Health Score', 'Feature Adoption Rate'],
    fundraise: null,
    partnership: ['SI Partner Program', 'Technology Alliance', 'Marketplace Integration'],
  },
  'Consumer': {
    product: ['Mobile App V2', 'Social Feature Launch', 'Content Feed Redesign'],
    revenue: ['Consumer Subscription ARR', 'Ad Revenue Target', 'In-App Purchase Revenue'],
    hiring: ['Growth Team Build', 'Content Ops Hire', 'Community Manager'],
    operational: ['DAU Target', 'Retention Rate Goal', 'Session Duration Metric'],
    fundraise: null,
    partnership: ['Creator Partnership Program', 'Brand Deal Pipeline', 'Distribution Partner'],
  },
  'Logistics': {
    product: ['Route Optimization V2', 'Warehouse Platform Launch', 'Last Mile Tracking'],
    revenue: ['Logistics SaaS ARR', 'Per-Shipment Revenue', 'Platform Fee Revenue'],
    hiring: ['Operations Engineering Team', 'Logistics Ops Build', 'Fleet Manager Hire'],
    operational: ['On-Time Delivery SLA', 'Cost Per Delivery Target', 'Warehouse Utilization'],
    fundraise: null,
    partnership: ['Carrier Partnership', '3PL Integration', 'Fleet Management Deal'],
  },
};

function resolveGoalName(template, company) {
  const sectorVariants = SECTOR_GOAL_VARIANTS[company.sector];
  if (sectorVariants) {
    const variants = sectorVariants[template.type];
    if (variants && variants.length > 0) {
      return pick(variants);
    }
  }
  return template.name; // fallback to stage template
}

const CONFIG = {
  portfolioCompanies: 20,
  marketCompanies: 100,
  targetPeople: 614,
  targetFirms: 360,
  targetRounds: 201,
  targetDeals: 536,
  targetGoals: 300,  // 20 companies × 15 goals each = plenty of budget
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

function splitAmount(total, n) {
  if (n === 0) return [];
  if (n === 1) return [total];
  const amounts = [];
  let remaining = total;
  for (let i = 0; i < n - 1; i++) {
    const share = Math.floor(remaining * randomFloat(0.2, 0.6));
    amounts.push(share);
    remaining -= share;
  }
  amounts.push(remaining);
  return amounts;
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
    const foundedDate = new Date(companyOrFirm.founded);
    const foundedYear = foundedDate.getFullYear();
    const now = new Date();
    const companyAgeMonths = (now - foundedDate) / (30.44 * 24 * 60 * 60 * 1000);
    
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

  // Operational metrics (stage-appropriate bounds from stageParams)
  const isPreSeed = stage === 'Pre-seed';

  const cac = randomInt(params.cacMin || 50, params.cacMax || 500);
  const nrr = isPreSeed ? null : Math.round(randomFloat(params.nrrMin || 80, params.nrrMax || 130) * 100) / 100;
  const grr = isPreSeed ? null : Math.round(randomFloat(params.grrMin || 70, params.grrMax || 100) * 100) / 100;
  const logo_retention = isPreSeed ? null : Math.round(randomFloat(params.logoRetentionMin || 60, params.logoRetentionMax || 95) * 100) / 100;
  const target_headcount = randomInt(params.targetHeadcountMin || 5, params.targetHeadcountMax || 10);
  const open_positions = randomInt(params.openPositionsMin || 0, params.openPositionsMax || 3);
  const paying_customers_val = revenue === 0 ? 0 : randomInt(params.payingCustomersMin || 0, params.payingCustomersMax || 10);
  const acv = (revenue > 0 && paying_customers_val > 0)
    ? Math.round(revenue / paying_customers_val)
    : randomInt(params.acvMin || 0, params.acvMax || 5000);
  const gross_margin = Math.round(randomFloat(params.grossMarginMin ?? -50, params.grossMarginMax ?? 70) * 100) / 100;
  const nps = isPreSeed ? null : randomInt(params.npsMin ?? -20, params.npsMax ?? 60);

  // Fundraise history (use new stageParams bounds)
  const raised_to_date = Math.floor(randomFloat(
    params.raisedToDateMin || params.raiseMin * 0.5,
    params.raisedToDateMax || params.raiseMax * 1.5
  ));
  const last_raise_amount = Math.floor(randomFloat(
    params.lastRaiseAmountMin || params.raiseMin,
    params.lastRaiseAmountMax || params.raiseMax
  ));

  // Anomaly injection for new metrics (35% of anomaly companies get one metric out of bounds)
  let anomCac = cac, anomNrr = nrr, anomGrossMargin = gross_margin, anomLogoRetention = logo_retention;
  if (hasAnomaly && probability(0.5)) {
    const anomMetric = pick(['cac', 'nrr', 'gross_margin', 'logo_retention']);
    switch (anomMetric) {
      case 'cac':
        anomCac = Math.floor((params.cacMax || 500) * randomFloat(2, 3));
        break;
      case 'nrr':
        if (!isPreSeed) anomNrr = Math.round(randomFloat(50, (params.nrrMin || 80) - 10) * 100) / 100;
        break;
      case 'gross_margin':
        anomGrossMargin = Math.round(randomFloat(-20, Math.min(20, (params.grossMarginMin ?? -50) - 5)) * 100) / 100;
        break;
      case 'logo_retention':
        if (!isPreSeed) anomLogoRetention = Math.round(randomFloat(30, (params.logoRetentionMin || 60) - 10) * 100) / 100;
        break;
    }
  }

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

    // Operational metrics
    cac: anomCac,
    nrr: anomNrr,
    grr,
    logo_retention: anomLogoRetention,
    target_headcount,
    open_positions,
    paying_customers: paying_customers_val,
    acv,
    gross_margin: anomGrossMargin,
    nps,
    raised_to_date,
    last_raise_amount,

    // Fundraising
    raising,
    roundTarget: raising ? Math.floor(randomFloat(params.raiseMin, params.raiseMax)) : null,

    // Metadata — founded as ISO date string for anomaly detection
    founded: (() => {
      const minYears = params.foundedYearsMin ?? 0;
      const maxYears = params.foundedYearsMax ?? 8;
      const yearsAgo = randomFloat(minYears, maxYears);
      const d = new Date(Date.now() - yearsAgo * 365.25 * 24 * 60 * 60 * 1000);
      return d.toISOString().split('T')[0];
    })(),
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

function generateRound(company, firms, roundStage, status) {
  const params = getStageParams(roundStage);
  const amount = Math.floor(randomFloat(params.raiseMin, params.raiseMax));
  const leadFirm = pick(firms);

  const closeDate = status === 'closed'
    ? new Date(Date.now() - randomInt(90, 720) * 24 * 60 * 60 * 1000)
    : null;

  return {
    id: uniqueId('r', `${company.id}r${roundStage.replace(/\s+/g, '')}`),
    companyId: company.id,
    stage: roundStage,
    amt: amount,
    leadId: leadFirm.id,
    leadName: leadFirm.name,
    status,
    closeDate: closeDate ? closeDate.toISOString().split('T')[0] : null,
    asOf: daysAgo(randomInt(1, 30)),
  };
}

function generateDeal(company, firm, round, dealIndex, overrides = {}) {
  const status = overrides.status || 'active';

  let stage;
  if (status === 'won') {
    stage = 'Closed';
  } else if (status === 'lost' || status === 'passed') {
    stage = pick(['Sourcing', 'First Meeting', 'Deep Dive', 'Partner Meeting']);
  } else {
    stage = pick(['Sourcing', 'First Meeting', 'Deep Dive', 'Partner Meeting', 'Term Sheet', 'Due Diligence']);
  }

  const roundStage = round?.stage || company.stage;
  const params = getStageParams(roundStage);
  const amount = overrides.amt || Math.floor(randomFloat(params.raiseMin * 0.1, params.raiseMax * 0.5));

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
 * Generate synthetic history for a goal so calculateVelocity() has 2+ data points.
 * Healthy goals get steady growth; at_risk goals get a plateau/dip.
 */
function generateGoalHistory(goal) {
  const observations = randomInt(3, 6);
  const history = [];
  const cur = goal.cur || 0;

  for (let i = 0; i < observations; i++) {
    const t = observations === 1 ? 1 : i / (observations - 1); // 0 → 1
    const daysBack = Math.floor((1 - t) * 90); // 90 days ago → 0

    let value;
    if (goal.status === 'at_risk') {
      // Plateau pattern: fast start, then stall
      value = cur * Math.min(1, t * 1.5) * randomFloat(0.85, 1.0);
      if (t > 0.5) value = cur * randomFloat(0.7, 0.9); // stall
    } else {
      // Steady growth
      value = cur * t * randomFloat(0.9, 1.1);
    }

    // Last observation = current value
    if (i === observations - 1) value = cur;

    history.push({
      value: Math.round(Math.max(0, value) * 100) / 100,
      asOf: daysAgo(daysBack),
    });
  }

  return history;
}

/**
 * Generate goals for a portfolio company using:
 * 1. Stage-specific STAGE_GOALS templates as primary source
 * 2. Fill remaining slots (up to 5) with most relevant missing types
 */
function generateGoalsForCompany(company, targetPerCompany) {
  const goals = [];
  const templates = getStageGoals(company.stage);
  const params = getStageParams(company.stage);
  const templateTypes = new Set(templates.map(t => t.type));

  // Helper: generate current/target values by goal type
  function targetsForType(goalType) {
    switch (goalType) {
      case 'fundraise': {
        const target = company.roundTarget || params.raiseMin || 2000000;
        return { target, current: Math.floor(target * randomFloat(0.1, 0.5)) };
      }
      case 'revenue': {
        const target = randomInt(1000, 10000) * 1000;
        return { target, current: Math.floor(target * randomFloat(0.3, 0.7)) };
      }
      case 'operational':
        return { target: 100, current: randomInt(40, 75) };
      case 'hiring': {
        const target = randomInt(8, 25);
        return { target, current: Math.max(1, target - randomInt(2, 6)) };
      }
      case 'product':
        return { target: 100, current: randomInt(50, 85) };
      case 'partnership':
        return { target: 100, current: randomInt(20, 60) };
      case 'retention': {
        const tgt = params.nrrMin || 100;
        return { target: tgt, current: Math.round(tgt * randomFloat(0.8, 0.98)) };
      }
      case 'efficiency': {
        const tgt = params.grossMarginMin || 50;
        return { target: tgt, current: Math.round(tgt * randomFloat(0.7, 0.95)) };
      }
      case 'customer_growth': {
        const tgt = randomInt(50, 500);
        return { target: tgt, current: Math.floor(tgt * randomFloat(0.3, 0.7)) };
      }
      default:
        return { target: 100, current: randomInt(30, 70) };
    }
  }

  // Helper: push a goal onto the list
  function pushGoal(name, goalType, current, target) {
    const gapPct = target > 0 ? (target - current) / target : 0;
    const goal = {
      id: `${company.id}-g${goals.length}`,
      companyId: company.id,
      entityRefs: [{ type: 'company', id: company.id, role: 'primary' }],
      name,
      type: goalType,
      cur: current,
      tgt: target,
      status: gapPct > 0.3 ? 'at_risk' : 'active',
      due: daysFromNow(randomInt(30, 180)),
      provenance: 'template',
      weight: GOAL_TYPE_WEIGHTS[goalType] || 50,
      asOf: daysAgo(randomInt(1, 7)),
    };
    goal.history = generateGoalHistory(goal);
    goals.push(goal);
  }

  // Phase 1: Stage-specific templates (sector-aware naming)
  for (const template of templates) {
    if (goals.length >= 15) break;
    const { target, current } = targetsForType(template.type);
    const name = resolveGoalName(template, company);
    pushGoal(name, template.type, current, target);
  }

  // Phase 2: Fill remaining slots with all goal types for full coverage
  // Never duplicate a type already in the template list
  const FILL_PRIORITY = ['retention', 'efficiency', 'customer_growth', 'revenue', 'fundraise', 'hiring', 'product', 'operational', 'partnership', 'intro_target', 'deal_close', 'round_completion', 'investor_activation', 'champion_cultivation', 'relationship_build'];
  const FILL_NAMES = {
    fundraise: `${company.stage} Round`,
    revenue: company.arr > 0 ? 'Revenue Growth' : 'First Revenue',
    operational: 'Operational Efficiency',
    hiring: 'Team Growth',
    product: 'Product Development',
    partnership: 'Strategic Partners',
    retention: 'Improve Customer Retention',
    efficiency: 'Optimize Unit Economics',
    customer_growth: 'Grow Customer Base',
    intro_target: 'Key Introductions',
    deal_close: 'Close Active Deals',
    round_completion: 'Complete Current Round',
    investor_activation: 'Activate Investor Network',
    champion_cultivation: 'Build Internal Champions',
    relationship_build: 'Strengthen Key Relationships',
  };

  for (const fillType of FILL_PRIORITY) {
    if (goals.length >= 15) break;
    if (templateTypes.has(fillType)) continue;
    const { target, current } = targetsForType(fillType);
    const sectorVariants = SECTOR_GOAL_VARIANTS[company.sector];
    const name = (sectorVariants?.[fillType] && pick(sectorVariants[fillType]))
                 || FILL_NAMES[fillType]
                 || `${fillType} goal`;
    pushGoal(name, fillType, current, target);
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
  const factCount = isPortfolio ? randomInt(8, 14) : randomInt(2, 4);

  const metricPool = [
    { key: 'cash', unit: 'usd', valueFn: () => company.cash || randomInt(100000, 5000000) },
    { key: 'burn', unit: 'usd_monthly', valueFn: () => company.burn || randomInt(50000, 500000) },
    { key: 'arr', unit: 'usd_annual', valueFn: () => company.arr || randomInt(0, 5000000) },
    { key: 'mrr', unit: 'usd_monthly', valueFn: () => Math.round((company.arr || randomInt(0, 5000000)) / 12) },
    { key: 'employees', unit: 'count', valueFn: () => company.employees || randomInt(2, 50) },
    { key: 'revenue', unit: 'usd_monthly', valueFn: () => randomInt(0, 500000) },
    { key: 'customers', unit: 'count', valueFn: () => randomInt(5, 500) },
    { key: 'churn_rate', unit: 'percentage', valueFn: () => Math.round(randomFloat(1, 15) * 100) / 100 },
    { key: 'cac', unit: 'usd', valueFn: () => company.cac || randomInt(200, 5000) },
    { key: 'nrr', unit: 'percentage', valueFn: () => company.nrr || Math.round(randomFloat(85, 140) * 100) / 100 },
    { key: 'grr', unit: 'percentage', valueFn: () => company.grr || Math.round(randomFloat(75, 100) * 100) / 100 },
    { key: 'logo_retention', unit: 'percentage', valueFn: () => company.logo_retention || Math.round(randomFloat(70, 98) * 100) / 100 },
    { key: 'open_positions', unit: 'count', valueFn: () => company.open_positions || randomInt(1, 15) },
    { key: 'paying_customers', unit: 'count', valueFn: () => company.paying_customers || randomInt(5, 500) },
    // acv is derived (arr/paying_customers) — not stored in metricFacts per QA gate 11
    { key: 'gross_margin', unit: 'percentage', valueFn: () => company.gross_margin || Math.round(randomFloat(30, 85) * 100) / 100 },
    { key: 'nps', unit: 'score', valueFn: () => company.nps || randomInt(-10, 70) },
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
  
  // 6. Generate Rounds — progressive per company
  //    A Series B company gets: closed Pre-seed, closed Seed, closed Series A, active/closed Series B
  //    Max 1 active round per company. Only the current-stage round can be active (if raising).
  console.log('Generating progressive rounds per company...');

  for (const company of data.companies) {
    const companyStageIdx = getStageIndex(company.stage);
    if (companyStageIdx < 0) continue;

    for (let stageIdx = 0; stageIdx <= companyStageIdx && stageIdx < STAGES.length; stageIdx++) {
      const roundStage = STAGES[stageIdx];
      let status;
      if (stageIdx < companyStageIdx) {
        status = 'closed';
      } else {
        // Current stage round: active if raising, closed if not
        status = company.raising ? 'active' : 'closed';
      }
      data.rounds.push(generateRound(company, data.firms, roundStage, status));
    }
  }
  
  // 7. Generate Deals — coherent with round status
  //    Closed rounds: 1-3 won + 1-4 lost/passed, won amounts ≈ round amt (±15%)
  //    Active rounds: 0-2 won + 1-3 active + 0-2 passed, won amounts < round amt
  //    Every round gets at least 2 deals.
  console.log('Generating round-coherent deals...');
  let dealCount = 0;

  for (const round of data.rounds) {
    const company = data.companies.find(c => c.id === round.companyId);
    if (!company) continue;

    if (round.status === 'closed') {
      const wonCount = randomInt(1, 3);
      const lostCount = randomInt(1, 4);
      const wonAmounts = splitAmount(round.amt, wonCount);

      for (let i = 0; i < wonCount; i++) {
        const firm = pick(data.firms);
        data.deals.push(generateDeal(company, firm, round, dealCount++, { status: 'won', amt: wonAmounts[i] }));
      }
      for (let i = 0; i < lostCount; i++) {
        const firm = pick(data.firms);
        const lostStatus = pick(['lost', 'passed']);
        const lostAmt = Math.floor(randomFloat(round.amt * 0.05, round.amt * 0.3));
        data.deals.push(generateDeal(company, firm, round, dealCount++, { status: lostStatus, amt: lostAmt }));
      }
    } else {
      // Active round
      const wonCount = randomInt(0, 2);
      const activeCount = randomInt(1, 3);
      const passedCount = randomInt(0, 2);

      const committedSoFar = wonCount > 0 ? Math.floor(round.amt * randomFloat(0.1, 0.5)) : 0;
      const wonAmounts = wonCount > 0 ? splitAmount(committedSoFar, wonCount) : [];

      for (let i = 0; i < wonCount; i++) {
        const firm = pick(data.firms);
        data.deals.push(generateDeal(company, firm, round, dealCount++, { status: 'won', amt: wonAmounts[i] }));
      }
      for (let i = 0; i < activeCount; i++) {
        const firm = pick(data.firms);
        const activeAmt = Math.floor(randomFloat(round.amt * 0.05, round.amt * 0.3));
        data.deals.push(generateDeal(company, firm, round, dealCount++, { status: 'active', amt: activeAmt }));
      }
      for (let i = 0; i < passedCount; i++) {
        const firm = pick(data.firms);
        const passedAmt = Math.floor(randomFloat(round.amt * 0.05, round.amt * 0.2));
        data.deals.push(generateDeal(company, firm, round, dealCount++, { status: 'passed', amt: passedAmt }));
      }
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
  
  // No truncation — every company gets full goal coverage
  // (previously sliced to targetGoals which starved later companies)
  
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

  // 11. Generate constraints for portfolio companies
  console.log('Generating constraints...');
  data.constraints = [];
  const CONSTRAINT_TYPES = [
    'board_meeting', 'lp_review', 'annual_meeting',
    'fundraise_close', 'term_sheet_deadline', 'bridge_expiry',
    'quarterly_report', 'investor_update',
    'demo_day', 'conference', 'regulatory_filing',
    'founder_unavailable', 'key_hire_start',
    'contract_renewal', 'partnership_deadline',
  ];
  const CONSTRAINT_TITLES = {
    board_meeting: ['Q1 Board Meeting', 'Q2 Board Meeting', 'Q3 Board Meeting', 'Q4 Board Meeting', 'Board Review'],
    lp_review: ['LP Advisory Committee', 'LP Annual Review', 'LP Quarterly Update'],
    annual_meeting: ['Annual Shareholder Meeting', 'Annual Review'],
    fundraise_close: ['Series Close Deadline', 'Round Close Target', 'Fundraise Window Close'],
    term_sheet_deadline: ['Term Sheet Expiry', 'Term Sheet Decision Date'],
    bridge_expiry: ['Bridge Note Maturity', 'Bridge Conversion Deadline'],
    quarterly_report: ['Q1 Report Due', 'Q2 Report Due', 'Q3 Report Due', 'Q4 Report Due'],
    investor_update: ['Monthly Investor Update', 'Investor Newsletter Due'],
    demo_day: ['YC Demo Day', 'Accelerator Demo Day', 'Investor Demo Day'],
    conference: ['Industry Conference', 'SaaStr Annual', 'Web Summit', 'TechCrunch Disrupt'],
    regulatory_filing: ['Annual Filing Deadline', 'Compliance Report Due'],
    founder_unavailable: ['CEO Parental Leave', 'Founder Sabbatical', 'CEO Conference Travel'],
    key_hire_start: ['VP Eng Start Date', 'CRO Start Date', 'CFO Start Date'],
    contract_renewal: ['Enterprise Contract Renewal', 'Key Customer Renewal', 'Platform Contract Renewal'],
    partnership_deadline: ['Partnership Agreement Deadline', 'Integration Launch Date'],
  };

  for (const company of portfolioCompanies) {
    // Each portfolio company gets 2-5 constraints
    const constraintCount = randomInt(2, 5);
    const usedTypes = new Set();
    
    for (let i = 0; i < constraintCount; i++) {
      let type;
      // Raising companies always get a fundraise constraint
      if (i === 0 && company.raising) {
        type = pick(['fundraise_close', 'term_sheet_deadline']);
      } else {
        // Pick a type we haven't used yet
        do {
          type = pick(CONSTRAINT_TYPES);
        } while (usedTypes.has(type) && usedTypes.size < CONSTRAINT_TYPES.length);
      }
      usedTypes.add(type);

      // Generate date: 60% within next 30 days (high pressure), 30% 30-60 days, 10% past (residual)
      let daysFromNow;
      const roll = Math.random();
      if (roll < 0.1) {
        daysFromNow = -randomInt(0, 3); // Just passed (residual pressure)
      } else if (roll < 0.7) {
        daysFromNow = randomInt(1, 30); // Imminent
      } else {
        daysFromNow = randomInt(31, 60); // Approaching
      }

      const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
      const titles = CONSTRAINT_TITLES[type] || ['Upcoming Deadline'];
      
      data.constraints.push({
        id: `cst-${company.id}-${i}`,
        companyId: company.id,
        type,
        title: pick(titles),
        date: date.toISOString().split('T')[0],
        notes: null,
      });
    }
  }
  console.log(`  Generated ${data.constraints.length} constraints (${portfolioCompanies.length} companies)`);

  // 11b. Constraint-aligned goal injection
  // If a company has a constraint implying a goal type that doesn't exist, inject one.
  // This ensures the action pipeline can generate actions that address upcoming deadlines.
  console.log('Injecting constraint-aligned goals...');
  const CONSTRAINT_IMPLIED_GOALS = {
    fundraise_close: ['fundraise', 'revenue'],
    term_sheet_deadline: ['fundraise'],
    bridge_expiry: ['fundraise', 'revenue'],
    board_meeting: ['revenue', 'operational', 'retention', 'efficiency'],
    quarterly_report: ['revenue', 'efficiency', 'retention'],
    investor_update: ['revenue', 'efficiency'],
    demo_day: ['product', 'customer_growth'],
    conference: ['customer_growth', 'partnership'],
    contract_renewal: ['retention', 'customer_growth'],
    partnership_deadline: ['partnership', 'revenue'],
    lp_review: ['fundraise', 'revenue'],
    annual_meeting: ['revenue', 'operational'],
    founder_unavailable: ['operational', 'hiring'],
    key_hire_start: ['hiring', 'operational'],
    regulatory_filing: ['operational'],
  };
  const CONSTRAINT_GOAL_NAMES = {
    fundraise: (con) => con.title.includes('Bridge') ? 'Close Bridge Conversion' : `Complete ${con.title.replace(/Deadline|Target|Window|Close/g, '').trim() || 'Fundraise'}`,
    revenue: (con) => con.type === 'board_meeting' ? 'Revenue Growth for Board' : con.type === 'quarterly_report' ? 'Hit Revenue Target for QR' : 'Revenue Growth',
    retention: (con) => con.type === 'board_meeting' ? 'Retention Metrics for Board' : 'Improve Retention',
    efficiency: (con) => con.type === 'board_meeting' ? 'Unit Economics for Board' : 'Optimize Efficiency',
    operational: (con) => con.type === 'regulatory_filing' ? 'Complete Compliance Filing' : con.type === 'founder_unavailable' ? 'Ops Continuity During Absence' : 'Operational Readiness',
    hiring: (con) => con.type === 'key_hire_start' ? `Onboarding: ${con.title}` : 'Hiring Pipeline',
    product: (con) => con.type === 'demo_day' ? `Product Ready for ${con.title}` : 'Product Development',
    customer_growth: (con) => con.type === 'demo_day' ? 'Customer Traction for Demo' : 'Grow Customer Base',
    partnership: (con) => `${con.title.replace(/Deadline|Date/g, '').trim() || 'Partnership'} Progress`,
  };
  let constraintGoalsInjected = 0;
  for (const company of portfolioCompanies) {
    const existingGoalTypes = new Set(data.goals.filter(g => g.companyId === company.id).map(g => g.type));
    const companyConstraints = data.constraints.filter(c => c.companyId === company.id);
    
    for (const con of companyConstraints) {
      const impliedTypes = CONSTRAINT_IMPLIED_GOALS[con.type] || [];
      for (const goalType of impliedTypes) {
        if (existingGoalTypes.has(goalType)) continue;
        existingGoalTypes.add(goalType); // prevent duplicates within same company
        
        const nameFn = CONSTRAINT_GOAL_NAMES[goalType];
        const goalName = nameFn ? nameFn(con) : `${goalType} goal`;
        
        // Target/current based on type
        let target, current;
        switch (goalType) {
          case 'fundraise': target = company.roundTarget || 2000000; current = Math.floor(target * randomFloat(0.1, 0.4)); break;
          case 'revenue': target = randomInt(1000, 10000) * 1000; current = Math.floor(target * randomFloat(0.3, 0.7)); break;
          case 'retention': target = 100; current = Math.round(100 * randomFloat(0.8, 0.97)); break;
          case 'efficiency': target = 60; current = Math.round(60 * randomFloat(0.7, 0.95)); break;
          case 'operational': target = 100; current = randomInt(40, 75); break;
          case 'hiring': target = randomInt(5, 15); current = Math.max(1, target - randomInt(2, 5)); break;
          case 'product': target = 100; current = randomInt(50, 85); break;
          case 'customer_growth': target = randomInt(50, 300); current = Math.floor(target * randomFloat(0.3, 0.6)); break;
          case 'partnership': target = 100; current = randomInt(20, 60); break;
          default: target = 100; current = randomInt(30, 70);
        }
        
        const gapPct = target > 0 ? (target - current) / target : 0;
        // Deadline aligned to constraint date (goal should be hit by then)
        const conDate = new Date(con.date);
        const daysUntil = Math.max(7, Math.round((conDate - Date.now()) / 86400000));
        
        const goal = {
          id: `${company.id}-gc${data.goals.length}`,
          companyId: company.id,
          entityRefs: [{ type: 'company', id: company.id, role: 'primary' }],
          name: goalName,
          type: goalType,
          cur: current,
          tgt: target,
          status: gapPct > 0.3 ? 'at_risk' : 'active',
          due: con.date,
          provenance: 'constraint_implied',
          constraintRef: con.id,
          weight: (GOAL_TYPE_WEIGHTS[goalType] || 50) * 1.2, // 20% weight boost for constraint-aligned goals
          asOf: new Date().toISOString().split('T')[0],
        };
        goal.history = generateGoalHistory(goal);
        data.goals.push(goal);
        constraintGoalsInjected++;
      }
    }
  }
  console.log(`  Injected ${constraintGoalsInjected} constraint-aligned goals`);

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
  console.log(`  Constraints:   ${data.constraints.length}`);
  
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

  const chunkKeys = ['companies', 'people', 'firms', 'rounds', 'deals', 'goals', 'relationships', 'metricFacts', 'constraints'];
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
