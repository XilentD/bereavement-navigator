#!/usr/bin/env tsx
/**
 * Bereavement Navigator — Data Scraping Toolkit
 *
 * Usage:
 *   npx tsx scripts/scraper/index.ts fetch --city hangzhou        # Fetch all sources for a city
 *   npx tsx scripts/scraper/index.ts extract --city hangzhou      # AI-extract structured data from cache
 *   npx tsx scripts/scraper/index.ts generate --city shenzhen     # Generate YAML from extracted data
 *   npx tsx scripts/scraper/index.ts full --city chengdu          # Full pipeline: fetch → extract → generate
 *   npx tsx scripts/scraper/index.ts list                         # List all registered cities
 */

import { fetchUrl, type FetchResult } from './fetcher.js';
import {
  buildExtractionPrompt,
  parseExtractionResponse,
  saveExtractionResult,
  loadExtractionResult,
} from './extractor.js';
import { applyExtractedData, generateCityFromTemplate } from './generator.js';
import { CITY_REGISTRY } from './venues.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// CACHE_DIR must match the path used by fetcher.ts
// fetcher uses __dirname/../../.cache/scraper → project root .cache/scraper
function resolveCacheDir(): string {
  const cwd = process.cwd();
  // If running from api/ (via npm script), cache is at ../.cache/scraper
  if (cwd.endsWith('api') || cwd.endsWith('api/') || cwd.endsWith('api\\')) {
    return join(cwd, '..', '.cache', 'scraper');
  }
  return join(cwd, '.cache', 'scraper');
}
const CACHE_DIR = resolveCacheDir();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const cityArg = args.find(a => a.startsWith('--city='))?.split('=')[1];
  const forceArg = args.includes('--force');

  if (!command || command === 'help') {
    printHelp();
    return;
  }

  if (command === 'list') {
    printCities();
    return;
  }

  if (!cityArg) {
    console.error('Error: --city=<slug> is required');
    console.error('Available cities:');
    printCities();
    process.exit(1);
  }

  const registry = CITY_REGISTRY[cityArg];
  if (!registry) {
    console.error(`Unknown city: ${cityArg}. Available: ${Object.keys(CITY_REGISTRY).join(', ')}`);
    process.exit(1);
  }

  const cityName = {
    hangzhou: '杭州市', beijing: '北京市', shanghai: '上海市', guangzhou: '广州市',
    shenzhen: '深圳市', chengdu: '成都市', wuhan: '武汉市',
  }[cityArg] || cityArg;

  switch (command) {
    case 'fetch':
      await cmdFetch(registry, forceArg);
      break;
    case 'extract':
      await cmdExtract(cityArg, cityName);
      break;
    case 'generate':
      await cmdGenerate(cityArg, cityName, registry);
      break;
    case 'full':
      await cmdFetch(registry, forceArg);
      await cmdExtract(cityArg, cityName);
      await cmdGenerate(cityArg, cityName, registry);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

async function cmdFetch(registry: typeof CITY_REGISTRY[string], force: boolean) {
  console.log(`\n=== Fetching ${registry.city} (${registry.sources.length} sources) ===\n`);

  const results: FetchResult[] = [];
  for (let i = 0; i < registry.sources.length; i++) {
    const source = registry.sources[i];
    console.log(`[${i + 1}/${registry.sources.length}] ${source.label}`);
    console.log(`  URL: ${source.url}`);

    const result = await fetchUrl(source.url, {
      encoding: source.encoding,
      contentSelector: source.contentSelector,
      useBrowser: source.url.includes('yueshi') || source.url.includes('zwdt'), // JS-heavy sites
    });

    if (result.error) {
      console.log(`  ❌ Failed: ${result.error}`);
    } else if (result.cached && !force) {
      console.log(`  📦 Cached (${result.textContent.length} chars extracted)`);
    } else {
      console.log(`  ✅ Fetched (${result.textContent.length} chars, ${result.encoding})`);
    }

    results.push(result);

    // Polite delay between requests
    if (i < registry.sources.length - 1) {
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    }
  }

  const successCount = results.filter(r => !r.error).length;
  console.log(`\n=== Fetch complete: ${successCount}/${results.length} successful ===\n`);

  // Write AI extraction prompt file for manual review if needed
  const { mkdirSync } = require('node:fs');
  mkdirSync(CACHE_DIR, { recursive: true });
  const promptPath = join(CACHE_DIR, `${registry.city}-extraction-prompt.md`);
  const prompt = buildExtractionPrompt(registry.city, registry.province, results);
  writeFileSync(promptPath, prompt, 'utf-8');
  console.log(`Extraction prompt written to: ${promptPath}`);
  console.log('Run: npx tsx scripts/scraper/index.ts extract --city=' + registry.city);
}

async function cmdExtract(city: string, cityName: string) {
  console.log(`\n=== AI Extraction for ${cityName} ===\n`);

  // Read ALL cached fetch results — filter by URL later
  const { readdirSync: rd, readFileSync: rf, existsSync: ex } = require('node:fs');
  if (!ex(CACHE_DIR)) {
    console.log(`Cache directory not found: ${CACHE_DIR}. Run "fetch" first.`);
    return;
  }

  const allFiles = rd(CACHE_DIR).filter((f: string) => f.endsWith('.json'));
  const results: FetchResult[] = [];
  for (const f of allFiles) {
    try {
      const data = JSON.parse(rf(join(CACHE_DIR, f), 'utf-8'));
      // Only include fetch results that have actual content
      if (data.url && data.status && data.textContent && data.textContent.length > 10) {
        results.push(data as FetchResult);
      }
    } catch { /* skip non-fetch JSON files */ }
  }

  if (results.length === 0) {
    console.log('No valid cached results. Run "fetch" first.');
    return;
  }

  // Build and display the extraction prompt
  const prompt = buildExtractionPrompt(city, cityName, results);
  const promptPath = join(CACHE_DIR, `${city}-extraction-prompt.md`);
  require('node:fs').writeFileSync(promptPath, prompt, 'utf-8');

  console.log(`Extraction prompt written to: ${promptPath}`);
  console.log(`Contains ${results.length} sources, ${results.reduce((s, r) => s + r.textContent.length, 0)} chars total`);
  console.log('\n📋 Copy the prompt file content and paste it into this Claude Code session.');
  console.log('   Claude will extract structured JSON from the scraped text.');
  console.log('   Then run: npx tsx scripts/scraper/index.ts generate --city=' + city);
}

async function cmdGenerate(city: string, cityName: string, registry: typeof CITY_REGISTRY[string]) {
  console.log(`\n=== Generating YAML for ${cityName} ===\n`);

  // Try to load previous extraction result
  const extraction = loadExtractionResult(city);

  if (!extraction) {
    // No extraction yet — generate from template with city basics
    console.log('No extraction data found. Generating from hangzhou template with city defaults...');
    const created = generateCityFromTemplate(city, cityName, registry.areaCode, [], []);
    console.log(`\nGenerated ${created.length} files.`);
    console.log('⚠️  These are TEMPLATE copies — venue addresses still reference Hangzhou.');
    console.log('   Run "fetch" then "extract" to get real city data, then re-run "generate".');
    return;
  }

  // Apply extracted data
  const report = applyExtractedData(city, extraction.venues, extraction.allowances);
  console.log(`Applied ${report.venuesApplied} venue updates, ${report.allowancesApplied} allowance updates`);
  console.log(`Updated ${report.filesUpdated.length} files:`);
  report.filesUpdated.forEach(f => console.log(`  ✅ ${f}`));

  if (report.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    report.warnings.forEach(w => console.log(`  - ${w}`));
  }

  // Validate
  console.log('\nValidating generated files...');
  const { execSync } = require('node:child_process');
  for (const file of report.filesUpdated) {
    try {
      execSync(`npx ajv validate -s data/schema.yaml -d data/procedures/${file}`, {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
      console.log(`  ✅ ${file} — schema valid`);
    } catch {
      console.log(`  ❌ ${file} — schema validation FAILED`);
    }
  }
}

function printCities() {
  console.log('\nRegistered cities:');
  for (const [slug, reg] of Object.entries(CITY_REGISTRY)) {
    console.log(`  ${slug.padEnd(12)} ${reg.province.padEnd(4)} ${reg.sources.length} sources, area code ${reg.areaCode}`);
  }
  console.log('\nAdd more cities in scripts/scraper/venues.ts');
}

function printHelp() {
  console.log(`
Bereavement Navigator — Data Scraping Toolkit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commands:
  list                          List all registered cities
  fetch     --city=<slug>       Scrape all sources for a city
  extract   --city=<slug>       Build AI extraction prompt from cache
  generate  --city=<slug>       Generate/update YAML from extracted data
  full      --city=<slug>       Run fetch → extract → generate pipeline

Options:
  --force                       Skip cache, re-fetch all sources
  --city=<slug>                 City identifier (e.g. hangzhou, beijing)

Examples:
  npx tsx scripts/scraper/index.ts list
  npx tsx scripts/scraper/index.ts fetch --city=beijing
  npx tsx scripts/scraper/index.ts full --city=shenzhen
`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
