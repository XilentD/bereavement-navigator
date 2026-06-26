import puppeteer from 'puppeteer';
import { renderFile } from 'ejs';
import { join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import crypto from 'node:crypto';
import type { GuideResult } from '../engine/guide.js';

const templatesDir = join(import.meta.dirname, 'templates');

export interface DelegationLetterData {
  principalName: string;
  principalId: string;
  agentName: string;
  agentId: string;
  relationship: string;
  deceasedName: string;
  deceasedId: string;
  deathDate: string;
  items: string[];
  date: string;
}

export async function generateDelegationLetter(
  data: DelegationLetterData
): Promise<Buffer> {
  const templatePath = join(templatesDir, 'delegation-letter.ejs');
  const html = await renderFile(templatePath, data);
  return htmlToPdf(html);
}

export async function generateChecklist(guideResult: GuideResult): Promise<Buffer> {
  const templatePath = join(templatesDir, 'checklist.ejs');
  const html = await renderFile(templatePath, {
    personaName: guideResult.persona.name,
    date: new Date().toISOString().split('T')[0],
    timeline: guideResult.timeline,
  });
  return htmlToPdf(html);
}

async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Cache management
const CACHE_DIR = join(import.meta.dirname, '..', '..', 'tmp', 'pdf-cache');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function cachePdf(key: string, generator: () => Promise<Buffer>): Promise<Buffer> {
  const hash = crypto.createHash('md5').update(key).digest('hex');
  const cachePath = join(CACHE_DIR, `${hash}.pdf`);

  if (existsSync(cachePath)) {
    const stat = statSync(cachePath);
    if (Date.now() - stat.mtimeMs < CACHE_TTL) {
      return readFileSync(cachePath);
    }
  }

  const pdf = await generator();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, pdf);
  return pdf;
}
