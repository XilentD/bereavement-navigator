import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Check whether Chrome/Chromium is available for PDF generation.
// Only checks if the executable exists — does NOT attempt a real launch
// which can hang in restricted environments.
function chromeExecutableExists(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require('puppeteer');
    const path = puppeteer.executablePath();
    const fs = require('fs');
    return fs.existsSync(path);
  } catch {
    return false;
  }
}

describe('E2E Smoke Test', () => {
  let baseUrl: string;
  let app: FastifyInstance;

  beforeAll(async () => {
    const { buildApp } = await import('../src/server.js');
    app = await buildApp({ logger: false });
    await app.listen({ port: 0 });
    baseUrl = `http://localhost:${(app.server.address() as any).port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const personas = [
    {
      id: 'retired-worker',
      answers: {
        death_location: 'at_hospital',
        has_real_estate: false,
        has_commercial_insurance: false,
        has_will: false,
        has_social_security: true,
      },
    },
    {
      id: 'active-worker',
      answers: {
        death_location: 'at_hospital',
        has_real_estate: false,
        has_commercial_insurance: false,
        has_will: false,
        has_work_injury: false,
      },
    },
    {
      id: 'urban-resident',
      answers: {
        death_location: 'at_hospital',
        has_real_estate: false,
        has_commercial_insurance: false,
        has_will: false,
        has_rural_house: false,
      },
    },
    {
      id: 'civil-servant',
      answers: {
        death_location: 'at_hospital',
        has_real_estate: false,
        has_commercial_insurance: false,
        has_will: false,
      },
    },
    {
      id: 'military',
      answers: {
        death_location: 'at_hospital',
        has_real_estate: false,
        has_commercial_insurance: false,
        has_will: false,
        military_type: 'retired',
        is_martyr_case: false,
      },
    },
  ];

  for (const persona of personas) {
    it(`should return valid guide for ${persona.id}`, async () => {
      const res = await fetch(`${baseUrl}/api/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: persona.id,
          city: 'hangzhou',
          answers: persona.answers,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.persona).toBeDefined();
      expect(body.persona.id).toBe(persona.id);
      expect(body.timeline.length).toBeGreaterThan(0);
      expect(body.summary.total_procedures).toBeGreaterThan(0);

      // Verify every procedure has a fully-resolved where field
      for (const phase of body.timeline) {
        expect(phase.phase).toBeTruthy();
        expect(phase.title).toBeTruthy();
        expect(phase.procedures.length).toBeGreaterThan(0);

        for (const proc of phase.procedures) {
          expect(proc.id).toBeTruthy();
          expect(proc.name).toBeTruthy();
          expect(proc.urgency).toBeTruthy();
          expect(proc.where.type).toBeTruthy();

          if (proc.where.type === 'fixed') {
            expect(proc.where.name).toBeTruthy();
            expect(proc.where.address).toBeTruthy();
            expect(proc.where.phone).toBeTruthy();
          } else if (proc.where.type === 'depends') {
            expect(proc.where.resolved).toBeTruthy();
          }
        }
      }

      // Verify summary counts match actual procedures
      let totalProcedures = 0;
      let criticalCount = 0;
      for (const phase of body.timeline) {
        for (const proc of phase.procedures) {
          totalProcedures++;
          if (proc.urgency === 'critical') criticalCount++;
        }
      }
      expect(body.summary.total_procedures).toBe(totalProcedures);
      expect(body.summary.critical_count).toBe(criticalCount);
    });
  }

  it('should validate unknown persona returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona_id: 'nonexistent_persona',
        city: 'hangzhou',
        answers: { death_location: 'at_hospital' },
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Unknown persona');
  });

  it('should route PDF delegation letter request', async () => {
    // Smoke-check the PDF delegation-letter endpoint.
    // PDF generation requires Chrome/Chromium via Puppeteer, which may not
    // be available in all environments. When missing, the endpoint returns
    // 500 — this is a runtime dependency issue, not a code bug.
    const res = await fetch(`${baseUrl}/api/pdf/delegation-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        principalName: '测试人',
        principalId: '330100199001011234',
        agentName: '代办人',
        agentId: '330100199501015678',
        relationship: '子女',
        deceasedName: '逝者',
        deceasedId: '330100195001011234',
        deathDate: '2026-06-20',
        persona_id: 'retired-worker',
        answers: {
          death_location: 'at_hospital',
          has_real_estate: false,
          has_commercial_insurance: false,
          has_will: false,
          has_social_security: true,
        },
      }),
    });

    if (chromeExecutableExists()) {
      // Chrome is installed — expect a valid PDF response
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/pdf');
    } else {
      // Chrome not installed — endpoint returns 500 Server Error
      expect(res.status).toBe(500);
    }
  });

  it('should reject PDF request with unknown persona', async () => {
    const res = await fetch(`${baseUrl}/api/pdf/delegation-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        principalName: '测试人',
        principalId: '330100199001011234',
        agentName: '代办人',
        agentId: '330100199501015678',
        relationship: '子女',
        deceasedName: '逝者',
        deceasedId: '330100195001011234',
        deathDate: '2026-06-20',
        persona_id: 'unknown_persona',
        answers: { death_location: 'at_hospital' },
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Unknown persona');
  });
});
