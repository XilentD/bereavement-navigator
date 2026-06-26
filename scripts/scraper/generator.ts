/**
 * YAML generator: converts extracted venue/allowance data
 * into the standard procedure YAML format used by the app.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import type { ExtractedVenue, ExtractedAllowance } from './extractor.js';

const PROCEDURES_DIR = join(process.cwd(), 'data', 'procedures');
const TEMPLATE_DIR = join(PROCEDURES_DIR); // Use hangzhou files as templates

interface GenerationReport {
  city: string;
  filesUpdated: string[];
  venuesApplied: number;
  allowancesApplied: number;
  warnings: string[];
}

/**
 * Apply extracted data to existing YAML files for a city.
 * Uses the hangzhou template as the base, then overrides with scraped data.
 */
export function applyExtractedData(
  city: string,
  venues: ExtractedVenue[],
  allowances: ExtractedAllowance[]
): GenerationReport {
  const report: GenerationReport = {
    city,
    filesUpdated: [],
    venuesApplied: 0,
    allowancesApplied: 0,
    warnings: [],
  };

  // Check if city files exist
  const personaTypes = ['retired-worker', 'active-worker', 'urban-resident', 'civil-servant', 'military'];
  for (const personaType of personaTypes) {
    const filePath = join(PROCEDURES_DIR, `${city}-${personaType}.yaml`);
    if (!existsSync(filePath)) {
      report.warnings.push(`File not found: ${city}-${personaType}.yaml — skipping`);
      continue;
    }

    let content = readFileSync(filePath, 'utf-8');

    // Apply venue data
    for (const venue of venues) {
      const replacements = buildVenueReplacements(venue);
      for (const [old, new_] of replacements) {
        if (content.includes(old)) {
          content = content.replace(old, new_);
          report.venuesApplied++;
        }
      }
    }

    // Apply allowance data
    for (const allowance of allowances) {
      if (allowance.personaType === personaType.replace('-', '_')) {
        const replacements = buildAllowanceReplacements(allowance);
        for (const [old, new_] of replacements) {
          if (content.includes(old)) {
            content = content.replace(old, new_);
            report.allowancesApplied++;
          }
        }
      }
    }

    // Update the auto-generated header
    content = content.replace(
      /# AUTO-GENERATED.*\n# last_verified:.*\n/,
      `# Data updated via scraper on ${new Date().toISOString().split('T')[0]}\n# last_verified: ${new Date().toISOString().split('T')[0]}\n`
    );

    writeFileSync(filePath, content, 'utf-8');
    report.filesUpdated.push(`${city}-${personaType}.yaml`);
  }

  return report;
}

/**
 * Build search-and-replace pairs for venue data.
 * Matches the generic template text and replaces with scraped specifics.
 */
function buildVenueReplacements(venue: ExtractedVenue): [string, string][] {
  const pairs: [string, string][] = [];

  switch (venue.type) {
    case 'funeral_home':
      if (venue.name) {
        pairs.push([/name: .*殡仪馆/g.source, `name: ${venue.name}`]);
      }
      if (venue.address) {
        pairs.push([/address: .*(?:西溪路|八宝山|漕溪路|燕岭路).*/g.source, `address: ${venue.address}`]);
      }
      if (venue.phone) {
        pairs.push([/phone: "\d{3,4}-\d{7,8}"/g.source, `phone: "${venue.phone}"`]);
      }
      break;

    case 'social_insurance':
      if (venue.name) {
        pairs.push([/name: .*(?:社会保险|人力资源和社会保障).*/g.source, `name: ${venue.name}`]);
      }
      if (venue.address) {
        pairs.push([/address: .*(?:清吟街|永定门|中山南路|小北路).*/g.source, `address: ${venue.address}`]);
      }
      if (venue.phone) {
        pairs.push([/phone: "\d{3,4}-12333"/g.source, `phone: "${venue.phone}"`]);
      }
      break;

    case 'notary':
      if (venue.name) {
        pairs.push([/name: .*(?:公证处).*/g.source, `name: ${venue.name}`]);
      }
      if (venue.address) {
        pairs.push([/address: .*(?:望江东路|朝内大街|凤阳路|仓边路).*/g.source, `address: ${venue.address}`]);
      }
      if (venue.phone) {
        pairs.push([/phone: "\d{3,4}-\d{7,8}"/g.source, `phone: "${venue.phone}"`]);
      }
      break;

    case 'property_center':
      if (venue.name) {
        pairs.push([/name: .*(?:不动产登记).*/g.source, `name: ${venue.name}`]);
      }
      if (venue.address) {
        pairs.push([/address: .*(?:解放东路|北四环西路|北京西路|华就路).*/g.source, `address: ${venue.address}`]);
      }
      if (venue.phone) {
        pairs.push([/phone: "\d{3,4}-\d{5,8}"/g.source, `phone: "${venue.phone}"`]);
      }
      break;
  }

  // Filter out invalid regex patterns
  return pairs.filter(([pattern]) => {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Build search-and-replace pairs for allowance data.
 */
function buildAllowanceReplacements(allowance: ExtractedAllowance): [string, string][] {
  const pairs: [string, string][] = [];

  if (allowance.amountRange) {
    // Match the allowance amount pattern in notes fields
    pairs.push([
      /约 \d{4}-\d{5} 元/g.source,
      `${allowance.amountRange}`,
    ]);
  }

  return pairs.filter(([pattern]) => {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Generate a brand-new YAML file for a city from the hangzhou template.
 */
export function generateCityFromTemplate(
  city: string,
  cityName: string,
  areaCode: string,
  venues: ExtractedVenue[],
  allowances: ExtractedAllowance[]
): string[] {
  const personaTypes = ['retired-worker', 'active-worker', 'urban-resident', 'civil-servant', 'military'];
  const created: string[] = [];

  for (const personaType of personaTypes) {
    const templatePath = join(PROCEDURES_DIR, `hangzhou-${personaType}.yaml`);
    const outPath = join(PROCEDURES_DIR, `${city}-${personaType}.yaml`);

    if (!existsSync(templatePath)) {
      console.error(`Template not found: ${templatePath}`);
      continue;
    }

    let content = readFileSync(templatePath, 'utf-8');

    // City name replacements
    content = content.replace(/city: hangzhou/g, `city: ${city}`);
    content = content.replace(/杭州市/g, cityName);
    content = content.replace(/杭州/g, cityName);
    content = content.replace(/0571-/g, `${areaCode}-`);

    // Apply venue data
    for (const venue of venues) {
      for (const [old, new_] of buildVenueReplacements(venue)) {
        try {
          content = content.replace(new RegExp(old, 'g'), new_);
        } catch { /* skip invalid regex */ }
      }
    }

    // Apply allowance data
    for (const allowance of allowances) {
      if (allowance.personaType === personaType.replace('-', '_')) {
        for (const [old, new_] of buildAllowanceReplacements(allowance)) {
          try {
            content = content.replace(new RegExp(old, 'g'), new_);
          } catch { /* skip invalid regex */ }
        }
      }
    }

    // Mark as generated
    content = `# AUTO-GENERATED from Hangzhou template via scraper\n# Generated: ${new Date().toISOString().split('T')[0]}\n# City: ${cityName} (${city})\n# Area code: ${areaCode}\n# last_verified: null\n${content}`;

    writeFileSync(outPath, content, 'utf-8');
    created.push(`${city}-${personaType}.yaml`);
    console.log(`  Generated: ${city}-${personaType}.yaml`);
  }

  return created;
}
