/**
 * Robust fetcher for Chinese government websites.
 *
 * Handles:
 *  - Encoding detection (UTF-8, GBK, GB2312)
 *  - JavaScript-rendered pages (Puppeteer fallback)
 *  - Rate limiting and exponential backoff
 *  - Content extraction via CSS selectors
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CACHE_DIR = join(__dirname, '..', '..', '.cache', 'scraper');

export interface FetchResult {
  url: string;
  status: number;
  encoding: string;
  html: string;
  textContent: string; // extracted text, tags stripped
  extractedFields: Record<string, string>;
  cached: boolean;
  error?: string;
}

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  useBrowser?: boolean; // Use Puppeteer for JS-heavy pages
  contentSelector?: string;
  encoding?: string;
}

/**
 * Fetch a URL with retry and encoding handling.
 * Results are cached to .cache/scraper/ for 24h to avoid re-scraping.
 */
export async function fetchUrl(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const { timeout = 30_000, retries = 3, useBrowser = false, contentSelector, encoding: hintEncoding } = options;

  // Check cache
  const cacheKey = Buffer.from(url).toString('base64').replace(/[/+=]/g, '_');
  const cachePath = join(CACHE_DIR, `${cacheKey}.json`);
  mkdirSync(CACHE_DIR, { recursive: true });

  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, 'utf-8'));
    const age = Date.now() - cached.fetchedAt;
    if (age < 24 * 60 * 60 * 1000) {
      return { ...cached, cached: true };
    }
  }

  // Fetch with retries
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = useBrowser
        ? await fetchWithBrowser(url, timeout, contentSelector)
        : await fetchWithNode(url, timeout, hintEncoding, contentSelector);

      // Cache result
      writeFileSync(cachePath, JSON.stringify({ ...result, fetchedAt: Date.now() }), 'utf-8');
      return { ...result, cached: false };
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        console.log(`  Retry ${attempt + 1}/${retries} for ${url} in ${Math.round(delay)}ms...`);
        await sleep(delay);
      }
    }
  }

  return {
    url,
    status: 0,
    encoding: 'unknown',
    html: '',
    textContent: '',
    extractedFields: {},
    cached: false,
    error: lastError?.message ?? 'Unknown error',
  };
}

/**
 * Plain Node.js fetch with encoding detection.
 */
async function fetchWithNode(
  url: string,
  timeout: number,
  hintEncoding?: string,
  contentSelector?: string
): Promise<Omit<FetchResult, 'cached'>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });

    const buffer = await res.arrayBuffer();
    const raw = new Uint8Array(buffer);

    // Detect encoding
    let encoding = hintEncoding ?? 'utf-8';
    if (!hintEncoding) {
      encoding = detectEncoding(raw);
    }

    const decoder = new TextDecoder(encoding);
    let html = decoder.decode(raw);

    // Extract text content from target area
    let textContent = stripHtml(html);
    if (contentSelector) {
      textContent = extractBySelector(html, contentSelector);
    }

    const extractedFields = extractKeyValuePairs(textContent);

    return {
      url,
      status: res.status,
      encoding,
      html: html.slice(0, 500_000), // Cap at 500KB
      textContent: textContent.slice(0, 100_000), // Cap extracted text
      extractedFields,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Puppeteer-based fetch for JavaScript-heavy pages.
 */
async function fetchWithBrowser(
  url: string,
  timeout: number,
  contentSelector?: string
): Promise<Omit<FetchResult, 'cached'>> {
  // Dynamic import to avoid loading Puppeteer when not needed
  const puppeteer = await import('puppeteer');

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    );
    await page.setDefaultNavigationTimeout(timeout);

    await page.goto(url, { waitUntil: 'networkidle2', timeout });

    let textContent: string;
    if (contentSelector) {
      textContent = await page.$eval(contentSelector, (el) => (el as HTMLElement).innerText)
        .catch(() => '');
    }
    if (!textContent) {
      textContent = await page.evaluate(() => document.body.innerText);
    }

    const html = await page.content();
    const extractedFields = extractKeyValuePairs(textContent);

    return {
      url,
      status: 200,
      encoding: 'utf-8',
      html: html.slice(0, 500_000),
      textContent: textContent.slice(0, 100_000),
      extractedFields,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Detect if content is GBK/GB2312 by scanning for high-byte patterns.
 */
function detectEncoding(buffer: Uint8Array): string {
  // Check for UTF-8 BOM
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf-8';
  }

  // Check meta charset tag in first 1024 bytes
  const head = new TextDecoder('ascii').decode(buffer.slice(0, 1024));
  const gbkMatch = head.match(/charset=["']?(gbk|gb2312|gb18030)["']?/i);
  if (gbkMatch) {
    return gbkMatch[1].toLowerCase();
  }

  // Heuristic: if many bytes in 0x80-0xFF range, likely GBK
  let highBytes = 0;
  const sampleSize = Math.min(buffer.length, 4096);
  for (let i = 0; i < sampleSize; i++) {
    if (buffer[i] >= 0x80) highBytes++;
  }
  if (highBytes / sampleSize > 0.15) {
    return 'gbk';
  }

  return 'utf-8';
}

/**
 * Strip HTML tags and decode entities.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s{2,}/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Crude CSS selector extraction — extracts text from matching elements.
 * Falls back to full text if selector doesn't match.
 */
function extractBySelector(html: string, selector: string): string {
  // Simple class/id-based extraction without a full DOM parser
  const classMatch = selector.match(/\.([\w-]+)/);
  const idMatch = selector.match(/#([\w-]+)/);

  let content = html;

  if (classMatch) {
    const className = classMatch[1];
    const regex = new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)</[^>]+>`, 'gi');
    const matches = [...content.matchAll(regex)];
    if (matches.length > 0) {
      content = matches.map(m => m[1]).join('\n');
    }
  }

  if (idMatch) {
    const id = idMatch[1];
    const regex = new RegExp(`<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)</[^>]+>`, 'i');
    const match = content.match(regex);
    if (match) {
      content = match[1];
    }
  }

  return stripHtml(content);
}

/**
 * Extract key-value pairs from government page text.
 * Looks for patterns like "地址：xxx" "电话：xxx" "办理时间：xxx"
 */
function extractKeyValuePairs(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const patterns: [string, RegExp][] = [
    ['address', /地址[：:]\s*(.+?)(?:\n|$)/g],
    ['phone', /电话[：:]\s*(.+?)(?:\n|$)/g],
    ['bizHours', /(?:办公|办理|服务)时间[：:]\s*(.+?)(?:\n|$)/g],
    ['name', /(?:名称|单位)[：:]\s*(.+?)(?:\n|$)/g],
    ['allowance', /(?:丧葬补助|丧葬费|抚恤金).*?(\d{2,6})\s*[-—至~]\s*(\d{2,6})\s*元/g],
    ['requiredDocs', /(?:所需材料|携带材料|需要携带)[：:]\s*(.+?)(?:\n\n|\n(?!\s)|$)/s],
    ['process', /(?:办理流程|办事流程)[：:]\s*(.+?)(?:\n\n|\n(?!\s)|$)/s],
    ['deadline', /(?:办理时限|截止时间)[：:]\s*(.+?)(?:\n|$)/g],
  ];

  for (const [key, pattern] of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      fields[key] = matches.map(m => m[1].trim()).join(' | ');
      // Reset regex lastIndex
      pattern.lastIndex = 0;
    }
  }

  return fields;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
