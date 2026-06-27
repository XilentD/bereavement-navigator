import { describe, it, expect, vi, beforeEach } from 'vitest';
import puppeteer from 'puppeteer';
import { generateDelegationLetter, generateChecklist } from '../../src/pdf/generator.js';
import type { GuideResult } from '../../src/engine/guide.js';

// Mock puppeteer so tests don't require a real Chrome/Chromium binary
vi.mock('puppeteer', () => ({
  default: { launch: vi.fn() },
}));

describe('PDF Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateDelegationLetter should return a Buffer', async () => {
    const mockPdfBuffer = Buffer.from('%PDF-1.4 mock content');
    const mockPage = {
      setContent: vi.fn().mockResolvedValue(undefined),
      pdf: vi.fn().mockResolvedValue(mockPdfBuffer),
    };
    const mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

    const result = await generateDelegationLetter({
      principalName: '张三',
      principalId: '110101199001011234',
      agentName: '李四',
      agentId: '110101198505056789',
      relationship: '子女',
      deceasedName: '张爱国',
      deceasedId: '110101195001011234',
      deathDate: '2026-06-01',
      items: ['死亡证明', '户口注销'],
      date: '2026-06-26',
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result).toEqual(mockPdfBuffer);
    expect(mockPage.setContent).toHaveBeenCalledTimes(1);
    expect(mockPage.pdf).toHaveBeenCalledTimes(1);
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  it('generateChecklist should return a Buffer', async () => {
    const mockPdfBuffer = Buffer.from('%PDF-1.4 mock checklist');
    const mockPage = {
      setContent: vi.fn().mockResolvedValue(undefined),
      pdf: vi.fn().mockResolvedValue(mockPdfBuffer),
    };
    const mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

    const guideResult: GuideResult = {
      persona: {
        id: 'retired-worker',
        name: '退休企业职工',
        description: '退休企业职工身后事办理指南',
        assumptions: ['有社保', '无房产'],
      },
      timeline: [
        {
          phase: '24h',
          title: '24小时内',
          procedures: [
            {
              id: 'death_cert',
              name: '办理死亡证明',
              urgency: 'critical',
              status: 'pending',
              where: {
                type: 'fixed',
                name: '接诊医院',
                address: '医院地址',
                phone: '010-12345678',
              },
              need: {
                originals: ['逝者身份证', '申办人身份证'],
                copies: [{ doc: '死亡证明', count: 3 }],
              },
              output: '死亡证明（医学证明）',
            },
          ],
        },
      ],
      summary: {
        total_procedures: 1,
        critical_count: 1,
        high_count: 0,
        estimated_days_min: 1,
      },
    };

    const result = await generateChecklist(guideResult);

    expect(result).toBeInstanceOf(Buffer);
    expect(result).toEqual(mockPdfBuffer);
    expect(mockPage.setContent).toHaveBeenCalledTimes(1);
    expect(mockPage.pdf).toHaveBeenCalledTimes(1);
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });
});
