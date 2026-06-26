import { FastifyInstance } from 'fastify';
import { generateDelegationLetter, generateChecklist, cachePdf } from '../pdf/generator.js';
import type { PersonaConfig } from '../config/loader.js';
import { matchGuide } from '../engine/guide.js';

export async function pdfRoutes(app: FastifyInstance, config: Map<string, PersonaConfig>) {
  app.post('/api/pdf/delegation-letter', async (request, reply) => {
    const body = request.body as any;
    const { principalName, principalId, agentName, agentId, relationship,
            deceasedName, deceasedId, deathDate, persona_id, answers } = body;

    if (!persona_id || !answers) {
      return reply.status(400).send({
        error: 'Missing required fields',
        message: 'persona_id and answers are required',
      });
    }

    if (!config.has(persona_id)) {
      return reply.status(400).send({
        error: 'Unknown persona',
        message: `"${persona_id}" is not supported. Available: ${[...config.keys()].join(', ')}`,
      });
    }

    const guide = matchGuide(config, persona_id, answers);
    const items = guide.timeline.flatMap(p =>
      p.procedures.map(proc => proc.name)
    );

    const key = `dl-${JSON.stringify(body)}`;
    const pdf = await cachePdf(key, () =>
      generateDelegationLetter({
        principalName, principalId, agentName, agentId,
        relationship, deceasedName, deceasedId, deathDate,
        items,
        date: new Date().toISOString().split('T')[0],
      })
    );

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', 'attachment; filename="delegation-letter.pdf"');
    return pdf;
  });

  app.post('/api/pdf/checklist', async (request, reply) => {
    const body = request.body as any;
    const { persona_id, answers } = body;

    if (!persona_id || !answers) {
      return reply.status(400).send({
        error: 'Missing required fields',
        message: 'persona_id and answers are required',
      });
    }

    if (!config.has(persona_id)) {
      return reply.status(400).send({
        error: 'Unknown persona',
        message: `"${persona_id}" is not supported. Available: ${[...config.keys()].join(', ')}`,
      });
    }

    const guide = matchGuide(config, persona_id, answers);

    const key = `cl-${persona_id}-${JSON.stringify(answers)}`;
    const pdf = await cachePdf(key, () => generateChecklist(guide));

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', 'attachment; filename="checklist.pdf"');
    return pdf;
  });
}
