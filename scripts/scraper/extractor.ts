/**
 * AI-powered extractor: converts scraped government page text
 * into structured venue and policy data.
 *
 * The extraction is done by Claude in the current session —
 * we prepare the prompt and parse the structured response.
 */

import type { FetchResult } from './fetcher.js';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ExtractedVenue {
  city: string;
  type: 'funeral_home' | 'social_insurance' | 'notary' | 'property_center' | 'veterans_affairs' | 'other';
  name: string;
  address: string;
  phone: string;
  bizHours?: string;
  notes?: string;
  sourceUrl: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtractedAllowance {
  city: string;
  personaType: string; // retired_worker, active_worker, urban_resident, civil_servant, military
  name: string;        // e.g. "丧葬补助金", "一次性抚恤金"
  amountRange: string; // e.g. "7000-14000元"
  conditions: string;
  sourceUrl: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtractionResult {
  venues: ExtractedVenue[];
  allowances: ExtractedAllowance[];
  rawTexts: { url: string; text: string }[];
}

/**
 * Build the AI extraction prompt for a batch of fetched pages.
 * This prompt is designed to be answered by Claude in this session.
 */
export function buildExtractionPrompt(
  city: string,
  cityName: string,
  results: FetchResult[]
): string {
  const texts = results
    .filter(r => r.textContent.length > 50 && !r.error)
    .map(r => `### SOURCE: ${r.url}\n\`\`\`\n${r.textContent.slice(0, 8000)}\n\`\`\``)
    .join('\n\n');

  return `你是一个政府办事信息提取器。请从以下 ${cityName}（${city}）政府网站抓取内容中提取关键信息。

## 需要提取的信息

### 1. 办事机构 (venues)
对每个机构提取：
- type: funeral_home（殡仪馆）/ social_insurance（社保中心）/ notary（公证处）/ property_center（不动产登记中心）/ veterans_affairs（退役军人事务局）
- name: 机构全称
- address: 详细地址
- phone: 联系电话
- bizHours: 办公时间（如有）
- confidence: high（明确写出）/ medium（推断）/ low（不确定）

### 2. 丧葬补助标准 (allowances)
对每项补助提取：
- personaType: retired_worker / active_worker / urban_resident / civil_servant / military
- name: 补助项目名称
- amountRange: 金额范围（如 "7000-14000元"）
- conditions: 申领条件
- confidence: high / medium / low

## 抓取内容

${texts || '(无有效内容 — 所有 URL 均抓取失败或内容为空)'}

## 输出格式

请严格按以下 JSON 格式输出（不要包含其他文字）：

\`\`\`json
{
  "venues": [
    {
      "city": "${city}",
      "type": "funeral_home",
      "name": "...",
      "address": "...",
      "phone": "...",
      "bizHours": "...",
      "sourceUrl": "...",
      "confidence": "high"
    }
  ],
  "allowances": [
    {
      "city": "${city}",
      "personaType": "retired_worker",
      "name": "...",
      "amountRange": "...",
      "conditions": "...",
      "sourceUrl": "...",
      "confidence": "medium"
    }
  ]
}
\`\`\`

如果某个类别完全没有信息，返回空数组 []。`;
}

/**
 * Parse the AI response back into structured data.
 */
export function parseExtractionResponse(response: string): ExtractionResult | null {
  try {
    // Extract JSON block from response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    const data = JSON.parse(jsonStr);

    return {
      venues: data.venues || [],
      allowances: data.allowances || [],
      rawTexts: [],
    };
  } catch (err) {
    console.error('Failed to parse extraction response:', (err as Error).message);
    console.error('Raw response (first 500 chars):', response.slice(0, 500));
    return null;
  }
}

/**
 * Save extracted data to disk for later YAML generation.
 */
export function saveExtractionResult(city: string, result: ExtractionResult): string {
  const outDir = join(process.cwd(), '.cache', 'scraper', 'extracted');
  const { mkdirSync } = require('node:fs');
  mkdirSync(outDir, { recursive: true });

  const path = join(outDir, `${city}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(result, null, 2), 'utf-8');
  return path;
}

/**
 * Load the most recent extraction result for a city.
 */
export function loadExtractionResult(city: string): ExtractionResult | null {
  const outDir = join(process.cwd(), '.cache', 'scraper', 'extracted');
  const { existsSync, readdirSync } = require('node:fs');

  if (!existsSync(outDir)) return null;

  const files = readdirSync(outDir)
    .filter((f: string) => f.startsWith(`${city}-`) && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return null;
  return JSON.parse(readFileSync(join(outDir, files[0]), 'utf-8'));
}
