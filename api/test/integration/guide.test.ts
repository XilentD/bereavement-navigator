import { describe, it, expect, beforeAll, afterAll } from 'vitest';

let baseUrl: string;

describe('API Integration', () => {
  beforeAll(async () => {
    // Start server programmatically for testing
    const { buildApp } = await import('../../src/server.js');
    const app = await buildApp({ logger: false });
    await app.listen({ port: 0 }); // random port
    baseUrl = `http://localhost:${(app.server.address() as any).port}`;
    return () => app.close();
  });

  it('GET /api/personas should return all persona types', async () => {
    const res = await fetch(`${baseUrl}/api/personas`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.personas).toBeInstanceOf(Array);
    expect(body.personas.length).toBeGreaterThanOrEqual(5);
    expect(body.personas[0]).toHaveProperty('id');
    expect(body.personas[0]).toHaveProperty('name');
  });

  it('POST /api/guide should return timeline for valid request', async () => {
    const res = await fetch(`${baseUrl}/api/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona_id: 'retired_worker',
        city: 'hangzhou',
        answers: {
          death_location: 'at_hospital',
          has_real_estate: false,
          has_commercial_insurance: false,
          has_will: false,
          has_social_security: true,
        },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.persona).toBeDefined();
    expect(body.timeline.length).toBeGreaterThan(0);
    expect(body.summary.total_procedures).toBeGreaterThan(0);
  });

  it('POST /api/guide should return 400 for unknown persona', async () => {
    const res = await fetch(`${baseUrl}/api/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona_id: 'unknown', city: 'hangzhou', answers: {} }),
    });
    expect(res.status).toBe(400);
  });
});
