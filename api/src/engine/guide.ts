import type { PersonaConfig, Procedure, TimelinePhase, DependsWhere } from '../config/loader.js';

export interface GuideResult {
  persona: {
    id: string;
    name: string;
    description: string;
    assumptions: string[];
  };
  timeline: ResolvedPhase[];
  summary: {
    total_procedures: number;
    critical_count: number;
    high_count: number;
    estimated_days_min: number;
  };
}

interface ResolvedPhase {
  phase: TimelinePhase['phase'];
  title: string;
  procedures: ResolvedProcedure[];
}

interface ResolvedProcedure extends Omit<Procedure, 'where'> {
  status: 'pending';
  where: ResolvedWhere;
}

type ResolvedWhere =
  | { type: 'fixed'; name: string; address: string; phone: string }
  | { type: 'depends'; resolved: string; address?: string; phone?: string };

export function matchGuide(
  config: Map<string, PersonaConfig>,
  personaId: string,
  answers: Record<string, string | boolean>
): GuideResult {
  const persona = config.get(personaId);
  if (!persona) {
    throw new Error(
      `Unknown persona: ${personaId}. Available: ${[...config.keys()].join(', ')}`
    );
  }

  const timeline: ResolvedPhase[] = [];
  let criticalCount = 0;
  let highCount = 0;
  let totalCount = 0;

  const DAYS: Record<string, number> = {
    '24h': 1, '3d': 3, '7d': 7, '30d': 30, '90d': 90, long: 90,
  };
  let estimatedDays = 0;

  for (const phase of persona.timeline) {
    const resolvedProcedures: ResolvedProcedure[] = [];

    for (const proc of phase.procedures) {
      // Check conditional (when) filter
      if (proc.when) {
        const shouldSkip = Object.entries(proc.when).some(
          ([key, required]) => answers[key] !== required
        );
        if (shouldSkip) continue;
      }

      // Resolve 'where' field
      let resolvedWhere: ResolvedWhere;
      if (proc.where.type === 'fixed') {
        resolvedWhere = {
          type: 'fixed',
          name: proc.where.name,
          address: proc.where.address,
          phone: proc.where.phone,
        };
      } else {
        // depends type — resolve from answers
        const where = proc.where as DependsWhere;
        // Find which answer key maps to this depends field
        const answerKey = Object.keys(answers).find(k =>
          where.branches.some(b => b.when === answers[k])
        );
        const matchedBranch = answerKey
          ? where.branches.find(b => b.when === answers[answerKey])
          : where.branches[0];

        resolvedWhere = {
          type: 'depends',
          resolved: matchedBranch?.name ?? proc.where.branches[0].name,
          address: matchedBranch?.address,
          phone: matchedBranch?.phone,
        };
      }

      resolvedProcedures.push({
        ...proc,
        status: 'pending',
        where: resolvedWhere,
        when: undefined,
      });

      totalCount++;
      if (proc.urgency === 'critical') criticalCount++;
      else if (proc.urgency === 'high') highCount++;
    }

    if (resolvedProcedures.length > 0) {
      timeline.push({
        phase: phase.phase,
        title: phase.title,
        procedures: resolvedProcedures,
      });
      estimatedDays = Math.max(estimatedDays, DAYS[phase.phase] ?? 90);
    }
  }

  return {
    persona: {
      id: persona.persona.id,
      name: persona.persona.name,
      description: persona.persona.description,
      assumptions: persona.persona.assumptions,
    },
    timeline,
    summary: {
      total_procedures: totalCount,
      critical_count: criticalCount,
      high_count: highCount,
      estimated_days_min: estimatedDays,
    },
  };
}
