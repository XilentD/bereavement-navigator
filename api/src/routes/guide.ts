import { FastifyInstance } from 'fastify';
import type { PersonaConfig } from '../config/loader.js';
import { matchGuide } from '../engine/guide.js';

interface GuideRequestBody {
  persona_id: string;
  city?: string;
  answers: Record<string, string | boolean>;
}

export async function guideRoutes(app: FastifyInstance, config: Map<string, PersonaConfig>) {
  app.post<{ Body: GuideRequestBody }>('/api/guide',
    {
      schema: {
        body: {
          type: 'object',
          required: ['persona_id', 'answers'],
          properties: {
            persona_id: { type: 'string', minLength: 1 },
            city: { type: 'string' },
            answers: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { persona_id, city = 'hangzhou', answers } = request.body;

      const key = `${city}:${persona_id}`;
      if (!config.has(key)) {
        const cityPersonas = [...config.keys()]
          .filter(k => k.startsWith(`${city}:`))
          .map(k => k.split(':')[1]);
        return reply.status(400).send({
          error: 'Unknown persona',
          message: `"${persona_id}" is not supported in ${city}. Available in ${city}: ${cityPersonas.join(', ') || 'none'}`,
        });
      }

      try {
        const result = matchGuide(config, city, persona_id, answers);
        return result;
      } catch (err) {
        return reply.status(500).send({
          error: 'Guide generation failed',
          message: (err as Error).message,
        });
      }
    }
  );
}
