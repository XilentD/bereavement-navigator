import { FastifyInstance } from 'fastify';
import { generateDelegationLetter, generateChecklist, cachePdf } from '../pdf/generator.js';
import type { PersonaConfig } from '../config/loader.js';
import { matchGuide } from '../engine/guide.js';

export async function pdfRoutes(app: FastifyInstance, config: Map<string, PersonaConfig>) {
  app.post('/api/pdf/delegation-letter', async (request, reply) => {
    const body = request.body as any;
    const { principalName, principalId, agentName, agentId, relationship,
            deceasedName, deceasedId, deathDate, persona_id, city = 'hangzhou', answers } = body;

    if (!persona_id || !answers) {
      return reply.status(400).send({
        error: 'Missing required fields',
        message: 'persona_id, city, and answers are required',
      });
    }

    const dlKey = `${city}:${persona_id}`;
    if (!config.has(dlKey)) {
      return reply.status(400).send({
        error: 'Unknown persona',
        message: `"${persona_id}" is not supported in ${city}. Available: ${[...config.keys()].join(', ')}`,
      });
    }

    const guide = matchGuide(config, city, persona_id, answers);
    const items = guide.timeline.flatMap(p =>
      p.procedures.map(proc => proc.name)
    );

    try {
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
    } catch (err) {
      let text = '授权委托书\n\n';
      text += `委托人: ${principalName} (${principalId})\n`;
      text += `受托人: ${agentName} (${agentId})\n`;
      text += `关系: ${relationship}\n`;
      text += `逝者: ${deceasedName} (${deceasedId})\n`;
      text += `日期: ${deathDate || new Date().toISOString().split('T')[0]}\n\n`;
      text += '代办事项:\n';
      for (const item of items) text += `  - ${item}\n`;
      reply.header('Content-Type', 'text/plain; charset=utf-8');
      return text;
    }
  });

  app.post('/api/pdf/checklist', async (request, reply) => {
    const body = request.body as any;
    const { persona_id, city = 'hangzhou', answers } = body;

    if (!persona_id || !answers) {
      return reply.status(400).send({
        error: 'Missing required fields',
        message: 'persona_id, city, and answers are required',
      });
    }

    const clKey = `${city}:${persona_id}`;
    if (!config.has(clKey)) {
      return reply.status(400).send({
        error: 'Unknown persona',
        message: `"${persona_id}" is not supported in ${city}. Available: ${[...config.keys()].join(', ')}`,
      });
    }

    const guide = matchGuide(config, city, persona_id, answers);

    try {
      const key = `cl-${city}-${persona_id}-${JSON.stringify(answers)}`;
      const pdf = await cachePdf(key, () => generateChecklist(guide));
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', 'attachment; filename="checklist.pdf"');
      return pdf;
    } catch (err) {
      // Puppeteer not available — return checklist as plain text
      let text = '材料准备清单\n\n';
      for (const phase of guide.timeline) {
        text += `=== ${phase.title} ===\n`;
        for (const proc of phase.procedures) {
          const w = proc.where as any;
          text += `\n□ ${proc.name}\n`;
          text += `  地点: ${w.resolved || w.name}\n`;
          if (w.address) text += `  地址: ${w.address}\n`;
          if (w.phone) text += `  电话: ${w.phone}\n`;
          text += `  材料:\n`;
          for (const o of proc.need.originals) text += `    - ${o} (原件)\n`;
          for (const c of proc.need.copies) text += `    - ${c.doc} 复印件x${c.count}\n`;
        }
      }
      reply.header('Content-Type', 'text/plain; charset=utf-8');
      return text;
    }
  });
}
