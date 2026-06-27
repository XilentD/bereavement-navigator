import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { matchGuide } from '../../src/engine/guide.js';

describe('GuideEngine', () => {
  const config = loadConfig('../data');

  it('should return timeline for retired worker with basic answers', () => {
    const result = matchGuide(config, 'hangzhou', 'retired-worker', {
      death_location: 'at_hospital',
      has_real_estate: false,
      has_commercial_insurance: false,
      has_will: false,
      has_social_security: true,
    });

    expect(result.persona.name).toBe('退休企业职工');
    expect(result.timeline.length).toBeGreaterThan(0);
    // Should NOT include property_transfer when has_real_estate is false
    const allProcedureIds = result.timeline.flatMap(p =>
      p.procedures.map(pr => pr.id)
    );
    expect(allProcedureIds).not.toContain('property_transfer');
    expect(allProcedureIds).not.toContain('insurance_claim');
    expect(allProcedureIds).not.toContain('will_execution');
  });

  it('should include conditional procedures when answers are true', () => {
    const result = matchGuide(config, 'hangzhou', 'retired-worker', {
      death_location: 'at_home',
      has_real_estate: true,
      has_commercial_insurance: true,
      has_will: true,
      has_social_security: true,
    });

    const allIds = result.timeline.flatMap(p => p.procedures.map(pr => pr.id));
    expect(allIds).toContain('property_transfer');
    expect(allIds).toContain('will_execution');
  });

  it('should resolve depends-type where correctly', () => {
    const result = matchGuide(config, 'hangzhou', 'retired-worker', {
      death_location: 'at_hospital',
      has_real_estate: false,
      has_commercial_insurance: false,
      has_will: false,
      has_social_security: true,
    });

    const deathCert = result.timeline[0].procedures.find(
      p => p.id === 'death_cert'
    );
    expect(deathCert?.where.type).toBe('depends');
    expect((deathCert?.where as any).resolved).toBe('接诊医院');
  });

  it('should throw for unknown persona_id', () => {
    expect(() =>
      matchGuide(config, 'hangzhou', 'nonexistent_persona', {})
    ).toThrow('Unknown persona');
  });

  it('should return summary statistics', () => {
    const result = matchGuide(config, 'hangzhou', 'retired-worker', {
      death_location: 'at_hospital',
      has_real_estate: false,
      has_commercial_insurance: false,
      has_will: false,
      has_social_security: true,
    });

    expect(result.summary.total_procedures).toBeGreaterThan(0);
    expect(result.summary.critical_count).toBeGreaterThan(0);
    expect(typeof result.summary.estimated_days_min).toBe('number');
  });
});
