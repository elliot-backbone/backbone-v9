#!/usr/bin/env node

/**
 * QA Sweep - Check for potential issues before push
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const issues = [];
const warnings = [];

// Check 1: Verify actionEvents.json structure
console.log('🔍 Checking actionEvents.json...');
try {
  const events = JSON.parse(readFileSync('raw/actionEvents.json', 'utf8'));
  if (!events.actionEvents) {
    issues.push('raw/actionEvents.json missing "actionEvents" wrapper');
  } else if (!Array.isArray(events.actionEvents)) {
    issues.push('raw/actionEvents.json "actionEvents" is not an array');
  } else {
    console.log(`✓ actionEvents.json structure valid (${events.actionEvents.length} events)`);
    
    // Check event schema if events exist
    if (events.actionEvents.length > 0) {
      const validTypes = ['created', 'assigned', 'started', 'completed', 'outcome_recorded', 'followup_created', 'note_added'];
      events.actionEvents.forEach((evt, i) => {
        if (!evt.id) issues.push(`Event[${i}] missing 'id' field`);
        if (!evt.actionId) issues.push(`Event[${i}] missing 'actionId' field`);
        if (!evt.eventType) issues.push(`Event[${i}] missing 'eventType' field`);
        else if (!validTypes.includes(evt.eventType)) {
          issues.push(`Event[${i}] invalid eventType: ${evt.eventType} (use: ${validTypes.join(', ')})`);
        }
        if (!evt.timestamp) issues.push(`Event[${i}] missing 'timestamp' field`);
        if (!evt.actor) issues.push(`Event[${i}] missing 'actor' field`);
        if (!evt.payload || typeof evt.payload !== 'object') {
          issues.push(`Event[${i}] missing or invalid 'payload' object`);
        }
      });
    }
  }
} catch (e) {
  issues.push(`Failed to parse raw/actionEvents.json: ${e.message}`);
}

// Check 2: Verify no forbidden fields in any JSON files
console.log('🔍 Checking for forbidden fields in raw data...');
const FORBIDDEN_FIELDS = [
  'rankScore', 'expectedNetImpact', 'healthScore', 'healthBand', 'runway', 'runwayMonths',
  'priorityScore', 'impactScore', 'rippleScore', 'executionProbability', 'calibratedProbability',
  'arr' // Only forbidden when mrr exists
];

function scanForForbidden(obj, path = '', forbiddenList = FORBIDDEN_FIELDS) {
  if (!obj || typeof obj !== 'object') return;
  
  for (const key of Object.keys(obj)) {
    if (forbiddenList.includes(key)) {
      issues.push(`Forbidden field "${key}" found at ${path}`);
    }
    if (typeof obj[key] === 'object') {
      scanForForbidden(obj[key], path ? `${path}.${key}` : key, forbiddenList);
    }
  }
}

try {
  const sample = JSON.parse(readFileSync('raw/sample.json', 'utf8'));
  scanForForbidden(sample, 'raw/sample.json');
  console.log('✓ No forbidden fields in raw/sample.json');
} catch (e) {
  warnings.push(`Could not check raw/sample.json: ${e.message}`);
}

// Check 3: MRR/ARR exclusivity
console.log('🔍 Checking MRR/ARR exclusivity...');
try {
  const sample = JSON.parse(readFileSync('raw/sample.json', 'utf8'));
  
  function checkMRRARR(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj.mrr !== undefined && obj.arr !== undefined) {
      issues.push(`Both mrr and arr exist at ${path} (id: ${obj.id || 'unknown'})`);
    }
    
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object') {
        checkMRRARR(obj[key], path ? `${path}.${key}` : key);
      }
    }
  }
  
  checkMRRARR(sample);
  console.log('✓ MRR/ARR exclusivity maintained');
} catch (e) {
  warnings.push(`Could not check MRR/ARR: ${e.message}`);
}

// Check 4: Required files exist
console.log('🔍 Checking required files...');
const requiredFiles = [
  'raw/sample.json',
  'raw/actionEvents.json',
  'qa/qa_gate.js',
  'PROJECT_INSTRUCTIONS.md',
  '.backbone/protocols.js'
];

requiredFiles.forEach(file => {
  try {
    statSync(file);
    console.log(`✓ ${file} exists`);
  } catch (e) {
    issues.push(`Missing required file: ${file}`);
  }
});

// Check 5: Layer import boundaries
console.log('🔍 Checking layer import boundaries...');
const layers = {
  decide: ['predict', 'derive', 'raw'],
  predict: ['derive', 'raw'],
  derive: ['raw'],
  raw: []
};

function checkImports(dir, allowedDirs) {
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.js'));
    files.forEach(file => {
      const content = readFileSync(join(dir, file), 'utf8');
      const imports = content.match(/from\s+['"]\.\.\/([^'"]+)['"]/g) || [];
      
      imports.forEach(imp => {
        const importedLayer = imp.match(/from\s+['"]\.\.\/([^/'"]+)/)?.[1];
        if (importedLayer && !allowedDirs.includes(importedLayer)) {
          issues.push(`${dir}/${file} illegally imports from ${importedLayer}`);
        }
      });
    });
  } catch (e) {
    // Directory might not exist
  }
}

Object.keys(layers).forEach(layer => {
  checkImports(layer, layers[layer]);
});
console.log('✓ Layer boundaries checked');

// Check 6: Git status (uncommitted changes)
console.log('🔍 Checking git status...');
try {
  const { execSync } = await import('child_process');
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    warnings.push(`Uncommitted changes detected:\n${status}`);
  } else {
    console.log('✓ No uncommitted changes');
  }
} catch (e) {
  warnings.push('Could not check git status (not a git repo?)');
}

// Output results
console.log('\n' + '═'.repeat(60));
console.log('QA SWEEP RESULTS');
console.log('═'.repeat(60));

if (issues.length === 0 && warnings.length === 0) {
  console.log('\n✅ ALL CHECKS PASSED - Ready for push\n');
  process.exit(0);
}

if (issues.length > 0) {
  console.log('\n❌ ISSUES FOUND (must fix before push):');
  issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
}

console.log();
process.exit(issues.length > 0 ? 1 : 0);
