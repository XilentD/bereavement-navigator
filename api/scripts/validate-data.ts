#!/usr/bin/env tsx
import { loadConfig, ConfigValidationError } from '../src/config/loader.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = join(import.meta.dirname, '..', '..', 'data');
const PROCEDURES_DIR = join(DATA_DIR, 'procedures');

let errors = 0;
let warnings = 0;

console.log('=== GitNexus Data Validation ===\n');

// 1. Schema validation
console.log('[1/4] Validating YAML schema...');
try {
  const config = loadConfig(DATA_DIR);
  console.log(`  OK: ${config.size} persona files loaded and validated`);
} catch (err) {
  if (err instanceof ConfigValidationError) {
    console.error(`  FAIL: ${err.message}`);
    console.error(`  File: ${err.filePath}`);
    for (const e of err.errors) {
      console.error(`    - ${JSON.stringify(e)}`);
    }
    errors++;
  } else {
    throw err;
  }
}

// 2. Phone format validation
console.log('\n[2/4] Validating phone numbers...');
// Accept 5-digit hotlines (12333, 12345) and 7-8 digit local numbers
const phonePattern = /^[\d]{3,4}-[\d]{5,8}$/;
const files = readdirSync(PROCEDURES_DIR).filter(f => f.endsWith('.yaml'));

for (const file of files) {
  const content = readFileSync(join(PROCEDURES_DIR, file), 'utf-8');
  const phones = content.match(/"[\d-]{10,15}"/g) || [];
  for (const phone of phones) {
    const clean = phone.replace(/"/g, '');
    if (!phonePattern.test(clean)) {
      console.error(`  FAIL: ${file} — invalid phone format: ${clean}`);
      errors++;
    }
  }
}
console.log(`  OK: phone format check complete (${errors > 0 ? 'has errors' : 'all valid'})`);

// 3. Address completeness
console.log('\n[3/4] Checking address completeness...');
for (const file of files) {
  const content = readFileSync(join(PROCEDURES_DIR, file), 'utf-8');
  if (content.includes('address: ""') || content.includes("address: ''") || content.includes('address: null')) {
    console.error(`  FAIL: ${file} — empty address found`);
    errors++;
  }
}
console.log(`  OK: address check complete`);

// 4. Procedure coverage
console.log('\n[4/4] Checking procedure coverage...');
const config = loadConfig(DATA_DIR);
for (const [id, persona] of config) {
  const totalProcs = persona.timeline.reduce((sum, p) => sum + p.procedures.length, 0);
  console.log(`  ${id}: ${totalProcs} procedures`);
  if (totalProcs < 8) {
    console.error(`  WARN: ${id} has only ${totalProcs} procedures — may be incomplete`);
    warnings++;
  }
}

console.log(`\n=== Result: ${errors} errors, ${warnings} warnings ===`);
process.exit(errors > 0 ? 1 : 0);
