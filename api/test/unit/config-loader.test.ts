import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';

describe('ConfigLoader', () => {
  it('should load all YAML files from the data directory', () => {
    const config = loadConfig('../data');
    expect(config.size).toBeGreaterThanOrEqual(5);
    expect(config.has('hangzhou:retired_worker')).toBe(true);
    expect(config.has('hangzhou:active_worker')).toBe(true);
  });

  it('should validate each loaded persona has required fields', () => {
    const config = loadConfig('../data');
    for (const [key, persona] of config) {
      expect(key).toBe(`${persona.persona.city}:${persona.persona.id}`);
      expect(persona.persona.name).toBeTruthy();
      expect(persona.timeline.length).toBeGreaterThan(0);
      for (const phase of persona.timeline) {
        expect(phase.procedures.length).toBeGreaterThan(0);
      }
    }
  });

  it('should throw ConfigValidationError for invalid YAML', () => {
    expect(() => loadConfig('test/fixtures/invalid-yaml')).toThrow('ConfigValidationError');
  });

  it('should cache results on multiple calls', () => {
    const config1 = loadConfig('../data');
    const config2 = loadConfig('../data');
    expect(config1).toBe(config2); // same reference = cached
  });
});
