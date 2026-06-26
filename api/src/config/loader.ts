import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';

export interface PersonaMeta {
  id: string;
  name: string;
  description: string;
  assumptions: string[];
}

export interface Procedure {
  id: string;
  name: string;
  urgency: 'critical' | 'high' | 'normal';
  where: FixedWhere | DependsWhere;
  need: { originals: string[]; copies: { doc: string; count: number }[] };
  output: string;
  notes?: string;
  when?: Record<string, boolean>;
}

interface FixedWhere {
  type: 'fixed';
  name: string;
  address: string;
  phone: string;
}

interface DependsWhere {
  type: 'depends';
  branches: { when: string; name: string; address?: string; phone?: string }[];
}

export interface TimelinePhase {
  phase: '24h' | '3d' | '7d' | '30d' | '90d' | 'long';
  title: string;
  procedures: Procedure[];
}

export interface PersonaConfig {
  persona: PersonaMeta;
  timeline: TimelinePhase[];
}

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public filePath: string,
    public errors: unknown[]
  ) {
    super(`ConfigValidationError in ${filePath}: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

const cache = new Map<string, Map<string, PersonaConfig>>();

export function loadConfig(dataDir: string): Map<string, PersonaConfig> {
  const resolvedDir = resolve(dataDir);
  if (cache.has(resolvedDir)) return cache.get(resolvedDir)!;
  const proceduresDir = join(resolvedDir, 'procedures');
  if (!existsSync(proceduresDir)) {
    throw new Error(`Procedures directory not found: ${proceduresDir}`);
  }

  const schemaPath = join(resolvedDir, 'schema.yaml');
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaYaml = readFileSync(schemaPath, 'utf-8');
  const schema = parseYaml(schemaYaml);
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  const files = readdirSync(proceduresDir).filter(f => f.endsWith('.yaml'));
  if (files.length === 0) {
    throw new Error(`No YAML files found in ${proceduresDir}`);
  }

  const result = new Map<string, PersonaConfig>();

  for (const file of files) {
    const filePath = join(proceduresDir, file);
    const raw = readFileSync(filePath, 'utf-8');
    const data = parseYaml(raw);

    if (!validate(data)) {
      throw new ConfigValidationError(
        `${file} failed schema validation`,
        filePath,
        validate.errors ?? []
      );
    }

    const persona = data as PersonaConfig;
    if (result.has(persona.persona.id)) {
      throw new ConfigValidationError(
        `Duplicate persona id: ${persona.persona.id}`,
        filePath,
        []
      );
    }

    result.set(persona.persona.id, persona);
  }

  cache.set(resolvedDir, result);
  console.log(`[ConfigLoader] Loaded ${result.size} persona configs`);
  return result;
}
