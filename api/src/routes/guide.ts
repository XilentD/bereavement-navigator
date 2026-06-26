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
      const { persona_id, answers } = request.body;

      if (!config.has(persona_id)) {
        return reply.status(400).send({
          error: 'Unknown persona',
          message: `"${persona_id}" is not supported. Available: ${[...config.keys()].join(', ')}`,
        });
      }

      try {
        const result = matchGuide(config, persona_id, answers);
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
